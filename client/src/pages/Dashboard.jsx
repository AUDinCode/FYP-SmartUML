// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ChevronDown, MessageSquare, AlertCircle } from "lucide-react";

// Firebase Imports
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // ✅ FIX: Path Check karo
import { useAuth } from "../context/AuthContext"; // ✅ FIX: 'contexts' nahi 'context' (singular)

// Components
import Button from "../components/Button";
import Card from "../components/Card";

const DIAGRAM_TYPES = ["Use Case Diagram", "Class Diagram", "Activity Diagram"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [requirements, setRequirements] = useState("");
  const [selectedType, setSelectedType] = useState(DIAGRAM_TYPES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputError, setInputError] = useState("");

  const validateInput = (text, type) => {
    const trimmedText = text.trim();
    if (!trimmedText) return "";
    const lowerText = trimmedText.toLowerCase();
    const words = lowerText.split(/\s+/);

    if (words.some((w) => w.length > 25)) return "Please enter valid words.";
    if (words.length < 3)
      return "Please enter a valid sentence (at least 3 words).";

    const commonWords = [
      "the",
      "is",
      "a",
      "an",
      "and",
      "to",
      "of",
      "in",
      "for",
      "with",
      "on",
      "create",
      "make",
      "system",
      "user",
      "login",
      "admin",
      "page",
      "app",
      "design",
      "process",
      "class",
      "data",
    ];
    if (!words.some((word) => commonWords.includes(word)))
      return "This looks like random typing.";
    if (trimmedText.length < 20) return "Description is too short.";

    return "";
  };

  useEffect(() => {
    if (!requirements) {
      setInputError("");
      return;
    }
    setInputError(validateInput(requirements, selectedType));
  }, [requirements, selectedType]);

  const handleGenerate = async () => {
    const errorMsg = validateInput(requirements, selectedType);
    if (errorMsg) {
      setInputError(errorMsg);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/generate-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: requirements,
          diagram_type: selectedType,
        }),
      });

      const data = await response.json();
      if (data.status === "error") throw new Error(data.message);

      const generatedCode = data.diagram_code;

      const docRef = await addDoc(collection(db, "chats"), {
        userId: currentUser.uid,
        title: selectedType + ": " + requirements.substring(0, 20) + "...",
        prompt: requirements,
        diagramType: selectedType,
        diagramCode: generatedCode,
        createdAt: serverTimestamp(),
      });

      setIsGenerating(false);
      setRequirements("");

      // ✅ FIX: Ab ye sahi Editor page par le jayega
      navigate(`/editor/${docRef.id}`);
    } catch (error) {
      console.error("Error:", error);
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
            <MessageSquare size={24} className="mr-3 text-blue-400" /> Start New
            Generation
          </h2>
          <p className="text-sm text-gray-400">
            Describe your system requirements and select the desired UML diagram
            type.
          </p>

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

          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              User Requirements
            </label>
            <textarea
              placeholder="E.g., A user should be able to log in..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className={`flex-1 w-full p-3 sm:p-4 rounded-lg border bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 resize-none min-h-[150px] sm:min-h-[200px] no-scrollbar ${inputError ? "border-red-500 focus:ring-red-500" : "border-white/30 focus:ring-blue-400"}`}
            />
            {inputError && (
              <div className="mt-2 text-red-400 text-sm flex items-center animate-pulse">
                <AlertCircle size={16} className="mr-2" />
                {inputError}
              </div>
            )}
          </div>

          <Button
            fullWidth
            onClick={handleGenerate}
            disabled={isButtonDisabled}
            className={`flex items-center justify-center text-sm sm:text-base cursor-pointer ${isButtonDisabled ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
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
