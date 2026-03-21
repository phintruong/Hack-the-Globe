import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
const __dirname = resolve(fileURLToPath(import.meta.url), "..");
dotenv.config({ path: resolve(__dirname, "../../.env") });
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerTrainingHandlers } from "./handlers/training.handler.js";
import { registerLiveHandlers } from "./handlers/live.handler.js";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000" },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  registerTrainingHandlers(io, socket);
  registerLiveHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
