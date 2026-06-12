import { useState } from 'react';
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

// ==========================================================================
// 2. Unterkomponente: Die Divisions-Spalte (Eigene Komponente für die Spalte)
// ==========================================================================
function DivisionColumn({ divisionsName, muEintraege, selectedDivision, onMuClick }) {
  // Hilfsfunktion zum Rendern der 8 Divisions-Statistiken (2 breit, 4 tief per CSS Grid)
  const renderDivisionStats = () => {
    // Hier kannst du später echte aggregierte Daten der MUs berechnen
    const dummyKeys = [
      "Gesamtschaden", "Aktive Member", 
      "Schnitt-Level", "Pillen-Quote",
      "Kommandeure", "Eco-Spezis", 
      "War-Spezis", "HQ-Schnitt"
    ];

    return dummyKeys.map((statName, index) => (
      <div key={index} className="division-stat-box">
        <span className="division-stat-label">{statName}:</span>
        <span className="division-stat-value">Wert {index + 1}</span>
      </div>
    ));
  };

  return (
    <div className="division-column">
      {/* 1. Divisionsname */}
      <h2 className="division-column-title">{divisionsName}</h2>

      {/* 2. NEU: Die Divisions-Statistiken (Immer sichtbar, direkt unter dem Titel) */}
      <div className="division-stats-section">
        <div className="division-stats-grid">
          {renderDivisionStats()}
        </div>

        {/* Platzhalter für das spätere Balkendiagramm der Division */}
        <div className="division-chart-container">
          <span className="chart-placeholder-text">[ Balkendiagramm Platzhalter ]</span>
        </div>
      </div>

      {/* 3. Die Liste der MUs, die zu dieser Division gehören */}
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
// 3. Hauptkomponente: Das Dashboard (Nutzt jetzt die DivisionColumn)
// ==========================================================================
function DivisionsDashboard({ muData = [], onSelectMu }) {
  const [selectedDivision, setSelectedDivision] = useState(null);

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
      
      {/* Oberer Bereich: Nutzt jetzt sauber die neue DivisionColumn Komponente */}
      <div className="divisions-grid-container">
        {Object.entries(divisionsMap).map(([divisionsName, muEintraege]) => (
          <DivisionColumn
            key={divisionsName}
            divisionsName={divisionsName}
            muEintraege={muEintraege}
            selectedDivision={selectedDivision}
            onMuClick={handleMuClick}
          />
        ))}
      </div>
    </div>
  );
}

export default DivisionsDashboard;