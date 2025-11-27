const express = require('express');
const router = express.Router();
const roomController = require('./controllers/roomController');
const reservationController = require('./controllers/reservationController');
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

/**
 * GET /reservations
 * Lista todas las reservas con filtros opcionales
 * Query params: date, status, roomId, requesterEmail
 */
router.get('/reservations', (req, res, next) => 
  reservationController.list(req, res, next)
);

/**
 * POST /reservations
 * Crea una nueva reserva
 * Body: { roomId, title?, requesterEmail, startsAt, endsAt }
 */
router.post('/reservations', (req, res, next) => 
  reservationController.create(req, res, next)
);

/**
 * GET /reservations/:id
 * Obtiene una reserva por ID
 */
router.get('/reservations/:id', (req, res, next) => 
  reservationController.getById(req, res, next)
);

/**
 * PUT /reservations/:id
 * Actualiza una reserva existente
 * Body: { title?, startsAt?, endsAt? }
 */
router.put('/reservations/:id', (req, res, next) => 
  reservationController.update(req, res, next)
);

/**
 * DELETE /reservations/:id
 * Cancela una reserva (cambia status a CANCELLED)
 */
router.delete('/reservations/:id', (req, res, next) => 
  reservationController.cancel(req, res, next)
);

module.exports = router;
