import apm from "../apm.js";

/**
 * Middleware para enriquecer transacciones APM con información adicional
 */
export function apmMiddleware(req, res, next) {
  const transaction = apm.currentTransaction;
  
  if (transaction) {
    // Añadir información del usuario si está autenticado
    if (req.user) {
      transaction.setUser({
        id: req.user.sub,
        username: req.user.preferred_username || req.user.sub,
        email: req.user.email,
      });
    }

    // Añadir labels personalizadas
    transaction.addLabels({
      environment: process.env.NODE_ENV || "development",
      service: "api-reservas",
    });
  }

  next();
}

/**
 * Helper para crear spans personalizados
 */
export function createSpan(name, type = "custom") {
  return apm.startSpan(name, type);
}

/**
 * Helper para capturar errores manualmente
 */
export function captureError(error, context = {}) {
  apm.captureError(error, context);
}
