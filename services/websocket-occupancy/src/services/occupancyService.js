const logger = require('../utils/logger');

/**
 * Service para manejar el estado de ocupación de salas
 */
class OccupancyService {
  constructor() {
    // Cache: roomId -> array de reservas futuras
    this.reservationsByRoom = new Map();
  }

  /**
   * Agregar o actualizar una reserva
   */
  addReservation(reservation) {
    const { roomId, reservationId, startsAt, endsAt, title, requesterEmail, participantsQuantity } = reservation;

    // Solo mantener reservas futuras
    const startDate = new Date(startsAt);
    const now = new Date();

    if (startDate < now) {
      logger.debug({ reservationId, startsAt }, 'Ignoring past reservation');
      return;
    }

    if (!this.reservationsByRoom.has(roomId)) {
      this.reservationsByRoom.set(roomId, []);
    }

    const reservations = this.reservationsByRoom.get(roomId);
    
    // Remover si ya existe (por si es una actualización)
    const existingIndex = reservations.findIndex(r => r.reservationId === reservationId);
    if (existingIndex !== -1) {
      reservations.splice(existingIndex, 1);
    }

    // Agregar nueva reserva
    reservations.push({
      reservationId,
      startsAt,
      endsAt,
      title,
      requesterEmail,
      participantsQuantity
    });

    // Ordenar por fecha de inicio
    reservations.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    logger.info({ roomId, reservationId, totalReservations: reservations.length }, 
      'Reservation added to cache');
  }

  /**
   * Remover una reserva (cuando se cancela)
   */
  removeReservation(roomId, reservationId) {
    if (!this.reservationsByRoom.has(roomId)) {
      return;
    }

    const reservations = this.reservationsByRoom.get(roomId);
    const index = reservations.findIndex(r => r.reservationId === reservationId);

    if (index !== -1) {
      reservations.splice(index, 1);
      logger.info({ roomId, reservationId, remainingReservations: reservations.length }, 
        'Reservation removed from cache');
    }

    // Si no quedan reservas, remover la entrada del Map
    if (reservations.length === 0) {
      this.reservationsByRoom.delete(roomId);
    }
  }

  /**
   * Obtener reservas futuras de una sala
   */
  getRoomReservations(roomId) {
    const reservations = this.reservationsByRoom.get(roomId) || [];
    
    // Filtrar reservas que ya pasaron (cleanup)
    const now = new Date();
    const futureReservations = reservations.filter(r => new Date(r.startsAt) >= now);

    // Actualizar cache si hubo cambios
    if (futureReservations.length !== reservations.length) {
      if (futureReservations.length > 0) {
        this.reservationsByRoom.set(roomId, futureReservations);
      } else {
        this.reservationsByRoom.delete(roomId);
      }
    }

    return futureReservations;
  }

  /**
   * Obtener todas las reservas agrupadas por sala
   */
  getAllReservations() {
    const result = {};
    
    for (const [roomId, reservations] of this.reservationsByRoom.entries()) {
      const futureReservations = this.getRoomReservations(roomId);
      if (futureReservations.length > 0) {
        result[roomId] = futureReservations;
      }
    }

    return result;
  }

  /**
   * Limpiar reservas pasadas (ejecutar periódicamente)
   */
  cleanupPastReservations() {
    const now = new Date();
    let cleaned = 0;

    for (const [roomId, reservations] of this.reservationsByRoom.entries()) {
      const futureReservations = reservations.filter(r => new Date(r.startsAt) >= now);
      
      if (futureReservations.length !== reservations.length) {
        cleaned += (reservations.length - futureReservations.length);
        
        if (futureReservations.length > 0) {
          this.reservationsByRoom.set(roomId, futureReservations);
        } else {
          this.reservationsByRoom.delete(roomId);
        }
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned }, 'Cleaned up past reservations');
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    let totalReservations = 0;
    for (const reservations of this.reservationsByRoom.values()) {
      totalReservations += reservations.length;
    }

    return {
      totalRooms: this.reservationsByRoom.size,
      totalReservations
    };
  }
}

module.exports = new OccupancyService();
