import cron from "node-cron";
import amqp from "amqplib";
import axios from "axios";

const rabbitUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq";
const apiBase = process.env.API_BASE || "http://api:3000/v1";

let channel;

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

async function enqueueNoShowRelease() {
  try {
    const now = new Date().toISOString();
    send("reservation.no_show_release", { now });
  } catch (err) {
    console.error("[scheduler] error en enqueueNoShowRelease", err.message);
  }
}

async function main() {
  // pequeño retry para cuando Rabbit aún no está listo
  let connected = false;
  while (!connected) {
    try {
      await initRabbit();
      connected = true;
    } catch (err) {
      console.error("[scheduler] error conectando a RabbitMQ, reintento en 3s:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log("[scheduler] iniciado");

  // cada 2 minutos: revisar no-shows
  cron.schedule("*/2 * * * *", enqueueNoShowRelease);
}

main().catch((err) => {
  console.error("Fatal scheduler", err);
  process.exit(1);
});
