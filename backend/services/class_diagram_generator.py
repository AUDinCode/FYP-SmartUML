"""
CLASS DIAGRAM GENERATOR  v5.0
══════════════════════════════════════════════════════════════════════════════
Pipeline
  LLM (Gemini Flash)
    → JSON semantic model
    → NetworkX  (graph analysis: layering, inheritance ranking, assoc-class
                 detection, barycenter ordering, adaptive strategy)
    → Graphviz dot  (size-aware pixel layout — zero overlaps guaranteed)
    → Draw.io XML string  (final deliverable)

Why the combination?
  NetworkX        — rich graph algorithms: longest-path layering, barycenter
                    crossing minimisation, cycle detection, topology analysis.
                    Excellent for *deciding* where things belong logically.
  Graphviz dot    — given exact node w/h in inches, computes pixel centres
                    that respect every box's footprint → no overlaps, ever.
                    The -Tplain output is one clean line per node.

Install
  pip install google-generativeai python-dotenv networkx
  sudo apt-get install graphviz   # or: brew install graphviz
"""

from __future__ import annotations

import html
import json
import os
import re
import subprocess
from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

import google.generativeai as genai
import networkx as nx
from dotenv import load_dotenv

load_dotenv()


# ══════════════════════════════════════════════════════════════════════════════
# Visual / layout constants  ── single source of truth
# ══════════════════════════════════════════════════════════════════════════════
class _C:
    # class box geometry (pixels)
    CLASS_W_PX   = 230
    HEADER_H_PX  = 46
    SEP_H_PX     = 8
    ATTR_H_PX    = 26
    METHOD_H_PX  = 26
    MIN_SEC_PX   = 36

    # Graphviz spacing (inches)
    DPI          = 96       # Draw.io canvas DPI
    NODESEP      = 1.0      # horizontal gap between sibling nodes
    RANKSEP      = 1.4      # vertical gap between ranks
    MARGIN_PX    = 60       # canvas margin (pixels)

    @classmethod
    def to_in(cls, px: int) -> float:
        """Convert pixels → inches for Graphviz."""
        return round(px / cls.DPI, 4)

    @classmethod
    def box_h(cls, n_attrs: int, n_methods: int) -> int:
        """Exact pixel height of a class box."""
        return (
            cls.HEADER_H_PX + cls.SEP_H_PX
            + max(n_attrs   * cls.ATTR_H_PX,   cls.MIN_SEC_PX)
            + cls.SEP_H_PX
            + max(n_methods * cls.METHOD_H_PX, cls.MIN_SEC_PX)
            + 10
        )


# ══════════════════════════════════════════════════════════════════════════════
class ClassDiagramGenerator:
    """
    LLM → JSON → NetworkX analysis → Graphviz layout → Draw.io XML.
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("❌ GEMINI_API_KEY not found")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("models/gemini-flash-latest")

    # ──────────────────────────────────────────────────────────────────────────
    # Utility
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _sanitize(text: Optional[str]) -> str:
        if not text:
            return ""
        return html.escape(re.sub(r"<[^>]+>", "", str(text)))

    # ──────────────────────────────────────────────────────────────────────────
    # LLM Prompt
    # ──────────────────────────────────────────────────────────────────────────
    def construct_prompt(self, scenario: str) -> str:
        return f"""
You are a UML Class Diagram expert. Return ONLY a valid JSON array — no markdown, no text.

STRICT RULES:
1. NO extra classes — only those explicitly mentioned in the scenario.
2. MANY-TO-MANY → create an association class.
   The association class MUST be the FROM source of BOTH edges:
     {{"from":"Enrollment","to":"Student",...}} and {{"from":"Enrollment","to":"Course",...}}
3. MULTIPLICITY is mandatory on every association (fromMultiplicity AND toMultiplicity).
4. METHODS belong to the class logically responsible for the action.
5. Every class needs ≥ 2 attributes and ≥ 1 method.
6. Use UML visibility: + public, - private, # protected. Always include types.
7. Keep diagram to 3–6 classes.

RELATIONSHIP TYPES: "inheritance" | "composition" | "aggregation" | "association"

JSON STRUCTURE:
[
  {{"type":"Class","name":"Student",
    "attributes":["-studentId: String","-name: String","-email: String"],
    "methods":["+registerCourse(c: Course): void","+calculateGPA(): float"]}},
  {{"type":"Class","name":"Course",
    "attributes":["-courseId: String","-title: String","-credits: int"],
    "methods":["+displayDetails(): void"]}},
  {{"type":"Class","name":"Enrollment",
    "attributes":["-enrollmentId: String","-grade: String"],
    "methods":["+updateGrade(g: String): void"]}},
  {{"type":"Relationship","from":"Enrollment","to":"Student",
    "relationshipType":"association","fromMultiplicity":"*","toMultiplicity":"1"}},
  {{"type":"Relationship","from":"Enrollment","to":"Course",
    "relationshipType":"association","fromMultiplicity":"*","toMultiplicity":"1"}}
]

Scenario: {scenario}

Return ONLY the JSON array:
"""

    # ──────────────────────────────────────────────────────────────────────────
    # JSON parsing
    # ──────────────────────────────────────────────────────────────────────────
    def parse_json(self, text: str) -> List[Dict]:
        clean = text.replace("```json", "").replace("```", "").strip()
        s, e = clean.find("["), clean.rfind("]")
        if s == -1 or e == -1:
            raise ValueError("No JSON array found in LLM response")
        return json.loads(clean[s : e + 1])

    # ══════════════════════════════════════════════════════════════════════════
    # ███  NETWORKX LOGIC LAYER  ███
    # Everything that concerns graph topology and diagram semantics.
    # ══════════════════════════════════════════════════════════════════════════

    # ── Adaptive strategy selector ────────────────────────────────────────────
    def _select_strategy(self, G: nx.DiGraph, has_inheritance: bool) -> str:
        """
        Inspect topology and choose the best layout intent.
        The returned string is informational (used for logging);
        Graphviz 'dot' always handles the actual pixel placement.

          any inheritance     → 'hierarchical'
          cycle detected      → 'spring'   (rare — log warning)
          linear (deg ≤ 2)    → 'spectral'
          default             → 'hierarchical'
        """
        if G.number_of_nodes() == 0 or has_inheritance:
            return "hierarchical"
        if not nx.is_directed_acyclic_graph(G):
            return "spring"
        max_deg = max((d for _, d in G.degree()), default=0)
        return "spectral" if max_deg <= 2 else "hierarchical"

    # ── Two-pass strict inheritance layering ─────────────────────────────────
    def _compute_layers(
        self, G_full: nx.DiGraph, G_inh_down: nx.DiGraph
    ) -> Dict[str, int]:
        """
        Pass 1 — inheritance ranks only (G_inh_down: parent→child direction).
                  Assigns hard lower-bound layers from the inheritance tree.
        Pass 2 — association/composition edges extend ranks further down
                  (never override inheritance ranks from pass 1).
        Pass 3 — ENFORCEMENT: walk every inheritance edge (child→parent in
                  LLM JSON, i.e. parent→child in G_inh_down) and guarantee
                  parent_layer < child_layer. If an association edge from a
                  different path pushed the parent to a deeper layer than the
                  child, cascade the child (and all its successors) downward.
                  This handles cases like:
                    Customer→Account (composition, pulls Account to layer 2)
                    SavingsAccount→Account (inheritance, puts Savings on layer 1)
                  After pass 3: Account stays at 2, Savings pushed to 3.
        """
        # Pass 1 — inheritance hard ranks
        inh_layer: Dict[str, int] = {n: 0 for n in G_full.nodes()}
        try:
            topo = list(nx.topological_sort(G_inh_down))
        except nx.NetworkXUnfeasible:
            topo = list(G_full.nodes())
        for node in topo:
            for child in G_inh_down.successors(node):
                if inh_layer[child] <= inh_layer[node]:
                    inh_layer[child] = inh_layer[node] + 1

        # Pass 2 — pull non-inheritance successors down
        full: Dict[str, int] = dict(inh_layer)
        G_assoc = nx.DiGraph()
        G_assoc.add_nodes_from(G_full.nodes())
        for u, v, d in G_full.edges(data=True):
            if d.get("rel_type") != "inheritance":
                G_assoc.add_edge(u, v)
        try:
            topo2 = list(nx.topological_sort(G_assoc))
        except nx.NetworkXUnfeasible:
            topo2 = list(G_assoc.nodes())
        for node in topo2:
            for succ in G_assoc.successors(node):
                cand = full[node] + 1
                if cand > full[succ]:
                    full[succ] = cand

        # Pass 3 — ENFORCEMENT: parent must always be strictly above child.
        # G_inh_down edges go parent→child. For each such edge:
        # if full[parent] >= full[child], push child downward, then cascade
        # only through NON-INHERITANCE edges (i.e. go further DOWN the tree,
        # never back up via child→parent inheritance arcs in G_full).
        from collections import deque
        queue: deque = deque(list(G_inh_down.edges()))
        seen: set = set()
        while queue:
            parent, child = queue.popleft()
            key = (parent, child)
            if key in seen:
                continue
            seen.add(key)
            if full[child] <= full[parent]:
                full[child] = full[parent] + 1
                # Cascade downward only via non-inheritance edges.
                # Inheritance edges in G_full go child→parent (upward),
                # so following them here would incorrectly push the parent up.
                for grandchild in G_full.successors(child):
                    edge_data = G_full.get_edge_data(child, grandchild) or {}
                    if edge_data.get("rel_type") != "inheritance":
                        queue.append((child, grandchild))
                        seen.discard((child, grandchild))

        return full

    # ── Barycenter crossing minimisation ─────────────────────────────────────
    def _order_by_barycenter(
        self,
        row_nodes: List[str],
        G_full: nx.DiGraph,
        placed_cx: Dict[str, float],
    ) -> List[str]:
        """
        Sort nodes in a row by the average X of their already-placed neighbours
        (Sugiyama barycenter heuristic — reduces edge crossings).
        """
        scores: Dict[str, float] = {}
        for node in row_nodes:
            xs = (
                [placed_cx[p] for p in G_full.predecessors(node) if p in placed_cx]
                + [placed_cx[s] for s in G_full.successors(node)   if s in placed_cx]
            )
            scores[node] = sum(xs) / len(xs) if xs else float("inf")
        return sorted(row_nodes, key=lambda n: (scores[n], n))

    # ── Association-class detection ───────────────────────────────────────────
    def _detect_association_classes(
        self, classes: List[Dict], relationships: List[Dict]
    ) -> Set[str]:
        """
        Detects pure join/association classes (e.g. Enrollment between
        Student and Course).

        Criteria (all must hold):
          • Not involved in any inheritance relationship
          • Is the FROM source of exactly 2 non-inheritance relationships
          • Both targets are distinct
          • Has 0 incoming non-inheritance edges (never a target)
        """
        names: Set[str] = {c["name"] for c in classes}
        inh_nodes: Set[str] = set()
        for r in relationships:
            if r.get("relationshipType") == "inheritance":
                inh_nodes.update([r.get("from", ""), r.get("to", "")])

        outgoing: Dict[str, List[str]] = {n: [] for n in names}
        incoming: Dict[str, int]       = {n: 0  for n in names}
        for r in relationships:
            if r.get("relationshipType") == "inheritance":
                continue
            src, tgt = r.get("from", ""), r.get("to", "")
            if src in names:
                outgoing[src].append(tgt)
            if tgt in names:
                incoming[tgt] += 1

        return {
            n for n in names
            if n not in inh_nodes
            and len(outgoing[n]) == 2
            and len(set(outgoing[n])) == 2
            and incoming[n] == 0
        }

    # ── Build NetworkX graphs ─────────────────────────────────────────────────
    def _build_graphs(
        self, classes: List[Dict], relationships: List[Dict]
    ) -> Tuple[nx.DiGraph, nx.DiGraph, bool, Dict[str, int]]:
        """
        Returns (G_full, G_inh_down, has_inheritance, layer_map).

        G_full       — all edges as given by LLM
        G_inh_down   — inheritance edges only, reversed to parent→child
        has_inheritance — bool
        layer_map    — {name: layer_int}  (layer 0 = top)
        """
        names: Set[str] = {c["name"] for c in classes}
        G_full   = nx.DiGraph()
        G_inh_dn = nx.DiGraph()
        G_full.add_nodes_from(names)
        G_inh_dn.add_nodes_from(names)

        has_inh = False
        for rel in relationships:
            src = rel.get("from", "")
            tgt = rel.get("to",   "")
            rt  = rel.get("relationshipType", "association")
            if src not in names or tgt not in names:
                continue
            G_full.add_edge(src, tgt, rel_type=rt)
            if rt == "inheritance":
                has_inh = True
                # LLM: child→parent  →  reverse to parent→child for top-down
                G_inh_dn.add_edge(tgt, src)

        layer = self._compute_layers(G_full, G_inh_dn)
        return G_full, G_inh_dn, has_inh, layer

    # ── Compute ordered rows (NetworkX) ──────────────────────────────────────
    def _compute_ordered_rows(
        self,
        layer: Dict[str, int],
        G_full: nx.DiGraph,
    ) -> Dict[int, List[str]]:
        """
        Group nodes into rows by layer, then sort each row with the
        barycenter heuristic to minimise edge crossings.
        Returns {layer_int: [ordered_node_names]}.
        """
        C = _C
        rows: Dict[int, List[str]] = defaultdict(list)
        for name, lyr in layer.items():
            rows[lyr].append(name)

        max_row_n    = max(len(v) for v in rows.values()) if rows else 1
        canvas_width = max_row_n * C.CLASS_W_PX + (max_row_n - 1) * 120

        placed_cx: Dict[str, float] = {}
        ordered: Dict[int, List[str]] = {}

        for lyr in sorted(rows.keys()):
            raw = list(rows[lyr])
            if lyr == 0:
                row = sorted(raw)
            else:
                row = self._order_by_barycenter(raw, G_full, placed_cx)
            ordered[lyr] = row

            n        = len(row)
            row_w    = n * C.CLASS_W_PX + (n - 1) * 120
            start_x  = (canvas_width - row_w) // 2
            for i, name in enumerate(row):
                placed_cx[name] = start_x + i * (C.CLASS_W_PX + 120) + C.CLASS_W_PX / 2

        return ordered

    # ══════════════════════════════════════════════════════════════════════════
    # ███  GRAPHVIZ LAYOUT LAYER  ███
    # Takes the NetworkX-ordered rows and asks Graphviz dot to compute
    # exact, size-aware pixel coordinates. Zero overlaps guaranteed.
    # ══════════════════════════════════════════════════════════════════════════
    def _graphviz_layout(
        self,
        classes: List[Dict],
        relationships: List[Dict],
        ordered_rows: Dict[int, List[str]],
    ) -> Dict[str, Tuple[int, int, int, int]]:
        """
        Build a DOT source string that encodes:
          • exact node sizes (width, height in inches, fixedsize=true)
          • rank constraints from NetworkX layering  (same rank → same row,
            which forces the order NetworkX chose)
          • inheritance edges reversed so parent is on top rank

        Run `dot -Tplain`, parse the plain-text output, convert inch
        coordinates to Draw.io pixels (96 dpi, Y axis flipped).

        Returns {class_name: (x_px, y_px, w_px, h_px)}  top-left corner.
        """
        C = _C
        names: Set[str] = {c["name"] for c in classes}

        # Pre-compute exact pixel sizes for every class
        sizes: Dict[str, Tuple[int, int]] = {}
        for cls in classes:
            attrs   = cls.get("attributes", []) or [""]
            methods = cls.get("methods",    []) or [""]
            sizes[cls["name"]] = (C.CLASS_W_PX, C.box_h(len(attrs), len(methods)))

        def safe(name: str) -> str:
            """DOT-safe identifier (no spaces, dashes, etc.)."""
            return re.sub(r"[^A-Za-z0-9_]", "_", name)

        # ── Build DOT source ─────────────────────────────────────────────────
        lines: List[str] = [
            "digraph G {",
            f"    graph [rankdir=TB, splines=ortho,"
            f" nodesep={C.NODESEP}, ranksep={C.RANKSEP}];",
            "    node  [shape=box, fixedsize=true];",
        ]

        # Node declarations with exact sizes
        for name in names:
            w_px, h_px = sizes[name]
            lines.append(
                f'    {safe(name)} [label="{name}",'
                f" width={C.to_in(w_px)}, height={C.to_in(h_px)}];"
            )

        # ── Rank groups: enforce NetworkX layer ordering ─────────────────────
        # Using { rank=same; ... } subgraphs tells Graphviz which nodes must
        # share a horizontal band — exactly the rows NetworkX computed.
        for lyr in sorted(ordered_rows.keys()):
            row = ordered_rows[lyr]
            if len(row) > 1:
                lines.append(
                    "    { rank=same; "
                    + " ".join(safe(n) + ";" for n in row)
                    + " }"
                )

        # ── Edges ────────────────────────────────────────────────────────────
        # Inheritance: LLM gives child→parent. Reverse for DOT so parent
        # sits on the higher (earlier) rank.
        # All other edges: use as-is to guide Graphviz routing.
        for rel in relationships:
            src = rel.get("from", "")
            tgt = rel.get("to",   "")
            rt  = rel.get("relationshipType", "association")
            if src not in names or tgt not in names:
                continue
            if rt == "inheritance":
                lines.append(f"    {safe(tgt)} -> {safe(src)};")
            else:
                lines.append(f"    {safe(src)} -> {safe(tgt)};")

        lines.append("}")
        dot_src = "\n".join(lines)

        # ── Run Graphviz ─────────────────────────────────────────────────────
        try:
            result = subprocess.run(
                ["dot", "-Tplain"],
                input=dot_src.encode("utf-8"),
                capture_output=True,
                timeout=20,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "Graphviz `dot` binary not found.\n"
                "Install: sudo apt-get install graphviz   or   brew install graphviz"
            )
        if result.returncode != 0:
            raise RuntimeError(f"Graphviz error:\n{result.stderr.decode()}")

        plain = result.stdout.decode("utf-8")

        # ── Parse -Tplain output ─────────────────────────────────────────────
        # Format: "node <safe_name> <cx_in> <cy_in> <w_in> <h_in> ..."
        # All values in inches. Y=0 at bottom (Graphviz convention).
        graph_h_in: Optional[float] = None
        raw_pos: Dict[str, Tuple[float, float, float, float]] = {}
        safe_to_name: Dict[str, str] = {safe(n): n for n in names}

        for line in plain.splitlines():
            parts = line.split()
            if not parts:
                continue
            if parts[0] == "graph":
                graph_h_in = float(parts[2])
            elif parts[0] == "node" and len(parts) >= 6:
                s_name = parts[1]
                cx, cy, w, h = (float(parts[i]) for i in range(2, 6))
                raw_pos[s_name] = (cx, cy, w, h)

        if graph_h_in is None:
            raise RuntimeError("Could not parse Graphviz canvas height from -Tplain output")

        # ── Convert inches → Draw.io pixels (top-left corner, Y flipped) ────
        M   = C.MARGIN_PX
        DPI = C.DPI
        positions: Dict[str, Tuple[int, int, int, int]] = {}

        for s_name, (cx, cy, _w_gv, _h_gv) in raw_pos.items():
            name = safe_to_name.get(s_name)
            if name is None:
                continue
            w_px, h_px = sizes[name]
            # Graphviz centre → top-left; flip Y
            tl_x = int(M + (cx - _w_gv / 2) * DPI)
            tl_y = int(M + (graph_h_in - cy - _h_gv / 2) * DPI)
            positions[name] = (tl_x, tl_y, w_px, h_px)

        return positions

    # ══════════════════════════════════════════════════════════════════════════
    # ███  EDGE ROUTING  ███
    # ══════════════════════════════════════════════════════════════════════════
    def _routing(
        self,
        src: str,
        tgt: str,
        positions: Dict[str, Tuple[int, int, int, int]],
        rel_type: str,
        edge_idx: int,
        total_edges: int,
    ) -> Tuple[str, str]:
        """
        Returns (exit_style, entry_style) for a Draw.io edge mxCell.

        Inheritance — child exits TOP-centre → parent enters BOTTOM-centre
                      (strict vertical, guaranteed by layer ordering).
        Associations — port chosen by relative bounding-box position.
        Multiple parallel edges — distributed ports (0.35 / 0.65 etc.)
                      so they never stack on the same pixel.
        """
        sx, sy, sw, sh = positions[src]
        tx, ty, tw, th = positions[tgt]
        scx, scy = sx + sw // 2, sy + sh // 2
        tcx, tcy = tx + tw // 2, ty + th // 2

        # Distributed port table
        ptable = {1: [0.5], 2: [0.35, 0.65], 3: [0.25, 0.5, 0.75]}
        ports  = ptable.get(total_edges) or [
            (i + 1) / (total_edges + 1) for i in range(total_edges)
        ]
        p = ports[min(edge_idx, len(ports) - 1)]

        # ── Inheritance: always strictly vertical ────────────────────────────
        if rel_type == "inheritance":
            if total_edges == 1:
                return (
                    "exitX=0.5;exitY=0;exitDx=0;exitDy=0;",
                    "entryX=0.5;entryY=1;entryDx=0;entryDy=0;",
                )
            return (
                f"exitX={p:.3f};exitY=0;exitDx=0;exitDy=0;",
                f"entryX={p:.3f};entryY=1;entryDx=0;entryDy=0;",
            )

        # ── Spatial routing for associations ────────────────────────────────
        same_row = abs(scy - tcy) < 55
        left     = scx < tcx
        above    = scy < tcy
        v_dist   = abs(scy - tcy)
        h_dist   = abs(scx - tcx) + 1
        vert     = v_dist > h_dist * 1.2

        if same_row:
            if left:
                return (f"exitX=1;exitY={p:.3f};exitDx=0;exitDy=0;",
                        f"entryX=0;entryY={p:.3f};entryDx=0;entryDy=0;")
            return (f"exitX=0;exitY={p:.3f};exitDx=0;exitDy=0;",
                    f"entryX=1;entryY={p:.3f};entryDx=0;entryDy=0;")

        if vert:
            if above:
                return (f"exitX={p:.3f};exitY=1;exitDx=0;exitDy=0;",
                        f"entryX={p:.3f};entryY=0;entryDx=0;entryDy=0;")
            return (f"exitX={p:.3f};exitY=0;exitDx=0;exitDy=0;",
                    f"entryX={p:.3f};entryY=1;entryDx=0;entryDy=0;")

        # Diagonal
        if above and left:
            return (f"exitX={p:.3f};exitY=1;exitDx=0;exitDy=0;",
                    f"entryX=0;entryY={p:.3f};entryDx=0;entryDy=0;")
        if above:
            return (f"exitX={p:.3f};exitY=1;exitDx=0;exitDy=0;",
                    f"entryX=1;entryY={p:.3f};entryDx=0;entryDy=0;")
        if left:
            return (f"exitX=1;exitY={p:.3f};exitDx=0;exitDy=0;",
                    f"entryX={p:.3f};entryY=1;entryDx=0;entryDy=0;")
        return (f"exitX=0;exitY={p:.3f};exitDx=0;exitDy=0;",
                f"entryX={p:.3f};entryY=1;entryDx=0;entryDy=0;")

    # ── Label collision avoidance ─────────────────────────────────────────────
    def _label_offset(
        self,
        src: str,
        tgt: str,
        positions: Dict[str, Tuple[int, int, int, int]],
    ) -> Tuple[int, int]:
        """
        If the edge midpoint would land inside any class box, shift the label
        perpendicularly away by SHIFT pixels.
        """
        SHIFT = 20
        sx, sy, sw, sh = positions[src]
        tx, ty, tw, th = positions[tgt]
        scx, scy = sx + sw // 2, sy + sh // 2
        tcx, tcy = tx + tw // 2, ty + th // 2
        mx, my   = (scx + tcx) // 2, (scy + tcy) // 2

        collision = any(
            bx <= mx <= bx + bw and by <= my <= by + bh
            for bx, by, bw, bh in positions.values()
        )
        if not collision:
            return (0, 0)

        dx, dy = tcx - scx, tcy - scy
        L = max((dx * dx + dy * dy) ** 0.5, 1.0)
        return (int(-dy / L * SHIFT), int(dx / L * SHIFT))

    # ══════════════════════════════════════════════════════════════════════════
    # ███  XML GENERATOR  ███
    # ══════════════════════════════════════════════════════════════════════════
    def generate_xml(self, data: List[Dict]) -> List[str]:
        """
        Orchestrates the full pipeline and returns a list of mxCell strings.

        Step 1 — NetworkX builds graphs, computes layers, orders rows.
        Step 2 — Graphviz computes exact pixel positions from those rows.
        Step 3 — This method renders nodes and edges into Draw.io XML.
        """
        xml: List[str] = []
        node_map: Dict[str, str] = {}  # sanitized name → mxCell id
        cur = 100

        classes       = [d for d in data if d.get("type") == "Class"]
        relationships = [d for d in data if d.get("type") == "Relationship"]
        C = _C

        # ── Step 1: NetworkX analysis ────────────────────────────────────────
        G_full, _, has_inh, layer = self._build_graphs(classes, relationships)
        strategy = self._select_strategy(G_full, has_inh)
        print(f"  📊 NetworkX strategy : {strategy}")

        ordered_rows   = self._compute_ordered_rows(layer, G_full)
        assoc_cls      = self._detect_association_classes(classes, relationships)
        if assoc_cls:
            print(f"  🔗 Association classes: {assoc_cls}")

        # ── Step 2: Graphviz layout ──────────────────────────────────────────
        positions = self._graphviz_layout(classes, relationships, ordered_rows)
        print(f"  📐 Graphviz placed    : {len(positions)} nodes")

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # NODE XML
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        for cls in classes:
            name = cls.get("name", "")
            if name not in positions:
                continue

            x, y, w, h  = positions[name]
            sname        = self._sanitize(name)
            attrs        = cls.get("attributes", []) or [" "]
            methods      = cls.get("methods",    []) or [" "]
            is_abstract  = cls.get("isAbstract", False)

            # Solid border for all classes.
            # Dashed ONLY for explicitly abstract classes (not assoc classes —
            # the dashed visual for association is on the *connector*, not the box).
            box_dashed = "dashed=1;dashPattern=8 4;" if is_abstract else ""
            cid = str(cur);  node_map[sname] = cid;  cur += 1

            xml.append(
                f'<mxCell id="{cid}" value="" '
                f'style="swimlane;fontStyle=1;align=center;verticalAlign=top;'
                f'childLayout=stackLayout;horizontal=1;startSize=0;'
                f'horizontalStack=0;resizeParent=1;resizeParentMax=0;'
                f'resizeLast=0;collapsible=0;marginBottom=0;'
                f'whiteSpace=wrap;html=1;{box_dashed}" '
                f'vertex="1" parent="1">'
                f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
                f'</mxCell>'
            )

            cur_y = 0

            # Green stereotype circle + "C"
            for val, st in [
                ("",  "ellipse;whiteSpace=wrap;html=1;aspect=fixed;"
                       "fillColor=#d5e8d4;strokeColor=#82b366;fontSize=10;"),
                ("C", "text;html=1;strokeColor=none;fillColor=none;"
                       "align=center;verticalAlign=middle;whiteSpace=wrap;"
                       "fontSize=11;fontStyle=1;fontColor=#000000;"),
            ]:
                sid = str(cur);  cur += 1
                xml.append(
                    f'<mxCell id="{sid}" value="{val}" style="{st}" '
                    f'vertex="1" parent="{cid}">'
                    f'<mxGeometry x="5" y="5" width="20" height="20" as="geometry"/>'
                    f'</mxCell>'
                )

            # Class name header
            nst = "fontStyle=3" if is_abstract else "fontStyle=1"
            nid = str(cur);  cur += 1
            xml.append(
                f'<mxCell id="{nid}" value="{sname}" '
                f'style="text;strokeColor=none;fillColor=none;align=center;'
                f'verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;'
                f'rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
                f'{nst};fontSize=14;whiteSpace=wrap;html=1;" '
                f'vertex="1" parent="{cid}">'
                f'<mxGeometry y="{cur_y}" width="{w}" height="{C.HEADER_H_PX}" as="geometry"/>'
                f'</mxCell>'
            )
            cur_y += C.HEADER_H_PX

            def _sep(y_pos: int) -> None:
                nonlocal cur
                sid = str(cur);  cur += 1
                xml.append(
                    f'<mxCell id="{sid}" value="" '
                    f'style="line;strokeWidth=1;fillColor=none;align=left;'
                    f'verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;'
                    f'rotatable=0;labelPosition=right;points=[];'
                    f'portConstraint=eastwest;strokeColor=inherit;" '
                    f'vertex="1" parent="{cid}">'
                    f'<mxGeometry y="{y_pos}" width="{w}" height="{C.SEP_H_PX}" as="geometry"/>'
                    f'</mxCell>'
                )

            _sep(cur_y);  cur_y += C.SEP_H_PX

            # Attributes
            for raw in attrs:
                t = str(raw).strip()
                indicator, content = ("▪ ", t[1:].strip()) if (t and t[0] in "-+#") else ("", t)
                rid = str(cur);  cur += 1
                xml.append(
                    f'<mxCell id="{rid}" '
                    f'value="{self._sanitize(indicator + content)}" '
                    f'style="text;strokeColor=none;fillColor=none;align=left;'
                    f'verticalAlign=middle;spacingLeft=8;spacingRight=4;overflow=hidden;'
                    f'rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
                    f'fontSize=11;whiteSpace=wrap;html=1;" '
                    f'vertex="1" parent="{cid}">'
                    f'<mxGeometry y="{cur_y}" width="{w}" height="{C.ATTR_H_PX}" as="geometry"/>'
                    f'</mxCell>'
                )
                cur_y += C.ATTR_H_PX

            _sep(cur_y);  cur_y += C.SEP_H_PX

            # Methods
            for raw in methods:
                t = str(raw).strip()
                indicator, content = ("▪ ", t[1:].strip()) if (t and t[0] in "-+#") else ("", t)
                mid_id = str(cur);  cur += 1
                xml.append(
                    f'<mxCell id="{mid_id}" '
                    f'value="{self._sanitize(indicator + content)}" '
                    f'style="text;strokeColor=none;fillColor=none;align=left;'
                    f'verticalAlign=middle;spacingLeft=8;spacingRight=4;overflow=hidden;'
                    f'rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
                    f'fontSize=11;whiteSpace=wrap;html=1;" '
                    f'vertex="1" parent="{cid}">'
                    f'<mxGeometry y="{cur_y}" width="{w}" height="{C.METHOD_H_PX}" as="geometry"/>'
                    f'</mxCell>'
                )
                cur_y += C.METHOD_H_PX

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # EDGE XML
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        pair_count: Dict[Tuple[str, str], int] = {}
        for r in relationships:
            ss = self._sanitize(r.get("from", ""))
            ts = self._sanitize(r.get("to",   ""))
            if ss in node_map and ts in node_map:
                pair_count[(ss, ts)] = pair_count.get((ss, ts), 0) + 1

        pair_idx: Dict[Tuple[str, str], int] = {}

        for rel in relationships:
            src_raw = rel.get("from", "")
            tgt_raw = rel.get("to",   "")
            src_s   = self._sanitize(src_raw)
            tgt_s   = self._sanitize(tgt_raw)
            rt      = rel.get("relationshipType", "association")
            lbl     = self._sanitize(rel.get("label", ""))
            f_mult  = self._sanitize(rel.get("fromMultiplicity", ""))
            t_mult  = self._sanitize(rel.get("toMultiplicity",   ""))

            if src_s not in node_map or tgt_s not in node_map:
                continue
            if src_raw not in positions or tgt_raw not in positions:
                continue

            eid  = str(cur);  cur += 1
            key  = (src_s, tgt_s)
            eidx = pair_idx.get(key, 0);  pair_idx[key] = eidx + 1
            etot = pair_count.get(key, 1)

            exit_s, entry_s = self._routing(
                src_raw, tgt_raw, positions, rt, eidx, etot
            )

            lparts   = [p for p in [f_mult, lbl, t_mult] if p]
            full_lbl = "  ".join(lparts)

            # Arrow head
            if rt == "inheritance":
                arrow = "endArrow=block;endFill=0;endSize=16;"
            elif rt == "composition":
                arrow = "endArrow=diamond;endFill=1;endSize=16;"
            elif rt == "aggregation":
                arrow = "endArrow=diamond;endFill=0;endSize=16;"
            else:
                arrow = "endArrow=open;endSize=14;"

            # Dashed connector for association-class edges
            dashed = (
                "dashed=1;dashPattern=8 4;"
                if (src_raw in assoc_cls or tgt_raw in assoc_cls)
                else ""
            )

            full_style = (
                f"{arrow}html=1;fontSize=11;"
                f"edgeStyle=orthogonalEdgeStyle;rounded=1;"
                f"{dashed}{exit_s}{entry_s}"
            )

            # Label offset (avoid overlapping node bounding boxes)
            lox, loy = self._label_offset(src_raw, tgt_raw, positions)
            offset_xml = (
                f'<mxPoint x="{lox}" y="{loy}" as="offset"/>' if (lox or loy) else ""
            )

            xml.append(
                f'<mxCell id="{eid}" value="{full_lbl}" '
                f'style="{full_style}" '
                f'edge="1" parent="1" '
                f'source="{node_map[src_s]}" target="{node_map[tgt_s]}">'
                f'<mxGeometry relative="1" as="geometry">{offset_xml}'
                f'</mxGeometry>'
                f'</mxCell>'
            )

        return xml

    # ──────────────────────────────────────────────────────────────────────────
    # Public entry point
    # ──────────────────────────────────────────────────────────────────────────
    def generate_diagram(self, prompt: str) -> str:
        print("\n📐 Generating UML Class Diagram  (NetworkX + Graphviz → Draw.io XML)…")
        try:
            response = self.model.generate_content(self.construct_prompt(prompt))
            data     = self.parse_json(response.text)
            xml      = [
                '<mxGraphModel><root>',
                '<mxCell id="0"/>',
                '<mxCell id="1" parent="0"/>',
            ]
            xml.extend(self.generate_xml(data))
            xml.append("</root></mxGraphModel>")
            result = "".join(xml)
            print(f"✅ Done — {len(result):,} chars")
            return result
        except Exception as e:
            print(f"❌ {e}")
            raise ValueError(str(e))


# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    gen = ClassDiagramGenerator()
    out = gen.generate_diagram(
        "Banking system: Customer can hold SavingsAccount and CurrentAccount. "
        "Transactions are recorded for each account. Admin manages customers."
    )
    print(f"\nGenerated {len(out):,} chars of Draw.io XML")