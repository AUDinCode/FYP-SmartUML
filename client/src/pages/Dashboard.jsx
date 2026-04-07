import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, ChevronDown, Sparkles, AlertCircle,
  BoxSelect, GitFork, Activity, Check
} from "lucide-react";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import Button from "../components/Button";

const DIAGRAM_TYPES = [
  { label: "Use Case Diagram", icon: BoxSelect, color: "text-blue-400",   bg: "bg-blue-400/10"   },
  { label: "Class Diagram",    icon: GitFork,   color: "text-purple-400", bg: "bg-purple-400/10" },
  { label: "Activity Diagram", icon: Activity,  color: "text-green-400",  bg: "bg-green-400/10"  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [requirements, setRequirements] = useState("");
  const [selectedType, setSelectedType]  = useState(DIAGRAM_TYPES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating]  = useState(false);
  const [inputError, setInputError]      = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateInput = (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) return "";
    const lowerText = trimmedText.toLowerCase();
    const words     = lowerText.split(/\s+/);

    if (words.some((w) => w.length > 25))  return "Please enter valid words.";
    if (words.length < 3)                   return "Please enter a valid sentence (at least 3 words).";

    const commonWords = [
      "the","is","a","an","and","to","of","in","for","with","on",
      "create","make","system","user","login","admin","page","app",
      "design","process","class","data",
    ];
    if (!words.some((word) => commonWords.includes(word))) return "This looks like random typing.";
    if (trimmedText.length < 20) return "Description is too short.";
    return "";
  };

  useEffect(() => {
    if (!requirements) { setInputError(""); return; }
    setInputError(validateInput(requirements));
  }, [requirements, selectedType]);

  const handleGenerate = async () => {
    const errorMsg = validateInput(requirements);
    if (errorMsg) { setInputError(errorMsg); return; }

    setIsGenerating(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/generate-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: requirements, diagram_type: selectedType.label }),
      });

      const data = await response.json();
      if (data.status === "error") throw new Error(data.message);

      const docRef = await addDoc(collection(db, "chats"), {
        userId:      currentUser.uid,
        title:       selectedType.label + ": " + requirements.substring(0, 20) + "...",
        prompt:      requirements,
        diagramType: selectedType.label,
        diagramCode: data.diagram_code,
        createdAt:   serverTimestamp(),
      });

      setIsGenerating(false);
      setRequirements("");
      navigate(`/editor/${docRef.id}`);
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
      setIsGenerating(false);
    }
  };

  const isButtonDisabled = isGenerating || !!inputError || !requirements.trim();
  const charCount = requirements.length;
  const SelectedIcon = selectedType.icon;

  return (
    <div className="flex-1 flex flex-col h-full">

      {/* ── Page Header ── */}
      <div className="mb-4 sm:mb-6 pb-4 border-b border-gray-700/60 flex items-center gap-3">
        <div className="w-1 h-7 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Dashboard
        </h1>
      </div>

      {/* ── Generation Card ── */}
      <div className="flex-1 flex flex-col">
        <div className="
          flex flex-col flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5
          rounded-2xl border border-white/10
          bg-gradient-to-b from-gray-800/80 to-gray-900/80
          shadow-[0_0_30px_rgba(37,99,235,0.07)]
          relative overflow-hidden
        ">
          {/* ✅ FIXED: overflow-hidden so accent bar clips inside rounded corners */}

          {/* Top accent bar — now properly clipped inside the card */}
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Card heading */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Sparkles size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                Start New Generation
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Describe your system requirements and select the desired UML diagram type.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-700/50" />

          {/* ── Custom Dropdown ── */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Diagram Type
            </label>

            <div className="relative" ref={dropdownRef}>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  border bg-gray-700/50 text-white text-sm sm:text-base
                  transition-all duration-200 cursor-pointer
                  ${isDropdownOpen
                    ? "border-blue-400/60 ring-2 ring-blue-400/30"
                    : "border-white/20 hover:border-blue-400/40"
                  }
                `}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedType.bg}`}>
                  <SelectedIcon size={15} className={selectedType.color} />
                </div>

                <span className="flex-1 text-left font-medium">{selectedType.label}</span>

                <motion.div
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={17} className="text-white/50" />
                </motion.div>
              </button>

              {/* Dropdown panel */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="
                      absolute top-[calc(100%+8px)] left-0 right-0 z-50
                      rounded-xl border border-white/10
                      bg-gray-800/95 backdrop-blur-md
                      shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                      overflow-hidden
                    "
                  >
                    {DIAGRAM_TYPES.map((type) => {
                      const Icon       = type.icon;
                      const isSelected = selectedType.label === type.label;
                      return (
                        <button
                          key={type.label}
                          type="button"
                          onClick={() => {
                            setSelectedType(type);
                            setIsDropdownOpen(false);
                          }}
                          className={`
                            w-full flex items-center gap-3 px-4 py-3
                            transition-all duration-150 cursor-pointer text-left
                            ${isSelected
                              ? "bg-blue-600/20 text-white"
                              : "text-gray-300 hover:bg-gray-700/60 hover:text-white"
                            }
                          `}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${type.bg}`}>
                            <Icon size={15} className={type.color} />
                          </div>

                          <span className="flex-1 text-sm font-medium">{type.label}</span>

                          {isSelected && (
                            <Check size={15} className="text-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Textarea ── */}
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              User Requirements
            </label>
            <div className="relative flex-1 flex flex-col">
              <textarea
                placeholder="E.g., A user should be able to log in..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className={`
                  flex-1 w-full p-3 sm:p-4 rounded-xl border
                  bg-gray-700/40 text-white placeholder-white/30
                  focus:outline-none focus:ring-2 resize-none
                  min-h-[150px] sm:min-h-[200px] no-scrollbar
                  transition-all duration-200
                  ${inputError
                    ? "border-red-500/70 focus:ring-red-500"
                    : "border-white/10 focus:ring-blue-400 hover:border-blue-400/30 focus:border-blue-400/50"
                  }
                `}
              />
              <span className={`absolute bottom-3 right-4 text-xs font-mono transition-colors duration-200 ${charCount > 0 ? "text-blue-400/70" : "text-gray-600"}`}>
                {charCount} chars
              </span>
            </div>

            {inputError && (
              <div className="mt-2 text-red-400 text-sm flex items-center animate-pulse">
                <AlertCircle size={16} className="mr-2 shrink-0" />
                {inputError}
              </div>
            )}
          </div>

          {/* ── Generate Button ── */}
          <Button
            fullWidth
            onClick={handleGenerate}
            disabled={isButtonDisabled}
            className={`
              flex items-center justify-center text-sm sm:text-base cursor-pointer
              transition-all duration-300
              ${isButtonDisabled
                ? "opacity-40 cursor-not-allowed grayscale"
                : "shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_28px_rgba(37,99,235,0.6)]"
              }
            `}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-3" />
                Generating...
              </>
            ) : (
              <>
                <Send size={18} className="mr-2" />
                Generate Diagram
              </>
            )}
          </Button>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;