import { useState } from "react";
import { motion } from "framer-motion";
import { User, ArrowRight, UserRound, Mail, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Firebase Imports
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../firebase";

// Component Imports
import Input from "../../components/Input";
import Button from "../../components/Button";
import Card from "../../components/Card";

import {
  cardVariants,
  buttonHover,
  buttonTap,
  umlNodeAnimation,
  nodes,
  connections,
} from "./authVariants";

// Password Strength Helper
const getPasswordStrength = (pwd) => {
  if (!pwd) return null;
  if (pwd.length < 6)
    return { label: "Weak", color: "bg-red-500", width: "w-1/3" };
  if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))
    return { label: "Medium", color: "bg-yellow-400", width: "w-2/3" };
  return { label: "Strong", color: "bg-green-400", width: "w-full" };
};

const AuthPage = () => {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter both Email and Password.");
      return;
    }

    if (isSignup && !username.trim()) {
      alert("Username is mandatory! Please enter your name.");
      return;
    }

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        await updateProfile(user, {
          displayName: username,
        });

        alert(`Welcome, ${username}! Account created.`);
        window.location.href = "/dashboard";
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error.message.replace("Firebase: ", "");
      alert(errorMessage);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div
      className="w-screen h-screen relative bg-cover bg-center flex items-center justify-center overflow-y-auto sm:overflow-hidden"
      style={{ backgroundImage: "url('/assets/images/Auth.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Animation Background */}
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
        >
          {node.type === "actor" ? <User size={16} /> : node.label}
        </motion.div>
      ))}

      {/* Auth Card */}
      <Card
        className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 md:p-12 relative z-10 mx-4"
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

        <form className="flex flex-col gap-6 sm:gap-8" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="relative">
              <Input
                icon={UserRound}
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="relative">
            <Input
              icon={Mail}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Input
              icon={LockKeyhole}
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* Password Strength Indicator — only shows during signup */}
            {isSignup && password && (
              <div className="mt-2">
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}
                  />
                </div>
                <p
                  className={`text-xs mt-1 font-medium ${
                    passwordStrength.label === "Weak"
                      ? "text-red-400"
                      : passwordStrength.label === "Medium"
                      ? "text-yellow-300"
                      : "text-green-400"
                  }`}
                >
                  {passwordStrength.label} password
                </p>
              </div>
            )}
          </div>

          <Button
            fullWidth={true}
            className="text-base sm:text-lg cursor-pointer"
            whileHover={buttonHover}
            whileTap={buttonTap}
          >
            {isSignup ? "Register" : "Log in"}
            <ArrowRight size={20} className="ml-2 inline-block" />
          </Button>
        </form>

        <p className="text-white text-center mt-4 sm:mt-6 text-xs sm:text-sm">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setUsername("");
              setPassword("");
            }}
            className="font-semibold text-blue-300 hover:text-white relative after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full cursor-pointer"
          >
            {isSignup ? "Sign in" : "Signup"}
          </button>
        </p>
      </Card>
    </div>
  );
};

export default AuthPage;