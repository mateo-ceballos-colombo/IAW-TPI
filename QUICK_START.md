# ===============================================
# GUÍA RÁPIDA: Prueba de API con Keycloak
# ===============================================

## 🚀 Inicio Rápido (3 pasos)

### 1. Levantar los servicios
```bash
docker compose up -d keycloak mongodb api-reservas
```

### 2. Configurar Keycloak (5 minutos)

Ejecuta el script automático:
```bash
# Windows PowerShell
.\scripts\setup-keycloak.ps1

# Linux/Mac
chmod +x scripts/setup-keycloak.sh
./scripts/setup-keycloak.sh
```

O sigue la guía manual completa en: `KEYCLOAK_SETUP.md`

**Configuración mínima requerida:**
1. Accede a http://localhost:8080 (admin/admin)
2. Crea realm "cowork" (si no existe)
3. Crea cliente "postman-client" con:
   - Client authentication: **OFF** (cliente público)
   - Standard flow: **ON** (Authorization Code)
   - Direct access grants: **OFF** (no usar password)
   - Valid redirect URIs: `https://oauth.pstmn.io/v1/callback`
4. Crea usuario "admin" con password "admin123"

**NOTA**: No necesitas Client Secret porque es un cliente público.

### 3. Importar colección en Postman

1. Importa: `postman_collection.json`
2. Abre cualquier request de /rooms
3. Ve a Authorization > OAuth 2.0
4. Click en "Get New Access Token"
5. Login en el navegador (admin/admin123)
6. ¡Listo! El token se usa automáticamente

---

## 🔍 Cómo Funciona la Autenticación

### Arquitectura OAuth2 + JWT

```
[Postman] 
    ↓ 1. GET /authorize (redirige al navegador)
[Navegador] 
    ↓ 2. Usuario ingresa credenciales en Keycloak
[Keycloak] 
    ↓ 3. Redirige con authorization code
[Postman]
    ↓ 4. POST /token con el code
[Keycloak]
    ↓ 5. Responde con JWT (RS256)
[Postman]
    ↓ 6. GET /rooms (Authorization: Bearer <JWT>)
[API-Reservas]
    ↓ 7. Valida JWT con clave pública de Keycloak
    ↓ 8. Si es válido, procesa la request
[MongoDB]
```

### ¿Qué valida el authMiddleware?

1. **Presencia del token**: Header `Authorization: Bearer <token>`
2. **Firma del token**: Verifica con claves públicas de Keycloak (RS256)
3. **Issuer**: Debe ser `http://keycloak:8080/realms/cowork`
4. **Expiración**: Tokens expiran en 5 minutos por defecto
5. **Estructura**: Extrae `sub`, `email`, `roles` del payload

---

## 🧪 Probar Endpoints

### Sin autenticación (Health Check)
```bash
curl http://localhost:3001/health
```

### Con autenticación (Usando Authorization Code Flow)

#### Opción 1: Desde Postman (Recomendado)

1. Importa la colección `postman_collection.json`
2. Abre un request de /rooms
3. Ve a **Authorization** > Type: **OAuth 2.0**
4. Configura:
   - Grant Type: `Authorization Code`
   - Auth URL: `http://localhost:8080/realms/cowork/protocol/openid-connect/auth`
   - Access Token URL: `http://localhost:8080/realms/cowork/protocol/openid-connect/token`
   - Client ID: `postman-client`
   - Scope: `openid profile email`
   - Redirect URI: `https://oauth.pstmn.io/v1/callback`
5. Click **"Get New Access Token"**
6. Se abre navegador → Login con `admin` / `admin123`
7. Click **"Use Token"**
8. Ejecuta el request

#### Opción 2: Desde curl (Solo para debugging, requiere token manual)

Si ya tienes un token:
```bash
curl -X POST http://localhost:3001/rooms \
  -H "Authorization: Bearer <TU_TOKEN_AQUI>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sala Principal",
    "capacity": 10,
    "location": "Piso 1"
  }'
```

---

## 📋 Endpoints Disponibles

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/health` | ❌ No | Health check |
| `GET` | `/rooms` | ✅ Sí | Listar salas |
| `GET` | `/rooms/:id` | ✅ Sí | Obtener sala |
| `POST` | `/rooms` | ✅ Sí | Crear sala |
| `PUT` | `/rooms/:id` | ✅ Sí | Actualizar sala |
| `DELETE` | `/rooms/:id` | ✅ Sí | Eliminar sala |

### Filtros disponibles en GET /rooms:
- `?name=Sala` - Búsqueda parcial (case-insensitive)
- `?minCapacity=5` - Capacidad mínima
- `?maxCapacity=20` - Capacidad máxima
- `?location=Piso` - Búsqueda parcial en ubicación

---

## ⚠️ Problemas Comunes

### Error: "Token inválido o expirado"
**Causa**: Los tokens JWT expiran en 5 minutos.
**Solución**: Genera un nuevo token.

### Error: "Invalid client credentials"
**Causa**: Client Secret incorrecto o cliente mal configurado.
**Solución**: 
1. Verifica el Client Secret en Keycloak
2. Asegúrate de que "Client authentication" esté ON

### Error: "Invalid user credentials"
**Causa**: Usuario o contraseña incorrectos.
**Solución**: Verifica las credenciales en Keycloak Users.

### Error: ECONNREFUSED Keycloak
**Causa**: Contenedor de Keycloak no está corriendo.
**Solución**: `docker compose up -d keycloak`

### Error: "ID de sala inválido"
**Causa**: El ID no es un ObjectId válido de MongoDB.
**Solución**: Usa un ID válido (24 caracteres hexadecimales).

---

## 🎓 Notas sobre la Arquitectura

### ¿Por qué Authorization Code y no Password Grant?

**Authorization Code (lo que usamos):**
- ✅ Estándar OAuth2 recomendado
- ✅ Las credenciales solo las ve Keycloak
- ✅ Más seguro: el cliente nunca ve la password
- ✅ Es el mismo flujo que usa tu React app

**Password Grant (DEPRECATED):**
- ❌ Deprecated por OAuth 2.1
- ❌ El cliente (Postman) maneja las credenciales
- ❌ Menos seguro
- ❌ No se debe usar en producción

**Client Credentials:**
- ✅ Correcto para machine-to-machine (BFF → API)
- ❌ No tiene información de usuario
- ❌ No sirve para testing manual

### ¿Por qué no PKCE en Postman?

PKCE (Proof Key for Code Exchange) es una extensión de Authorization Code que:
- Es **obligatorio** para SPAs (React, Angular, Vue)
- Postman **sí lo soporta**, pero agrega complejidad sin beneficio para testing
- Para producción (React), SÍ usarás PKCE

**Resumen**:
- **Testing (Postman)**: Authorization Code (sin PKCE) ✅
- **Producción (React)**: Authorization Code + PKCE ✅
- **Backend-to-Backend (BFF→API)**: Token Relay o Client Credentials ✅

### ¿Por qué RS256 y no HS256?

- **RS256**: Firma asimétrica (clave privada en Keycloak, pública en API)
- **HS256**: Firma simétrica (misma clave en ambos lados)
- ✅ RS256 es más seguro en arquitecturas distribuidas

### ¿Dónde se validan los tokens?

Según el ADR: **"La validación de tokens JWT se realiza solo en la frontera"**

Servicios que validan:
- ✅ API REST (`api-reservas`) - Valida token del usuario o del BFF
- ✅ GraphQL BFF - Valida token del usuario del frontend
- ✅ WebSocket Server - Valida token del usuario

Servicios que NO validan:
- ❌ Workers (confianza interna)
- ❌ Scheduler (confianza interna)

### Flujo completo de autenticación

```
[Usuario] 
    ↓ Login en React (Authorization Code + PKCE)
[Frontend React]
    ↓ Obtiene token JWT del usuario
    ↓ Hace queries GraphQL con el token
[GraphQL BFF]
    ↓ Valida token del usuario
    ↓ Llama a API REST pasando el mismo token (Token Relay)
[API REST]
    ↓ Valida token del usuario
    ↓ Procesa la request
    ↓ Registra en logs: usuario X hizo acción Y
[MongoDB]
```

**Ventaja**: Trazabilidad completa - siempre sabes qué usuario hizo cada acción.

---

## 📚 Recursos

- **Documentación completa**: `KEYCLOAK_SETUP.md`
- **OpenAPI Spec**: `services/api-reservas/openapi.yaml`
- **Colección Postman**: `postman_collection.json`
- **Keycloak Docs**: https://www.keycloak.org/documentation
- **OAuth2 RFC**: https://oauth.net/2/

---

## ✅ Checklist de Verificación

Antes de probar, asegúrate de que:

- [ ] Contenedores corriendo: `docker compose ps`
- [ ] Keycloak accesible: http://localhost:8080
- [ ] Realm "cowork" creado
- [ ] Cliente "postman-client" configurado:
  - [ ] Client authentication = OFF (público)
  - [ ] Standard flow = ON
  - [ ] Direct access grants = OFF
  - [ ] Valid redirect URIs = `https://oauth.pstmn.io/v1/callback`
- [ ] Usuario de prueba creado (admin/admin123)
- [ ] Colección de Postman importada
- [ ] Authorization Code configurado en Postman
- [ ] Token obtenido mediante navegador
- [ ] Health check responde: `curl http://localhost:3001/health`

¡Listo para probar! 🚀
