import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute"; // 👈 Ab ye bright ho jayega

import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import DiagramEditor from "./pages/DiagramEditor";
import HistoryView from "./pages/HistoryView";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* PUBLIC ROUTE - Sab ke liye khula hai */}
          <Route path="/" element={<AuthPage />} />

          {/* PROTECTED ROUTES (Sidebar + Layout) */}
          {/* Humne Layout ko ProtectedRoute ke andar wrap kar diya hai */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history/:id" element={<HistoryView />} />
          </Route>

          {/* INDEPENDENT PAGE - Ye bhi protected hona chahiye */}
          <Route
            path="/editor/:id"
            element={
              <ProtectedRoute>
                <DiagramEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white">
                <h1 className="text-6xl font-bold mb-2">404</h1>
                <p className="text-gray-400 mb-8 text-lg">Page not found</p>
                <a
                  href="/dashboard"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Back to Dashboard
                </a>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
