import mongoose from "mongoose";
import { dbOperationDuration } from "../metrics.js";

export async function connectMongo(url) {
  const end = dbOperationDuration.startTimer({ operation: "connect", collection: "n/a" });
  
  try {
    await mongoose.connect(url);
    console.log("[api] Mongo conectado");
  } finally {
    end();
  }
}
