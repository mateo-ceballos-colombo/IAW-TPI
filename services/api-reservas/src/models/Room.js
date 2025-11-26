const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    unique: true,
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    default: null
  },
  capacity: {
    type: Number,
    required: [true, 'La capacidad es requerida'],
    min: [1, 'La capacidad debe ser al menos 1'],
    validate: {
      validator: Number.isInteger,
      message: 'La capacidad debe ser un número entero'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'La ubicación no puede exceder 200 caracteres'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: false,
  versionKey: false
});

// Índice para búsquedas por nombre
roomSchema.index({ name: 1 });

// Índice para búsquedas por capacidad
roomSchema.index({ capacity: 1 });

module.exports = mongoose.model('Room', roomSchema);
