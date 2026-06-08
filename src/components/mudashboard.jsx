import { useState, useEffect } from 'react';
import './mudashboard.css';

// ==========================================================================
// 1. Komponente: Allgemeine MU Stats (Oben links)
// ==========================================================================
function MuGeneralStats({ rankings = {}, activeUpgradeLevels = {} }) {
  return (
    <div className="mu-stats-box">
      <h3 className="mu-section-title">Einheits-Statistiken</h3>
      <div className="mu-stats-grid">
        <div className="mu-stat-entry">
          <span className="mu-label">Kontostand:</span>
          <span className="mu-value text-gold">{rankings.muWealth?.toLocaleString() || '0'} BTC</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">Wöchentlicher Schaden:</span>
          <span className="mu-value">{rankings.muWeeklyDamages?.toLocaleString() || '0'}</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">HQ:</span>
          <span className="mu-value">
            {activeUpgradeLevels.headquarters 
              ? `Level ${activeUpgradeLevels.headquarters}` 
              : 'Nicht aktiv'}
          </span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">Barraken:</span>
          <span className="mu-value">
            {activeUpgradeLevels.dormitories 
              ? `Level ${activeUpgradeLevels.dormitories}` 
              : 'Kann nicht geladen werden'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// 2. Komponente: Management & Führung (Oben rechts)
// ==========================================================================
function MuManagement({ managers = [], commanders = [] }) {
  return (
    <div className="mu-management-box">
      <h3 className="mu-section-title">Führungsebene</h3>
      
      <div className="mu-management-section">
        <h4>Inhaber / Manager ({managers.length})</h4>
        {managers.length === 0 ? (
          <p className="mu-no-data">Keine Manager zugewiesen</p>
        ) : (
            <div className="mu-management-cards-container">
            {managers.map((manager, idx) => {
              const hasAvatar = manager.avatarUrl && manager.avatarUrl !== "";
              return (
                <div key={manager._id || idx} className="mu-leader-card manager-item">
                  <div className="mu-leader-avatar-wrapper">
                    {hasAvatar ? (
                      <img src={manager.avatarUrl} alt={manager.username} className="mu-leader-avatar" />
                    ) : (
                      <div className="mu-leader-avatar-placeholder">?</div>
                    )}
                  </div>
                  <span className="mu-leader-name">{manager.username || `ID: ${manager}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mu-management-section">
        <h4>Kommandeure ({commanders.length})</h4>
        {commanders.length === 0 ? (
          <p className="mu-no-data">Keine Kommandeure zugewiesen</p>
        ) : (
            <div className="mu-management-cards-container">
            {commanders.map((commander, idx) => {
              const hasAvatar = commander.avatarUrl && commander.avatarUrl !== "";
              return (
                <div key={commander._id || idx} className="mu-leader-card commander-item">
                  <div className="mu-leader-avatar-wrapper">
                    {hasAvatar ? (
                      <img src={commander.avatarUrl} alt={commander.username} className="mu-leader-avatar" />
                    ) : (
                      <div className="mu-leader-avatar-placeholder">?</div>
                    )}
                  </div>
                  <span className="mu-leader-name">{commander.username || `ID: ${commander}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// 3. Komponente: User- / Mitgliederliste (Unten)
// ==========================================================================
function MuUserList({ members = [], muUsers = [], isLoadingUsers = false }) {
  // 1. States für Sortier-Spalte und Richtung definieren
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  const displayList = muUsers && muUsers.length > 0 ? muUsers : members;

  // 2. Sortier-Handler: Wechselt Richtung oder Spalte bei Klick
  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // 3. Die Daten basierend auf dem State sortieren
  const sortedList = [...displayList].sort((a, b) => {
    if (!sortConfig.key) return 0; // Keine Sortierung gewählt

    const isAObj = typeof a === 'object';
    const isBObj = typeof b === 'object';

    let valA, valB;

    // Werte je nach Spalte extrahieren
    if (sortConfig.key === 'name') {
      valA = isAObj ? (a.username || '').toLowerCase() : String(a).toLowerCase();
      valB = isBObj ? (b.username || '').toLowerCase() : String(b).toLowerCase();
    } else if (sortConfig.key === 'damage') {
      valA = isAObj ? (a.weeklyUserDamages || 0) : 0;
      valB = isBObj ? (b.weeklyUserDamages || 0) : 0;
    } else if (sortConfig.key === 'level') {
      valA = isAObj ? (a.level || 0) : 0;
      valB = isBObj ? (b.level || 0) : 0;
    } else if (sortConfig.key === 'active') {
      valA = isAObj ? (a.isActive ? 1 : 0) : -1;
      valB = isBObj ? (b.isActive ? 1 : 0) : -1;
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Helper, um den aktiven Sortier-Pfeil im Header anzuzeigen
  const getClassNamesFor = (name) => {
    if (sortConfig.key !== name) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="mu-userlist-box">
      <h3 className="mu-section-title">Mitgliederliste ({members.length})</h3>
      
      {isLoadingUsers && <div className="mu-loading-inline">Lade detaillierte User-Daten...</div>}
      
      {sortedList.length === 0 ? (
        <p className="mu-no-data">Keine Mitglieder in dieser Einheit gefunden.</p>
      ) : (
        <div className="mu-user-table-wrapper">
          <table className="mu-user-table">
            <thead>
              <tr>
                {/* CSS-Tipp: Füge der Klasse '.sortable-header' im CSS 'cursor: pointer' hinzu */}
                <th onClick={() => requestSort('name')} className="sortable-header">
                  Name / ID{getClassNamesFor('name')}
                </th>
                <th onClick={() => requestSort('damage')} className="sortable-header">
                  Weekly Damage{getClassNamesFor('damage')}
                </th>
                <th onClick={() => requestSort('level')} className="sortable-header">
                  Userlevel{getClassNamesFor('level')}
                </th>
                <th onClick={() => requestSort('active')} className="sortable-header">
                  Aktiver Bürger{getClassNamesFor('active')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedList.map((user, idx) => {
                const isObject = typeof user === 'object';
                const userName = isObject ? user.username : `User-ID: ${user}`;
                const userRank = isObject && user.level ? `Level ${user.level}` : 'Mitglied';
                const weeklyDamage = isObject && user.weeklyUserDamages ? user.weeklyUserDamages.toLocaleString() : '0';
                const isActive = isObject ? (user.isActive ? 'aktiv' : 'inaktiv') : 'keine Daten';
                const hasAvatar = isObject && user.avatarUrl && user.avatarUrl !== "";

                return (
                  <tr key={user._id || idx}>
                    <td className="user-name-cell">
                      <div className="mu-table-flex-container">
                        
                        {/* 1. USER AVATAR */}
                        <div className="mu-table-avatar-wrapper">
                          {hasAvatar ? (
                            <img src={user.avatarUrl} alt={userName} className="mu-table-avatar" />
                          ) : (
                            <div className="mu-table-avatar-placeholder">?</div>
                          )}
                        </div>

                        {/* 2. LANDESFLAGGE */}
                        
                        {isObject && user.country && (
                          (() => {
                            const countryData = user.country;

                            if (typeof countryData === 'string' && countryData.length <= 3) {
                              const cleanCode = countryData.trim().toLowerCase();
                              
                              try {
                                // VITE-MAGIC: Das sagt Vite, dass das Bild im Komponenten-Ordner liegt!
                                const flagUrl = new URL(`./flags/${cleanCode}.svg`, import.meta.url).href;

                                return (
                                  <img 
                                    src={flagUrl} 
                                    alt={`Flagge ${cleanCode}`} 
                                    className="mu-table-flag"
                                    onError={(e) => { 
                                      // Verhindert unendliche Schleifen, falls eine Flagge mal ganz fehlt
                                      e.target.onerror = null; 
                                      e.target.style.display = 'none'; 
                                    }}
                                  />
                                );
                              } catch (err) {
                                console.error("Fehler beim Laden des SVG-Pfads", err);
                                return null;
                              }
                            }

                            return null;
                          })()
                        )}
                        {/* 3. USERNAME TEXT */}
                        <span className="mu-table-username-text">{userName}</span>
                      </div>
                    </td>
                    <td>{weeklyDamage}</td>
                    <td>{userRank}</td>
                    <td>
                      <span className={`status-dot ${isActive}`}></span>
                      {isActive}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Hauptkomponente: Zusammenführung des Dashboards
// ==========================================================================
function MuDashboard({ selectedMu = null, dataHandler }) {
  const [muUsers, setMuUsers] = useState({ managers: [], commanders: [], members: [] });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Der theoretische API-Call-Trigger für die User-Details
  useEffect(() => {
    if (!selectedMu?.objekt?._id) return;

    const fetchUserDetails = async () => {
      setIsLoadingUsers(true);
      try {
      const fullUserData = await dataHandler.getMUUserData(selectedMu.objekt._id);

      setMuUsers(fullUserData);
      } catch (err) {
        console.error("Fehler beim Laden der User-Details:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUserDetails();
  }, [selectedMu, dataHandler]);

  if (!selectedMu || !selectedMu.objekt) {
    return <div className="mu-no-selection">Bitte wähle eine Militäreinheit aus, um Details anzuzeigen.</div>;
  }

  const muData = selectedMu.objekt;

  return (
    <div className="mu-dashboard-wrapper">
      <div className="mu-dashboard-header">
        {muData.avatarUrl && <img src={muData.avatarUrl} alt={muData.name} className="mu-dashboard-avatar" />}
        <h2>{muData.name} ÜBERBLICK</h2>
      </div>

      {/* Oberer Bereich: Nebeneinander aufgeteilt */}
      <div className="mu-dashboard-top-row">
        <MuGeneralStats 
          rankings={muData.rankings} 
          activeUpgradeLevels={muData.activeUpgradeLevels} 
        />
        <MuManagement 
          managers={muUsers.managers} 
          commanders={muUsers.commanders}
        />
      </div>

      {/* Unterer Bereich: Vollflächige Userliste */}
      <div className="mu-dashboard-bottom-row">
        <MuUserList 
          members={muData.members} 
          muUsers={muUsers.members}
          isLoadingUsers={isLoadingUsers}
        />
      </div>
    </div>
  );
}

export default MuDashboard;