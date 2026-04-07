import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, MessageSquare, X, Loader, GitFork, BoxSelect, Activity } from "lucide-react";

import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import Button from "./Button";

const getDiagramIcon = (title = "") => {
  const lower = title.toLowerCase();
  if (lower.includes("use case")) return <BoxSelect size={14} className="shrink-0 text-blue-400" />;
  if (lower.includes("class"))    return <GitFork   size={14} className="shrink-0 text-purple-400" />;
  if (lower.includes("activity")) return <Activity  size={14} className="shrink-0 text-green-400" />;
  return <MessageSquare size={14} className="shrink-0 text-gray-400" />;
};

const Sidebar = ({ onSelect, onNewChat, isSidebarOpen, toggleSidebar }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { currentUser } = useAuth();

  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading]           = useState(true);

  const displayName = currentUser?.displayName || "SmartUML";
  const userEmail   = currentUser?.email || "";

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    const q = query(
      collection(db, "chats"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try { await signOut(auth); navigate("/"); }
    catch (error) { console.error("Logout Error:", error); }
  };

  const handleNewChatClick = () => {
    navigate("/dashboard");
    if (onNewChat) onNewChat();
    if (window.innerWidth < 768) toggleSidebar();
  };

  return (
    <>
      <div
        className={`
          flex flex-col w-64 md:w-80 bg-gray-900 text-white shadow-2xl h-full
          border-r border-gray-700/50 fixed md:relative top-0 left-0 z-40
          transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Close button — mobile only */}
        <button
          onClick={toggleSidebar}
          className="md:hidden absolute top-4 right-4 text-white hover:text-blue-400 z-50"
        >
          <X size={24} />
        </button>

        {/* ── Branding Area ── */}
        <div className="relative px-4 sm:px-5 py-5 flex items-center gap-3">
          {/* Subtle blue ambient glow behind the whole branding row */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-transparent pointer-events-none rounded-t" />

          {/* App logo */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-md scale-110" />
            <img
              src="/assets/images/logo.png"
              alt="SmartUML Logo"
              className="relative w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/40 drop-shadow-[0_0_10px_rgba(37,99,235,0.8)]"
            />
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-gray-900 rounded-full" />
          </div>

          {/* Name + subtitle + email */}
          <div className="flex flex-col leading-tight min-w-0">
            <h1 className="text-sm font-extrabold text-white tracking-wide capitalize truncate">
              {displayName}
            </h1>
            <span className="text-[10px] text-blue-400 font-semibold tracking-[0.2em] uppercase">
              SmartUML Workspace
            </span>
            {userEmail && (
              <span className="text-[10px] text-gray-500 truncate mt-0.5">
                {userEmail}
              </span>
            )}
          </div>
        </div>

        {/* Faded divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-600/60 to-transparent mb-1" />

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
          <Button onClick={handleNewChatClick} fullWidth className="flex items-center justify-center">
            <MessageSquare size={18} className="mr-2" />
            New Chat
          </Button>

          <h4 className="text-gray-400 text-xs font-semibold mt-2 uppercase tracking-widest px-1">
            Chat History
          </h4>

          {/* History list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
            {loading ? (
              <div className="flex justify-center mt-4 text-gray-500">
                <Loader className="animate-spin" size={20} />
              </div>
            ) : historyItems.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-4 italic">
                No history yet. Start a new chat!
              </p>
            ) : (
              historyItems.map((item) => {
                const isActive =
                  location.pathname === `/history/${item.id}` ||
                  location.pathname === `/editor/${item.id}`;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(`/history/${item.id}`);
                      if (onSelect) onSelect(item.id);
                      if (window.innerWidth < 768) toggleSidebar();
                    }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left
                      transition-all duration-200 cursor-pointer
                      ${isActive
                        ? "bg-blue-600/20 border-l-2 border-blue-400 text-white pl-2.5"
                        : "text-gray-300 hover:bg-gray-700/60 hover:text-white border-l-2 border-transparent"
                      }
                    `}
                  >
                    {getDiagramIcon(item.title)}
                    <span className="truncate">{item.title || "Untitled Diagram"}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Logout ── */}
        <div className="p-4 border-t border-gray-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 font-medium cursor-pointer group"
          >
            <LogOut size={18} className="mr-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div onClick={toggleSidebar} className="fixed inset-0 bg-black/50 z-30 md:hidden" />
      )}
    </>
  );
};

export default Sidebar;