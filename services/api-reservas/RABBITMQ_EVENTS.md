# RabbitMQ Event Publishing - Implementación

## ✅ Implementación Completa

La API REST ahora publica eventos de dominio a RabbitMQ cuando se crean o cancelan reservas.

## 📦 Archivos Creados/Modificados

### Nuevo Módulo: EventPublisher
**Archivo:** `src/events/eventPublisher.js`

- Clase singleton para publicar eventos a RabbitMQ
- Conexión automática con reconexión en caso de fallo
- Exchange tipo `topic` para routing flexible (`cowork.events`)
- Mensajes persistentes (sobreviven a restart de RabbitMQ)
- Logging estructurado de todos los eventos
- Manejo graceful de errores (no falla la operación si falla el publish)

**Características:**
```javascript
// Inicializar conexión
await eventPublisher.connect();

// Publicar evento
await eventPublisher.publish('reservation.created', payload);

// Cerrar conexión
await eventPublisher.close();
```

### Modificaciones en Reservation Model
**Archivo:** `src/models/Reservation.js`

- ✅ Agregado campo `participantsQuantity` (requerido, min: 1)

### Modificaciones en Reservation Service
**Archivo:** `src/services/reservationService.js`

**1. Evento `reservation.created`** (al crear reserva):
```javascript
await eventPublisher.publish('reservation.created', {
  reservationId: reservation._id.toString(),
  roomId: reservation.roomId.toString(),
  requesterEmail: reservation.requesterEmail,
  startsAt: reservation.startsAt.toISOString(),
  endsAt: reservation.endsAt.toISOString(),
  title: reservation.title,
  participantsQuantity: reservation.participantsQuantity
});
```

**2. Evento `reservation.cancelled`** (al cancelar reserva):
```javascript
await eventPublisher.publish('reservation.cancelled', {
  reservationId: cancelledReservation._id.toString(),
  roomId: cancelledReservation.roomId.toString(),
  requesterEmail: cancelledReservation.requesterEmail,
  startsAt: cancelledReservation.startsAt.toISOString(),
  endsAt: cancelledReservation.endsAt.toISOString(),
  title: cancelledReservation.title
});
```

**3. Formato de respuesta actualizado:**
- ✅ Incluye `participantsQuantity`
- ❌ Eliminado `updatedAt` (no está en OpenAPI spec)

### Modificaciones en Index
**Archivo:** `src/index.js`

- ✅ Inicializa conexión a RabbitMQ al arrancar
- ✅ Cierra conexión gracefully en SIGINT/SIGTERM

## 🔌 Estructura de Eventos

### Formato del Mensaje
```json
{
  "eventType": "reservation.created",
  "timestamp": "2025-11-27T02:00:00.000Z",
  "data": {
    "reservationId": "6927a91de796739be52f890b",
    "roomId": "6927a91de796739be52f890a",
    "requesterEmail": "user@example.com",
    "startsAt": "2025-12-01T10:00:00.000Z",
    "endsAt": "2025-12-01T12:00:00.000Z",
    "title": "Reunión de equipo",
    "participantsQuantity": 8
  }
}
```

### Routing Keys
- `reservation.created` - Nueva reserva confirmada
- `reservation.cancelled` - Reserva cancelada

### Exchange Configuration
- **Nombre:** `cowork.events`
- **Tipo:** `topic`
- **Durable:** `true`
- **Properties:**
  - `persistent: true` - Mensajes sobreviven restart
  - `contentType: application/json`
  - `timestamp` - Unix timestamp

## 🔍 Logs de Ejemplo

### Conexión Exitosa
```json
{
  "level": "info",
  "time": "2025-11-27T02:01:12.490Z",
  "service": "api-reservas",
  "url": "amqp://admin:****@rabbitmq:5672",
  "msg": "Connecting to RabbitMQ"
}
{
  "level": "info",
  "time": "2025-11-27T02:01:12.568Z",
  "service": "api-reservas",
  "msg": "Successfully connected to RabbitMQ"
}
```

### Evento Publicado
```json
{
  "level": "info",
  "time": "2025-11-27T02:15:30.123Z",
  "service": "api-reservas",
  "routingKey": "reservation.created",
  "payload": {
    "reservationId": "6927a91de796739be52f890b",
    "roomId": "6927a91de796739be52f890a"
  },
  "msg": "Event published successfully"
}
```

### Error de Publicación (no-blocking)
```json
{
  "level": "error",
  "time": "2025-11-27T02:15:30.456Z",
  "service": "api-reservas",
  "error": {...},
  "reservationId": "6927a91de796739be52f890b",
  "msg": "Error publishing reservation.created event"
}
```

## 🧪 Testing

### 1. Verificar Conexión
```bash
# Ver logs del contenedor
docker logs iaw-tpi-api-reservas-1 --tail 50

# Debería mostrar:
# "Successfully connected to RabbitMQ"
```

### 2. Crear una Reserva (vía REST API o GraphQL)
```bash
# Crear reserva
POST /reservations
{
  "roomId": "...",
  "title": "Test Event",
  "requesterEmail": "test@example.com",
  "startsAt": "2025-12-01T10:00:00.000Z",
  "endsAt": "2025-12-01T12:00:00.000Z",
  "participantsQuantity": 5
}

# Ver logs - debería mostrar "Event published successfully"
docker logs iaw-tpi-api-reservas-1 --tail 20
```

### 3. Verificar en RabbitMQ Management UI
```
URL: http://localhost:15672
User: admin
Pass: admin

1. Ir a "Exchanges"
2. Buscar "cowork.events"
3. Debería existir con type=topic, durable=true

4. Ir a "Queues" (si hay consumers)
5. Ver mensajes publicados
```

### 4. Crear un Consumer de Prueba
```javascript
// test-consumer.js
const amqp = require('amqplib');

async function consumeEvents() {
  const connection = await amqp.connect('amqp://admin:admin@localhost:5672');
  const channel = await connection.createChannel();
  
  await channel.assertExchange('cowork.events', 'topic', { durable: true });
  
  const queue = await channel.assertQueue('test-consumer', { durable: false });
  
  // Suscribirse a todos los eventos de reservas
  await channel.bindQueue(queue.queue, 'cowork.events', 'reservation.*');
  
  console.log('Waiting for events...');
  
  channel.consume(queue.queue, (msg) => {
    if (msg) {
      const event = JSON.parse(msg.content.toString());
      console.log('Received event:', event);
      channel.ack(msg);
    }
  });
}

consumeEvents();
```

```bash
# Ejecutar consumer
node test-consumer.js

# En otra terminal, crear/cancelar reservas
# Deberías ver los eventos en el consumer
```

## 🚀 Próximos Pasos

### Workers que Consumirán Estos Eventos

1. **worker-email** (ya definido en docker-compose)
   - Escucha: `reservation.created`, `reservation.cancelled`
   - Envía emails de confirmación/cancelación
   - Queue: `email.notifications`

2. **worker-no-show** (ya definido en docker-compose)
   - Escucha: `reservation.created`
   - Detecta no-shows (reservas sin check-in)
   - Queue: `no-show.detector`

3. **websocket-occupancy** (ya definido en docker-compose)
   - Escucha: `reservation.created`, `reservation.cancelled`
   - Notifica cambios de ocupación en tiempo real
   - Queue: `occupancy.updates`

### Routing Patterns Sugeridos

```javascript
// Todos los eventos de reservation
'reservation.*'

// Solo creaciones
'reservation.created'

// Solo cancelaciones
'reservation.cancelled'

// Eventos de un room específico (si se implementa)
'reservation.*.room.{roomId}'
```

## 🔒 Consideraciones de Producción

### Resiliencia
✅ Reconexión automática en caso de fallo  
✅ Mensajes persistentes (durable)  
✅ Error handling que no bloquea operaciones  
✅ Logging completo de todos los eventos

### Pendientes
⚠️ Implementar retry logic con exponential backoff  
⚠️ Dead Letter Queue (DLQ) para mensajes fallidos  
⚠️ Circuit breaker para proteger la API si RabbitMQ falla  
⚠️ Métricas de eventos publicados (APM)  
⚠️ Confirmaciones de publicación (publisher confirms)

### Monitoreo
- ✅ Logs estructurados con Pino
- 🔄 APM integration (Elastic APM) - pendiente activar
- 🔄 Métricas de RabbitMQ (rate, latency) - pendiente

## 📚 Referencias

- **RabbitMQ Topic Exchange:** https://www.rabbitmq.com/tutorials/tutorial-five-javascript.html
- **amqplib Docs:** https://amqp-node.github.io/amqplib/
- **Event-Driven Architecture:** https://martinfowler.com/articles/201701-event-driven.html

---

**Implementado:** 2025-11-27  
**Estado:** ✅ COMPLETO Y FUNCIONAL  
**Próximo paso:** Implementar workers para consumir estos eventos
