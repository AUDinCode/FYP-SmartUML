import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  Loader, ArrowLeft, Calendar, MessageSquare,
  Code2, Copy, Check, GitFork, BoxSelect, Activity
} from "lucide-react";

// Diagram type icon mapper
const getDiagramIcon = (title = "") => {
  const lower = title.toLowerCase();
  if (lower.includes("use case")) return { icon: BoxSelect, color: "text-blue-400",   bg: "bg-blue-400/10"   };
  if (lower.includes("class"))    return { icon: GitFork,   color: "text-purple-400", bg: "bg-purple-400/10" };
  if (lower.includes("activity")) return { icon: Activity,  color: "text-green-400",  bg: "bg-green-400/10"  };
  return { icon: MessageSquare, color: "text-gray-400", bg: "bg-gray-400/10" };
};

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return "Date unknown";
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat("en-US", {
    month:  "long",
    day:    "numeric",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const HistoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [chatData, setChatData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    const fetchChat = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id) return;
        const docRef  = doc(db, "chats", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setChatData(docSnap.data());
        } else {
          setError("Chat not found!");
        }
      } catch (err) {
        console.error("Error fetching chat:", err);
        setError("Error loading chat history.");
      } finally {
        setLoading(false);
      }
    };
    fetchChat();
  }, [id]);

  const handleCopy = () => {
    const code = chatData?.diagramCode || chatData?.response || "";
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <Loader className="animate-spin mr-2" /> Loading chat...
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400">
        <p className="text-xl mb-4">{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-gray-800 px-4 py-2 rounded text-white hover:bg-gray-700 border border-gray-600"
        >
          Go Back to Dashboard
        </button>
      </div>
    );
  }

  const diagramInfo = getDiagramIcon(chatData?.title || "");
  const DiagramIcon = diagramInfo.icon;
  const codeContent = chatData?.diagramCode || chatData?.response || "No code generated.";
  const codeLines   = codeContent.split("\n");

  return (
    <div className="h-full flex flex-col text-white p-4 sm:p-6 overflow-y-auto no-scrollbar">

      {/* ── Page Header ── */}
      <div className="mb-4 sm:mb-6 pb-4 border-b border-gray-700/60 flex items-center gap-3">

        {/* Mobile back button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="md:hidden p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition mr-1"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Blue accent bar */}
        <div className="w-1 h-7 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500 hidden md:block" />

        {/* Diagram type icon badge + title + timestamp — all in one clean column */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon badge */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${diagramInfo.bg}`}>
            <DiagramIcon size={18} className={diagramInfo.color} />
          </div>

          {/* Title + timestamp stacked */}
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight break-words">
              {chatData?.title || "Untitled Chat"}
            </h1>
            {/* Timestamp pill */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-1.5 bg-gray-700/50 border border-gray-600/50 rounded-full px-3 py-0.5">
                <Calendar size={11} className="text-blue-400 shrink-0" />
                <span className="text-[11px] text-gray-400 font-medium">
                  {formatDate(chatData?.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Card ── */}
      <div className="
        flex flex-col gap-5 rounded-2xl border border-white/10
        bg-gradient-to-b from-gray-800/80 to-gray-900/80
        shadow-[0_0_30px_rgba(37,99,235,0.07)]
        p-4 sm:p-6 relative overflow-hidden
      ">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* ── Prompt Section ── */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <MessageSquare size={14} className="text-blue-400" />
            </div>
            <span className="text-blue-400 font-semibold text-xs tracking-widest uppercase">
              Your Prompt
            </span>
          </div>

          <div className="
            bg-gray-900/50 px-4 py-3 rounded-xl
            border border-white/5 border-l-4 border-l-blue-500
            text-gray-200 text-sm leading-relaxed
          ">
            {chatData?.prompt || "No prompt available"}
          </div>
        </div>

        <div className="border-t border-gray-700/50" />

        {/* ── Code Block Section ── */}
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                <Code2 size={14} className="text-green-400" />
              </div>
              <span className="text-green-400 font-semibold text-xs tracking-widest uppercase">
                Diagram Code
              </span>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                border transition-all duration-200 cursor-pointer
                ${copied
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : "bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white hover:border-gray-500"
                }
              `}
            >
              {copied
                ? <><Check size={13} /> Copied!</>
                : <><Copy size={13} /> Copy Code</>
              }
            </button>
          </div>

          {/* Code block */}
          <div className="rounded-xl border border-gray-700/60 overflow-hidden shadow-inner">

            {/* VS Code–style top bar — no line count */}
            <div className="flex items-center justify-between bg-gray-900/80 px-4 py-2 border-b border-gray-700/60">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/70"    />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70"  />
              </div>
              <span className="text-[11px] text-gray-500 font-mono">diagram.xml</span>
              {/* Line count removed */}
              <div className="w-12" />
            </div>

            {/* Scrollable code area with line numbers */}
            <div className="overflow-x-auto bg-gray-950/80 no-scrollbar">
              <div className="flex min-w-max">

                {/* Line numbers */}
                <div className="select-none px-3 py-4 text-right border-r border-gray-700/50 bg-gray-900/40">
                  {codeLines.map((_, i) => (
                    <div key={i} className="text-xs font-mono text-gray-600 leading-6">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Code */}
                <pre className="px-4 py-4 font-mono text-sm text-green-300 leading-6 whitespace-pre">
                  {codeContent}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;