# Guía de Observabilidad - API Reservas

## Componentes Agregados

### 1. **Elastic APM Agent** (`elastic-apm-node`)
Librería que instrumenta automáticamente tu aplicación Node.js para recopilar:
- **Transacciones HTTP**: Cada request genera una transacción con timing, status code, headers
- **Spans de base de datos**: Queries a MongoDB con timing y query details
- **Spans de mensajería**: Publicaciones a RabbitMQ
- **Errores**: Stack traces completos con contexto

### 2. **Archivo `apm.js`**
- Inicializa el agente APM al inicio de la aplicación
- Se importa **antes que cualquier otro módulo** para poder instrumentar correctamente
- Configuración:
  - `serviceName`: Identifica el servicio en Kibana
  - `serverUrl`: URL del APM Server
  - `captureBody`: Captura request/response bodies
  - `transactionSampleRate`: 100% en dev (ajustar en prod)

### 3. **Middleware `apmMiddleware.js`**
- **Enriquece transacciones** con información del usuario autenticado
- **Helpers**:
  - `createSpan()`: Para crear spans personalizados
  - `captureError()`: Para reportar errores manualmente

### 4. **Instrumentación en código**
- **`mongo.js`**: Span para la conexión inicial a MongoDB
- **`eventPublisher.js`**: Spans para conexión y publicación de eventos RabbitMQ
- **`errorHandler.js`**: Captura errores con contexto completo

## Instalación

### 1. Instalar el paquete APM

```powershell
cd services/api
npm install elastic-apm-node
```

### 2. Reconstruir el contenedor

```powershell
cd ../..
docker compose up -d --build api
```

## Cómo Probar

### 1. Verificar que APM está activo

```powershell
# Ver logs del contenedor
docker compose logs -f api

# Deberías ver:
# [apm] Conectado a http://apm-server:8200 como api-reservas
```

### 2. Generar tráfico a la API

```powershell
# Obtener token de Keycloak (usando Authorization Code + PKCE en Postman)
# Luego hacer requests a la API:

# Listar rooms
curl http://localhost:3000/v1/rooms -H "Authorization: Bearer <token>"

# Crear reserva
curl -X POST http://localhost:3000/v1/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "673ab59e14d68f0ff99dc5b0",
    "requesterEmail": "test@example.com",
    "startsAt": "2025-11-27T10:00:00Z",
    "endsAt": "2025-11-27T12:00:00Z"
  }'
```

### 3. Acceder a Kibana

1. Abre http://localhost:5601
2. Login con:
   - Username: `elastic`
   - Password: `password` (desde `.env`)
3. Ve a **Observability** → **APM** → **Services**
4. Selecciona el servicio **api-reservas**

### 4. Explorar métricas en Kibana

**Transacciones:**
- Ve a la pestaña **Transactions**
- Verás cada endpoint: `GET /v1/rooms`, `POST /v1/reservations`, etc.
- Click en una transacción para ver el detalle completo

**Timeline (Waterfall):**
- Muestra el tiempo de cada operación:
  - HTTP request/response
  - Query a MongoDB
  - Publicación a RabbitMQ
  - Validaciones de negocio

**Errores:**
- Pestaña **Errors**
- Stack traces completos
- Contexto del request que causó el error

**Métricas de infraestructura:**
- CPU, memoria, heap del proceso Node.js
- Latencia P95, P99
- Throughput (requests/min)

### 5. Probar captura de errores

```powershell
# Intentar crear reserva con datos inválidos
curl -X POST http://localhost:3000/v1/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "invalid-id",
    "requesterEmail": "test@example.com",
    "startsAt": "2025-11-27T10:00:00Z",
    "endsAt": "2025-11-27T12:00:00Z"
  }'

# El error se reportará automáticamente a APM
```

## Qué se monitorea automáticamente

### Sin código adicional (instrumentación automática):
- ✅ **HTTP requests**: Express routes, timing, status codes
- ✅ **MongoDB queries**: Mongoose operations con query details
- ✅ **Errores no capturados**: Exceptions y rejections
- ✅ **Métricas del sistema**: CPU, memoria, event loop lag

### Con código custom (spans manuales):
- ✅ **Conexión a MongoDB**: Span en `connectMongo()`
- ✅ **Conexión a RabbitMQ**: Span en `initRabbit()`
- ✅ **Publicación de eventos**: Span por cada `publishEvent()`
- ✅ **Información de usuario**: Enriquecimiento en `apmMiddleware`
- ✅ **Errores de negocio**: Captura en `errorHandler`

## Dashboards útiles en Kibana

1. **APM → Services → api-reservas**
   - Overview con latencia, throughput, error rate
   
2. **APM → Transactions**
   - Desglose por endpoint
   - Distribución de tiempos de respuesta
   
3. **APM → Dependencies**
   - Mapa de servicios conectados (MongoDB, RabbitMQ)
   
4. **APM → Errors**
   - Lista de errores con frecuencia
   - Stack traces y contexto

## Configuración en Producción

Para producción, ajusta en `.env`:

```env
# Reducir sample rate para menos overhead
APM_TRANSACTION_SAMPLE_RATE=0.1  # 10% de requests

# Aumentar intervalo de métricas
APM_METRICS_INTERVAL=60s

# Nivel de logs
APM_LOG_LEVEL=warn
```

Y modifica `apm.js`:

```javascript
transactionSampleRate: parseFloat(process.env.APM_TRANSACTION_SAMPLE_RATE || "1.0"),
metricsInterval: process.env.APM_METRICS_INTERVAL || "30s",
logLevel: process.env.APM_LOG_LEVEL || "info",
```

## Troubleshooting

**APM no aparece en Kibana:**
- Verifica que `apm-server` esté corriendo: `docker compose ps`
- Revisa logs: `docker compose logs apm-server`
- Verifica conectividad desde el contenedor de la API

**No se ven transacciones:**
- Confirma que `apm.js` se importa PRIMERO en `index.js`
- Verifica que `APM_SERVER_URL` esté correctamente configurado
- Genera tráfico a la API

**Datos incompletos:**
- Elastic APM puede tardar 30-60s en aparecer en Kibana
- Refresh la página de APM en Kibana
