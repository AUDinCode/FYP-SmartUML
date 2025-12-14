import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
      <Routes>
        {/* PUBLIC ROUTE */}
        <Route path="/" element={<AuthPage />} />

        {/* PROTECTED ROUTES (Sidebar + Layout) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history/:id" element={<HistoryView />} />
        </Route>

        {/* INDEPENDENT PAGE (No Sidebar) */}
        <Route path="/editor/:id" element={<DiagramEditor />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
