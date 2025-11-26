const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Conecta a la base de datos MongoDB usando Mongoose
 */
async function connectDatabase() {
  try {
    const mongoUrl = process.env.MONGO_URL;
    
    if (!mongoUrl) {
      throw new Error('MONGO_URL no está definida en las variables de entorno');
    }

    await mongoose.connect(mongoUrl, {
      // Opciones recomendadas
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    logger.info('Conectado exitosamente a MongoDB');

    // Eventos de conexión
    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'Error de conexión con MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Desconectado de MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Reconectado a MongoDB');
    });

  } catch (error) {
    logger.error({ err: error }, 'Error al conectar con MongoDB');
    throw error;
  }
}

/**
 * Cierra la conexión a la base de datos
 */
async function disconnectDatabase() {
  try {
    await mongoose.connection.close();
    logger.info('Conexión a MongoDB cerrada');
  } catch (error) {
    logger.error({ err: error }, 'Error al cerrar conexión con MongoDB');
    throw error;
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
