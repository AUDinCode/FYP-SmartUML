"""
ACTIVITY DIAGRAM GENERATOR
Pipeline:
  1. LLM  → JSON (nodes + edges)
  2. _classify_edges()    → tag each edge HIGH or LOW weight
  3. _trace_spine()       → walk the happy-path chain; return the set of spine node labels
  4. _build_graphviz()    → weighted dot graph:
                            • group="main_spine" on every spine node  → identical X guaranteed
                            • HIGH=100 + tailport=s/headport=n        → iron-rod vertical
                            • LOW=1   + tailport=e/headport=n         → side exit right
  5. _extract_positions() → real X/Y from dot's JSON output
  6. _get_edge_style()    → Draw.io port constraints synced to Graphviz ports
  7. _generate_drawio_xml() → final XML
"""
import os
import re
import json
import html
import graphviz
from typing import List, Dict, Tuple, Set
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────
PTS_TO_PX = 1.5
GV_DPI    = 72.0

W_HIGH = "100"  # spine edges — "iron rod": dot MUST keep these nodes vertically aligned
W_LOW  = "1"    # side/branch edges — free to drift left or right

# A node is considered "off the spine" if it differs from spine_cx by more than this
SIDE_THRESHOLD_PX = 40

NEGATIVE_KW: Set[str] = {
    "invalid", "failure", "incorrect", "insufficient",
    "unavailable", "false", "denied", "error", "fail",
    "no", "retry", "wrong", "exceeded", "reject", "cancel",
}
POSITIVE_KW: Set[str] = {
    "valid", "success", "correct", "sufficient", "approved",
    "ok", "true", "yes", "proceed", "pass",
}


def _px(pts: float) -> int:
    return int(round(pts * PTS_TO_PX))


def _sanitize(text: str) -> str:
    if text is None:
        return ""
    return html.escape(re.sub(r"<[^>]+>", "", str(text)).strip())


def _label_sentiment(label: str) -> str:
    """Return 'positive', 'negative', or 'neutral'."""
    low = label.lower().replace("[", "").replace("]", "").strip()
    if any(k in low for k in NEGATIVE_KW):
        return "negative"
    if any(k in low for k in POSITIVE_KW):
        return "positive"
    return "neutral"


# ─────────────────────────────────────────────────────────────────────────────
# Node geometry & Draw.io styles
# ─────────────────────────────────────────────────────────────────────────────
NODE_CFG = {
    "Start":    {"shape": "circle",       "width": 0.35, "height": 0.35},
    "End":      {"shape": "doublecircle", "width": 0.35, "height": 0.35},
    "Action":   {"shape": "box",          "width": 2.20, "height": 0.65},
    "Decision": {"shape": "diamond",      "width": 1.80, "height": 0.90},
    "Fork":     {"shape": "rect",         "width": 4.00, "height": 0.12},
    "Join":     {"shape": "rect",         "width": 4.00, "height": 0.12},
}

DRAWIO_STYLES = {
    "Start":    ("ellipse;whiteSpace=wrap;html=1;aspect=fixed;"
                 "fillColor=#000000;strokeColor=#000000;"),
    "End":      ("ellipse;whiteSpace=wrap;html=1;aspect=fixed;"
                 "fillColor=#000000;strokeColor=#000000;strokeWidth=4;"),
    "Action":   ("rounded=1;whiteSpace=wrap;html=1;"
                 "fillColor=#dae8fc;strokeColor=#6c8ebf;arcSize=15;"),
    "Decision": ("rhombus;whiteSpace=wrap;html=1;"
                 "fillColor=#fff2cc;strokeColor=#d6b656;"),
    "Fork":     ("rounded=0;whiteSpace=wrap;html=1;"
                 "fillColor=#000000;strokeColor=#000000;"),
    "Join":     ("rounded=0;whiteSpace=wrap;html=1;"
                 "fillColor=#000000;strokeColor=#000000;"),
}

BASE_EDGE = (
    "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;"
    "endArrow=block;endFill=1;endSize=8;strokeColor=#555555;"
)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Edge classification (HIGH spine / LOW branch)
# ─────────────────────────────────────────────────────────────────────────────
def _classify_edges(
    edges:    List[Dict],
    type_map: Dict[str, str],
) -> Dict[int, str]:
    """
    Returns {edge_index: 'high' | 'low'}.

    HIGH weight  = main vertical spine — dot will keep these nodes aligned:
      • Plain sequential flow (no guard label)
      • Positive-sentiment guard ([valid], [yes], [success] …)
      • Any edge arriving AT a Fork bar or leaving a Join bar
        (keeps the parallel block centred on the spine)

    LOW weight   = side branch — free to float left/right:
      • Negative-sentiment guard ([invalid], [no], [fail] …)
      • Edges leaving a Fork bar   (they fan out sideways)
      • Edges arriving at a Join bar (they converge from the sides)
      • Loop-back / retry arcs (they bypass the spine)
    """
    result: Dict[int, str] = {}

    for i, edge in enumerate(edges):
        src_type  = type_map.get(edge.get("from", ""), "Action")
        tgt_type  = type_map.get(edge.get("to",   ""), "Action")
        label     = edge.get("label", "")
        sentiment = _label_sentiment(label)

        # Spine connections to/from Fork-Join bars
        if tgt_type == "Fork" or src_type == "Join":
            result[i] = "high"
        elif src_type == "Fork" or tgt_type == "Join":
            result[i] = "low"
        # Decision exits: positive → spine, negative → branch
        elif src_type == "Decision":
            result[i] = "low" if sentiment == "negative" else "high"
        # Unlabelled sequential flow → spine
        elif not label.strip():
            result[i] = "high"
        # Everything else by sentiment
        else:
            result[i] = "low" if sentiment == "negative" else "high"

    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Trace the happy-path spine
# ─────────────────────────────────────────────────────────────────────────────
def _trace_spine(
    nodes:          List[Dict],
    edges:          List[Dict],
    classification: Dict[int, str],
    type_map:       Dict[str, str],
) -> Set[str]:
    """
    Walk the graph following only HIGH-weight edges from the Start node.
    Every node visited this way becomes part of the "main_spine" group.

    Walk rules
    ──────────
    • Begin at the unique Start node.
    • At each step, follow only HIGH-weight outgoing edges.
    • Fork bars: continue along the first HIGH outgoing edge (there should be
      exactly one HIGH edge going IN to the Fork from the spine; after the Join
      the spine resumes).  Skip into the Fork bar itself and out the far side.
    • Stop when we reach an End node or when no further HIGH edge exists.

    Returns a set of node labels that belong on the vertical spine.
    Fork and Join bar labels are included so dot aligns them centrally too.
    """
    # Build outgoing adjacency: label → [(edge_index, target_label)]
    outgoing: Dict[str, List[Tuple[int, str]]] = {}
    for i, edge in enumerate(edges):
        src = edge.get("from", "")
        outgoing.setdefault(src, []).append((i, edge.get("to", "")))

    # Find Start node
    start = next((n["label"] for n in nodes if n["type"] == "Start"), None)
    if start is None:
        return set()

    spine: Set[str] = set()
    visited: Set[str] = set()
    current = start

    while current and current not in visited:
        visited.add(current)
        spine.add(current)

        ntype = type_map.get(current, "Action")
        if ntype == "End":
            break

        candidates = outgoing.get(current, [])

        # Find HIGH outgoing edges from this node
        high_edges = [
            (i, tgt) for i, tgt in candidates
            if classification.get(i, "high") == "high"
        ]

        if not high_edges:
            break

        # If there are multiple HIGH edges (shouldn't happen for well-formed diagrams,
        # but can for Join outputs), pick the first one.
        _, next_node = high_edges[0]
        current = next_node

    return spine


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Port-constraint edge style  (MUST mirror the Graphviz ports above)
# ─────────────────────────────────────────────────────────────────────────────
def _get_edge_style(
    edge_label: str,
    weight_cls: str,            # 'high' or 'low'
    src_type:   str,
    tgt_type:   str,
    src_pos:    Tuple[int, int],
    tgt_pos:    Tuple[int, int],
    spine_cx:   int,
) -> str:
    """
    Return a complete Draw.io edge style string whose exitX/entryX ports
    EXACTLY mirror the tailport/headport we gave Graphviz, so the XML
    connectors leave/enter nodes from the same sides dot used.

    Draw.io port assignment (synced to Graphviz tailport/headport)
    ──────────────────────────────────────────────────────────────
    Fork  → branch      tailport=s  headport=n   exitX=0.5 exitY=1  entryX=0.5 entryY=0
    Branch → Join       tailport=s  headport=n   exitX=0.5 exitY=1  entryX=0.5 entryY=0
    HIGH (spine)        tailport=s  headport=n   exitX=0.5 exitY=1  entryX=0.5 entryY=0
    LOW (side branch)   tailport=e  headport=n   exitX=1   exitY=0.5 entryX=0.5 entryY=0
    Loop-back           tailport=e  headport=e   exitX=1   exitY=0.5 entryX=1   entryY=0.5
      (ty < sy — target is above source — always route right side)
    """
    sx, sy = src_pos
    tx, ty = tgt_pos

    # ── Fork → branch (both s→n, straight down) ──────────────────────────────
    if src_type == "Fork":
        ports = dict(exitX=0.5, exitY=1, entryX=0.5, entryY=0)

    # ── Branch → Join (both s→n, straight up into bar) ───────────────────────
    elif tgt_type == "Join":
        ports = dict(exitX=0.5, exitY=1, entryX=0.5, entryY=0)

    # ── Loop-back: target is above source ────────────────────────────────────
    # Graphviz assigned tailport=e, headport=e for these.
    # Both sides exit/enter right → the arc routes cleanly around the right
    # edge of the diagram without cutting through any boxes.
    elif ty < sy:
        ports = dict(exitX=1, exitY=0.5, entryX=1, entryY=0.5)

    # ── HIGH weight — main spine (tailport=s → headport=n) ───────────────────
    elif weight_cls == "high":
        ports = dict(exitX=0.5, exitY=1, entryX=0.5, entryY=0)

    # ── LOW weight — side branch (tailport=e → headport=n) ───────────────────
    # "No"/"Error"/"Fail" path always exits the RIGHT side of the source node
    # and enters the TOP of the target.  This guarantees it never overlaps
    # the "Yes" path (which exits the bottom).
    else:
        ports = dict(exitX=1, exitY=0.5, entryX=0.5, entryY=0)

    port_str = (
        f"exitX={ports['exitX']};exitY={ports['exitY']};exitDx=0;exitDy=0;"
        f"entryX={ports['entryX']};entryY={ports['entryY']};entryDx=0;entryDy=0;"
    )
    return BASE_EDGE + port_str


# ─────────────────────────────────────────────────────────────────────────────
# MAIN CLASS
# ─────────────────────────────────────────────────────────────────────────────
class ActivityDiagramGenerator:

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("models/gemini-flash-latest")

    # ── 1. PROMPT ─────────────────────────────────────────────────────────────
    def construct_prompt(self, scenario: str) -> str:
        return f"""
You are a UML Activity Diagram expert. Return ONLY a valid JSON array.

RULES:
1. Decisions must be questions ending with "?"
2. Use guard notation for Decision edges: [yes]/[no], [valid]/[invalid], [success]/[failure]
3. Every step in the scenario must be represented.
4. Use Fork/Join ONLY for genuinely parallel processing (e.g. "simultaneously", "in parallel").
5. Exactly one Start node and one End node.
6. Every Decision must have EXACTLY two outgoing edges.
7. List the POSITIVE/main-flow edge from each Decision FIRST.

JSON Structure (nodes first, then edges):
[
  {{"label": "Start",                 "type": "Start"}},
  {{"label": "Enter Credentials",     "type": "Action"}},
  {{"label": "Credentials Valid?",    "type": "Decision"}},
  {{"label": "Log In User",           "type": "Action"}},
  {{"label": "Show Error",            "type": "Action"}},
  {{"label": "End",                   "type": "End"}},

  {{"from": "Start",              "to": "Enter Credentials"}},
  {{"from": "Enter Credentials",  "to": "Credentials Valid?"}},
  {{"from": "Credentials Valid?", "to": "Log In User",  "label": "[valid]"}},
  {{"from": "Credentials Valid?", "to": "Show Error",   "label": "[invalid]"}},
  {{"from": "Show Error",         "to": "Enter Credentials"}},
  {{"from": "Log In User",        "to": "End"}}
]

For parallel flows, use Fork/Join nodes:
  {{"label": "Fork1", "type": "Fork"}},
  {{"label": "Join1", "type": "Join"}},
  {{"from": "Action",          "to": "Fork1"}},
  {{"from": "Fork1",           "to": "Branch A Action"}},
  {{"from": "Fork1",           "to": "Branch B Action"}},
  {{"from": "Branch A Action", "to": "Join1"}},
  {{"from": "Branch B Action", "to": "Join1"}},
  {{"from": "Join1",           "to": "Next Action"}}

Scenario: {scenario}

Return JSON only — no markdown, no explanation:
"""

    # ── 2. PARSE LLM RESPONSE ─────────────────────────────────────────────────
    def parse_json(self, text: str) -> List[Dict]:
        clean = text.replace("```json", "").replace("```", "").strip()
        s, e  = clean.find("["), clean.rfind("]")
        if s == -1 or e == -1:
            raise ValueError("No JSON array found in LLM response.")
        return json.loads(clean[s : e + 1])

    # ── 3. BUILD WEIGHTED GRAPHVIZ GRAPH ──────────────────────────────────────
    def _build_graphviz(
        self,
        nodes:          List[Dict],
        edges:          List[Dict],
        classification: Dict[int, str],
        spine_nodes:    Set[str],
    ) -> Tuple[graphviz.Digraph, Dict[str, str]]:
        """
        Builds a weighted dot Digraph.
          group="main_spine" on spine nodes  → Graphviz GUARANTEES identical X.
          HIGH-weight edges + tailport=s/headport=n → iron-rod vertical pull.
          LOW-weight  edges + tailport=e/headport=n → side branches exit right.
          rank=same subgraphs → Fork branches share a horizontal rank.
        """
        label_to_id: Dict[str, str] = {n["label"]: f"n{i}" for i, n in enumerate(nodes)}
        type_map:    Dict[str, str] = {n["label"]: n["type"] for n in nodes}  # needed for port logic

        g = graphviz.Digraph(
            engine="dot",
            graph_attr={
                "rankdir": "TB",
                "splines": "ortho",
                "nodesep": "0.8",
                "ranksep": "0.9",
                "margin":  "0.5",
            },
        )

        # Nodes — spine nodes get group="main_spine" so dot enforces identical X
        for node in nodes:
            nid   = label_to_id[node["label"]]
            ntype = node["type"]
            cfg   = NODE_CFG.get(ntype, NODE_CFG["Action"])

            attrs: Dict[str, str] = {
                "shape":     cfg["shape"],
                "width":     str(cfg["width"]),
                "height":    str(cfg["height"]),
                "fixedsize": "true",
                "label":     "" if ntype in ("Start", "End", "Fork", "Join") else node["label"],
            }
            if ntype in ("Start", "End"):
                attrs.update(style="filled", fillcolor="black", fontcolor="white")
            elif ntype in ("Fork", "Join"):
                attrs.update(style="filled", fillcolor="black", color="black")
            elif ntype == "Decision":
                attrs.update(style="filled", fillcolor="#fff2cc", color="#d6b656")
            elif ntype == "Action":
                attrs.update(style="filled,rounded", fillcolor="#dae8fc", color="#6c8ebf")

            # THE KEY FIX: group forces Graphviz to align all spine nodes to
            # the same X coordinate — eliminating staircase drift entirely.
            if node["label"] in spine_nodes:
                attrs["group"] = "main_spine"

            g.node(nid, **attrs)

        # rank=same for Fork branches
        join_labels = {n["label"] for n in nodes if n["type"] == "Join"}
        for node in nodes:
            if node["type"] != "Fork":
                continue
            successors = [
                label_to_id[e["to"]]
                for e in edges
                if e["from"] == node["label"] and e["to"] not in join_labels
            ]
            if len(successors) > 1:
                with g.subgraph() as sg:
                    sg.attr(rank="same")
                    for sid in successors:
                        sg.node(sid)

        # Weighted edges with explicit port enforcement
        # tailport / headport tell dot *which side of the node* the edge must
        # leave / enter — this is what actually prevents the staircase effect.
        #
        #   HIGH (main spine): tailport='s' (south/bottom) → headport='n' (north/top)
        #     Forces a strict top-to-bottom vertical alignment in the dot layout.
        #
        #   LOW (side branch from Decision): tailport='e' (east/right) → headport='n'
        #     Forces the "No" path to exit RIGHT, guaranteeing it is visually
        #     separated from the "Yes" path (which exits south). This fixes the
        #     invisible-edge / overlap bug.
        #
        #   LOW (Fork branches / Join inputs): tailport='s' → headport='n'
        #     Fork bars distribute straight down; branches merge straight up.
        #
        #   Loop-back edges: tailport='e' → headport='e'
        #     Both exit and enter from the right side, routing cleanly around
        #     the right edge of the diagram without cutting through boxes.
        for i, edge in enumerate(edges):
            src = label_to_id.get(edge["from"])
            tgt = label_to_id.get(edge["to"])
            if not src or not tgt:
                continue

            is_high   = classification.get(i, "high") == "high"
            lbl       = edge.get("label", "")
            src_type_ = type_map.get(edge["from"], "Action")
            tgt_type_ = type_map.get(edge["to"],   "Action")

            # Determine tailport and headport
            if src_type_ == "Fork":
                # Fork bar distributes downward to each branch
                tailport, headport = "s", "n"
            elif tgt_type_ == "Join":
                # Branches converge upward into Join bar
                tailport, headport = "s", "n"
            elif is_high:
                # Spine: strictly south → north
                tailport, headport = "s", "n"
            else:
                # LOW weight side branch: exit right → enter top
                # This visually separates "No" from "Yes" at every diamond
                tailport, headport = "e", "n"

            g.edge(
                src, tgt,
                label    = f" {lbl} " if lbl else "",
                weight   = W_HIGH if is_high else W_LOW,
                minlen   = "1"   if is_high else "2",
                tailport = tailport,
                headport = headport,
            )

        return g, label_to_id
    def _extract_positions(
        self, g: graphviz.Digraph, label_to_id: Dict[str, str]
    ) -> Dict[str, Tuple[int, int, int, int]]:
        """dot engine → JSON → {label: (cx_px, cy_px, w_px, h_px)}  (y flipped)."""
        raw     = g.pipe(format="json").decode("utf-8")
        gv_json = json.loads(raw)

        id_to_label       = {v: k for k, v in label_to_id.items()}
        canvas_height_pts = float(gv_json.get("bb", "0,0,0,0").split(",")[3])

        positions: Dict[str, Tuple[int, int, int, int]] = {}
        for obj in gv_json.get("objects", []):
            label = id_to_label.get(obj.get("name", ""))
            if not label:
                continue
            cx_pts, cy_pts = (float(v) for v in obj.get("pos", "0,0").split(","))
            w_pts = float(obj.get("width",  "1.0")) * GV_DPI
            h_pts = float(obj.get("height", "0.5")) * GV_DPI
            positions[label] = (
                _px(cx_pts),
                _px(canvas_height_pts - cy_pts),
                _px(w_pts),
                _px(h_pts),
            )
        return positions

    # ── 4b. COMPUTE SPINE CENTRE X ────────────────────────────────────────────
    def _compute_spine_cx(
        self,
        spine_nodes: Set[str],
        positions:   Dict[str, Tuple[int, int, int, int]],
    ) -> int:
        """
        After Graphviz layout, all spine nodes should share the same X
        (because of group="main_spine").  Return that X as the spine centre.
        Falls back to median of all node X values if spine is empty.
        """
        spine_xs = [positions[lbl][0] for lbl in spine_nodes if lbl in positions]

        if not spine_xs:
            all_xs = [p[0] for p in positions.values()]
            all_xs.sort()
            return all_xs[len(all_xs) // 2]

        # With group enforced, all values should be equal; median handles any
        # tiny floating-point rounding differences from the PTS_TO_PX scale.
        spine_xs.sort()
        return spine_xs[len(spine_xs) // 2]

    # ── 5. VALIDATION ─────────────────────────────────────────────────────────
    def _validate(self, nodes: List[Dict], edges: List[Dict]) -> None:
        outgoing: Dict[str, int] = {}
        for e in edges:
            outgoing[e["from"]] = outgoing.get(e["from"], 0) + 1
        for n in nodes:
            if n["type"] == "Decision" and outgoing.get(n["label"], 0) != 2:
                print(f"  ⚠️  Decision '{n['label']}' has "
                      f"{outgoing.get(n['label'], 0)} outgoing edges (expected 2)")
            if n["type"] == "End" and outgoing.get(n["label"], 0) > 0:
                print(f"  ⚠️  End node '{n['label']}' has outgoing edges.")

    # ── 6. GENERATE DRAW.IO XML ───────────────────────────────────────────────
    def _generate_drawio_xml(
        self,
        nodes:          List[Dict],
        edges:          List[Dict],
        positions:      Dict[str, Tuple[int, int, int, int]],
        classification: Dict[int, str],
        spine_cx:       int,
    ) -> str:
        parts: List[str] = [
            '<mxGraphModel>',
            '<root>',
            '<mxCell id="0" />',
            '<mxCell id="1" parent="0" />',
        ]
        node_map: Dict[str, str] = {}
        type_map: Dict[str, str] = {n["label"]: n["type"] for n in nodes}
        cell_id = 100

        # Nodes
        for node in nodes:
            lbl   = node["label"]
            ntype = node["type"]
            if lbl not in positions:
                print(f"  ⚠️  No position for '{lbl}' — skipping.")
                continue

            cx, cy, w, h = positions[lbl]
            x, y         = cx - w // 2, cy - h // 2
            display      = "" if ntype in ("Start", "End", "Fork", "Join") else _sanitize(lbl)
            style        = DRAWIO_STYLES.get(ntype, DRAWIO_STYLES["Action"])

            sid = str(cell_id); node_map[lbl] = sid; cell_id += 1
            parts.append(
                f'<mxCell id="{sid}" value="{display}" style="{style}" '
                f'vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />'
                f'</mxCell>'
            )

        # Edges
        for i, edge in enumerate(edges):
            src = edge.get("from", "")
            tgt = edge.get("to",   "")
            lbl = _sanitize(edge.get("label", ""))

            if src not in node_map or tgt not in node_map:
                continue

            src_type = type_map.get(src, "Action")
            tgt_type = type_map.get(tgt, "Action")
            src_pos  = positions.get(src, (spine_cx, 0))[:2]
            tgt_pos  = positions.get(tgt, (spine_cx, 0))[:2]

            style = _get_edge_style(
                edge_label = edge.get("label", ""),
                weight_cls = classification.get(i, "high"),
                src_type   = src_type,
                tgt_type   = tgt_type,
                src_pos    = src_pos,
                tgt_pos    = tgt_pos,
                spine_cx   = spine_cx,
            )

            eid = str(cell_id); cell_id += 1
            parts.append(
                f'<mxCell id="{eid}" value="{lbl}" style="{style}" '
                f'edge="1" parent="1" source="{node_map[src]}" target="{node_map[tgt]}">'
                f'<mxGeometry relative="1" as="geometry" />'
                f'</mxCell>'
            )

        parts += ["</root>", "</mxGraphModel>"]
        return "".join(parts)

    # ── 7. PUBLIC ENTRY POINT ─────────────────────────────────────────────────
    def generate_diagram(self, prompt: str) -> str:
        print("\n🔄 Generating Activity Diagram (group spine + iron-rod weights)...")
        try:
            raw  = self.model.generate_content(self.construct_prompt(prompt))
            data = self.parse_json(raw.text)

            nodes = [i for i in data if "type" in i and "label" in i]
            edges = [i for i in data if "from" in i and "to"   in i]

            if not nodes:
                raise ValueError("LLM returned no nodes.")

            print(f"  📊 Nodes: {len(nodes)}  |  Edges: {len(edges)}")
            self._validate(nodes, edges)

            type_map       = {n["label"]: n["type"] for n in nodes}
            classification = _classify_edges(edges, type_map)

            high = sum(1 for v in classification.values() if v == "high")
            low  = len(classification) - high
            print(f"  🏷️  Edge weights — HIGH (spine): {high}  LOW (branch): {low}")

            # Trace the happy-path spine before building the graph
            spine_nodes = _trace_spine(nodes, edges, classification, type_map)
            print(f"  🧭 Spine nodes ({len(spine_nodes)}): {sorted(spine_nodes)}")

            gv_graph, label_to_id = self._build_graphviz(
                nodes, edges, classification, spine_nodes
            )
            positions = self._extract_positions(gv_graph, label_to_id)
            print(f"  📍 Positions resolved for {len(positions)}/{len(nodes)} nodes.")

            spine_cx = self._compute_spine_cx(spine_nodes, positions)
            print(f"  🎯 Spine centre X: {spine_cx}px")

            xml = self._generate_drawio_xml(nodes, edges, positions, classification, spine_cx)
            print("✅ Activity Diagram generated successfully!")
            return xml

        except Exception as exc:
            print(f"❌ Error: {exc}")
            raise ValueError(str(exc)) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Standalone test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    gen = ActivityDiagramGenerator()

    tests = [
        ("Login Flow",
         "User login flow with credential validation and error retry"),
        ("Order Fulfillment",
         "Order fulfilment: verify payment, then notify warehouse and update "
         "inventory in parallel, then ship order"),
        ("ATM Withdrawal",
         "ATM cash withdrawal: insert card, enter PIN with retry limit (max 3), "
         "select amount, check balance, dispense cash and print receipt in parallel, "
         "then eject card"),
    ]

    for name, scenario in tests:
        print(f"\n{'='*65}\nTEST: {name}\n{'='*65}")
        try:
            result = gen.generate_diagram(scenario)
            print(f"Generated {len(result):,} characters of XML")
        except Exception as e:
            print(f"FAILED: {e}")