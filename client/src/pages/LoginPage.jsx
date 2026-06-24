import React, { useContext, useState } from "react";
import assets from "../assets/assets";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [currentState, setCurrentState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [dob, setDob] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // 🌟 ADDED: Loading state to prevent multiple submissions
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);

  // 🌟 Make handler async so we can await the login function
  const submitHandler = async (event) => {
    event.preventDefault();

    // Prevent any action if already loading
    if (isLoading) return;

    // Show bio and dob fields first if not already shown
    if (currentState === "Sign up" && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    // Validate fields before calling login
    if (
      (currentState === "Sign up" &&
        (!fullName || !email || !password || !bio || !dob)) ||
      (currentState === "Login" && (!email || !password))
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (currentState === "Sign up" && !agreeTerms) {
      toast.error("You must agree to the terms of use & privacy policy.");
      return;
    }

    // 🌟 Lock the UI
    setIsLoading(true);

    try {
      // 🌟 Await the login context (assuming your context function is async)
      await login(currentState === "Sign up" ? "signup" : "login", {
        fullName,
        email,
        password,
        bio,
        dob,
      });
    } catch (error) {
      // If your context throws errors, they get caught here (though often handled inside context)
      console.error(error);
    } finally {
      // 🌟 Unlock the UI if the request finishes (or fails)
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (mode) => {
    setCurrentState(mode);
    setIsDataSubmitted(false);
    setAgreeTerms(false);
    setDob("");
    setIsLoading(false); // Reset loading just in case
  };

  return (
    <div className="flex min-h-screen bg-cover items-center justify-center backdrop-blur-2xl bg-center gap-8 max-sm:flex-col sm:justify-evenly ">
      {/* ------- Left ---------- */}
      <img src={assets.logo_big} alt="" className="w-[min(30vw,250px)]" />

      {/* ------- Right --------- */}
      <form
        onSubmit={submitHandler}
        // 🌟 Optional: slightly dim the form when loading
        className={`border-2 bg-white/8 border-gray-500 p-6 flex flex-col gap-5 rounded-lg shadow-lg transition-opacity duration-300 ${
          isLoading ? "opacity-70 pointer-events-none" : "opacity-100"
        }`}
      >
        <h2 className="flex justify-between items-center font-medium text-2xl">
          {currentState}
          {isDataSubmitted &&
            !isLoading && ( // Hide back arrow while loading
              <img
                onClick={() => setIsDataSubmitted(false)}
                src={assets.arrow_icon}
                alt="Back"
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
                disabled={isLoading}
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="Email Address"
              required
              disabled={isLoading}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700"
              placeholder="Password"
              required
              disabled={isLoading}
            />
          </>
        )}

        {/* 🌟 STEP 2: Bio and DOB */}
        {currentState === "Sign up" && isDataSubmitted && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-500">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 text-gray-500"
                required
                disabled={isLoading}
              />
            </div>

            <textarea
              rows={4}
              onChange={(e) => setBio(e.target.value)}
              value={bio}
              className="p-2 rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-700 text-gray-500"
              placeholder="Provide a bio... "
              required
              disabled={isLoading}
            />
          </>
        )}

        {/* 🌟 UPDATED BUTTON WITH LOADING STATE */}
        <button
          type="submit"
          disabled={isLoading}
          className={`py-3 flex items-center justify-center bg-gradient-to-r from-blue-500 to-gray-700 text-white font-medium rounded-md transition-all ${
            isLoading
              ? "opacity-75 cursor-wait"
              : "cursor-pointer hover:opacity-90"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Waking Server...
            </span>
          ) : currentState === "Sign up" && !isDataSubmitted ? (
            "Next"
          ) : currentState === "Sign up" ? (
            "Create Account"
          ) : (
            "Login Now"
          )}
        </button>

        {currentState === "Sign up" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 select-none">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="cursor-pointer"
              disabled={isLoading}
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
                onClick={() => !isLoading && handleModeSwitch("Login")}
                className={`font-medium text-blue-400 ${isLoading ? "cursor-default" : "cursor-pointer"}`}
              >
                Login here
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Create an account,{" "}
              <span
                onClick={() => !isLoading && handleModeSwitch("Sign up")}
                className={`font-medium text-blue-400 ${isLoading ? "cursor-default" : "cursor-pointer"}`}
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
