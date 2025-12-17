// components/Button.jsx
import { motion } from "framer-motion";

const Button = ({ children, onClick, className, fullWidth }) => {
  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-xl py-3 px-5 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      //   whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
};

export default Button;
