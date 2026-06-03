import { useState, useEffect } from 'react';
// import { getWarEraClient } from './api.js'; // Pfad zu deiner api.js anpassen

export default function MuDetails({ muId, onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMuDetails = async () => {
      setLoading(true);
      try {
        // API-Call für die spezifischen Details einer einzelnen MU
        // (Nutzt die muId, die beim Klicken übergeben wurde)
        const res = await fetch(`https://api2.warera.io/military-units/details/${muId}`);
        const data = await res.json();
        setDetails(data);
      } catch (error) {
        console.error("Fehler beim Laden der MU-Details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMuDetails();
  }, [muId]);

  if (loading) {
    return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>MU-Profil wird geladen...</p>;
  }

  if (!details) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>← Zurück</button>
        <p style={{ textAlign: 'center', color: 'red' }}>Fehler beim Laden der Daten oder MU existiert nicht.</p>
      </div>
    );
  }

  return (
    <div className="mu-detail-view">
      {/* Zurück-Button */}
      <button className="back-btn" onClick={onBack}>← Zurück zur Übersicht</button>

      {/* Identität / Header */}
      <div className="detail-header">
        <h2>{details.name || "Unbekannte MU"}</h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          {details.description || "Keine Beschreibung hinterlegt."}
        </p>
      </div>

      {/* Dashboard Grid (Kommandeure & Finanzen/Items) */}
      <div className="detail-grid">
        
        {/* KACHEL 1: Führungsebene */}
        <div className="detail-card">
          <h3>👑 Führungsebene</h3>
          <div className="leader-row">
            <span>{details.commanderName || 'Keiner'}</span>
            <span className="rank-badge" style={{color: 'var(--accent-gold)'}}>Commander</span>
          </div>
          {details.viceCommanders?.map((vice, index) => (
            <div className="leader-row" key={index}>
              <span>{vice.name}</span>
              <span className="rank-badge">2IC</span>
            </div>
          ))}
        </div>

        {/* KACHEL 2: Schatzkammer & Items */}
        <div className="detail-card">
          <h3>💰 Finanzen & Lager</h3>
          <p style={{ margin: '0 0 15px 0' }}>
            Budget: <strong style={{color: '#22c55e'}}>{details.budget?.toLocaleString('de-DE')} CC</strong>
          </p>
          
          {/* Item Grid */}
          <div className="items-container">
            {details.inventory && Object.keys(details.inventory).length > 0 ? (
              Object.keys(details.inventory).map((itemName) => (
                <div className="item-box" key={itemName}>
                  <span style={{ fontSize: '1.2rem' }}>📦</span>
                  <span className="item-qty">{details.inventory[itemName]}x</span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{itemName}</div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Das Lager ist leer.</p>
            )}
          </div>
        </div>

      </div>

      {/* BEREICH 3: Mitgliederliste */}
      <div className="detail-card">
        <h3>👥 Truppenmitglieder ({details.members?.length || 0})</h3>
        <table className="mu-table">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <th style={{ padding: '10px 20px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '10px 20px', textAlign: 'right' }}>Rang / Rolle</th>
              <th style={{ padding: '10px 20px', textAlign: 'right' }}>Schaden beigetragen</th>
            </tr>
          </thead>
          <tbody>
            {details.members?.map((member) => (
              <tr key={member.id} className="mu-row" style={{ cursor: 'default' }}>
                <td className="mu-cell cell-name">{member.name}</td>
                <td className="mu-cell" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                  {member.role || 'Soldat'}
                </td>
                <td className="mu-cell" style={{ textAlign: 'right', fontWeight: '600' }}>
                  ⚔️ {member.damageContribution?.toLocaleString('de-DE') || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}