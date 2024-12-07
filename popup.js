// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
  let csvData = null;
  const fileInput = document.getElementById('fileInput');
  const submitBtn = document.getElementById('submitBtn');
  const fileNameDiv = document.getElementById('fileName');

  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        fileNameDiv.textContent = `Fichier sélectionné : ${file.name}`;
        submitBtn.style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = function(event) {
          csvData = event.target.result;
        };
        reader.readAsText(file);
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async function() {
      if (!csvData) return;

      try {
        // Obtenir l'onglet actif
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Injecter le script
        await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          files: ['content.js']
        }).catch(e => console.log('Script déjà injecté'));

        // Attendre un peu
        await new Promise(resolve => setTimeout(resolve, 200));

        // Envoyer les données CSV
        await chrome.tabs.sendMessage(tab.id, {
          type: 'CSV_LOADED',
          data: csvData
        });

        // Fermer le popup
        window.close();

      } catch (error) {
        console.error('Erreur:', error);
        // Afficher l'erreur à l'utilisateur
        fileNameDiv.textContent = 'Erreur: Veuillez recharger la page et réessayer';
        fileNameDiv.style.color = 'red';
      }
    });
  }
}); 