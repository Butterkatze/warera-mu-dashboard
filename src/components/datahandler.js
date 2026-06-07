import { getWarEraClient } from './apiwrapper.js';

export class DataHandler {


    constructor(initialArticleId = '', forceUpdate = false) {
        this.client = getWarEraClient();
        this.forceUpdate = forceUpdate
        
        // const ARTICLE_ID = '6a1f025b37df43a8d01bb9a2'; 
        this.currentArticleId = initialArticleId; 

        this.ARTICLE_CACHE = 5 * 60 * 1000; 
        this.MU_CACHE= 15 * 60 * 1000;
        this.USER_CACHE = 60 * 60 * 1000;     
    }

    // Methode, um die ID jederzeit von außen live zu ändern
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

    async  #setArticleCache(articleCacheKey) {
  
    const response = await this.client.article.getArticleById({ articleId: this.currentArticleId });
    /* Daten Formatierne*/
    const articleData = response?.result?.data || response;
    const formatedArticle = {
        _id: articleData._id,
        content: articleData.content || "",
        };

    /* Cache anlegen*/
    
    const now = Date.now();

    localStorage.setItem(articleCacheKey, JSON.stringify({ data: formatedArticle, timestamp: now }));

    return formatedArticle
    }

    async #getArticle(){
    const now = Date.now();
    const articleCacheKey = `article_cache_${this.currentArticleId}`;
    const cached = localStorage.getItem(articleCacheKey);

    if (cached && !this.forceUpdate) {
        const { data, timestamp } = JSON.parse(cached);
        if (now - timestamp < this.ARTICLE_CACHE) {

            return data; 
        }
    }

    const formatedArticle = await this.#setArticleCache(articleCacheKey);
    return formatedArticle
    }

    async getArticleWrapper(){
      const articleData = await this.#getArticle();
      this.setForceUpdate()
      return articleData

    }
/* ==========================================================================
    MU Funktionen
    ========================================================================== */

    async #setMUCache(MU_ID, muCacheKey) {
    
        const now = Date.now();
        const response = await this.client.mu.getById({ muId : MU_ID });
        const muData = response?.result?.data || response;


        const formatedMU = {

            _id: muData._id,
            avatarUrl: muData.avatarUrl,
            name: muData.name,
            managers: muData.roles?.managers,
            commanders: muData.roles?.commanders,
            members: muData.members,
            activeUpgradeLevels: {
                "headquarters": muData.activeUpgradeLevels?.headquarters || 0,
                "dormitories" : muData.activeUpgradeLevels?.dormitories  || 0,
            },
            rankings: {
                "muWeeklyDamages"   : muData.rankings?.muWeeklyDamages?.value,
                "muBounty"          : muData.rankings?.muBounty?.value,       
                "muReputation"      : muData.rankings?.muReputation?.value,
                "muDamages"         : muData.rankings?.muDamages?.value,
                "muTerrain"         : muData.rankings?.muTerrain?.value,
                "muWealth"          : muData.rankings?.muWealth?.value,
            },
        };

        /* Cache anlegen*/
        localStorage.setItem(muCacheKey, JSON.stringify({ data: formatedMU, timestamp: now }));
        return formatedMU
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
        const now = Date.now();
      
        // Map, um bereits erstellte API-Promises für IDs zu merken
        const laufendeApiRequests = new Map();
      
        geparsteGruppen.forEach(gruppe => {
          gruppe.ids.forEach(id => {



            const cacheKey = `mu_cache_${id}`;
            const cached = localStorage.getItem(cacheKey);


      
            // A) Cache-Prüfung (Duplikate aus dem Cache sind kein Problem)
            if (cached && !this.forceUpdate) {
              try {
                const { data, timestamp } = JSON.parse(cached);
                if (now - timestamp < this.MU_CACHE) {
                  finalResults.push({
                    spaltenName: gruppe.category,
                    id: id,
                    objekt: data
                  });
                  return; 
                }
              } catch (e) {
                console.error("Cache Parse Fehler:", e);
              }
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
      
                return await this.#setMUCache( id, cacheKey)
              
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

      const customCacheKey = `custom_layout_${this.currentArticleId}`;
        const customLayoutRaw = localStorage.getItem(customCacheKey);

        // Am Anfang und bei normalem Laden: Wenn ein Custom-Layout existiert, nutze es!
        if (customLayoutRaw) {
            try {
                const { spalten } = JSON.parse(customLayoutRaw);
                console.log("Custom-Layout im Speicher gefunden. Lade modifizierte Struktur...");
                
                const MUs = await this.#getMU(spalten);
                this.setForceUpdate();
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
    MU Funktionen
    ========================================================================== */


    async #setUserCache(USER_ID, userCacheKey) {
    
      const now = Date.now();
      const response = await this.client.user.getUserLite({ userId : USER_ID });
      const userData = response?.result?.data || response;


      const formatedUser = {

          _id: userData._id,
          avatarUrl: userData.avatarUrl,
          username: userData.username,
          country: userData.country,
          level: userData.leveling?.level,
          isActive: userData.isActive,
          weeklyUserDamages: userData.rankings?.weeklyUserDamages?.value,
      }
         

      /* Cache anlegen*/
      localStorage.setItem(userCacheKey, JSON.stringify({ data: formatedUser, timestamp: now }));
      return formatedUser
  }


  async #getUser(userIds = []) {
    const apiTasks = []; 
    const finalResults = []; 
    const now = Date.now();
    const laufendeApiRequests = new Map();

    // Wir gehen durch jede übergebene User-ID
    userIds.forEach(id => {
      // Absicherung, falls IDs fälschlicherweise Objekte oder null/undefined sind
      const cleanId = typeof id === 'object' ? (id._id || id.id) : id;
      if (!cleanId) return;

      const userCacheKey = `user_cache_${cleanId}`;
      const cached = localStorage.getItem(userCacheKey);

      // A) Cache-Prüfung (sofern kein forceUpdate erzwungen wird)
      if (cached && !this.forceUpdate) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Nutzt die für User definierte Cache-Zeit (z.B. USER_CACHE, falls vorhanden, sonst 1 Std)
          const cacheDauer = this.USER_CACHE || 3600000; 

          if (now - timestamp < cacheDauer) {
            finalResults.push(data); // Drückt das formatierte User-Objekt direkt ins Ergebnis
            return; 
          }
        } catch (e) {
          console.error("User Cache Parse Fehler:", e);
        }
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
          return await this.#setUserCache(cleanId, userCacheKey);
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

    // 1. IDs extrahieren und strikt zu Strings konvertieren
    const rawManagers = muObjekt.managers || [];
    const managerIds = (Array.isArray(rawManagers) ? rawManagers : [rawManagers]).map(id => id?.toString()).filter(Boolean);
    const commanderIds = (muObjekt.commanders || []).map(id => id?.toString()).filter(Boolean);
    const memberIds = (muObjekt.members || []).map(id => id?.toString()).filter(Boolean);

    // 2. Alle eindeutigen IDs laden
    const alleUserIds = new Set([...managerIds, ...commanderIds, ...memberIds]);
    const geladeneUser = await this.#getUser(Array.from(alleUserIds));

    // 3. Wir bauen uns eine Map aus den geladenen Usern
    // Wichtig: Wir filtern hier alles heraus, was kein echtes Objekt mit username ist!
    const userMap = new Map();
    geladeneUser.forEach(user => {
      if (user && typeof user === 'object' && user._id) {
        userMap.set(user._id.toString(), user);
      }
    });

    // 4. Helfer-Funktion: Holt das Objekt aus der Map. 
    // Falls die API für die ID versagt hat, BAUT sie ein gültiges Objekt zusammen,
    // damit das Dashboard NIEMALS wieder nur eine nackte ID sieht!
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
   * Parst ein manuell reinkopiertes Text-Format (inklusive Backslashes) direkt.
   * @param {string} htmlText - Reinkopierter String aus dem Artikel
   * @returns {Array} Formatierte Gruppen für den Editor-State
   */
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
      const cacheKey = `custom_layout_${this.currentArticleId}`;
      if (!spalten || spalten.length === 0) {
          localStorage.removeItem(cacheKey);
          console.log("Custom-Layout wurde gelöscht. Artikel-Standard ist wieder aktiv.");
          return;
      }
      localStorage.setItem(cacheKey, JSON.stringify({
          spalten,
          timestamp: Date.now()
      }));
      console.log("Custom-Layout erfolgreich lokal gespeichert.");
    }

}