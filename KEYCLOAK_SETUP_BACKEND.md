# Configuración de Keycloak para Backend (Client Credentials)

## 🎯 Objetivo
Configurar un cliente para comunicación **Backend-to-Backend** (BFF → API REST) usando **Client Credentials Flow**.

---

## 📋 Crear Cliente para Backend (api-client)

Este cliente representa la API REST cuando necesita ser llamada por otros servicios (como el BFF).

### 1. Crear el Cliente

1. En Keycloak Admin Console, ve a **"Clients"**
2. Click en **"Create client"**
3. Configurar:
   - **Client type**: `OpenID Connect`
   - **Client ID**: `api-client`
   - Click "Next"

### 2. Configurar Capabilities

En "Capability config":
- **Client authentication**: `ON` (confidencial)
- **Authorization**: `OFF`
- **Standard flow**: `OFF` (no necesita login de usuario)
- **Direct access grants**: `OFF`
- **Implicit flow**: `OFF`
- **Service accounts roles**: `ON` ⭐ (esto habilita Client Credentials)
- Click "Next"

### 3. Login Settings

- Dejar todo vacío (no hay redirect porque es machine-to-machine)
- Click "Save"

### 4. Obtener Client Secret

1. Ve a la pestaña **"Credentials"**
2. Copia el **Client Secret**
3. Guárdalo en el `.env`:
   ```bash
   API_CLIENT_ID=api-client
   API_CLIENT_SECRET=<tu_client_secret>
   ```

---

## 🔧 Cómo usar Client Credentials en el BFF

El BFF debe obtener un token para llamar a la API REST:

```javascript
// En el BFF (graphql-bff)
const axios = require('axios');

async function getApiToken() {
  const response = await axios.post(
    `${process.env.KEYCLOAK_URL}/protocol/openid-connect/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'api-client',
      client_secret: process.env.API_CLIENT_SECRET,
      scope: 'openid'
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );
  
  return response.data.access_token;
}

// Usar el token para llamar a la API
async function callApiReservas(endpoint, options = {}) {
  const token = await getApiToken();
  
  return axios({
    url: `${process.env.API_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    },
    ...options
  });
}
```

---

## 📊 Resumen de Flujos

| Cliente | Flujo | Uso | Client Auth |
|---------|-------|-----|-------------|
| **postman-client** | Authorization Code | Testing manual | OFF (público) |
| **frontend-app** | Authorization Code + PKCE | React SPA | OFF (público) |
| **api-client** | Client Credentials | BFF → API REST | ON (confidencial) |

---

## ⚠️ Nota Importante

- **Client Credentials** NO tiene información de usuario (no hay `sub`, `email`, etc.)
- Es para comunicación **machine-to-machine**
- Si necesitas saber qué usuario hizo la acción, el BFF debe pasar el token del usuario original como contexto adicional

---

## 🔐 Mejora: Token Propagation

Para mantener el contexto del usuario cuando el BFF llama a la API:

### Opción 1: Token Relay (Recomendado)
El BFF recibe el token del usuario y lo reenvía a la API:

```javascript
// BFF simplemente pasa el token del usuario
async function callApiWithUserToken(endpoint, userToken, options = {}) {
  return axios({
    url: `${process.env.API_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${userToken}`, // Token del usuario original
      ...options.headers
    },
    ...options
  });
}
```

### Opción 2: Token Exchange
Intercambiar el token del usuario por un token específico para la API (más complejo, requiere configuración adicional en Keycloak).

---

## 🎓 Recomendación Final

Para tu proyecto, lo más simple y correcto es:

1. **Frontend → BFF**: Usuario se autentica con Authorization Code + PKCE
2. **BFF → API REST**: El BFF **reenvía el token del usuario** (Token Relay)
3. La API valida el token del usuario directamente

**Ventajas**:
- ✅ Mantiene el contexto del usuario
- ✅ No necesitas Client Credentials
- ✅ Más simple de implementar
- ✅ Los logs muestran qué usuario hizo cada acción

Esto es lo que deberías implementar. Solo usa Client Credentials si el BFF necesita hacer operaciones **sin contexto de usuario** (ej: tareas programadas, health checks, etc.).
