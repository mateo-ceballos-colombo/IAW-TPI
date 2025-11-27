const amqp = require('amqplib');
const logger = require('../utils/logger');

/**
 * RabbitMQ Consumer para eventos de reservas
 */
class RabbitMQConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'cowork.events';
    this.queue = 'occupancy.updates';
    this.reconnectDelay = 5000;
    this.isConnecting = false;
    this.eventHandlers = [];
  }

  /**
   * Conectar a RabbitMQ y configurar el consumer
   */
  async connect() {
    if (this.isConnecting) {
      logger.info('Connection attempt already in progress');
      return;
    }

    if (this.connection) {
      logger.info('Already connected to RabbitMQ');
      return;
    }

    this.isConnecting = true;

    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq:5672';
      
      logger.info({ url: rabbitmqUrl.replace(/:[^:@]+@/, ':****@') }, 'Connecting to RabbitMQ');
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declarar exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });

      // Declarar queue
      await this.channel.assertQueue(this.queue, {
        durable: true
      });

      // Bind para eventos de reservas
      await this.channel.bindQueue(this.queue, this.exchange, 'reservation.created');
      await this.channel.bindQueue(this.queue, this.exchange, 'reservation.cancelled');

      logger.info({ queue: this.queue, patterns: ['reservation.created', 'reservation.cancelled'] }, 
        'Queue bound to exchange');

      // Configurar prefetch
      this.channel.prefetch(1);

      // Consumir mensajes
      await this.channel.consume(this.queue, (msg) => {
        if (msg) {
          this.handleMessage(msg);
        }
      });

      // Manejar cierre de conexión
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.connect(), this.reconnectDelay);
      });

      // Manejar errores
      this.connection.on('error', (error) => {
        logger.error({ error }, 'RabbitMQ connection error');
      });

      logger.info('Successfully connected to RabbitMQ and consuming events');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to RabbitMQ, retrying...');
      this.connection = null;
      this.channel = null;
      setTimeout(() => this.connect(), this.reconnectDelay);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Manejar mensaje recibido
   */
  handleMessage(msg) {
    try {
      const content = JSON.parse(msg.content.toString());
      
      logger.info({ 
        eventType: content.eventType, 
        reservationId: content.data?.reservationId 
      }, 'Event received');

      // Notificar a todos los handlers registrados
      this.eventHandlers.forEach(handler => {
        try {
          handler(content);
        } catch (error) {
          logger.error({ error, event: content.eventType }, 'Error in event handler');
        }
      });

      // Acknowledge el mensaje
      this.channel.ack(msg);
    } catch (error) {
      logger.error({ error }, 'Error processing message');
      // Rechazar el mensaje y no requeue (evitar loop infinito)
      this.channel.nack(msg, false, false);
    }
  }

  /**
   * Registrar un handler para eventos
   */
  onEvent(handler) {
    this.eventHandlers.push(handler);
  }

  /**
   * Cerrar conexión
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
      logger.error({ error }, 'Error closing RabbitMQ connection');
    }
  }
}

module.exports = new RabbitMQConsumer();
