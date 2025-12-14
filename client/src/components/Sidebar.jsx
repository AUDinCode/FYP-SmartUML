import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Globe, MessageSquare, X } from "lucide-react";

// Import Custom Components
import Card from "./Card";
import Button from "./Button";

// Dummy History Items (Taake list nazar aaye)
const dummyHistoryItems = [
  { id: 1, title: "Class Diagram: User Authentication System" },
  { id: 2, title: "Use Case: Payment Gateway Integration" },
  { id: 3, title: "Activity Diagram: New Registration Flow" },
];

const Sidebar = ({
  historyItems = dummyHistoryItems,
  onSelect,
  onNewChat,
  isSidebarOpen,
  toggleSidebar,
}) => {
  const navigate = useNavigate();

  // --- LOGOUT FUNCTION (Frontend Simulation Removed) ---
  const handleLogout = () => {
    // Yahan pehle Backend API call hoti hai (Jab API ready ho)

    // 1. Frontend Token Removal (Real logic)
    localStorage.removeItem("token"); // JWT/Session token ko hatao
    localStorage.removeItem("user"); // User details ko hatao (agar save kiye hon)

    // 2. Redirect to Auth Page
    navigate("/");
  };
  // --------------------------------------------------------

  // New Chat Click (Blue color theme ke liye)
  const handleNewChatClick = () => {
    navigate("/dashboard");
    if (onNewChat) {
      onNewChat();
    }
    toggleSidebar();
  };

  return (
    <>
      {/* 1. Sidebar Content (Responsive) */}
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
        {/* Close Button (Mobile) */}
        <button
          onClick={toggleSidebar}
          className="md:hidden absolute top-4 right-4 text-white hover:text-blue-400 z-50"
        >
          <X size={24} />
        </button>

        {/* Logo/Branding Section */}
        <div className="p-4 mt-3 sm:p-6 flex items-center border-b border-gray-700/50">
          <img
            src="/assets/images/logo.png"
            alt="SmartUML Logo"
            className="w-8 h-8 rounded-full mr-2 drop-shadow-[0_0_5px_rgba(37,99,235,0.5)]"
          />
          <h1 className="text-xl font-extrabold text-white tracking-wider">
            SmartUML
          </h1>
        </div>

        {/* --- MAIN INTERACTION AREA --- */}
        <div className="flex-1 flex flex-col p-4 gap-3">
          {/* 1. New Chat Button (DEFAULT BLUE/INDIGO GRADIENT) */}
          <Button
            onClick={handleNewChatClick}
            fullWidth
            className="flex items-center justify-center"
          >
            <MessageSquare size={18} className="mr-2" />
            New Chat
          </Button>

          {/* 2. Chat History Section */}
          <h4 className="text-gray-400 text-sm font-semibold mt-2 uppercase">
            Chat History
          </h4>

          {/* History Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {historyItems.map((item) => (
              <Card
                key={item.id}
                className="p-3 text-sm cursor-pointer hover:bg-gray-700 bg-gray-800 text-white truncate !backdrop-blur-none"
                onClick={() => {
                  onSelect(item.id);
                  toggleSidebar();
                }}
              >
                {item.title}
              </Card>
            ))}
          </div>
        </div>

        {/* Footer/Logout Section (RED THEME) */}
        <div className="p-4 border-t border-gray-700/50">
          <button
            onClick={handleLogout} // Frontend Logout Logic
            className="flex items-center w-full p-3 rounded-lg text-red-400 hover:bg-gray-700 transition-all font-medium"
          >
            <LogOut size={20} className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* 2. Mobile Overlay */}
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
