import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");
}
