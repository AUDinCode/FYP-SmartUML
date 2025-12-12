import React from 'react'
import { Link } from "react-router-dom";
// import { Workflow } from 'lucide-react'; // Ya 'Network', 'Share2' bhi try kar sakte ho

const Login = () => {
    
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login Form Submitted (Ready for state)');
  };

  return (
    // Wrapper: Default bg-white for clean look
    <div className="wrapper h-screen w-full font-sans bg-white overflow-hidden">
      <div className="flex h-full">
        
        {/* ================= LEFT SIDE: LOGIN FORM ================= */}
        <div
          // Added: Subtle shadow on the right side to separate from image
          className="w-full md:w-[480px] bg-white h-screen flex flex-col gap-6 px-8 md:px-12 py-10 overflow-y-auto shadow-[10px_0_30px_rgba(0,0,0,0.05)] z-20 relative"
          // style={{ scrollbarWidth: "none" }}
        >
          {/* --- Logo & Heading --- */}
          <div className="flex flex-col items-center mt-4">
            <img
              src="/assets/images/logo.png"
              className="mb-6 drop-shadow-l ring-4 ring-blue-600/50 ring-offset-2 drop-shadow-[0_0_10px_rgba(37,99,235,0.6),0_0_35px_rgba(79,70,229,0.5)] rounded-full  scale-110" // Added drop shadow to logo
              width="100" 
              alt="App Logo"
            />
            {/* Typography Update: Bolder font, Slate-900 color, tighter tracking */}
            <h4 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
              Welcome Back
            </h4>
            <p className="text-slate-500 text-sm mt-2 font-medium">Please enter your details to login.</p>
          </div>

          {/* --- Form Inputs --- */}
          <form className="flex flex-col gap-5 mt-4" onSubmit={handleSubmit}>
            
            {/* Email Input */}
            <div className="flex flex-col gap-1.5 items-start">
              <label
                htmlFor="email"
                className="text-slate-700 text-sm font-bold ml-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email" 
                // PREMIUM INPUT STYLE:
                // 1. bg-slate-50 (Cleaner than gray)
                // 2. border-slate-200 (Subtle border)
                // 3. Focus: Blue Ring (Glow effect)
                className="py-3.5 px-4 bg-slate-50 w-full rounded-xl outline-none border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-900 placeholder-slate-400 hover:bg-slate-100"
                type="email"
                placeholder="name@example.com"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5 items-start">
              <label
                htmlFor="password"
                className="capitalize text-slate-700 text-sm font-bold ml-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password" 
                className="py-3.5 px-4 bg-slate-50 w-full rounded-xl outline-none border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-900 placeholder-slate-400 hover:bg-slate-100"
                type="password"
                placeholder="Enter your password"
              />
            </div>

           

            {/* Submit Button (HERO ELEMENT) */}
            {/* Changed from Solid Purple to Gradient Blue-Indigo for depth */}
            <button
              type="submit"
              className="mt-2 w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
            >
              Login
            </button>
          </form>

          {/* --- Footer Link --- */}
          <div className="text-center text-sm text-slate-500 mt-6 mb-4">
            Don't have an account yet?{" "}
            <Link
              to="/signup"
              className="text-blue-600 font-bold hover:text-blue-700 hover:underline ml-1"
            >
              Create New Account
            </Link>
          </div>
        </div>

        {/* ================= RIGHT SIDE: ILLUSTRATION (High Contrast) ================= */}
        {/* Changed background to Slate-900 (Dark) to make the white form pop */}
        <div className="bg-[#FAFAFA] w-[80%] flex h-full">
          
       

          <img
            src="/public/assets/images/chai.jpg"
            className="object-cover"
            alt="Login Illustration"
          />
        </div>

      </div>
    </div>
  );
};

export default Login;