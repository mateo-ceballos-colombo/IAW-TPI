import mongoose from "mongoose";

export async function connectMongo(url) {
  await mongoose.connect(url);
  console.log("[api] Mongo conectado");
}
