import { createAPIClient } from "@wareraprojects/api";

// Wir exportieren eine Funktion, die IMMER den aktuellsten Key aus dem Browser zieht
export function getWarEraClient() {
  const apiKey = localStorage.getItem("warera_api_key") || "";
  
  // Hier wird der Client mit dem Key des Users initialisiert
  return createAPIClient({
    apiKey: apiKey.trim()
  });
}