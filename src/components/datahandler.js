import { getWarEraClient } from './apiwrapper.js';

// ==========================================================================
// ZENTRALE BASISKLASSE (Zustand-Weiterleitung, Cache-Steuerung & Mappers)
// ==========================================================================
class BaseSubHandler {
    constructor(parent, cacheType) {
        this.parent = parent;       
        this.cacheType = cacheType;   
    }

    get forceUpdate() {
        return this.parent.forceUpdate;
    }

    set forceUpdate(value) {
        this.parent.forceUpdate = value;
    }

    get cacheConfig() {
        const CONFIG = {
            ARTICLE: { prefix: 'article_cache', duration: 5 * 60 * 1000 },
            MU:      { prefix: 'mu_cache',      duration: 15 * 60 * 1000 },
            USER:    { prefix: 'user_cache',    duration: 15 * 60 * 1000 },
            COUNTRY: { prefix: 'countries_cache', duration: 24 * 60 * 60 * 1000 },
            LAYOUT:  { prefix: 'custom_layout', duration: Infinity }
        };
        return CONFIG[this.cacheType];
    }

    getCacheKey(id = null) {
        const prefix = this.cacheConfig.prefix;
        return id ? `${prefix}_${id}` : `${prefix}`;
    }

    getCacheData(id = null) {
        if (this.forceUpdate) return null;

        try {
            const cacheKey = this.getCacheKey(id);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const duration = this.cacheConfig.duration;

            if (duration === Infinity || (Date.now() - timestamp < duration)) {
                return data;
            }
            
            localStorage.removeItem(cacheKey);
            return null;
        } catch (error) {
            console.error(`Fehler beim Lesen aus dem Cache (${this.cacheType}):`, error);
            return null;
        }
    }

    setCacheData(id, data) {
        try {
            const cacheKey = this.getCacheKey(id);
            const cacheObj = { data, timestamp: Date.now() };
            localStorage.setItem(cacheKey, JSON.stringify(cacheObj));
        } catch (error) {
            console.error(`Fehler beim Schreiben in den Cache (${this.cacheType}):`, error);
        }
    }

    //===============================================
    // Mapper Helpers

    calculateTotalSkillPoints(level) {
        
        if (!level || level <= 0) return 0;
        
        return (level * (level + 1)) / 2;
    }



    //============================================
    // CENTRALIZED FORMATTERS (MAPPERS)

    mapArticleData(apiData) {
        return { _id: apiData._id, content: apiData.content || "" };
    }

    mapCountryRow(country) {
        let cleanCode = country.code ? country.code.toLowerCase() : "";
        if (cleanCode === 'sj') cleanCode = 'no';
        if (cleanCode === 'um') cleanCode = 'us';
        if (cleanCode === 'bv') cleanCode = 'no';
        if (cleanCode === 'hm') cleanCode = 'au';
        return { _id: country._id, code: cleanCode };
    }

    mapMUData(apiData) {
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

    mapUserData(apiData, calculatedFlagCode = "") {
        const basepath = apiData.skills;
        let skillpath = '';
        if (basepath) {
            const warSkillPathPoints =      this.calculateTotalSkillPoints(basepath.attack?.level) +  
                                            this.calculateTotalSkillPoints(basepath.precision?.level) + 
                                            this.calculateTotalSkillPoints(basepath.criticalChance?.level) +
                                            this.calculateTotalSkillPoints(basepath.criticalDamages?.level) + 
                                            this.calculateTotalSkillPoints(basepath.armor?.level) +
                                            this.calculateTotalSkillPoints(basepath.dodge?.level) + 
                                            this.calculateTotalSkillPoints(basepath.health?.level) +
                                            this.calculateTotalSkillPoints(basepath.lootChance?.level) +
                                            this.calculateTotalSkillPoints(basepath.hunger?.level);

            const ecoSkillPathPoints =      this.calculateTotalSkillPoints(basepath.energy?.level) + 
                                            this.calculateTotalSkillPoints(basepath.companies?.level) +
                                            this.calculateTotalSkillPoints(basepath.entrepreneurship?.level) + 
                                            this.calculateTotalSkillPoints(basepath.production?.level) +
                                            this.calculateTotalSkillPoints(basepath.management?.level);
                                            
            const userLevel = apiData.leveling?.level || 0;
            
            if (userLevel > 20) {   //Wenn unter Level 20 = Aufbau
                if (warSkillPathPoints > ecoSkillPathPoints) {
                    skillpath = 'War';
                } else if (ecoSkillPathPoints > warSkillPathPoints) {
                    skillpath = 'Eco';
                }
            }else{
                skillpath = 'Aufbau';
            }
        }
        return {
            _id: apiData._id,
            avatarUrl: apiData.avatarUrl,
            username: apiData.username,
            country: calculatedFlagCode,
            level: apiData.leveling?.level,
            lastConnectionAt: apiData.dates?.lastConnectionAt,
            isActive: apiData.isActive,
            weeklyUserDamages: apiData.rankings?.weeklyUserDamages?.value,
            skillpath: skillpath || 'Fehler',
            buffs:{
                "buffCodes": apiData.buffs?.buffCodes || [],
                "buffEndAt": apiData.buffs?.buffEndAt || null,
                "debuffCodes": apiData.buffs?.debuffCodes || [],
                "debuffEndAt": apiData.buffs?.debuffEndAt || null,
            },
            
        };
    }
}

// ==========================================================================
// SUB-HANDLERS (Spezifische Feature-Logik mit privaten Kern-Methoden)
// ==========================================================================

class ArticleHandler extends BaseSubHandler {
    constructor(parent) {
        super(parent, 'ARTICLE');
    }

    async #getArticle() {
        const cachedData = this.getCacheData(this.parent.currentArticleId);
        if (cachedData) return cachedData;

        const response = await this.parent.client.article.getArticleById({ articleId: this.parent.currentArticleId });
        const articleData = response?.result?.data || response;
        const formatedArticle = this.mapArticleData(articleData);
        
        this.setCacheData(this.parent.currentArticleId, formatedArticle);
        return formatedArticle;
    }

    async getWrapper() {
        const articleData = await this.#getArticle();
        this.forceUpdate = false; 
        return articleData;
    }
}

class CountryHandler extends BaseSubHandler {
    #laufendeCountryRequest = null; 

    constructor(parent) {
        super(parent, 'COUNTRY');
    }

    async #getCountries(countryId = null) {
        let allCountries = this.getCacheData(null) || [];

        if (allCountries.length === 0) {
            if (!this.#laufendeCountryRequest) {
                this.#laufendeCountryRequest = (async () => {
                    const response = await this.parent.client.country.getAllCountries(); 
                    const countryData = response?.result?.data || response;
                    const formatedCountries = countryData.map(country => this.mapCountryRow(country));
                    
                    this.setCacheData(null, formatedCountries);
                    return formatedCountries;
                })();
            }
            allCountries = await this.#laufendeCountryRequest;
            this.#laufendeCountryRequest = null; 
        }

        if (countryId) {
            return allCountries.find(c => c._id === countryId) || null;
        }
        return allCountries;
    }

    async getWrapper(countryId = null) {
        const result = await this.#getCountries(countryId);
        this.forceUpdate = false; 
        return result;
    }
    
    async getInternalCountries(countryId = null) {
        return await this.#getCountries(countryId);
    }
}

class MuHandler extends BaseSubHandler {
    constructor(parent) {
        super(parent, 'MU');
    }

    #parseMUFromArticle(articleData) {
        const geparsteGruppen = [];
        if (!articleData || !articleData.content) return geparsteGruppen;

        const parts = articleData.content.split(/<h2[^>]*>/);
        parts.forEach((part, index) => {
            if (index === 0) return; 
            const nameMatch = part.match(/([^<]+)<\/h2>/);
            if (!nameMatch) return;
            
            const divisionName = nameMatch[1].trim();
            const aktuelleGruppe = { category: divisionName, ids: [] };

            const muRegex = /muId&quot;:&quot;([a-f0-9]{24})/g;
            let match;
            while ((match = muRegex.exec(part)) !== null) {
                aktuelleGruppe.ids.push(match[1]);
            }
            if (aktuelleGruppe.ids.length > 0) geparsteGruppen.push(aktuelleGruppe);
        });
        return geparsteGruppen;
    }

    #parseMarkdownFormat(rawText) {
        const geparsteGruppen = [];
        if (!rawText) return geparsteGruppen;

        const parts = rawText.split(/^##\s+/m);
        parts.forEach((part, index) => {
            if (index === 0) return;
            const lines = part.split(/\r?\n/);
            const divisionName = lines[0].trim();
            if (!divisionName) return;

            const aktuelleGruppe = { category: divisionName, ids: [] };
            const restText = lines.slice(1).join("\n");
            const muRegex = /muId&quot;:&quot;([a-f0-9]{24})/g;
            let match;
            
            while ((match = muRegex.exec(restText)) !== null) {
                aktuelleGruppe.ids.push(match[1]);
            }
            if (aktuelleGruppe.ids.length > 0) geparsteGruppen.push(aktuelleGruppe);
        });
        return geparsteGruppen;
    }

    async #fetchAndCacheMU(MU_ID) {
        const response = await this.parent.client.mu.getById({ muId : MU_ID });
        const muData = response?.result?.data || response;
        const formatedMU = this.mapMUData(muData);
        
        this.setCacheData(MU_ID, formatedMU);
        return formatedMU;
    }

    async #getMU(geparsteGruppen) {
      const apiTasks = []; 
      const finalResults = []; 
      const laufendeApiRequests = new Map();
    
      geparsteGruppen.forEach(gruppe => {
          // LOKALER MAPPER: Erstellt das standardisierte Ergebnisobjekt
          const erstelleErgebnisObjekt = (id, muData) => ({
              spaltenName: gruppe.category,
              id: id,
              objekt: muData
          });

          gruppe.ids.forEach(id => {
              const cachedData = this.getCacheData(id);

              if (cachedData) {
                  // 1. Nutzung beim Cache-Treffer
                  finalResults.push(erstelleErgebnisObjekt(id, cachedData));
                  return; 
              }
    
              if (laufendeApiRequests.has(id)) {
                  const duplicateTask = (async () => {
                      const muData = await laufendeApiRequests.get(id);
                      // 2. Nutzung beim Duplikat-Schutz (Laufender Request)
                      return erstelleErgebnisObjekt(id, muData);
                  })();
                  apiTasks.push(duplicateTask);
                  return;
              }
    
              const fetchTask = (async () => {
                  try {
                      return await this.#fetchAndCacheMU(id);
                  } catch (error) {
                      console.error(`Fehler bei ID ${id}:`, error);
                      return { _id: id, name: `Fehler (${id.substring(0,4)})`, members: [] };
                  }
              })();
    
              laufendeApiRequests.set(id, fetchTask);
    
              const mainTask = (async () => {
                  const muData = await fetchTask;
                  // 3. Nutzung nach erfolgreichem API-Fetch
                  return erstelleErgebnisObjekt(id, muData);
              })();
              apiTasks.push(mainTask);
          });
      });
    
      if (apiTasks.length > 0) {
          const apiResults = await Promise.all(apiTasks);
          finalResults.push(...apiResults);
      }
      return finalResults.filter(eintrag => eintrag !== null);
    }

    async getMUFromArticle() {
        const customLayout = this.parent.layout.getCustomLayoutData();

        if (customLayout && customLayout.spalten) {
            try { 
                console.log("Custom-Layout im Speicher gefunden. Lade modifizierte Struktur...");
                const MUs = await this.#getMU(customLayout.spalten);
                this.forceUpdate = false;
                return MUs;
            } catch (e) {
                console.error("Fehler beim Parsen des Custom-Layouts, weiche auf API aus:", e);
            }
        }

        const articleData = await this.parent.articles.getWrapper();
        const geparsteGruppen = this.#parseMUFromArticle(articleData);
        const MUs = await this.#getMU(geparsteGruppen);
        
        this.forceUpdate = false;
        return MUs;
    }   


    //War mal html zu faul um die Variable zu ändern
    exportSpaltenToMarkdown(spalten = []) {
        let html = "";
        spalten.forEach((spalte, index) => {
            if (!spalte.ids || spalte.ids.length === 0) return;
            if (index > 0) html += "\n";
            html += `## ${spalte.category}\n\n`;
            
            spalte.ids.forEach(id => {
                html += "\\\n";
                html += `<span data-content-link="" data-content-type="mu" data-content-data="{&quot;muId&quot;:&quot;${id}&quot;,&quot;fullMatch&quot;:&quot;https://app.warera.io/mu/${id}&quot;}" data-original-text="https://app.warera.io/mu/${id}"></span>`;
            });
        });
        return html;
    }

    parseMarkdownToSpalten(htmlText) {
        if (!htmlText) return [];
        return this.#parseMarkdownFormat(htmlText);
    }

    async getMultipleMusByIds(muIds = []) {
        const bereinigteIds = [...new Set(muIds.filter(Boolean))];
        if (bereinigteIds.length === 0) return new Map();

        try {
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
    
    async getInternalMU(geparsteGruppen) {
        return await this.#getMU(geparsteGruppen);
    }
}

class UserHandler extends BaseSubHandler {
    constructor(parent) {
        super(parent, 'USER');
    }

    async #fetchAndCacheUser(USER_ID) {
        const response = await this.parent.client.user.getUserById({ userId : USER_ID });
        const userData = response?.result?.data || response;

        const countryObj = await this.parent.countries.getInternalCountries(userData.country);
        const flagCode = countryObj ? countryObj.code : "";

        const formatedUser = this.mapUserData(userData, flagCode);
        this.setCacheData(USER_ID, formatedUser);
        return formatedUser;
    }

    async #getUser(userIds = []) {
        const apiTasks = []; 
        const finalResults = []; 
        const laufendeApiRequests = new Map();

        userIds.forEach(id => {
            const cleanId = typeof id === 'object' ? (id._id || id.id) : id;
            if (!cleanId) return;

            const cachedData = this.getCacheData(cleanId);
            if (cachedData) {
                finalResults.push(cachedData);
                return; 
            }

            if (laufendeApiRequests.has(cleanId)) {
                const duplicateTask = (async () => await laufendeApiRequests.get(cleanId))();
                apiTasks.push(duplicateTask);
                return;
            }

            const fetchTask = (async () => {
                try {
                    return await this.#fetchAndCacheUser(cleanId);
                } catch (error) {
                    console.error(`Fehler bei User-ID ${cleanId}:`, error);
                    return { 
                        _id: cleanId, username: `Fehler (${String(cleanId).substring(0,4)})`, 
                        avatarUrl: "", level: 0, isActive: false
                    };
                }
            })();

            laufendeApiRequests.set(cleanId, fetchTask);
            apiTasks.push(fetchTask);
        });

        if (apiTasks.length > 0) {
            const apiResults = await Promise.all(apiTasks);
            finalResults.push(...apiResults);
        }
        return finalResults.filter(user => user !== null);
    }

    async getMUUserData(muId) {
        if (!muId) return { managers: [], commanders: [], members: [] };

        const muResult = await this.parent.mus.getInternalMU([{ category: "temporary", ids: [muId] }]);
        if (!muResult || muResult.length === 0 || !muResult[0].objekt) {
            console.warn(`MU mit der ID ${muId} konnte nicht geladen werden.`);
            return { managers: [], commanders: [], members: [] };
        }

        const muObjekt = muResult[0].objekt;
        const extrahiereId = (item) => {
            if (!item) return null;
            return typeof item === 'object' ? (item._id || item.id)?.toString() : item.toString();
        };

        const managerIds = (Array.isArray(muObjekt.managers) ? muObjekt.managers : [muObjekt.managers || []]).flatMap(item => item ? [extrahiereId(item)] : []).filter(Boolean);
        const commanderIds = (Array.isArray(muObjekt.commanders) ? muObjekt.commanders : [muObjekt.commanders || []]).flatMap(item => item ? [extrahiereId(item)] : []).filter(Boolean);
        const memberIds = (Array.isArray(muObjekt.members) ? muObjekt.members : [muObjekt.members || []]).flatMap(item => item ? [extrahiereId(item)] : []).filter(Boolean);

        await this.parent.countries.getInternalCountries();

        const alleUserIds = new Set([...managerIds, ...commanderIds, ...memberIds]);
        const geladeneUser = await this.#getUser(Array.from(alleUserIds));

        const userMap = new Map();
        geladeneUser.forEach(user => {
            if (user?._id) userMap.set(user._id.toString(), user);
        });

        const zwingeUserObjekt = (id, fallbackRolle) => {
            const existierenderUser = userMap.get(id);
            if (existierenderUser?.username) return existierenderUser;
            return {
                _id: id, username: `${fallbackRolle} (${id.substring(0, 6)})`,
                avatarUrl: "", level: 0, isActive: false
            };
        };

        this.forceUpdate = false;
        
        return {
            managers: managerIds.map(id => zwingeUserObjekt(id, "Manager")),
            commanders: commanderIds.map(id => zwingeUserObjekt(id, "Commander")),
            members: memberIds.map(id => zwingeUserObjekt(id, "Mitglied"))
        };
    }
}

class LayoutHandler extends BaseSubHandler {
    constructor(parent) {
        super(parent, 'LAYOUT');
    }

    getCustomLayoutData() {
        return this.getCacheData(this.parent.currentArticleId);
    }

    saveCustomLayout(spalten = []) {
        if (!spalten || spalten.length === 0) {
            localStorage.removeItem(this.getCacheKey(this.parent.currentArticleId));
            console.log("Custom-Layout wurde gelöscht. Artikel-Standard ist wieder aktiv.");
            return;
        }
        this.setCacheData(this.parent.currentArticleId, { spalten });
        console.log("Custom-Layout erfolgreich lokal gespeichert.");
    }
}

// ==========================================================================
// CENTRAL DATA HANDLER (Der Orchestrator / Einstiegspunkt für React)
// ==========================================================================
export class DataHandler {
    constructor(defaultArticleId = '', forceUpdate = false) {

        this._forceUpdate = forceUpdate;
        this.DEFAULT_ARTICLE_ID = defaultArticleId;

        // Initiale Werte sicher laden
        this._apiKey = this._safeGetLocalStorage('warera_api_key', '');
        this._currentArticleId = this._safeGetLocalStorage('warera_article_id', defaultArticleId) || defaultArticleId;

        // API-Client initialisieren
        this.client = getWarEraClient();

        // Sub-Handler registrieren
        this.articles = new ArticleHandler(this);
        this.countries = new CountryHandler(this);
        this.mus = new MuHandler(this);
        this.users = new UserHandler(this);
        this.layout = new LayoutHandler(this);
    }

    // ==========================================
    // GETTER (Öffentlicher Lesezugriff)
    // ==========================================
    get apiKey() {
        return this._apiKey;
    }

    get currentArticleId() {
        return this._currentArticleId;
    }

    // ==========================================
    // SEPARATE SPEICHER- & LÖSCHMETHODEN
    // ==========================================
    
    // API-Key einzeln verwalten
    saveApiKey(newKey) {
        try {
            const finalKey = newKey.trim();
            localStorage.setItem('warera_api_key', finalKey);
            this._apiKey = finalKey;
            this.updateClient(); // Client neu bauen, da sich die Rechte geändert haben
        } catch (error) {
            console.error("Fehler beim Speichern des API-Keys:", error);
            throw error;
        }
    }

    clearApiKey() {
        try {
            localStorage.removeItem('warera_api_key');
            this._apiKey = '';
            this.updateClient();
        } catch (error) {
            console.error("Fehler beim Löschen des API-Keys:", error);
        }
    }

    // Article-ID einzeln verwalten
    saveArticleId(newArticleId) {
        try {
            const finalId = newArticleId.trim() || this.DEFAULT_ARTICLE_ID;
            localStorage.setItem('warera_article_id', finalId);
            this._currentArticleId = finalId;
        } catch (error) {
            console.error("Fehler beim Speichern der Article-ID:", error);
            throw error;
        }
    }

    clearArticleId() {
        try {
            localStorage.removeItem('warera_article_id');
            this._currentArticleId = this.DEFAULT_ARTICLE_ID;
        } catch (error) {
            console.error("Fehler beim Zurücksetzen der Article-ID:", error);
        }
    }

    // ==========================================
    // INTERNE HILFSMETHODEN & LEGACY-SETTER
    // ==========================================

    get forceUpdate() {
        return this._forceUpdate;
    }

    set forceUpdate(value) {
        this._forceUpdate = !!value;
        console.log(`Zentraler forceUpdate-Zustand geändert auf: ${this._forceUpdate}`);
    }

    setArticleId(newId) {
        this.currentArticleId = newId;
    }

    setForceUpdate(forceUpdate = false) {
        this.forceUpdate = forceUpdate;
    }

    updateClient() {
        this.client = getWarEraClient();
    }

    // Öffentliche Schnittstellen für React
    async getArticleWrapper() { return await this.articles.getWrapper(); }
    async getCountriesWrapper(countryId = null) { return await this.countries.getWrapper(countryId); }
    async getMUFromArticle() { return await this.mus.getMUFromArticle(); }
    async getMUUserData(muId) { return await this.users.getMUUserData(muId); }
    
    exportSpaltenToMarkdown(spalten) { return this.mus.exportSpaltenToMarkdown(spalten); }
    parseMarkdownToSpalten(htmlText) { return this.mus.parseMarkdownToSpalten(htmlText); }
    async getMultipleMusByIds(muIds) { return await this.mus.getMultipleMusByIds(muIds); }
    saveCustomLayout(spalten) { this.layout.saveCustomLayout(spalten); }
}