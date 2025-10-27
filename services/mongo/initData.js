// Icialización de datos

db = db.getSiblingDB('coworkreserve');

// Limpiar colecciones anteriores
db.rooms.drop();
db.reservations.drop();

// Salas
const rooms = [
  {
    _id: ObjectId("654000000000000000000001"),
    name: "Sala Principal",
    description: "Sala con proyector y pizarra",
    capacity: 8,
    location: "Piso 3 - Ala A"
  },
  {
    _id: ObjectId("654000000000000000000002"),
    name: "Sala Creativa",
    description: "Espacio con sofás y pizarra para brainstorming",
    capacity: 6,
    location: "Piso 2 - Ala B"
  },
  {
    _id: ObjectId("654000000000000000000003"),
    name: "Auditorio",
    description: "Espacio amplio con capacidad para 30 personas",
    capacity: 30,
    location: "Planta Baja"
  },
  {
    _id: ObjectId("654000000000000000000004"),
    name: "Sala de Dirección",
    description: "Sala privada con videoconferencia",
    capacity: 10,
    location: "Piso 4 - Ala C"
  }
];

db.rooms.insertMany(rooms);

// Reservas
const reservations = [
  {
    _id: ObjectId("655000000000000000000001"),
    roomId: rooms[0]._id,
    title: "Reunión semanal del equipo",
    requesterEmail: "juan.perez@example.com",
    startsAt: ISODate("2025-11-01T10:00:00Z"),
    endsAt: ISODate("2025-11-01T11:00:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-26T12:00:00Z")
  },
  {
    _id: ObjectId("655000000000000000000002"),
    roomId: rooms[0]._id,
    title: "Presentación de proyecto interno",
    requesterEmail: "maria.lopez@example.com",
    startsAt: ISODate("2025-11-02T15:00:00Z"),
    endsAt: ISODate("2025-11-02T16:30:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-27T09:00:00Z")
  },
  {
    _id: ObjectId("655000000000000000000003"),
    roomId: rooms[1]._id,
    title: "Sesión de creatividad",
    requesterEmail: "ana.garcia@example.com",
    startsAt: ISODate("2025-11-03T13:00:00Z"),
    endsAt: ISODate("2025-11-03T14:00:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-27T14:20:00Z")
  },
  {
    _id: ObjectId("655000000000000000000004"),
    roomId: rooms[2]._id,
    title: "Charla de seguridad laboral",
    requesterEmail: "seguridad@example.com",
    startsAt: ISODate("2025-11-05T09:00:00Z"),
    endsAt: ISODate("2025-11-05T10:30:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-28T08:00:00Z")
  },
  {
    _id: ObjectId("655000000000000000000005"),
    roomId: rooms[2]._id,
    title: "Evento cancelado - Hackathon interno",
    requesterEmail: "devteam@example.com",
    startsAt: ISODate("2025-11-06T09:00:00Z"),
    endsAt: ISODate("2025-11-06T18:00:00Z"),
    status: "CANCELLED",
    createdAt: ISODate("2025-10-29T09:00:00Z")
  },
  {
    _id: ObjectId("655000000000000000000006"),
    roomId: rooms[3]._id,
    title: "Reunión ejecutiva",
    requesterEmail: "direccion@example.com",
    startsAt: ISODate("2025-11-04T10:00:00Z"),
    endsAt: ISODate("2025-11-04T12:00:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-30T08:45:00Z")
  },
  {
    _id: ObjectId("655000000000000000000007"),
    roomId: rooms[1]._id,
    title: "Check de diseño UX",
    requesterEmail: "ux.team@example.com",
    startsAt: ISODate("2025-11-02T09:00:00Z"),
    endsAt: ISODate("2025-11-02T09:45:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-27T15:00:00Z")
  },
  {
    _id: ObjectId("655000000000000000000008"),
    roomId: rooms[0]._id,
    title: "Retrospectiva Sprint 45",
    requesterEmail: "scrum.master@example.com",
    startsAt: ISODate("2025-11-08T11:00:00Z"),
    endsAt: ISODate("2025-11-08T12:00:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-31T10:30:00Z")
  },
  {
    _id: ObjectId("655000000000000000000009"),
    roomId: rooms[3]._id,
    title: "Entrevista con candidato",
    requesterEmail: "rrhh@example.com",
    startsAt: ISODate("2025-11-01T15:00:00Z"),
    endsAt: ISODate("2025-11-01T16:00:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-26T10:00:00Z")
  },
  {
    _id: ObjectId("655000000000000000000010"),
    roomId: rooms[2]._id,
    title: "Prueba de proyector y sonido",
    requesterEmail: "infra@example.com",
    startsAt: ISODate("2025-11-07T17:00:00Z"),
    endsAt: ISODate("2025-11-07T18:00:00Z"),
    status: "BOOKED",
    createdAt: ISODate("2025-10-30T18:00:00Z")
  }
];

db.reservations.insertMany(reservations);

// Verificación
print("✅ Datos iniciales cargados correctamente:\n");

print("Salas:");
printjson(db.rooms.find().toArray());

print("\nReservas:");
printjson(db.reservations.find().toArray());
