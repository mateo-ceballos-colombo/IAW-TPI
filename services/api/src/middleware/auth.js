import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const realm = process.env.KEYCLOAK_REALM || "coworkreserve";
const keycloakUrl = process.env.KEYCLOAK_URL || "http://keycloak:8080";
const clientId = process.env.KEYCLOAK_CLIENT_ID || "cowork-api";

const client = jwksClient({
  jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ title: "Unauthorized", status: 401 });
  }

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        console.error("[auth] error verificando token", err);
        return res.status(401).json({ title: "Unauthorized", status: 401 });
      }

      const roles = decoded.realm_access?.roles || [];
      if (!roles.includes("admin")) {
        return res.status(403).json({ title: "Forbidden", status: 403 });
      }

      req.user = decoded;
      next();
    }
  );
}
