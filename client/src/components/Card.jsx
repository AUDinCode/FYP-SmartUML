import { motion } from "framer-motion";

const Card = ({ children, className, ...props }) => {
  // 👈 ...props add kiya
  return (
    <motion.div
      className={`bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 ${className}`}
      {...props} // 👈 Ab ye bahar se aayi hui animations (variants/hover) ko laga lega
    >
      {children}
    </motion.div>
  );
};

export default Card;
