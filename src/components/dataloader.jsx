import { useState, useEffect } from 'react';
import { DataHandler } from './datahandler.js'; // Deine Klasse von vorhin


export function useDataloader({articleId}) {
  const [muData, setMUData] = useState([]);
  useEffect(() => {
    if (!articleId) return;

    
    async function fetchData() {

      console.log("dataloader hool")
      const handlerInstance = new DataHandler(articleId);
      const data = await handlerInstance.getMUFromArticle();
      
      setMUData(data);
    }
    fetchData();


  }, [articleId]);

  return { muData };
}