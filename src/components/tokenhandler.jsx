import { useState} from 'react';
import './datahandler.js';
import './tokenhandler.css';
import { getArticle } from './datahandler.js';

export default function  Tokenhandler({ setApiKey, ARTICLE_ID, onClose }) {
    const [localKey, setLocalKey] = useState('');
    const [noKey, setNoKey] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
  


    const handleValidateKey = async (e) => {
      e.preventDefault();
      const cleanKey = localKey.trim();
      
      

      if (!cleanKey && !noKey) {
        setStatus({ type: 'error', message: 'Bitte gib einen API-Token ein.' });
        return;
      }
      
      setStatus({ type: 'loading', message: '...' });
  
      try {
        localStorage.setItem('warera_api_key', cleanKey);
        
        getArticle(ARTICLE_ID)
        
        setApiKey(cleanKey);

        if(noKey){
          onClose()
        };

        setStatus({ type: 'success', message: '✓' });
        
  
        setTimeout(() => {
          setStatus({ type: '', message: '' });
          onClose();
        }, 700);
  
      } catch (error) {
        console.error(error);
        localStorage.removeItem('warera_api_key');
        setStatus({ type: 'error', message: 'Ungültig!' });
      }
    };





    return (
        <div className="modal-overlay">
          <div className="modal-container">
            
            <h2 className="modal-title">WarEra API-Token Konfigurieren</h2>
            <p className="modal-subtitle">
              Gib deinen API-Token ein, um höhere Ratelimits zu haben. 
            </p>
      

            <form onSubmit={handleValidateKey} className="modal-form">
              <div className="input-group">
                <label className="input-label">API-TOKEN EINGEBEN</label>
                <input
                  type="text"
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="Dein WarEra API-Token hier..."
                  /* Wenn status.type 'error' ist, wird die rote Rahmen-Klasse hinzugefügt */
                  className={`token-input ${status.type === 'error' ? 'input-error' : ''}`}
                  disabled={status.type === 'loading'}
                />
              </div>
      

              {/* Status-Meldung wird nur gerendert, wenn eine Message existiert */}
              {status.message && (
                <div className={`status-message-box ${status.type}`}>
                  <span className="status-badge">
                    STATUS: {status.type.toUpperCase()}
                  </span>
                  <p className="status-text">{status.message}</p>
                </div>
              )}
      

              <div className="button-group">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={status.type === 'loading'}
                  onClick={() => {
                    setNoKey(false);
                  }}
                >
                  {status.type === 'loading' ? 'Validieren...' : 'OK'}
                </button>
                
                <button 
                  type="submit" 
                  className="btn btn-secondary"                  
                  disabled={status.type === 'loading'}
                  onClick={() => {
                    setLocalKey("");
                    setNoKey(true);
                  }}
                >
                  Ohne eigenen Token fortfahren
                </button>
          
              </div>
            </form>
      


          </div>
        </div>
      );
  }