const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'El ID de la sala es obligatorio'],
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  requesterEmail: {
    type: String,
    required: [true, 'El email del solicitante es obligatorio'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    index: true
  },
  startsAt: {
    type: Date,
    required: [true, 'La fecha de inicio es obligatoria'],
    index: true
  },
  endsAt: {
    type: Date,
    required: [true, 'La fecha de fin es obligatoria'],
    validate: {
      validator: function(value) {
        return value > this.startsAt;
      },
      message: 'La fecha de fin debe ser posterior a la fecha de inicio'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['CONFIRMED', 'CANCELLED'],
      message: 'Estado inválido. Debe ser CONFIRMED o CANCELLED'
    },
    default: 'CONFIRMED',
    index: true
  },
  participantsQuantity: {
    type: Number,
    required: [true, 'La cantidad de participantes es obligatoria'],
    min: [1, 'Debe haber al menos 1 participante']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice compuesto para búsquedas de conflictos
reservationSchema.index({ roomId: 1, startsAt: 1, endsAt: 1 });

// Índice para búsquedas por rango de fechas
reservationSchema.index({ startsAt: 1, endsAt: 1 });

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;
