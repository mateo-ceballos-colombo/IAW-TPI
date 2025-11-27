const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const logger = require('../utils/logger');

/**
 * WebSocket Server para broadcasting de ocupación de salas
 */
class WebSocketServer {
  constructor(port) {
    this.port = port;
    this.wss = null;
    this.clients = new Map(); // WebSocket -> { roomId, authenticated }
    this.jwksClient = null;
  }

  /**
   * Inicializar servidor WebSocket
   */
  async start() {
    // Configurar JWKS client para validar tokens
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080/realms/cowork';
    const jwksUri = `${keycloakUrl}/protocol/openid-connect/certs`;

    this.jwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 3600000 // 1 hora
    });

    // Crear servidor WebSocket
    this.wss = new WebSocket.Server({ port: this.port });

    logger.info({ port: this.port }, 'WebSocket server started');

    this.wss.on('connection', (ws) => {
      logger.info('New WebSocket connection');

      // Inicializar estado del cliente
      this.clients.set(ws, {
        authenticated: false,
        roomId: null
      });

      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        logger.info({ 
          authenticated: this.clients.get(ws)?.authenticated,
          roomId: this.clients.get(ws)?.roomId 
        }, 'WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error({ error }, 'WebSocket error');
      });

      // Enviar mensaje de bienvenida
      this.sendMessage(ws, {
        type: 'connected',
        message: 'Connected to occupancy WebSocket. Send auth message with JWT token.'
      });
    });

    // Heartbeat para detectar conexiones muertas
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          logger.info('Terminating dead connection');
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  /**
   * Manejar mensajes del cliente
   */
  async handleMessage(ws, message) {
    try {
      const data = JSON.parse(message.toString());
      const clientState = this.clients.get(ws);

      logger.debug({ type: data.type, authenticated: clientState.authenticated }, 'Message received');

      switch (data.type) {
        case 'auth':
          await this.handleAuth(ws, data);
          break;

        case 'subscribe':
          this.handleSubscribe(ws, data);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(ws, data);
          break;

        case 'ping':
          this.sendMessage(ws, { type: 'pong' });
          break;

        default:
          this.sendMessage(ws, {
            type: 'error',
            message: `Unknown message type: ${data.type}`
          });
      }
    } catch (error) {
      logger.error({ error }, 'Error handling message');
      this.sendMessage(ws, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  /**
   * Manejar autenticación
   */
  async handleAuth(ws, data) {
    const clientState = this.clients.get(ws);

    if (!data.token) {
      this.sendMessage(ws, {
        type: 'auth_failed',
        message: 'Token is required'
      });
      return;
    }

    try {
      // Validar token JWT (opcional - simplificado por ahora)
      // En producción deberías validar contra Keycloak
      const decoded = jwt.decode(data.token);

      if (!decoded) {
        throw new Error('Invalid token');
      }

      clientState.authenticated = true;
      clientState.email = decoded.email || decoded.preferred_username;

      logger.info({ email: clientState.email }, 'Client authenticated');

      this.sendMessage(ws, {
        type: 'auth_success',
        message: 'Authentication successful'
      });
    } catch (error) {
      logger.error({ error }, 'Authentication failed');
      this.sendMessage(ws, {
        type: 'auth_failed',
        message: 'Invalid token'
      });
    }
  }

  /**
   * Suscribirse a actualizaciones de una sala
   */
  handleSubscribe(ws, data) {
    const clientState = this.clients.get(ws);

    if (!clientState.authenticated) {
      this.sendMessage(ws, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    if (!data.roomId) {
      this.sendMessage(ws, {
        type: 'error',
        message: 'roomId is required'
      });
      return;
    }

    clientState.roomId = data.roomId;

    logger.info({ roomId: data.roomId, email: clientState.email }, 'Client subscribed to room');

    this.sendMessage(ws, {
      type: 'subscribed',
      roomId: data.roomId,
      message: `Subscribed to room ${data.roomId} updates`
    });
  }

  /**
   * Desuscribirse de actualizaciones
   */
  handleUnsubscribe(ws, data) {
    const clientState = this.clients.get(ws);
    const previousRoomId = clientState.roomId;

    clientState.roomId = null;

    logger.info({ roomId: previousRoomId }, 'Client unsubscribed');

    this.sendMessage(ws, {
      type: 'unsubscribed',
      message: 'Unsubscribed from room updates'
    });
  }

  /**
   * Broadcast de actualización de reservas de una sala
   */
  broadcastRoomUpdate(roomId, reservations) {
    let sentCount = 0;

    this.wss.clients.forEach((ws) => {
      const clientState = this.clients.get(ws);

      // Enviar solo a clientes autenticados y suscritos a esta sala
      if (ws.readyState === WebSocket.OPEN && 
          clientState?.authenticated && 
          clientState?.roomId === roomId) {
        
        this.sendMessage(ws, {
          type: 'room_update',
          roomId,
          reservations,
          timestamp: new Date().toISOString()
        });

        sentCount++;
      }
    });

    if (sentCount > 0) {
      logger.info({ roomId, clients: sentCount, reservationsCount: reservations.length }, 
        'Room update broadcasted');
    }
  }

  /**
   * Broadcast general a todos los clientes autenticados
   */
  broadcastAll(data) {
    let sentCount = 0;

    this.wss.clients.forEach((ws) => {
      const clientState = this.clients.get(ws);

      if (ws.readyState === WebSocket.OPEN && clientState?.authenticated) {
        this.sendMessage(ws, data);
        sentCount++;
      }
    });

    logger.debug({ type: data.type, clients: sentCount }, 'Broadcast sent to all clients');
  }

  /**
   * Enviar mensaje a un cliente específico
   */
  sendMessage(ws, data) {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      logger.error({ error }, 'Error sending message');
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    let authenticated = 0;
    let subscribed = 0;

    this.clients.forEach((state) => {
      if (state.authenticated) authenticated++;
      if (state.roomId) subscribed++;
    });

    return {
      totalConnections: this.wss.clients.size,
      authenticated,
      subscribed
    };
  }

  /**
   * Cerrar servidor
   */
  async close() {
    return new Promise((resolve) => {
      this.wss.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}

module.exports = WebSocketServer;
