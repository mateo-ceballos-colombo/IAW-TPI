# Configuración de Keycloak para Authorization Code + PKCE

## 1. Acceso a Keycloak

1. Accede a: http://localhost:8080
2. Click en **Administration Console**
3. Login:
   - Username: `admin`
   - Password: `admin`

## 2. Crear Realm

1. Click en el dropdown del realm (arriba izquierda, dice "master")
2. Click en **Create Realm**
3. **Realm name**: `coworkreserve`
4. Click **Create**

## 3. Crear Roles

1. En el menú izquierdo → **Realm roles**
2. Click **Create role**
3. **Role name**: `admin`
4. Click **Save**
5. (Opcional) Repetir para crear rol `user`

## 4. Crear Cliente

1. En el menú izquierdo → **Clients**
2. Click **Create client**
3. **General Settings**:
   - **Client type**: `OpenID Connect`
   - **Client ID**: `cowork-api`
4. Click **Next**
5. **Capability config**:
   - **Client authentication**: `OFF` (cliente público)
   - **Authorization**: `OFF`
   - **Standard flow**: `ON` ← Authorization Code
   - **Direct access grants**: `OFF` ← deshabilita Password Grant
   - **Implicit flow**: `OFF`
6. Click **Next**
7. **Login settings**:
   - **Valid redirect URIs**: `https://oauth.pstmn.io/v1/callback`
   - **Web origins**: `*`
8. Click **Save**

> **Nota:** PKCE está habilitado por defecto para clientes públicos en Keycloak 24.x

## 5. Crear Usuario

1. En el menú izquierdo → **Users**
2. Click **Add user**
3. Completa:
   - **Username**: `tpi-admin`
   - **Email verified**: `ON`
4. Click **Create**
5. En la pestaña **Credentials**:
   - Click **Set password**
   - **Password**: `tpi-admin`
   - **Temporary**: `OFF`
   - Click **Save**
6. En la pestaña **Role mappings**:
   - Click **Assign role**
   - Selecciona el rol `admin`
   - Click **Assign**

## 6. Deshabilitar Required Actions (para Password Grant en desarrollo)

1. En el menú izquierdo → **Authentication**
2. Tab **Required actions**
3. Para cada acción, asegúrate que **Default action** esté en `OFF`:
   - Configure OTP
   - Verify Email
   - Update Password
   - Update Profile

## 7. Configuración en Postman

### En tu request (ej: GET http://localhost:3000/v1/rooms)

1. Tab **Authorization** → Type: `OAuth 2.0`
2. **Configure New Token**:
   - **Token Name**: `cowork-token`
   - **Grant Type**: `Authorization Code (With PKCE)`
   - **Callback URL**: `https://oauth.pstmn.io/v1/callback` ✓ Authorize using browser
   - **Auth URL**: `http://localhost:8080/realms/coworkreserve/protocol/openid-connect/auth`
   - **Access Token URL**: `http://localhost:8080/realms/coworkreserve/protocol/openid-connect/token`
   - **Client ID**: `cowork-api`
   - **Client Secret**: (vacío)
   - **Code Challenge Method**: `SHA-256`
   - **Scope**: `openid profile email`
   - **Client Authentication**: `Send as Basic Auth header`

3. Click **Get New Access Token**
4. Se abre navegador → Login con `tpi-admin` / `tpi-admin`
5. Click **Use Token**

## 8. Verificación

- El token debe contener el rol `admin` en `realm_access.roles`
- No se requieren cambios en el código de la API
