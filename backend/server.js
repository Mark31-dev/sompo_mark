import http from "node:http";

import "dotenv/config";
import cors from "cors";
import express from "express";

import activationRoutes from "./routes/activationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import musicRoutes from "./routes/music.js";
import roomRoutes from "./routes/roomRoutes.js";
import { attachRealtime, connectionCount } from "./lib/realtime.js";
import { connect, driverKind } from "./models/db.js";
import { seedCodes } from "./models/ActivationCode.js";
import { seedRooms } from "./seed.js";

const PORT = Number(process.env.PORT || 4000);

const app = express();

const allowedOrigins = [
  "https://sompoteam.free.nf",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    storage: driverKind(),
    sockets: connectionCount(),
    uptime: Math.round(process.uptime()),
  });
});

app.use("/api/activation", activationRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms", chatRoutes);
app.use("/api/music", musicRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found." }));

app.use((error, req, res, _next) => {
  console.error("[api]", error);
  res.status(500).json({ error: "Something broke on our side." });
});

const server = http.createServer(app);
attachRealtime(server);

async function start() {
  await connect();
  await seedCodes();
  await seedRooms();

  server.listen(PORT, () => {
    console.log(`SOMPO TEAM API on http://localhost:${PORT}  [storage: ${driverKind()}]`);
    console.log(`Realtime on ws://localhost:${PORT}/realtime`);
  });
}

start().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
