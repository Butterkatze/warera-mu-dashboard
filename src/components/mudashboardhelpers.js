
// =====================================================================
// --- HILFSFUNKTIONEN FÜR ZEITBERECHNUNGEN ---
// =====================================================================

export function getRemainingBuffTime(endAtIsoString) {
  if (!endAtIsoString) return null;
  
  const diffMs = new Date(endAtIsoString).getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalSecs = Math.floor(diffMs / 1000);
  
  // Stunden, Minuten und Sekunden berechnen
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  // Führende Nullen hinzufügen für echtes hh:mm:ss Format
  const pad = (num) => String(num).padStart(2, '0');

  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

export function formatTimeSinceConnection(lastConnectionAt) {
  if (!lastConnectionAt) return 'Nie';
  const diffMs = Date.now() - new Date(lastConnectionAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} h`;
  return `${Math.floor(diffHours / 24)} d`;
}

// =====================================================================
// --- SORTIER-LOGIK ---
// =====================================================================

export function sortUserList(list, sortConfig) {
  if (!sortConfig || !sortConfig.key) return list;

  const sorted = [...list];
  const { key, direction } = sortConfig;

  sorted.sort((a, b) => {
      let valA = '';
      let valB = '';

      // Falls es sich um pure IDs (Strings) statt Objekten handelt
      if (typeof a !== 'object') return 0;

      if (key === 'name') {
          valA = a.username || '';
          valB = b.username || '';
      } else if (key === 'damage') {
          valA = a.weeklyUserDamages || 0;
          valB = b.weeklyUserDamages || 0;
      } else if (key === 'level') {
          valA = a.level || 0;
          valB = b.level || 0;
      } else if (key === 'active') {
          // Sortierung nach Zeitstempel (neuere Verbindungen zuerst)
          valA = a.lastConnectionAt ? new Date(a.lastConnectionAt).getTime() : 0;
          valB = b.lastConnectionAt ? new Date(b.lastConnectionAt).getTime() : 0;
      } else if (key === 'skillpath') {
         
          const pathOrder = ["War", "Hybrid", "Eco", "Aufbau"];
          
          const pathA = a.skillpath || '';
          const pathB = b.skillpath || '';

          // Findet den Index. Wenn kein Match (z.B. ""), ans Ende der Liste setzen (Index 99)
          let idxA = pathOrder.indexOf(pathA);
          let idxB = pathOrder.indexOf(pathB);
          if (idxA === -1) idxA = 99;
          if (idxB === -1) idxB = 99;

          if (idxA !== idxB) {
              // Nutzt das bestehende direction-System:
              // 'asc'  -> [War, Hybrid, Eco, Aufbau] (da Index 0 kleiner als Index 3 ist)
              // 'desc' -> [Aufbau, Eco, Hybrid, War]
              return direction === 'asc' ? idxA - idxB : idxB - idxA;
          }

          // Sekundärer Sort-Key: Wenn Skillpath identisch ist, nach Level absteigend sortieren
          const levelA = a.level || 0;
          const levelB = b.level || 0;
          return levelB - levelA; 

      } else if (key === 'buffs') {
          // Sortierung: Wer Buffs/Debuffs hat, wandert nach oben
          const hasBuffA = a.buffs?.buffCodes?.length || a.buffs?.debuffCodes?.length || 0;
          const hasBuffB = b.buffs?.buffCodes?.length || b.buffs?.debuffCodes?.length || 0;
          valA = hasBuffA;
          valB = hasBuffB;
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
  });

  return sorted;
}

