import apm from "elastic-apm-node";

const serviceName = process.env.APM_SERVICE_NAME || "api-reservas";
const serverUrl = process.env.APM_SERVER_URL || "http://apm-server:8200";
const environment = process.env.NODE_ENV || "development";

// Inicializar APM solo si está configurado
if (serverUrl && serverUrl !== "disabled") {
  apm.start({
    serviceName,
    serverUrl,
    environment,
    captureBody: "all",
    captureHeaders: true,
    logLevel: "info",
    metricsInterval: "30s",
    transactionSampleRate: 1.0, // 100% en dev, reducir en prod
  });

  console.log(`[apm] Conectado a ${serverUrl} como ${serviceName}`);
} else {
  console.log("[apm] APM deshabilitado");
}

export default apm;
