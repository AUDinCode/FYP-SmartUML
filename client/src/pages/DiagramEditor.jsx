// src/pages/DiagramEditor.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // ✅ FIX: Path corrected
import plantumlEncoder from "plantuml-encoder";
import {
  Save,
  Download,
  ArrowLeft,
  FileText,
  FileImage,
  Layers,
  Loader,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import Button from "../components/Button";
import Dropdown from "../components/Dropdown";

const DiagramEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchDiagram = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const docRef = doc(db, "chats", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const code = docSnap.data().diagramCode;
          if (code) {
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

  const handleBack = () => navigate("/dashboard");
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));

  // Placeholder Save Function (UI same rakhne ke liye)
  const handleSave = () => alert("Diagram is auto-saved in Firebase!");

  // Export Logic
  const handleExport = async (format) => {
    if (!imageUrl) return;
    try {
      // Simple download logic
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
    {
      label: "Export as PNG",
      icon: FileImage,
      action: () => handleExport("PNG"),
    },
    {
      label: "Export as XML",
      icon: FileText,
      action: () => handleExport("XML"),
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* --- HEADER (DESIGN SAME HAI) --- */}
      <header className="p-3 bg-gray-800 border-b border-gray-700/50 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleBack}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 !py-2 !px-3"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </Button>
          <h1 className="text-xl font-semibold">Diagram Customization</h1>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save size={18} />{" "}
            <span className="ml-2 hidden sm:inline">Save Changes</span>
          </Button>
          <Dropdown
            label="Export"
            icon={<Download size={18} />}
            options={exportFormats}
            className="bg-gray-600 hover:bg-gray-700"
          />
        </div>
      </header>

      {/* --- MAIN AREA (NO IFRAME, NOW IMAGE) --- */}
      <div className="flex flex-1 overflow-hidden p-4">
        <div className="flex-1 border border-gray-600 rounded-lg overflow-auto bg-gray-800/50 relative flex justify-center items-start pt-10">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <Loader size={30} className="animate-spin mr-3 text-blue-400" />
              <span>Loading Diagram...</span>
            </div>
          )}

          {error && <div className="text-red-400 mt-20">{error}</div>}

          {!loading && !error && imageUrl && (
            <img
              src={imageUrl}
              alt="Diagram"
              className="max-w-none shadow-lg bg-white p-4 rounded"
              style={{
                transform: `scale(${zoom})`,
                transition: "transform 0.2s",
              }}
            />
          )}
        </div>
      </div>

      {/* Zoom Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
        <Button
          onClick={handleZoomIn}
          className="bg-gray-700 p-2 rounded-full shadow-lg"
        >
          <ZoomIn size={20} />
        </Button>
        <Button
          onClick={handleZoomOut}
          className="bg-gray-700 p-2 rounded-full shadow-lg"
        >
          <ZoomOut size={20} />
        </Button>
      </div>
    </div>
  );
};

export default DiagramEditor;
