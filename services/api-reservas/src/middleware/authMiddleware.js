const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

// Validar que KEYCLOAK_URL y KEYCLOAK_ISSUER estén configuradas
if (!process.env.KEYCLOAK_URL) {
  logger.error('KEYCLOAK_URL no está configurada en las variables de entorno');
  throw new Error('KEYCLOAK_URL no está configurada');
}

if (!process.env.KEYCLOAK_ISSUER) {
  logger.error('KEYCLOAK_ISSUER no está configurada en las variables de entorno');
  throw new Error('KEYCLOAK_ISSUER no está configurada');
}

logger.info({ 
  keycloakUrl: process.env.KEYCLOAK_URL,
  keycloakIssuer: process.env.KEYCLOAK_ISSUER 
}, 'Configurando cliente Keycloak');

// Cliente para obtener las claves públicas de Keycloak
const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 86400000, // 24 horas
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

/**
 * Obtiene la clave de firma desde Keycloak
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      logger.error({ err }, 'Error obteniendo clave de firma');
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Middleware de autenticación
 * Valida el token JWT de Keycloak
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token de autenticación no proporcionado', 401);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('Formato de token inválido. Use: Bearer <token>', 401);
    }

    const token = parts[1];

    // Verificar el token
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: process.env.KEYCLOAK_ISSUER
    }, (err, decoded) => {
      if (err) {
        logger.warn({ 
          err: err.message, 
          type: err.name,
          url: req.url 
        }, 'Token inválido o expirado');
        
        // Mensajes específicos según el tipo de error
        if (err.name === 'TokenExpiredError') {
          return next(new AppError('Token expirado. Por favor, obtenga un nuevo token.', 401));
        } else if (err.name === 'JsonWebTokenError') {
          return next(new AppError('Token inválido. Verifique el formato del token.', 401));
        } else if (err.name === 'NotBeforeError') {
          return next(new AppError('Token aún no es válido.', 401));
        }
        
        return next(new AppError('Token inválido o expirado', 401));
      }

      logger.debug({ 
        sub: decoded.sub, 
        email: decoded.email,
        roles: decoded.realm_access?.roles || [] 
      }, 'Token validado exitosamente');

      // Opcional: Verificar rol admin (si se requiere en el futuro)
      // const roles = decoded.realm_access?.roles || [];
      // if (!roles.includes('admin')) {
      //   logger.warn({ sub: decoded.sub, roles }, 'Usuario sin permisos de admin');
      //   return next(new AppError('Acceso denegado', 403));
      // }

      // Agregar información del usuario al request
      req.user = {
        sub: decoded.sub,
        email: decoded.email,
        roles: decoded.realm_access?.roles || []
      };

      next();
    });
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
