import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MessageSquare, X, Loader } from "lucide-react";

// 👇 Firebase & Firestore Imports
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

import Card from "./Card";
import Button from "./Button";

const Sidebar = ({ onSelect, onNewChat, isSidebarOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State for Real History
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayName = currentUser?.displayName || "SmartUML";

  // 👇 REAL TIME LISTENER
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistoryItems(chats);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching chats:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleNewChatClick = () => {
    navigate("/dashboard");
    if (onNewChat) onNewChat();
    // Mobile pe click hone ke baad sidebar band karein
    if (window.innerWidth < 768) toggleSidebar();
  };

  return (
    <>
      <div
        className={`
            flex flex-col w-64 md:w-80 bg-gray-900 text-white shadow-2xl h-full border-r border-gray-700/50 
            fixed md:relative top-0 left-0 z-40 transition-transform duration-300
            ${
              isSidebarOpen
                ? "translate-x-0"
                : "-translate-x-full md:translate-x-0"
            }
        `}
      >
        <button
          onClick={toggleSidebar}
          className="md:hidden absolute top-4 right-4 text-white hover:text-blue-400 z-50"
        >
          <X size={24} />
        </button>

        <div className="p-4 sm:p-6 flex items-center border-b border-gray-700/50">
          {/* <div className="p-4 mt-2 sm:px-6 sm:py-7.5 flex items-center border-b border-gray-700/50"> */}
          <img
            src="/assets/images/logo.png"
            alt="SmartUML Logo"
            className="w-8 h-8 rounded-full mr-2 drop-shadow-[0_0_5px_rgba(37,99,235,0.5)]"
          />
          <h1 className="text-xl font-extrabold text-white tracking-wider capitalize truncate">
            {displayName}
          </h1>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-3 min-h-0">
          <Button
            onClick={handleNewChatClick}
            fullWidth
            className="flex items-center justify-center"
          >
            <MessageSquare size={18} className="mr-2" />
            New Chat
          </Button>

          <h4 className="text-gray-400 text-sm font-semibold mt-2 uppercase">
            Chat History
          </h4>

          {/* 👇 REAL HISTORY LIST */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 no-scrollbar">
            {loading ? (
              <div className="flex justify-center mt-4 text-gray-500">
                <Loader className="animate-spin" size={20} />
              </div>
            ) : historyItems.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-4 italic">
                No history yet. Start a new chat!
              </p>
            ) : (
              historyItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-3 text-sm cursor-pointer hover:bg-gray-700 bg-gray-800 text-white truncate !backdrop-blur-none"
                  // 👇 FIX: Ab ye sahi route par navigate karega
                  onClick={() => {
                    navigate(`/history/${item.id}`); // Route change karein
                    if (onSelect) onSelect(item.id); // Parent ko bhi batayein (agar zaroorat ho)
                    if (window.innerWidth < 768) toggleSidebar(); // Mobile pe sidebar close karein
                  }}
                >
                  {item.title || "Untitled Diagram"}
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-lg text-red-400 hover:bg-gray-700 transition-all font-medium cursor-pointer"
          >
            <LogOut size={20} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        ></div>
      )}
    </>
  );
};

export default Sidebar;