// components/Card.jsx
import { motion } from "framer-motion";

const Card = ({ children, className }) => {
  return (
    <motion.div
      className={`bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 ${className}`}
      //   whileHover={{
      //     // scale: 1.02,
      //     boxShadow: `0 5px 25px rgba(255, 255, 255, 0.25), 0 0 15px rgba(37, 99, 235, 0.2)`,
      //   }}
      //   transition={{ type: "spring", stiffness: 120, damping: 18 }}
    >
      {children}
    </motion.div>
  );
};

export default Card;
