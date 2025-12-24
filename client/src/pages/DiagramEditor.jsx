// src/pages/DiagramEditor.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Save,
  Download,
  ArrowLeft,
  FileText,
  FileImage,
  Layers,
  Loader, // ✅ Visual update: Loader icon
} from "lucide-react";

// Import Custom Components
import Button from "../components/Button";
import Dropdown from "../components/Dropdown";

const DiagramEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Draw.io iframe reference (used for PostMessage API)
  const drawIoIframeRef = useRef(null);

  // State to hold the XML data to be loaded into Draw.io
  const [initialDiagramXML, setInitialDiagramXML] = useState(
    // Default XML structure.
    "<?xml version='1.0'?><mxfile><diagram id='my-diagram' name='UML Diagram'></diagram></mxfile>"
  );
  const [isDrawIOIframeLoaded, setIsDrawIOIframeLoaded] = useState(false);

  useEffect(() => {
    // --- CONCEPT: DATA FETCHING LOGIC YAHAN AYEGA ---
    if (id !== "new") {
      console.log(
        `[Concept]: Fetching previously generated diagram XML for ID: ${id}`
      );
      // TODO: API call to fetch PlantUML generated XML and set setInitialDiagramXML()
    }

    // --- CONCEPT: DRAW.IO MESSAGE RECEIVING LOGIC YAHAN AYEGA ---
    // Listen for messages from Draw.io (e.g., when export is ready)
    // window.addEventListener('message', handleDrawIoMessage);

    return () => {
      // Cleanup listener
      // window.removeEventListener('message', handleDrawIoMessage);
    };
  }, [id]);

  // --- CONCEPT: COMMAND SENDER FUNCTION (Important for Future) ---
  // Ye function Draw.io ko instructions bhejta hai (Save, Export, etc.)
  const sendDrawIoCommand = (message) => {
    if (drawIoIframeRef.current && drawIoIframeRef.current.contentWindow) {
      console.log("Sending command to Draw.io:", message);
      // Actual command:
      // drawIoIframeRef.current.contentWindow.postMessage(JSON.stringify(message), 'https://www.draw.io');
    }
  };

  // --- ACTION HANDLERS ---
  const handleBack = () => navigate("/dashboard");

  const handleSave = () => {
    console.log("[Concept]: Requesting edited XML from Draw.io for saving...");
    // Step 1: Ask Draw.io for current XML
    // sendDrawIoCommand({ action: 'export', format: 'xml', spin: 'Updating...' });

    // Step 2: Receive XML in useEffect (listener) and save to Firebase
  };

  const handleExport = (format) => {
    console.log(
      `[Concept]: Requesting Export in ${format} format from Draw.io...`
    );
    // sendDrawIoCommand({ action: 'export', format: format.toLowerCase() });
  };

  const exportFormats = [
    {
      label: "Export as PNG",
      icon: FileImage,
      action: () => handleExport("PNG"),
    },
    { label: "Export as SVG", icon: Layers, action: () => handleExport("SVG") },
    {
      label: "Export as XML (.drawio)",
      icon: FileText,
      action: () => handleExport("XML"),
    },
  ];

  return (
    // Full screen container
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* 1. Header / Top Toolbar */}
      <header className="p-3 bg-gray-800 border-b border-gray-700/50 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleBack}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 !py-2 !px-3"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </Button>
          <h1 className="text-xl font-semibold">
            Diagram Customization:{" "}
            {id === "new" ? "New Project" : `Project ${id}`}
          </h1>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save size={18} /> Save Changes
          </Button>

          {/* Export Dropdown */}
          <Dropdown
            label="Export"
            icon={<Download size={18} />}
            options={exportFormats}
            className="bg-gray-600 hover:bg-gray-700"
          />
        </div>
      </header>

      {/* 2. Main Content Area (Full Screen Draw.io Editor) */}
      <div className="flex flex-1 overflow-hidden p-4">
        {/* Draw.io Iframe area */}
        <div className="flex-1 border border-gray-600 rounded-lg overflow-hidden relative">
          <iframe
            ref={drawIoIframeRef}
            // 👇 Dark Mode enabled here (&dark=1)
            src={`https://www.draw.io/?embed=1&ui=min&libraries=1&dark=1&save=0&xml=${encodeURIComponent(
              initialDiagramXML
            )}`}
            onLoad={() => setIsDrawIOIframeLoaded(true)}
            className="w-full h-full border-none"
            title="Draw.io Editor"
          />

          {/* 👇 Better Loading Screen */}
          {!isDrawIOIframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white">
              <Loader size={30} className="animate-spin mr-3 text-blue-400" />
              <span className="text-lg font-medium">
                Loading Diagram Editor...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagramEditor;
