import 'react';
import './grid.css';

// 1. Die Item-Komponente mit neuem Layout (Bild links, Text/Stats rechts)
function GridItem({ image, name, stats = {} }) {
  const statEntries = Object.entries(stats).slice(0, 4);

  return (
    <div className="grid-item">
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
function GroupedGrid({ groups }) {
  return (
    <div className="grouped-grid-container">
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName} className="grid-column">
          <h2 className="column-title">{groupName}</h2>
          <div className="column-items">
            {items.map((item) => (
              <GridItem
                key={item.id}
                image={item.image}
                name={item.name}
                stats={item.stats}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default GroupedGrid;
