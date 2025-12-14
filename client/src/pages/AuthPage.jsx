import React, { useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";

// ===== UML Nodes & Connections =====
const nodes = [
  { id: "actor1", type: "actor", top: "10%", left: "15%", label: "User" },
  { id: "actor2", type: "actor", top: "65%", left: "20%", label: "Admin" },
  { id: "usecase1", type: "usecase", top: "25%", left: "50%", label: "Login" },
  {
    id: "usecase2",
    type: "usecase",
    top: "50%",
    left: "70%",
    label: "Generate UML",
  },
  {
    id: "usecase3",
    type: "usecase",
    top: "40%",
    left: "30%",
    label: "Save Diagram",
  },
];

const connections = [
  { from: "actor1", to: "usecase1" },
  { from: "actor1", to: "usecase2" },
  { from: "actor2", to: "usecase2" },
  { from: "actor2", to: "usecase3" },
];

const AuthPage = () => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(isSignup ? "Signup submitted" : "Login submitted");
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const buttonHover = { scale: 1.05 };
  const buttonTap = { scale: 0.98 };

  return (
    <div
      className="w-screen h-screen relative bg-cover bg-center flex items-center justify-center overflow-y-auto sm:overflow-hidden"
      style={{ backgroundImage: "url('/assets/images/Auth.jpg')" }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* UML Connections - hide on small screens */}
      <svg className="absolute w-full h-full pointer-events-none hidden sm:block">
        {connections.map((conn, i) => {
          const fromNode = nodes.find((n) => n.id === conn.from);
          const toNode = nodes.find((n) => n.id === conn.to);
          if (!fromNode || !toNode) return null;
          return (
            <motion.line
              key={i}
              x1={fromNode.left}
              y1={fromNode.top}
              x2={toNode.left}
              y2={toNode.top}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeDasharray="4,4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 3 + Math.random(),
                repeat: Infinity,
                repeatType: "mirror",
              }}
            />
          );
        })}
      </svg>

      {/* UML Nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className={`absolute flex items-center justify-center font-bold shadow-md backdrop-blur-sm ${
            node.type === "actor"
              ? "w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 text-white"
              : "w-24 h-14 sm:w-28 sm:h-16 rounded-full bg-white/20 text-white"
          }`}
          style={{
            top: node.top,
            left: node.left,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
          animate={{ y: ["0%", "-5%", "0%"], rotate: [0, 3, -3, 0] }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            repeatType: "mirror",
          }}
          whileHover={{ scale: 1.05 }}
          onHoverStart={() => setHoveredNode(node.id)}
          onHoverEnd={() => setHoveredNode(null)}
        >
          {node.type === "actor" ? <User size={16} sm={20} /> : node.label}
        </motion.div>
      ))}

      {/* Glass Card */}
      <motion.div
        className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 md:p-12 relative z-10 mx-4"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{
          boxShadow: `0 5px 25px rgba(255, 255, 255, 0.25), 0 0 15px rgba(37, 99, 235, 0.2)`,
          scale: 1.02,
        }}
      >
        {/* Logo & Heading */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="mb-4 w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] flex items-center justify-center">
            <img
              src="/assets/images/logo.png"
              className="drop-shadow-[0_0_5px_rgba(37,99,235,0.5)] rounded-full w-full h-full object-contain"
              alt="App Logo"
            />
          </div>
          <h4 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight capitalize">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h4>
          <p className="text-xs sm:text-sm md:text-base text-white/80 mt-1 sm:mt-2 text-center">
            {isSignup
              ? "Sign up to start using your workspace"
              : "Log in to continue your workspace"}
          </p>
        </div>

        {/* Auth Form */}
        <form className="flex flex-col gap-4 sm:gap-6" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="flex flex-col">
              <label className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                Username
              </label>
              <motion.input
                type="text"
                placeholder="Your username"
                className="py-3 px-4 sm:py-4 sm:px-5 text-sm sm:text-lg rounded-xl border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
                whileFocus={{ scale: 1.02 }}
              />
            </div>
          )}
          <div className="flex flex-col">
            <label className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
              Email
            </label>
            <motion.input
              type="email"
              placeholder="name@example.com"
              className="py-3 px-4 sm:py-4 sm:px-5 text-sm sm:text-lg rounded-xl border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              whileFocus={{ scale: 1.02 }}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
              Password
            </label>
            <motion.input
              type="password"
              placeholder="Enter your password"
              className="py-3 px-4 sm:py-4 sm:px-5 text-sm sm:text-lg rounded-xl border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              whileFocus={{ scale: 1.02 }}
            />
          </div>
          <motion.button
            type="submit"
            className="mt-4 sm:mt-6 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base sm:text-lg shadow-xl w-full"
            whileHover={buttonHover}
            whileTap={buttonTap}
          >
            {isSignup ? "Register" : "Log in"}
          </motion.button>
        </form>

        {/* Toggle Login/Signup */}
        <p className="text-white text-center mt-4 sm:mt-6 text-xs sm:text-sm">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="font-semibold hover:underline"
          >
            {isSignup ? "Sign in" : "Signup"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
