const roomRepository = require('../repositories/roomRepository');
const reservationRepository = require('../repositories/reservationRepository');
const { AppError } = require('../utils/errors');
const mongoose = require('mongoose');

class RoomService {
  /**
   * Lista todas las salas con filtros opcionales
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async listRooms(filters) {
    return await roomRepository.findAll(filters);
  }

  /**
   * Obtiene una sala por ID
   * @param {String} id
   * @returns {Promise<Object>}
   */
  async getRoomById(id) {
    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de sala inválido', 400);
    }

    const room = await roomRepository.findById(id);
    if (!room) {
      throw new AppError('Sala no encontrada', 404);
    }

    return room;
  }

  /**
   * Crea una nueva sala
   * @param {Object} roomData
   * @returns {Promise<Object>}
   */
  async createRoom(roomData) {
    // Validar campos requeridos
    if (!roomData.name || !roomData.capacity) {
      throw new AppError('Nombre y capacidad son requeridos', 400);
    }

    // Validar que la capacidad sea un número positivo
    if (typeof roomData.capacity !== 'number' || roomData.capacity < 1) {
      throw new AppError('La capacidad debe ser un número entero positivo', 400);
    }

    // Verificar si ya existe una sala con ese nombre
    const existingRoom = await roomRepository.findByName(roomData.name);
    if (existingRoom) {
      throw new AppError('Ya existe una sala con ese nombre', 409);
    }

    try {
      const room = await roomRepository.create(roomData);
      return this._formatRoom(room);
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new AppError(`Error de validación: ${error.message}`, 400);
      }
      throw error;
    }
  }

  /**
   * Actualiza una sala existente
   * @param {String} id
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateRoom(id, updateData) {
    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de sala inválido', 400);
    }

    // Verificar que la sala existe
    const existingRoom = await roomRepository.findById(id);
    if (!existingRoom) {
      throw new AppError('Sala no encontrada', 404);
    }

    // Validar capacidad si se proporciona
    if (updateData.capacity !== undefined) {
      if (typeof updateData.capacity !== 'number' || updateData.capacity < 1) {
        throw new AppError('La capacidad debe ser un número entero positivo', 400);
      }
    }

    // Si se actualiza el nombre, verificar que no exista otra sala con ese nombre
    if (updateData.name && updateData.name !== existingRoom.name) {
      const nameExists = await roomRepository.existsByName(updateData.name, id);
      if (nameExists) {
        throw new AppError('Ya existe otra sala con ese nombre', 409);
      }
    }

    // Eliminar campos que no deben actualizarse
    const { createdAt, _id, ...allowedUpdates } = updateData;

    try {
      const updatedRoom = await roomRepository.update(id, allowedUpdates);
      return this._formatRoom(updatedRoom);
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new AppError(`Error de validación: ${error.message}`, 400);
      }
      throw error;
    }
  }

  /**
   * Elimina una sala
   * @param {String} id
   * @returns {Promise<void>}
   */
  async deleteRoom(id) {
    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ID de sala inválido', 400);
    }

    const room = await roomRepository.findById(id);
    if (!room) {
      throw new AppError('Sala no encontrada', 404);
    }

    // Cascade delete: eliminar todas las reservas asociadas a esta sala
    await reservationRepository.deleteByRoomId(id);

    await roomRepository.delete(id);
  }

  /**
   * Formatea el objeto de sala para la respuesta
   * @private
   */
  _formatRoom(room) {
    const formatted = room.toObject ? room.toObject() : { ...room };
    
    // Convertir _id a id
    formatted.id = formatted._id.toString();
    delete formatted._id;

    return formatted;
  }
}

module.exports = new RoomService();
