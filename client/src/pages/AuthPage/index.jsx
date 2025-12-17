import React, { useState } from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  cardVariants,
  buttonHover,
  buttonTap,
  umlNodeAnimation,
  nodes, // Data imported hi rakhein taake file clean rahe
  connections,
} from "./authVariants";

const AuthPage = () => {
  const navigate = useNavigate(); // 👈 Hook banaya
  const [isSignup, setIsSignup] = useState(false);

  // Form States (Logic)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignup) {
      console.log("Signup:", { username, email, password });
    } else {
      console.log("Login:", { email, password });
      navigate("/dashboard"); // 👈 Dashboard par bhej diya
    }
  };

  return (
    <div
      // Wahi styling jo aapne bheji (overflow-y-auto sm:overflow-hidden)
      className="w-screen h-screen relative bg-cover bg-center flex items-center justify-center overflow-y-auto sm:overflow-hidden"
      style={{ backgroundImage: "url('/assets/images/Auth.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40"></div>

      {/* UML Connections (Sirf XL screens par) */}
      <svg className="absolute w-full h-full pointer-events-none hidden xl:block">
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
          className={
            node.type === "actor" ? "uml-node-actor" : "uml-node-usecase"
          }
          style={{ top: node.top, left: node.left }}
          animate={umlNodeAnimation.animate}
          transition={umlNodeAnimation.transition}
          whileHover={{ scale: 1.05 }}
          // Crash fix karne ke liye onHoverStart hata diya
        >
          {node.type === "actor" ? <User size={16} /> : node.label}
        </motion.div>
      ))}

      {/* Glass Card - Aapki Original Styling Wapis 👇 */}
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

        <form className="flex flex-col gap-4 sm:gap-6" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="flex flex-col">
              <label className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                Username
              </label>
              <motion.input
                type="text"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="py-3 px-4 sm:py-4 sm:px-5 text-sm sm:text-lg rounded-xl border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
              whileFocus={{ scale: 1.02 }}
            />
          </div>
          <motion.button
            type="submit"
            className="mt-4 sm:mt-6 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base sm:text-lg shadow-xl w-full cursor-pointer"
            whileHover={buttonHover}
            whileTap={buttonTap}
          >
            {isSignup ? "Register" : "Log in"}
          </motion.button>
        </form>

        <p className="text-white text-center mt-4 sm:mt-6 text-xs sm:text-sm">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="font-semibold hover:underline cursor-pointer"
          >
            {isSignup ? "Sign in" : "Signup"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
