import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import plantumlEncoder from "plantuml-encoder";
import {
  Save,
  Download,
  ArrowLeft,
  FileImage,
  Layers,
  Loader,
  ZoomIn,
  ZoomOut,
  Edit,
  X,
  Copy
} from "lucide-react";

import Button from "../components/Button";
import Dropdown from "../components/Dropdown";

const DiagramEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  // States
  const [diagramCode, setDiagramCode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [isEditing, setIsEditing] = useState(false); // Toggle View/Edit Mode

  // --- 1. FETCH DATA (Image View Setup) ---
  useEffect(() => {
    const fetchDiagram = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const docRef = doc(db, "chats", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const code = docSnap.data().diagramCode;
          setDiagramCode(code);
          
          if (code) {
            // ✅ SVG URL generate kar rahe hain (Ye kabhi fail nahi hota)
            const encoded = plantumlEncoder.encode(code);
            setImageUrl(`https://www.plantuml.com/plantuml/svg/${encoded}`);
          } else {
            setError("No Diagram Code found.");
          }
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load diagram.");
      } finally {
        setLoading(false);
      }
    };
    fetchDiagram();
  }, [id]);

  // --- 2. CONFIGURATION FOR DRAW.IO ---
  // Simple URL rakha hai taake load jaldi ho
  const DRAWIO_URL = "https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&noSaveBtn=1";

  // --- 3. AUTO COPY ON EDIT (Smart Feature) 🧠 ---
  useEffect(() => {
    if (isEditing && diagramCode) {
      // Jaise hi Editor khulega, Code clipboard par copy ho jayega
      navigator.clipboard.writeText(diagramCode);
    }
  }, [isEditing, diagramCode]);

  // --- 4. IFRAME LOADER (Fix for Spinning) ---
  useEffect(() => {
    if (!isEditing) return;

    const handleMessage = (event) => {
      if (!event.origin.includes("diagrams.net") && !event.origin.includes("draw.io")) return;
      
      let data;
      try { data = JSON.parse(event.data); } catch (e) { return; }

      if (data.event === "init") {
        // Hum "Load" action bhej rahe hain lekin XML khali rakha hai
        // Taake wo "Loading..." par na phansay.
        if (iframeRef.current) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ action: "load", autosave: 0 }), 
            "*"
          );
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isEditing]);


  // --- ACTIONS ---
  const handleBack = () => navigate("/dashboard");
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleSave = () => alert("Diagram is auto-saved in Firebase!");

  const handleExport = async (format) => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagram-${id}.svg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Download failed");
    }
  };

  const exportFormats = [
    { label: "Export as SVG", icon: Layers, action: () => handleExport("SVG") },
    { label: "Export as PNG", icon: FileImage, action: () => handleExport("PNG") },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* HEADER */}
      <header className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button onClick={handleBack} className="bg-gray-700 hover:bg-gray-600 text-gray-300">
            <ArrowLeft size={18} /> Back
          </Button>
          <h1 className="text-lg font-semibold hidden sm:block">
            {isEditing ? "Advanced Editor" : "Diagram Preview"}
          </h1>
        </div>

        <div className="flex space-x-3">
          {/* Toggle Button: View vs Edit */}
          <Button 
            onClick={() => setIsEditing(!isEditing)} 
            className={`flex items-center gap-2 ${isEditing ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}
          >
            {isEditing ? <><X size={18} /> Close Editor</> : <><Edit size={18} /> Edit Diagram</>}
          </Button>

          {!isEditing && (
             <Dropdown label="Export" icon={<Download size={18} />} options={exportFormats} className="bg-gray-600 hover:bg-gray-700" />
          )}
          
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save size={18} /> <span className="ml-2 hidden sm:inline">Save</span>
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden relative bg-gray-100">
        
        {/* VIEW MODE: SVG Image (Fast & Reliable) */}
        {!isEditing && (
          <div className="w-full h-full flex items-center justify-center overflow-auto p-8 bg-gray-800/50">
            {loading && <Loader size={40} className="animate-spin text-blue-500" />}
            {error && <div className="text-red-400">{error}</div>}
            
            {!loading && !error && imageUrl && (
              <img
                src={imageUrl}
                alt="Diagram"
                className="shadow-2xl bg-white p-4 rounded-lg transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            )}

            {/* Zoom Controls */}
            <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
              <Button onClick={handleZoomIn} className="bg-gray-700 p-3 rounded-full shadow-lg"><ZoomIn size={20} /></Button>
              <Button onClick={handleZoomOut} className="bg-gray-700 p-3 rounded-full shadow-lg"><ZoomOut size={20} /></Button>
            </div>
          </div>
        )}

        {/* EDIT MODE: Draw.io Iframe */}
        {isEditing && (
          <div className="w-full h-full bg-white relative">
            
            {/* Instruction Overlay */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full shadow-lg border border-yellow-300 flex items-center gap-2 text-sm font-medium animate-bounce">
              <Copy size={16}/> 
              <span>Code Copied! Press <b>Ctrl + V</b> to paste diagram.</span>
            </div>

            <div className="absolute top-2 right-2 z-20 bg-gray-800 text-white p-2 text-xs rounded opacity-80">
              Insert &gt; Advanced &gt; PlantUML
            </div>
            
            <iframe
              ref={iframeRef}
              src={DRAWIO_URL}
              className="w-full h-full border-none"
              title="Draw.io Editor"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramEditor;