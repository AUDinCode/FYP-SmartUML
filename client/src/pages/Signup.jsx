import React from "react";
import { Link } from "react-router-dom";

const Signup = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Signup Form Submitted");
  };

  return (
    // Wrapper: Default bg-white for clean look
    <div className="wrapper h-screen w-full font-sans bg-white overflow-hidden">
      <div className="flex h-full">
        {/* ================= LEFT SIDE: SIGNUP FORM ================= */}
        <div
          // Matching Login Container styles exactly
          // Width: 480px, Padding: py-10, Shadow: Right side
          className="w-full md:w-[480px] bg-white h-screen flex flex-col gap-6 px-8 md:px-12 py-10 shadow-[10px_0_30px_rgba(0,0,0,0.05)] z-20 relative"
          // style={{ scrollbarWidth: "none" }}
        >
          {/* --- Logo & Heading --- */}
          <div className="flex flex-col items-center mt-2">
            <img
              src="/assets/images/logo.png"
              className="mb-6 drop-shadow-l ring-4 ring-blue-600/50 ring-offset-2 drop-shadow-[0_0_10px_rgba(37,99,235,0.6),0_0_35px_rgba(79,70,229,0.5)] rounded-full  scale-110"
              width="100"
              alt="App Logo"
            />
            {/* Typography matches Login: Extrabold, Slate-900, Tight Tracking */}
            <h4 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
              Create Account
            </h4>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              Join us to visualize your ideas.
            </p>
          </div>

          {/* --- Form Inputs --- */}
          <form className="flex flex-col gap-5 mt-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            {/* <div className="flex flex-col gap-1.5 items-start">
              <label
                htmlFor="fullName"
                className="text-slate-700 text-sm font-bold ml-1"
              >
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                // PREMIUM INPUT STYLE (Same as Login)
                className="py-3.5 px-4 bg-slate-50 w-full rounded-xl outline-none border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-900 placeholder-slate-400 hover:bg-slate-100"
                type="text"
                placeholder="Ausaf"
              />
            </div> */}

            {/* Email Address */}
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
                className="py-3.5 px-4 bg-slate-50 w-full rounded-xl outline-none border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-900 placeholder-slate-400 hover:bg-slate-100"
                type="email"
                placeholder="name@example.com"
              />
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5 items-start">
              <label
                htmlFor="username"
                className="text-slate-700 text-sm font-bold ml-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                className="py-3.5 px-4 bg-slate-50 w-full rounded-xl outline-none border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-900 placeholder-slate-400 hover:bg-slate-100"
                type="text"
                placeholder="ausaf1234"
              />
            </div>

            {/* Password */}
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
                placeholder="••••••••"
              />
            </div>

            {/* --- Create Account Button --- */}
            {/* Same Gradient Blue-Indigo Style */}
            <button
              type="submit"
              className="mt-4 w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
            >
              Create Account
            </button>
          </form>

          {/* --- Footer Link to Login --- */}
          <div className="text-center text-sm text-slate-500 mt-8 mb-4">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-blue-600 font-bold hover:text-blue-700 hover:underline ml-1"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* ================= RIGHT SIDE: ILLUSTRATION (Dark Theme Match) ================= */}
        {/* Same Slate-900 Background to make form pop */}
        <div className="bg-[#FAFAFA] w-[80%] flex items-center justify-center h-full">
          <img
            src="/assets/images/login-img.svg"
            className="max-w-[650px]"
            alt="Login Illustration"
          />
        </div>
      </div>
    </div>
  );
};

export default Signup;
