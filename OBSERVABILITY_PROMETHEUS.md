# Guía de Observabilidad - Prometheus + Grafana

## Implementación Simple

Se ha implementado observabilidad en la API usando **Prometheus** (para recolección de métricas) y **Grafana** (para visualización).

## Componentes Agregados

### 1. **Prometheus**
- Servidor de métricas que hace scraping del endpoint `/metrics` de la API
- Almacena series de tiempo con métricas
- Accesible en: http://localhost:9090

### 2. **Grafana**
- Dashboard de visualización
- Accesible en: http://localhost:3030
- Credenciales: `admin` / `admin`

### 3. **Librería prom-client**
Cliente oficial de Prometheus para Node.js que expone métricas en formato que Prometheus entiende.

## Métricas Recolectadas

### Métricas por defecto (automáticas):
- **process_cpu_user_seconds_total**: Uso de CPU del proceso
- **process_resident_memory_bytes**: Memoria RAM usada
- **nodejs_heap_size_total_bytes**: Tamaño del heap de Node.js
- **nodejs_heap_size_used_bytes**: Heap usado
- **nodejs_eventloop_lag_seconds**: Lag del event loop

### Métricas custom (negocio):
- **http_requests_total**: Total de requests HTTP por método, ruta y status
- **http_request_duration_seconds**: Duración de requests (histograma con percentiles)
- **active_connections**: Conexiones activas en tiempo real
- **db_operation_duration_seconds**: Duración de operaciones de base de datos
- **rabbitmq_publish_total**: Total de mensajes publicados a RabbitMQ
- **reservations_total**: Total de reservas creadas por estado
- **reservations_cancelled_total**: Total de reservas canceladas

## Instalación

### 1. Instalar prom-client

```powershell
cd services\api
npm install prom-client
```

### 2. Levantar servicios

```powershell
cd ..\..
docker compose up -d
```

Esto levantará:
- API (puerto 3000, métricas en 3000/metrics)
- Prometheus (puerto 9090)
- Grafana (puerto 3030)

## Verificación

### 1. Ver métricas raw

```powershell
# Desde el navegador o curl
curl http://localhost:3000/metrics
```

Verás algo como:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/v1/rooms",status_code="200"} 5

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.01",method="GET",route="/v1/rooms",status_code="200"} 3
http_request_duration_seconds_bucket{le="0.05",method="GET",route="/v1/rooms",status_code="200"} 5
```

### 2. Verificar Prometheus

1. Abre http://localhost:9090
2. Ve a **Status** → **Targets**
3. Verifica que `api-reservas` esté **UP** (verde)
4. En el explorador, escribe una métrica como `http_requests_total` y presiona **Execute**

### 3. Generar tráfico

```powershell
# Obtener token con Postman (Authorization Code + PKCE)

# Hacer requests
curl http://localhost:3000/v1/rooms -H "Authorization: Bearer <token>"
curl -X POST http://localhost:3000/v1/reservations -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"roomId":"xxx","requesterEmail":"test@test.com","startsAt":"2025-11-27T10:00:00Z","endsAt":"2025-11-27T12:00:00Z","title":"Test"}'
```

## Configurar Grafana

### 1. Acceder a Grafana

1. Abre http://localhost:3030
2. Login: `admin` / `admin`
3. (Opcional) Cambia la contraseña

### 2. Agregar Data Source

1. Click en el ícono de engranaje (⚙️) → **Data Sources**
2. Click **Add data source**
3. Selecciona **Prometheus**
4. URL: `http://prometheus:9090`
5. Click **Save & Test** (debería decir "Data source is working")

### 3. Crear Dashboard

#### Opción A: Importar dashboard predefinido

1. Click en **+** → **Import**
2. ID del dashboard: `1860` (Node Exporter Full)
3. Selecciona el data source de Prometheus
4. Click **Import**

#### Opción B: Crear panel custom

1. Click en **+** → **Dashboard** → **Add new panel**
2. En la query, escribe: `rate(http_requests_total[5m])`
3. Legend: `{{method}} {{route}} {{status_code}}`
4. Panel title: "Request Rate"
5. Click **Apply**

### 4. Dashboards útiles

**Panel 1: Request Rate**
```promql
rate(http_requests_total[5m])
```

**Panel 2: Latencia P95**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Panel 3: Conexiones activas**
```promql
active_connections
```

**Panel 4: Reservas creadas (rate)**
```promql
rate(reservations_total[5m])
```

**Panel 5: Uso de memoria**
```promql
process_resident_memory_bytes / 1024 / 1024
```

**Panel 6: Event Loop Lag**
```promql
nodejs_eventloop_lag_seconds
```

**Panel 7: Mensajes RabbitMQ**
```promql
rate(rabbitmq_publish_total[5m])
```

## Queries útiles en Prometheus

### Requests por segundo
```promql
rate(http_requests_total[5m])
```

### Requests por endpoint
```promql
sum by (route, method) (rate(http_requests_total[5m]))
```

### Errores (status 5xx)
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
```

### Latencia promedio
```promql
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

### P95 de latencia
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Reservas por hora
```promql
increase(reservations_total[1h])
```

## Arquitectura

```
┌─────────┐         ┌────────────┐         ┌───────────┐
│   API   │ ◄────── │ Prometheus │ ◄────── │  Grafana  │
│ :3000   │  scrape │   :9090    │  query  │   :3030   │
└─────────┘         └────────────┘         └───────────┘
    │
    └─► /metrics (expone métricas)
```

1. **API** expone endpoint `/metrics` con métricas en formato Prometheus
2. **Prometheus** hace scraping cada 15s del endpoint
3. **Grafana** consulta Prometheus y visualiza con dashboards

## Archivos Creados/Modificados

**Nuevos:**
- `services/api/src/metrics.js` - Definición de métricas
- `services/api/src/middleware/metricsMiddleware.js` - Middleware que captura métricas HTTP
- `prometheus.yml` - Configuración de Prometheus

**Modificados:**
- `services/api/src/index.js` - Agrega middleware y endpoint /metrics
- `services/api/src/db/mongo.js` - Métricas de DB
- `services/api/src/events/eventPublisher.js` - Métricas de RabbitMQ
- `services/api/src/services/reservation.service.js` - Métricas de negocio
- `docker-compose.yml` - Agrega contenedores Prometheus y Grafana

## Troubleshooting

**Prometheus no ve la API:**
- Verifica que el contenedor `api` esté corriendo: `docker compose ps`
- Verifica en Prometheus → Targets que el estado sea UP
- Revisa logs: `docker compose logs api`

**No aparecen métricas:**
- Genera tráfico a la API haciendo requests
- Espera 15-30 segundos (intervalo de scraping)
- Verifica que `/metrics` responda: `curl http://localhost:3000/metrics`

**Grafana no conecta a Prometheus:**
- Verifica la URL: debe ser `http://prometheus:9090` (nombre del servicio)
- Verifica que ambos contenedores estén en la misma red Docker
- Prueba hacer ping desde Grafana: `docker exec -it cowork_grafana ping prometheus`

## Ventajas vs Elastic Stack

- ✅ **Más simple**: 2 contenedores vs 3
- ✅ **Menos recursos**: ~200MB RAM vs ~2GB
- ✅ **Setup más rápido**: Sin configuración compleja
- ✅ **Métricas enfocadas**: Solo lo necesario
- ❌ **Sin logs centralizados**: Solo métricas (no APM completo)
- ❌ **Sin traces distribuidos**: No hay waterfall de requests
