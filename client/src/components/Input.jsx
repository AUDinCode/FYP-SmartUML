// components/Input.jsx
import { motion } from "framer-motion";

const Input = ({ placeholder, type = "text", className, ...props }) => {
  return (
    <motion.input
      type={type}
      placeholder={placeholder}
      className={`py-4 px-5 text-lg rounded-xl border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
      whileFocus={{ scale: 1.02 }}
      {...props}
    />
  );
};

export default Input;
