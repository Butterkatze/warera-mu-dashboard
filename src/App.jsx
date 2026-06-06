import { useState } from 'react';
//import { useState, useEffect, useCallback } from 'react';
import './index.css';
import Tokenhandler from './components/tokenhandler.jsx';
import GroupedGrid from './components/groupedgrid.jsx';


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
  const [refreshKey, setRefreshKey] = useState(0);


    return (
    <>
      {showTokenPopup && (
        <Tokenhandler 
          setApiKey={setApiKey} 
          articleId = {articleId}
          DEFAULT_ARTICLE_ID = {DEFAULT_ARTICLE_ID}
          setArticleId ={setArticleId}
          onRefresh={() => setRefreshKey(prev => prev + 1)}
          onClose={() => {
            setShowTokenPopup(false);
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
        </div>
      </div>
    </div>
    
    
    
    <hr className="color-border" style={{ margin: '25px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

    {/* Hier wird die neue Grid-Komponente aufgerufen */}
    <GroupedGrid 
    key = {refreshKey}
    articleId = {articleId} />
    </>
    );
}

export default App;