import User from "../models/user.js";
import jwt from "jsonwebtoken";

// Middleware to secure routes

export const secureRoute = async (req, res, next) => {
  try {
    const token =
      req.headers.token || req.headers["authorization"].split(" ")[1];
    // console.log(token)
    const decode = jwt.verify(token, process.env.JWT_KEY);
    const user = await User.findById(decode.userId).select("-password");

    // console.log(user)
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    req.user = user;
    // console.log(req.user)
    next();
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
