export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(", ") });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `An account with this ${field} already exists.` });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format." });
  }

  const status = err.statusCode || 500;
  const message = status === 500 ? "Internal server error." : err.message;
  res.status(status).json({ error: message });
}
