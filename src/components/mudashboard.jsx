import { useState, useEffect } from 'react';
import MuUserList from './mudashboarduserlist.jsx'
import './mudashboard.css';

// ==========================================================================
// 1. Komponente: Allgemeine MU Stats (Oben links)
// ==========================================================================
function MuGeneralStats({ rankings = {}, activeUpgradeLevels = {} }) {
  return (
    <div className="mu-stats-box">
      <h3 className="mu-section-title">Einheits-Statistiken</h3>
      <div className="mu-stats-grid">
        <div className="mu-stat-entry">
          <span className="mu-label">Kontostand:</span>
          <span className="mu-value text-gold">{rankings.muWealth?.toLocaleString('de-DE') || '0'} BTC</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">Wöchentlicher Schaden:</span>
          <span className="mu-value">{rankings.muWeeklyDamages?.toLocaleString('de-DE') || '0'}</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">HQ:</span>
          <span className="mu-value">
            {activeUpgradeLevels.headquarters 
              ? `Level ${activeUpgradeLevels.headquarters}` 
              : 'Nicht aktiv'}
          </span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">Barraken:</span>
          <span className="mu-value">
            {activeUpgradeLevels.dormitories 
              ? `Level ${activeUpgradeLevels.dormitories}` 
              : 'Kann nicht geladen werden'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// 2. Komponente: Management & Führung (Oben rechts)
// ==========================================================================
function MuManagement({ managers = [], commanders = [] }) {
  return (
    <div className="mu-management-box">
      <h3 className="mu-section-title">Führungsebene</h3>
      
      <div className="mu-management-section">
        <h4>Inhaber / Manager ({managers.length})</h4>
        {managers.length === 0 ? (
          <p className="mu-no-data">Keine Manager zugewiesen</p>
        ) : (
            <div className="mu-management-cards-container">
            {managers.map((manager, idx) => {
              const hasAvatar = manager.avatarUrl && manager.avatarUrl !== "";
              return (
                <div key={manager._id || idx} className="mu-leader-card manager-item">
                  <div className="mu-leader-avatar-wrapper">
                    {hasAvatar ? (
                      <img src={manager.avatarUrl} alt={manager.username} className="mu-leader-avatar" />
                    ) : (
                      <div className="mu-leader-avatar-placeholder">?</div>
                    )}
                  </div>
                  <span className="mu-leader-name">{manager.username || `ID: ${manager}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mu-management-section">
        <h4>Kommandeure ({commanders.length})</h4>
        {commanders.length === 0 ? (
          <p className="mu-no-data">Keine Kommandeure zugewiesen</p>
        ) : (
            <div className="mu-management-cards-container">
            {commanders.map((commander, idx) => {
              const hasAvatar = commander.avatarUrl && commander.avatarUrl !== "";
              return (
                <div key={commander._id || idx} className="mu-leader-card commander-item">
                  <div className="mu-leader-avatar-wrapper">
                    {hasAvatar ? (
                      <img src={commander.avatarUrl} alt={commander.username} className="mu-leader-avatar" />
                    ) : (
                      <div className="mu-leader-avatar-placeholder">?</div>
                    )}
                  </div>
                  <span className="mu-leader-name">{commander.username || `ID: ${commander}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// Hauptkomponente: Zusammenführung des Dashboards
// ==========================================================================
function MuDashboard({ selectedMu = null, dataHandler }) {
  const [muUsers, setMuUsers] = useState({ managers: [], commanders: [], members: [] });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Der theoretische API-Call-Trigger für die User-Details
  useEffect(() => {
    if (!selectedMu?.objekt?._id) return;

    const fetchUserDetails = async (force = false) => {
      setIsLoadingUsers(true);
      try {
        if (force) {
          dataHandler.setForceUpdate(true); // Erzwingt frische Daten vom Server (wichtig für die Timestamps)
        }
      const fullUserData = await dataHandler.getMUUserData(selectedMu.objekt._id);
      setMuUsers(fullUserData);

      } catch (err) {
        console.error("Fehler beim Laden der User-Details:", err);
      } finally {
        if (force) {
          dataHandler.setForceUpdate(false); // Flag nach dem Call sofort wieder zurücksetzen
        }
        setIsLoadingUsers(false);
      }
    };

    fetchUserDetails();

    const intervalId = setInterval(() => {
      console.log("[Polling] Hole frische User-Daten für MU:", selectedMu.objekt._id);
      fetchUserDetails(true); // Hier mit true, um den Cache zu umgehen
    }, 5 * 60 * 1000);

    // 3. Cleanup: Intervall löschen, wenn die Komponente verlassen oder selectedMu gewechselt wird
    return () => clearInterval(intervalId);
  }, [selectedMu, dataHandler]);

  if (!selectedMu || !selectedMu.objekt) {
    return <div className="mu-no-selection">Bitte wähle eine Militäreinheit aus, um Details anzuzeigen.</div>;
  }

  const muData = selectedMu.objekt;

  return (
    <div className="mu-dashboard-wrapper">
      <div className="mu-dashboard-header">
        {muData.avatarUrl && <img src={muData.avatarUrl} alt={muData.name} className="mu-dashboard-avatar" />}
        <h2>{muData.name} Überblick</h2>
      </div>

      {/* Oberer Bereich: Nebeneinander aufgeteilt */}
      <div className="mu-dashboard-top-row">
        <MuGeneralStats 
          rankings={muData.rankings} 
          activeUpgradeLevels={muData.activeUpgradeLevels} 
        />
        <MuManagement 
          managers={muUsers.managers} 
          commanders={muUsers.commanders}
        />
      </div>

      {/* Unterer Bereich: Vollflächige Userliste */}
      <div className="mu-dashboard-bottom-row">
        <MuUserList 
          members={muData.members} 
          muUsers={muUsers.members}
          isLoadingUsers={isLoadingUsers}
        />
      </div>
    </div>
  );
}

export default MuDashboard;