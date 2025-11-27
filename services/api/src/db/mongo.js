import mongoose from "mongoose";
import { createSpan } from "../middleware/apmMiddleware.js";

export async function connectMongo(url) {
  const span = createSpan("mongodb.connect", "db.mongodb.connect");
  
  try {
    await mongoose.connect(url);
    console.log("[api] Mongo conectado");
    
    if (span) span.setOutcome("success");
  } catch (error) {
    if (span) span.setOutcome("failure");
    throw error;
  } finally {
    if (span) span.end();
  }
}
