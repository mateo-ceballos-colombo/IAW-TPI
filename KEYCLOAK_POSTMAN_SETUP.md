# Guía de Configuración de Keycloak para API-Reservas

## 🎯 Objetivo
Configurar Keycloak para autenticar requests a la API desde Postman.

---

## 📋 Pasos de Configuración

### 1. Acceder a Keycloak Admin Console

1. Asegúrate de que el contenedor esté corriendo:
   ```bash
   docker compose up -d keycloak
   ```

2. Accede a: **http://localhost:8080**

3. Click en "Administration Console"

4. Login con las credenciales del `.env`:
   - **Username**: `admin`
   - **Password**: `admin`

---

### 2. Verificar/Crear el Realm "cowork"

1. En el menú superior izquierdo, verifica que estés en el realm **"cowork"**
2. Si no existe, créalo:
   - Click en el dropdown del realm (arriba a la izquierda)
   - Click en "Create Realm"
   - **Realm name**: `cowork`
   - **Enabled**: ON
   - Click "Create"

---

### 3. Crear un Cliente para Postman

El cliente representa tu aplicación (en este caso, Postman para testing).

**IMPORTANTE**: Usaremos el flujo **Authorization Code** (sin PKCE) para simplificar las pruebas desde Postman.

1. En el menú lateral, click en **"Clients"**
2. Click en **"Create client"**
3. Configurar:
   - **Client type**: `OpenID Connect`
   - **Client ID**: `postman-client`
   - Click "Next"

4. En "Capability config":
   - **Client authentication**: `OFF` (público para Authorization Code)
   - **Authorization**: `OFF`
   - **Standard flow**: `ON` (esto habilita Authorization Code)
   - **Direct access grants**: `OFF` (NO usar password grant)
   - **Implicit flow**: `OFF` (deprecated)
   - **Service accounts roles**: `OFF`
   - Click "Next"

5. En "Login settings":
   - **Root URL**: `http://localhost:3001`
   - **Valid redirect URIs**: 
     - `https://oauth.pstmn.io/v1/callback` (para Postman)
     - `http://localhost:3000/*` (para el frontend React)
   - **Valid post logout redirect URIs**: `*`
   - **Web origins**: `*`
   - Click "Save"

**NOTA**: No habrá pestaña "Credentials" porque es un cliente público (sin client secret).

---

### 4. Crear un Usuario de Prueba

1. En el menú lateral, click en **"Users"**
2. Click en **"Add user"**
3. Configurar:
   - **Username**: `admin` (o el que prefieras)
   - **Email**: `admin@cowork.local`
   - **Email verified**: `ON`
   - **First name**: `Admin`
   - **Last name**: `CoworkReserve`
   - Click "Create"

4. Ve a la pestaña **"Credentials"**:
   - Click en "Set password"
   - **Password**: `admin123` (o el que prefieras)
   - **Temporary**: `OFF` (para que no pida cambio)
   - Click "Save"
   - Confirma "Save password"

---

### 5. Crear Rol "admin" (Opcional pero Recomendado)

1. En el menú lateral, click en **"Realm roles"**
2. Click en **"Create role"**
3. Configurar:
   - **Role name**: `admin`
   - **Description**: `Administrador del coworking`
   - Click "Save"

4. Asignar el rol al usuario:
   - Ve a **"Users"** → Selecciona tu usuario
   - Ve a la pestaña **"Role mapping"**
   - Click en "Assign role"
   - Busca y selecciona el rol `admin`
   - Click "Assign"

---

## 🧪 Probar desde Postman

### Usar Authorization Code Flow (Recomendado)

Este es el flujo correcto que debes usar para testing.

#### En Postman:

1. Crea una nueva request (ej: GET /rooms)
2. Ve a la pestaña **"Authorization"**
3. Type: **OAuth 2.0**
4. Configure New Token:
   - **Token Name**: `Keycloak Token`
   - **Grant Type**: `Authorization Code` ⭐
   - **Callback URL**: `https://oauth.pstmn.io/v1/callback`
   - **Auth URL**: `http://localhost:8080/realms/cowork/protocol/openid-connect/auth`
   - **Access Token URL**: `http://localhost:8080/realms/cowork/protocol/openid-connect/token`
   - **Client ID**: `postman-client`
   - **Client Secret**: (dejar vacío, es cliente público)
   - **Scope**: `openid profile email`
   - **Client Authentication**: `Send as Basic Auth header`
5. Click en **"Get New Access Token"**
6. Se abrirá una ventana de navegador → Login con `admin` / `admin123`
7. Keycloak redirige a Postman con el token
8. Click en **"Use Token"**

**Ventajas**:
- ✅ Flujo correcto y seguro
- ✅ No expones credenciales en Postman
- ✅ Simula el comportamiento real del frontend
- ✅ Es el mismo flujo que usará tu React app

---

## 🔍 Probar la API

### 1. Health Check (Sin Autenticación)

```http
GET http://localhost:3001/health
```

Debe responder:
```json
{
  "ok": true,
  "service": "api-reservas",
  "timestamp": "2025-11-25T..."
}
```

### 2. Crear una Sala (Con Autenticación)

```http
POST http://localhost:3001/rooms
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "name": "Sala Principal",
  "description": "Sala principal del coworking",
  "capacity": 10,
  "location": "Piso 1"
}
```

### 3. Listar Salas

```http
GET http://localhost:3001/rooms
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### 4. Listar con Filtros

```http
GET http://localhost:3001/rooms?minCapacity=5&location=Piso
Authorization: Bearer <TU_ACCESS_TOKEN>
```

---

## ⚠️ Problemas Comunes

### 1. Error: "Token inválido o expirado"
- **Solución**: El token expira en 5 minutos. Genera uno nuevo.

### 2. Error: "Invalid client or Invalid client credentials"
- **Solución**: Verifica que el `client_secret` sea correcto y que "Client authentication" esté en ON.

### 3. Error: "Invalid user credentials"
- **Solución**: Verifica el username/password del usuario en Keycloak.

### 4. Error: "ECONNREFUSED connecting to Keycloak"
- **Solución**: Desde el contenedor de la API, Keycloak está en `http://keycloak:8080`, pero desde Postman (tu máquina) es `http://localhost:8080`.

### 5. Error de CORS
- **Solución**: En la configuración del cliente en Keycloak, agrega `*` en "Web origins".

---

## 🔧 Variable de Entorno en Postman

Para facilitar el testing, crea una Collection en Postman con estas variables:

```json
{
  "baseUrl": "http://localhost:3001",
  "keycloakUrl": "http://localhost:8080/realms/cowork",
  "clientId": "postman-client",
  "clientSecret": "<TU_CLIENT_SECRET>",
  "username": "admin",
  "password": "admin123"
}
```

Luego usa `{{baseUrl}}`, `{{keycloakUrl}}`, etc. en tus requests.

---

## 📦 Script Pre-request en Postman (Opcional)

Para obtener el token automáticamente antes de cada request:

```javascript
pm.sendRequest({
    url: pm.collectionVariables.get("keycloakUrl") + "/protocol/openid-connect/token",
    method: 'POST',
    header: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: {
        mode: 'urlencoded',
        urlencoded: [
            { key: "grant_type", value: "password" },
            { key: "client_id", value: pm.collectionVariables.get("clientId") },
            { key: "client_secret", value: pm.collectionVariables.get("clientSecret") },
            { key: "username", value: pm.collectionVariables.get("username") },
            { key: "password", value: pm.collectionVariables.get("password") },
            { key: "scope", value: "openid" }
        ]
    }
}, function (err, res) {
    if (err) {
        console.log(err);
    } else {
        const jsonData = res.json();
        pm.collectionVariables.set("accessToken", jsonData.access_token);
    }
});
```

Y en el header de Authorization usa: `Bearer {{accessToken}}`

---

## 🎓 Notas Importantes

1. **En Producción**: Usarías el flujo Authorization Code + PKCE desde el frontend React.
2. **Para Testing**: El flujo Password Credentials es aceptable.
3. **Roles**: El código actual no valida roles (está comentado), pero puedes habilitarlo descomentando las líneas en `authMiddleware.js`.
4. **Expiración**: Los tokens expiran en 5 minutos por defecto. Usa el `refresh_token` para renovarlos.

---

## 📚 Recursos

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OAuth 2.0 Password Grant](https://oauth.net/2/grant-types/password/)
- [Postman OAuth 2.0](https://learning.postman.com/docs/sending-requests/authorization/#oauth-20)
