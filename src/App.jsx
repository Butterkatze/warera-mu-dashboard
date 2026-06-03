import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { getWarEraClient } from './api.js'; // Pfad zu deiner api.js anpassen
import MuDetails from './MuDetails';

// ==========================================
// KONFIGURATION - HIER EINFACH ANPASSEN
// ==========================================
const ARTICLE_ID = '6a1f025b37df43a8d01bb9a2'; 
// ==========================================

function App() {
  const [muData, setMuData] = useState({}); // Speichert die fertigen MU-Objekte für die UI
  const [loading, setLoading] = useState(true);
  const [selectedMuId, setSelectedMuId] = useState(null);
  
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem("warera_api_key") || "";
    } catch {
      return "";
    }
  });





  const fetchArticleAndMu = useCallback(async () => {
    setLoading(true);
    let extractedMuIds = [];

    try {

       
        const client = getWarEraClient();

         // 1. Artikel  aus Warera holen und IDs lesen
        const articleData = await client.article.getArticleById({ articleId: ARTICLE_ID });
        const text = articleData.content;
        
        const muRegex = /muId&quot;:&quot;([a-f0-9]{24})/g;
        let match;
        while ((match = muRegex.exec(text)) !== null) {
          extractedMuIds.push(match[1]); // match[1] enthält die reine 24-stellige ID
        }


        if (extractedMuIds.length === 0) {
          setMuData({});
          setLoading(false); // Stoppt das Laden, wenn nichts da ist
        }



        /* *********************************************************************************************************** */
        // MU Daten holen

        const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 Stunden
        const now = Date.now();

        // Für jede ID ein Promise erstellen
        const muDataPromises = extractedMuIds.map(async (id) => {
          const cacheKey = `mu_cache_${id}`;
          const cached = localStorage.getItem(cacheKey);

          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (now - timestamp < CACHE_DURATION) {
              return data; // Aus dem Cache laden
            }
          }

          try {
            // Live-Abfrage über das SDK (wird durch Promise.all automatisch gebatched!)
            const response = await client.mu.getById({ muId: id });
            const freshData = response?.result?.data || response;

            localStorage.setItem(cacheKey, JSON.stringify({
              data: freshData,
              timestamp: now
            }));

            return freshData;
          } catch  {
            return { _id: id, name: `Fehler beim Laden (${id.substring(0,4)})`, members: [] };
          }
        });

        // Alle Promises parallel auflösen (SDK fasst sie zusammen)
        const resolvedMus = await Promise.all(muDataPromises);

      
        // Daten für die UI gruppieren
        setMuData({
          "Alle Militäreinheiten": resolvedMus
        });

      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      } finally {
        setLoading(false);
      }
    }, []);

      /*

      // 3. Struktur für die UI aufbauen
      // Da das tRPC-HTML keine [Divisionen] mehr als reinen Text liefert,
      // mappen wir die IDs zu Objekten, die deine UI (wie zuvor) erwarten könnte.
      const grouped = {
        "Alle MUs": extractedMuIds.map(id => ({
          id: id,
          name: `Militäreinheit (ID: ${id.substring(0, 6)}...)` // Temporärer Name, bis die Details geladen werden
        }))
      };

      setMuData(grouped);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setLoading(false);
    }
  };

  */

  const handleMuClick = (muId) => {
    setSelectedMuId(muId); // Setzt die ID der angeklickten Einheit
  };


  // Kein Plan was hier läuft aber der Linter rastet sonst aus
  useEffect(() => {
    // Verpackt den Aufruf in einen asynchronen Makrotask (0 Millisekunden Verzögerung) 
    const timer = setTimeout(() => {
      fetchArticleAndMu();
    }, 0);
  
    // Sauberes Aufräumen, falls die Komponente unmountet
    return () => clearTimeout(timer);
  }, [fetchArticleAndMu]);




  useEffect(() => {
    try {
      localStorage.setItem("warera_api_key", apiKey.trim());
    } catch { // hjfdhsf
    }
  }, [apiKey]);

  // WENN EINE ID GEWÄHLT IST: Zeige die Detail-Komponente anstatt der Übersicht
  if (selectedMuId) {
    return (
      <div className="container">
        <MuDetails muId={selectedMuId} onBack={() => setSelectedMuId(null)} />
      </div>
    );
  }


  return (
    <div className="container">
      {/* ===== API KEY EINSTELLUNG ===== */}
    <div style={{ padding: '15px', background: 'var(--card-bg)', borderRadius: '5px', marginBottom: '20px' }}>
      <label style={{ color: 'var(--accent-blue)', marginRight: '10px' }}>WarEra API-Key:</label>
      <input
        type="password" 
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Hier API-Key einfügen..."
        style={{ padding: '5px', width: '300px', borderRadius: '3px', border: '1px solid solid var(--border-color)' }}
      />
      {apiKey && <span style={{ color: 'var(--accent-gold)', marginLeft: '10px' }}>✓ Aktiv</span>}
    </div>

      {/* Header */}
      <header>
        <div>
          <h1>Deutsche Military Units</h1>
          <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0' }}>
            Offizielle Einstufung der Bundesrepublik (Live-Daten)
          </p>
        </div>
        <button className="update-btn" onClick={fetchArticleAndMu} disabled={loading}>
          {loading ? 'Lädt...' : 'Daten aktualisieren'}
        </button>
      </header>

      {/* Hauptbereich */}
      <main>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Daten werden geladen...</p>
        ) : Object.keys(muData).length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Keine MUs gefunden. Überprüfe die Artikel-ID und den Inhalt.
          </p>
        ) : (
          // SCHLEIFE START: Läuft durch alle gefundenen Divisionen
          Object.keys(muData).map((divisionName) => {
            
            // HIER IST DIE NEUE FLEXIBLE KLASSIFIZIERUNG:
            // Macht aus "[Division 1]" -> "division-1" oder aus "[Ausbildung]" -> "ausbildung"
            const cssSafeName = divisionName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .trim();

            const divisionClass = `division-section ${cssSafeName}`;

            return (
              <section key={divisionName} className={divisionClass}>
                <h2 className="division-title">{divisionName}</h2>
                <table className="mu-table">
                  <tbody>
                    {muData[divisionName].map((mu) => (
                      <tr 
                        key={mu.id} 
                        className="mu-row" 
                        onClick={() => handleMuClick(mu.id)}
                      >
                        <td className="mu-cell cell-logo">
                          <div className="mu-logo-placeholder">
                            {mu.name ? mu.name.substring(0, 2).toUpperCase() : 'MU'}
                          </div>
                        </td>
                        <td className="mu-cell cell-name">{mu.name}</td>
                        <td className="mu-cell cell-stats">👥 {mu.memberCount} Mitglieder</td>
                        <td className="mu-cell cell-stats">
                          ⚔️ {mu.totalDamage?.toLocaleString('de-DE')} DMG
                        </td>
                        <td className="mu-cell cell-action">➔</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}

export default App;