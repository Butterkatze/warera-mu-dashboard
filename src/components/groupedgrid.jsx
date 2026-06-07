import './groupedgrid.css';

// 1. Die Item-Komponente mit neuem Layout (Bild links, Text/Stats rechts)
function GridItem({ image, name, stats = {}, onClick }) {
  const statEntries = Object.entries(stats).slice(0, 4);

  return (
    <div 
      className="grid-item clickable" // <--- "clickable" Klasse hinzugefügt
      onClick={onClick}                // <--- Klick-Event registriert
  >
      {/* Linke Seite: Bild */}
      <div className="grid-item-image-wrapper">
        {image ? (
          <img src={image} alt={name} className="grid-item-image" />
        ) : (
          <div className="grid-item-placeholder">Kein Bild</div>
        )}
      </div>

      {/* Rechte Seite: Inhalt */}
      <div className="grid-item-content">
        <h3 className="grid-item-title">{name}</h3>
        
        {/* 2x2 Grid für die Stats */}
        <div className="grid-item-stats-grid">
          {statEntries.map(([key, value]) => (
            <div key={key} className="grid-item-stat-box">
              <span className="stat-label">{key}:</span>
              <span className="stat-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function GroupedGrid({ muData = [], onSelectMu }) {
  
  if (!muData || muData.length === 0) {
    return <div className="grid-loading">Militäreinheiten werden geladen...</div>;
  }

  const gruppierteDaten = {};

  muData.forEach((eintrag) => {
    const nameDerSpalte = eintrag.spaltenName;
    
    // Wenn die Spalte im Hilfsobjekt noch nicht existiert, legen wir sie als leeres Array an
    if (!gruppierteDaten[nameDerSpalte]) {
      gruppierteDaten[nameDerSpalte] = [];
    }
    
    // Wir schieben das eigentliche MU-Objekt in diese Spalte
    gruppierteDaten[nameDerSpalte].push(eintrag);
  });


  return (
    <div className="grouped-grid-container">
      {Object.entries(gruppierteDaten).map(([groupName, muEintraege]) => (
        <div key={groupName} className="grid-column">
          <h2 className="column-title">{groupName}</h2>
          <div className="column-items">
            {muEintraege.map((eintrag) => (
              <GridItem
                key={eintrag.id}
                image={eintrag.objekt?.avatarUrl || ""}
                name={eintrag.objekt?.name || "Unbekannte Einheit"}
                stats={{
                  "Weekly Dmg": eintrag.objekt?.rankings?.muWeeklyDamages?.toLocaleString() || "0",
                  "Members": eintrag.objekt?.members?.length || 0
                }}
                onClick={() =>  onSelectMu && onSelectMu(eintrag) }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default GroupedGrid;
