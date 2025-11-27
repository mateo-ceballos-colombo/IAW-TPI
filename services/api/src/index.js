// IMPORTANTE: APM debe importarse PRIMERO para instrumentar módulos
import "./apm.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectMongo } from "./db/mongo.js";
import { initRabbit } from "./events/eventPublisher.js";
import reservationsRouter from "./routes/reservations.routes.js";
import roomsRouter from "./routes/rooms.routes.js";
import { authMiddleware } from "./middleware/auth.js";
import { apmMiddleware } from "./middleware/apmMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(authMiddleware);
app.use(apmMiddleware);

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
  });
}

start().catch((err) => {
  console.error("Fatal API error", err);
  process.exit(1);
});
