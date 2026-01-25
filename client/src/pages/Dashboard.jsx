// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ChevronDown, MessageSquare, AlertCircle } from "lucide-react";

// Firebase Imports
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// Components
import Button from "../components/Button";
import Card from "../components/Card";

const DIAGRAM_TYPES = [
  "Use Case Diagram",
  "Class Diagram",
  "Activity Diagram",
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [requirements, setRequirements] = useState("");
  const [selectedType, setSelectedType] = useState(DIAGRAM_TYPES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputError, setInputError] = useState("");

  // VALIDATION LOGIC
  const validateInput = (text, type) => {
    const trimmedText = text.trim();
    if (!trimmedText) return ""; 

    const lowerText = trimmedText.toLowerCase();
    const words = lowerText.split(/\s+/); // Words count

    // LONG WORD CHECK 
    const hasSuperLongWord = words.some(w => w.length > 25);
    if (hasSuperLongWord) {
        return "Please enter valid words. Some words look like random keyboard smashing.";
    }

    // MINIMUM WORDS
    if (words.length < 3) {
        return "Please enter a valid sentence (at least 3 words).";
    }

    // REAL ENGLISH CHECK
    const commonWords = [
        'the', 'is', 'a', 'an', 'and', 'to', 'of', 'in', 'for', 'with', 'on', 'at', 'my', 
        'create', 'make', 'system', 'user', 'login', 'admin', 'page', 'app', 'design', 'process', 
        'class', 'data', 'store', 'show', 'display', 'check', 'verify', 'start', 'end', 'if', 'then'
    ];
    
    const hasCommonWord = words.some(word => commonWords.includes(word));

    if (!hasCommonWord) {
        return "This looks like random typing. Please use valid English sentences.";
    }

    // TOTAL LENGTH CHECK
    if (trimmedText.length < 20) {
      return "Description is too short. Please add more details for a better diagram.";
    }

    // CONTEXT CHECK 
    
    // 1. Class Diagram
    if (type === "Class Diagram" && 
        !lowerText.includes("class") && 
        !lowerText.includes("attribute") && 
        !lowerText.includes("method") && 
        !lowerText.includes("object") &&
        !lowerText.includes("entity")) {
        return "Tip: For Class Diagrams, you MUST mention 'class', 'attributes', 'methods' or 'objects'.";
    }

    // 2. Use Case Diagram
    if (type === "Use Case Diagram" && 
        !lowerText.includes("user") && 
        !lowerText.includes("actor") && 
        !lowerText.includes("interaction") && 
        !lowerText.includes("use case") &&
        !lowerText.includes("initiates")) {
        return "Tip: For Use Cases, specific keywords like 'User', 'Actor', or 'Interaction' are required.";
    }

    // 3. Activity Diagram
    if (type === "Activity Diagram" && 
        !lowerText.includes("flow") && 
        !lowerText.includes("step") && 
        !lowerText.includes("activity") && 
        !lowerText.includes("decision") && 
        !lowerText.includes("start") && 
        !lowerText.includes("end")) {
        return "Tip: For Activity Diagrams, use words like 'Start', 'End', 'Flow', 'Step', or 'Decision'.";
    }

    return "";
  };

  // Real-time Checking
  useEffect(() => {
    if (!requirements) {
        setInputError("");
        return;
    }
    const errorMsg = validateInput(requirements, selectedType);
    setInputError(errorMsg);
  }, [requirements, selectedType]);

  // handles when generate dig is clicked
  const handleGenerate = async () => {
    const errorMsg = validateInput(requirements, selectedType);
    if (errorMsg) {
      setInputError(errorMsg);
      return; 
    }
    
    setIsGenerating(true); //spinner

    try {
      // sending data to FireBase
      const docRef = await addDoc(collection(db, "chats"), {
        userId: currentUser.uid,
        title: selectedType + ": " + requirements.substring(0, 20) + "...",
        prompt: requirements,
        diagramType: selectedType,
        diagramCode: "graph TD; A-->B;", 
        createdAt: serverTimestamp(),
      });

      // success case empties req 
      setIsGenerating(false);
      setRequirements("");
      alert("Success! Chat saved to Database. Check Sidebar!");

    } catch (error) {      // error in internet or firebase
      console.error("Error saving:", error);
      alert("Error: " + error.message);
      setIsGenerating(false);
    }
  };

  const isButtonDisabled = isGenerating || !!inputError || !requirements.trim();

  return (
    <div className="flex-1 flex flex-col h-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-white">
        Dashboard
      </h1>
      
      <div className="flex-1 flex flex-col">
          <Card className="flex flex-col flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5 bg-gray-800 border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center">
              <MessageSquare size={24} className="mr-3 text-blue-400" />
              Start New Generation
            </h2>
            <p className="text-sm text-gray-400">
              Describe your system requirements and select the desired UML diagram type.
            </p>

            {/* Diagram Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Diagram Type
              </label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full py-2 sm:py-3 px-4 rounded-lg border border-white/30 bg-white/10 text-white text-sm sm:text-base focus:ring-blue-400 appearance-none cursor-pointer"
                >
                  {DIAGRAM_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-gray-800 text-white">
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 pointer-events-none" />
              </div>
            </div>

            {/* Requirements Input */}
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                User Requirements (Text Prompt)
              </label>
              
              <textarea
                placeholder="E.g., A user should be able to log in, and an admin can approve diagrams..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className={`flex-1 w-full p-3 sm:p-4 rounded-lg border bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 resize-none min-h-[150px] sm:min-h-[200px] ${
                    inputError ? "border-red-500 focus:ring-red-500" : "border-white/30 focus:ring-blue-400"
                }`}
              />

              {/* Error Message Display Area */}
              {inputError && (
                  <div className="mt-2 text-red-400 text-sm flex items-center animate-pulse">
                      <AlertCircle size={16} className="mr-2" />
                      {inputError}
                  </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              fullWidth
              onClick={handleGenerate}
              disabled={isButtonDisabled}
              className={`flex items-center justify-center text-sm sm:text-base cursor-pointer ${
                  isButtonDisabled ? "opacity-50 cursor-not-allowed grayscale" : ""
              }`}
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
      </div>
    </div>
  );
};

export default Dashboard;