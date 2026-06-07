import { useState } from 'react';
import './mueditor.css';

export default function MuEditor({ muData = [], onCancel }) {
  // 1. Wir flachen alle verfügbaren MUs ab, um eine "Sammelbox" aller MUs zu haben
  const [alleMus] = useState(() => {
    const eindeutige = new Map();
    muData.forEach(item => {
      if (item.objekt) eindeutige.set(item.id, item.objekt);
    });
    return Array.from(eindeutige.entries()).map(([id, obj]) => ({ id, ...obj }));
  });

  // 2. State für unsere Spalten-Struktur
  const [spalten, setSpalten] = useState([
    { category: "Neue Spalte A", ids: [] }
  ]);

  const [neuerSpaltenName, setNeuerSpaltenName] = useState("");
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");

  // ==========================================================================
  // Spalten Management
  // ==========================================================================
  const spalteHinzufuegen = () => {
    if (!neuerSpaltenName.trim()) return;
    setSpalten([...spalten, { category: neuerSpaltenName.trim(), ids: [] }]);
    setNeuerSpaltenName("");
  };

  const spalteLoeschen = (index) => {
    setSpalten(spalten.filter((_, i) => i !== index));
  };

  // ==========================================================================
  // Drag and Drop Logik
  // ==========================================================================
  const handleDragStart = (e, muId, vonSpalteIdx) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ muId, vonSpalteIdx }));
  };

  const handleDrop = (e, zielSpalteIdx) => {
    e.preventDefault();
    try {
      const { muId, vonSpalteIdx } = JSON.parse(e.dataTransfer.getData("text/plain"));
      
      // Kopie der Spalten erstellen
      const neueSpalten = [...spalten];

      // Falls es aus einer anderen Spalte kommt (und nicht aus der All-MU-Sammelbox)
      if (vonSpalteIdx !== "pool") {
        neueSpalten[vonSpalteIdx].ids = neueSpalten[vonSpalteIdx].ids.filter(id => id !== muId);
      }

      // In der Zielspalte einfügen, sofern noch nicht vorhanden
      if (!neueSpalten[zielSpalteIdx].ids.includes(muId)) {
        neueSpalten[zielSpalteIdx].ids.push(muId);
        setSpalten(neueSpalten);
      }
    } catch (err) {
      console.error("Drop Fehler", err);
    }
  };

  const ausSpalteEntfernen = (spaltenIdx, muId) => {
    const neueSpalten = [...spalten];
    neueSpalten[spaltenIdx].ids = neueSpalten[spaltenIdx].ids.filter(id => id !== muId);
    setSpalten(neueSpalten);
  };

  // ==========================================================================
  // Import / Export Logik (Exakt abgestimmt auf deinen Regex-Parser!)
  // ==========================================================================
  const exportieren = () => {
    let html = "";
    spalten.forEach(spalte => {
      if (spalte.ids.length === 0) return;
      html += `<h2>${spalte.category}</h2>\n`;
      spalte.ids.forEach(id => {
        // Generiert exakt den String, den dein Parser sucht: muId&quot;:&quot;ID
        html += `<div data-info="muId&quot;:&quot;${id}">MU Eintrag</div>\n`;
      });
    });
    setExportText(html);
  };

  const importieren = () => {
    if (!importText) return;
    const geparsteGruppen = [];
    const parts = importText.split(/<h2[^>]*>/);
    
    parts.forEach((part, index) => {
      if (index === 0) return; 
      const nameMatch = part.match(/([^<]+)<\/h2>/);
      if (!nameMatch) return;
      const divisionName = nameMatch[1].trim();
      
      const aktuelleGruppe = { category: divisionName, ids: [] };
      const muRegex = /muId&quot;:&quot;([a-f0-9]{24})/g;
      let match;
      while ((match = muRegex.exec(part)) !== null) {
        aktuelleGruppe.ids.push(match[1]);
      }
      if (aktuelleGruppe.ids.length > 0) geparsteGruppen.push(aktuelleGruppe);
    });

    if (geparsteGruppen.length > 0) {
      setSpalten(geparsteGruppen);
      alert("Erfolgreich importiert!");
    } else {
      alert("Es wurden keine gültigen Spalten/MUs im Text gefunden.");
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2>MU-Umsortierer & Artikel-Designer</h2>
        <button className="btn-secondary" onClick={onCancel}>Editor Schließen</button>
      </div>

      {/* Box 1: Im- und Export Bereich */}
      <div className="editor-io-section">
        <div className="io-box">
          <h4>Manuelle Artikel-Daten importieren</h4>
          <textarea 
            placeholder="Füge hier das HTML aus deinem bestehenden Artikel ein..." 
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button className="btn-primary" onClick={importieren}>Importieren</button>
        </div>
        <div className="io-box">
          <h4>Exportiertes Artikel-Format</h4>
          <textarea 
            readOnly 
            placeholder="Klicke unten auf Exportieren, um den Code für dein WarEra-Artikel-Inhalt zu generieren..." 
            value={exportText}
          />
          <button className="btn-secondary" onClick={exportieren}>Code generieren</button>
        </div>
      </div>

      {/* Steuerung neue Spalte */}
      <div className="editor-controls">
        <input 
          type="text" 
          placeholder="Name der neuen Division/Spalte..." 
          value={neuerSpaltenName}
          onChange={(e) => setNeuerSpaltenName(e.target.value)}
        />
        <button className="btn-primary" onClick={spalteHinzufuegen}>Spalte hinzufügen</button>
      </div>

      {/* Das Drag-and-Drop Grid-System */}
      <div className="editor-workspace">
        
        {/* LINKE SPALTE: Alle verfügbaren MUs (Der Pool) */}
        <div className="mu-pool">
          <h3>Alle geladenen MUs</h3>
          <p className="hint">Ziehe Einheiten von hier in die Spalten</p>
          <div className="pool-items">
            {alleMus.map(mu => (
              <div 
                key={mu.id} 
                className="draggable-mu-card"
                draggable
                onDragStart={(e) => handleDragStart(e, mu.id, "pool")}
              >
                {mu.avatarUrl && <img src={mu.avatarUrl} alt="" />}
                <span>{mu.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RECHTE SPALTE: Die dynamischen Spalten */}
        <div className="editor-columns-grid">
          {spalten.map((spalte, sIdx) => (
            <div 
              key={sIdx} 
              className="editor-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, sIdx)}
            >
              <div className="column-header">
                <h4>{spalte.category} ({spalte.ids.length})</h4>
                <button className="btn-delete" onClick={() => spalteLoeschen(sIdx)}>×</button>
              </div>
              <div className="column-dropzone">
                {spalte.ids.length === 0 && <div className="placeholder-text">Hierher ziehen...</div>}
                {spalte.ids.map(id => {
                  const muObj = alleMus.find(m => m.id === id);
                  return (
                    <div 
                      key={id} 
                      className="draggable-mu-card in-column"
                      draggable
                      onDragStart={(e) => handleDragStart(e, id, sIdx)}
                    >
                      <div className="card-left">
                        {muObj?.avatarUrl && <img src={muObj.avatarUrl} alt="" />}
                        <span>{muObj?.name || `ID: ${id.substring(0,6)}`}</span>
                      </div>
                      <button className="btn-remove" onClick={() => ausSpalteEntfernen(sIdx, id)}>entfernen</button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}