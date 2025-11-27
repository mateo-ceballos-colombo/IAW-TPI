import {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
} from "../metrics.js";

export function metricsMiddleware(req, res, next) {
  // Incrementar conexiones activas
  activeConnections.inc();

  const start = Date.now();

  // Capturar cuando termine la respuesta
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
    activeConnections.dec();
  });

  next();
}
