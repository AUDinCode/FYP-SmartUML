import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const Layout = () => {
  return (
    // Flexbox: Sidebar Left pe, Content Right pe
    <div className="flex h-screen bg-gray-50">
      
      {/* 1. Left Side: Sidebar */}
      <Sidebar />

      {/* 2. Right Side: Content Area (Dashboard/History yahan aayenge) */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Outlet yahan Dashboard ya History Page ko load karega */}
        <Outlet /> 
      </main>

    </div>
  )
}

export default Layout