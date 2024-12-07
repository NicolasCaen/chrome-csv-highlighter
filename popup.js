// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', async function() {
  let csvData = null;
  const fileInput = document.getElementById('fileInput');
  const submitBtn = document.getElementById('submitBtn');
  const fileNameDiv = document.getElementById('fileName');

  // Charger les données sauvegardées
  const stored = await chrome.storage.local.get(['csvData', 'fileName']);
  if (stored.csvData && stored.fileName) {
    csvData = stored.csvData;
    fileNameDiv.textContent = `Fichier sélectionné : ${stored.fileName}`;
    submitBtn.style.display = 'block';
  }

  if (fileInput) {
    fileInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (file) {
        fileNameDiv.textContent = `Fichier sélectionné : ${file.name}`;
        submitBtn.style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = async function(event) {
          csvData = event.target.result;
          // Sauvegarder le fichier
          await chrome.storage.local.set({
            csvData: csvData,
            fileName: file.name
          });
        };
        reader.readAsText(file);
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async function() {
      if (!csvData) return;

      try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: ['content.js']
        }).catch(e => console.log('Script déjà injecté'));

        await new Promise(resolve => setTimeout(resolve, 200));

        await chrome.tabs.sendMessage(tab.id, {
          type: 'CSV_LOADED',
          data: csvData
        });

        window.close();

      } catch (error) {
        console.error('Erreur:', error);
        fileNameDiv.textContent = 'Erreur: Veuillez recharger la page et réessayer';
        fileNameDiv.style.color = 'red';
      }
    });
  }
}); 