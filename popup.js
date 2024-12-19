document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('csvFile');
    const startLineInput = document.getElementById('startLine');
    const loadButton = document.getElementById('loadButton');
    let lastFileContent = null;

    // Charger les dernières données sauvegardées
    chrome.storage.local.get(['currentIndex', 'lastStartLine', 'lastCSVContent'], function(result) {
        startLineInput.value = result.lastStartLine || 1;
        lastFileContent = result.lastCSVContent;
        
        // Afficher la dernière position et le statut du fichier
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info-text';
        infoDiv.innerHTML = `
            <p>Dernière position : ligne ${result.currentIndex || 1}</p>
            ${lastFileContent ? '<p>✓ Fichier CSV en mémoire</p>' : '<p>Aucun fichier CSV en mémoire</p>'}
        `;
        document.body.insertBefore(infoDiv, loadButton);

        // Si un fichier est en mémoire, activer le bouton
        loadButton.disabled = !lastFileContent;
        updateButtonText();
    });

    function updateButtonText() {
        loadButton.textContent = fileInput.files.length > 0 ? 
            'Charger nouveau fichier' : 
            (lastFileContent ? 'Utiliser fichier en mémoire' : 'Choisir un fichier');
    }

    // Écouter les changements de fichier
    fileInput.addEventListener('change', function() {
        updateButtonText();
        loadButton.disabled = false;
    });

    // Écouter les changements dans le champ de ligne de départ
    startLineInput.addEventListener('change', function() {
        const startLine = parseInt(this.value) || 1;
        chrome.storage.local.set({ 
            currentIndex: startLine,
            lastStartLine: startLine 
        });
    });

    loadButton.addEventListener('click', function() {
        const startLine = parseInt(startLineInput.value) || 1;
        
        if (fileInput.files.length > 0) {
            // Nouveau fichier sélectionné
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const content = e.target.result;
                // Sauvegarder le contenu du fichier
                chrome.storage.local.set({ 
                    lastCSVContent: content,
                    lastStartLine: startLine,
                    currentIndex: startLine 
                });
                
                sendCSVToContent(content, startLine);
            };
            reader.readAsText(file);
        } else if (lastFileContent) {
            // Utiliser le fichier en mémoire
            sendCSVToContent(lastFileContent, startLine);
        }
    });

    function sendCSVToContent(content, startLine) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'CSV_LOADED',
                data: content,
                startLine: startLine
            });
        });
    }
}); 