import amqp from "amqplib";
import nodemailer from "nodemailer";

const rabbitUrl = process.env.RABBITMQ_URL || "amqp://localhost";
const smtpHost = process.env.SMTP_HOST || "localhost";
const smtpPort = Number(process.env.SMTP_PORT || 1025);

async function main() {
  const conn = await amqp.connect(rabbitUrl);
  const ch = await conn.createChannel();

  await ch.assertExchange("reservations", "topic", { durable: true });
  const q = await ch.assertQueue("email.worker", { durable: true });
  await ch.bindQueue(q.queue, "reservations", "reservation.*");

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false
  });

  console.log("[worker-email] esperando mensajes...");

  ch.consume(q.queue, async (msg) => {
    if (!msg) return;
    const routingKey = msg.fields.routingKey;
    const payload = JSON.parse(msg.content.toString());
    console.log("[worker-email] mensaje", routingKey, payload);

    const to = payload.requesterEmail || "test@example.com";
    const subject = routingKey === "reservation.created"
      ? "Reserva creada"
      : "Reserva actualizada";
    const text = JSON.stringify(payload, null, 2);

    try {
      await transporter.sendMail({
        from: "no-reply@coworkreserve.local",
        to,
        subject,
        text
      });
      ch.ack(msg);
    } catch (err) {
      console.error("[worker-email] error enviando mail", err);
      ch.nack(msg, false, false);
    }
  });
}

main().catch((err) => {
  console.error("Fatal worker-email", err);
  process.exit(1);
});
