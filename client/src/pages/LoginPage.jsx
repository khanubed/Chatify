import React, { useContext, useState } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast"; // Recommended over 'alert' for standard feedback

const LoginPage = () => {
  const [currentState, setCurrentState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false); // 🌟 TRACKING STATE ADDED

  const { login } = useContext(AuthContext);

  const submitHandler = (event) => {
    event.preventDefault();

    // Show bio field first if not already shown
    if (currentState === "Sign up" && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    // Validate fields before calling login
    if (
      (currentState === "Sign up" &&
        (!fullName || !email || !password || !bio)) ||
      (currentState === "Login" && (!email || !password))
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // 🌟 VALIDATION GUARD FOR TERMS & CONDITIONS
    if (currentState === "Sign up" && !agreeTerms) {
      toast.error("You must agree to the terms of use & privacy policy.");
      return;
    }

    login(currentState === "Sign up" ? "signup" : "login", {
      fullName,
      email,
      password,
      bio,
    });
  };

  // Helper helper to switch form modes cleanly
  const handleModeSwitch = (mode) => {
    setCurrentState(mode);
    setIsDataSubmitted(false);
    setAgreeTerms(false); // Reset terms agreement status on switch
  };

  return (
    <div className="flex min-h-screen bg-cover items-center justify-center backdrop-blur-2xl bg-center gap-8 max-sm:flex-col sm:justify-evenly ">
      {/* ------- Left ---------- */}
      <img src={assets.logo_big} alt="" className="w-[min(30vw,250px)]" />

      {/* ------- Right --------- */}
      <form
        onSubmit={submitHandler}
        className="border-2 bg-white/8 border-gray-500 p-6 flex flex-col gap-5 rounded-lg shadow-lg "
      >
        <h2 className="flex justify-between items-center font-medium text-2xl">
          {currentState}
          {isDataSubmitted && (
            <img
              onClick={() => setIsDataSubmitted(false)}
              src={assets.arrow_icon}
              alt=""
              className="w-5 cursor-pointer"
            />
          )}
        </h2>

        {!isDataSubmitted && (
          <>
            {currentState === "Sign up" && (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="p-2 rounded-md border border-gray-500 focus:outline-none"
                placeholder="Full Name"
                required
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="Email Address"
              required
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="Password"
              required
            />
          </>
        )}

        {currentState === "Sign up" && isDataSubmitted && (
          <textarea
            rows={4}
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
            placeholder="Provide a bio... "
            required
          />
        )}

        <button
          type="submit"
          className="py-3 bg-gradient-to-r from-blue-500 to-gray-700 text-white font-medium rounded-md cursor-pointer"
        >
          {currentState === "Sign up" ? "Create Account" : "Login Now"}
        </button>

        {/* 🌟 CONTROLLED CHECKBOX COMPONENT */}
        {currentState === "Sign up" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 select-none">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="terms" className="cursor-pointer">
              Agree to the terms of use & privacy policy
            </label>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {currentState === "Sign up" ? (
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <span
                onClick={() => handleModeSwitch("Login")}
                className="font-medium text-blue-400 cursor-pointer"
              >
                Login here
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Create an account,{" "}
              <span
                onClick={() => handleModeSwitch("Sign up")}
                className="font-medium text-blue-400 cursor-pointer"
              >
                Click here
              </span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
