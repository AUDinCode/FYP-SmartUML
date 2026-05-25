import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, UserRound, Mail, LockKeyhole, GitFork, BoxSelect, Activity, Sparkles, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../firebase";
import Input from "../../components/Input";
import Button from "../../components/Button";

const getPasswordStrength = (pwd) => {
  if (!pwd) return null;
  if (pwd.length < 6)                                                          return { label: "Weak",   color: "bg-red-500",    width: "w-1/3",  text: "text-red-400"   };
  if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))           return { label: "Medium", color: "bg-yellow-400", width: "w-2/3",  text: "text-yellow-300"};
  return                                                                              { label: "Strong", color: "bg-green-400",  width: "w-full", text: "text-green-400" };
};

/* ── Floating UML diagram cards shown on the left panel ── */
const SHOWCASE_CARDS = [
  {
    title: "User Authentication",
    type: "Use Case",
    icon: BoxSelect,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    nodes: ["User", "Login", "Register", "Reset Password"],
    top: "12%", left: "8%",
    delay: 0,
  },
  {
    title: "Order Management",
    type: "Class",
    icon: GitFork,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    nodes: ["Order", "Product", "Customer", "Payment"],
    top: "42%", left: "4%",
    delay: 0.15,
  },
  {
    title: "Checkout Flow",
    type: "Activity",
    icon: Activity,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    nodes: ["Start", "Add to Cart", "Pay", "Confirm"],
    top: "70%", left: "10%",
    delay: 0.3,
  },
];

const FEATURES = [
  { icon: Zap,      text: "AI-powered UML generation in seconds"   },
  { icon: GitFork,  text: "Class, Use Case & Activity diagrams"     },
  { icon: Shield,   text: "Secure cloud storage with Firebase"      },
  { icon: Sparkles, text: "Export & edit with draw.io integration"  },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const [isSignup,  setIsSignup]  = useState(false);
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [username,  setUsername]  = useState("");
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { alert("Please enter both Email and Password."); return; }
    if (isSignup && !username.trim()) { alert("Username is mandatory!"); return; }
    setLoading(true);
    try {
      if (isSignup) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        window.location.href = "/dashboard";
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      }
    } catch (error) {
      alert(error.message.replace("Firebase: ", ""));
    } finally { setLoading(false); }
  };

  const switchMode = () => {
    setIsSignup(!isSignup);
    setUsername(""); setPassword("");
  };

  const ps = getPasswordStrength(password);

  return (
    <div className="w-screen h-screen flex overflow-hidden" style={{ background: "#0d0f14" }}>

      {/* ══════════════════════════════════════════
          LEFT PANEL — Branding + Showcase
      ══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0f1219 0%, #111827 50%, #0d1117 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Ambient glow blobs */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full blur-[120px] opacity-10" style={{ background: "#3b82f6" }} />
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 rounded-full blur-[100px] opacity-8"  style={{ background: "#6366f1" }} />

        {/* Logo + name at top */}
        <div className="relative z-10 flex items-center gap-3 px-10 pt-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/40 blur-lg scale-125" />
            <img
              src="/assets/images/logo.png"
              alt="SmartUML"
              className="relative w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/50 drop-shadow-[0_0_14px_rgba(59,130,246,0.9)]"
            />
          </div>
          <div>
            <span className="text-white font-extrabold text-xl tracking-tight">SmartUML</span>
            <div className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase">AI Diagram Studio</div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              Generate UML<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg,#60a5fa,#818cf8,#a78bfa)" }}
              >
                Diagrams with AI
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-sm">
              Describe your system in plain English and get professional UML diagrams instantly.
            </p>

            {/* Feature list */}
            <div className="flex flex-col gap-3 mb-10">
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-blue-400" />
                  </div>
                  <span className="text-slate-400 text-sm">{text}</span>
                </motion.div>
              ))}
            </div>

            {/* Floating diagram preview cards */}
            <div className="relative h-52">
              {SHOWCASE_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: [0, -6, 0] }}
                    transition={{
                      opacity: { delay: card.delay + 0.5, duration: 0.4 },
                      y: { delay: card.delay + 0.5, duration: 3.5 + i, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className="absolute"
                    style={{ top: 0, left: `${i * 33}%` }}
                  >
                    <div
                      className={`rounded-xl border p-3.5 w-40 ${card.bg} ${card.border}`}
                      style={{ backdropFilter: "blur(12px)", background: "rgba(19,22,30,0.85)" }}
                    >
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${card.bg} border ${card.border}`}>
                          <Icon size={11} className={card.color} />
                        </div>
                        <span className={`text-[10px] font-bold ${card.color}`}>{card.type}</span>
                      </div>
                      <p className="text-white text-xs font-semibold mb-2 leading-tight">{card.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {card.nodes.map((n) => (
                          <span
                            key={n}
                            className="text-[9px] px-1.5 py-0.5 rounded-md text-slate-400"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-slate-700 text-xs">© 2024 SmartUML · FYP Project</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — Auth Form
      ══════════════════════════════════════════ */}
      <div
        className="w-full lg:w-[440px] xl:w-[480px] flex flex-col items-center justify-center px-8 sm:px-12 relative overflow-y-auto"
        style={{ background: "#13161e", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Mobile logo (only visible on small screens) */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/40 blur-lg scale-125" />
            <img src="/assets/images/logo.png" alt="SmartUML" className="relative w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/50" />
          </div>
          <span className="text-white font-extrabold text-lg">SmartUML</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignup ? "signup" : "login"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="mb-8"
            >
              <h2 className="text-2xl xl:text-3xl font-extrabold text-white mb-1">
                {isSignup ? "Create account" : "Welcome back"}
              </h2>
              <p className="text-slate-500 text-sm">
                {isSignup
                  ? "Sign up to start generating UML diagrams"
                  : "Sign in to your SmartUML workspace"}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Form */}
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <AnimatePresence>
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Input
                    icon={UserRound}
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              icon={Mail}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <Input
                icon={LockKeyhole}
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {isSignup && password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/10 rounded-full h-1">
                      <div className={`h-1 rounded-full transition-all duration-300 ${ps.color} ${ps.width}`} />
                    </div>
                    <span className={`text-[10px] font-semibold ${ps.text}`}>{ps.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              fullWidth
              className="mt-2 text-base cursor-pointer"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
            >
              {loading
                ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <>{isSignup ? "Create Account" : "Sign In"} <ArrowRight size={18} className="ml-1" /></>
              }
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <span className="text-slate-700 text-xs">or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Switch mode */}
          <p className="text-slate-500 text-sm text-center">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-blue-400 font-semibold hover:text-blue-300 transition-colors cursor-pointer"
            >
              {isSignup ? "Sign in" : "Sign up for free"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
