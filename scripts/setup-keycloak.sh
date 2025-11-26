#!/bin/bash

# Script para configurar Keycloak rápidamente
# Uso: ./scripts/setup-keycloak.sh

echo "🔐 Configuración de Keycloak para CoworkReserve"
echo "================================================"
echo ""

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin"
REALM="cowork"
CLIENT_ID="postman-client"

echo "⏳ Esperando a que Keycloak esté listo..."
until $(curl --output /dev/null --silent --head --fail ${KEYCLOAK_URL}); do
    printf '.'
    sleep 5
done
echo ""
echo "✅ Keycloak está listo"
echo ""

echo "📝 Para completar la configuración, sigue estos pasos manualmente:"
echo ""
echo "1. Accede a: ${KEYCLOAK_URL}"
echo "   Usuario: ${ADMIN_USER}"
echo "   Password: ${ADMIN_PASS}"
echo ""
echo "2. Crea el realm '${REALM}' si no existe"
echo ""
echo "3. Crea un cliente '${CLIENT_ID}' con:"
echo "   - Client authentication: ON"
echo "   - Direct access grants: ON"
echo "   - Valid redirect URIs: https://oauth.pstmn.io/v1/callback"
echo ""
echo "4. Copia el Client Secret desde la pestaña Credentials"
echo ""
echo "5. Crea un usuario de prueba con:"
echo "   - Username: admin"
echo "   - Email: admin@cowork.local"
echo "   - Password: admin123 (Temporary: OFF)"
echo ""
echo "6. (Opcional) Crea un rol 'admin' y asígnalo al usuario"
echo ""
echo "📚 Documentación completa en: KEYCLOAK_SETUP.md"
echo ""
