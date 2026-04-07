import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const Input = ({ placeholder, type = "text", className, icon: Icon, label, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  const hasValue = props.value && props.value.length > 0;
  const floatLabel = isFocused || hasValue;

  return (
    <div className="relative w-full">
      {/* Left Icon */}
      {Icon && (
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${floatLabel ? "text-blue-400" : "text-white/40"}`}>
          <Icon size={18} />
        </div>
      )}

      <motion.input
        type={inputType}
        placeholder={!label ? placeholder : ""}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full py-4 text-lg rounded-xl border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200
          ${Icon ? "pl-11" : "px-5"}
          ${isPassword ? "pr-12" : "pr-5"}
          ${className}`}
        whileFocus={{ scale: 1.02 }}
        {...props}
      />

      {/* Floating Label */}
      {label && (
        <motion.label
          animate={
            floatLabel
              ? { top: "-10px", fontSize: "11px", color: "rgba(147,197,253,1)" }
              : { top: "50%", fontSize: "16px", color: "rgba(255,255,255,0.5)" }
          }
          initial={false}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`absolute pointer-events-none font-medium -translate-y-1/2 bg-transparent px-1
            ${Icon ? "left-11" : "left-5"}`}
          style={{ top: "50%" }}
        >
          {label}
        </motion.label>
      )}

      {/* Show/Hide Password Toggle */}
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
  );
};

export default Input;