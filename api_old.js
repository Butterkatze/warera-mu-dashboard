const API_BASE =  'https://gateway.warerastats.io/trpc/'; //"https://api2.warera.io"; //Original API vs Gateway

export async function apiCall(endpoint, method = "POST", body = null, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    const headers = { "Content-Type": "application/json" };
    try {
      const apiKey = localStorage.getItem("warera_api_key");
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
        headers["x-api-key"] = apiKey.trim();
      }
    } catch {
        //hjsadjk
    }

    // Konfiguration für den Fetch zusammenbauen
    const fetchOptions = { method, headers };
    if (method !== "GET" && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const r = await fetch(API_BASE + endpoint, { ...fetchOptions });

    if (!r.ok) {
      if (r.status === 429 && attempt < maxRetries) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        window.dispatchEvent(new CustomEvent('warera-rate-limit', { detail: { delay, attempt, endpoint } }));
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      let d;
      try { d = await r.json(); } catch { throw new Error(`HTTP Error ${r.status}`); }
      if (Array.isArray(d)) d = d[0];
      if (d && d.error) throw new Error(d.error.data?.code || d.error.message || `API Error HTTP ${r.status}`);
      throw new Error(`API Error HTTP ${r.status}`);
    }

    let d;
    try { d = await r.json(); } catch { throw new Error("Invalid JSON response"); }
    if (Array.isArray(d)) d = d[0];
    if (d && d.error) throw new Error(d.error.data?.code || d.error.message || "API Error");
    

    return d?.result?.data !== undefined ? d.result.data : d;
  }
}