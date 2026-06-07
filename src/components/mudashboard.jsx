import { useState, useEffect } from 'react';
import { DataHandler } from './datahandler.js';
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
          <span className="mu-label">Vermögen (Wealth):</span>
          <span className="mu-value text-gold">{rankings.muWealth?.toLocaleString() || '0'}</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">Wöchentlicher Schaden:</span>
          <span className="mu-value">{rankings.muWeeklyDamages?.toLocaleString() || '0'}</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">Reputation:</span>
          <span className="mu-value">{rankings.muReputation?.toLocaleString() || '0'}</span>
        </div>
        <div className="mu-stat-entry">
          <span className="mu-label">HQ Level:</span>
          <span className="mu-value">{activeUpgradeLevels.headquarters || '0'}</span>
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
// 3. Komponente: User- / Mitgliederliste (Unten)
// ==========================================================================
function MuUserList({ members = [], muUsers = [], isLoadingUsers = false }) {
  const displayList = muUsers.length > 0 ? muUsers : members;

  return (
    <div className="mu-userlist-box">
      <h3 className="mu-section-title">Mitgliederliste ({members.length})</h3>
      
      {isLoadingUsers && <div className="mu-loading-inline">Lade detaillierte User-Daten...</div>}
      
      {displayList.length === 0 ? (
        <p className="mu-no-data">Keine Mitglieder in dieser Einheit gefunden.</p>
      ) : (
        <div className="mu-user-table-wrapper">
          <table className="mu-user-table">
            <thead>
              <tr>
                <th>Name / ID</th>
                <th>Userlevel</th>
                <th>Aktiver Bürger</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((user, idx) => {
                const isObject = typeof user === 'object';
                const userName = isObject ? user.username : `User-ID: ${user}`;
                const userRank = isObject && user.level ? `Level ${user.level}` : 'Mitglied';
                const isActive = isObject ? (user.isActive ? 'aktiv' : 'inaktiv') : 'keine Daten';
                const hasAvatar = isObject && user.avatarUrl && user.avatarUrl !== "";

                return (
                  <tr key={user._id || idx}>
                    <td className="user-name-cell">
                      <div className="mu-table-avatar-wrapper">
                        {hasAvatar ? (
                          <img src={user.avatarUrl} alt={userName} className="mu-table-avatar" />
                        ) : (
                          <div className="mu-table-avatar-placeholder">?</div>
                        )}
                      </div>
                      <span className="mu-table-username-text">{userName}</span>
                    </td>
                    <td>{userRank}</td>
                    <td>
                      <span className={`status-dot ${isActive}`}></span>
                      {isActive}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Hauptkomponente: Zusammenführung des Dashboards
// ==========================================================================
function MuDashboard({ selectedMu = null }) {
  const [muUsers, setMuUsers] = useState({ managers: [], commanders: [], members: [] });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Der theoretische API-Call-Trigger für die User-Details
  useEffect(() => {
    if (!selectedMu?.objekt?._id) return;

    const fetchUserDetails = async () => {
      setIsLoadingUsers(true);
      try {
      const handler = new DataHandler(); 
      const fullUserData = await handler.getMUUserData(selectedMu.objekt._id);

      setMuUsers(fullUserData);
      } catch (err) {
        console.error("Fehler beim Laden der User-Details:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUserDetails();
  }, [selectedMu]);

  if (!selectedMu || !selectedMu.objekt) {
    return <div className="mu-no-selection">Bitte wähle eine Militäreinheit aus, um Details anzuzeigen.</div>;
  }

  const muData = selectedMu.objekt;

  return (
    <div className="mu-dashboard-wrapper">
      <div className="mu-dashboard-header">
        {muData.avatarUrl && <img src={muData.avatarUrl} alt={muData.name} className="mu-dashboard-avatar" />}
        <h2>{muData.name} ÜBERBLICK</h2>
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