import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    title: { type: String, required: true },
    requesterEmail: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: {
        type: String,
        enum: ["CONFIRMED", "CANCELLED"],
        default: "CONFIRMED"
    },
    createdAt: { type: Date, default: Date.now }
});

export const Reservation = mongoose.model("Reservation", ReservationSchema);
