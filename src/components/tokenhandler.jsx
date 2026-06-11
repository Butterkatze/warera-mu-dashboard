import { useState} from 'react';
import './tokenhandler.css';

export default function  Tokenhandler({ DEFAULT_ARTICLE_ID , onRefresh, onClose, dataHandler }) {
    // Wir nutzen einfach die Getter des DataHandlers für die Startwerte!
    const [localKey, setLocalKey] = useState(() => dataHandler?.apiKey || '');
    const [localArticleId, setLocalArticleId] = useState(() => dataHandler?.currentArticleId || '');

    const [noKey, setNoKey] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [showAdvanced, setShowAdvanced] = useState(false);
  


    const handleValidate = async (e) => {
      e.preventDefault();
      const cleanKey = localKey.trim();
      const finalArticleId = localArticleId.trim();
      
      

      if (!cleanKey && !noKey) {
        setStatus({ type: 'error', message: 'Bitte gib einen API-Token ein.' });
        return;
      }
      
      setStatus({ type: 'loading', message: '...' });
  
      try {
        if (dataHandler) {
          // JETZT GETRENNT: Beide Werte separat an den Handler übergeben
          dataHandler.saveApiKey(cleanKey);
          dataHandler.saveArticleId(finalArticleId);
  
          // Verbindungstest durchführen
          await dataHandler.getArticleWrapper();
          console.log("Login erfolgreich!");
        }

        if (onRefresh) onRefresh();

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

        if (dataHandler) {
          dataHandler.clearApiKey();
          dataHandler.clearArticleId();
        }

        setStatus({ type: 'error', message: 'API-Token und/oder Article-ID sind ungültig!' });
      }
    };

    const handleResetArticleId = (e) => {
      e.preventDefault(); // Verhindert, dass das Formular ungewollt absendet
      setLocalArticleId(DEFAULT_ARTICLE_ID);
    };





    return (
        <div className="modal-overlay">
          <div className="modal-container">
            
            <h2 className="modal-title">WarEra API-Token Konfigurieren</h2>
            <p className="modal-subtitle">
              Gib deinen API-Token ein, um höhere Ratelimits zu haben. 
            </p>
      

            <form onSubmit={handleValidate} className="modal-form">
              {/* Api-Tplem*/}
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


              {/* Advanced Options Toggle */}
              <div className="advanced-toggle-container">
                <button
                  type="button" 
                  className="advanced-toggle-btn"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? '▼ Erweiterte Optionen ausblenden' : '▶ Erweiterte Optionen anzeigen'}
                </button>
              </div>

              {/* Bedingtes Rendern der Article-Id */}
              {showAdvanced && (
                <div className="input-group advanced-input-group">
                  <label className="input-label">ARTICLE-ID EINGEBEN</label>
                  <div className="input-with-action">
                      <input
                        type="text"
                        value={localArticleId}
                        onChange={(e) => setLocalArticleId(e.target.value)}
                        placeholder={DEFAULT_ARTICLE_ID}
                        /* Wenn status.type 'error' ist, wird die rote Rahmen-Klasse hinzugefügt */
                        className={`token-input ${status.type === 'error' ? 'input-error' : ''}`}
                        disabled={status.type === 'loading'}
                      />

                      <button
                          type="button"
                          className="btn-reset-round"
                          onClick={handleResetArticleId}
                          disabled={ status.type === 'loading'}
                          title="Auf Standard ID zurücksetzten"
                          > 
                          <svg 
                            viewBox="0 0 24 24" 
                            width="16" 
                            height="16" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
                            fill="none" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <polyline points="3 3 3 8 8 8" />
                          </svg>
                        </button> 
                  </div>
              </div>
              )}

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