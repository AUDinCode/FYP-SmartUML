// src/pages/Dashboard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ChevronDown, MessageSquare, ArrowRight } from "lucide-react";

// 👇 Firebase Imports (Naya Code - Saving ke liye)
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// Import Custom Components
import Button from "../components/Button";
import Card from "../components/Card";

const DIAGRAM_TYPES = [
  "Use Case Diagram",
  "Class Diagram",
  "Activity Diagram",
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // 👇 User lene ke liye

  const [requirements, setRequirements] = useState("");
  const [selectedType, setSelectedType] = useState(DIAGRAM_TYPES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  // 👇 REAL DATABASE FUNCTION
  const handleGenerate = async () => {
    if (requirements.trim() === "") {
      alert("Please describe your requirements first.");
      return;
    }
    
    setIsGenerating(true);

    try {
      // 1. Save to Firestore (Database)
      const docRef = await addDoc(collection(db, "chats"), {
        userId: currentUser.uid,
        title: selectedType + ": " + requirements.substring(0, 20) + "...", // Chat Title
        prompt: requirements,
        diagramType: selectedType,
        diagramCode: "graph TD; A-->B;", // Dummy code for now
        createdAt: serverTimestamp(),
      });

      // 2. Success Feedback
      setIsGenerating(false);
      setRequirements(""); // Clear input
      
      // Filhal alert, baad mein hum Editor page par bhejenge
      alert("Success! Chat saved to Database. Check Sidebar!");
      // navigate(`/editor/${docRef.id}`); // Future step

    } catch (error) {
      console.error("Error saving:", error);
      alert("Error: " + error.message);
      setIsGenerating(false);
    }
  };

  const renderMainContent = () => {
    if (activeHistoryId) {
      return (
        <Card className="flex flex-col flex-1 p-4 sm:p-8 bg-gray-800 border-gray-700/50">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-400 mb-4">
            Chat / Diagram Preview (ID: {activeHistoryId})
          </h2>
          <div className="flex-1 text-gray-400 overflow-y-auto">
            <p>
              This area will show the previous conversation or the generated
              diagram's image/code.
            </p>
            <Button
              onClick={() => navigate(`/editor/${activeHistoryId}`)}
              className="mt-4"
            >
              <ArrowRight size={20} className="mr-2" />
              Open in Editor
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card className="flex flex-col flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5 bg-gray-800 border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center">
          <MessageSquare size={24} className="mr-3 text-blue-400" />
          Start New Generation
        </h2>
        <p className="text-sm text-gray-400">
          Describe your system requirements and select the desired UML diagram
          type.
        </p>

        {/* 1. Diagram Type Dropdown */}
        <div>
          <label
            htmlFor="diagram-type"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Select Diagram Type
          </label>
          <div className="relative">
            <select
              id="diagram-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-2 sm:py-3 px-4 rounded-lg border border-white/30 bg-white/10 text-white text-sm sm:text-base focus:ring-blue-400 appearance-none cursor-pointer"
            >
              {DIAGRAM_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                  className="bg-gray-800 text-white"
                >
                  {type}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 pointer-events-none"
            />
          </div>
        </div>

        {/* 2. User Requirements Input */}
        <div className="flex-1 flex flex-col">
          <label
            htmlFor="requirements"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            User Requirements (Text Prompt)
          </label>
          <textarea
            id="requirements"
            placeholder="E.g., A user should be able to log in, and an admin can approve diagrams..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="flex-1 w-full p-3 sm:p-4 rounded-lg border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[150px] sm:min-h-[200px]"
          />
        </div>

        {/* 3. Generate Button */}
        <Button
          fullWidth
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center text-sm sm:text-base cursor-pointer"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-3"></div>
              Saving...
            </>
          ) : (
            <>
              <Send size={20} className="mr-2" />
              Generate Diagram
            </>
          )}
        </Button>
      </Card>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-white">
        Dashboard
      </h1>
      <div className="flex-1 flex flex-col">{renderMainContent()}</div>
    </div>
  );
};

export default Dashboard;
