const amqp = require('amqplib');
const logger = require('../utils/logger');

/**
 * Event Publisher para RabbitMQ
 * Publica eventos de dominio al message broker
 */
class EventPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'cowork.events';
    this.reconnectDelay = 5000;
    this.isConnecting = false;
  }

  /**
   * Inicializa la conexión con RabbitMQ
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

      // Declarar exchange tipo 'topic' para routing flexible
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });

      // Manejar cierre de conexión
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.connect(), this.reconnectDelay);
      });

      // Manejar errores de conexión
      this.connection.on('error', (error) => {
        logger.error({ error }, 'RabbitMQ connection error');
      });

      logger.info('Successfully connected to RabbitMQ');
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
   * Publica un evento al exchange
   * @param {String} routingKey - Clave de routing (ej: 'reservation.created')
   * @param {Object} payload - Datos del evento
   */
  async publish(routingKey, payload) {
    if (!this.channel) {
      logger.warn({ routingKey }, 'Channel not available, queuing event');
      // En producción, podrías implementar un sistema de cola local
      // Por ahora, solo logueamos y continuamos
      return;
    }

    try {
      const message = {
        eventType: routingKey,
        timestamp: new Date().toISOString(),
        data: payload
      };

      const content = Buffer.from(JSON.stringify(message));

      const published = this.channel.publish(
        this.exchange,
        routingKey,
        content,
        {
          persistent: true, // Mensaje sobrevive a restart de RabbitMQ
          contentType: 'application/json',
          timestamp: Date.now()
        }
      );

      if (published) {
        logger.info({ routingKey, payload }, 'Event published successfully');
      } else {
        logger.warn({ routingKey }, 'Event publish failed (buffer full)');
      }
    } catch (error) {
      logger.error({ error, routingKey, payload }, 'Error publishing event');
      throw error;
    }
  }

  /**
   * Cierra la conexión con RabbitMQ
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

// Singleton instance
const eventPublisher = new EventPublisher();

module.exports = eventPublisher;
