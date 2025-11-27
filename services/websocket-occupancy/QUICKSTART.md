# Guía Rápida - WebSocket Occupancy Testing

## 🚀 Quick Start con Postman

### 1. Requisitos Previos

- Docker Compose corriendo (`docker-compose up -d`)
- Token JWT de Keycloak (obtener con colección REST API)
- ID de una sala (obtener con `GET /rooms`)

### 2. Importar Colección

1. Abrir Postman
2. Click en "Import"
3. Seleccionar archivo `WEBSOCKET_POSTMAN.json`
4. La colección "WebSocket Occupancy - Cowork" aparecerá

### 3. Configurar Variables

En la colección, establecer:

```
wsUrl: ws://localhost:4001
token: <pegar_token_jwt_aquí>
roomId: <pegar_id_sala_aquí>
```

#### ¿Cómo obtener el token?

Desde la colección REST API:
1. Request: `OAuth - Get Token (Password Grant)`
2. Copiar el `access_token` de la respuesta
3. Pegarlo en la variable `token` de esta colección

#### ¿Cómo obtener roomId?

Desde la colección REST API:
1. Request: `GET /rooms`
2. Copiar el `id` de cualquier sala (ej: Zeus)
3. Pegarlo en la variable `roomId`

### 4. Probar el WebSocket

#### Paso 1: Conectar
1. Abrir request `1. Connect to WebSocket`
2. Click en "Connect"
3. Esperar mensaje: `{ "type": "connected", ... }`

#### Paso 2: Autenticar
1. Request `2. Authenticate`
2. Click en "Send"
3. Esperar mensaje: `{ "type": "auth_success", ... }`

#### Paso 3: Suscribirse
1. Request `3. Subscribe to Room`
2. Click en "Send"
3. Esperar mensaje: `{ "type": "subscribed", "roomId": "...", ... }`

#### Paso 4: Probar actualización en vivo

**En otra pestaña de Postman (colección REST API):**

1. Request: `POST /reservations`
2. Body:
   ```json
   {
     "roomId": "{{roomId}}",
     "title": "Test WebSocket",
     "requesterEmail": "admin@cowork.local",
     "startsAt": "2025-11-28T14:00:00Z",
     "endsAt": "2025-11-28T16:00:00Z",
     "participantsQuantity": 5
   }
   ```
3. Click "Send"

**En la pestaña WebSocket, deberías recibir automáticamente:**
```json
{
  "type": "room_update",
  "roomId": "...",
  "reservations": [
    {
      "reservationId": "...",
      "startsAt": "2025-11-28T14:00:00Z",
      "endsAt": "2025-11-28T16:00:00Z",
      "title": "Test WebSocket",
      "requesterEmail": "admin@cowork.local",
      "participantsQuantity": 5
    }
  ],
  "timestamp": "..."
}
```

#### Paso 5: Probar cancelación

**En la pestaña REST API:**

1. Request: `DELETE /reservations/:id`
2. Reemplazar `:id` con el `reservationId` que recibiste
3. Click "Send"

**En la pestaña WebSocket:**
- Recibirás otro `room_update` sin esa reserva

## 🧪 Probar con wscat (CLI)

```bash
# Instalar wscat globalmente
npm install -g wscat

# Conectar al WebSocket
wscat -c ws://localhost:4001

# Una vez conectado, verás:
# < {"type":"connected","message":"..."}

# Autenticar (pegar tu token)
> {"type":"auth","token":"eyJhbGciOiJSUzI1NiIs..."}
< {"type":"auth_success","message":"Authentication successful"}

# Suscribirse a una sala (pegar roomId real)
> {"type":"subscribe","roomId":"674534f40fdb81e8567a0f1c"}
< {"type":"subscribed","roomId":"...","message":"..."}

# Crear una reserva desde otra terminal/Postman
# Verás automáticamente:
< {"type":"room_update","roomId":"...","reservations":[...],"timestamp":"..."}
```

## 📊 Verificar Estado del Servicio

### Ver logs en tiempo real
```bash
docker logs -f iaw-tpi-websocket-occupancy-1
```

### Verificar que RabbitMQ está conectado
```bash
docker logs iaw-tpi-websocket-occupancy-1 | grep "Successfully connected"
```

Deberías ver:
```
Successfully connected to RabbitMQ and consuming events
```

### Verificar que WebSocket está escuchando
```bash
docker logs iaw-tpi-websocket-occupancy-1 | grep "WebSocket server"
```

Deberías ver:
```
WebSocket server started on port 4001
```

### Ver estadísticas (cada minuto)
```bash
docker logs iaw-tpi-websocket-occupancy-1 | grep "Service stats"
```

Verás algo como:
```json
{
  "occupancy": {
    "totalRooms": 2,
    "totalReservations": 5
  },
  "websocket": {
    "totalConnections": 1,
    "authenticated": 1,
    "subscribed": 1
  }
}
```

## 🐛 Troubleshooting

### No recibo actualizaciones

**Checklist:**
- [ ] ¿El servicio está corriendo? (`docker ps | grep websocket`)
- [ ] ¿Estás autenticado? (mensaje `auth_success` recibido)
- [ ] ¿Estás suscrito? (mensaje `subscribed` recibido)
- [ ] ¿El roomId es correcto?
- [ ] ¿La reserva creada es para el futuro? (solo se trackean reservas futuras)
- [ ] ¿La reserva es para la misma sala suscrita?

### Error: "Authentication required"

**Solución:** Debes enviar el mensaje `auth` antes de intentar `subscribe`.

### Error: "Invalid token"

**Solución:**
1. Obtener un token nuevo desde Keycloak
2. El token expira cada ~5 minutos por defecto
3. Verificar que copiaste el token completo

### WebSocket se desconecta solo

**Solución:** Enviar pings periódicos:

En Postman:
- Request `4. Ping` cada 20-25 segundos

En código:
```javascript
setInterval(() => {
  ws.send(JSON.stringify({ type: 'ping' }));
}, 25000);
```

## 💡 Tips

### Múltiples clientes simultáneos

Puedes abrir múltiples pestañas WebSocket en Postman para simular múltiples usuarios:

1. Pestaña 1: Suscrita a sala "Zeus"
2. Pestaña 2: Suscrita a sala "Hera"
3. Pestaña 3: Suscrita a sala "Zeus"

Cuando crees una reserva en Zeus, las pestañas 1 y 3 recibirán la actualización, pero la 2 no.

### Ver mensajes RabbitMQ

Ir a RabbitMQ Management UI:
- URL: http://localhost:15672
- User: admin
- Pass: admin

Navegar a:
1. Exchanges → `cowork.events` → Ver bindings
2. Queues → `occupancy.updates` → Ver mensajes

### Crear múltiples reservas rápidamente

Script bash para crear varias reservas:
```bash
for i in {1..5}; do
  curl -X POST http://localhost:3001/reservations \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "roomId": "'"$ROOM_ID"'",
      "title": "Test '"$i"'",
      "requesterEmail": "admin@cowork.local",
      "startsAt": "2025-11-28T'$(printf "%02d" $((10+i)))':00:00Z",
      "endsAt": "2025-11-28T'$(printf "%02d" $((12+i)))':00:00Z",
      "participantsQuantity": '$i'
    }'
  sleep 0.5
done
```

Verás 5 actualizaciones en el WebSocket, una por cada reserva creada.

---

**¿Necesitas ayuda?**
- Ver README.md completo para más detalles
- Ver logs: `docker logs -f iaw-tpi-websocket-occupancy-1`
- Verificar RabbitMQ: http://localhost:15672
