import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  capacity: { type: Number, min: 1, required: true },
  location: String,
  createdAt: { type: Date, default: Date.now }
});

const ReservationSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  title: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" },
  createdAt: { type: Date, default: Date.now }
});

export const Room = mongoose.model("Room", RoomSchema);
export const Reservation = mongoose.model("Reservation", ReservationSchema);
