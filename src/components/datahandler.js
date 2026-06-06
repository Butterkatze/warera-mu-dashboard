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

    const client = getWarEraClient();
  
    const response = await client.mu.getById({ muId : MU_ID });
    /* Daten Formatierne*/
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
    
    const now = Date.now();

    localStorage.setItem(muCacheKey, JSON.stringify({ data: formatedMU, timestamp: now }));

    return formatedMU
    }

    async #getMU(MU_ID){
    const now = Date.now();
    const muCacheKey = `mu_cache_${MU_ID}`;

    const cached = localStorage.getItem(muCacheKey);

    if (cached && !this.forceUpdate) {
        const { data, timestamp } = JSON.parse(cached);
        if (now - timestamp < this.MU_CACHE) {
            return data; 
        }
    }

    const formatedMU = await this.#setMUCache(MU_ID, muCacheKey);

    

    return formatedMU
    }

    async getMUFromArticle() {
  

    const articleData = await this.getArticle();

  /*#################    Parser   ####################*/
  
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

  /*#################    Strucktur mit Division (grupper ), Muid und Mu-daten (bzw MU objekt bauen)  ####################*/

    const allPromises = [];
    
 
  geparsteGruppen.forEach(gruppe => {
    gruppe.ids.forEach(id => {
      
     
      const muPromise = (async () => {
        try {
          const MuData = await this.#getMU(id); 
          return {
            spaltenName: gruppe.category, 
            id: id,                    
            objekt: MuData    
          };
        } catch (error) {
          console.error(`Fehler bei ID ${id}:`, error);
          return null;
        }
      })();

      allPromises.push(muPromise);
    });
  });

  /* #################   3. NEU: ALLES auf einen Schlag feuern!   #################### */
  const geladeneMus = await Promise.all(allPromises);
  
  // Am Ende filtern wir die Null-Werte (Fehler) heraus und geben das flache Array zurück
  return geladeneMus.filter(eintrag => eintrag !== null);
}



    


}