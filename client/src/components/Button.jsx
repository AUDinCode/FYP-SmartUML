import { motion } from "framer-motion";

const Button = ({ children, className, fullWidth, ...props }) => {
  return (
    <motion.button
      // 1. Default Tap Animation (Jo hamesha chalegi)
      whileTap={{ scale: 0.98 }}
      // 2. Styling
      className={`flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-xl py-3 px-5 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      // 3. Baaki Props (onClick, type, disabled etc. jo parent se aayenge)
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
