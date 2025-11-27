import cron from "node-cron";
import amqp from "amqplib";
import mongoose from "mongoose";
import { Reservation } from "./models.js";

const rabbitUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq";
const mongoUri = process.env.MONGO_URL || "mongodb://mongo:27017/coworkreserve";

let channel;

async function initMongo() {
  console.log("[scheduler] intentando conectar a Mongo en:", mongoUri);
  await mongoose.connect(mongoUri);
  console.log("[scheduler] conectado a MongoDB");
}


// ---------- Rabbit ----------
async function initRabbit() {
  const conn = await amqp.connect(rabbitUrl);
  channel = await conn.createChannel();
  await channel.assertQueue("email.reminder", { durable: true });
  await channel.assertQueue("reservation.no_show_release", { durable: true });
  console.log("[scheduler] conectado a RabbitMQ");
}

function send(queue, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  channel.sendToQueue(queue, body, {
    contentType: "application/json"
  });
  console.log("[scheduler] mensaje enviado a", queue, "payload:", payload);
}

// ---------- Jobs ----------
async function enqueueNoShowRelease() {
  try {
    const now = new Date().toISOString();
    send("reservation.no_show_release", { now });
  } catch (err) {
    console.error("[scheduler] error en enqueueNoShowRelease", err.message);
  }
}

const REMINDER_OFFSET_MINUTES = 60;
const WINDOW_MINUTES = 1;

async function enqueueReminders() {
  try {
    const now = new Date(); // hora del contenedor

    const windowStart = new Date(
      now.getTime() + REMINDER_OFFSET_MINUTES * 60 * 1000
    );
    const windowEnd = new Date(
      windowStart.getTime() + WINDOW_MINUTES * 60 * 1000
    );

    console.log(
      "[scheduler] ahora:", now.toISOString(),
      "windowStart:", windowStart.toISOString(),
      "windowEnd:", windowEnd.toISOString()
    );


    const toRemind = await Reservation.find({
      status: "CONFIRMED",
      startsAt: { $gte: windowStart, $lt: windowEnd }
    }).lean().exec();

    console.log("[scheduler] reservas para recordar:", toRemind.length);

    toRemind.forEach(r => {
      channel.sendToQueue(
        "email.reminder",
        Buffer.from(JSON.stringify({
          reservationId: r._id.toString(),
          requesterEmail: r.requesterEmail,
          startsAt: r.startsAt,
          title: r.title
        })),
        { contentType: "application/json" }
      );
      console.log("[scheduler] mensaje enviado a email.reminder payload:", {
        reservationId: r._id.toString(),
        requesterEmail: r.requesterEmail,
        startsAt: r.startsAt,
        title: r.title
      });
    });
  } catch (err) {
    console.error("[scheduler] error en enqueueReminders", err.message);
  }
}

// ---------- main ----------
async function main() {
  let mongoConnected = false;
  while (!mongoConnected) {
    try {
      await initMongo();
      mongoConnected = true;
    } catch (err) {
      console.error("[scheduler] error conectando a MongoDB, reintento en 3s:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  let rabbitConnected = false;
  while (!rabbitConnected) {
    try {
      await initRabbit();
      rabbitConnected = true;
    } catch (err) {
      console.error("[scheduler] error conectando a RabbitMQ, reintento en 3s:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log("[scheduler] iniciado");

  // cada 2 minutos: revisar no-shows
  cron.schedule("*/2 * * * *", enqueueNoShowRelease);

  // cada 1 minuto: mandar recordatorios 1h antes
  cron.schedule("* * * * *", enqueueReminders);
}

main().catch((err) => {
  console.error("Fatal scheduler", err);
  process.exit(1);
});
