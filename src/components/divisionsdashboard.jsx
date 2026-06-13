import { useState, useEffect } from 'react';
import './divisionsdashboard.css';

// ==========================================================================
// 1. Unterkomponente: Die MU-Karte (Das einzelne Kärtchen innerhalb einer Division)
// ==========================================================================
function MuCard({ image, name, stats = {}, onClick, isActive }) {
  const statEntries = Object.entries(stats).slice(0, 2);

  return (
    <div 
      className={`mu-card clickable ${isActive ? 'active-card' : ''}`}
      onClick={onClick}
    >
      <div className="mu-card-image-wrapper">
        {image ? (
          <img src={image} alt={name} className="mu-card-image" />
        ) : (
          <div className="mu-card-placeholder">Kein Bild</div>
        )}
      </div>

      <div className="mu-card-content">
        <h3 className="mu-card-title">{name}</h3>
        <div className="mu-card-stats-grid">
          {statEntries.map(([key, value]) => (
            <div key={key} className="mu-card-stat-box">
              <span className="mu-stat-label">{key}:</span>
              <span className="mu-stat-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DEBUFF_TARGET_PERCENTILE = 0.90; // 90% der Spieler aus dem Debuff

function DivisionColumn({ divisionsName, muEintraege, selectedDivision, onMuClick, allDivisionsUsers }) {
  
  // 1. Einklapp-State
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Alle geladenen User für DIESE Division sammeln (ID-basiert ohne Duplikate)
  const seenUserIds = new Set();
  const divisionUsers = [];

  muEintraege.forEach(eintrag => {
    const muUserData = allDivisionsUsers[eintrag.id];
    if (!muUserData) return;

    const allRoles = [
      ...(muUserData.members || []), 
      ...(muUserData.commanders || []), 
      ...(muUserData.managers || [])
    ];

    allRoles.forEach(user => {
      if (user && user._id && !seenUserIds.has(user._id)) {
        seenUserIds.add(user._id);
        divisionUsers.push(user);
      }
    });
  });

  const totalPeopleInDivision = divisionUsers.length;

  const validUsers = divisionUsers.filter(u => 
    u && 
    u.skills && 
    (u.skillpath === 'War' || u.skillpath === 'Hybrid')
  );
  const userCount = validUsers.length; // Entspricht dem alten totalPeople für die Stats

  // 3. Pillen-Metriken (Jetzt NUR NOCH basierend auf validUsers!)
  let inBuff = 0;
  let inDebuff = 0;
  let noPill = 0;
  const debuffEndTimes = [];
  
  const debuffHourlyDistribution = Array(24).fill(0);
  const buffHourlyDistribution = Array(24).fill(0);

  const now = new Date();

  // HIER DIE ÄNDERUNG: Schleife läuft jetzt über validUsers statt divisionUsers
  validUsers.forEach(user => {
    const buffEnd = user.buffs?.buffEndAt ? new Date(user.buffs.buffEndAt) : null;
    const debuffEnd = user.buffs?.debuffEndAt ? new Date(user.buffs.debuffEndAt) : null;
  
    const hasBuff = user.buffs?.buffCodes?.length > 0 && buffEnd && buffEnd > now;
    const hasDebuff = user.buffs?.debuffCodes?.length > 0 && debuffEnd && debuffEnd > now;
  
    if (hasBuff) {
      inBuff++;
      const endHour = buffEnd.getHours();
      buffHourlyDistribution[endHour]++;
    } else if (hasDebuff) {
      inDebuff++;
      debuffEndTimes.push(debuffEnd);
  
      const endHour = debuffEnd.getHours();
      debuffHourlyDistribution[endHour]++;
    } else {
      noPill++;
    }
  });

  // 4. Berechnung des X% Debuff-Timers (z.B. 90%)
  let percentileTimerStr = "--:--";
  if (debuffEndTimes.length > 0) {
    debuffEndTimes.sort((a, b) => a.getTime() - b.getTime());
    const targetIndex = Math.min(
      debuffEndTimes.length - 1,
      Math.max(0, Math.floor(debuffEndTimes.length * DEBUFF_TARGET_PERCENTILE))
    );
    const targetTime = debuffEndTimes[targetIndex];
    percentileTimerStr = targetTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Hilfsfunktion für die Grid-Statistiken
  const renderDivisionStats = () => {
    const stats = [
      // Nutzt jetzt totalPeopleInDivision für die absolute Übersicht
      { label: "Gesamt", value: totalPeopleInDivision }, 
      { label: "War/Hybrid", value: userCount },
      // Prozentrechnung basiert auf den Kampf-Usern (userCount), damit es zu den Charts passt
      { label: "Im Buff", value: `${inBuff} (${userCount ? Math.round((inBuff/userCount)*100) : 0}%)` },
      { label: "Im Debuff", value: `${inDebuff} (${userCount ? Math.round((inDebuff/userCount)*100) : 0}%)` },
      { label: "Keine Pille", value: noPill },
      { label: `${DEBUFF_TARGET_PERCENTILE * 100}% Ready um`, value: percentileTimerStr, highlight: true },
    ];

    return stats.map((stat, index) => (
      <div key={index} className={`division-stat-box ${stat.highlight ? 'stat-highlight' : ''}`}>
        <span className="division-stat-label">{stat.label}:</span>
        <span className="division-stat-value">{stat.value}</span>
      </div>
    ));
  };

  // ==========================================================================
  // 5. Arrays rotieren (Beginnend bei aktueller Stunde)
  // ==========================================================================
  const currentHour = now.getHours();
  const hoursOrder = [];
  for (let i = 0; i < 24; i++) {
    hoursOrder.push((currentHour + i) % 24);
  }

  // Maximalwerte für die relative Skalierung der Diagramme ermitteln
  const maxDebuffPlayers = Math.max(...debuffHourlyDistribution, 1);
  const maxBuffPlayers = Math.max(...buffHourlyDistribution, 1);

  // ==========================================================================
  // 6. Statusbalken-Berechnung (Nutzt die bereits gefilterten validUsers)
  // ==========================================================================
  let sumCurrentOverall = 0, sumTotalOverall = 0, overallPercent = 0;
  let sumCurrentHealth = 0,  sumTotalHealth = 0,  healthPercent = 0;
  let sumCurrentHunger = 0,  sumTotalHunger = 0,  hungerPercent = 0;

  if (userCount > 0) {
    validUsers.forEach(u => {
      sumCurrentHealth  += u.skills.health?.currentBarValue || 0;
      sumTotalHealth    += u.skills.health?.value || 100;
      
      sumCurrentHunger  += u.skills.hunger?.currentBarValue || 0;
      sumTotalHunger    += u.skills.hunger?.value || 100;

      if (u.skills.overall) {
        sumCurrentOverall += u.skills.overall.currentBarValue || 0;
        sumTotalOverall   += u.skills.overall.value || 0;
      } else {
        const cHealth = u.skills.health?.currentBarValue || 0;
        const tHealth = u.skills.health?.value || 100;
        const cHunger = u.skills.hunger?.currentBarValue || 0;
        const tHunger = u.skills.hunger?.value || 100;
        sumCurrentOverall += (cHealth + cHealth * (cHunger * 0.15));
        sumTotalOverall   += (tHealth + tHealth * (tHunger * 0.15));
      }
    });

    sumCurrentOverall = Math.round(sumCurrentOverall * 10) / 10;
    sumTotalOverall   = Math.round(sumTotalOverall * 10) / 10;

    overallPercent    = sumTotalOverall > 0 ? Math.min(100, Math.max(0, (sumCurrentOverall / sumTotalOverall) * 100)) : 0;
    healthPercent     = sumTotalHealth > 0 ? Math.min(100, Math.max(0, (sumCurrentHealth / sumTotalHealth) * 100)) : 0;
    hungerPercent     = sumTotalHunger > 0 ? Math.min(100, Math.max(0, (sumCurrentHunger / sumTotalHunger) * 100)) : 0;
  }

  return (
    <div className="division-column">
      {/* 1. Divisionsname */}
      <h2 className="division-column-title">{divisionsName}</h2>

      {/* 2. Die Divisions-Statistiken */}
      <div className="division-stats-section">
        <span 
          className="chart-info-icon global-stats-info" 
          title={`Statistiken & Planung für ${divisionsName}:\n• User Gesamt: Alle Accounts (inkl. Eco/Aufbau).\n• Buffs/Debuffs/Timer: Berechnet exakt für die ${userCount} Kampfeinheiten (War/Hybrid).`}
        >
          ⓘ
        </span>

        <div className="division-stats-grid">
          {renderDivisionStats()}
        </div>

        {/* Button zum Ein-/Ausklappen */}
        <button 
          className={`mu-toggle-dashboard-details-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▲ Details ausblenden' : '▼ Diagramme & Statusbalken einblenden'}
        </button>

        {/* Einklappbarer Bereich */}
        {isExpanded && (
          <div className="division-expanded-details-wrapper">
            
            {/* 24h-Balkendiagramm über den BUFF-Auslauf */}
            <div className="division-chart-container section-spacing">
              <div className="chart-header-with-info">
                <h4 className="chart-title">Buff-Ende Verteilung (24h)</h4>
                <span className="chart-info-icon" title="Zeigt an, in welcher Stunde des Tages wie viele aktive Buffs auslaufen.">ⓘ</span>
              </div>
              
              <div className="mu-24h-chart">
                {hoursOrder.map((hour) => {
                  const count = buffHourlyDistribution[hour]; // Wert für diese spezifische Stunde holen
                  const barHeightPercent = (count / maxBuffPlayers) * 100;
                  const hourStr = String(hour).padStart(2, '0');
                  const tooltipText = `${hourStr}:00 - ${hourStr}:59 Uhr\n${count} Buffs laufen aus`;

                  return (
                    <div key={hour} className="chart-bar-wrapper" title={tooltipText}>
                      <div className="chart-bar-value-label">{count > 0 ? count : ''}</div>
                      <div className="chart-bar-bg">
                        <div 
                          className={`chart-bar-fill buff-fill ${count > 0 ? 'has-value' : ''}`} 
                          style={{ height: `${barHeightPercent}%` }}
                        />
                      </div>
                      <div className="chart-bar-hour-label">{hourStr}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 24h-Balkendiagramm über den Debuff-Auslauf */}
            <div className="division-chart-container">
              <div className="chart-header-with-info">
                <h4 className="chart-title">Debuff-Ende Verteilung (24h)</h4>
                <span className="chart-info-icon" title="Zeigt an, in welcher Stunde des Tages wie viele Spieler aus dem Debuff kommen.">ⓘ</span>
              </div>
              
              <div className="mu-24h-chart">
                {hoursOrder.map((hour) => {
                  const count = debuffHourlyDistribution[hour]; // Wert für diese spezifische Stunde holen
                  const barHeightPercent = (count / maxDebuffPlayers) * 100;
                  const hourStr = String(hour).padStart(2, '0');
                  const tooltipText = `${hourStr}:00 - ${hourStr}:59 Uhr\n${count} Spieler kommen aus dem Debuff`;

                  return (
                    <div key={hour} className="chart-bar-wrapper" title={tooltipText}>
                      <div className="chart-bar-value-label">{count > 0 ? count : ''}</div>
                      <div className="chart-bar-bg">
                        <div 
                          className={`chart-bar-fill ${count > 0 ? 'has-value' : ''}`} 
                          style={{ height: `${barHeightPercent}%` }}
                        />
                      </div>
                      <div className="chart-bar-hour-label">{hourStr}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aggregierte Statusbalken (Hunger / Health / Overall) */}
            {userCount > 0 && (
              <div className="mu-status-bars-column" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--color-border, #27272a)' }}>
                
                <div className="chart-header-with-info" style={{ marginBottom: '10px' }}>
                  <h4 className="chart-title" style={{ margin: 0 }}>Gefechtsbereite Gesamtkapazität</h4>
                  <span 
                    className="chart-info-icon" 
                    title={`Hier wird die absolute Kampfkraft der Division summiert.\nEs werden ausschließlich Spieler mit "War" oder "Hybrid" Skillung berücksichtigt (${userCount} Spieler).`}
                    style={{ cursor: 'help' }}
                  >
                    ⓘ
                  </span>
                </div>
                
                {/* Overall Balken */}
                <div className="mu-status-bar-wrapper">
                  <div className="mu-status-bar-labels">
                    <span className="mu-status-bar-name">Overall Gesamt</span>
                    <span className="mu-status-bar-value">{sumCurrentOverall} / {sumTotalOverall}</span>
                  </div>
                  <div className="mu-status-bar-bg">
                    <div className="mu-status-bar-fill fill-overall" style={{ width: `${overallPercent}%` }}>
                      {overallPercent >= 12 && <span className="mu-bar-percent-inside">{Math.round(overallPercent)}%</span>}
                    </div>
                  </div>
                </div>

                {/* Health Balken */}
                <div className="mu-status-bar-wrapper">
                  <div className="mu-status-bar-labels">
                    <span className="mu-status-bar-name">Health Gesamt</span>
                    <span className="mu-status-bar-value">{Math.round(sumCurrentHealth)} / {sumTotalHealth}</span>
                  </div>
                  <div className="mu-status-bar-bg">
                    <div className="mu-status-bar-fill fill-health" style={{ width: `${healthPercent}%` }}>
                      {healthPercent >= 12 && <span className="mu-bar-percent-inside">{Math.round(healthPercent)}%</span>}
                    </div>
                  </div>
                </div>

                {/* Hunger Balken */}
                <div className="mu-status-bar-wrapper">
                  <div className="mu-status-bar-labels">
                    <span className="mu-status-bar-name">Hunger Gesamt</span>
                    <span className="mu-status-bar-value">{Math.round(sumCurrentHunger)} / {sumTotalHunger}</span>
                  </div>
                  <div className="mu-status-bar-bg">
                    <div className="mu-status-bar-fill fill-hunger" style={{ width: `${hungerPercent}%` }}>
                      {hungerPercent >= 12 && <span className="mu-bar-percent-inside">{Math.round(hungerPercent)}%</span>}
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </div>

      {/* 3. Die Liste der MUs */}
      <div className="division-column-items">
        {muEintraege.map((eintrag) => (
          <MuCard
            key={eintrag.id}
            image={eintrag.objekt?.avatarUrl || ""}
            name={eintrag.objekt?.name || "Unbekannte Einheit"}
            stats={{
              "Dmg": eintrag.objekt?.rankings?.muWeeklyDamages?.toLocaleString() || "0",
              "Mem": eintrag.objekt?.members?.length || 0
            }}
            isActive={selectedDivision === divisionsName}
            onClick={() => onMuClick(eintrag, divisionsName)}
          />
        ))}
      </div>
    </div>
  );
}
// ==========================================================================
// 3. Hauptkomponente: Das Dashboard (Orchestriert das Nachladen der User)
// ==========================================================================
export default function DivisionsDashboard({ muData = [], onSelectMu, dataHandler }) {
  const [selectedDivision, setSelectedDivision] = useState(null);
 
  const [allDivisionsUsers, setAllDivisionsUsers] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(false);

useEffect(() => {
  if (!muData || muData.length === 0 || !dataHandler) return;

  async function loadAllUsers() {
    setLoadingUsers(true);
    try {
      const bulkUserData = await dataHandler.getBulkDivisionsUserData(muData);
      setAllDivisionsUsers(bulkUserData);
    } catch (err) {
      console.error("Fehler beim gebündelten Laden der Divisions-User:", err);
    } finally {
      setLoadingUsers(false);
    }
  }

  loadAllUsers();
}, [muData, dataHandler]);

  if (!muData || muData.length === 0) {
    return <div className="divisions-loading">Militäreinheiten werden geladen...</div>;
  }

  // Gruppierung der MUs nach Division (SpaltenName)
  const divisionsMap = {};
  muData.forEach((eintrag) => {
    const divisionsName = eintrag.spaltenName || "Unbekannte Division";
    if (!divisionsMap[divisionsName]) {
      divisionsMap[divisionsName] = [];
    }
    divisionsMap[divisionsName].push(eintrag);
  });

  const handleMuClick = (eintrag, divisionsName) => {
    setSelectedDivision(divisionsName);
    if (onSelectMu) {
      onSelectMu(eintrag);
    }
  };

  return (
    <div className="divisions-dashboard-container">
      {loadingUsers && <div className="users-top-loading-bar">Aktualisiere Divisionenstats...</div>}
      
      <div className="divisions-wrapper">
        {Object.keys(divisionsMap).map((divisionsName) => (
          <DivisionColumn
            key={divisionsName}
            divisionsName={divisionsName}
            muEintraege={divisionsMap[divisionsName]}
            selectedDivision={selectedDivision}
            onMuClick={handleMuClick}
            allDivisionsUsers={allDivisionsUsers}
          />
        ))}
      </div>
    </div>
  );
}