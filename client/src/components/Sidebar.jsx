import React from 'react'
import { Link } from 'react-router-dom'

const Sidebar = () => {
  return (
    <div className="w-80 h-screen bg-gray-900 text-white p-5 flex flex-col flex-shrink-0">
      
      {/* Logo Area */}
      <h1 className="text-2xl font-bold mb-10 text-blue-400">FYP Diagram Gen</h1>
      
      {/* Navigation Links */}
      <nav className="flex flex-col gap-3 flex-1">
        
        {/* Dashboard Link (New Project) */}
        <Link 
          to="/dashboard" 
          className="p-3 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors font-medium"
        >
          <span className='mr-2'>🏠</span> Dashboard
        </Link>

        {/* Example: History Link */}
        <Link 
          to="/history/example" 
          className="p-3 hover:bg-gray-700 rounded-md transition-colors"
        >
          <span className='mr-2'>📜</span> History (Ex.)
        </Link>
        
      </nav>
      
      {/* Logout Link */}
      <div className='mt-auto pt-4 border-t border-gray-700'>
        <Link to="/" className="p-3 bg-red-600 hover:bg-red-700 rounded-md text-center font-medium block transition-colors">
          <span className='mr-2'>➡️</span> Logout
        </Link>
      </div>
      
    </div>
  )
}

export default Sidebar