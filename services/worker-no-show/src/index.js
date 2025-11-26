import amqp from "amqplib";
import mongoose from "mongoose";

// ====== Config ======
const rabbitUrl = process.env.RABBITMQ_URL || "amqp://localhost";
const mongoUrl = process.env.MONGO_URL || "mongodb://mongo:27017/coworkreserve";

// ====== Modelo local de Reservation (igual que en la API) ======
const ReservationSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  title: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" },
  createdAt: { type: Date, default: Date.now }
});

const Reservation = mongoose.model("Reservation", ReservationSchema);

// ====== Main ======
async function main() {
  await mongoose.connect(mongoUrl);
  console.log("[worker-no-show] conectado a Mongo");

  const conn = await amqp.connect(rabbitUrl);
  const ch = await conn.createChannel();

  await ch.assertQueue("reservation.no_show_release", { durable: true });

  console.log("[worker-no-show] esperando mensajes en reservation.no_show_release...");

  ch.consume("reservation.no_show_release", async (msg) => {
    if (!msg) return;
    const payload = JSON.parse(msg.content.toString());
    console.log("[worker-no-show] mensaje recibido", payload);

    const now = new Date(payload.now || new Date().toISOString());

    try {
      const result = await Reservation.updateMany(
        { endsAt: { $lt: now }, status: "CONFIRMED" },
        { status: "CANCELLED" }
      );
      console.log("[worker-no-show] reservas marcadas CANCELLED:", result.modifiedCount);
      ch.ack(msg);
    } catch (err) {
      console.error("[worker-no-show] error actualizando reservas", err);
      ch.nack(msg, false, false); 
    }
  });
}

main().catch((err) => {
  console.error("Fatal worker-no-show", err);
  process.exit(1);
});
