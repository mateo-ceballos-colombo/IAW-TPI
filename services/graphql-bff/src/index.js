require('dotenv').config();
const { ApolloServer } = require('apollo-server');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const logger = require('./logger');

// Función para extraer el token del header Authorization
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Crear Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  
  // Context: extraer el token para token relay
  context: ({ req }) => {
    const token = extractToken(req);
    return { token };
  },

  // Formatear errores
  formatError: (error) => {
    logger.error({ error }, 'GraphQL Error');
    
    // Propagar errores de la API REST con más contexto
    if (error.extensions?.exception?.status) {
      return {
        message: error.message,
        extensions: {
          code: error.extensions.code,
          status: error.extensions.exception.status,
          details: error.extensions.exception.details
        }
      };
    }

    return {
      message: error.message,
      extensions: {
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
      }
    };
  },

  // Introspection y playground habilitados (útil para desarrollo)
  introspection: true,
  playground: true,

  // Configuración de CORS
  cors: {
    origin: true, // En producción, especificar dominios permitidos
    credentials: true
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;

server.listen(PORT).then(({ url }) => {
  logger.info({ url }, 'GraphQL BFF Server ready');
  logger.info({ 
    apiUrl: process.env.API_URL || 'http://api-reservas:3001',
    keycloakUrl: process.env.KEYCLOAK_URL || 'http://keycloak:8080/realms/cowork'
  }, 'Configuration');
}).catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
