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


  const [muData, setMuData] = useState(() => {
    const savedKey = localStorage.getItem("warera_api_key") || FAKE_KEY;
    const savedId = localStorage.getItem("warera_article_id") || DEFAULT_ARTICLE_ID;
    
    // Wenn Daten da sind, versuchen wir die Daten direkt synchron aus dem Cache zu kratzen
    if (savedKey !== FAKE_KEY) {
      const cacheKey = `mu_cache_${savedId}`; // Basiert auf deiner Logik im Datahandler
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          // Falls dein Cache-Format ein direktes Array hergibt oder über getMUFromArticle kommt:
          // Hinweis: Wenn getMUFromArticle asynchron baut, triggern wir das unten beim Start.
        }
      } catch (e) {
        console.error("Cache-Boot-Fehler", e);
      }
    }
    return [];
  });


  const handleLoadData = async (targetId, forceUpdate = false) => {
    if (!targetId) return;
    setIsLoading(true);
    try {
      console.log("Event-gesteuertes Laden für ID:", targetId);
      const handlerInstance = new DataHandler(targetId, forceUpdate);
      const data = await handlerInstance.getMUFromArticle();
      setMuData(data);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [hasCheckedInitialData, setHasCheckedInitialData] = useState(false);
  if (!showTokenPopup && !hasCheckedInitialData) {
    setHasCheckedInitialData(true);
    handleLoadData(articleId);
  }

  // Hilfsfunktion für den Start nach dem ersten erfolgreichen Login
  const closePopup = () => {
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
            closePopup();
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
              onClick={() => handleLoadData(articleId, true)}
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