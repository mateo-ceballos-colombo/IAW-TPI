const mongoose = require('mongoose');
const reservationRepository = require('../repositories/reservationRepository');
const roomRepository = require('../repositories/roomRepository');
const { AppError } = require('../utils/errors');
const eventPublisher = require('../events/eventPublisher');

/**
 * Service para lógica de negocio de Reservations
 */
class ReservationService {
  /**
   * Listar todas las reservas con filtros
   */
  async listReservations(filters) {
    const reservations = await reservationRepository.findAll(filters);
    return reservations.map(this._formatReservation);
  }

  /**
   * Obtener una reserva por ID
   */
  async getReservationById(id) {
    // Validar formato de ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de reserva inválido', 400);
    }

    const reservation = await reservationRepository.findById(id);
    
    if (!reservation) {
      throw new AppError('Reserva no encontrada', 404);
    }

    return this._formatReservation(reservation);
  }

  /**
   * Crear una nueva reserva
   */
  async createReservation(data) {
    // Validar que la sala existe
    const room = await roomRepository.findById(data.roomId);
    if (!room) {
      throw new AppError('La sala especificada no existe', 404);
    }

    // Validar fechas
    this._validateDates(data.startsAt, data.endsAt);

    // Verificar conflictos de horario
    const hasConflict = await reservationRepository.checkConflicts(
      data.roomId,
      data.startsAt,
      data.endsAt
    );

    if (hasConflict) {
      throw new AppError(
        'La sala no está disponible en el horario solicitado. Existe un conflicto con otra reserva.',
        409
      );
    }

    // Crear reserva
    const reservation = await reservationRepository.create({
      ...data,
      status: 'CONFIRMED'
    });

    // Publicar evento reservation.created a RabbitMQ
    try {
      await eventPublisher.publish('reservation.created', {
        reservationId: reservation._id.toString(),
        roomId: reservation.roomId.toString(),
        requesterEmail: reservation.requesterEmail,
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
        title: reservation.title,
        participantsQuantity: reservation.participantsQuantity
      });
    } catch (error) {
      // Log el error pero no fallar la reserva
      const logger = require('../utils/logger');
      logger.error({ error, reservationId: reservation._id }, 'Error publishing reservation.created event');
    }

    return this._formatReservation(reservation);
  }

  /**
   * Actualizar una reserva
   */
  async updateReservation(id, data) {
    // Validar formato de ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de reserva inválido', 400);
    }

    // Verificar que existe
    const existingReservation = await reservationRepository.findById(id);
    if (!existingReservation) {
      throw new AppError('Reserva no encontrada', 404);
    }

    // No permitir actualizar reservas canceladas
    if (existingReservation.status === 'CANCELLED') {
      throw new AppError('No se puede modificar una reserva cancelada', 400);
    }

    // Si se actualizan fechas, validar y verificar conflictos
    if (data.startsAt || data.endsAt) {
      const newStartsAt = data.startsAt || existingReservation.startsAt;
      const newEndsAt = data.endsAt || existingReservation.endsAt;

      this._validateDates(newStartsAt, newEndsAt);

      const hasConflict = await reservationRepository.checkConflicts(
        existingReservation.roomId,
        newStartsAt,
        newEndsAt,
        id // Excluir la reserva actual
      );

      if (hasConflict) {
        throw new AppError(
          'La sala no está disponible en el nuevo horario solicitado.',
          409
        );
      }
    }

    const updatedReservation = await reservationRepository.update(id, data);
    return this._formatReservation(updatedReservation);
  }

  /**
   * Cancelar una reserva (soft delete - cambia status a CANCELLED)
   */
  async cancelReservation(id) {
    // Validar formato de ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de reserva inválido', 400);
    }

    const reservation = await reservationRepository.findById(id);
    
    if (!reservation) {
      throw new AppError('Reserva no encontrada', 404);
    }

    if (reservation.status === 'CANCELLED') {
      throw new AppError('La reserva ya está cancelada', 400);
    }

    const cancelledReservation = await reservationRepository.update(id, {
      status: 'CANCELLED'
    });

    // Publicar evento reservation.cancelled a RabbitMQ
    try {
      await eventPublisher.publish('reservation.cancelled', {
        reservationId: cancelledReservation._id.toString(),
        roomId: cancelledReservation.roomId.toString(),
        requesterEmail: cancelledReservation.requesterEmail,
        startsAt: cancelledReservation.startsAt.toISOString(),
        endsAt: cancelledReservation.endsAt.toISOString(),
        title: cancelledReservation.title
      });
    } catch (error) {
      // Log el error pero no fallar la cancelación
      const logger = require('../utils/logger');
      logger.error({ error, reservationId: id }, 'Error publishing reservation.cancelled event');
    }

    return this._formatReservation(cancelledReservation);
  }

  /**
   * Eliminar una reserva permanentemente (hard delete)
   */
  async deleteReservation(id) {
    // Validar formato de ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de reserva inválido', 400);
    }

    const reservation = await reservationRepository.findById(id);
    
    if (!reservation) {
      throw new AppError('Reserva no encontrada', 404);
    }

    await reservationRepository.delete(id);
  }

  /**
   * Validar que las fechas sean válidas
   */
  _validateDates(startsAt, endsAt) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const now = new Date();

    // Validar que las fechas sean válidas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Formato de fecha inválido. Use ISO 8601', 400);
    }

    // Validar que la fecha de fin sea posterior a la de inicio
    if (end <= start) {
      throw new AppError('La fecha de fin debe ser posterior a la fecha de inicio', 400);
    }

    // Validar que no sea en el pasado
    if (start < now) {
      throw new AppError('No se pueden crear reservas en el pasado', 400);
    }

    // Validar duración mínima (15 minutos)
    const durationInMinutes = (end - start) / (1000 * 60);
    if (durationInMinutes < 15) {
      throw new AppError('La duración mínima de una reserva es 15 minutos', 400);
    }

    // Validar duración máxima (8 horas)
    const durationInHours = durationInMinutes / 60;
    if (durationInHours > 8) {
      throw new AppError('La duración máxima de una reserva es 8 horas', 400);
    }
  }

  /**
   * Formatear respuesta de reserva
   */
  _formatReservation(reservation) {
    return {
      id: reservation._id.toString(),
      roomId: reservation.roomId._id ? reservation.roomId._id.toString() : reservation.roomId.toString(),
      room: reservation.roomId.name ? {
        name: reservation.roomId.name,
        location: reservation.roomId.location,
        capacity: reservation.roomId.capacity
      } : undefined,
      title: reservation.title,
      requesterEmail: reservation.requesterEmail,
      startsAt: reservation.startsAt.toISOString(),
      endsAt: reservation.endsAt.toISOString(),
      status: reservation.status,
      participantsQuantity: reservation.participantsQuantity,
      createdAt: reservation.createdAt.toISOString()
    };
  }
}

module.exports = new ReservationService();
