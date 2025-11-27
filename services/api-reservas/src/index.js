require('dotenv').config();
const express = require('express');
const { connectDatabase } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./utils/errors');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para parsear JSON
app.use(express.json());

// Middleware para logging de requests
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Request recibido');
  next();
});

// Health check endpoint (sin autenticación)
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'api-reservas',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API
app.use('/', routes);

// Manejador de rutas no encontradas
app.use(notFoundHandler);

// Manejador global de errores
app.use(errorHandler);

// Inicializar servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();

    // Conectar a RabbitMQ
    const eventPublisher = require('./events/eventPublisher');
    await eventPublisher.connect();

    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Servidor API-Reservas iniciado');
    });
  } catch (error) {
    logger.error({ err: error }, 'Error al iniciar el servidor');
    process.exit(1);
  }
}

// Manejo de señales de cierre
process.on('SIGINT', async () => {
  logger.info('Cerrando servidor gracefully...');
  const { disconnectDatabase } = require('./config/database');
  const eventPublisher = require('./events/eventPublisher');
  await disconnectDatabase();
  await eventPublisher.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Cerrando servidor gracefully...');
  const { disconnectDatabase } = require('./config/database');
  const eventPublisher = require('./events/eventPublisher');
  await disconnectDatabase();
  await eventPublisher.close();
  process.exit(0);
});

// Iniciar
startServer();
