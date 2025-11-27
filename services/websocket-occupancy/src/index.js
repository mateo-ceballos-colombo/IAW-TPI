import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import amqp from "amqplib";

const realm = process.env.KEYCLOAK_REALM || "coworkreserve";
const keycloakUrl = process.env.KEYCLOAK_URL || "http://keycloak:8080";
const rabbitUrl = process.env.RABBITMQ_URL || "amqp://rabbitmq";

// Base de la API 
const apiBase = process.env.API_BASE || "http://api:3000/v1";

const client = jwksClient({
  jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error("[WS] error obteniendo JWKS:", err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" }
});

const roomOccupancy = new Map();

const subscribedRooms = new Set();

export function broadcastOccupancy(roomId, occupied) {
  const payload = { roomId, occupied };
  console.log("[WS] broadcastOccupancy:", payload);
  io.to(roomId).emit("occupancyUpdate", payload);
}

async function fetchRoomOccupancy(roomId) {
  const url = `${apiBase}/rooms/${roomId}/occupancy`;
  try {
    const res = await fetch(url); 
    if (!res.ok) {
      console.error("[WS] error HTTP ocupación:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return !!data.occupied;
  } catch (err) {
    console.error("[WS] error consultando ocupación API:", err);
    return null;
  }
}

async function pollOccupancy() {
  if (!subscribedRooms.size) return;

  console.log("[WS] pollOccupancy: chequeando", subscribedRooms.size, "rooms");

  for (const roomId of subscribedRooms) {
    const occupied = await fetchRoomOccupancy(roomId);
    if (occupied === null) continue;

    const prev = roomOccupancy.get(roomId);
    if (prev !== occupied) {
      roomOccupancy.set(roomId, occupied);
      broadcastOccupancy(roomId, occupied);
    }
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.error("[WS] no token");
    return next(new Error("Unauthorized"));
  }

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ["RS256"]
    },
    (err, decoded) => {
      if (err) {
        console.error("[WS] token inválido:", err.message);
        return next(new Error("Unauthorized"));
      }

      const roles = decoded.realm_access?.roles || [];
      if (!roles.includes("admin")) {
        console.error("[WS] rol insuficiente");
        return next(new Error("Forbidden"));
      }

      socket.user = decoded;
      next();
    }
  );
});

io.on("connection", (socket) => {
  console.log("[WS] cliente conectado:", socket.user.preferred_username);

  socket.on("subscribeRoom", async (roomId) => {
    console.log("[WS] suscripción room:", roomId);
    socket.join(roomId);
    subscribedRooms.add(roomId);

    const occupied = await fetchRoomOccupancy(roomId);
    if (occupied === null) {
      const fallback = roomOccupancy.get(roomId) ?? false;
      socket.emit("occupancyUpdate", { roomId, occupied: fallback });
    } else {
      roomOccupancy.set(roomId, occupied);
      socket.emit("occupancyUpdate", { roomId, occupied });
    }
  });

  socket.on("testBroadcastOccupancy", ({ roomId, occupied }) => {
    console.log("[WS] testBroadcastOccupancy:", roomId, occupied);
    broadcastOccupancy(roomId, !!occupied);
  });

  socket.on("disconnect", () => {
  });
});

// RabbitMQ: consumir eventos
async function initRabbitAndConsume() {
  console.log("[WS] conectando a RabbitMQ en", rabbitUrl);
  const conn = await amqp.connect(rabbitUrl);
  const ch = await conn.createChannel();

  await ch.assertExchange("reservations", "topic", { durable: true });

  const q = await ch.assertQueue("ws.occupancy.worker", { durable: true });

  await ch.bindQueue(q.queue, "reservations", "reservation.created");
  await ch.bindQueue(q.queue, "reservations", "reservation.cancelled");

  console.log("[WS] esperando mensajes de RabbitMQ...");

  ch.consume(q.queue, async (msg) => {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const payloadStr = msg.content.toString();
    console.log("[WS] mensaje RabbitMQ crudo:", routingKey, payloadStr);

    let payload;
    try {
      payload = JSON.parse(payloadStr);
    } catch (e) {
      console.error("[WS] error parseando JSON de Rabbit:", e);
      ch.ack(msg);
      return;
    }

    const roomId = payload.roomId;
    if (!roomId) {
      console.warn("[WS] payload sin roomId, ignorando");
      ch.ack(msg);
      return;
    }

    const occupied = await fetchRoomOccupancy(roomId);
    if (occupied === null) {
      console.warn("[WS] no se pudo obtener ocupación actual, no emito");
      ch.ack(msg);
      return;
    }

    const prev = roomOccupancy.get(roomId);
    if (prev !== occupied) {
      roomOccupancy.set(roomId, occupied);
      broadcastOccupancy(roomId, occupied);
    } else {
      console.log("[WS] estado no cambió, no emito", { roomId, occupied });
    }

    ch.ack(msg);
  });
}

// Arranque del servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[WS] WebSocket live en puerto ${PORT}`);
  initRabbitAndConsume().catch((err) => {
    console.error("[WS] Error iniciando RabbitMQ:", err);
  });


  setInterval(pollOccupancy, 5 * 1000); 
});
