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
  const dataHandler = useMemo(() => new DataHandler(DEFAULT_ARTICLE_ID), []);

  const [showTokenPopup, setShowTokenPopup] = useState(dataHandler.apiKey === FAKE_KEY);
  

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMu, setSelectedMu] = useState(null);
  const [muData, setMuData] = useState([]); 

/* ==========================================================================
    History Handling. (Für Vorwärts und rückwärts kram)
    ========================================================================== */

  useEffect(() => {
    if (window.history.state?.view === 'dashboard') {
      window.history.replaceState(null, '');
    }
  }, []); 


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
        
        const passendeMu = muData.find(eintrag => eintrag.id === state.muId);
        
        if (passendeMu) {
          setSelectedMu(passendeMu);
        } else {  
          setSelectedMu(null);
        }
      } else {
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
    setSelectedMu(null);

    if (window.history.state?.view === 'dashboard') {
      window.history.back(); 
    }
  };
/* ==========================================================================
    Basic Fake Funktions
    ========================================================================== */

  const handleLoadData = async (forceUpdate = false) => {
    const targetId = dataHandler.currentArticleId;
    if (!targetId) return;

    setIsLoading(true);
    try {
      console.log("Event-gesteuertes Laden über globale Instanz für ID:", targetId);
      
      // Zustand der bestehenden Instanz updaten statt "new DataHandler()"
      dataHandler.setForceUpdate(forceUpdate)
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
    handleLoadData();
  }

  // Hilfsfunktion für den Start nach dem ersten erfolgreichen Login
  const closePopup = () => {
    setShowTokenPopup(false);
    handleLoadData();
  };


/* ==========================================================================
    Html
    ========================================================================== */
    return (
    <>
      {showTokenPopup && (
        <Tokenhandler 
          DEFAULT_ARTICLE_ID = {DEFAULT_ARTICLE_ID}
          onRefresh={() => handleLoadData()}
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
            </div>
            
            <div className="page-actions">
            <button 
              className={`btn-header ${isEditorOpen ? 'is-active' : ''}`}
              onClick={() => setIsEditorOpen(!isEditorOpen)}
            >
              {isEditorOpen ? "Editor Schließen" : "Divisions-Editor"}
            </button>

            <button 
              className="btn-header btn-header-keychange" 
              onClick={() => setShowTokenPopup(true)}
            >
              API-Token ändern
            </button>

            <button 
              className="btn-header btn-header-refresh"
              disabled={isLoading}
              onClick={() => handleLoadData(true)}
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
          onRefresh={() => handleLoadData()}
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