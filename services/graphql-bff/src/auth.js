import jwt from "jsonwebtoken";

export function buildContext(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    throw new Error("Unauthorized");
  }
  const decoded = jwt.decode(token) || {};
  return { token, user: decoded };
}
