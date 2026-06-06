import { useState } from 'react';
//import { useState, useEffect, useCallback } from 'react';
import './index.css';
import Tokenhandler from './components/tokenhandler.jsx';
import GroupedGrid from './components/groupedgrid.jsx';
import { DataHandler } from './components/datahandler.js';


const FAKE_KEY = 'get_rickrolled'; 
const DEFAULT_ARTICLE_ID = '6a1f025b37df43a8d01bb9a2';




function App() {

  const [articleId, setArticleId] = useState(() => {
    try {
      return localStorage.getItem("warera_article_id") || DEFAULT_ARTICLE_ID;
    } catch {
      return DEFAULT_ARTICLE_ID;
    }
  });
  
  const [apiKey, setApiKey] = useState(() => {
        try {
          return localStorage.getItem("warera_api_key") || FAKE_KEY;
        } catch {
          return FAKE_KEY;
        }
      });

  const [showTokenPopup, setShowTokenPopup] = useState(apiKey === FAKE_KEY);
  const [isLoading, setIsLoading] = useState(false);
  const [muData, setMuData] = useState([]);

  // Reine Event-Funktion: Wird nur gefeuert, wenn sie explizit aufgerufen wird.
  // Da sie von keinem State abhängt, gibt es null Kaskaden-Gefahr!
  const handleLoadData = async (targetId) => {
    if (!targetId) return;
    setIsLoading(true);
    try {
      console.log("Event-gesteuertes Laden für ID:", targetId);
      const handlerInstance = new DataHandler(targetId);
      const data = await handlerInstance.getMUFromArticle();
      setMuData(data);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Hilfsfunktion für den Start nach dem ersten erfolgreichen Login
  const handleInitialClose = () => {
    setShowTokenPopup(false);
    handleLoadData(articleId);
  };
    return (
    <>
      {showTokenPopup && (
        <Tokenhandler 
          setApiKey={setApiKey} 
          articleId = {articleId}
          DEFAULT_ARTICLE_ID = {DEFAULT_ARTICLE_ID}
          setArticleId ={setArticleId}
          onRefresh={(newId) => handleLoadData(newId)}
          onClose={() => {
            handleInitialClose();
          }}
        />
      )}


      <div className="page-container">
      {/* Neuer Header-Container für die Nebeneinander-Anordnung */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Militray Unit Dashboard</h1>
          <p>Aktueller API-Key Status: {apiKey}</p>
        </div>
        
        <div className="page-actions">
          <button 
            className="btn-secondary-keychange" 
            onClick={() => setShowTokenPopup(true)}
          >
            API-Token ändern
          </button>

          {/* Manueller Refresh Button (Optional, aber extrem praktisch) */}
          <button 
              className="btn-secondary"
              disabled={isLoading}
              onClick={() => handleLoadData(articleId)}
            >
              {isLoading ? "Lädt..." : "Aktualisieren"}
            </button>
        </div>
      </div>
    </div>
    
    
    
    <hr className="color-border" style={{ margin: '25px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

    {/* Wenn wir frisch reinkommen und noch laden */}
    {isLoading && muData.length === 0 ? (
          <div className="grid-loading">Militäreinheiten werden geladen...</div>
        ) : (
          <GroupedGrid muData={muData} />
        )}
    </>
    );
}

export default App;