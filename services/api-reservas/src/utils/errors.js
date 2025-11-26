/**
 * Error personalizado de aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Manejador global de errores
 */
function errorHandler(err, req, res, next) {
  const logger = require('./logger');

  // Log del error
  if (err.statusCode >= 500) {
    logger.error({ err, url: req.url, method: req.method }, 'Error interno del servidor');
  } else {
    logger.warn({ err: err.message, url: req.url, method: req.method }, 'Error de cliente');
  }

  // Determinar código de estado
  const statusCode = err.statusCode || 500;

  // Preparar respuesta en formato RFC 9457 (Problem Details)
  const problem = {
    type: 'about:blank',
    title: err.message || 'Error interno del servidor',
    status: statusCode,
    detail: err.details || null,
    instance: req.url
  };

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    problem.stack = err.stack;
  }

  res.status(statusCode).json(problem);
}

/**
 * Manejador para rutas no encontradas
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(`Ruta no encontrada: ${req.method} ${req.url}`, 404);
  next(error);
}

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler
};
