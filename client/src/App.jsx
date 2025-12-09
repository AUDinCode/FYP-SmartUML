import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Components Import
import Layout from './components/Layout'

// Pages Import
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from './pages/Dashboard'
import DiagramEditor from './pages/DiagramEditor'
import HistoryView from './pages/HistoryView'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES (No Sidebar/Layout) */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* PROTECTED ROUTES (Sidebar + Layout ke andar aayenge) */}
        <Route element={<Layout />}>
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/editor/:id" element={<DiagramEditor />} />
          <Route path="/history/:id" element={<HistoryView />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
