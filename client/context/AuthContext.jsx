import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendURL = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendURL;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  
  // 🌟 FIX: Initialize authUser instantly from localStorage to prevent lag/stalls
  const [authUser, setAuthUser] = useState(() => {
    const savedUser = localStorage.getItem("authUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // 🌟 MODIFIED: Only run this silently in the background if needed, or omit completely if middleware covers it
  const authCheck = async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const { data } = await axios.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        localStorage.setItem("authUser", JSON.stringify(data.user));
      }
    } catch (error) {
      // If token is invalid/expired, quietly clear it out without breaking the UI flow
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    }
  };

  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);
      if (data.success) {
        const userData = data.userData || data.user;
        
        // Set everything in memory and storage simultaneously
        setAuthUser(userData);
        localStorage.setItem("authUser", JSON.stringify(userData));
        
        axios.defaults.headers.common["token"] = data.token;
        setToken(data.token);
        localStorage.setItem("token", data.token);
        
        connectSocket(userData);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Authentication failed");
    }
  };

  const logout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authUser"); // 🌟 Clean up cache
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    axios.defaults.headers.common["token"] = null;
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    toast.success("Logged out successfully");
  };

  const editProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/edit-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        localStorage.setItem("authUser", JSON.stringify(data.user)); // Update cache
        toast.success("Profile edited successfully");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;

    const newSocket = io(backendURL, {
      query: { userId: userData._id },
      transports: ["websocket"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
    });

    newSocket.connect();
    setSocket(newSocket);

    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });
  };

  // 🌟 LIFECYCLE 1: Set Axios Headers and instantly trigger Socket if user cache exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["token"] = token;
      if (authUser) {
        connectSocket(authUser);
      }
    }
  }, [token]);

  // 🌟 LIFECYCLE 2: Join target personal channel once room binds
  useEffect(() => {
    if (!socket || !authUser?._id) return;
    socket.emit("joinPersonalRoom", authUser._id.toString());
  }, [socket, authUser?._id]);

  const value = {
    axios,
    authUser,
    onlineUsers,
    setAuthUser,
    socket,
    login,
    editProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};