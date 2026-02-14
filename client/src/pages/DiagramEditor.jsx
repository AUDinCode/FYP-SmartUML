import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, Save, Loader, Edit, X, Code, Eye, Download, RefreshCw } from "lucide-react";
import Button from "../components/Button";



const DiagramEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  
  // State management
  const [xmlData, setXmlData] = useState("");
  const [originalXmlData, setOriginalXmlData] = useState(""); // Track original for "unsaved changes"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch diagram from Firebase
  useEffect(() => {
    const fetchDiagram = async () => {
      if (!id) {
        setError("No diagram ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const docRef = doc(db, "chats", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data().diagramCode || "";
          setXmlData(data);
          setOriginalXmlData(data);
        } else {
          setError("Diagram not found");
        }
      } catch (err) {
        console.error("Error fetching diagram:", err);
        setError("Failed to load diagram. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiagram();
  }, [id]);

  // Draw.io embed configuration
  const DRAWIO_URL = "https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&noSaveBtn=1&saveAndExit=0";

  // Handle Draw.io iframe communication
  useEffect(() => {
    if (!isEditing || !xmlData) return;

    const handleMessage = (event) => {
      // Security check: only accept messages from diagrams.net
      if (!event.origin.includes("diagrams.net") && !event.origin.includes("draw.io")) {
        return;
      }

      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      // Handle initialization
      if (data.event === "init") {
        console.log("🔌 Draw.io initialized, loading XML...");
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            action: "load",
            autosave: 0,
            xml: xmlData
          }),
          "*"
        );
      }

      // Handle diagram changes (for tracking unsaved changes)
      if (data.event === "save" || data.event === "autosave") {
        console.log("📝 Diagram modified");
        const newXml = data.xml;
        if (newXml && newXml !== xmlData) {
          setXmlData(newXml);
          setHasUnsavedChanges(true);
        }
      }

      // Handle export
      if (data.event === "export") {
        console.log("📤 Diagram exported");
        const newXml = data.data;
        if (newXml) {
          setXmlData(newXml);
          setHasUnsavedChanges(true);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEditing, xmlData]);

  // Save diagram to Firebase
  const handleSave = async () => {
    if (!id || !xmlData) return;

    try {
      setSaving(true);
      setError(null);

      // Request export from Draw.io if in editing mode
      if (isEditing && iframeRef.current) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            action: "export",
            format: "xml"
          }),
          "*"
        );
        
        // Wait a bit for the export response
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const docRef = doc(db, "chats", id);
      await updateDoc(docRef, {
        diagramCode: xmlData,
        updatedAt: new Date().toISOString()
      });

      setOriginalXmlData(xmlData);
      setHasUnsavedChanges(false);
      console.log("✅ Diagram saved successfully");
    } catch (err) {
      console.error("Error saving diagram:", err);
      setError("Failed to save diagram. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Download XML file
  const handleDownload = () => {
    const blob = new Blob([xmlData], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${id}.drawio`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle editing mode
  const toggleEditing = () => {
    if (isEditing && hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Do you want to save before closing the editor?"
      );
      if (confirmed) {
        handleSave();
      }
    }
    setIsEditing(!isEditing);
  };

  // Reload diagram from Firebase
  const handleReload = async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Reloading will discard them. Continue?"
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, "chats", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data().diagramCode || "";
        setXmlData(data);
        setOriginalXmlData(data);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      setError("Failed to reload diagram");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-lg">Loading diagram...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !xmlData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center max-w-md">
          <X className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={() => navigate("/dashboard")} className="bg-purple-600">
            <ArrowLeft size={18} /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-700 hover:bg-gray-600"
          >
            <ArrowLeft size={18} /> Back
          </Button>
          
          {hasUnsavedChanges && (
            <span className="text-yellow-400 text-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleReload}
            className="bg-gray-700 hover:bg-gray-600"
            title="Reload diagram"
          >
            <RefreshCw size={18} />
          </Button>

          <Button
            onClick={() => setShowXmlPreview(!showXmlPreview)}
            className="bg-gray-700 hover:bg-gray-600"
            title="Toggle XML preview"
          >
            {showXmlPreview ? <Eye size={18} /> : <Code size={18} />}
          </Button>

          <Button
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700"
            title="Download as .drawio file"
          >
            <Download size={18} /> Download
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`${
              saving || !hasUnsavedChanges
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {saving ? (
              <>
                <Loader className="animate-spin" size={18} /> Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save
              </>
            )}
          </Button>

          <Button
            onClick={toggleEditing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isEditing ? (
              <>
                <X size={18} /> Close Editor
              </>
            ) : (
              <>
                <Edit size={18} /> Edit Diagram
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-800 px-4 py-2 text-sm flex items-center gap-2">
          <X size={16} className="text-red-400" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative bg-gray-100">
        {/* XML Preview Mode */}
        {!isEditing && showXmlPreview && (
          <div className="w-full h-full flex flex-col items-center justify-start p-8 bg-gray-800">
            <div className="w-full max-w-4xl">
              <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                <Code size={24} /> XML Source Code
              </h2>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-[calc(100vh-200px)] overflow-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                  {xmlData || "No XML data available"}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Read-only Preview Mode */}
        {!isEditing && !showXmlPreview && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-800/50">
            <div className="text-center mb-4">
              <Eye size={48} className="mx-auto mb-2 text-purple-400" />
              <h2 className="text-2xl font-bold mb-2 text-white">Preview Mode</h2>
              <p className="text-gray-400">
                Click "Edit Diagram" to open the Draw.io editor
              </p>
            </div>
            
            <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
                <span className="text-sm font-semibold text-gray-300">
                  XML Preview (First 500 characters)
                </span>
                <Button
                  onClick={() => setShowXmlPreview(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-xs py-1 px-2"
                >
                  View Full
                </Button>
              </div>
              <div className="h-48 overflow-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                  {xmlData ? xmlData.substring(0, 500) + (xmlData.length > 500 ? "..." : "") : "Loading..."}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Draw.io Editor Mode */}
        {isEditing && (
          <iframe
            ref={iframeRef}
            src={DRAWIO_URL}
            className="w-full h-full border-none"
            title="Draw.io Diagram Editor"
          />
        )}
      </div>
    </div>
  );
};

export default DiagramEditor;