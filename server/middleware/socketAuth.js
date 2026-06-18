import jwt from "jsonwebtoken";
import User from "../models/user.js";

const socketAuth = async (socket, next) => {
  try {
    // Extract token from handshake auth or query context
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    const decoded = jwt.verify(token, process.env.JWT_KEY);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // 🌟 ATTACH USER TO THE SOCKET INSTANCE
    socket.user = user;
    next(); // Authenticated successfully! Move to connection handler.
  } catch (err) {
    console.error("Socket Auth Failure:", err.message);
    return next(new Error("Authentication error: Invalid Token"));
  }
}

export default socketAuth;