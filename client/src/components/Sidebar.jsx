import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LogOut, MessageSquare, X, Loader,
  GitFork, BoxSelect, Activity, Plus, LayoutDashboard, History
} from "lucide-react";
import { signOut } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const getDiagramIcon = (title = "") => {
  const lower = title.toLowerCase();
  if (lower.includes("use case")) return { icon: BoxSelect,     color: "text-blue-400",   bg: "bg-blue-500/10",   chip: "chip-usecase"  };
  if (lower.includes("class"))    return { icon: GitFork,       color: "text-purple-400", bg: "bg-purple-500/10", chip: "chip-class"    };
  if (lower.includes("activity")) return { icon: Activity,      color: "text-green-400",  bg: "bg-green-500/10",  chip: "chip-activity" };
  return                                 { icon: MessageSquare, color: "text-slate-400",  bg: "bg-slate-500/10",  chip: ""              };
};

const Sidebar = ({ onSelect, onNewChat, isSidebarOpen, toggleSidebar }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { currentUser } = useAuth();

  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading]           = useState(true);

  const displayName = currentUser?.displayName || "SmartUML";
  const initials    = displayName.slice(0, 2).toUpperCase();
  const userEmail   = currentUser?.email || "";

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const q = query(
      collection(db, "chats"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setHistoryItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [currentUser]);

  const handleLogout = async () => {
    try { await signOut(auth); navigate("/"); }
    catch (e) { console.error(e); }
  };

  const handleNewChat = () => {
    navigate("/dashboard");
    if (onNewChat) onNewChat();
    if (window.innerWidth < 768) toggleSidebar();
  };

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  ];

  return (
    <>
      {/* ── Sidebar panel ── */}
      <aside
        style={{ width: "var(--ds-sidebar-w, 260px)" }}
        className={`
          flex flex-col h-screen bg-[#13161e] border-r border-white/[0.07]
          fixed top-0 left-0 z-40
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* ── Brand ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-md scale-110" />
            <img
              src="/assets/images/logo.png"
              alt="SmartUML"
              className="relative w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/40 drop-shadow-[0_0_10px_rgba(37,99,235,0.8)]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#13161e]" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-white font-bold text-sm tracking-wide">SmartUML</span>
            <span className="text-[10px] font-semibold text-blue-400 tracking-[0.18em] uppercase">Studio</span>
          </div>
          {/* Mobile close */}
          <button onClick={toggleSidebar} className="md:hidden ml-auto text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── New Generation button ── */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={handleNewChat}
            className="glow-btn w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white text-sm font-semibold cursor-pointer"
          >
            <Plus size={16} />
            New Generation
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="px-3 pt-1 pb-2">
          {navItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => { navigate(path); if (window.innerWidth < 768) toggleSidebar(); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5
                  transition-all duration-150 cursor-pointer text-left
                  ${active
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                  }
                `}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* ── Divider + History label ── */}
        <div className="px-5 pt-1 pb-2">
          <div className="flex items-center gap-2">
            <History size={11} className="text-slate-600" />
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-600">Recent History</span>
          </div>
        </div>

        {/* ── History list ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-6 text-slate-600">
              <Loader className="animate-spin" size={18} />
            </div>
          ) : historyItems.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-6 italic">
              No history yet
            </p>
          ) : (
            historyItems.map((item) => {
              const info     = getDiagramIcon(item.title);
              const Icon     = info.icon;
              const isActive = location.pathname === `/history/${item.id}` || location.pathname === `/editor/${item.id}`;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(`/history/${item.id}`);
                    if (onSelect) onSelect(item.id);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left
                    transition-all duration-150 cursor-pointer group
                    ${isActive
                      ? "bg-blue-500/15 text-white border-l-2 border-blue-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                    }
                  `}
                >
                  <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${info.bg}`}>
                    <Icon size={11} className={info.color} />
                  </span>
                  <span className="truncate">{item.title || "Untitled Diagram"}</span>
                </button>
              );
            })
          )}
        </div>

        {/* ── User footer ── */}
        <div className="border-t border-white/[0.07] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-xs font-semibold capitalize truncate">{displayName}</span>
              {userEmail && <span className="text-slate-600 text-[10px] truncate">{userEmail}</span>}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400/80 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 text-xs font-medium cursor-pointer group"
          >
            <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div onClick={toggleSidebar} className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" />
      )}
    </>
  );
};

export default Sidebar;
