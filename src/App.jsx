import { useState } from 'react';
//import { useState, useEffect, useCallback } from 'react';
import './index.css';
//import { getWarEraClient } from './api.js'; // Pfad zu deiner api.js anpassen
//import MuDetails from './MUDetails.jsx';
import Tokenhandler from './components/tokenhandler.jsx';
import GroupedGrid from './components/groupedgrid.jsx';
import { getMUFromArticle } from './components/datahandler.js';

const ARTICLE_ID = '6a1f025b37df43a8d01bb9a2'; 

// Beispieldaten: Nach Gruppen (Spalten) sortiert
const MOCK_GROUPS_DATA = {
  "Angreifer": [
    { id: 1, name: "Smaragd-Krieger", image: "https://picsum.photos/200/140?random=1", stats: { Atk: 85, Def: 40, Speed: 70 } },
    { id: 2, name: "Schatten-Klinge", image: "https://picsum.photos/200/140?random=2", stats: { Atk: 95, Def: 20, Speed: 90 } },
    { id: 3, name: "Obsidian-Wall", image: "https://picsum.photos/200/140?random=3", stats: { Atk: 30, Def: 95, Speed: 25 } },
    { id: 4, name: "Granit-Wächter", image: "", stats: { Atk: 45, Def: 80, Speed: 35 } } // Ohne Bild zum Testen des Placeholders
  ],
  "Verteidiger": [
    { id: 3, name: "Obsidian-Wall", image: "https://picsum.photos/200/140?random=3", stats: { Atk: 30, Def: 95, Speed: 25 } },
    { id: 4, name: "Granit-Wächter", image: "", stats: { Atk: 45, Def: 80, Speed: 35 } } // Ohne Bild zum Testen des Placeholders
  ],
  "Verteiddiger": [
    { id: 3, name: "Obsidian-Wall", image: "https://picsum.photos/200/140?random=3", stats: { Atk: 30, Def: 95, Speed: 25 } },
    { id: 4, name: "Granit-Wächter", image: "", stats: { Atk: 45, Def: 80, Speed: 35 } } // Ohne Bild zum Testen des Placeholders
  ],
  "Vedrteidiger": [
    { id: 3, name: "Obsidian-Wall", image: "https://picsum.photos/200/140?random=3", stats: { Atk: 30, Def: 95, Speedjksdfkjlsdfjklsdfkjl: 25 } },
    { id: 4, name: "Granit-Wächter", image: "", stats: { Atk: 45, Def: 80, Speed: 35 } } // Ohne Bild zum Testen des Placeholders
  ],
  "Vedsrteidiger": [
    { id: 3, name: "Obsidian-Wall", image: "https://picsum.photos/200/140?random=3", stats: { Atk: 30, Def: 95, Speed: 25 } },
    { id: 4, name: "Granit-Wächter", image: "", stats: { Atk: 45, Def: 80, Speed: 35 } } // Ohne Bild zum Testen des Placeholders
  ],
  "Verteidigedr": [
    { id: 3, name: "Obsidian-Wall", image: "https://picsum.photos/200/140?random=3", stats: { Atk: 30, Def: 95, Speed: 25 } },
    { id: 4, name: "Granit-Wächter", image: "", stats: { Atk: 45, Def: 80, Speed: 35 } } // Ohne Bild zum Testen des Placeholders
  ],
  "Unterstützer": [
    { id: 5, name: "", image: "", stats: { Atk: 20, Def: 50, Heal: 80 } }
  ]
};

function App() {
  
  const [apiKey, setApiKey] = useState(() => {
        try {
          return localStorage.getItem("warera_api_key") || "";
        } catch {
          return "";
        }
      });

  const [showTokenPopup, setShowTokenPopup] = useState(apiKey === "");
  

  

  if (showTokenPopup) {
    return (
    <>
    <div className="token-container">
        {/* Comment*/}
        <Tokenhandler 
        setApiKey={setApiKey} 
        ARTICLE_ID={ARTICLE_ID} 
        onClose={() => {
          setShowTokenPopup(false);
          getMUFromArticle(ARTICLE_ID);
        }}
    />
    </div>

    </>
    );
  }



    return (
    <>
      <div className="page-container">
      {/* Neuer Header-Container für die Nebeneinander-Anordnung */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Willkommen auf der Hauptseite (Fake-Page)</h1>
          <p>Das Token-Popup wurde erfolgreich geschlossen.</p>
          <p>Aktueller API-Key Status: {apiKey}</p>
        </div>
        
        <div className="page-actions">
          <button 
            className="btn-secondary-keychange" 
            onClick={() => setShowTokenPopup(true)}
          >
            API-Token ändern
          </button>
        </div>
      </div>
    </div>
    
    
    
    <hr className="color-border" style={{ margin: '25px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

    {/* Hier wird die neue Grid-Komponente aufgerufen */}
        <GroupedGrid groups={MOCK_GROUPS_DATA} />
    </>
    );
}

export default App;