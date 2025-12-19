import { motion } from "framer-motion";

const Button = ({ children, className, fullWidth, ...props }) => { // 👈 ...props add kiya
  return (
    <motion.button
      className={`flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-xl py-3 px-5 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props} // 👈 Ab ye buttonHover aur buttonTap ko accept karega
    >
      {children}
    </motion.button>
  );
};

export default Button;