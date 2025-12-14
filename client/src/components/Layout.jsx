// components/Layout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from 'lucide-react'; // Hamburger icon ke liye
import Sidebar from "./Sidebar";

const Layout = () => {
  // 1. Sidebar ki state manage karna (Mobile par band ya khula)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 2. Sidebar ko toggle karne ka function
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Dummy functions for history management (Sidebar ko pass karne ke liye)
  const handleSelectHistory = (id) => {
      console.log(`History item selected: ${id}`);
      // Yahan history view ko load karne ka logic aayega
  };
  
  const handleNewChat = () => {
      console.log("New Chat started (State reset)");
      // Yahan dashboard ko default 'New Generation' state par laane ka logic aayega
  };


  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
        
      {/* --- 1. Sidebar --- */}
      {/* Sidebar ko props pass kiye gaye hain */}
      <Sidebar 
          isSidebarOpen={isSidebarOpen} 
          toggleSidebar={toggleSidebar} 
          onSelect={handleSelectHistory} // History item select hone par
          onNewChat={handleNewChat}     // New Chat button click hone par
          // Note: historyItems prop ko Sidebar component khud dummy data se handle kar raha hai, ya aap yahan pass kar sakte hain.
      />

      {/* --- 2. Main Content Area --- */}
      <div className="flex-1 flex flex-col overflow-y-auto">
          
          {/* Mobile Hamburger Menu aur Header */}
          <header className="p-4 bg-gray-900/90 shadow-md border-b border-gray-700/50 md:hidden sticky top-0 z-20">
              <button onClick={toggleSidebar} className="text-white">
                  <Menu size={24} />
              </button>
          </header>

          {/* Main Content (Dashboard/HistoryView yahan render hoga) */}
          <main className="flex-1 p-4 sm:p-6 md:p-8">
            <Outlet />
          </main>
          
      </div>

    </div>
  );
};

export default Layout;