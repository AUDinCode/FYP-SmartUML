import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  Loader, ArrowLeft, Calendar, MessageSquare,
  Code2, Copy, Check, GitFork, BoxSelect, Activity, ExternalLink, Eye
} from "lucide-react";
import DiagramViewer from "../components/DiagramViewer";

const getDiagramIcon = (title = "") => {
  const lower = title.toLowerCase();
  if (lower.includes("use case")) return { icon: BoxSelect, color: "text-blue-400",   bg: "bg-blue-500/12",   border: "border-blue-500/25"   };
  if (lower.includes("class"))    return { icon: GitFork,   color: "text-purple-400", bg: "bg-purple-500/12", border: "border-purple-500/25" };
  if (lower.includes("activity")) return { icon: Activity,  color: "text-green-400",  bg: "bg-green-500/12",  border: "border-green-500/25"  };
  return { icon: MessageSquare,   color: "text-slate-400", bg: "bg-slate-500/10",  border: "border-slate-500/20" };
};

const formatDate = (ts) => {
  if (!ts?.toDate) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(ts.toDate());
};

const HistoryView = () => {
  const { id }  = useParams();
  const navigate = useNavigate();

  const [chatData, setChatData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [copied,   setCopied]   = useState(false);
  const [tab,      setTab]      = useState("diagram"); // "diagram" | "code"

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true); setError(null);
      try {
        if (!id) return;
        const snap = await getDoc(doc(db, "chats", id));
        if (snap.exists()) setChatData(snap.data());
        else setError("Chat not found!");
      } catch (e) {
        console.error(e);
        setError("Error loading chat history.");
      } finally { setLoading(false); }
    };
    fetch_();
  }, [id]);

  const handleCopy = () => {
    const code = chatData?.diagramCode || chatData?.response || "";
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
      <Loader className="animate-spin" size={20} />
      <span className="text-sm">Loading…</span>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-red-400">
      <p className="text-base font-semibold">{error}</p>
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition-all"
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </button>
    </div>
  );

  const info      = getDiagramIcon(chatData?.title || "");
  const Icon      = info.icon;
  const code      = chatData?.diagramCode || chatData?.response || "No code generated.";
  const codeLines = code.split("\n");

  return (
    <div className="flex flex-col gap-5 max-w-[1200px] mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="md:hidden p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="w-1 h-7 rounded-full hidden md:block" style={{ background: "linear-gradient(180deg,#3b82f6,#6366f1)" }} />

        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${info.bg} border ${info.border} shrink-0`}>
          <Icon size={18} className={info.color} />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg font-bold text-white truncate">{chatData?.title || "Untitled"}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Calendar size={10} className="text-slate-600" />
            <span className="text-[11px] text-slate-600">{formatDate(chatData?.createdAt)}</span>
          </div>
        </div>

        <button
          onClick={() => navigate(`/editor/${id}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white glow-btn cursor-pointer"
        >
          <ExternalLink size={14} /> Open in Editor
        </button>
      </div>

      {/* ── Row 1: Prompt card (full width) ── */}
      <div className="ds-card ds-card-active p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
            <MessageSquare size={14} className="text-blue-400" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase text-blue-400/80">Your Prompt</span>
          {/* Diagram type badge */}
          <div className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${info.bg} ${info.border}`}>
            <Icon size={11} className={info.color} />
            <span className={`text-[11px] font-semibold ${info.color}`}>{chatData?.diagramType || "Diagram"}</span>
          </div>
        </div>

        <div
          className="rounded-xl border-l-2 border-l-blue-500 border border-white/[0.06] px-4 py-3 text-sm text-slate-300 leading-relaxed"
          style={{ background: "#0d0f14" }}
        >
          {chatData?.prompt || "No prompt available"}
        </div>
      </div>

      {/* ── Row 2: Diagram preview + Code side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT — Diagram Visual ── */}
        <div className="ds-card flex flex-col overflow-hidden" style={{ minHeight: "420px" }}>
          {/* Card header */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0"
            style={{ background: "#1a1d28" }}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${info.bg} border ${info.border}`}>
                <Eye size={13} className={info.color} />
              </div>
              <span className={`text-xs font-bold tracking-widest uppercase ${info.color}/80`}>
                Diagram Preview
              </span>
            </div>
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
          </div>

          {/* DiagramViewer fills the rest */}
          <div className="flex-1 min-h-0">
            <DiagramViewer xmlData={code} />
          </div>
        </div>

        {/* RIGHT — XML Code ── */}
        <div className="ds-card flex flex-col overflow-hidden" style={{ minHeight: "420px" }}>
          {/* Card header */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0"
            style={{ background: "#1a1d28" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Code2 size={13} className="text-green-400" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-green-400/80">
                Diagram Code
              </span>
            </div>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer
                ${copied
                  ? "bg-green-500/15 border-green-500/30 text-green-400"
                  : "border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.14]"
                }`}
            >
              {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>

          {/* Fake terminal titlebar */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] shrink-0"
            style={{ background: "#0d0f14" }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500/50" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
              <span className="w-2 h-2 rounded-full bg-green-500/50" />
            </div>
            <span className="text-[10px] text-slate-600 font-mono">diagram.xml</span>
            <span className="text-[10px] text-slate-700 font-mono">{codeLines.length} lines</span>
          </div>

          {/* Scrollable code */}
          <div className="flex-1 min-h-0 overflow-auto no-scrollbar" style={{ background: "#0a0c11" }}>
            <div className="flex min-w-max">
              {/* Line numbers */}
              <div
                className="select-none px-3 py-4 text-right border-r border-white/[0.04] shrink-0"
                style={{ background: "#0d0f14" }}
              >
                {codeLines.map((_, i) => (
                  <div key={i} className="text-[11px] font-mono text-slate-700 leading-6">{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <pre className="px-4 py-4 font-mono text-xs text-green-300/90 leading-6 whitespace-pre">
                {code}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HistoryView;
