import { getWarEraClient } from './api.js';




/* ==========================================================================
    Article Funktionen
    ========================================================================== */

async function setArticleCache(ARTICLE_ID, articleCacheKey) {

    const client = getWarEraClient();
  
    const response = await client.article.getArticleById({ articleId: ARTICLE_ID });
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

export async function getArticle(ARTICLE_ID){
    const ARTICLE_CACHE = 5 * 60 * 1000;
    const now = Date.now();
    const articleCacheKey = `article_cache_${ARTICLE_ID}`;

    const cached = localStorage.getItem(articleCacheKey);

          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (now - timestamp < ARTICLE_CACHE) {

              return data; 
            }
        }

    const formatedArticle = await setArticleCache(ARTICLE_ID, articleCacheKey);

    return formatedArticle
}

/* ==========================================================================
    MU Funktionen
    ========================================================================== */

async function setMUCache(MU_ID, muCacheKey) {

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

async function getMU(MU_ID){
    const MU_CACHE = 15 * 60 * 1000;
    const now = Date.now();
    const muCacheKey = `mu_cache_${MU_ID}`;

    const cached = localStorage.getItem(muCacheKey);

          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (now - timestamp < MU_CACHE) {

              return data; 
            }
        }

    const formatedMU = await setMUCache(MU_ID, muCacheKey);

    

    return formatedMU
}

export async function getMUFromArticle(ARTICLE_ID) {
  

    const articleData = await getArticle(ARTICLE_ID);

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
    if (geparsteGruppen.ids.length > 0) geparsteGruppen.push(aktuelleGruppe);
    });

  /*#################      3-teilige Strucktur    ####################*/

    const ergebnisListe = []; // Das flache finale Array

    for (const gruppe of geparsteGruppen) {
        
        // Alle IDs dieser Spalte parallel/asynchron laden
        const muPromises = gruppe.ids.map(async (id) => {
            try {
                const MuData = await getMU(id); 
                
                return {
                    spaltenName: gruppe.category, 
                    id: id,                       
                    objekt: MuData    
                };

            } catch (error) {
                console.error(`Fehler bei ID ${id}:`, error);
                return null;
            }
        });

        const geladeneMus = await Promise.all(muPromises);
        
        // Die gefilterten Ergebnisse flach in unsere Hauptliste schieben
        geladeneMus.forEach(eintrag => {
            if (eintrag !== null) {
                ergebnisListe.push(eintrag);
            }
        });
    }

    return ergebnisListe;
    
}



