import { useState, useEffect } from 'react';
import { getWarEraClient } from './api.js';

export default function MuDetails({ muId, onBack }) {
  const [mu, setMu] = useState(() => {
    // SYNCHRONER START: Wir holen die MU-Daten direkt aus dem Dashboard-Cache!
    const cachedMu = localStorage.getItem(`mu_cache_${muId}`);
    if (cachedMu) {
      const { data } = JSON.parse(cachedMu);
      return data; // Initialisiert den State sofort mit den vorhandenen Daten
    }
    return null;
  });

  const [leaders, setLeaders] = useState({ commanders: [], managers: [] });
  const [members, setMembers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fallback: Nur wenn die MU aus irgendeinem Grund NICHT im Cache war, laden wir sie hier nach
  useEffect(() => {
    async function loadMuFallback() {
      if (mu) return; // Schon da, kein Call nötig!

      try {
        const client = getWarEraClient();
        const response = await client.mu.getById({ muId });
        const data = response?.result?.data || response;
        setMu(data);
      } catch (error) {
        console.error("Fehler beim Fallback-Laden der MU:", error);
      }
    }
    loadMuFallback();
  }, [muId, mu]);

  // Haupt-Prozess: Lädt alle User-Profile parallel, sobald wir die MU-Struktur (aus Cache oder API) haben
// Haupt-Prozess: Nutzt exakt deine funktionierende .map-Logik
useEffect(() => {
  async function loadAllProfiles() {
    if (!mu) return;
    
    setLoadingUsers(true);
    const client = getWarEraClient();
    const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 Stunden aus deinem Code
    const now = Date.now();

    try {
      // 1. Alle IDs sammeln, die wir abfragen müssen
      const commanderIds = mu.roles?.commanders || [];
      const managerIds = mu.roles?.managers || [];
      const memberIds = mu.members || [];

      // Wir erstellen eine Liste aller einzigartigen IDs, um keine ID doppelt abzufragen
      const allUniqueIds = [...new Set([...commanderIds, ...managerIds, ...memberIds])];

      // 2. Exakt deine funktionierende Schleife über alle IDs jagen
      const profilePromises = allUniqueIds.map(async (userId) => {
        const cacheKey = `user_cache_${userId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (now - timestamp < CACHE_DURATION) return data;
        }

        try {
          // Exakt dein funktionierender API-Aufruf
          const response = await client.user.getUserLite({ userId });
          const userData = response?.result?.data || response;

          const formattedUser = {
            _id: userId,
            username: userData.username || "Unbekannter Soldat",
            avatarUrl: userData.avatarUrl || null,
            weeklyDamage: userData.rankings?.weeklyUserDamages?.value || 0,
            isActive: userData.isActive
          };

          localStorage.setItem(cacheKey, JSON.stringify({ data: formattedUser, timestamp: now }));
          return formattedUser;
        } catch (err) {
          console.error(`Fehler bei ID ${userId}:`, err);
          return { _id: userId, username: `Soldat (${userId.substring(0,4)})`, avatarUrl: null, weeklyDamage: 0 };
        }
      });

      // Alle Profile parallel auflösen
      const allProfiles = await Promise.all(profilePromises);

      // 3. Die geladenen Profile wieder aufteilen, damit das Layout stimmt
      
      const fetchedCommanders = allProfiles.filter(p => commanderIds.includes(p._id));
      const fetchedManagers = allProfiles.filter(p => managerIds.includes(p._id));
      const fetchedMembers = allProfiles.filter(p => memberIds.includes(p._id));
      fetchedMembers.sort((a, b) => b.weeklyDamage - a.weeklyDamage);

      // States setzen
      setLeaders({ commanders: fetchedCommanders, managers: fetchedManagers });
      setMembers(fetchedMembers);

    } catch (error) {
      console.error("Fehler im Profil-Ladezyklus:", error);
    } finally {
      setLoadingUsers(false);
    }
  }

  loadAllProfiles();
}, [mu]); // Triggert sofort, da 'mu' durch den Cache-State-Initialisierer meistens schon existiert

  if (!mu) {
    return <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>MU-Spezifikationen werden geladen...</p>;
  }

  // ... (Der gesamte restliche JSX-Return-Block bleibt exakt so wie im vorherigen Schritt!)
    return (
      <div className="mu-detail-view">
        {/* HEADER */}
        <div className="detail-header">
          <button className="back-arrow-btn" onClick={onBack}>← Zurück zum Dashboard</button>
          <div className="detail-title-wrapper">
            {mu.avatarUrl && <img src={mu.avatarUrl} alt="" className="detail-mu-logo" />}
            <div>
              <h1>{mu.name}</h1>
              <p className="detail-subtitle">ID: {mu._id}</p>
            </div>
          </div>
        </div>
  
        {/* STATS */}
        <div className="detail-stats-grid">
          <div className="detail-stat-card">
            <span className="stat-label">Gesamtschaden</span>
            <span className="stat-value">⚔️ {(mu.rankings?.muDamages?.value || 0).toLocaleString('de-DE')}</span>
          </div>
          <div className="detail-stat-card">
            <span className="stat-label">Wöchentlicher Schaden</span>
            <span className="stat-value">📈 {(mu.rankings?.muWeeklyDamages?.value || 0).toLocaleString('de-DE')}</span>
          </div>
          <div className="detail-stat-card">
            <span className="stat-label">Mitgliederstärke</span>
            <span className="stat-value">👥 {mu.members?.length || 0} Mann</span>
          </div>
        </div>
  
        {/* KOMMANDOEBENE */}
        <div className="leadership-section" style={{ marginBottom: '35px' }}>
          <h2>Kommandoebene</h2>
          {loadingUsers ? (
            <p style={{ color: 'var(--text-muted)' }}>Militärische Ränge werden überprüft...</p>
          ) : (
            <div className="leadership-flex" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Kommandeure */}
              {leaders.commanders.length > 0 && (
                <div className="leadership-group">
                  <h3 style={{ color: 'var(--accent-gold)', fontSize: '1rem', marginBottom: '12px' }}>MU-Kommandeure</h3>
                  <div className="members-grid">
                    {leaders.commanders.map(cmd => (
                      <a 
                        key={cmd._id} 
                        href={`https://app.warera.io/user/${cmd._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="member-card click-profile-link"
                        style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
                      >
                        <div className="member-avatar-wrapper">
                          {cmd.avatarUrl ? (
                            <img src={cmd.avatarUrl} alt="" className="member-avatar" style={{ border: '2px solid var(--accent-gold)' }} />
                          ) : (
                            <div className="member-avatar-placeholder" style={{ backgroundColor: 'var(--accent-gold)', color: '#000' }}>CO</div>
                          )}
                        </div>
                        <div className="member-info" style={{ textAlign: 'left' }}>
                          <span className="member-name" style={{ fontWeight: '600' }}>{cmd.username}</span>
                          <span className="member-damage" style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>Kommandeur</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
  
              {/* Manager */}
              {leaders.managers.length > 0 && (
                <div className="leadership-group">
                  <h3 style={{ color: 'var(--accent-blue)', fontSize: '1rem', marginBottom: '12px' }}>Owned by</h3>
                  <div className="members-grid">
                    {leaders.managers.map(mgr => (
                      <a 
                        key={mgr._id} 
                        href={`https://app.warera.io/user/${mgr._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="member-card click-profile-link"
                        style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
                      >
                        <div className="member-avatar-wrapper">
                          {mgr.avatarUrl ? (
                            <img src={mgr.avatarUrl} alt="" className="member-avatar" style={{ border: '2px solid var(--accent-blue)' }} />
                          ) : (
                            <div className="member-avatar-placeholder" style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}>HQ</div>
                          )}
                        </div>
                        <div className="member-info" style={{ textAlign: 'left' }}>
                          <span className="member-name" style={{ fontWeight: '600' }}>{mgr.username}</span>
                          <span className="member-damage" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>Manager</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
  
            </div>
          )}
        </div>
  
        {/* MITGLIEDERLISTE */}
        <div className="member-list-section">
          <h2>Aktive Truppenstärke ({mu.members?.length || 0})</h2>
          {loadingUsers ? (
            <p style={{ color: 'var(--text-muted)', padding: '10px 0' }}>Akten der Soldaten werden angefordert...</p>
          ) : (
            <div className="members-grid">
              {members.map((member) => (
                <a 
                  key={member._id} 
                  href={`https://app.warera.io/user/${member._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="member-card click-profile-link"
                  style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
                >
                  <div className="member-avatar-wrapper">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="member-avatar" />
                    ) : (
                      <div className="member-avatar-placeholder">
                        {member.username.substring(0,2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="member-info" style={{ textAlign: 'left' }}>
                    {/* Name mit Aktivitäts-Punkt */}
                    <span className="member-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          backgroundColor: member.isActive ? '#2ec4b6' : '#777', // Grün wenn aktiv, Grau wenn inaktiv
                          boxShadow: member.isActive ? '0 0 6px #2ec4b6' : 'none', // Ein leichter Glow für aktive Spieler
                          display: 'inline-block',
                          flexShrink: 0
                        }} 
                        title={member.isActive ? "Spieler ist aktiv" : "Spieler ist inaktiv"}
                      />
                      {member.username}
                    </span>
                    
                    <span className="member-damage">
                      ⚔️ {member.weeklyDamage.toLocaleString('de-DE')} <span className="dmg-label">/ Woche</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }