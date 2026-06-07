import { useState, useEffect, useMemo } from 'react';
import './index.css';
import Tokenhandler from './components/tokenhandler.jsx';
import GroupedGrid from './components/groupedgrid.jsx';
import MuDashboard from './components/mudashboard.jsx';
import MuEditor from './components/mueditor.jsx';
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
  
  const dataHandler = useMemo(() => new DataHandler(DEFAULT_ARTICLE_ID), []);

  useEffect(() => {
    if (dataHandler && typeof dataHandler.setArticleId === 'function') {
      dataHandler.setArticleId(articleId);
    }
  }, [articleId, dataHandler]);

  const [showTokenPopup, setShowTokenPopup] = useState(apiKey === FAKE_KEY);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedMu, setSelectedMu] = useState(null);


  const [muData, setMuData] = useState(() => {
    const savedKey = localStorage.getItem("warera_api_key") || FAKE_KEY;
    const savedId = localStorage.getItem("warera_article_id") || DEFAULT_ARTICLE_ID;
    
    if (savedKey !== FAKE_KEY) {
      const cacheKey = `mu_cache_${savedId}`;
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          // Cache-Boot Vorbereitung (falls benötigt)
        }
      } catch (e) {
        console.error("Cache-Boot-Fehler", e);
      }
    }
    return [];
  });    

//##########################   fake funtions #####################/

  useEffect(() => {
    if (selectedMu) {
      const currentId = selectedMu.id;
      if (window.history.state?.muId !== currentId) {
        window.history.pushState({ view: 'dashboard', muId: currentId }, '');
      }
    }

    // 2. Event-Listener für die Zurück-Taste (popstate)
    const handlePopState = (event) => {
      const state = event.state;

      if (state && state.view === 'dashboard' && state.muId) {
        // VORWÄRTS: Der Browser-State hat eine ID? Dann suchen wir die passende MU aus muData
        const passendeMu = muData.find(eintrag => eintrag.id === state.muId);
        if (passendeMu) {
          setSelectedMu(passendeMu);
        } else {
          // Fallback, falls muData noch leer ist oder frisch lädt
          setSelectedMu(null);
        }
      } else {
        // ZURÜCK: Kein gültiger Dashboard-State? Zurück zur Übersicht!
        setSelectedMu(null);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedMu, muData]); // muData als Dependency, damit wir die Objekte beim Vorwärtsgehen finden

  // Hilfsfunktion für den manuellen "Zurück"-Button im Dashboard
  const handleBackToGrid = () => {
    if (window.history.state?.view === 'dashboard') {
      window.history.back(); // Löst das popstate-Event aus
    } else {
      setSelectedMu(null);
    }
  };


  const handleLoadData = async (targetId, forceUpdate = false) => {
    if (!targetId) return;
    setIsLoading(true);
    try {
      console.log("Event-gesteuertes Laden über globale Instanz für ID:", targetId);
      
      // Zustand der bestehenden Instanz updaten statt "new DataHandler()"
      dataHandler.setForceUpdate(forceUpdate)
      dataHandler.setArticleId(targetId);
      

      const data = await dataHandler.getMUFromArticle();
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
  //####################### html ##################/
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
          dataHandler={dataHandler}
        />
      )}


      <div className="page-container">
          <div className="page-header">
            <div className="page-header-text">
              <h1>Military Unit Dashboard</h1>
              <p className="api-key-status">
                <span className="api-key-label">Aktueller API-Key Status:</span> 
                <code className="api-key-value">{apiKey}</code>
              </p>
            </div>
            
            <div className="page-actions">
              <button 
                className={`btn-secondary ${isEditorOpen ? 'is-active' : ''}`}
                onClick={() => setIsEditorOpen(!isEditorOpen)}
              >
                {isEditorOpen ? "Editor Schließen" : "Layout-Umsortierer"}
              </button>

              <button 
                className="btn-secondary-keychange" 
                onClick={() => setShowTokenPopup(true)}
              >
                API-Token ändern
              </button>

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
      
      {/* Die Trennlinie nutzt nun ausschließlich die CSS-Klasse */}
      <hr className="color-border" />

    {/*######################################    Inhalt           #######################################*/}
    {isEditorOpen ? (
        <MuEditor 
          muData={muData} 
          onCancel={() => setIsEditorOpen(false)} 
          dataHandler={dataHandler}
        />
      ) : selectedMu ? (
      <div className="dashboard-view-container">
        <button 
          className="btn-secondary" 
          style={{ marginBottom: '20px' }} 
          onClick={handleBackToGrid} 
        >
          ← Zurück zur Übersicht
        </button>
        
        <MuDashboard 
          selectedMu={selectedMu} 
          dataHandler={dataHandler}
        />
      </div>
    ) : (
      /* WENN KEIN selectedMu existiert (null ist), zeigen wir das normale Grid */
      isLoading && muData.length === 0 ? (
        <div className="grid-loading">Militäreinheiten werden geladen...</div>
      ) : (
        <GroupedGrid 
          muData={muData} 
          onSelectMu={setSelectedMu}
        />
      )
    )}
    </>
    );
}

export default App;