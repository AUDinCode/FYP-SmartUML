import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  ArrowLeft, Save, Loader, Edit, X,
  Code, Eye, Download, RefreshCw,
  FileImage, FileCode2, FileType2, ChevronDown, Check
} from "lucide-react";
import DiagramViewer from "../components/DiagramViewer";

// ── Typing animation ──
const FULL_PHRASE    = "Build · Preview · Refine";
const TYPING_SPEED   = 90;
const DELETING_SPEED = 45;
const PAUSE_AFTER    = 1500;

const useTypingLoop = () => {
  const [displayed, setDisplayed]   = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    let t;
    if (!isDeleting && displayed.length < FULL_PHRASE.length)
      t = setTimeout(() => setDisplayed(FULL_PHRASE.slice(0, displayed.length + 1)), TYPING_SPEED);
    else if (!isDeleting)
      t = setTimeout(() => setIsDeleting(true), PAUSE_AFTER);
    else if (isDeleting && displayed.length > 0)
      t = setTimeout(() => setDisplayed((p) => p.slice(0, -1)), DELETING_SPEED);
    else
      t = setTimeout(() => setIsDeleting(false), PAUSE_AFTER / 2);
    return () => clearTimeout(t);
  }, [displayed, isDeleting]);
  return displayed;
};

// ── Download formats config ──
const DOWNLOAD_FORMATS = [
  {
    id:    "png",
    label: "PNG Image",
    desc:  "Best for presentations & sharing",
    icon:  FileImage,
    color: "text-blue-400",
    bg:    "bg-blue-500/10",
    border:"border-blue-500/20",
    ext:   ".png",
    mime:  "image/png",
  },
  {
    id:    "svg",
    label: "SVG Vector",
    desc:  "Best for print & scaling",
    icon:  FileType2,
    color: "text-purple-400",
    bg:    "bg-purple-500/10",
    border:"border-purple-500/20",
    ext:   ".svg",
    mime:  "image/svg+xml",
  },
  {
    id:    "xml",
    label: "XML / Draw.io",
    desc:  "Best for re-editing in draw.io",
    icon:  FileCode2,
    color: "text-green-400",
    bg:    "bg-green-500/10",
    border:"border-green-500/20",
    ext:   ".drawio",
    mime:  "application/xml",
  },
];

// ── Wait for SVG to appear in container (polling, max 8s) ──
const waitForSvg = (container) => {
  return new Promise((resolve, reject) => {
    const start   = Date.now();
    const TIMEOUT = 8000;  // 8 seconds max
    const POLL    = 80;    // check every 80ms

    const check = () => {
      const svgEl = container.querySelector("svg");
      if (svgEl && svgEl.getBoundingClientRect().width > 0) {
        resolve(svgEl);
      } else if (Date.now() - start > TIMEOUT) {
        reject(new Error("Diagram render timed out. Try XML format instead."));
      } else {
        setTimeout(check, POLL);
      }
    };
    check();
  });
};

// ── Render XML in offscreen div and return the SVG element ──
const renderOffscreen = (xmlData) => {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1400px;height:1000px;background:#fff;";
  document.body.appendChild(container);

  const viewerDiv       = document.createElement("div");
  viewerDiv.className   = "mxgraph";
  viewerDiv.style.width = "100%";
  viewerDiv.style.height= "100%";
  viewerDiv.setAttribute("data-mxgraph", JSON.stringify({
    highlight: "#3b82f6", nav: false, resize: false,
    fit: true, toolbar: null, edit: null, xml: xmlData,
  }));
  container.appendChild(viewerDiv);
  window.GraphViewer.createViewerForElement(viewerDiv);
  return container;
};

// ── Convert draw.io XML → SVG blob ──
const xmlToSvg = async (xmlData) => {
  const container = renderOffscreen(xmlData);
  try {
    const svgEl = await waitForSvg(container);
    // Embed white background rect so exported SVG looks clean
    svgEl.style.background = "#ffffff";
    const svgData = new XMLSerializer().serializeToString(svgEl);
    return new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  } finally {
    document.body.removeChild(container);
  }
};

// ── Convert draw.io XML → PNG blob ──
// Strategy: get SVG → embed fonts/styles inline → draw on canvas via foreignObject-free path
const xmlToPng = async (xmlData) => {
  const container = renderOffscreen(xmlData);
  try {
    const svgEl = await waitForSvg(container);

    // Grab bounding box for canvas size
    const bbox = svgEl.getBoundingClientRect();
    const W    = Math.max(bbox.width,  svgEl.viewBox?.baseVal?.width  || 0, 1200);
    const H    = Math.max(bbox.height, svgEl.viewBox?.baseVal?.height || 0, 900);

    // Clone SVG and make it self-contained (inline all styles)
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute("xmlns",       "http://www.w3.org/2000/svg");
    cloned.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    cloned.setAttribute("width",  String(W));
    cloned.setAttribute("height", String(H));

    // Add white background rect as first child
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width",  "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill",   "#ffffff");
    cloned.insertBefore(bg, cloned.firstChild);

    // Serialize to string and build a data URI (avoids CORS taint)
    const svgStr    = new XMLSerializer().serializeToString(cloned);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgStr)));
    const dataURI   = "data:image/svg+xml;base64," + svgBase64;

    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const SCALE  = 2; // retina quality
        const canvas = document.createElement("canvas");
        canvas.width  = W * SCALE;
        canvas.height = H * SCALE;
        const ctx = canvas.getContext("2d");
        ctx.scale(SCALE, SCALE);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
          "image/png", 1.0
        );
      };
      img.onerror = () => reject(new Error("Failed to load SVG data URI into Image."));
      img.src = dataURI;
    });
  } finally {
    document.body.removeChild(container);
  }
};

// ── Trigger browser download ──
const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download= filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ══════════════════════════════════════════════════════════════
const DiagramEditor = () => {
  const { id }   = useParams();
  const navigate  = useNavigate();
  const iframeRef = useRef(null);
  const dropdownRef = useRef(null);

  const [xmlData,           setXmlData]           = useState("");
  const [originalXmlData,   setOriginalXmlData]   = useState("");
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [isEditing,         setIsEditing]         = useState(false);
  const [editorLoading,     setEditorLoading]     = useState(false);
  const [showXmlPreview,    setShowXmlPreview]    = useState(false);
  const [error,             setError]             = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Download states
  const [showDownloadMenu,  setShowDownloadMenu]  = useState(false);
  const [downloading,       setDownloading]       = useState(false);
  const [downloadDone,      setDownloadDone]      = useState(null); // format id that just finished

  const typedText = useTypingLoop();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDownloadMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load diagram
  useEffect(() => {
    const fetch_ = async () => {
      if (!id) { setError("No diagram ID provided"); setLoading(false); return; }
      try {
        setLoading(true); setError(null);
        const snap = await getDoc(doc(db, "chats", id));
        if (snap.exists()) {
          const d = snap.data().diagramCode || "";
          setXmlData(d); setOriginalXmlData(d);
        } else { setError("Diagram not found"); }
      } catch (e) {
        console.error(e);
        setError("Failed to load diagram.");
      } finally { setLoading(false); }
    };
    fetch_();
  }, [id]);

  // Draw.io editor messages
  const DRAWIO_URL =
    "https://embed.diagrams.net/" +
    "?embed=1&ui=dark&spin=1&proto=json&noSaveBtn=1&noExitBtn=1&saveAndExit=0&chrome=1";

  useEffect(() => {
    if (!isEditing || !xmlData) return;
    const handleMessage = (event) => {
      if (!event.origin.includes("diagrams.net") && !event.origin.includes("draw.io")) return;
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.event === "init") {
        iframeRef.current?.contentWindow.postMessage(
          JSON.stringify({ action: "configure", config: { css: `
            .geMenubarContainer, .mxMenubar, .geMenubar { display: none !important; height: 0 !important; }
            .geTabContainer, .geFooterContainer, .geStatusbar, .gePageControl { display: none !important; height: 0 !important; }
            .geDiagramContainer { top: 0 !important; bottom: 0 !important; }
          `}}), "*"
        );
        setEditorLoading(false);
        iframeRef.current?.contentWindow.postMessage(
          JSON.stringify({ action: "load", autosave: 0, xml: xmlData }), "*"
        );
      }
      if (data.event === "save" || data.event === "autosave") {
        if (data.xml && data.xml !== xmlData) { setXmlData(data.xml); setHasUnsavedChanges(true); }
      }
      if (data.event === "export") {
        if (data.data) { setXmlData(data.data); setHasUnsavedChanges(true); }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEditing, xmlData]);

  // ── Save to Firebase ──
  const handleSave = async () => {
    if (!id || !xmlData) return;
    try {
      setSaving(true); setError(null);
      if (isEditing && iframeRef.current) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ action: "export", format: "xml" }), "*"
        );
        await new Promise(r => setTimeout(r, 500));
      }
      await updateDoc(doc(db, "chats", id), {
        diagramCode: xmlData,
        updatedAt:   new Date().toISOString(),
      });
      setOriginalXmlData(xmlData);
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error(e);
      setError("Failed to save diagram.");
    } finally { setSaving(false); }
  };

  // ── Download in chosen format ──
  const handleDownload = async (formatId) => {
    setShowDownloadMenu(false);
    setDownloading(true);
    setError(null);

    const filename = `diagram-${id}`;
    try {
      if (formatId === "xml") {
        const blob = new Blob([xmlData], { type: "application/xml" });
        triggerDownload(blob, `${filename}.drawio`);

      } else if (formatId === "svg") {
        const blob = await xmlToSvg(xmlData);
        triggerDownload(blob, `${filename}.svg`);

      } else if (formatId === "png") {
        const blob = await xmlToPng(xmlData);
        triggerDownload(blob, `${filename}.png`);
      }

      // Show success tick briefly
      setDownloadDone(formatId);
      setTimeout(() => setDownloadDone(null), 2500);

    } catch (err) {
      console.error("Download error:", err);
      setError(`Download failed: ${err.message}. Try XML format instead.`);
    } finally {
      setDownloading(false);
    }
  };

  const toggleEditing = () => {
    if (isEditing && hasUnsavedChanges && window.confirm("You have unsaved changes. Save before closing?"))
      handleSave();
    if (!isEditing) setEditorLoading(true);
    setIsEditing(!isEditing);
  };

  const handleReload = async () => {
    if (hasUnsavedChanges && !window.confirm("Reloading will discard unsaved changes. Continue?")) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "chats", id));
      if (snap.exists()) {
        const d = snap.data().diagramCode || "";
        setXmlData(d); setOriginalXmlData(d); setHasUnsavedChanges(false);
      }
    } catch { setError("Failed to reload diagram"); }
    finally { setLoading(false); }
  };

  // ── Loading screen ──
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-white" style={{ background: "var(--ds-bg,#0d0f14)" }}>
      <div className="text-center">
        <Loader className="animate-spin mx-auto mb-4 text-blue-400" size={36} />
        <p className="text-slate-500 text-sm">Loading diagram…</p>
      </div>
    </div>
  );

  if (error && !xmlData) return (
    <div className="flex items-center justify-center h-screen text-white" style={{ background: "var(--ds-bg,#0d0f14)" }}>
      <div className="text-center max-w-md">
        <X className="mx-auto mb-4 text-red-400" size={36} />
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p className="text-slate-500 text-sm mb-5">{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition-all"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen text-white" style={{ background: "var(--ds-bg,#0d0f14)" }}>

      {/* ══ Top navbar ══ */}
      <header
        className="flex items-center justify-between px-5 border-b shrink-0"
        style={{
          height: "56px",
          background: "var(--ds-surface,#13161e)",
          borderColor: "var(--ds-border,rgba(255,255,255,0.07))"
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.14] transition-all cursor-pointer"
            style={{ background: "#1a1d28" }}
          >
            <ArrowLeft size={15} /> Back
          </button>
          {hasUnsavedChanges && (
            <span className="flex items-center gap-1.5 text-yellow-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>

        {/* Center typing animation */}
        <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="w-0.5 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#3b82f6,#6366f1)" }} />
          <div className="flex items-center min-w-[180px]">
            <span
              className="text-xs font-bold tracking-wider bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#60a5fa,#818cf8,#a78bfa)" }}
            >
              {typedText}
            </span>
            <span
              className="inline-block w-[2px] h-[1em] ml-[2px] rounded-full"
              style={{ background: "linear-gradient(180deg,#3b82f6,#6366f1)", animation: "blink 1s step-end infinite" }}
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">

          {/* Reload + XML toggle */}
          {[
            { icon: RefreshCw, title: "Reload",     action: handleReload },
            { icon: showXmlPreview ? Eye : Code, title: showXmlPreview ? "Show Preview" : "Show XML", action: () => setShowXmlPreview(!showXmlPreview) },
          ].map(({ icon: Icon, title, action }) => (
            <button
              key={title}
              onClick={action}
              title={title}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.14] transition-all cursor-pointer"
              style={{ background: "#1a1d28" }}
            >
              <Icon size={15} />
            </button>
          ))}

          <div className="w-px h-5 bg-white/[0.08] mx-1" />

          {/* ── Download dropdown ── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDownloadMenu((p) => !p)}
              disabled={downloading}
              className={`glow-btn flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all
                ${downloading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {downloading ? (
                <><Loader size={14} className="animate-spin" /> Downloading…</>
              ) : downloadDone ? (
                <><Check size={14} className="text-green-300" /> Downloaded!</>
              ) : (
                <><Download size={14} /> Download <ChevronDown size={12} className={`transition-transform ${showDownloadMenu ? "rotate-180" : ""}`} /></>
              )}
            </button>

            {/* Dropdown menu */}
            {showDownloadMenu && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl z-50"
                style={{ background: "#1a1d28" }}
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-xs font-bold text-white tracking-wide">Choose Format</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Select how you want to download</p>
                </div>

                {/* Format options */}
                {DOWNLOAD_FORMATS.map((fmt) => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => handleDownload(fmt.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-all cursor-pointer text-left group"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${fmt.bg} ${fmt.border} group-hover:scale-105 transition-transform`}>
                        <Icon size={16} className={fmt.color} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-white text-sm font-semibold">{fmt.label}</span>
                        <span className="text-slate-600 text-[10px]">{fmt.desc}</span>
                      </div>
                      <span className={`ml-auto text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${fmt.bg} ${fmt.color}`}>
                        {fmt.ext}
                      </span>
                    </button>
                  );
                })}

                {/* Footer note */}
                <div className="px-4 py-2.5 border-t border-white/[0.06]">
                  <p className="text-[10px] text-slate-700">
                    💡 XML keeps full edit capabilities in draw.io
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Save to Firebase */}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            title="Save changes to cloud history"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all
              ${saving || !hasUnsavedChanges
                ? "border border-white/[0.08] text-slate-600 cursor-not-allowed"
                : "glow-btn text-white cursor-pointer"
              }`}
            style={saving || !hasUnsavedChanges ? { background: "#1a1d28" } : {}}
          >
            {saving
              ? <><Loader className="animate-spin" size={14} /> Saving…</>
              : <><Save size={14} /> Save</>
            }
          </button>

          {/* Edit toggle */}
          <button
            onClick={toggleEditing}
            className="glow-btn flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
          >
            {isEditing ? <><X size={14} /> Close Editor</> : <><Edit size={14} /> Edit Diagram</>}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-5 py-2.5 text-xs flex items-center gap-2 text-red-300 border-b"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}>
          <X size={13} className="text-red-400 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ══ Main content ══ */}
      <div className="flex-1 overflow-hidden p-4 sm:p-5">

        {/* XML Source view */}
        {!isEditing && showXmlPreview && (
          <div className="w-full h-full flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 rounded-full" style={{ background: "linear-gradient(180deg,#3b82f6,#6366f1)" }} />
              <h1 className="text-base font-bold text-white">XML Source</h1>
            </div>
            <div className="ds-card ds-card-active flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]" style={{ background: "#0d0f14" }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-[10px] text-slate-600 font-mono">diagram.xml</span>
                <div className="w-12" />
              </div>
              <div className="flex-1 overflow-auto no-scrollbar">
                <pre className="p-4 font-mono text-xs text-green-300/90 whitespace-pre-wrap break-words leading-6">
                  {xmlData || "No XML data available"}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Diagram viewer */}
        {!isEditing && !showXmlPreview && (
          <div className="w-full h-full">
            <DiagramViewer xmlData={xmlData} />
          </div>
        )}

        {/* Draw.io editor */}
        {isEditing && (
          <div className="w-full h-full flex flex-col ds-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0"
              style={{ background: "#1a1d28" }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }} />
                <span className="text-xs font-semibold text-slate-400">
                  Draw.io Editor — make changes, then click Save
                </span>
              </div>
              <span className="text-[10px] text-slate-600">
                Save → cloud history · Download → your device
              </span>
            </div>

            {editorLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
                style={{ background: "rgba(13,15,20,0.95)" }}>
                <div className="w-10 h-10 rounded-full border-[3px] border-blue-500/20 border-t-blue-500 animate-spin" />
                <p className="text-white font-semibold text-sm">Opening Editor</p>
                <p className="text-slate-500 text-xs">Loading your diagram…</p>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={DRAWIO_URL}
              className="flex-1 w-full border-none block"
              style={{ opacity: editorLoading ? 0 : 1, transition: "opacity 0.4s ease" }}
              title="Draw.io Diagram Editor"
            />
          </div>
        )}
      </div>
    </div>
  );
};

if (!document.getElementById("editor-keyframes")) {
  const s = document.createElement("style");
  s.id = "editor-keyframes";
  s.innerHTML = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
  document.head.appendChild(s);
}

export default DiagramEditor;
