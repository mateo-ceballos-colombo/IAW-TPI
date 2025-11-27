import { captureError } from "./apmMiddleware.js";

export function errorHandler(err, req, res, next) {
  console.error(err);
  
  // Capturar error en APM con contexto
  captureError(err, {
    custom: {
      statusCode: err.status || 500,
      title: err.title,
      detail: err.detail,
      path: req.path,
      method: req.method,
    },
  });

  res.status(err.status || 500).json({
    title: err.title || "Internal Server Error",
    status: err.status || 500,
    detail: err.detail || err.message || "Unexpected error"
  });
}
