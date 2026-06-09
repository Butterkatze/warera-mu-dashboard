import { useState } from 'react';
import './mueditor.css';

//export default function MuEditor({ muData = [], onCancel, dataHandler, onRefresh }) {
export default function MuEditor({ muData = [], dataHandler, onRefresh }) { 
  const [spalten, setSpalten] = useState(() => {
    if (muData && muData.length > 0) {
      const map = new Map();
      muData.forEach(eintrag => {
        if (!eintrag) return;
        const name = eintrag.spaltenName || "Unbenannte Division";
        const id = eintrag.id;
        if (!map.has(name)) map.set(name, []);
        if (id) map.get(name).push(id.toString());
      });
      return Array.from(map.entries()).map(([category, ids]) => ({ category, ids }));
    }
    return [{ category: "Divisionsname", ids: [] }];
  });

  const [editSpaltenIdx, setEditSpaltenIdx] = useState(null);
  const [editNameText, setEditNameText] = useState("");
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [isIoOpen, setIsIoOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState("");

  const [activeAddIdIdx, setActiveAddIdIdx] = useState(null);
  const [neueMuIdText, setNeueMuIdText] = useState("");

  const [muLookup, setMuLookup] = useState(() => {
    const map = new Map();
    muData.forEach(item => {
      if (item && item.objekt && item.id) {
        map.set(item.id.toString(), item.objekt);
      }
    });
    return map;
  });

  const spalteHinzufuegenDirect = () => {
    setSpalten([...spalten, { category: "Divisionsname", ids: [] }]);
  };

  const spalteLoeschen = (index) => {
    setSpalten(spalten.filter((_, i) => i !== index));
  };

  const starteUmbenennen = (idx, aktuellerName) => {
    setEditSpaltenIdx(idx);
    setEditNameText(aktuellerName);
  };

  const speichereSpaltenName = (idx) => {
    if (editNameText.trim()) {
      const neueSpalten = [...spalten];
      neueSpalten[idx].category = editNameText.trim();
      setSpalten(neueSpalten);
    }
    setEditSpaltenIdx(null);
  };

  const muIdHinzufuegen = async (e, spaltenIdx) => {
    e.preventDefault();
    const bereinigteId = neueMuIdText.trim();
    if (!bereinigteId) {
      setActiveAddIdIdx(null);
      return;
    }

    const neueSpalten = [...spalten];
    neueSpalten[spaltenIdx].ids.push(bereinigteId);
    setSpalten(neueSpalten);
    
    setNeueMuIdText("");
    setActiveAddIdIdx(null);

    if (dataHandler && !muLookup.has(bereinigteId)) {
      try {
        const neueDetailsMap = await dataHandler.getMultipleMusByIds([bereinigteId]);
        
        setMuLookup(prev => new Map([...prev, ...neueDetailsMap]));
      } catch (err) {
        console.error("Fehler beim Nachladen der MU-Details über DataHandler:", err);
      }
    }
  };

  const handleDropOnColumn = (e, zielSpalteIdx, zielItemIdx = null) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const neueSpalten = [...spalten];

      if (data.type === "item") {
        const { muId, vonSpalteIdx, vonItemIdx } = data;
        neueSpalten[vonSpalteIdx].ids.splice(vonItemIdx, 1);

        const zielIds = neueSpalten[zielSpalteIdx].ids;
        if (zielItemIdx === null) {
          zielIds.push(muId);
        } else {
          zielIds.splice(zielItemIdx, 0, muId);
        }
        setSpalten(neueSpalten);
      } 
      else if (data.type === "column") {
        const { vonSpalteIdx } = data;
        if (vonSpalteIdx === zielSpalteIdx) return;

        const verschobeneSpalte = neueSpalten.splice(vonSpalteIdx, 1)[0];
        neueSpalten.splice(zielSpalteIdx, 0, verschobeneSpalte);
        setSpalten(neueSpalten);
      }
    } catch (err) {
      console.error("Drop-Fehler:", err);
    }
  };

  const ausSpalteEntfernen = (spaltenIdx, itemIdx) => {
    const neueSpalten = [...spalten];
    neueSpalten[spaltenIdx].ids.splice(itemIdx, 1);
    setSpalten(neueSpalten);
  };

  const exportieren = async () => {
    if (dataHandler) {
      const htmlOutput = dataHandler.exportSpaltenToHtml(spalten);
      setExportText(htmlOutput);

      try {
        await navigator.clipboard.writeText(htmlOutput);
        setCopySuccess("Code wurde in die Zwischenablage kopiert! ✓");
        
        // Blendet die Info nach 3 Sekunden automatisch wieder aus
        setTimeout(() => {
          setCopySuccess("");
        }, 3000);
      } catch (err) {
        console.error("Fehler beim Kopieren in die Zwischenablage:", err);
        setCopySuccess("Fehler beim automatischen Kopieren.");
      }
    }
  };

  const importieren = async () => {
    if (!importText || !dataHandler) return;
    
    const geparsteGruppen = dataHandler.parseRawHtmlContent(importText);

    if (geparsteGruppen.length > 0) {
      setSpalten(geparsteGruppen);
      setIsIoOpen(false);

      const alleIds = geparsteGruppen.flatMap(gruppe => gruppe.ids || []);

      try {
        const neueDetailsMap = await dataHandler.getMultipleMusByIds(alleIds);

        setMuLookup(prev => new Map([...prev, ...neueDetailsMap]));
      } catch (e) {
        console.warn("Zusatzinfos für Import konnten nicht geladen werden:", e);
      }
    } else {
      alert("Keine gültigen Daten im Artikelformat gefunden.");
    }
  };

  // NEU: Eigenes Layout manuell aktivieren
  const handleApplyLayout = () => {
    if (dataHandler) {
      dataHandler.saveCustomLayout(spalten);
      setCopySuccess("Layout auf der Übersicht angewendet! ✓");
      if (typeof onRefresh === 'function') onRefresh(); 
      setTimeout(() => setCopySuccess(""), 3500);
    }
  };

  // NEU: Eigenes Layout manuell vernichten
  const handleResetLayout = () => {
    if (dataHandler) {
      dataHandler.saveCustomLayout([]); // Übergibt leeres Array -> löscht aus Storage
      setCopySuccess("Eigenes Layout gelöscht! Artikel-Standard aktiv. ✓");
      if (typeof onRefresh === 'function') onRefresh(); 
      setTimeout(() => setCopySuccess(""), 3500);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2>Divisons-Editor</h2>
      </div>

      <div className="editor-accordion">
        <button 
          type="button"
          className="accordion-toggle" 
          onClick={() => setIsIoOpen(prev => !prev)}
        >
          {isIoOpen ? "▼ Code-Bereich (Im- / Export) ausblenden" : "▲ Code-Bereich (Im- / Export) einblenden"}
        </button>
        
        {isIoOpen && (
          <div className="editor-io-section">
            <div className="io-box">
              <h4>Manuelle Artikel-Daten importieren</h4>
              <textarea 
                placeholder="Füge hier das HTML aus deinem bestehenden Artikel ein..." 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button type="button" className="btn-primary" onClick={importieren}>Importieren</button>
            </div>
            <div className="io-box">
              <h4>Exportiertes Artikel-Format</h4>
              <textarea 
                readOnly 
                placeholder="Klicke auf Generieren, um den Code für dein WarEra-Artikel zu erhalten..." 
                value={exportText}
              />
              <button type="button" className="btn-secondary" onClick={exportieren}>Code generieren & kopieren</button>
            </div>
          </div>
        )}
      </div>

      <div className="editor-workspace full-width">
        <div className="editor-columns-grid wrap-mode">
          {spalten.map((spalte, sIdx) => (
            <div 
              key={sIdx} 
              className="editor-column"
              draggable
              onDragOver={(e) => e.preventDefault()}
              onDragStart={(e) => {
                if (e.target.className && e.target.className.includes('editor-column')) {
                  e.dataTransfer.setData("text/plain", JSON.stringify({ type: "column", vonSpalteIdx: sIdx }));
                }
              }}
              onDrop={(e) => handleDropOnColumn(e, sIdx)}
            >
              <div className="column-header">
                {editSpaltenIdx === sIdx ? (
                  <input 
                    type="text"
                    className="column-name-edit-input"
                    value={editNameText}
                    onChange={(e) => setEditNameText(e.target.value)}
                    onBlur={() => speichereSpaltenName(sIdx)}
                    onKeyDown={(e) => e.key === 'Enter' && speichereSpaltenName(sIdx)}
                    autoFocus
                  />
                ) : (
                  <h4 
                    className="clickable-column-title" 
                    onClick={() => starteUmbenennen(sIdx, spalte.category)}
                  >
                    {spalte.category} <span className="column-count">({spalte.ids.length})</span>
                  </h4>
                )}
                <button type="button" className="btn-delete-column" onClick={() => spalteLoeschen(sIdx)}>×</button>
              </div>
              
              <div className="column-dropzone">
                {spalte.ids.length === 0 && activeAddIdIdx !== sIdx && (
                  <div className="placeholder-text">Hierher ziehen...</div>
                )}
                
                {spalte.ids.map((id, itemIdx) => {
                  const muObj = muLookup.get(id.toString());
                  return (
                    <div 
                      key={`${id}-${itemIdx}`} 
                      className="draggable-mu-card in-column"
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation(); 
                        e.dataTransfer.setData("text/plain", JSON.stringify({ type: "item", muId: id, vonSpalteIdx: sIdx, vonItemIdx: itemIdx }));
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.stopPropagation(); 
                        handleDropOnColumn(e, sIdx, itemIdx);
                      }}
                    >
                      <div className="card-left">
                        {muObj?.avatarUrl ? <img src={muObj.avatarUrl} alt="" /> : <div className="mu-mini-placeholder">?</div>}
                        <span className="mu-card-name">{muObj?.name || `ID: ${id.substring(0,6)}`}</span>
                      </div>
                      <button type="button" className="btn-remove-item" onClick={() => ausSpalteEntfernen(sIdx, itemIdx)}>×</button>
                    </div>
                  );
                })}

                {activeAddIdIdx === sIdx ? (
                  <form onSubmit={(e) => muIdHinzufuegen(e, sIdx)} className="inline-mu-id-form">
                    <input 
                      type="text"
                      placeholder="MU ID einfügen..."
                      className="inline-mu-id-input"
                      value={neueMuIdText}
                      onChange={(e) => setNeueMuIdText(e.target.value)}
                      onBlur={(e) => muIdHinzufuegen(e, sIdx)}
                      autoFocus
                    />
                  </form>
                ) : (
                  <button 
                    type="button" 
                    className="btn-inline-add-mu-card"
                    onClick={() => {
                      setNeueMuIdText("");
                      setActiveAddIdIdx(sIdx);
                    }}
                  >
                    + Einheit per ID hinzufügen
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="editor-column-add-card">
            <button 
              type="button" 
              className="btn-add-column-plus" 
              onClick={spalteHinzufuegenDirect}
              title="Neue Division hinzufügen"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="editor-footer-actions right-aligned">
        {/* Visuelles Feedback für den Nutzer über eine CSS-Klasse */}
        {copySuccess && (
          <span className="copy-status-message">
            {copySuccess}
          </span>
        )}

        {/*
        <button type="button" className="btn-editor-secondary small" onClick={onCancel}>
          Editor Schließen
        </button>
        */}

        <button type="button" className="btn-editor-danger small" onClick={handleResetLayout}>
          Eigenes Layout löschen
        </button>

        <button type="button" className="btn-editor-success small" onClick={handleApplyLayout}>
          Eigenes Layout anwenden
        </button>

        <button 
          type="button" 
          className="btn-editor-primary small" 
          onClick={() => {
            exportieren();
            setIsIoOpen(true);
          }}
        >
          Code generieren  & kopieren
        </button>
      </div>

    </div>
  );
}