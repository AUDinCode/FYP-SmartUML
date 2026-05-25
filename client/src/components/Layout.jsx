import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);

  // Derive page title from route
  const pageTitle = location.pathname.startsWith("/history")
    ? "History"
    : "Dashboard";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--ds-bg, #0d0f14)", color: "var(--ds-text, #e2e8f0)" }}>
      {/* ── Sidebar ── */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        onNewChat={() => {}}
        onSelect={() => {}}
      />

      {/* ── Main area (offset by sidebar width) ── */}
      <div
        className="flex flex-col flex-1 min-h-screen"
        style={{ marginLeft: "var(--ds-sidebar-w, 260px)" }}
      >
        {/* Mobile topbar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-20"
          style={{ background: "var(--ds-surface, #13161e)", borderColor: "var(--ds-border, rgba(255,255,255,0.07))" }}
        >
          <button onClick={toggleSidebar} className="text-slate-400 hover:text-white transition-colors">
            <Menu size={22} />
          </button>
          <span className="text-white font-semibold text-sm">{pageTitle}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
