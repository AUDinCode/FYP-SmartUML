import { BrowserRouter, Routes, Route } from "react-router-dom";

// 👇 1. Context Import (Ye zaroori hai)
import { AuthProvider } from "./context/AuthContext";

// Components Import
import Layout from "./components/Layout";

// Pages Import
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import DiagramEditor from "./pages/DiagramEditor";
import HistoryView from "./pages/HistoryView";

const App = () => {
  return (
    <BrowserRouter>
      {/* 👇 2. AuthProvider Yahan Hona Chahiye */}
      <AuthProvider>
        <Routes>
          {/* PUBLIC ROUTE */}
          <Route path="/" element={<AuthPage />} />

          {/* PROTECTED ROUTES (Sidebar + Layout) */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history/:id" element={<HistoryView />} />
          </Route>

          {/* INDEPENDENT PAGE */}
          <Route path="/editor/:id" element={<DiagramEditor />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
