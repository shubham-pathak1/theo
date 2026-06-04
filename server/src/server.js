import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { connectRedis } from "./config/redis.js";
import { initSocket } from "./services/socket.service.js";
import { startImageWorker } from "./workers/image.worker.js";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true
  }
});

initSocket(io);
await connectDb();
await connectRedis();

if (env.START_WORKER) {
  await startImageWorker();
}

server.listen(env.PORT, () => {
  console.log(`Theo API running on http://localhost:${env.PORT}`);
});
