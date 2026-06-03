import { useState, useEffect } from 'react';
import { getWarEraClient } from './api.js'; 

export default function MuDetails({ muId, onBack }) {
  const [mu, setMu] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMu, setLoadingMu] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    async function loadMuData() {
      setLoadingMu(true);
      try {
        const client = getWarEraClient();
        const response = await client.mu.getById({ muId });
        const data = response?.result?.data || response;
        setMu(data);
      } catch (error) {
        console.error("Fehler beim Laden der MU-Details:", error);
      } finally {
        setLoadingMu(false);
      }
    }
    if (muId) loadMuData();
  }, [muId]);

  useEffect(() => {
    async function loadMemberProfiles() {
      if (!mu || !mu.members || mu.members.length === 0) return;
      
      setLoadingMembers(true);
      const client = getWarEraClient();
      const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 Stunden Cache für User-Profile
      const now = Date.now();

      try {
        const profilePromises = mu.members.map(async (userId) => {
          const cacheKey = `user_cache_${userId}`;
          const cached = localStorage.getItem(cacheKey);

          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (now - timestamp < CACHE_DURATION) return data;
          }

          try {
            // Hier nutzen wir den passenden API-Call für User (ggf. an deinen Client anpassen)
            const response = await client.user.getUserLite({ userId });
            const userData = response?.result?.data || response;

            const formattedUser = {
              _id: userId,
              username: userData.username || "Unbekannter Soldat",
              avatarUrl: userData.avatarUrl || null,
              weeklyDamage: userData.rankings?.weeklyUserDamages?.value || 0
            };

            localStorage.setItem(cacheKey, JSON.stringify({ data: formattedUser, timestamp: now }));
            return formattedUser;
          } catch {
            return { _id: userId, username: `User (${userId.substring(0,4)})`, avatarUrl: null, weeklyDamage: 0 };
          }
        });

        const profiles = await Promise.all(profilePromises);
        
        // Sortiert die Mitglieder direkt nach dem höchsten wöchentlichen Schaden
        profiles.sort((a, b) => b.weeklyDamage - a.weeklyDamage);
        setMembers(profiles);
      } catch (error) {
        console.error("Fehler beim Laden der Member-Profile:", error);
      } finally {
        setLoadingMembers(false);
      }
    }

    if (mu) loadMemberProfiles();
  }, [mu]);

  if (loadingMu) {
    return <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>MU-Spezifikationen werden geladen...</p>;  }

  if (!mu) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Militärische Einheit nicht gefunden.</p>
        <button className="update-btn" onClick={onBack}>Zurück</button>
      </div>
    );
  }

  return (
    <div className="mu-detail-view">
      {/* Header-Bereich */}
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

      {/* Haupt-Statistiken der MU */}
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

      {/* Die Mitgliederliste */}
      <div className="member-list-section">
        <h2>Aktive Truppenstärke ({mu.members?.length || 0})</h2>
        
        {loadingMembers ? (
          <p style={{ color: 'var(--text-muted)', padding: '10px 0' }}>Akten der Soldaten werden angefordert...</p>
        ) : (
          <div className="members-grid">
            {members.map((member) => (
              <div key={member._id} className="member-card">
                {/* Profilbild links */}
                <div className="member-avatar-wrapper">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="member-avatar" />
                  ) : (
                    <div className="member-avatar-placeholder">
                      {member.username.substring(0,2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name & Schaden rechts daneben */}
                <div className="member-info">
                  <span className="member-name">{member.username}</span>
                  <span className="member-damage">
                    ⚔️ {member.weeklyDamage.toLocaleString('de-DE')} <span className="dmg-label">/ Woche</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}