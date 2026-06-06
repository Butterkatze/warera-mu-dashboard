import { getWarEraClient } from './api.js';

export class DataHandler {


    constructor(initialArticleId = '', forceUpdate = false) {
        this.client = getWarEraClient();
        this.forceUpdate = forceUpdate
        
        // const ARTICLE_ID = '6a1f025b37df43a8d01bb9a2'; 
        // HIER sichern wir die ID direkt in der Klasse
        this.currentArticleId = initialArticleId; 

        this.ARTICLE_CACHE = 5 * 60 * 1000; 
        this.MU_CACHE= 15 * 60 * 1000;     
    }

    // Methode, um die ID jederzeit von außen live zu ändern
    setArticleId(newId) {
        this.currentArticleId = newId;
        console.log(`Klassen-Zustand geändert: Article ID ist jetzt ${this.currentArticleId}`);
    }




/* ==========================================================================
    Article Funktionen
    ========================================================================== */

    async  #setArticleCache(articleCacheKey) {

    const client = getWarEraClient();
  
    const response = await client.article.getArticleById({ articleId: this.currentArticleId });
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

    async getArticle(){
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
                "dormitories" : muData.activeUpgradeLevels?.dormitories ,
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
                if (now - timestamp < this.MU_CACHE_TIME) {
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

        const articleData = await this.getArticle();

        /*#################    Parser   ####################*/
    
        const geparsteGruppen = this.#parseMUFromArticle(articleData);

        /*#################    Strucktur mit Division (gruppe ), Muid und Mu-daten (bzw MU objekt bauen)  ####################*/

        return this.#getMU (geparsteGruppen);
    }   

}