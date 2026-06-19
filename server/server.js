import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import { initSocketServer } from "./sockets/index.js";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "4mb" }));

// HTTP Routing Layers
app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRouter);
app.get("/", (req, res) => res.send("Backend server is running...."));

// 🌟 Initialize Modular Socket Infrastructure Layer
initSocketServer(server);

await connectDB();
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT,"0.0.0.0", () => console.log("Server is Running on port :" + PORT));
}

export default server;