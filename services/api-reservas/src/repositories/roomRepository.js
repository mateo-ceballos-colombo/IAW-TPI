const Room = require('../models/Room');

class RoomRepository {
  /**
   * Obtiene todas las salas con filtros opcionales
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}) {
    const query = {};

    // Filtro por nombre (case-insensitive, búsqueda parcial)
    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }

    // Filtro por capacidad mínima y máxima
    if (filters.minCapacity || filters.maxCapacity) {
      query.capacity = {};
      if (filters.minCapacity) {
        query.capacity.$gte = parseInt(filters.minCapacity);
      }
      if (filters.maxCapacity) {
        query.capacity.$lte = parseInt(filters.maxCapacity);
      }
    }

    // Filtro por ubicación (case-insensitive, búsqueda parcial)
    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    return await Room.find(query).lean().exec();
  }

  /**
   * Obtiene una sala por su ID
   * @param {String} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return await Room.findById(id).lean().exec();
  }

  /**
   * Obtiene una sala por su nombre
   * @param {String} name
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    return await Room.findOne({ name }).lean().exec();
  }

  /**
   * Crea una nueva sala
   * @param {Object} roomData
   * @returns {Promise<Object>}
   */
  async create(roomData) {
    const room = new Room(roomData);
    return await room.save();
  }

  /**
   * Actualiza una sala existente
   * @param {String} id
   * @param {Object} updateData
   * @returns {Promise<Object|null>}
   */
  async update(id, updateData) {
    return await Room.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean().exec();
  }

  /**
   * Elimina una sala por su ID
   * @param {String} id
   * @returns {Promise<Object|null>}
   */
  async delete(id) {
    return await Room.findByIdAndDelete(id).lean().exec();
  }

  /**
   * Verifica si existe una sala con el nombre dado (excluyendo un ID específico)
   * @param {String} name
   * @param {String} excludeId - ID a excluir de la búsqueda
   * @returns {Promise<Boolean>}
   */
  async existsByName(name, excludeId = null) {
    const query = { name };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const count = await Room.countDocuments(query);
    return count > 0;
  }
}

module.exports = new RoomRepository();
