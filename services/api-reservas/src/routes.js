const express = require('express');
const router = express.Router();
const roomController = require('./controllers/roomController');
const authMiddleware = require('./middleware/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// ==================== RUTAS DE ROOMS ====================

/**
 * GET /rooms
 * Lista todas las salas con filtros opcionales
 * Query params: name, minCapacity, maxCapacity, location
 */
router.get('/rooms', (req, res, next) => 
  roomController.listRooms(req, res, next)
);

/**
 * POST /rooms
 * Crea una nueva sala
 * Body: { name, description?, capacity, location? }
 */
router.post('/rooms', (req, res, next) => 
  roomController.createRoom(req, res, next)
);

/**
 * GET /rooms/:id
 * Obtiene una sala por ID
 */
router.get('/rooms/:id', (req, res, next) => 
  roomController.getRoomById(req, res, next)
);

/**
 * PUT /rooms/:id
 * Actualiza una sala existente
 * Body: { name?, description?, capacity?, location? }
 */
router.put('/rooms/:id', (req, res, next) => 
  roomController.updateRoom(req, res, next)
);

/**
 * DELETE /rooms/:id
 * Elimina una sala
 */
router.delete('/rooms/:id', (req, res, next) => 
  roomController.deleteRoom(req, res, next)
);

// ==================== RUTAS DE RESERVATIONS ====================
// TODO: Implementar rutas de reservations

module.exports = router;
