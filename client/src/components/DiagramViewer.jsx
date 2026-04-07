import { useEffect, useRef, useState } from "react";

const DiagramViewer = ({ xmlData }) => {
  const containerRef = useRef(null);
  const [error, setError]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const styleId = "diagram-viewer-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id    = styleId;
      style.innerHTML = `
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Fix 1: hide the floating black toolbar in fullscreen/lightbox ── */
        .mxTooltip,
        .geToolbarContainer,
        .mxgraph-toolbar-container,
        div[class*="mxgraph"] > div:last-child > div:last-child,
        .geSidebarContainer,
        .geHint {
          display: none !important;
        }

        /* ── Fix 2: hide the floating action toolbar that appears on hover ── */
        .mxgraph .mxTooltipTitle,
        body > div.geMenubarContainer,
        div.mxPopupMenu,
        div[style*="position: fixed"][style*="background: black"],
        div[style*="position: fixed"][style*="background:black"],
        div[style*="background: rgb(0, 0, 0)"][style*="border-radius"],
        div[style*="background: rgba(0, 0, 0"][style*="border-radius"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* ── Scrollbar styling ── */
        .diagram-card::-webkit-scrollbar       { width: 6px; height: 6px; }
        .diagram-card::-webkit-scrollbar-track { background: #1e293b; }
        .diagram-card::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        .diagram-card::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `;
      document.head.appendChild(style);
    }

    if (!xmlData) return;
    let attempts    = 0;
    const maxAttempts = 50;

    const tryRender = () => {
      attempts++;
      if (typeof window.GraphViewer !== "undefined") {
        setIsLoading(false); renderDiagram();
      } else if (attempts < maxAttempts) {
        setTimeout(tryRender, 100);
      } else {
        setIsLoading(false);
        setError("Draw.io viewer library failed to load.");
      }
    };

    const renderDiagram = () => {
      const container = containerRef.current;
      if (!container) return;
      try {
        container.innerHTML = "";
        setError(null);

        const viewerDiv        = document.createElement("div");
        viewerDiv.className    = "mxgraph";
        viewerDiv.style.width  = "100%";
        viewerDiv.style.height = "100%";

        const config = JSON.stringify({
          highlight: "#3b82f6",
          nav:       true,
          resize:    true,
          fit:       true,
          // ── toolbar removed so the floating black bar never appears ──
          toolbar:   null,
          edit:      null,
          xml:       xmlData,
        });

        viewerDiv.setAttribute("data-mxgraph", config);
        container.appendChild(viewerDiv);
        window.GraphViewer.createViewerForElement(viewerDiv);
      } catch (err) {
        console.error("DiagramViewer render error:", err);
        setError("Failed to render diagram: " + err.message);
      }
    };

    tryRender();
    return () => { if (containerRef.current) containerRef.current.innerHTML = ""; };
  }, [xmlData]);

  if (!xmlData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <span className="text-4xl opacity-30">📊</span>
          <p className="text-sm">No diagram data available</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-md">
          <span className="text-red-400 text-lg shrink-0">⚠</span>
          <p className="text-red-300 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">

      {/* ── Diagram Card ── */}
      <div className="
        w-full h-full
        rounded-2xl border border-white/10 overflow-hidden
        bg-gradient-to-b from-gray-800/80 to-gray-900/80
        shadow-[0_0_40px_rgba(37,99,235,0.08)]
        flex flex-col relative
      ">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-10" />

        {/* Card header — fixed height, never scrolls */}
        <div className="
          flex items-center justify-between px-4 py-2.5
          bg-gray-900/70 border-b border-gray-700/60
          shrink-0 mt-[2px] z-10
        ">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80"    />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80"  />
            <span className="text-xs font-semibold text-gray-300 ml-2 tracking-wide">
              Diagram Preview
            </span>
          </div>
          <span className="text-[11px] text-gray-500">
            Scroll or pinch to zoom · Click "Edit Diagram" to modify
          </span>
        </div>

        {/* ── Canvas wrapper — strictly below header, overflow hidden so nothing bleeds up ── */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10 gap-3">
              <div className="w-9 h-9 rounded-full border-[3px] border-blue-500/20 border-t-blue-400 animate-spin" />
              <p className="text-gray-400 text-sm">Rendering diagram…</p>
            </div>
          )}

          <div
            ref={containerRef}
            className="diagram-card w-full h-full overflow-auto bg-[#f8fafc]"
            style={{ opacity: isLoading ? 0 : 1, transition: "opacity 0.4s ease" }}
          />
        </div>
      </div>
    </div>
  );
};

export default DiagramViewer;