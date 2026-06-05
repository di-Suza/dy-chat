import mongoose from "mongoose";

import { env } from "./env.js";

// Opens the MongoDB connection used by Mongoose models.
export const connectDatabase = async () => {
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
};
