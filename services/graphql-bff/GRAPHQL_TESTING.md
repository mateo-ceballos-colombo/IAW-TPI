# Guía de Pruebas del GraphQL BFF

Esta guía explica cómo probar el GraphQL BFF utilizando Postman.

## 📋 Contenido

- [Importar Colección](#importar-colección)
- [Configurar OAuth2](#configurar-oauth2)
- [Flujo de Pruebas](#flujo-de-pruebas)
- [Queries y Mutations Disponibles](#queries-y-mutations-disponibles)
- [Verificar Token Relay](#verificar-token-relay)

## 📥 Importar Colección

1. **Abrir Postman**

2. **Importar la colección:**
   - Click en **Import** (esquina superior izquierda)
   - Seleccionar el archivo: `services/graphql-bff/graphql-postman-collection.json`
   - Click en **Import**

3. **Verificar variables de colección:**
   - Click derecho en la colección → **Edit**
   - Ir a la pestaña **Variables**
   - Verificar que las variables estén configuradas:
     ```
     graphql_url: http://localhost:4000/graphql
     keycloak_url: http://localhost:8080/realms/cowork
     client_id: cowork-app
     client_secret: (dejar vacío si el cliente es público)
     ```

## 🔐 Configurar OAuth2

### Paso 1: Configurar el cliente en Keycloak

Antes de usar Postman, asegúrate de que el cliente `cowork-app` esté configurado:

1. Ir a http://localhost:8080
2. Login admin/admin
3. Realm: `cowork`
4. Clients → `cowork-app`
5. **Settings**:
   - **Valid Redirect URIs**: Agregar `https://oauth.pstmn.io/v1/callback`
   - **Web Origins**: Agregar `+` (permite todos los orígenes)
   - **Save**

### Paso 2: Obtener token en Postman

1. **Abrir cualquier request de la colección**

2. **Ir a la pestaña Authorization**
   - Type: **Inherit auth from parent** (ya está configurado a nivel colección)

3. **En la colección principal:**
   - Click derecho → **Edit**
   - Pestaña **Authorization**
   - Type: **OAuth 2.0**
   - Click en **Get New Access Token**

4. **Completar el formulario OAuth2** (debería estar pre-llenado):
   ```
   Token Name: Keycloak Token
   Grant Type: Authorization Code
   Callback URL: https://oauth.pstmn.io/v1/callback
   Auth URL: http://localhost:8080/realms/cowork/protocol/openid-connect/auth
   Access Token URL: http://localhost:8080/realms/cowork/protocol/openid-connect/token
   Client ID: cowork-app
   Client Secret: (vacío si es público)
   Scope: openid profile email
   ```

5. **Click en Request Token**
   - Se abrirá ventana de login de Keycloak
   - Login con usuario de prueba (ej: `testuser` / `password`)
   - Autorizar acceso

6. **Use Token**
   - Seleccionar el token obtenido
   - Click en **Use Token**

## 🧪 Flujo de Pruebas

### 1. Crear una Sala (Room)

**Request:** `Rooms → Create Room`

```graphql
mutation CreateRoom($input: RoomInput!) {
  createRoom(input: $input) {
    id
    name
    capacity
    location
    description
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Sala Zeus GraphQL",
    "capacity": 12,
    "location": "Piso 3",
    "description": "Sala amplia para reuniones ejecutivas - creada desde GraphQL"
  }
}
```

**Copiar el `id` de la respuesta** para usarlo en los siguientes pasos.

### 2. Listar Salas

**Request:** `Rooms → List Rooms`

```graphql
query ListRooms($name: String, $minCapacity: Int) {
  rooms(name: $name, minCapacity: $minCapacity) {
    id
    name
    capacity
    location
    description
    createdAt
  }
}
```

**Variables (opcionales):**
```json
{
  "name": "",
  "minCapacity": null,
  "maxCapacity": null,
  "location": ""
}
```

### 3. Crear una Reservación

**Request:** `Reservations → Create Reservation`

⚠️ **IMPORTANTE:** Reemplazar `REPLACE_WITH_ROOM_ID` con el ID real de la sala creada.

```graphql
mutation CreateReservation($input: ReservationInput!) {
  createReservation(input: $input) {
    id
    roomId
    room {
      name
      location
    }
    requesterEmail
    startTime
    endTime
    status
    purpose
    attendees
  }
}
```

**Variables:**
```json
{
  "input": {
    "roomId": "REPLACE_WITH_ROOM_ID",
    "requesterEmail": "user@example.com",
    "startTime": "2024-02-01T14:00:00.000Z",
    "endTime": "2024-02-01T16:00:00.000Z",
    "purpose": "Reunión de equipo GraphQL",
    "attendees": 8
  }
}
```

**Copiar el `id` de la reservación** para siguientes pasos.

### 4. Listar Reservaciones

**Request:** `Reservations → List Reservations`

```graphql
query ListReservations($roomId: ID, $status: ReservationStatus) {
  reservations(roomId: $roomId, status: $status) {
    id
    room {
      name
      location
    }
    title
    requesterEmail
    startsAt
    endsAt
    status
    participantsQuantity
    createdAt
  }
}
```

**Variables (opcionales):**
```json
{
  "date": "",
  "status": null,
  "roomId": "",
  "requesterEmail": ""
}
```

### 5. Actualizar Reservación

**Request:** `Reservations → Update Reservation`

⚠️ **IMPORTANTE:** Reemplazar `REPLACE_WITH_RESERVATION_ID` con el ID real.

```graphql
mutation UpdateReservation($id: ID!, $input: ReservationUpdateInput!) {
  updateReservation(id: $id, input: $input) {
    id
    title
    participantsQuantity
    startsAt
    endsAt
    createdAt
  }
}
```

### 6. Cancelar Reservación

**Request:** `Reservations → Cancel Reservation`

```graphql
mutation CancelReservation($id: ID!) {
  cancelReservation(id: $id) {
    id
    status
    updatedAt
  }
}
```

## 📚 Queries y Mutations Disponibles

### Rooms

| Operación | Tipo | Descripción |
|-----------|------|-------------|
| `rooms` | Query | Lista todas las salas con filtros opcionales |
| `room(id)` | Query | Obtiene una sala por ID |
| `createRoom(input)` | Mutation | Crea una nueva sala |
| `updateRoom(id, input)` | Mutation | Actualiza una sala existente |
| `deleteRoom(id)` | Mutation | Elimina una sala |

### Reservations

| Operación | Tipo | Descripción |
|-----------|------|-------------|
| `reservations` | Query | Lista todas las reservaciones con filtros |
| `reservation(id)` | Query | Obtiene una reservación por ID |
| `createReservation(input)` | Mutation | Crea una nueva reservación |
| `updateReservation(id, input)` | Mutation | Actualiza una reservación |
| `cancelReservation(id)` | Mutation | Cancela una reservación |

## 🔍 Verificar Token Relay

El GraphQL BFF implementa **Token Relay**, lo que significa que el token JWT que obtienes de Keycloak se pasa automáticamente a la API REST sin modificaciones.

### Cómo verificar:

1. **Revisar logs del BFF:**
   ```bash
   docker logs graphql-bff -f
   ```
   
   Deberías ver:
   ```
   {"level":"info","msg":"Query: rooms"}
   {"level":"debug","method":"get","url":"/rooms","hasAuth":true,"msg":"API Request"}
   ```

2. **Revisar logs de la API REST:**
   ```bash
   docker logs api-reservas -f
   ```
   
   Deberías ver el request con el token validado:
   ```
   {"level":"info","method":"GET","url":"/rooms","msg":"Incoming request"}
   ```

3. **Sin token válido:**
   - Quitar el token en Postman (Auth → Type: No Auth)
   - Hacer un request
   - Deberías recibir error 401:
     ```json
     {
       "errors": [
         {
           "message": "No se proporcionó token de autenticación",
           "extensions": {
             "code": "UNAUTHENTICATED"
           }
         }
       ]
     }
     ```

## 🐛 Troubleshooting

### Error: "No se pudo conectar con la API de reservas"

**Causa:** El BFF no puede conectarse a la API REST.

**Solución:**
```bash
# Verificar que los servicios estén corriendo
docker ps

# Verificar logs del BFF
docker logs graphql-bff

# Verificar que la API esté respondiendo
curl http://localhost:3001/health
```

### Error: "Token inválido"

**Causa:** El token de Keycloak no es válido o ha expirado.

**Solución:**
1. Obtener un nuevo token en Postman (Get New Access Token)
2. Verificar que Keycloak esté corriendo: http://localhost:8080

### Error: GraphQL validation failed

**Causa:** Variables mal formateadas o tipos incorrectos.

**Solución:**
1. Verificar que las variables estén en formato JSON válido
2. Verificar que los tipos coincidan con el schema (String, Int, ID, etc.)
3. Usar la pestaña **GraphQL Variables** en Postman (no **Body**)

## 📖 Recursos Adicionales

- **GraphQL Playground:** http://localhost:4000 (cuando el BFF esté corriendo)
- **Keycloak Admin:** http://localhost:8080 (admin/admin)
- **API REST OpenAPI:** http://localhost:3001/docs (si está configurado)

## 💡 Consejos

1. **Usar GraphQL Playground** para explorar el schema y autocomplete:
   - Abrir http://localhost:4000 en el navegador
   - Click en "DOCS" o "SCHEMA" para ver la documentación
   - Escribir queries con autocomplete

2. **Copiar queries del Playground a Postman** si lo prefieres visual

3. **Guardar IDs en variables de Postman:**
   - Después de crear una sala, copiar el ID
   - Variables → Agregar `room_id` con el valor
   - Usar `{{room_id}}` en otros requests

4. **Habilitar logs detallados:**
   ```bash
   # En docker-compose.yml, agregar:
   environment:
     - LOG_LEVEL=debug
   ```

---

**¿Necesitas ayuda?** Revisa los logs con `docker logs graphql-bff -f` y `docker logs api-reservas -f`.
