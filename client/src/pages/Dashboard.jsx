import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, AlertCircle,
  BoxSelect, GitFork, Activity, Check,
  ChevronDown, ChevronRight, Plus, Wand2, Lightbulb, Target, BookOpen
} from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

/* ── Diagram types ── */
const DIAGRAM_TYPES = [
  { label: "Use Case Diagram", icon: BoxSelect, color: "text-blue-400",   bg: "bg-blue-500/12",   border: "border-blue-500/25", glow: "rgba(59,130,246,0.15)"  },
  { label: "Class Diagram",    icon: GitFork,   color: "text-purple-400", bg: "bg-purple-500/12", border: "border-purple-500/25",glow: "rgba(139,92,246,0.15)" },
  { label: "Activity Diagram", icon: Activity,  color: "text-green-400",  bg: "bg-green-500/12",  border: "border-green-500/25", glow: "rgba(34,197,94,0.15)"  },
];

/* ── Dropdown feature groups per diagram ── */
const FEATURE_GROUPS = {
  "Use Case Diagram": [
    {
      label: "Actors",
      color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20",
      items: ["User","Admin","Manager","Customer","Guest","Employee","System","External System","Database","Third-party Service","Moderator","Super Admin"],
    },
    {
      label: "Use Cases",
      color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20",
      items: ["Login","Register","Logout","View Dashboard","Manage Profile","Reset Password","Search","View Reports","Send Notification","Upload File","Download File","Manage Users","Approve Request","Generate Report","Make Payment","Track Order"],
    },
    {
      label: "Relationships",
      color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20",
      items: ["include relationship","extend relationship","generalization relationship","association","system boundary"],
    },
  ],
  "Class Diagram": [
    {
      label: "Classes",
      color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20",
      items: ["User","Admin","Product","Order","Customer","Payment","Invoice","Category","Cart","Address","Role","Session","Notification","Report","Employee","Department"],
    },
    {
      label: "Attributes",
      color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20",
      items: ["id: int","name: String","email: String","password: String","createdAt: Date","status: String","price: double","quantity: int","description: String","address: String","phone: String","role: String"],
    },
    {
      label: "Methods",
      color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20",
      items: ["login()","logout()","register()","getDetails()","update()","delete()","save()","calculate()","validate()","sendEmail()","generateReport()","processPayment()"],
    },
    {
      label: "Relationships",
      color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20",
      items: ["Inheritance (extends)","Association","Composition","Aggregation","Dependency","Realization","multiplicity 1 to 1","multiplicity 1 to many","multiplicity many to many"],
    },
  ],
  "Activity Diagram": [
    {
      label: "Actions",
      color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20",
      items: ["Start","End","Submit Form","Validate Input","Process Request","Send Email","Generate Report","Update Database","Display Result","Show Error","Redirect to Page","Log Activity","Authenticate User","Calculate Result","Save to Database"],
    },
    {
      label: "Control Nodes",
      color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20",
      items: ["Decision Point","Fork (parallel start)","Join (parallel end)","Merge","Loop start","Loop end","Initial Node","Final Node","Flow Final"],
    },
    {
      label: "Swimlanes",
      color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20",
      items: ["Swimlane: User","Swimlane: Admin","Swimlane: System","Swimlane: Database","Swimlane: Payment Gateway","Swimlane: Email Service","Swimlane: Manager","Swimlane: Customer"],
    },
  ],
};

/* ── Quick guide per diagram ── */
const QUICK_GUIDE = {
  "Use Case Diagram": {
    color: "text-blue-400", bg: "bg-blue-500/8", border: "border-blue-500/15",
    description: "Models interactions between external actors and a system.",
    steps: [
      "Identify all actors (users, systems) that interact with your system",
      "List the main use cases (actions/goals) the system provides",
      "Define relationships: include, extend, generalization",
      "Set a clear system boundary around all use cases",
    ],
    example: "A User can Login, Register, View Dashboard. Admin can Manage Users and Generate Reports. Login includes Validate Credentials.",
  },
  "Class Diagram": {
    color: "text-purple-400", bg: "bg-purple-500/8", border: "border-purple-500/15",
    description: "Shows classes, their attributes, methods, and relationships.",
    steps: [
      "Define your main classes (entities in the system)",
      "List key attributes (fields) for each class",
      "Add important methods (functions) to each class",
      "Show relationships: inheritance, association, composition",
    ],
    example: "User class with attributes name, email. Order class with methods placeOrder(), cancelOrder(). User has many Orders (1 to *).",
  },
  "Activity Diagram": {
    color: "text-green-400", bg: "bg-green-500/8", border: "border-green-500/15",
    description: "Illustrates workflows, processes, and control flows.",
    steps: [
      "Start with a clear initial node (trigger event)",
      "List sequential actions/steps in the flow",
      "Add decision points where the flow branches",
      "Use swimlanes to separate responsibilities",
    ],
    example: "User submits login form → System validates credentials → Decision: valid? Yes: redirect to dashboard. No: show error. End.",
  },
};

const PLACEHOLDERS = {
  "Use Case Diagram":  "E.g., A User can Login, Register, and View Dashboard. Admin can Manage Users and View Reports. Login includes Validate Credentials...",
  "Class Diagram":     "E.g., User class has name, email, password attributes and login(), logout() methods. Order class has orderId, status and placeOrder() method. User has many Orders...",
  "Activity Diagram":  "E.g., User submits login form, system validates credentials. If valid, redirect to dashboard. If invalid, show error and allow retry...",
};

/* ── Single feature group dropdown ── */
const FeatureDropdown = ({ group, onSelect, diagColor }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold
          cursor-pointer transition-all duration-150 hover:brightness-125
          ${group.color} ${group.bg} ${group.border}
          ${open ? "ring-1 ring-current ring-opacity-40" : ""}
        `}
      >
        {group.label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown size={11} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[calc(100%+6px)] left-0 z-50 rounded-xl border border-white/[0.08]
              overflow-hidden shadow-2xl"
            style={{ background: "#1a1d28", minWidth: "190px" }}
          >
            <div className={`px-3 py-2 border-b border-white/[0.06] text-[10px] font-bold tracking-widest uppercase ${group.color}`}>
              {group.label}
            </div>
            <div className="max-h-52 overflow-y-auto no-scrollbar py-1">
              {group.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { onSelect(item); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                    text-slate-300 hover:bg-white/[0.06] hover:text-white
                    transition-colors duration-100 cursor-pointer"
                >
                  <Plus size={10} className={group.color} />
                  {item}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Main Dashboard ── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [requirements, setRequirements] = useState("");
  const [selectedType, setSelectedType] = useState(DIAGRAM_TYPES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputError,   setInputError]   = useState("");

  const groups      = FEATURE_GROUPS[selectedType.label];
  const guide       = QUICK_GUIDE[selectedType.label];
  const placeholder = PLACEHOLDERS[selectedType.label];
  const SelectedIcon = selectedType.icon;

  /* ── Append selected item to textarea ── */
  const appendToInput = (snippet) => {
    setRequirements(prev => {
      const base = prev.trim();
      return base ? base + ", " + snippet : snippet;
    });
  };

  /* ── Reset on type change ── */
  const handleSelectType = (type) => {
    setSelectedType(type);
    setRequirements("");
    setInputError("");
  };

  /* ── Validation ── */
  const validateInput = (text) => {
    const t = text.trim();
    if (!t) return "";
    const words = t.toLowerCase().split(/\s+/);
    if (words.some(w => w.length > 25)) return "Please enter valid words.";
    if (words.length < 3) return "Please enter at least 3 words.";
    if (t.length < 15)    return "Description is too short.";
    return "";
  };

  useEffect(() => {
    if (!requirements) { setInputError(""); return; }
    setInputError(validateInput(requirements));
  }, [requirements, selectedType]);

  /* ── Generate ── */
  const handleGenerate = async () => {
    const err = validateInput(requirements);
    if (err) { setInputError(err); return; }
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
        title:       selectedType.label + ": " + requirements.substring(0, 30) + "...",
        prompt:      requirements,
        diagramType: selectedType.label,
        diagramCode: data.diagram_code,
        createdAt:   serverTimestamp(),
      });
      setIsGenerating(false);
      setRequirements("");
      navigate(`/editor/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
      setIsGenerating(false);
    }
  };

  const isButtonDisabled = isGenerating || !!inputError || !requirements.trim();

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-7 rounded-full" style={{ background: "linear-gradient(180deg,#3b82f6,#6366f1)" }} />
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate and manage your UML diagrams</p>
        </div>
      </div>

      {/* ── Step 1: Diagram type cards ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-600 mb-2.5">
          Step 1 — Choose Diagram Type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DIAGRAM_TYPES.map((type) => {
            const Icon     = type.icon;
            const selected = selectedType.label === type.label;
            return (
              <button
                key={type.label}
                onClick={() => handleSelectType(type)}
                className={`ds-card cursor-pointer text-left p-4 transition-all duration-200
                  ${selected ? "ds-card-active border-blue-500/30 bg-[#1a1d28]" : "hover:bg-[#1a1d28]"}`}
                style={selected ? { boxShadow: `0 0 20px ${type.glow}` } : {}}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type.bg} border ${type.border}`}>
                    <Icon size={18} className={type.color} />
                  </div>
                  {selected && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
                      <Check size={11} className="text-blue-400" />
                    </span>
                  )}
                </div>
                <p className="text-white text-sm font-semibold">{type.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {type.label === "Use Case Diagram"  && "Actors, use cases & relationships"}
                  {type.label === "Class Diagram"     && "Classes, attributes & methods"}
                  {type.label === "Activity Diagram"  && "Flows, decisions & swimlanes"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 2: 2-column grid ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-600 mb-2.5">
          Step 2 — Describe Your System
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* LEFT — Dropdowns + Input + Generate ── */}
          <div className="ds-card ds-card-active p-5 flex flex-col gap-4">

            {/* Card header */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedType.bg} border ${selectedType.border}`}>
                <SelectedIcon size={18} className={selectedType.color} />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">{selectedType.label}</h2>
                <p className="text-slate-500 text-xs">Use dropdowns to build your prompt</p>
              </div>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* ── Feature dropdowns (animated on type change) ── */}
            <div>
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-600 mb-2.5 block">
                Add Features
              </label>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedType.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{    opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-wrap gap-2"
                >
                  {groups.map((group) => (
                    <FeatureDropdown
                      key={group.label}
                      group={group}
                      onSelect={appendToInput}
                      diagColor={selectedType.color}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
              <p className="text-[10px] text-slate-700 mt-2">
                Select from dropdowns → items appear in your prompt below
              </p>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* Textarea */}
            <div className="flex flex-col flex-1">
              <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-600 mb-2 block">
                Your Requirements
              </label>
              <div className="relative flex-1">
                <textarea
                  placeholder={placeholder}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className={`
                    w-full p-4 rounded-xl border text-white text-sm leading-relaxed
                    placeholder-slate-600 focus:outline-none resize-none
                    transition-all duration-200 no-scrollbar min-h-[180px]
                    ${inputError
                      ? "border-red-500/50 focus:ring-1 focus:ring-red-500/40"
                      : "border-white/[0.08] focus:ring-1 focus:ring-blue-400/30 hover:border-white/[0.14]"
                    }
                  `}
                  style={{ background: "#1a1d28" }}
                />
                <span className={`absolute bottom-3 right-3 text-[10px] font-mono
                  ${requirements.length > 0 ? "text-blue-400/60" : "text-slate-700"}`}>
                  {requirements.length} chars
                </span>
              </div>
              {inputError && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle size={13} /> {inputError}
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isButtonDisabled}
              className={`glow-btn w-full flex items-center justify-center gap-2.5
                py-3 px-5 rounded-xl text-white text-sm font-bold
                transition-all duration-200 cursor-pointer
                ${isButtonDisabled ? "opacity-40 cursor-not-allowed grayscale" : ""}`}
            >
              {isGenerating
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating…</>
                : <><Send size={15} /> Generate Diagram</>
              }
            </button>
          </div>

          {/* RIGHT — Quick Guide ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedType.label}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4"
            >
              {/* Guide card */}
              <div className={`ds-card p-5 flex flex-col gap-4 border ${guide.border}`}
                style={{ background: guide.bg }}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedType.bg} border ${selectedType.border}`}>
                    <BookOpen size={16} className={guide.color} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Quick Guide</h3>
                    <p className={`text-xs ${guide.color} font-medium`}>{selectedType.label}</p>
                  </div>
                </div>

                <p className="text-slate-400 text-xs leading-relaxed">{guide.description}</p>

                <div className="h-px bg-white/[0.05]" />

                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-600 mb-2.5">
                    How to write a good prompt
                  </p>
                  <div className="flex flex-col gap-2">
                    {guide.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                          text-[10px] font-bold ${selectedType.bg} ${guide.color} border ${selectedType.border}`}>
                          {i + 1}
                        </span>
                        <p className="text-slate-400 text-xs leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/[0.05]" />

                {/* Example — click to use */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={12} className={guide.color} />
                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-600">
                      Example Prompt
                    </p>
                  </div>
                  <div
                    onClick={() => setRequirements(guide.example)}
                    className="rounded-xl p-3 border text-xs text-slate-400 leading-relaxed
                      cursor-pointer hover:border-white/20 transition-all duration-200 group"
                    style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(255,255,255,0.07)" }}
                  >
                    <p className="italic">{guide.example}</p>
                    <div className={`flex items-center gap-1 mt-2 ${guide.color}
                      opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold`}>
                      <Target size={9} /> Click to use this example
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips card */}
              <div className="ds-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 size={13} className="text-blue-400" />
                  <span className="text-xs font-bold text-slate-400">Pro Tips</span>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    "Open each dropdown and select features to build your prompt automatically",
                    "Be specific — name your actors, classes, and actions clearly",
                    "You can edit the generated diagram in the draw.io editor after generation",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ChevronRight size={11} className="text-blue-400/60 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
