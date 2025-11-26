export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({
    title: err.title || "Internal Server Error",
    status: err.status || 500,
    detail: err.detail || err.message || "Unexpected error"
  });
}
