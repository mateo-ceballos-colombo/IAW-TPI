const Reservation = require('../models/Reservation');

/**
 * Repository para operaciones de base de datos de Reservations
 */
class ReservationRepository {
  /**
   * Buscar todas las reservas con filtros opcionales
   */
  async findAll(filters = {}) {
    const query = {};

    // Filtro por roomId
    if (filters.roomId) {
      query.roomId = filters.roomId;
    }

    // Filtro por status
    if (filters.status) {
      query.status = filters.status;
    }

    // Filtro por requesterEmail
    if (filters.requesterEmail) {
      query.requesterEmail = filters.requesterEmail.toLowerCase();
    }

    // Filtro por fecha (reservas que toquen ese día)
    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filters.date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Reservas que se solapan con ese día
      query.$or = [
        { startsAt: { $lte: endOfDay }, endsAt: { $gte: startOfDay } }
      ];
    }

    return await Reservation.find(query)
      .populate('roomId', 'name location capacity')
      .sort({ startsAt: 1 });
  }

  /**
   * Buscar reserva por ID
   */
  async findById(id) {
    return await Reservation.findById(id)
      .populate('roomId', 'name location capacity');
  }

  /**
   * Crear una nueva reserva
   */
  async create(reservationData) {
    const reservation = new Reservation(reservationData);
    return await reservation.save();
  }

  /**
   * Actualizar una reserva
   */
  async update(id, updateData) {
    return await Reservation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('roomId', 'name location capacity');
  }

  /**
   * Eliminar una reserva
   */
  async delete(id) {
    return await Reservation.findByIdAndDelete(id);
  }

  /**
   * Verificar conflictos de horario para una sala
   * Retorna true si hay conflicto, false si está disponible
   */
  async checkConflicts(roomId, startsAt, endsAt, excludeId = null) {
    const query = {
      roomId,
      status: 'CONFIRMED', // Solo verificar contra reservas confirmadas
      $or: [
        // Nueva reserva inicia durante una existente
        { startsAt: { $lte: startsAt }, endsAt: { $gt: startsAt } },
        // Nueva reserva termina durante una existente
        { startsAt: { $lt: endsAt }, endsAt: { $gte: endsAt } },
        // Nueva reserva contiene completamente una existente
        { startsAt: { $gte: startsAt }, endsAt: { $lte: endsAt } }
      ]
    };

    // Excluir la reserva actual si es una actualización
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const conflicts = await Reservation.find(query).limit(1);
    return conflicts.length > 0;
  }

  /**
   * Eliminar todas las reservas de una sala (cascade delete)
   */
  async deleteByRoomId(roomId) {
    return await Reservation.deleteMany({ roomId });
  }
}

module.exports = new ReservationRepository();
