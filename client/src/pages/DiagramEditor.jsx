import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  ArrowLeft, Save, Loader, Edit, X,
  Code, Eye, Download, RefreshCw
} from "lucide-react";
import DiagramViewer from "../components/DiagramViewer";

// ── Typing animation words ──
// ── Typing animation words ──
// ── Typing animation words ──
const FULL_PHRASE    = "Build · Preview · Refine";
const TYPING_SPEED   = 90;
const DELETING_SPEED = 45;
const PAUSE_AFTER    = 1500;

const useTypingLoop = () => {
  const [displayed, setDisplayed]   = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let t;

    if (!isDeleting && displayed.length < FULL_PHRASE.length) {
      // Still typing
      t = setTimeout(() => {
        setDisplayed(FULL_PHRASE.slice(0, displayed.length + 1));
      }, TYPING_SPEED);

    } else if (!isDeleting && displayed.length === FULL_PHRASE.length) {
      // Fully typed — pause then start deleting
      t = setTimeout(() => {
        setIsDeleting(true);
      }, PAUSE_AFTER);

    } else if (isDeleting && displayed.length > 0) {
      // Deleting character by character
      t = setTimeout(() => {
        setDisplayed((prev) => prev.slice(0, -1));
      }, DELETING_SPEED);

    } else if (isDeleting && displayed.length === 0) {
      // Fully deleted — pause then start typing again
      t = setTimeout(() => {
        setIsDeleting(false);
      }, PAUSE_AFTER / 2);
    }

    return () => clearTimeout(t);
  }, [displayed, isDeleting]);

  return displayed;
};

const DiagramEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  const [xmlData, setXmlData]                     = useState("");
  const [originalXmlData, setOriginalXmlData]     = useState("");
  const [loading, setLoading]                     = useState(true);
  const [saving, setSaving]                       = useState(false);
  const [isEditing, setIsEditing]                 = useState(false);
  const [editorLoading, setEditorLoading]         = useState(false);
  const [showXmlPreview, setShowXmlPreview]       = useState(false);
  const [error, setError]                         = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const typedText = useTypingLoop();

  useEffect(() => {
    const fetchDiagram = async () => {
      if (!id) { setError("No diagram ID provided"); setLoading(false); return; }
      try {
        setLoading(true); setError(null);
        const docRef  = doc(db, "chats", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data().diagramCode || "";
          setXmlData(data); setOriginalXmlData(data);
        } else { setError("Diagram not found"); }
      } catch (err) {
        console.error("Error fetching diagram:", err);
        setError("Failed to load diagram. Please try again.");
      } finally { setLoading(false); }
    };
    fetchDiagram();
  }, [id]);

  const DRAWIO_URL =
    "https://embed.diagrams.net/" +
    "?embed=1&ui=dark&spin=1&proto=json&noSaveBtn=1&noExitBtn=1&saveAndExit=0&chrome=1";

  useEffect(() => {
    if (!isEditing || !xmlData) return;
    const handleMessage = (event) => {
      if (!event.origin.includes("diagrams.net") && !event.origin.includes("draw.io")) return;
      let data;
      try { data = JSON.parse(event.data); } catch (e) { return; }

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
        const newXml = data.xml;
        if (newXml && newXml !== xmlData) { setXmlData(newXml); setHasUnsavedChanges(true); }
      }
      if (data.event === "export") {
        const newXml = data.data;
        if (newXml) { setXmlData(newXml); setHasUnsavedChanges(true); }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEditing, xmlData]);

  const handleSave = async () => {
    if (!id || !xmlData) return;
    try {
      setSaving(true); setError(null);
      if (isEditing && iframeRef.current) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ action: "export", format: "xml" }), "*"
        );
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      const docRef = doc(db, "chats", id);
      await updateDoc(docRef, { diagramCode: xmlData, updatedAt: new Date().toISOString() });
      setOriginalXmlData(xmlData);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error saving diagram:", err);
      setError("Failed to save diagram. Please try again.");
    } finally { setSaving(false); }
  };

  const handleDownload = () => {
    const blob = new Blob([xmlData], { type: "application/xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `diagram-${id}.drawio`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const toggleEditing = () => {
    if (isEditing && hasUnsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Save before closing?");
      if (confirmed) handleSave();
    }
    if (!isEditing) setEditorLoading(true);
    setIsEditing(!isEditing);
  };

  const handleReload = async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("Reloading will discard unsaved changes. Continue?");
      if (!confirmed) return;
    }
    setLoading(true);
    try {
      const docRef  = doc(db, "chats", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data().diagramCode || "";
        setXmlData(data); setOriginalXmlData(data); setHasUnsavedChanges(false);
      }
    } catch (err) { setError("Failed to reload diagram"); }
    finally { setLoading(false); }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
          <p className="text-gray-400">Loading diagram...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error && !xmlData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center max-w-md">
          <X className="mx-auto mb-4 text-red-400" size={40} />
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white transition-all"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">

      {/* ── Navbar ── */}
      <header className="
        px-6 py-4 flex justify-between items-center
        bg-gray-900 border-b border-gray-700/50
        shadow-[0_2px_12px_rgba(0,0,0,0.3)]
        min-h-[68px]
      ">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-gray-800 border border-gray-700/60 text-white
              hover:bg-gray-700 hover:border-gray-600
              transition-all duration-200 cursor-pointer
            "
          >
            <ArrowLeft size={17} /> Back
          </button>

          {hasUnsavedChanges && (
            <span className="flex items-center gap-1.5 text-yellow-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>

        {/* ── Center — Typing animation ── */}
        <div className="hidden md:flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          {/* Accent bar */}
          <div className="w-0.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />

          {/* Typed text + cursor */}
          <div className="flex items-center gap-0 min-w-[180px]">
            <span className="
              text-sm font-bold tracking-wide
              bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400
              bg-clip-text text-transparent
              whitespace-nowrap
            ">
              {typedText}
            </span>
            {/* Blinking cursor */}
            <span className="
              inline-block w-[2px] h-[1.1em] ml-[2px]
              bg-gradient-to-b from-blue-400 to-indigo-500
              rounded-full
              animate-[blink_1s_step-end_infinite]
            " />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            title="Reload diagram"
            className="
              w-10 h-10 flex items-center justify-center rounded-xl
              bg-gray-800 border border-gray-700/60 text-gray-300
              hover:bg-gray-700 hover:text-white hover:border-gray-600
              transition-all duration-200 cursor-pointer
            "
          >
            <RefreshCw size={17} />
          </button>

          <button
            onClick={() => setShowXmlPreview(!showXmlPreview)}
            title={showXmlPreview ? "Show preview" : "Show XML"}
            className="
              w-10 h-10 flex items-center justify-center rounded-xl
              bg-gray-800 border border-gray-700/60 text-gray-300
              hover:bg-gray-700 hover:text-white hover:border-gray-600
              transition-all duration-200 cursor-pointer
            "
          >
            {showXmlPreview ? <Eye size={17} /> : <Code size={17} />}
          </button>

          <div className="w-px h-7 bg-gray-700/60 mx-1" />

          <button
            onClick={handleDownload}
            className="
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-r from-blue-500 to-indigo-600 text-white
              hover:shadow-[0_0_16px_rgba(37,99,235,0.5)]
              transition-all duration-200 cursor-pointer
            "
          >
            <Download size={16} /> Download
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              transition-all duration-200
              ${saving || !hasUnsavedChanges
                ? "bg-gray-800 border border-gray-700/60 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-[0_0_16px_rgba(37,99,235,0.5)] cursor-pointer"
              }
            `}
          >
            {saving
              ? <><Loader className="animate-spin" size={16} /> Saving...</>
              : <><Save size={16} /> Save</>
            }
          </button>

          <button
            onClick={toggleEditing}
            className="
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-r from-blue-500 to-indigo-600 text-white
              hover:shadow-[0_0_16px_rgba(37,99,235,0.5)]
              transition-all duration-200 cursor-pointer
            "
          >
            {isEditing
              ? <><X size={16} /> Close Editor</>
              : <><Edit size={16} /> Edit Diagram</>
            }
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-800/50 px-4 py-2 text-sm flex items-center gap-2 text-red-300">
          <X size={14} className="text-red-400 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 overflow-hidden relative bg-gray-900 p-4 sm:p-6">

        {/* XML Source Mode */}
        {!isEditing && showXmlPreview && (
          <div className="w-full h-full flex flex-col">
            <div className="mb-4 pb-4 border-b border-gray-700/60 flex items-center gap-3">
              <div className="w-1 h-7 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />
              <h1 className="text-xl font-bold text-white">XML Source</h1>
            </div>
            <div className="
              flex-1 rounded-2xl border border-white/10 overflow-hidden
              bg-gradient-to-b from-gray-800/80 to-gray-900/80
              shadow-[0_0_30px_rgba(37,99,235,0.07)] relative
            ">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <div className="flex items-center justify-between bg-gray-900/80 px-4 py-2 border-b border-gray-700/60 mt-[2px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/70"    />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <span className="w-3 h-3 rounded-full bg-green-500/70"  />
                </div>
                <span className="text-[11px] text-gray-500 font-mono">diagram.xml</span>
                <div className="w-12" />
              </div>
              <div className="overflow-auto h-[calc(100%-36px)] no-scrollbar">
                <pre className="p-4 font-mono text-sm text-green-300 whitespace-pre-wrap break-words leading-6">
                  {xmlData || "No XML data available"}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Diagram Viewer Mode */}
        {!isEditing && !showXmlPreview && (
          <div className="w-full h-full">
            <DiagramViewer xmlData={xmlData} />
          </div>
        )}

        {/* Draw.io Editor Mode */}
        {isEditing && (
          <div className="w-full h-full flex flex-col rounded-2xl border border-white/10 overflow-hidden bg-gray-900/80 shadow-[0_0_30px_rgba(37,99,235,0.07)]">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/80 border-b border-gray-700/50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
                <span className="text-xs font-semibold text-gray-300">
                  Draw.io Editor — make your changes, then click Save
                </span>
              </div>
              <span className="text-[11px] text-gray-500">
                Changes auto-tracked · Save button top-right saves to cloud
              </span>
            </div>

            {editorLoading && (
              <div className="absolute inset-0 top-[37px] flex flex-col items-center justify-center bg-gray-900/95 z-10 gap-3">
                <div className="w-12 h-12 rounded-full border-[3px] border-blue-500/20 border-t-blue-500 animate-spin" />
                <p className="text-white font-semibold text-sm">Opening Editor</p>
                <p className="text-gray-500 text-xs">Loading your diagram into the editor…</p>
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
  s.innerHTML = `
    @keyframes spin  { to { transform: rotate(360deg); } }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  `;
  document.head.appendChild(s);
}

export default DiagramEditor;