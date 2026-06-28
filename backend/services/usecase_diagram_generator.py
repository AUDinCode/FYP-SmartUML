"""
USE CASE DIAGRAM GENERATOR V8
═══════════════════════════════════════════════════════════════════════════════
Key design decisions that fix all previous regressions:

① NO cluster_system subgraph
    Putting UCs inside a Graphviz cluster makes them children of the swimlane
    cell in Draw.io, which breaks cross-parent edge routing (the "lines going
    through the box" bug). All nodes are declared at the TOP LEVEL of the
    Digraph. The system boundary is drawn as a plain rectangle in the XML.

② ALL Draw.io nodes use parent="1" (canvas root)
    No swimlane nesting. All coordinates are absolute. Edges between any two
    nodes are trivially resolved.

③ Three flat rank subgraphs (not clusters)
    rank="source" → Primary actors  (LEFT column)
    rank="same"   → All use cases   (MIDDLE, ≥1 rank groups for columns)
    rank="sink"   → Secondary actors (RIGHT column)

④ Label escaping — html.escape() ONLY, NO re.sub tag-stripping
    <<include>> → &lt;&lt;include&gt;&gt;  (Draw.io renders: <<include>>)
    The old regex r'<[^>]+>' consumed <<include> and left only '>'.

⑤ Actor classification — KEYWORD CHECK IS RULE 1
    Before any edge-direction analysis, if the name contains "Server",
    "System", "Gateway", "Database", "API", "Service", "Engine", "Provider",
    it is forced Secondary (Right). This prevents "Bank Server → UC" from
    mistakenly classifying it as Primary due to being an edge source.

⑥ Edge style — curved orthogonal, NOT strict orthogonal
    edgeStyle=elbowEdgeStyle;elbow=orthogonal;curved=1  gives smooth lines
    that route cleanly without the vertical-line-through-everything artifact.
"""
from __future__ import annotations

import html
import json
import os
import re
from typing import Dict, List, Optional, Set, Tuple

import google.generativeai as genai
import graphviz
from dotenv import load_dotenv

load_dotenv()


# ───────────────────────────────────────────────────────────────────────────────
# Constants
# ───────────────────────────────────────────────────────────────────────────────
GV_DPI  = 72.0   # Graphviz internal DPI (points per inch)
DIO_DPI = 96.0   # Draw.io canvas DPI (pixels per inch)

UC_W    = 160    # Use case ellipse width  (px)
UC_H    = 60     # Use case ellipse height (px)
ACTOR_W = 40     # Actor icon width  (px)
ACTOR_H = 75     # Actor icon height (px)
MARGIN  = 80     # Extra canvas padding (px)

# Checked FIRST — any actor whose label contains one of these words goes RIGHT
SECONDARY_KEYWORDS: Set[str] = {
    "server", "system", "database", "db", "api",
    "gateway", "service", "engine", "provider", "platform",
}


# ───────────────────────────────────────────────────────────────────────────────
# Pure helpers
# ───────────────────────────────────────────────────────────────────────────────
def _esc(text: Optional[str]) -> str:
    """
    Double HTML-escape for Draw.io mxCell value attributes to support html=1.
    Prevents browser from parsing <<include>> / <<extend>> as HTML tags.
    """
    if not text:
        return ""
    first = html.escape(str(text).strip())
    return html.escape(first, quote=True)


def _safe_id(label: str) -> str:
    """DOT-safe node ID: replace non-alphanumeric chars with underscores."""
    return re.sub(r"[^A-Za-z0-9_]", "_", label)


def _pts_to_px(pts: float) -> int:
    """Graphviz points → Draw.io pixels."""
    return int(round(pts * DIO_DPI / GV_DPI))


def _is_secondary(label: str) -> bool:
    """True if the actor label contains any secondary keyword (case-insensitive)."""
    low = label.lower()
    return any(kw in low for kw in SECONDARY_KEYWORDS)


# ───────────────────────────────────────────────────────────────────────────────
# Generator
# ───────────────────────────────────────────────────────────────────────────────
class UseCaseDiagramGenerator:

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("❌ GEMINI_API_KEY not found in environment variables.")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("models/gemini-flash-latest")

    def construct_prompt(self, scenario: str) -> str:
        return f"""
You are a UML Use Case Diagram expert. Return ONLY a valid JSON array — no markdown, no explanation.

JSON structure:
[
  {{"label": "Customer",      "type": "Actor", "actorType": "Primary"}},
  {{"label": "Bank Server",   "type": "Actor", "actorType": "Secondary"}},
  {{"label": "Withdraw Cash", "type": "UseCase"}},
  {{"label": "Authenticate",  "type": "UseCase"}},
  {{"label": "Print Receipt", "type": "UseCase"}},
  {{"label": "Apply Fee",      "type": "UseCase"}},
  {{"label": "Customer",      "connectsTo": "Withdraw Cash"}},
  {{"label": "Withdraw Cash", "connectsTo": "Authenticate",  "connectionLabel": "<<include>>"}},
  {{"label": "Withdraw Cash", "connectsTo": "Print Receipt", "connectionLabel": "<<include>>"}},
  {{"label": "Apply Fee",      "connectsTo": "Withdraw Cash", "connectionLabel": "<<extend>>"}},
  {{"label": "Bank Server",   "connectsTo": "Authenticate"}}
]

STRICT RULES:
1. Actor types: Primary = human users. Secondary = external systems (Server, API, Gateway, Database).
2. connectionLabel MUST be exactly "<<include>>" or "<<extend>>" — use DOUBLE angle brackets.
    - For "<<include>>", the arrow points from the Base Use Case to the Inclusion Use Case (e.g. {{"label": "BaseUseCase", "connectsTo": "InclusionUseCase", "connectionLabel": "<<include>>"}}).
   - For "<<extend>>", the arrow points from the Extension Use Case to the Base Use Case (e.g. {{"label": "ExtensionUseCase", "connectsTo": "BaseUseCase", "connectionLabel": "<<extend>>"}}).
3. Actor→UseCase and UseCase→Actor associations must have NO connectionLabel field.
4. Every actor must have at least one connection to a use case.
5. Return ONLY the JSON array. No text before or after.

Scenario: {scenario}

JSON:
"""

    # ── JSON parse ───────────────────────────────────────────────────────────────
    def parse_json(self, text: str) -> List[Dict]:
        clean = text.replace("```json", "").replace("```", "").strip()
        s, e = clean.find("["), clean.rfind("]")
        if s == -1 or e == -1:
            raise ValueError("No JSON array found in LLM response.")
        return json.loads(clean[s : e + 1])

    # ── Element extraction ────────────────────────────────────────────────────────
    def _extract(
        self, data: List[Dict]
    ) -> Tuple[Dict[str, str], List[str], List[Dict]]:
        """
        Returns:
          actors_map  : {label: declared_actorType}
          use_cases   : ordered list
          connections : list of connection dicts
        """
        actors_map:  Dict[str, str] = {}
        use_cases:   List[str]      = []
        connections: List[Dict]     = []

        for item in data:
            lbl = item.get("label", "").strip()
            if not lbl:
                continue
            t = item.get("type", "")
            if t == "Actor":
                if lbl not in actors_map:
                    actors_map[lbl] = item.get("actorType", "Primary")
            elif t == "UseCase":
                if lbl not in use_cases:
                    use_cases.append(lbl)
            if item.get("connectsTo"):
                connections.append(item)

        # Promote implicit UCs (referenced in connections but never declared)
        actor_set = set(actors_map)
        for conn in connections:
            tgt = conn.get("connectsTo", "").strip()
            if tgt and tgt not in use_cases and tgt not in actor_set:
                use_cases.append(tgt)

        return actors_map, use_cases, connections

    # ── Actor classification ──────────────────────────────────────────────────────
    def _classify(
        self,
        actors_map:  Dict[str, str],
        use_cases:   List[str],
        connections: List[Dict],
    ) -> Tuple[List[str], List[str]]:
        """
        Priority order (FIRST match wins):
          1. Keyword in name           → Secondary (Right)   ← CHECKED FIRST
          2. Declared as "Secondary"   → Secondary (Right)
          3. Is TARGET of a UC→Actor edge → Secondary (Right)
          4. Everything else           → Primary  (Left)
        """
        uc_set     = set(use_cases)
        actor_set  = set(actors_map)

        # Actors that receive an edge FROM a use case
        uc_to_actor: Set[str] = set()
        for conn in connections:
            src = conn.get("label", "").strip()
            tgt = conn.get("connectsTo", "").strip()
            cl  = conn.get("connectionLabel", "").lower()
            if "include" in cl or "extend" in cl:
                continue
            if src in uc_set and tgt in actor_set:
                uc_to_actor.add(tgt)

        primary:   List[str] = []
        secondary: List[str] = []

        for actor, declared in actors_map.items():
            if _is_secondary(actor):           # Rule 1 — keyword → RIGHT
                secondary.append(actor)
            elif declared == "Secondary":      # Rule 2 — declared → RIGHT
                secondary.append(actor)
            elif actor in uc_to_actor:         # Rule 3 — receives from UC → RIGHT
                secondary.append(actor)
            else:                              # Rule 4 — default → LEFT
                primary.append(actor)

        return primary, secondary

    # ── Build Graphviz graph ──────────────────────────────────────────────────────
    def _build_graphviz(
        self,
        primary:     List[str],
        secondary:   List[str],
        use_cases:   List[str],
        connections: List[Dict],
    ) -> graphviz.Digraph:
        """
        Flat graph — NO cluster_system. Three plain rank subgraphs:
          rank=source  → primary actors   (LEFT)
          rank=same    → all use cases    (MIDDLE)
          rank=sink    → secondary actors (RIGHT)

        This keeps all nodes at the top-level scope so Graphviz returns
        a single unified coordinate space — no cluster-relative offsets to
        translate, and no cross-parent edge routing issues in Draw.io.
        """
        all_actors = set(primary + secondary)

        g = graphviz.Digraph(
            engine="dot",
            graph_attr={
                "rankdir":  "LR",
                "splines":  "polyline",   # straight segments, no weird routing
                "nodesep":  "0.6",
                "ranksep":  "1.2",
                "margin":   "0.5",
                "fontname": "Helvetica",
            },
        )

        # ── Primary actors → LEFT (rank=source) ─────────────────────────────
        with g.subgraph() as sg:
            sg.attr(rank="source")
            for actor in primary:
                sg.node(
                    _safe_id(actor), label=actor,
                    shape="box", fixedsize="true",
                    width=str(round(ACTOR_W / GV_DPI, 3)),
                    height=str(round(ACTOR_H / GV_DPI, 3)),
                )

        # ── Use cases → MIDDLE (rank=same keeps them in one band) ───────────
        # Split into two rank=same groups: base UCs and dep UCs.
        # This encourages Graphviz to create two visible columns inside the
        # middle zone, matching standard UML use case layout.
        dep_targets: Set[str] = set()
        for conn in connections:
            cl = conn.get("connectionLabel", "").lower()
            if "include" in cl or "extend" in cl:
                t = conn.get("connectsTo", "").strip()
                if t:
                    dep_targets.add(t)

        base_ucs = [uc for uc in use_cases if uc not in dep_targets]
        dep_ucs  = [uc for uc in use_cases if uc in dep_targets]

        with g.subgraph() as sg:
            sg.attr(rank="same")
            for uc in base_ucs:
                sg.node(
                    _safe_id(uc), label=uc,
                    shape="ellipse", fixedsize="true",
                    width=str(round(UC_W / GV_DPI, 3)),
                    height=str(round(UC_H / GV_DPI, 3)),
                )

        if dep_ucs:
            with g.subgraph() as sg:
                sg.attr(rank="same")
                for uc in dep_ucs:
                    sg.node(
                        _safe_id(uc), label=uc,
                        shape="ellipse", fixedsize="true",
                        width=str(round(UC_W / GV_DPI, 3)),
                        height=str(round(UC_H / GV_DPI, 3)),
                    )

        # ── Secondary actors → RIGHT (rank=sink) ────────────────────────────
        with g.subgraph() as sg:
            sg.attr(rank="sink")
            for actor in secondary:
                sg.node(
                    _safe_id(actor), label=actor,
                    shape="box", fixedsize="true",
                    width=str(round(ACTOR_W / GV_DPI, 3)),
                    height=str(round(ACTOR_H / GV_DPI, 3)),
                )

        # ── Edges ────────────────────────────────────────────────────────────
        for conn in connections:
            src = conn.get("label", "").strip()
            tgt = conn.get("connectsTo", "").strip()
            cl  = conn.get("connectionLabel", "").strip()
            if not src or not tgt:
                continue

            sid = _safe_id(src)
            tid = _safe_id(tgt)
            clo = cl.lower()

            if src in all_actors and tgt in all_actors:
                g.edge(sid, tid, dir="forward", arrowhead="onormal", style="solid", label="")
            elif src in all_actors or tgt in all_actors:
                g.edge(sid, tid, dir="none", style="solid", label="")
            elif "include" in clo or "extend" in clo:
                g.edge(
                    sid, tid,
                    label=f" {cl} ",
                    dir="forward", style="dashed", arrowhead="open",
                    fontsize="10", fontname="Helvetica",
                )
            elif "generali" in clo or "inherit" in clo:
                g.edge(sid, tid, dir="forward", arrowhead="onormal", style="solid", label="")
            else:
                g.edge(sid, tid, dir="none", style="solid",
                       label=f" {cl} " if cl else "")

        return g

    # ── Extract positions ─────────────────────────────────────────────────────────
    def _extract_positions(
        self,
        g:          graphviz.Digraph,
        all_labels: List[str],
    ) -> Dict[str, Tuple[int, int, int, int]]:
        """
        Returns {label: (cx_px, cy_px, w_px, h_px)} in Draw.io pixel coords.
        Y is flipped (Graphviz Y=0 at bottom; Draw.io Y=0 at top).
        All coordinates are ABSOLUTE (no cluster-relative offset needed).
        """
        raw          = g.pipe(format="json").decode("utf-8")
        gv_json      = json.loads(raw)
        canvas_h_pts = float(gv_json.get("bb", "0,0,0,0").split(",")[3])

        id_to_label: Dict[str, str] = {_safe_id(lbl): lbl for lbl in all_labels}
        positions:   Dict[str, Tuple[int, int, int, int]] = {}

        for obj in gv_json.get("objects", []):
            lbl = id_to_label.get(obj.get("name", ""))
            if not lbl:
                continue
            cx_pts, cy_pts = (float(v) for v in obj.get("pos", "0,0").split(","))
            w_pts = float(obj.get("width",  "1.0")) * GV_DPI
            h_pts = float(obj.get("height", "0.5")) * GV_DPI
            positions[lbl] = (
                MARGIN + _pts_to_px(cx_pts),
                MARGIN + _pts_to_px(canvas_h_pts - cy_pts),  # flip Y
                _pts_to_px(w_pts),
                _pts_to_px(h_pts),
            )

        return positions

    # ── Compute system boundary rectangle ────────────────────────────────────────
    def _system_bbox(
        self,
        use_cases: List[str],
        positions: Dict[str, Tuple[int, int, int, int]],
    ) -> Tuple[int, int, int, int]:
        """
        Compute a tight bounding box around all UC nodes, with padding,
        to use as the manually-drawn System boundary rectangle.
        """
        uc_pos = [positions[uc] for uc in use_cases if uc in positions]
        if not uc_pos:
            return 200, 80, 500, 400

        PAD = 35
        min_x = min(cx - w // 2 for cx, cy, w, h in uc_pos) - PAD
        min_y = min(cy - h // 2 for cx, cy, w, h in uc_pos) - PAD
        max_x = max(cx + w // 2 for cx, cy, w, h in uc_pos) + PAD
        max_y = max(cy + h // 2 for cx, cy, w, h in uc_pos) + PAD

        return min_x, min_y, max_x - min_x, max_y - min_y

    # ── Generate Draw.io XML ──────────────────────────────────────────────────────
    def _generate_xml(
        self,
        primary:     List[str],
        secondary:   List[str],
        use_cases:   List[str],
        connections: List[Dict],
        positions:   Dict[str, Tuple[int, int, int, int]],
    ) -> str:

        nodes_xml: List[str] = [
            '<mxGraphModel>',
            '<root>',
            '<mxCell id="0"/>',
            '<mxCell id="1" parent="0"/>',
        ]
        edges_xml: List[str] = []
        node_map:  Dict[str, str] = {}
        cell_id    = 100
        all_actors = set(primary + secondary)

        # ── System boundary: plain rectangle (NOT swimlane, NOT cluster) ─────
        # A simple rectangle with a "System" label at the top.
        # All nodes remain at parent="1" so edges never cross parent boundaries.
        sx, sy, sw, sh = self._system_bbox(use_cases, positions)
        sys_rect_id = str(cell_id); cell_id += 1
        nodes_xml.append(
            f'<mxCell id="{sys_rect_id}" value="System" '
            f'style="text;html=1;strokeColor=#000000;fillColor=none;'
            f'align=center;verticalAlign=top;spacingTop=4;fontSize=14;fontStyle=1;'
            f'whiteSpace=wrap;overflow=hidden;rotatable=0;" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{sx}" y="{sy}" width="{sw}" height="{sh}" as="geometry"/>'
            f'</mxCell>'
        )
        # Separate border rectangle so the label doesn't fight with the box stroke
        border_id = str(cell_id); cell_id += 1
        nodes_xml.append(
            f'<mxCell id="{border_id}" value="" '
            f'style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;'
            f'strokeColor=#000000;strokeWidth=2;pointerEvents=0;" '
            f'vertex="1" parent="1">'
            f'<mxGeometry x="{sx}" y="{sy}" width="{sw}" height="{sh}" as="geometry"/>'
            f'</mxCell>'
        )

        # ── Actor nodes — all at parent="1", absolute coords ─────────────────
        for actor in primary + secondary:
            if actor not in positions:
                print(f"  ⚠️  No position for actor '{actor}' — skipped")
                continue
            cx, cy, _, _ = positions[actor]
            x = cx - ACTOR_W // 2
            y = cy - ACTOR_H // 2
            nid = str(cell_id); node_map[actor] = nid; cell_id += 1
            nodes_xml.append(
                f'<mxCell id="{nid}" value="{_esc(actor)}" '
                f'style="shape=umlActor;verticalLabelPosition=bottom;'
                f'verticalAlign=top;html=1;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#000000;" '
                f'vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" '
                f'width="{ACTOR_W}" height="{ACTOR_H}" as="geometry"/>'
                f'</mxCell>'
            )

        # ── Use case nodes — all at parent="1", absolute coords ──────────────
        for uc in use_cases:
            if uc not in positions:
                print(f"  ⚠️  No position for UC '{uc}' — skipped")
                continue
            cx, cy, _, _ = positions[uc]
            x = cx - UC_W // 2
            y = cy - UC_H // 2
            nid = str(cell_id); node_map[uc] = nid; cell_id += 1
            nodes_xml.append(
                f'<mxCell id="{nid}" value="{_esc(uc)}" '
                f'style="ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;fontSize=11;" '
                f'vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" '
                f'width="{UC_W}" height="{UC_H}" as="geometry"/>'
                f'</mxCell>'
            )

        # ── Edges — all at parent="1" ────────────────────────────────────────
        # Smooth curved style prevents the vertical-line-through-box artifact.
        BASE_ASSOC = (
            "endArrow=none;html=1;rounded=1;curved=1;"
        )
        BASE_DEP = (
            "endArrow=open;endFill=0;dashed=1;dashPattern=8 4;"
            "html=1;rounded=1;curved=1;fontSize=11;fontStyle=0;"
            "verticalAlign=bottom;"
        )
        BASE_GEN = "endArrow=block;endFill=0;endSize=14;html=1;rounded=1;"

        for conn in connections:
            src_lbl = conn.get("label",           "").strip()
            tgt_lbl = conn.get("connectsTo",      "").strip()
            cl      = conn.get("connectionLabel", "").strip()

            if src_lbl not in node_map or tgt_lbl not in node_map:
                continue

            clo = cl.lower()
            eid = str(cell_id); cell_id += 1

            if src_lbl in all_actors and tgt_lbl in all_actors:
                style = BASE_GEN
                value = ""
            elif src_lbl in all_actors or tgt_lbl in all_actors:
                style = BASE_ASSOC
                value = ""

            elif "include" in clo or "extend" in clo:
                style = BASE_DEP
                value = _esc(cl)

            elif "generali" in clo or "inherit" in clo:
                style = BASE_GEN
                value = ""

            else:
                style = BASE_ASSOC
                value = _esc(cl)

            edges_xml.append(
                f'<mxCell id="{eid}" value="{value}" style="{style}" '
                f'edge="1" parent="1" '
                f'source="{node_map[src_lbl]}" target="{node_map[tgt_lbl]}">'
                f'<mxGeometry relative="1" as="geometry"/>'
                f'</mxCell>'
            )

        # Combine: root element stuff first, then edges, then nodes, then closing tags
        # Drawing edges before nodes makes them render in the background!
        header = nodes_xml[:4]
        only_nodes = nodes_xml[4:]
        final_parts = header + edges_xml + only_nodes + ["</root>", "</mxGraphModel>"]
        return "".join(final_parts)

    # ── Public entry point ────────────────────────────────────────────────────────
    def generate_diagram(self, prompt: str) -> str:
        print("\n🎯 Use Case Generator V8 — Flat Graph, Absolute Coords, Fixed Labels")

        try:
            response = self.model.generate_content(self.construct_prompt(prompt))
            data     = self.parse_json(response.text)

            actors_map, use_cases, connections = self._extract(data)
            primary, secondary = self._classify(actors_map, use_cases, connections)

            print(f"  ✅ Primary   (Left)  : {primary}")
            print(f"  ✅ Secondary (Right) : {secondary}")
            print(f"  📐 Use Cases         : {use_cases}")

            all_labels = primary + secondary + use_cases
            g = self._build_graphviz(primary, secondary, use_cases, connections)

            positions = self._extract_positions(g, all_labels)
            print(f"  📍 Positions: {len(positions)}/{len(all_labels)} nodes resolved")

            xml = self._generate_xml(
                primary, secondary, use_cases, connections, positions
            )
            print(f"✅ Done — {len(xml):,} chars\n")
            return xml

        except Exception as exc:
            print(f"❌ Error: {exc}")
            raise ValueError(str(exc)) from exc


# ───────────────────────────────────────────────────────────────────────────────
# Standalone test
# ───────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    gen = UseCaseDiagramGenerator()

    tests = [
        ("ATM System",
         "ATM: Customer can withdraw cash, check balance, deposit funds. "
         "Withdrawal and deposit both include authentication. "
         "Bank Server handles authentication."),

        ("Library System",
         "Library: Student can borrow book and return book. "
         "Borrowing includes checking availability. "
         "Librarian can add new book; adding includes verifying ISBN. "
         "Library Database is a secondary actor."),

        ("Hospital System",
         "Hospital: Medical Staff and Doctor can perform surgery; "
         "surgery includes sterilize equipment. "
         "Doctor can issue prescription (includes discharge patient) "
         "and order lab tests (includes view patient record). "
         "Nurse can view patient record. "
         "EHR System is a secondary actor."),

        ("Food Delivery",
         "Food delivery platform: Customer can place order, track delivery, "
         "browse restaurants. Place order includes payment processing and "
         "extends with apply promo code. "
         "Restaurant Manager can manage menu items and update order status. "
         "Delivery Driver can accept delivery job and update live location. "
         "Payment Gateway, Map Service, Push Notification Service are secondary actors."),
    ]

    for name, scenario in tests:
        print(f"\n{'='*65}\nTEST: {name}\n{'='*65}")
        try:
            result = gen.generate_diagram(scenario)
            print(f"Generated {len(result):,} chars of Draw.io XML")
        except Exception as e:
            print(f"FAILED: {e}")