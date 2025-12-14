import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const Dropdown = ({ label, icon, options = [], className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (action) => {
    action();
    setIsOpen(false); // Close dropdown after selecting an option
  };

  return (
    <div className="relative inline-block text-left">
      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
                    inline-flex items-center justify-center 
                    px-4 py-2 rounded-xl font-semibold transition-all duration-200 
                    bg-gradient-to-r from-indigo-500 to-blue-500 text-white 
                    hover:bg-indigo-600 focus:outline-none 
                    ${className}
                `}
        aria-expanded={isOpen}
      >
        {icon && React.cloneElement(icon, { size: 18, className: "mr-2" })}
        {label}
        <ChevronDown
          size={18}
          className={`ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Dropdown Menu (Conditional Rendering) */}
      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {options.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSelect(item.action)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                role="menuitem"
              >
                {item.icon &&
                  React.createElement(item.icon, {
                    size: 16,
                    className: "mr-3",
                  })}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
