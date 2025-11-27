# WebSocket Occupancy Service

Servicio WebSocket en tiempo real que consume eventos de RabbitMQ y mantiene actualizados a los clientes sobre las reservas futuras de cada sala.

## 🏗️ Arquitectura

```
RabbitMQ (cowork.events exchange)
      ↓ (reservation.created, reservation.cancelled)
  Occupancy Service (Consumer)
      ↓ (In-Memory Cache por sala)
  WebSocket Server (Broadcasting)
      ↓ (room_update events)
  Clientes conectados (Frontend/Postman)
```

## ✨ Características

- ✅ **Consumo de eventos de RabbitMQ** (reservation.created, reservation.cancelled)
- ✅ **Cache en memoria** de reservas futuras por sala
- ✅ **WebSocket Server** con autenticación JWT
- ✅ **Suscripción por sala** (cada cliente elige qué sala monitorear)
- ✅ **Broadcasting en tiempo real** cuando cambian las reservas
- ✅ **Auto-cleanup** de reservas pasadas cada 5 minutos
- ✅ **Heartbeat** para detectar conexiones muertas
- ✅ **Logging estructurado** con Pino

## 📂 Estructura

```
src/
├── index.js                    # Entry point, orquestación
├── websocket/
│   └── server.js              # WebSocket Server (ws library)
├── rabbitmq/
│   └── consumer.js            # RabbitMQ Consumer (amqplib)
├── services/
│   └── occupancyService.js    # Cache de reservas por sala
└── utils/
    └── logger.js              # Pino logger
```

## 🔌 Protocolo WebSocket

### Mensajes del Cliente → Servidor

#### 1. Autenticación
```json
{
  "type": "auth",
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Respuesta OK:**
```json
{
  "type": "auth_success",
  "message": "Authentication successful"
}
```

**Respuesta Error:**
```json
{
  "type": "auth_failed",
  "message": "Invalid token"
}
```

#### 2. Suscribirse a una sala
```json
{
  "type": "subscribe",
  "roomId": "674534f40fdb81e8567a0f1c"
}
```

**Respuesta:**
```json
{
  "type": "subscribed",
  "roomId": "674534f40fdb81e8567a0f1c",
  "message": "Subscribed to room ... updates"
}
```

#### 3. Desuscribirse
```json
{
  "type": "unsubscribe"
}
```

**Respuesta:**
```json
{
  "type": "unsubscribed",
  "message": "Unsubscribed from room updates"
}
```

#### 4. Ping
```json
{
  "type": "ping"
}
```

**Respuesta:**
```json
{
  "type": "pong"
}
```

### Mensajes del Servidor → Cliente

#### Actualización de sala
```json
{
  "type": "room_update",
  "roomId": "674534f40fdb81e8567a0f1c",
  "reservations": [
    {
      "reservationId": "6927a91de796739be52f890b",
      "startsAt": "2025-11-27T14:00:00Z",
      "endsAt": "2025-11-27T16:00:00Z",
      "title": "Reunión de Planificación",
      "requesterEmail": "admin@cowork.local",
      "participantsQuantity": 5
    },
    {
      "reservationId": "6927b12ae796739be52f890c",
      "startsAt": "2025-11-28T10:00:00Z",
      "endsAt": "2025-11-28T12:00:00Z",
      "title": "Daily Standup",
      "requesterEmail": "user@cowork.local",
      "participantsQuantity": 8
    }
  ],
  "timestamp": "2025-11-26T20:15:30.123Z"
}
```

**Notas:**
- Solo contiene **reservas futuras** (startsAt >= now)
- Ordenadas por fecha de inicio (ascendente)
- Se envía automáticamente cuando:
  * Se crea una reserva en la sala suscrita
  * Se cancela una reserva en la sala suscrita

#### Error genérico
```json
{
  "type": "error",
  "message": "Description of error"
}
```

## 🚀 Ejecución

### Con Docker Compose (recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up websocket-occupancy

# Ver logs
docker logs -f iaw-tpi-websocket-occupancy-1
```

### Local (desarrollo)

```bash
cd services/websocket-occupancy

# Instalar dependencias
npm install

# Configurar .env
# RABBITMQ_URL=amqp://admin:admin@localhost:5672
# KEYCLOAK_URL=http://localhost:8080/realms/cowork
# PORT=4001

# Iniciar
npm start
```

## 🧪 Testing con Postman

### 1. Importar colección

Importar archivo `WEBSOCKET_POSTMAN.json` en Postman.

### 2. Configurar variables

```
wsUrl: ws://localhost:4001
token: (obtener desde Keycloak - ver colección REST API)
roomId: (obtener con GET /rooms - ver colección REST API)
```

### 3. Flujo de prueba

1. **Connect**: Abrir conexión WebSocket
   - Request: `1. Connect to WebSocket`
   - Recibirás: `{ "type": "connected", ... }`

2. **Authenticate**: Enviar token JWT
   - Request: `2. Authenticate`
   - Recibirás: `{ "type": "auth_success", ... }`

3. **Subscribe**: Suscribirse a una sala
   - Request: `3. Subscribe to Room`
   - Recibirás: `{ "type": "subscribed", ... }`

4. **Trigger Update**: Crear una reserva en esa sala (desde otra pestaña Postman con REST API)
   ```bash
   POST http://localhost:3001/reservations
   {
     "roomId": "{{roomId}}",
     "title": "Test desde Postman",
     "requesterEmail": "admin@cowork.local",
     "startsAt": "2025-11-27T15:00:00Z",
     "endsAt": "2025-11-27T17:00:00Z",
     "participantsQuantity": 3
   }
   ```

5. **Verify**: En la pestaña WebSocket deberías recibir automáticamente:
   ```json
   {
     "type": "room_update",
     "roomId": "...",
     "reservations": [{ ... }],
     "timestamp": "..."
   }
   ```

6. **Cancel Reservation**: Cancelar la reserva
   ```bash
   DELETE http://localhost:3001/reservations/{id}
   ```

7. **Verify Update**: Recibirás otra actualización sin esa reserva

### 4. Testing con wscat (CLI)

```bash
# Instalar wscat
npm install -g wscat

# Conectar
wscat -c ws://localhost:4001

# Autenticar (pegar token de Keycloak)
{"type":"auth","token":"eyJhbGciOiJSUzI1NiIs..."}

# Suscribirse a sala
{"type":"subscribe","roomId":"674534f40fdb81e8567a0f1c"}

# Esperar eventos...
```

## 🔍 Logs de Ejemplo

### Startup exitoso
```json
{"level":"info","time":"...","service":"websocket-occupancy","msg":"WebSocket server started","port":4001}
{"level":"info","time":"...","msg":"Connecting to RabbitMQ","url":"amqp://admin:****@rabbitmq:5672"}
{"level":"info","time":"...","msg":"Successfully connected to RabbitMQ and consuming events"}
{"level":"info","time":"...","msg":"WebSocket Occupancy Service started successfully"}
```

### Nueva conexión
```json
{"level":"info","time":"...","msg":"New WebSocket connection"}
{"level":"info","time":"...","msg":"Client authenticated","email":"admin@cowork.local"}
{"level":"info","time":"...","msg":"Client subscribed to room","roomId":"674534f40fdb81e8567a0f1c","email":"admin@cowork.local"}
```

### Evento recibido de RabbitMQ
```json
{"level":"info","time":"...","msg":"Event received","eventType":"reservation.created","reservationId":"6927a91de796739be52f890b"}
{"level":"info","time":"...","msg":"Processing reservation event","eventType":"reservation.created","reservationId":"6927a91de796739be52f890b"}
{"level":"info","time":"...","msg":"Reservation added to cache","roomId":"674534f40fdb81e8567a0f1c","reservationId":"6927a91de796739be52f890b","totalReservations":1}
{"level":"info","time":"...","msg":"Room update broadcasted","roomId":"674534f40fdb81e8567a0f1c","clients":1,"reservationsCount":1}
```

### Estadísticas periódicas (cada minuto)
```json
{
  "level":"info",
  "time":"...",
  "occupancy":{
    "totalRooms":3,
    "totalReservations":7
  },
  "websocket":{
    "totalConnections":2,
    "authenticated":2,
    "subscribed":2
  },
  "msg":"Service stats"
}
```

## 🔧 Variables de Entorno

```env
# Puerto del servidor WebSocket
PORT=4001

# RabbitMQ URL
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672

# Keycloak (para validación de JWT)
KEYCLOAK_URL=http://keycloak:8080/realms/cowork

# Nivel de logs (debug, info, warn, error)
LOG_LEVEL=info
```

## 🏃 Flujo Completo de Trabajo

### Escenario: Usuario monitorea sala "Zeus"

1. **Frontend conecta al WebSocket**
   ```javascript
   const ws = new WebSocket('ws://localhost:4001');
   ```

2. **Frontend autentica con token**
   ```javascript
   ws.send(JSON.stringify({
     type: 'auth',
     token: keycloakToken
   }));
   ```

3. **Frontend se suscribe a sala Zeus**
   ```javascript
   ws.send(JSON.stringify({
     type: 'subscribe',
     roomId: 'zeus-room-id'
   }));
   ```

4. **Otro usuario crea reserva en Zeus (vía REST API)**
   - API REST crea reserva
   - API REST publica evento `reservation.created` a RabbitMQ
   - Occupancy Service consume el evento
   - Occupancy Service actualiza cache interno
   - Occupancy Service hace broadcast a todos los clientes suscritos a Zeus

5. **Frontend recibe actualización automática**
   ```javascript
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     if (data.type === 'room_update') {
       updateUI(data.reservations); // Actualizar lista de reservas
     }
   };
   ```

6. **Usuario cancela la reserva (vía REST API)**
   - API REST cancela reserva
   - API REST publica evento `reservation.cancelled`
   - Occupancy Service consume evento
   - Occupancy Service remueve del cache
   - Occupancy Service hace broadcast con lista actualizada

7. **Frontend recibe nueva actualización**
   - La reserva cancelada ya no aparece en la lista

## 🔒 Seguridad

- ✅ Autenticación JWT requerida (token de Keycloak)
- ✅ Validación de mensajes JSON
- ⚠️ En producción: validar completamente el JWT contra Keycloak JWKS
- ⚠️ En producción: implementar rate limiting por cliente
- ⚠️ En producción: usar WSS (WebSocket Secure) con TLS

## 📊 Monitoreo

### Health Check (futuro)
Agregar endpoint HTTP para verificar estado:
```bash
curl http://localhost:4001/health
```

### Métricas importantes
- Número de conexiones activas
- Número de clientes autenticados
- Número de clientes suscritos
- Eventos procesados por segundo
- Latencia de broadcasting

## 🐛 Troubleshooting

### Error: No se reciben actualizaciones

**Verificar:**
1. ¿Estás autenticado? (`auth_success` recibido)
2. ¿Estás suscrito a la sala? (`subscribed` recibido)
3. ¿El roomId es correcto?
4. ¿La reserva es futura? (solo se envían reservas futuras)

**Logs:**
```bash
docker logs -f iaw-tpi-websocket-occupancy-1
```

### Error: "Authentication required"

**Causa:** Intentaste suscribirte sin autenticarte primero.

**Solución:** Enviar mensaje `auth` antes de `subscribe`.

### Error: Conexión se cierra inmediatamente

**Causa:** Heartbeat detectó conexión muerta.

**Solución:** Implementar ping/pong en el cliente:
```javascript
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 25000); // Cada 25 segundos
```

## 🚧 Futuras Mejoras

- [ ] Persistir cache en Redis (sobrevivir a restarts)
- [ ] Health check endpoint HTTP
- [ ] Métricas con Prometheus
- [ ] APM integration (Elastic APM)
- [ ] Rate limiting por cliente
- [ ] Soporte para múltiples salas simultáneas
- [ ] Snapshot inicial al suscribirse (enviar estado actual inmediatamente)
- [ ] Filtros adicionales (solo mis reservas, solo hoy, etc.)
- [ ] Compresión de mensajes (para listas grandes)

## 📚 Dependencias

- **ws**: WebSocket server
- **amqplib**: RabbitMQ client
- **jsonwebtoken**: JWT parsing/validation
- **jwks-rsa**: Keycloak public key retrieval
- **pino**: Structured logging
- **dotenv**: Environment variables

---

**Implementado:** 2025-11-26  
**Estado:** ✅ COMPLETO Y FUNCIONAL  
**Puerto:** 4001  
**Protocolo:** WebSocket (ws://)
