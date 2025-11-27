# GraphQL BFF (Backend For Frontend)

GraphQL API que actúa como Backend For Frontend, implementando **Token Relay** hacia la API REST de reservas.

## 🏗️ Arquitectura

```
Usuario/Frontend
      ↓ (JWT Token)
  GraphQL BFF (este servicio)
      ↓ (Token Relay - mismo JWT)
   API REST Reservas
```

### Token Relay Pattern

El BFF **NO valida** el token JWT. Solo lo extrae del header `Authorization` y lo reenvía tal cual a la API REST:

1. Cliente hace request GraphQL con token JWT
2. BFF extrae el token del header `Authorization: Bearer <token>`
3. BFF hace HTTP request a la API REST **incluyendo el mismo token**
4. API REST valida el token contra Keycloak y procesa el request
5. BFF retorna la respuesta al cliente

**Ventajas:**
- Mantiene el contexto del usuario en toda la cadena
- Un solo punto de validación (API REST)
- Simplifica la lógica del BFF
- Facilita auditoría y trazabilidad

## 📂 Estructura

```
src/
├── index.js          # Apollo Server setup + context extraction
├── schema.js         # GraphQL type definitions (schema)
├── resolvers.js      # Resolvers que llaman a la API REST
├── apiClient.js      # Axios client con token relay
└── logger.js         # Pino structured logging
```

## 🔌 Endpoints GraphQL

### Queries

#### Rooms
```graphql
rooms(name: String, minCapacity: Int, maxCapacity: Int, location: String): [Room!]!
room(id: ID!): Room
```

#### Reservations
```graphql
reservations(date: String, status: ReservationStatus, roomId: ID, requesterEmail: String): [Reservation!]!
reservation(id: ID!): Reservation
```

### Mutations

#### Rooms
```graphql
createRoom(input: RoomInput!): Room!
updateRoom(id: ID!, input: RoomUpdateInput!): Room!
deleteRoom(id: ID!): Boolean!
```

#### Reservations
```graphql
createReservation(input: ReservationInput!): Reservation!
updateReservation(id: ID!, input: ReservationUpdateInput!): Reservation!
cancelReservation(id: ID!): Reservation!
```

## 🛠️ Tecnologías

- **Apollo Server 3.11.1**: GraphQL server
- **Axios 1.4.0**: HTTP client para comunicación con API REST
- **Pino 8.0.0**: Structured logging
- **dotenv 16.0.3**: Environment variables

## 🚀 Ejecución

### Con Docker Compose (recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up graphql-bff

# Acceder a GraphQL Playground
# http://localhost:4000
```

### Local (desarrollo)

```bash
cd services/graphql-bff

# Instalar dependencias
npm install

# Configurar .env (copiar desde raíz o crear)
# API_URL=http://localhost:3001
# KEYCLOAK_URL=http://localhost:8080/realms/cowork

# Iniciar
npm start
```

## 📝 Variables de Entorno

```env
# API REST de reservas (URL interna Docker)
API_URL=http://api-reservas:3001

# Keycloak (usado solo para documentación, NO se valida aquí)
KEYCLOAK_URL=http://keycloak:8080/realms/cowork

# Puerto del servidor GraphQL
PORT=4000

# Nivel de logs (debug, info, warn, error)
LOG_LEVEL=info
```

## 🧪 Testing

Ver [GRAPHQL_TESTING.md](./GRAPHQL_TESTING.md) para guía completa de testing con Postman.

### Quick Test con cURL

```bash
# Obtener token de Keycloak primero (ver KEYCLOAK_SETUP.md en la raíz)

# Query de prueba
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "{ rooms { id name capacity location } }"
  }'
```

### GraphQL Playground

Abrir http://localhost:4000 en el navegador para usar el playground interactivo.

**Configurar header de autenticación:**
```json
{
  "Authorization": "Bearer YOUR_TOKEN_HERE"
}
```

## 🔍 Logging

El BFF registra:
- Requests GraphQL (query/mutation name + args)
- HTTP requests a la API REST (method, url, hasAuth)
- Errores con contexto completo
- Respuestas de la API (status, url)

### Ver logs

```bash
# Con Docker
docker logs graphql-bff -f

# Logs detallados (debug)
# Modificar docker-compose.yml:
# environment:
#   - LOG_LEVEL=debug
```

Ejemplo de log:
```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "msg": "Query: rooms",
  "args": {"name": "Zeus"}
}
{
  "level": "debug",
  "time": "2024-01-15T10:30:00.100Z",
  "msg": "API Request",
  "method": "get",
  "url": "/rooms?name=Zeus",
  "hasAuth": true
}
```

## 🐛 Troubleshooting

### Error: "No se pudo conectar con la API de reservas"

**Causa:** La API REST no está corriendo o el `API_URL` es incorrecto.

**Solución:**
```bash
# Verificar que api-reservas esté corriendo
docker ps | grep api-reservas

# Verificar logs de la API
docker logs api-reservas

# Verificar que responda
curl http://localhost:3001/health
```

### Error: Token inválido (desde la API REST)

**Causa:** El token JWT es inválido o ha expirado.

**Solución:**
1. Obtener un nuevo token de Keycloak
2. Verificar que el `iss` del token coincida con `KEYCLOAK_ISSUER` en la API
3. Ver logs de la API REST: `docker logs api-reservas -f`

### Error: GraphQL validation error

**Causa:** Query o variables mal formateadas.

**Solución:**
1. Usar GraphQL Playground para validar sintaxis
2. Verificar tipos de datos en las variables
3. Revisar el schema en el Playground (pestaña DOCS)

## 📚 Recursos

- **GraphQL Playground:** http://localhost:4000 (cuando el servidor esté corriendo)
- **API REST (upstream):** http://localhost:3001
- **Keycloak:** http://localhost:8080
- **Postman Collection:** `graphql-postman-collection.json`
- **Testing Guide:** `GRAPHQL_TESTING.md`

## 🔒 Seguridad

- ✅ Token Relay: El BFF NO almacena ni modifica tokens
- ✅ CORS configurado (ajustar en producción)
- ✅ Validación en la API REST (único punto de validación)
- ⚠️ En producción: deshabilitar GraphQL Playground (`playground: false`)
- ⚠️ En producción: configurar CORS con dominios específicos

## 🚧 Futuras Mejoras

- [ ] DataLoader para optimizar N+1 queries
- [ ] Caché de respuestas con Redis
- [ ] Subscriptions para actualizaciones en tiempo real
- [ ] Métricas y tracing con APM
- [ ] Rate limiting por usuario
- [ ] Paginación para queries grandes

---

**Documentado:** 2024-01-15  
**Versión:** 0.1.0
