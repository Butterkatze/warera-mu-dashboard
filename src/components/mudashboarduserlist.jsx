import { useState, useEffect } from 'react';
import './mudashboarduserlist.css'
import { 
    sortUserList, 
    getRemainingBuffTime, 
    formatTimeSinceConnection
  } from './mudashboardhelpers.js';

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

  export function UserStatsColumnCell({ user, isObject }) {
    if (!isObject || !user.skills) return <td className="mu-text-center"><span className="mu-no-data">-</span></td>;
  
    const health  = user.skills.health || { currentBarValue: 0, value: 100, percent: 0 };
    const hunger  = user.skills.hunger || { currentBarValue: 0, value: 100, percent: 0 };
    const overall = user.skills.overall || { currentBarValue: 0, value: 100, percent: 0 };
  
    return (
        <td>
          <div className="mu-status-bars-column">
            {/* Overall Balken */}
            <div className="mu-status-bar-wrapper">
              <div className="mu-status-bar-labels">
                <span className="mu-status-bar-name">Overall</span>
                <span className="mu-status-bar-value">
                  {overall.currentBarValue} / {overall.value}
                </span>
              </div>
              <div className="mu-status-bar-bg">
                <div className="mu-status-bar-fill fill-overall" style={{ width: `${overall.percent}%` }}>
                  {overall.percent >= 12 && <span className="mu-bar-percent-inside">{Math.round(overall.percent)}%</span>}
                </div>
              </div>
            </div>
    
            {/* Health Balken */}
            <div className="mu-status-bar-wrapper">
              <div className="mu-status-bar-labels">
                <span className="mu-status-bar-name">Health</span>
                <span className="mu-status-bar-value">
                  {health.currentBarValue} / {health.value}
                </span>
              </div>
              <div className="mu-status-bar-bg">
                <div className="mu-status-bar-fill fill-health" style={{ width: `${health.percent}%` }}>
                  {health.percent >= 12 && <span className="mu-bar-percent-inside">{Math.round(health.percent)}%</span>}
                </div>
              </div>
            </div>
    
            {/* Hunger Balken */}
            <div className="mu-status-bar-wrapper">
              <div className="mu-status-bar-labels">
                <span className="mu-status-bar-name">Hunger</span>
                <span className="mu-status-bar-value">
                  {hunger.currentBarValue} / {hunger.value}
                </span>
              </div>
              <div className="mu-status-bar-bg">
                <div className="mu-status-bar-fill fill-hunger" style={{ width: `${hunger.percent}%` }}>
                  {hunger.percent >= 12 && <span className="mu-bar-percent-inside">{Math.round(hunger.percent)}%</span>}
                </div>
              </div>
            </div>
    
            {/* Das unveränderte PillenBadge */}
            <div className="mu-status-pill-row">
              <PillenBadge user={user} isObject={isObject} />
            </div>
          </div>
        </td>
      );
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
                  {/*
                  <th onClick={() => requestSort('damage')} className="sortable-header">
                    <div className="th-content-wrapper">
                      Weekly Damage {renderSortArrow('damage')}
                      <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                        <span className="mu-info-btn">i</span>
                        <div className="mu-tooltip-text">Der gesamte verursachte Schaden des Spielers in dieser Woche.</div>
                      </div>
                    </div>
                  </th>
                  */}
                  <th onClick={() => requestSort('buffs')} className="sortable-header">
                    <div className="th-content-wrapper">
                      Helath und Hunger {renderSortArrow('buffs')}
                      <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                        <span className="mu-info-btn">i</span>
                        <div className="mu-tooltip-text">
                          Statusbalken für Hunger und Health<br /> 
                          Overall: Theoretisches {'('}verbleibendes{')'} Ges<br />
                          Rot: Offline, aber noch aktiver Bürger.<br />
                          Grau: kein aktiver Bürger mehr.<br />
                          </div>
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
                  {/*                  */}
                  <th onClick={() => requestSort('level')} className="sortable-header">
                    <div className="th-content-wrapper">
                      Userlevel {renderSortArrow('level')}
                      <div className="mu-tooltip-container" onClick={(e) => e.stopPropagation()}>
                        <span className="mu-info-btn">i</span>
                        <div className="mu-tooltip-text">Das aktuelle Ingame-Level</div>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedList.map((user, idx) => {
                  const isObject = typeof user === 'object';
                  const userRank = isObject && user.level ? `Level ${user.level}` : 'Mitglied';
                  {/*
                  const weeklyDamage = isObject && user.weeklyUserDamages ? user.weeklyUserDamages.toLocaleString('de-DE') : '0';
                  */}
                  return (
                    <tr key={user._id || idx}>
                        {/* Das Mapping ist jetzt extrem übersichtlich und komponentenorientiert */}
                        <UserCell user={user} isObject={isObject} />
                        {/*
                        <td>{weeklyDamage}</td>
                        
                        */}
                        <UserStatsColumnCell user={user} isObject={isObject} />
                        <td className="mu-text-center">
                            <OnlineBadge user={user} isObject={isObject} serverTime={currentTime} />
                        </td>
                        <td className="mu-text-center">
                            <SkillpathBadge user={user} isObject={isObject} />
                        </td>
                        <td className="mu-text-center">
                            {userRank}
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

export default MuUserList;