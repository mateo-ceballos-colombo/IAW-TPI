import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const realm = process.env.KEYCLOAK_REALM || "coworkreserve";
const keycloakUrl = process.env.KEYCLOAK_URL || "http://keycloak:8080";
const clientId = process.env.KEYCLOAK_CLIENT_ID || "cowork-api";

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

// Middleware de autenticación
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

// Eventos
io.on("connection", (socket) => {
  console.log("[WS] cliente conectado:", socket.user.preferred_username);

  socket.on("subscribeRoom", (roomId) => {
    console.log("[WS] suscripción room:", roomId);
    socket.join(roomId);
  });
});

// Emitir ocupación 
export function broadcastOccupancy(roomId, payload) {
  io.to(roomId).emit("occupancyUpdate", payload);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[WS] WebSocket live en puerto ${PORT}`);
});
