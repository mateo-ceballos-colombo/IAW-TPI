import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectMongo } from "./db/mongo.js";
import { initRabbit } from "./events/eventPublisher.js";
import reservationsRouter from "./routes/reservations.routes.js";
import roomsRouter from "./routes/rooms.routes.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { metricsMiddleware } from "./middleware/metricsMiddleware.js";
import roomsPublicOccupancyRouter from "./routes/rooms.occupancy.routes.js";
import { register } from "./metrics.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Middleware de métricas para todas las rutas
app.use(metricsMiddleware);

// Endpoint de métricas para Prometheus (sin auth)
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.use("/v1/rooms", roomsPublicOccupancyRouter);

app.use(authMiddleware);

app.use("/v1/reservations", reservationsRouter);
app.use("/v1/rooms", roomsRouter);

app.use(errorHandler);

const port = process.env.PORT || 3000;
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/coworkreserve";
const rabbitUrl = process.env.RABBITMQ_URL || "amqp://localhost";

async function start() {
  await connectMongo(mongoUrl);
  await initRabbit(rabbitUrl);
  app.listen(port, () => {
    console.log("[api] escuchando en puerto " + port);
    console.log("[api] métricas disponibles en http://localhost:" + port + "/metrics");
  });
}

start().catch((err) => {
  console.error("Fatal API error", err);
  process.exit(1);
});
