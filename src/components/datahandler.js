import { getWarEraClient } from './apiwrapper.js';

export class DataHandler {


    constructor(initialArticleId = '', forceUpdate = false) {

        this.client = getWarEraClient();
        this.forceUpdate = forceUpdate
        
        this.currentArticleId = initialArticleId; 

        // Zentrale Konfiguration aller Caches (duration in ms)
        this.CACHE_CONFIG = {
          ARTICLE: { prefix: 'article_cache', duration: 5 * 60 * 1000 },
          MU:      { prefix: 'mu_cache',      duration: 15 * 60 * 1000 },
          USER:    { prefix: 'user_cache',    duration: 15 * 60 * 1000 },
          COUNTRY: { prefix: 'countries_cache', duration: 24 * 60 * 60 * 1000 },
          LAYOUT:  { prefix: 'custom_layout', duration: Infinity }
         };   
    }

/* ==========================================================================
    ZENTRALE FORMATIERER (MAPPERS)
    Hier anpassen, wenn neue Datenfelder im Cache benötigt werden!
    ========================================================================== */
    #mapArticleData(apiData) {
      return {
          _id: apiData._id,
          content: apiData.content || "",
      };
    }

    #mapCountryRow(country) {
        let cleanCode = country.code ? country.code.toLowerCase() : "";
        if (cleanCode === 'sj') cleanCode = 'no';
        if (cleanCode === 'um') cleanCode = 'us';
        if (cleanCode === 'bv') cleanCode = 'no';
        if (cleanCode === 'hm') cleanCode = 'au';

        return {
            _id: country._id,
            code: cleanCode
        };
    }

    #mapMUData(apiData) {
        return {
            _id: apiData._id,
            avatarUrl: apiData.avatarUrl,
            name: apiData.name,
            managers: apiData.roles?.managers,
            commanders: apiData.roles?.commanders,
            members: apiData.members,
            activeUpgradeLevels: {
                "headquarters": apiData.activeUpgradeLevels?.headquarters || 0,
                "dormitories" : apiData.activeUpgradeLevels?.dormitories  || 0,
            },
            rankings: {
                "muWeeklyDamages" : apiData.rankings?.muWeeklyDamages?.value,
                "muBounty"        : apiData.rankings?.muBounty?.value,       
                "muReputation"    : apiData.rankings?.muReputation?.value,
                "muDamages"       : apiData.rankings?.muDamages?.value,
                "muTerrain"       : apiData.rankings?.muTerrain?.value,
                "muWealth"        : apiData.rankings?.muWealth?.value,
            },
        };
    }

    #mapUserData(apiData, calculatedFlagCode = "") {
        return {
            _id: apiData._id,
            avatarUrl: apiData.avatarUrl,
            username: apiData.username,
            country: calculatedFlagCode,
            level: apiData.leveling?.level,
            isActive: apiData.isActive,
            weeklyUserDamages: apiData.rankings?.weeklyUserDamages?.value,
        };
    }    

/* ==========================================================================
   Cache Funktionen. 
    ========================================================================== */
    
    #getCacheKey(type, id = null) {
      const prefix = this.CACHE_CONFIG[type].prefix;
      return id ? `${prefix}_${id}` : `${prefix}_all`;
    }

    #setCacheData(type, id, data) {
      try {
          const cacheKey = this.#getCacheKey(type, id);
          const cacheObj = {
              data,
              timestamp: Date.now()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
      } catch (error) {
          console.error(`Fehler beim Schreiben in den Cache (${type}):`, error);
      }
    }

    #getCacheData(type, id = null) {
      // Wenn forceUpdate aktiv ist, ignorieren wir den Cache sofort
      if (this.forceUpdate) return null;

      try {
          const cacheKey = this.#getCacheKey(type, id);
          const cached = localStorage.getItem(cacheKey);
          if (!cached) return null;

          const { data, timestamp } = JSON.parse(cached);
          const duration = this.CACHE_CONFIG[type].duration;

          // Wenn die Dauer "Infinity" ist (z.B. beim Layout) oder die Zeit noch passt, gib die Daten zurück
          if (duration === Infinity || (Date.now() - timestamp < duration)) {
              return data;
          }
          
          // Optional: Abgelaufene Daten direkt löschen
          localStorage.removeItem(cacheKey);
          return null;
      } catch (error) {
          console.error(`Fehler beim Lesen aus dem Cache (${type}):`, error);
          return null;
      }
  }



/* ==========================================================================
    Externe Class Config Funktionen  
========================================================================== */


    setArticleId(newId) {
        this.currentArticleId = newId;
        console.log(`Klassen-Zustand geändert: Article ID ist jetzt ${this.currentArticleId}`);
    }

    setForceUpdate(forceUpdate = false) {
      this.forceUpdate = forceUpdate;
    }

    updateClient() {
      this.client = getWarEraClient();
      console.log("API-Client im DataHandler wurde mit neuem Token aktualisiert.");
    }

    
  
/* ==========================================================================
    Article Funktionen
    ========================================================================== */

    async  #setArticleCache() {
  
      const response = await this.client.article.getArticleById({ articleId: this.currentArticleId });
      const articleData = response?.result?.data || response;

      const formatedArticle = this.#mapArticleData(articleData);
      
      this.#setCacheData('ARTICLE', this.currentArticleId, formatedArticle);
      return formatedArticle
    }

    async #getArticle(){
      const cachedData = this.#getCacheData('ARTICLE', this.currentArticleId);
      if (cachedData) return cachedData;

      // Falls kein Cache da ist, neu laden
      return await this.#setArticleCache();
    }

    async getArticleWrapper(){
      const articleData = await this.#getArticle();
      this.setForceUpdate()
      return articleData

    }

   /* ==========================================================================
    Country Funktionen
    ========================================================================== */

    async #setCountryCache() {
      const response = await this.client.country.getAllCountries(); 
      const countryData = response?.result?.data || response;


      const formatedCountries = countryData.map(country => this.#mapCountryRow(country));

      /* Cache anlegen (Gesamtes Array als eine JSON-Zeile) */
      this.#setCacheData('COUNTRY', null, formatedCountries);
      return formatedCountries;
  }

  async #getCountries(countryId = null) {
    let allCountries = this.#getCacheData('COUNTRY', null) || [];


      if (allCountries.length === 0) {
        if (!this.laufendeCountryRequest) {
            this.laufendeCountryRequest = this.#setCountryCache().then(data => {
                this.laufendeCountryRequest = null; // Zurücksetzen wenn fertig
                return data;
            });
        }
        allCountries = await this.laufendeCountryRequest;
    }

      if (countryId) {
          return allCountries.find(c => c._id === countryId) || null;
      }

      // Wenn kein Parameter übergeben wurde, gib das komplette Array zurück
      return allCountries;
  }

  async getCountriesWrapper(countryId = null) {
      const result = await this.#getCountries(countryId);
      this.setForceUpdate(); // Setzt forceUpdate wie beim Artikel-Wrapper zurück
      return result;
  } 
  

/* ==========================================================================
    MU Funktionen
    ========================================================================== */

    async #setMUCache(MU_ID) {
    
        const response = await this.client.mu.getById({ muId : MU_ID });
        const muData = response?.result?.data || response;


        const formatedMU = this.#mapMUData(muData);

        this.#setCacheData('MU', MU_ID, formatedMU);
        return formatedMU;
    }

    #parseMUFromArticle(articleData){

        const geparsteGruppen = [];
        if (!articleData || !articleData.content) return geparsteGruppen;

        const parts = articleData.content.split(/<h2[^>]*>/);
        
        parts.forEach((part, index) => {
          // Der erste Teil vor dem ersten <h2> hat keine Überschrift
          if (index === 0) return; 
          
          // Extrahiere den Divisionsnamen (alles bis zum schließenden </h2>)
          const nameMatch = part.match(/([^<]+)<\/h2>/);
          if (!nameMatch) return;
          
          const divisionName = nameMatch[1].trim();
          
          const aktuelleGruppe = {
              category: divisionName,
              ids: []
              };

          // MU ID Parser 
          const muRegex = /muId&quot;:&quot;([a-f0-9]{24})/g;
          let match;
          while ((match = muRegex.exec(part)) !== null) {
          aktuelleGruppe.ids.push(match[1]);
          }
          if (aktuelleGruppe.ids.length > 0) geparsteGruppen.push(aktuelleGruppe);
          });

        return geparsteGruppen;
    }

    async #getMU (geparsteGruppen){

        const apiTasks = []; 
        const finalResults = []; 
      
        // Map, um bereits erstellte API-Promises für IDs zu merken
        const laufendeApiRequests = new Map();
      
        geparsteGruppen.forEach(gruppe => {
          gruppe.ids.forEach(id => {


            const cachedData = this.#getCacheData('MU', id);

            if (cachedData) {
                finalResults.push({
                    spaltenName: gruppe.category,
                    id: id,
                    objekt: cachedData
                });
                return; 
            }
      
            // B) Duplikat-Schutz für Netzwerk-Anfragen:
            // Haben wir für DIESE ID in diesem Durchlauf schon einen API-Task erstellt?
            if (laufendeApiRequests.has(id)) {
              // Ja! Wir hängen uns einfach an denselben Task ran. 
              // Die API wird kein zweites Mal gefragt, aber das Grid bekommt sein Objekt.
              const duplicateTask = (async () => {
                const muData = await laufendeApiRequests.get(id);
                return {
                  spaltenName: gruppe.category,
                  id: id,
                  objekt: muData
                };
              })();
              
              apiTasks.push(duplicateTask);
              return;
            }
      
            // C) Erster API-Request für diese ID (Kein Duplikat bisher)
            // Wir lagern die reine API-Abfrage aus, damit wir das nackte Ergebnis teilen können
            const fetchTask = (async () => {
              try {
      
                return await this.#setMUCache( id)
              
              } catch (error) {
                console.error(`Fehler bei ID ${id}:`, error);
                return { _id: id, name: `Fehler (${id.substring(0,4)})`, members: [] };
              }
            })();
      
            // Wir merken uns dieses laufende Promise für exakt diese ID
            laufendeApiRequests.set(id, fetchTask);
      
            // Für das Endergebnis aufbereiten
            const mainTask = (async () => {
              const muData = await fetchTask;
              return {
                spaltenName: gruppe.category,
                id: id,
                objekt: muData
              };
            })();
      
            apiTasks.push(mainTask);
          });
        });
      
        /* #################    API-Anfragen gleichzeitig feuern   #################### */
        if (apiTasks.length > 0) {
          const apiResults = await Promise.all(apiTasks);
          finalResults.push(...apiResults);
        }
      
        return finalResults.filter(eintrag => eintrag !== null);

    }


    async getMUFromArticle() {

      //################ Falls Custom Layout Existiert ##################

      const customLayout = this.#getCacheData('LAYOUT', this.currentArticleId);

      // Am Anfang und bei normalem Laden: Wenn ein Custom-Layout existiert, nutze es!
      if (customLayout && customLayout.spalten) {
          try { 

            console.log("Custom-Layout im Speicher gefunden. Lade modifizierte Struktur...");
            const MUs = await this.#getMU(customLayout.spalten);
            this.setForceUpdate()
            return MUs;

          } catch (e) {
              console.error("Fehler beim Parsen des Custom-Layouts, weiche auf API aus:", e);
          }
      }



      const articleData = await this.#getArticle();

      /*#################    Parser   ####################*/
  
      const geparsteGruppen = this.#parseMUFromArticle(articleData);

      /*#################    Strucktur mit Division (gruppe ), Muid und Mu-daten (bzw MU objekt bauen)  ####################*/
      
      const MUs = await this.#getMU (geparsteGruppen);
      this.setForceUpdate()
      return MUs
    }   





/* ==========================================================================
    User Funktionen
    ========================================================================== */


    async #setUserCache(USER_ID) {
    
      const response = await this.client.user.getUserLite({ userId : USER_ID });
      const userData = response?.result?.data || response;

      // Nutzt den neuen, flexiblen Getter mit Parameter, um nur EIN Land zu erhalten
      const countryObj = await this.#getCountries(userData.country);
      const flagCode = countryObj ? countryObj.code : "";

      const formatedUser = this.#mapUserData(userData, flagCode);
         

      /* Cache anlegen*/
      this.#setCacheData('USER', USER_ID, formatedUser);
      return formatedUser
  }


  async #getUser(userIds = []) {
    const apiTasks = []; 
    const finalResults = []; 
    const laufendeApiRequests = new Map();

    // Wir gehen durch jede übergebene User-ID
    userIds.forEach(id => {
      // Absicherung, falls IDs fälschlicherweise Objekte oder null/undefined sind
      const cleanId = typeof id === 'object' ? (id._id || id.id) : id;
      if (!cleanId) return;

      const cachedData = this.#getCacheData('USER', cleanId);

      if (cachedData) {
        finalResults.push(cachedData);
        return; 
    }

      // B) Duplikat-Schutz für laufende Netzwerk-Anfragen:
      // Wurde für diese User-ID im aktuellen Schleifendurchlauf schon ein API-Task erstellt?
      if (laufendeApiRequests.has(cleanId)) {
        // Wir hängen uns an dasselbe Promise an. Die API wird nicht doppelt belastet.
        const duplicateTask = (async () => {
          return await laufendeApiRequests.get(cleanId);
        })();
        
        apiTasks.push(duplicateTask);
        return;
      }

      // C) Erster API-Request für diese User-ID (Kein Duplikat im aktuellen Lauf)
      const fetchTask = (async () => {
        try {
          // Ruft deine bestehende Methode auf, die formatedUser generiert und speichert
          return await this.#setUserCache(cleanId);
        } catch (error) {
          console.error(`Fehler bei User-ID ${cleanId}:`, error);
          // Fallback-Objekt, damit die App nicht abstürzt, wenn ein User-Fetch fehlschlägt
          return { 
            _id: cleanId, 
            username: `Fehler (${String(cleanId).substring(0,4)})`, 
            avatarUrl: "",
            level: 0,
            isActive: false
          };
        }
      })();

      // Das laufende Promise in der Map für andere Duplikate reservieren
      laufendeApiRequests.set(cleanId, fetchTask);
      apiTasks.push(fetchTask);
    });

    /* #################  User-API-Anfragen gleichzeitig feuern  #################### */
    if (apiTasks.length > 0) {
      const apiResults = await Promise.all(apiTasks);
      finalResults.push(...apiResults);
    }

    // Liefert das saubere Array aus formatierten User-Objekten zurück
    return finalResults.filter(user => user !== null);
  }




  async getMUUserData(muId) {
    if (!muId) return { managers: [], commanders: [], members: [] };

    const muResult = await this.#getMU([{ category: "temporary", ids: [muId] }]);

    if (!muResult || muResult.length === 0 || !muResult[0].objekt) {
      console.warn(`MU mit der ID ${muId} konnte nicht geladen werden.`);
      return { managers: [], commanders: [], members: [] };
    }

    const muObjekt = muResult[0].objekt;

    const extrahiereId = (item) => {
      if (!item) return null;
      if (typeof item === 'object') {
        return (item._id || item.id)?.toString();
      }
      return item.toString();
    };

    // 1. IDs extrahieren und strikt zu Strings konvertieren
    const managerIds = (Array.isArray(muObjekt.managers) ? muObjekt.managers : [muObjekt.managers || []]).flatMap(item => item ? [extrahiereId(item)] : []).filter(Boolean);
    const commanderIds = (Array.isArray(muObjekt.commanders) ? muObjekt.commanders : [muObjekt.commanders || []]).flatMap(item => item ? [extrahiereId(item)] : []).filter(Boolean);
    const memberIds = (Array.isArray(muObjekt.members) ? muObjekt.members : [muObjekt.members || []]).flatMap(item => item ? [extrahiereId(item)] : []).filter(Boolean);

    await this.#getCountries();

    // 2. Alle eindeutigen IDs laden
    const alleUserIds = new Set([...managerIds, ...commanderIds, ...memberIds]);
    const geladeneUser = await this.#getUser(Array.from(alleUserIds));

   // 3. Map bauen
    const userMap = new Map();
    geladeneUser.forEach(user => {
      if (user && typeof user === 'object' && user._id) {
        userMap.set(user._id.toString(), user);
      }
    });

   // 4. Helfer-Funktion
    const zwingeUserObjekt = (id, fallbackRolle) => {
      const existierenderUser = userMap.get(id);
      if (existierenderUser && existierenderUser.username) {
        return existierenderUser;
      }
      
      // Das hier fängt den Fehler auf deinem Screenshot ab!
      return {
        _id: id,
        username: `${fallbackRolle} (${id.substring(0, 6)})`,
        avatarUrl: "", // Platzhalter-Fragezeichen triggern
        level: 0,
        isActive: false
      };
    };

    // 5. Arrays sauber gemappt zurückgeben

    this.setForceUpdate()
    
    return {
      managers: managerIds.map(id => zwingeUserObjekt(id, "Manager")),
      commanders: commanderIds.map(id => zwingeUserObjekt(id, "Commander")),
      members: memberIds.map(id => zwingeUserObjekt(id, "Mitglied"))
    };
  }



 /* ==========================================================================
     NEU & ANGEPASST: MU Editor Integrations-Methoden
     ========================================================================== */

  #parseMarkdownFormat(rawText) {
    const geparsteGruppen = [];
    if (!rawText) return geparsteGruppen;

    // Teilt den Text anhand von Markdown-H2 Überschriften (## Name)
    const parts = rawText.split(/^##\s+/m);

    parts.forEach((part, index) => {
        // Der Teil vor dem ersten "##" enthält keine Division und wird ignoriert
        if (index === 0) return;

        // Die erste Zeile dieses Parts ist der Name der Division
        const lines = part.split(/\r?\n/);
        const divisionName = lines[0].trim();
        if (!divisionName) return;

        const aktuelleGruppe = {
            category: divisionName,
            ids: []
        };

        // Der restliche Text des Parts wird nach MU-IDs durchsucht
        const restText = lines.slice(1).join("\n");
        const muRegex = /muId&quot;:&quot;([a-f0-9]{24})/g;
        let match;
        
        while ((match = muRegex.exec(restText)) !== null) {
            aktuelleGruppe.ids.push(match[1]);
        }

        if (aktuelleGruppe.ids.length > 0) {
            geparsteGruppen.push(aktuelleGruppe);
        }
    });

    return geparsteGruppen;
  }



  /**
   * Erzeugt den exakten Code für den WarEra-Artikel im gewünschten Format.
   * @param {Array} spalten - Der Spalten-State aus dem MuEditor
   * @returns {string} Generierter HTML/Markdown-Code für den Export
   */
  exportSpaltenToHtml(spalten = []) {
    let html = "";
    spalten.forEach((spalte, index) => {
        if (!spalte.ids || spalte.ids.length === 0) return;
        
        // Füge einen Zeilenumbruch vor der nächsten Gruppe ein, falls es nicht die erste ist
        if (index > 0) html += "\n";
        
        html += `## ${spalte.category}\n\n`;

        
        
        spalte.ids.forEach(id => {
            html += "\\\n";
            html += `<span data-content-link="" data-content-type="mu" data-content-data="{&quot;muId&quot;:&quot;${id}&quot;,&quot;fullMatch&quot;:&quot;https://app.warera.io/mu/${id}&quot;}" data-original-text="https://app.warera.io/mu/${id}"></span>`;
        });
    });
    return html;
  }

 
  /**
   * ANGEPASST: Nutzt jetzt exklusiv den neuen Markdown-Parser für das manuelle UI-Feld
   * @param {string} htmlText - Reinkopierter Text aus dem Artikel
   * @returns {Array} Formatierte Gruppen für den Editor-State
   */
  parseRawHtmlContent(htmlText) {
    if (!htmlText) return [];
    // Ruft isoliert die neue Markdown-Logik auf. #parseMUFromArticle bleibt unangetastet!
    return this.#parseMarkdownFormat(htmlText);
  }


  /**
   * Lädt Details für ein Array von MU-IDs parallel nach.
   * Nutzt im Hintergrund die caching- und duplikatsichere Methode #getMU.
   * Kann auch für einzelne IDs genutzt werden (z.B. [muId]).
   * @param {Array<string>} muIds - Array aus 24-stelligen Hex-IDs
   * @returns {Promise<Map<string, object>>} Eine Map mit id -> formatierte MU-Objektdaten
   */
  async getMultipleMusByIds(muIds = []) {
    const bereinigteIds = [...new Set(muIds.filter(Boolean))]; // Duplikate direkt filtern
    if (bereinigteIds.length === 0) return new Map();

    try {
        // Wir faken eine temporäre Gruppe, um die interne #getMU-Logik anzusteuern
        const result = await this.#getMU([{ category: "bulk-fetch", ids: bereinigteIds }]);
        
        const resultMap = new Map();
        if (result && result.length > 0) {
            result.forEach(item => {
                if (item && item.id && item.objekt) {
                    resultMap.set(item.id.toString(), item.objekt);
                }
            });
        }
        return resultMap;
    } catch (error) {
        console.error("Fehler beim Bulk-Laden der MUs im DataHandler:", error);
        return new Map();
    }
  }
  



/* ==========================================================================
   Lokales Layout-Caching (Steuerung exklusiv über Editor-Buttons)
   ========================================================================== */

    /**
     * Speichert ein manipuliertes Layout lokal ab.
     * Wird ein leeres Array übergeben, wird das Custom-Layout gelöscht.
     * @param {Array} spalten - Die Struktur aus dem Editor
     */
    saveCustomLayout(spalten = []) {
      if (!spalten || spalten.length === 0) {
          localStorage.removeItem(this.#getCacheKey('LAYOUT', this.currentArticleId));
          console.log("Custom-Layout wurde gelöscht. Artikel-Standard ist wieder aktiv.");
          return;
      }
      this.#setCacheData('LAYOUT', this.currentArticleId, { spalten });
      console.log("Custom-Layout erfolgreich lokal gespeichert.");
    }

}