import promClient from "prom-client";

// Registro de métricas
const register = new promClient.Registry();

// Métricas por defecto (CPU, memoria, etc.)
promClient.collectDefaultMetrics({ register });

// Métricas custom
export const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const activeConnections = new promClient.Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [register],
});

export const dbOperationDuration = new promClient.Histogram({
  name: "db_operation_duration_seconds",
  help: "Duration of database operations in seconds",
  labelNames: ["operation", "collection"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const mqPublishTotal = new promClient.Counter({
  name: "rabbitmq_publish_total",
  help: "Total number of messages published to RabbitMQ",
  labelNames: ["routing_key"],
  registers: [register],
});

export const reservationsTotal = new promClient.Counter({
  name: "reservations_total",
  help: "Total number of reservations created",
  labelNames: ["status"],
  registers: [register],
});

export const reservationsCancelled = new promClient.Counter({
  name: "reservations_cancelled_total",
  help: "Total number of reservations cancelled",
  registers: [register],
});

export { register };
