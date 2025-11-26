const roomService = require('../services/roomService');
const logger = require('../utils/logger');

class RoomController {
  /**
   * GET /rooms
   * Lista todas las salas con filtros opcionales
   */
  async listRooms(req, res, next) {
    try {
      const { name, minCapacity, maxCapacity, location } = req.query;
      
      const filters = {};
      if (name) filters.name = name;
      if (minCapacity) filters.minCapacity = minCapacity;
      if (maxCapacity) filters.maxCapacity = maxCapacity;
      if (location) filters.location = location;

      const rooms = await roomService.listRooms(filters);
      
      logger.info({ filters, count: rooms.length }, 'Salas listadas exitosamente');
      res.json(rooms);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /rooms/:id
   * Obtiene una sala por ID
   */
  async getRoomById(req, res, next) {
    try {
      const { id } = req.params;
      const room = await roomService.getRoomById(id);
      
      logger.info({ roomId: id }, 'Sala obtenida exitosamente');
      res.json(room);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /rooms
   * Crea una nueva sala
   */
  async createRoom(req, res, next) {
    try {
      const roomData = req.body;
      const room = await roomService.createRoom(roomData);
      
      logger.info({ roomId: room.id, name: room.name }, 'Sala creada exitosamente');
      res.status(201)
        .location(`/rooms/${room.id}`)
        .json(room);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /rooms/:id
   * Actualiza una sala existente
   */
  async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const room = await roomService.updateRoom(id, updateData);
      
      logger.info({ roomId: id }, 'Sala actualizada exitosamente');
      res.json(room);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /rooms/:id
   * Elimina una sala
   */
  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      await roomService.deleteRoom(id);
      
      logger.info({ roomId: id }, 'Sala eliminada exitosamente');
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoomController();
