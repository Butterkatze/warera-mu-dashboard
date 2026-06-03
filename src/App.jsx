import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { getWarEraClient } from './api.js'; // Pfad zu deiner api.js anpassen
import MuDetails from './MuDetails';

// ==========================================
// KONFIGURATION - HIER EINFACH ANPASSEN
// ==========================================
const ARTICLE_ID = '6a1f025b37df43a8d01bb9a2'; 
// ==========================================



//Token-Checker
function  Settings({ apiKey, setApiKey }) {
  const [isEditing, setIsEditing] = useState(!apiKey);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleValidateKey = async (e) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();

    const warEraKeyRegex = /^wae_[0-9a-f]{64}$/; 
    
    if (!cleanKey) {
      setStatus({ type: 'error', message: 'Bitte gib einen API-Token ein.' });
      return;
    }

    if (!warEraKeyRegex.test(cleanKey)) {
      setStatus({ type: 'error', message: 'Falsches Format.' });
      return;
    }
    

    setStatus({ type: 'loading', message: '...' });

    try {
      localStorage.setItem('warera_api_key', cleanKey);
      const client = getWarEraClient();

      // Test-Call an einen existierenden Endpunkt
      await client.article.getArticleById({ articleId: ARTICLE_ID });

      setStatus({ type: 'success', message: '✓' });

      setTimeout(() => {
        setIsEditing(false);
        setStatus({ type: '', message: '' });
      }, 1000);

    } catch (error) {
      console.error(error);
      localStorage.removeItem('warera_api_key');
      setStatus({ type: 'error', message: 'Ungültig!' });
    }
  };
    return (
      <div style={{ position: 'relative', background: 'var(--bg-color)', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
        
        {/* Toggle-Button oben rechts */}
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            style={{ position: 'absolute', top: '12px', right: '15px', background: 'none', border: 'none', color: 'var(--text-muted, #888)', cursor: 'pointer', fontSize: '1rem' }}
            title="API-Key bearbeiten"
          >
            ⚙️
          </button>
        )}
  
        {isEditing ? (
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted, #aaa)', display: 'block', marginBottom: '5px' }}>
              API-Token
            </label>
            <form onSubmit={handleValidateKey} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="wae_..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #444)',
                  background: 'var(--bg-input, #111)',
                  color: 'var(--text-main, #fff)',
                  fontSize: '0.9rem'
                }}
              />
              <button 
                type="submit" 
                disabled={status.type === 'loading'}
                style={{
                  padding: '6px 12px',
                  background: status.type === 'success' ? '#2ec4b6' : 'var(--accent-blue, #007bff)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {status.type === 'loading' ? 'Prüfe...' : 'Check'}
              </button>
  
              {/* Kleiner Haken/Pfeil zum manuellen Abbrechen (nur wenn schon ein Key existiert) */}
              {apiKey && (
                <button 
                  type="button" 
                  onClick={() => { setIsEditing(false); setStatus({ type: '', message: '' }); }}
                  style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ▲
                </button>
              )}
            </form>
  
            {status.message && (
              <span style={{ 
                display: 'block',
                marginTop: '5px', 
                fontSize: '0.8rem', 
                color: status.type === 'success' ? '#2ec4b6' : '#e74c3c',
                fontWeight: '600'
              }}>
                {status.message}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#2ec4b6' }}>
            <span>🔒 API-Token aktiv</span>
            <span style={{ animation: 'fadeIn 0.5s' }}>✓</span>
          </div>
        )}
      </div>
    );
}



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
    //let extractedMuIds = [];

    try {

        //Artikel  aus Warera holen und IDs lesen
        const client = getWarEraClient();
        const articleData = await client.article.getArticleById({ articleId: ARTICLE_ID });
        const text = articleData.content || "";

        // Divisions Namen Parser
        
        const parts = text.split(/<h2[^>]*>/);
      
        const tempGroupedIds = {};
        
        parts.forEach((part, index) => {
        // Der erste Teil vor dem ersten <h2> hat keine Überschrift
        if (index === 0) return; 
        
        // Extrahiere den Divisionsnamen (alles bis zum schließenden </h2>)
        const nameMatch = part.match(/([^<]+)<\/h2>/);
        if (!nameMatch) return;
        
        const divisionName = nameMatch[1].trim();
        tempGroupedIds[divisionName] = [];

          // MU ID Parser 
          const muRegex = /muId&quot;:&quot;([a-f0-9]{24})/g;
          let match;
          while ((match = muRegex.exec(part)) !== null) {
          tempGroupedIds[divisionName].push(match[1]);
          }
        });

        // Leere Divisionen filtern
        Object.keys(tempGroupedIds).forEach(key => {
          if (tempGroupedIds[key].length === 0) delete tempGroupedIds[key];
        });

        if (Object.keys(tempGroupedIds).length === 0) {
          setMuData({});
          setLoading(false);
          return;
        }


        /*
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
        const finalGroupedData = {};

        // 3. Für jede Division die MUs parallel laden
      for (const [divisionName, ids] of Object.entries(tempGroupedIds)) {
        const muDataPromises = ids.map(async (id) => {
          const cacheKey = `mu_cache_${id}`;
          const cached = localStorage.getItem(cacheKey);

          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (now - timestamp < CACHE_DURATION) {

              return data; 
            }
          }

          try {
            const response = await client.mu.getById({ muId: id });
            // Absicherung gegen unterschiedliche API-Response-Strukturen
            const freshData = response?.result?.data || response;
            
            // Falls das SDK die ID umschreibt, stellen wir sicher dass _id existiert
            const formattedData = {
              ...freshData,
              _id: freshData._id || freshData.id || id
            };

            localStorage.setItem(cacheKey, JSON.stringify({
              data: formattedData,
              timestamp: now
            }));

            return formattedData;
          } catch {
            return { _id: id, name: `Fehler beim Laden (${id.substring(0,4)})`, members: [], memberCount: 0, totalDamage: 0 };
          }
        });

        finalGroupedData[divisionName] = await Promise.all(muDataPromises);
      }

      setMuData(finalGroupedData);


    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMuClick = (muId) => {
    setSelectedMuId(muId); // Setzt die ID der angeklickten Einheit
  };



  // Kein Plan was hier läuft aber der Linter rastet sonst aus
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticleAndMu();
    }, 1);
    return () => clearTimeout(timer);
  }, [fetchArticleAndMu]);

  
  useEffect(() => {
    // Der Hook läuft immer, aber wir tun NUR etwas, wenn selectedMuId existiert
    if (!selectedMuId) return;
  
    // Wir pushen einen virtuellen Zustand in den Verlauf
    window.history.pushState({ detailOpen: true }, "");
  
    // Funktion, die anspringt, wenn der User "Zurück" drückt
    const handlePopState = () => {
      setSelectedMuId(null);
    };
  
    // Event-Listener für die Zurück-Taste registrieren
    window.addEventListener("popstate", handlePopState);
  
    // Aufräumen, wenn selectedMuId sich ändert oder die Komponente unmountet
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [selectedMuId]); // Der Hook triggert jedes Mal, wenn sich die ID ändert

  useEffect(() => {
    try {
      localStorage.setItem("warera_api_key", apiKey.trim());
    } catch { // hjfdhsf
    }
  }, [apiKey]);


/**      ***************************************************************************                        */

  // WENN EINE ID GEWÄHLT IST: Zeige die Detail-Komponente anstatt der Übersicht
  if (selectedMuId) {
    return (
      <div className="container">
        <MuDetails muId={selectedMuId} onBack={() => window.history.back()} />
      </div>
    );
  }

  return (
    <div className="container">
      {/* ===== API KEY EINSTELLUNG ===== */}
      <Settings apiKey={apiKey} setApiKey={setApiKey} />

      {/* Header */}
      <header>
        <div>
          <h1>Deutsche Military Units</h1>
          <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0' }}>
            Offizielle MU Einstufung der Bundesrepublik 
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
            Keine MUs gefunden. Gib ein API-Key ein.
          </p>
        ) : (
          /* HIER REINGEKOMMEN: Das Grid-Layout umschließt nun alle Sektionen */
          <div className="dashboard-grid">
            {Object.keys(muData).map((divisionName) => {
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
                          key={mu._id} 
                          className="mu-row" 
                          onClick={() => handleMuClick(mu._id)}
                        >
                          {/* LOGO ZELLE */}
                          <td className="mu-cell cell-logo" style={{ paddingRight: 0 }}>
                            {mu.avatarUrl ? (
                              <img 
                                src={mu.avatarUrl} 
                                alt={`${mu.name} Logo`}
                                className="mu-logo-img"
                                onError={(e) => {
                                  // Fallback, falls das Bild auf dem WarEra-Server mal nicht lädt
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}

                            {/* Fallback */}
                            <div 
                              className="mu-logo-placeholder" 
                              style={{ 
                                display: mu.avatarUrl ? 'none' : 'flex',
                                width: '32px', 
                                height: '32px', 
                                fontSize: '0.8rem' 
                              }}
                            >
                              {mu.name ? mu.name.substring(0, 2).toUpperCase() : 'MU'}
                            </div>
                          </td>
                              {/* NAME ZELLE */}
                          <td className="mu-cell cell-name">{mu.name}</td>
                              {/* STATS ZELLE */}
                          <td className="mu-cell cell-stats">
                            <div>👥 {mu.memberCount || mu.members?.length || 0}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>⚔️ {mu.rankings?.muWeeklyDamages?.value?.toLocaleString('de-DE')}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;