const reservationService = require('../services/reservationService');
const logger = require('../utils/logger');

/**
 * Controller para endpoints de Reservations
 */
class ReservationController {
  /**
   * GET /reservations
   * Listar todas las reservas con filtros opcionales
   */
  async list(req, res, next) {
    try {
      const { date, status, roomId, requesterEmail } = req.query;

      const filters = {};
      if (date) filters.date = date;
      if (status) filters.status = status;
      if (roomId) filters.roomId = roomId;
      if (requesterEmail) filters.requesterEmail = requesterEmail;

      logger.info({ filters, user: req.user }, 'Listando reservas');

      const reservations = await reservationService.listReservations(filters);

      res.json(reservations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reservations/:id
   * Obtener una reserva por ID
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      logger.info({ reservationId: id, user: req.user }, 'Obteniendo reserva por ID');

      const reservation = await reservationService.getReservationById(id);

      res.json(reservation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /reservations
   * Crear una nueva reserva
   */
  async create(req, res, next) {
    try {
      const { roomId, title, requesterEmail, startsAt, endsAt, participantsQuantity } = req.body;

      logger.info({ 
        roomId, 
        requesterEmail, 
        startsAt, 
        endsAt,
        participantsQuantity,
        user: req.user 
      }, 'Creando nueva reserva');

      const reservation = await reservationService.createReservation({
        roomId,
        title,
        requesterEmail,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        participantsQuantity
      });

      logger.info({ reservationId: reservation.id }, 'Reserva creada exitosamente');

      res.status(201)
        .location(`/reservations/${reservation.id}`)
        .json(reservation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /reservations/:id
   * Actualizar una reserva existente
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, startsAt, endsAt } = req.body;

      logger.info({ 
        reservationId: id,
        updates: { title, startsAt, endsAt },
        user: req.user 
      }, 'Actualizando reserva');

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (startsAt) updateData.startsAt = new Date(startsAt);
      if (endsAt) updateData.endsAt = new Date(endsAt);

      const reservation = await reservationService.updateReservation(id, updateData);

      logger.info({ reservationId: id }, 'Reserva actualizada exitosamente');

      res.json(reservation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /reservations/:id
   * Cancelar una reserva (cambia status a CANCELLED)
   */
  async cancel(req, res, next) {
    try {
      const { id } = req.params;

      logger.info({ 
        reservationId: id,
        user: req.user 
      }, 'Cancelando reserva');

      const reservation = await reservationService.cancelReservation(id);

      logger.info({ reservationId: id }, 'Reserva cancelada exitosamente');

      res.json(reservation);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReservationController();
