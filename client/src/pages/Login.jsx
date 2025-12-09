import React from 'react'
import { Link } from "react-router-dom";

const Login = () => {
    
  // State Management ke liye function tayyar hai
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login Form Submitted (Ready for state)');
    // TODO: Member 1 yahan data utha kar API call karenge
  };

  return (
    <div className="wrapper h-screen w-full font-sans bg-gray-50">
      <div className="flex h-full">
        {/* ================= LEFT SIDE: LOGIN FORM ================= */}
        <div
          className="w-full md:w-[448px] bg-white h-screen flex flex-col gap-5 px-8 md:px-12 py-10 overflow-y-auto shadow-xl z-10"
          style={{ scrollbarWidth: "none" }}
        >
          {/* --- Logo & Heading --- */}
          <div className="flex flex-col items-center">
            <img
              src="/assets/images/logo.svg"
              className="mb-7"
              width="92"
              alt="App Logo"
            />
            <h4 className="text-[25px] capitalize font-semibold text-gray-800">
              Login
            </h4>
          </div>

          {/* --- Form Inputs --- */}
          {/* Social login aur divider hata diye gaye hain */}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5 items-start">
              <label
                htmlFor="email"
                className="text-gray-600 text-sm font-medium ml-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email" 
                className="py-3 px-4 bg-[#F7F7F8] w-full rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 border border-transparent focus:border-blue-500 transition-all placeholder-gray-400"
                type="email"
                placeholder="name@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5 items-start">
              <label
                htmlFor="password"
                className="capitalize text-gray-600 text-sm font-medium ml-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password" 
                className="py-3 px-4 bg-[#F7F7F8] w-full rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 border border-transparent focus:border-blue-500 transition-all placeholder-gray-400"
                type="password"
                placeholder="Enter your password"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center text-sm mt-1 text-gray-500">
              <label className="flex items-center gap-2 cursor-pointer hover:text-gray-700 select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  className="w-4 h-4 accent-blue-600"
                />
                Remember me
              </label>

              <Link
                to="#"
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Reset password?
              </Link>
            </div>

            {/* Submit Button (Form ke andar) */}
            <button
              type="submit"
              className="bg-[#605BFF] hover:bg-[#4f4add] active:scale-[0.98] w-full py-3.5 px-5 text-white rounded-xl transition-all font-semibold text-lg shadow-lg shadow-blue-500/30 mt-4"
            >
              Login
            </button>
          </form>

          {/* --- Footer Link --- */}
          <div className="text-center text-sm text-gray-500 mt-2">
            Don't have an account yet?{" "}
            <Link
              to="/signup"
              className="text-blue-600 font-bold hover:underline ml-1"
            >
              Create New Account
            </Link>
          </div>
        </div>

        {/* ================= RIGHT SIDE: ILLUSTRATION ================= */}
        <div className="hidden md:flex bg-[#FAFAFA] flex-1 items-center justify-center h-full relative">
          <img
            src="/assets/images/signup-img.svg"
            className="max-w-[85%] max-h-[85%] object-contain drop-shadow-sm"
            alt="Login Illustration"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;