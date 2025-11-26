# Script para configurar Keycloak rapidamente en Windows
# Uso: .\scripts\setup-keycloak.ps1

Write-Host "Configuracion de Keycloak para CoworkReserve" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASS = "admin"
$REALM = "cowork"
$CLIENT_ID = "postman-client"

Write-Host "Esperando a que Keycloak este listo..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0
$isReady = $false

while (-not $isReady -and $attempt -lt $maxAttempts) {
    try {
        $null = Invoke-WebRequest -Uri $KEYCLOAK_URL -Method Head -TimeoutSec 2 -ErrorAction Stop
        $isReady = $true
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 5
        $attempt++
    }
}

Write-Host ""

if ($isReady) {
    Write-Host "Keycloak esta listo!" -ForegroundColor Green
} else {
    Write-Host "Timeout esperando a Keycloak. Verifica que el contenedor este corriendo." -ForegroundColor Red
    Write-Host "   Ejecuta: docker compose up -d keycloak" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Para completar la configuracion, sigue estos pasos manualmente:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Accede a: $KEYCLOAK_URL" -ForegroundColor White
Write-Host "   Usuario: $ADMIN_USER" -ForegroundColor Gray
Write-Host "   Password: $ADMIN_PASS" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Crea el realm '$REALM' si no existe" -ForegroundColor White
Write-Host ""
Write-Host "3. Crea un cliente '$CLIENT_ID' con:" -ForegroundColor White
Write-Host "   - Client authentication: OFF (cliente publico)" -ForegroundColor Gray
Write-Host "   - Standard flow: ON (Authorization Code)" -ForegroundColor Gray
Write-Host "   - Direct access grants: OFF (NO usar password)" -ForegroundColor Gray
Write-Host "   - Valid redirect URIs: https://oauth.pstmn.io/v1/callback" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Crea un usuario de prueba con:" -ForegroundColor White
Write-Host "   - Username: admin" -ForegroundColor Gray
Write-Host "   - Email: admin@cowork.local" -ForegroundColor Gray
Write-Host "   - Password: admin123 (Temporary: OFF)" -ForegroundColor Gray
Write-Host ""
Write-Host "5. (Opcional) Crea un rol 'admin' y asignalo al usuario" -ForegroundColor White
Write-Host ""
Write-Host "Documentacion completa en: KEYCLOAK_SETUP.md" -ForegroundColor Cyan
Write-Host ""

# Abrir el navegador automáticamente
Write-Host "Abriendo Keycloak en el navegador..." -ForegroundColor Yellow
Start-Process $KEYCLOAK_URL

Write-Host ""
Write-Host "Script completado exitosamente!" -ForegroundColor Green
