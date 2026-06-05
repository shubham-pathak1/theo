import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import "../src/config/env.js";
import { connectDb } from "../src/config/db.js";
import { User } from "../src/models/User.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
const displayName = process.env.ADMIN_NAME?.trim() || "Theo Admin";

if (!email) {
  console.error("ADMIN_EMAIL is required");
  process.exit(1);
}

await connectDb();

const existing = await User.findOne({ email });
if (existing) {
  existing.role = "admin";
  existing.emailVerified = true;
  if (password) {
    existing.passwordHash = await bcrypt.hash(password, 12);
  }
  await existing.save();
  console.log(`Admin updated: ${email}`);
} else {
  if (!password) {
    console.error("ADMIN_PASSWORD is required when creating a new admin");
    await mongoose.disconnect();
    process.exit(1);
  }

  await User.create({
    email,
    displayName,
    role: "admin",
    plan: "max",
    emailVerified: true,
    passwordHash: await bcrypt.hash(password, 12)
  });
  console.log(`Admin created: ${email}`);
}

await mongoose.disconnect();
