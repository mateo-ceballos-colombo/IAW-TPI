import amqp from "amqplib";
import { mqPublishTotal } from "../metrics.js";

let channel;

export async function initRabbit(url) {
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  await channel.assertExchange("reservations", "topic", { durable: true });
  console.log("[api] RabbitMQ conectado");
}

export async function publishEvent(routingKey, payload) {
  if (!channel) {
    console.warn("[api] publishEvent sin canal");
    return;
  }
  const body = Buffer.from(JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString()
  }));
  channel.publish("reservations", routingKey, body, {
    contentType: "application/json"
  });
  
  // Incrementar métrica
  mqPublishTotal.inc({ routing_key: routingKey });
}
