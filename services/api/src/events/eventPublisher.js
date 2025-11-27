import amqp from "amqplib";
import { createSpan } from "../middleware/apmMiddleware.js";

let channel;

export async function initRabbit(url) {
  const span = createSpan("rabbitmq.connect", "messaging.rabbitmq.connect");
  
  try {
    const conn = await amqp.connect(url);
    channel = await conn.createChannel();
    await channel.assertExchange("reservations", "topic", { durable: true });
    console.log("[api] RabbitMQ conectado");
    
    if (span) span.setOutcome("success");
  } catch (error) {
    if (span) span.setOutcome("failure");
    throw error;
  } finally {
    if (span) span.end();
  }
}

export async function publishEvent(routingKey, payload) {
  const span = createSpan(`rabbitmq.publish.${routingKey}`, "messaging.rabbitmq.send");
  
  try {
    if (!channel) {
      console.warn("[api] publishEvent sin canal");
      if (span) span.setOutcome("failure");
      return;
    }
    
    const body = Buffer.from(JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString()
    }));
    
    channel.publish("reservations", routingKey, body, {
      contentType: "application/json"
    });
    
    if (span) {
      span.addLabels({
        "messaging.destination": "reservations",
        "messaging.routing_key": routingKey,
      });
      span.setOutcome("success");
    }
  } catch (error) {
    if (span) span.setOutcome("failure");
    throw error;
  } finally {
    if (span) span.end();
  }
}
