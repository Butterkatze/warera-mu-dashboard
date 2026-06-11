import { useState, useEffect } from 'react';
import { 
  sortUserList, 
  getRemainingBuffTime, 
  formatTimeSinceConnection
} from './mudashboardhelpers.js';
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
          <span className="mu-value text-gold">{rankings.muWealth?.toLocaleString('de-DE') || '0'} BTC</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">Wöchentlicher Schaden:</span>
          <span className="mu-value">{rankings.muWeeklyDamages?.toLocaleString('de-DE') || '0'}</span>
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
// Unterkomponenten der Userliste
// ==========================================================================

export function UserCell({ user, isObject }) {
  const userName = isObject ? user.username : `User-ID: ${user}`;
  const userId = isObject ? user._id : user;
  const hasAvatar = isObject && user.avatarUrl && user.avatarUrl !== "";
  const profileUrl = `https://app.warera.io/user/${userId}`;

  return (
    <td className="user-name-cell">
          <a 
            href={profileUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mu-table-flex-container mu-profile-link"
          >
        <div className="mu-table-avatar-wrapper">
          {hasAvatar ? (
            <img src={user.avatarUrl} alt={userName} className="mu-table-avatar" />
          ) : (
            <div className="mu-table-avatar-placeholder">?</div>
          )}

          {isObject && user.country && typeof user.country === 'string' && user.country.length <= 3 && (
            (() => {
              const cleanCode = user.country.trim().toLowerCase();
              try {
                const flagUrl = new URL(`./flags/${cleanCode}.svg`, import.meta.url).href;
                return (
                  <img 
                    src={flagUrl} 
                    alt={`Flagge ${cleanCode}`} 
                    className="mu-table-flag-overlay"
                    onError={(e) => { 
                      e.target.onerror = null; 
                      e.target.style.display = 'none'; 
                    }}
                  />
                );
              } catch (err) {
                console.error("Fehler beim Laden des SVG-Pfads", err);
                return null;
              }
            })()
          )}
        </div>
        <span className="mu-table-username-text">{userName}</span>
      </a>
    </td>
  );
}

export function OnlineBadge({ user, isObject, serverTime }) {
  if (!serverTime) return <div className="pill-badge badge-gray">...</div>;

  const diffMs = isObject && user.lastConnectionAt ? serverTime - new Date(user.lastConnectionAt).getTime() : Infinity;
  const diffMins = Math.floor(diffMs / 60000);
  const timeDisplay = isObject ? formatTimeSinceConnection(user.lastConnectionAt) : 'Nie';

  let badgeClass = "badge-gray";
  if (isObject && user.isActive) {
    badgeClass = diffMins <= 15 ? "badge-green" : "badge-red";
  }
  return <div className={`pill-badge ${badgeClass}`}>{timeDisplay}</div>;
}

export function SkillpathBadge({ user, isObject }) {
  const path = isObject ? user.skillpath : null;
  let badgeClass = "badge-gray";
  
  if (path === "Aufbau") badgeClass = "badge-blue";
  if (path === "Eco") badgeClass = "badge-green";
  if (path === "Hybrid") badgeClass = "badge-yellow";
  if (path === "War") badgeClass = "badge-red";

  return <div className={`pill-badge ${badgeClass}`}>{path || "Keiner"}</div>;
}

export function PillenBadge({ user, isObject }) {
  if (!isObject || !user.buffs) return <span className="mu-no-data">-</span>;

  const hasBuff = user.buffs.buffCodes?.includes("cocain");
  const hasDebuff = user.buffs.debuffCodes?.includes("cocain");

  if (hasBuff) {
    const timer = getRemainingBuffTime(user.buffs.buffEndAt) || "Aktiv";
    return <div className="pill-badge badge-green">Pillenbuff ({timer})</div>;
  }
  if (hasDebuff) {
    const timer = getRemainingBuffTime(user.buffs.debuffEndAt) || "Aktiv";
    return <div className="pill-badge badge-red">Pillendebuff ({timer})</div>;
  }
  return <span className="mu-no-data">-</span>;
}

// ==========================================================================
// 3. Komponente: User- / Mitgliederliste (Unten)
// ==========================================================================
function MuUserList({ members = [], muUsers = [], isLoadingUsers = false }) {

  //==================================================
  // Update logik
  const [currentTime, setCurrentTime] = useState(null);
  
  useEffect(() => {
    // Schiebt das Setzen der Zeit ans Ende der JavaScript-Ereignisschleife (asynchron)
    // Das verhindert das "cascading renders"-Problem komplett!
    const timeout = setTimeout(() => setCurrentTime(Date.now()), 0);

    // Aktualisiert die Zeit ab dann jede Sekunde
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  //==========================
  // Sortierlogik

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const displayList = muUsers && muUsers.length > 0 ? muUsers : members;

  const requestSort = (key) => {
    let direction = 'desc';
    
    // Spezialfall für Skillpath: Soll beim ersten Klick mit 'asc' (War zuerst) starten
    if (key === 'skillpath') {
      direction = (sortConfig.key === 'skillpath' && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    } else {
      if (sortConfig.key === key && sortConfig.direction === 'desc') {
        direction = 'asc';
      }
    }
    
    setSortConfig({ key, direction });
  };

  // Nutzt die ausgelagerte Sortierfunktion aus muHelpers
  const sortedList = sortUserList(displayList, sortConfig);

  const renderSortArrow = (name) => {
    const isActive = sortConfig.key === name;
    const arrow = isActive && sortConfig.direction === 'asc' ? '▲' : '▼';
  
    return (
      <span style={{ 
        visibility: isActive ? 'visible' : 'hidden', 
        marginLeft: '6px',
        display: 'inline-block' 
      }}>
        {arrow}
      </span>
    );
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
                <th onClick={() => requestSort('name')} className="sortable-header">
                  <div className="th-content-wrapper">
                    Name / ID {renderSortArrow('name')}
                    <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                      <span className="mu-info-btn">i</span>
                      <div className="mu-tooltip-text">Klick öffnet das Profil.</div>
                    </div>
                  </div>
                </th>
                <th onClick={() => requestSort('damage')} className="sortable-header">
                  <div className="th-content-wrapper">
                    Weekly Damage {renderSortArrow('damage')}
                    <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                      <span className="mu-info-btn">i</span>
                      <div className="mu-tooltip-text">Der gesamte verursachte Schaden des Spielers in dieser Woche.</div>
                    </div>
                  </div>
                </th>
                <th onClick={() => requestSort('level')} className="sortable-header">
                  <div className="th-content-wrapper">
                    Userlevel {renderSortArrow('level')}
                    <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                      <span className="mu-info-btn">i</span>
                      <div className="mu-tooltip-text">Das aktuelle Ingame-Level</div>
                    </div>
                  </div>
                </th>
                <th onClick={() => requestSort('active')} className="sortable-header">
                  <div className="th-content-wrapper">
                    Last Online {renderSortArrow('active')}
                    <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                      <span className="mu-info-btn">i</span>
                      <div className="mu-tooltip-text">
                        Vergangene Zeit seit der letzten Aktivität.<br /> 
                        Grün: Online vor weniger als 15min.<br />
                        Rot: Offline, aber noch aktiver Bürger.<br />
                        Grau: kein aktiver Bürger mehr.<br />
                        </div>
                    </div>
                  </div>
                </th>
                <th onClick={() => requestSort('skillpath')} className="sortable-header">
                  <div className="th-content-wrapper">
                    Skillpath {renderSortArrow('skillpath')}
                    <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                      <span className="mu-info-btn">i</span>
                      <div className="mu-tooltip-text"> 
                        Spezialisierungen:<br /> 
                          War: {'≥'} 75% der Skillpoints in War Skills<br /> 
                          Hybrid: 75% {'<'} x {'<'} 25% der Skillpoints in einem Skill.<br /> 
                          Eco: {'≥'} 75% der Skillpoints in Eco Skills.<br /> 
                          Aufbau: unter Level 20.
                        </div>
                    </div>
                  </div>
                </th>
                <th onClick={() => requestSort('buffs')} className="sortable-header">
                  <div className="th-content-wrapper">
                    Pillen Status {renderSortArrow('buffs')}
                    <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                      <span className="mu-info-btn">i</span>
                      <div className="mu-tooltip-text">Aktive Buffs oder Debuffs inklusive verbleibender Laufzeit.</div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedList.map((user, idx) => {
                const isObject = typeof user === 'object';
                const userRank = isObject && user.level ? `Level ${user.level}` : 'Mitglied';
                const weeklyDamage = isObject && user.weeklyUserDamages ? user.weeklyUserDamages.toLocaleString('de-DE') : '0';

                return (
                  <tr key={user._id || idx}>
                    {/* Das Mapping ist jetzt extrem übersichtlich und komponentenorientiert */}
                    <UserCell user={user} isObject={isObject} />
                    
                    <td>{weeklyDamage}</td>
                    <td>{userRank}</td>
                    
                    <td className="mu-text-center">
                      <OnlineBadge user={user} isObject={isObject} serverTime={currentTime} />
                    </td>
                    <td className="mu-text-center">
                      <SkillpathBadge user={user} isObject={isObject} />
                    </td>
                    <td className="mu-text-center">
                      <PillenBadge user={user} isObject={isObject} />
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

    const fetchUserDetails = async (force = false) => {
      setIsLoadingUsers(true);
      try {
        if (force) {
          dataHandler.setForceUpdate(true); // Erzwingt frische Daten vom Server (wichtig für die Timestamps)
        }
      const fullUserData = await dataHandler.getMUUserData(selectedMu.objekt._id);
      setMuUsers(fullUserData);

      } catch (err) {
        console.error("Fehler beim Laden der User-Details:", err);
      } finally {
        if (force) {
          dataHandler.setForceUpdate(false); // Flag nach dem Call sofort wieder zurücksetzen
        }
        setIsLoadingUsers(false);
      }
    };

    fetchUserDetails();

    const intervalId = setInterval(() => {
      console.log("[Polling] Hole frische User-Daten für MU:", selectedMu.objekt._id);
      fetchUserDetails(true); // Hier mit true, um den Cache zu umgehen
    }, 5 * 60 * 1000);

    // 3. Cleanup: Intervall löschen, wenn die Komponente verlassen oder selectedMu gewechselt wird
    return () => clearInterval(intervalId);
  }, [selectedMu, dataHandler]);

  if (!selectedMu || !selectedMu.objekt) {
    return <div className="mu-no-selection">Bitte wähle eine Militäreinheit aus, um Details anzuzeigen.</div>;
  }

  const muData = selectedMu.objekt;

  return (
    <div className="mu-dashboard-wrapper">
      <div className="mu-dashboard-header">
        {muData.avatarUrl && <img src={muData.avatarUrl} alt={muData.name} className="mu-dashboard-avatar" />}
        <h2>{muData.name} Überblick</h2>
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