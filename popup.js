document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('csvFile');
    const startLineInput = document.getElementById('startLine');
    const loadButton = document.getElementById('loadButton');

    // Charger la dernière ligne sauvegardée
    chrome.storage.local.get(['currentIndex', 'lastStartLine'], function(result) {
        startLineInput.value = result.lastStartLine || 1;
        
        // Afficher la dernière position
        if (result.currentIndex) {
            const lastPositionInfo = document.createElement('div');
            lastPositionInfo.className = 'info-text';
            lastPositionInfo.innerHTML = `
                <p>Dernière position : ligne ${result.currentIndex}</p>
            `;
            document.body.insertBefore(lastPositionInfo, loadButton);
        }
    });

    // Écouter les changements dans le champ de ligne de départ
    startLineInput.addEventListener('change', function() {
        const startLine = parseInt(this.value) || 1;
        // Mettre à jour currentIndex avec la nouvelle valeur
        chrome.storage.local.set({ 
            currentIndex: startLine,
            lastStartLine: startLine 
        });
    });

    loadButton.addEventListener('click', function() {
        const file = fileInput.files[0];
        const startLine = parseInt(startLineInput.value) || 1;
        
        if (file) {
            // Sauvegarder la ligne de départ et la position courante
            chrome.storage.local.set({ 
                lastStartLine: startLine,
                currentIndex: startLine 
            });
            
            const reader = new FileReader();
            reader.onload = function(e) {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'CSV_LOADED',
                        data: e.target.result,
                        startLine: startLine
                    });
                });
            };
            reader.readAsText(file);
        }
    });
}); 