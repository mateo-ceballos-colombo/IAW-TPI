require('dotenv').config();
const WebSocketServer = require('./websocket/server');
const rabbitmqConsumer = require('./rabbitmq/consumer');
const occupancyService = require('./services/occupancyService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4001;

// Inicializar WebSocket Server
const wsServer = new WebSocketServer(PORT);

/**
 * Inicializar aplicación
 */
async function startApp() {
  try {
    // Iniciar WebSocket Server
    await wsServer.start();

    // Conectar a RabbitMQ y suscribirse a eventos
    await rabbitmqConsumer.connect();

    // Registrar handler para eventos de RabbitMQ
    rabbitmqConsumer.onEvent((event) => {
      handleReservationEvent(event);
    });

    // Limpiar reservas pasadas cada 5 minutos
    setInterval(() => {
      occupancyService.cleanupPastReservations();
    }, 5 * 60 * 1000);

    // Log de estadísticas cada minuto
    setInterval(() => {
      const occupancyStats = occupancyService.getStats();
      const wsStats = wsServer.getStats();
      
      logger.info({ 
        occupancy: occupancyStats,
        websocket: wsStats
      }, 'Service stats');
    }, 60 * 1000);

    logger.info('WebSocket Occupancy Service started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start application');
    process.exit(1);
  }
}

/**
 * Manejar eventos de reserva
 */
function handleReservationEvent(event) {
  const { eventType, data } = event;

  logger.info({ eventType, reservationId: data.reservationId }, 'Processing reservation event');

  switch (eventType) {
    case 'reservation.created':
      // Agregar reserva al cache
      occupancyService.addReservation(data);
      
      // Broadcast actualización a clientes suscritos a esta sala
      const createdReservations = occupancyService.getRoomReservations(data.roomId);
      wsServer.broadcastRoomUpdate(data.roomId, createdReservations);
      break;

    case 'reservation.cancelled':
      // Remover reserva del cache
      occupancyService.removeReservation(data.roomId, data.reservationId);
      
      // Broadcast actualización
      const cancelledReservations = occupancyService.getRoomReservations(data.roomId);
      wsServer.broadcastRoomUpdate(data.roomId, cancelledReservations);
      break;

    default:
      logger.warn({ eventType }, 'Unknown event type');
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down gracefully...');

  try {
    await rabbitmqConsumer.close();
    await wsServer.close();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Iniciar
startApp();
