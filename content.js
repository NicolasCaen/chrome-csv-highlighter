(function() {
  const state = {
    csvLines: [],
    currentIndex: 0,
    isInitialized: false,
    separator: null
  };

  // Fonction d'initialisation des styles
  function initializeViewer() {
    if (state.isInitialized) return;
    state.isInitialized = true;

    const style = document.createElement('style');
    style.textContent = `
      .csv-viewer {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: white;
        padding: 0!important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        z-index: 999999;
        border-bottom: 2px solid #333;
        max-height: 80vh;
        overflow-x: auto;
        cursor: move;
        user-select: none;
        width: 80%;
        margin: 0 auto;
      }
      .csv-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0;
        background: #fff;
      }
      .csv-table th, .csv-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
      }
      .csv-table th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      .csv-nav-button {
        margin: 0 10px;
        padding: 5px 15px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function highlightTextInPage(searchText) {
    if (!searchText || searchText.length < 2) return;

    // Fonction pour vérifier si un nœud doit être ignoré
    function shouldSkipNode(node) {
      const parent = node.parentNode;
      return parent.closest('#csv-viewer') || // Ignore notre viewer
             parent.tagName === 'SCRIPT' ||   // Ignore les scripts
             parent.tagName === 'STYLE' ||    // Ignore les styles
             parent.tagName === 'HEAD' ||     // Ignore le head
             parent.tagName === 'NOSCRIPT' || // Ignore noscript
             parent.closest('iframe');        // Ignore les iframes
    }

    // Récupérer uniquement le contenu du body
    const bodyContent = document.body;
    
    const walker = document.createTreeWalker(
      bodyContent,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          return shouldSkipNode(node) ? 
            NodeFilter.FILTER_REJECT : 
            NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      const regex = new RegExp(searchText, 'gi');
      
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(regex, match => 
          `<mark style="background-color: #90EE90; padding: 2px; border-radius: 2px;">${match}</mark>`
        );
        node.parentNode.replaceChild(span, node);
      }
    }
  }

  function clearPreviousHighlights() {
    const highlights = document.querySelectorAll('mark');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      // Normaliser pour fusionner les nœuds de texte adjacents
      parent.normalize();
    });
  }

  function displayLine(lineIndex) {
    clearPreviousHighlights();
    
    const table = document.getElementById('csv-table');
    if (!table || !state.csvLines[lineIndex]) {
      console.error('Table non trouvée ou pas de données pour la ligne', lineIndex);
      return;
    }
    
    table.innerHTML = '';
    
    const headers = parseCSVLine(state.csvLines[0]);
    const currentLine = parseCSVLine(state.csvLines[lineIndex]);
    
    // Calculer la largeur minimale en caractères pour chaque colonne
    const columnWidths = new Array(headers.length).fill(0);
    
    // Vérifier la largeur nécessaire pour les en-têtes
    headers.forEach((header, index) => {
        columnWidths[index] = Math.max(columnWidths[index], header.length) + 2; // +2ch pour l'espacement
    });
    
    // Vérifier la largeur nécessaire pour les données
    currentLine.forEach((cell, index) => {
        columnWidths[index] = Math.max(columnWidths[index], cell.length + 2); // +2ch pour l'espacement
    });

    // En-tête
    const headerRow = document.createElement('tr');
    headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header.trim();
        th.style.minWidth = `${columnWidths[index]}ch`;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Ligne de données
    if (lineIndex > 0) {
        const dataRow = document.createElement('tr');
        currentLine.forEach((cell, cellIndex) => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = cell.trim();
            
            // Fonction pour ajuster la largeur de l'input en ch
            function adjustInputWidth(input) {
                const contentLength = input.value.length;
                return Math.max(contentLength + 2, 7); // Minimum 7ch (5 + 2 pour l'espacement)
            }

            // Style de base pour l'input
            input.style.cssText = `
                width: ${adjustInputWidth(input)}ch;
                min-width: 7ch;
                padding: .2em;
                border: 1px solid #ddd;
                box-sizing: border-box;
                margin: 0;
                font-size: 1rem;
            `;

            // Ajuster la largeur lors de la modification
            input.addEventListener('input', () => {
                input.style.width = `${adjustInputWidth(input)}ch`;
            });

            // Reste du code existant pour l'input
            input.addEventListener('change', (e) => {
                const newValue = e.target.value;
                const currentLineData = parseCSVLine(state.csvLines[lineIndex]);
                currentLineData[cellIndex] = newValue;
                state.csvLines[lineIndex] = currentLineData.join(state.separator);
                
                const pageText = document.body.textContent.toLowerCase();
                if (pageText.includes(newValue.toLowerCase())) {
                    td.style.backgroundColor = '#90EE90';
                    highlightTextInPage(newValue);
                } else {
                    td.style.backgroundColor = '';
                    clearPreviousHighlights();
                }
            });
            
            td.appendChild(input);
            
            const pageText = document.body.textContent.toLowerCase();
            if (pageText.includes(cell.trim().toLowerCase())) {
                td.style.backgroundColor = '#90EE90';
                highlightTextInPage(cell.trim());
            }
            
            dataRow.appendChild(td);
        });
        table.appendChild(dataRow);
    }
    
    // Mettre à jour le compteur
    const counter = document.getElementById('csv-counter');
    if (counter) {
      counter.textContent = `Ligne ${lineIndex} sur ${state.csvLines.length - 1}`;
    }
    
    // Sauvegarder l'index courant
    chrome.storage.local.set({ currentIndex: lineIndex });
  }

  function showPreviousLine() {
    if (state.currentIndex > 1) { // Commence à 1 au lieu de 0
      state.currentIndex--;
      displayLine(state.currentIndex);
    }
  }

  function showNextLine() {
    if (state.currentIndex < state.csvLines.length - 1) {
      state.currentIndex++;
      displayLine(state.currentIndex);
    }
  }

  function createCSVViewer() {
    initializeViewer();

    const viewer = document.createElement('div');
    viewer.id = 'csv-viewer';
    viewer.className = 'csv-viewer';
    
    // Ajout des variables pour le déplacement
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // Gestionnaire d'événements pour le déplacement
    viewer.addEventListener('mousedown', (e) => {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      
      if (e.target === viewer || e.target.tagName === 'DIV') {
        isDragging = true;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        viewer.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Le reste du code existant de createCSVViewer
    const table = document.createElement('table');
    table.id = 'csv-table';
    table.className = 'csv-table';
    
    const navigation = document.createElement('div');
    navigation.style.textAlign = 'center';
    navigation.style.padding = '.2em';
    navigation.innerHTML = `
      <button id="prev-btn" class="csv-nav-button">Précédent</button>
      <span style="margin: 0 10px;" id="csv-counter"></span>
      <button id="next-btn" class="csv-nav-button">Suivant</button>
    `;
    
    viewer.appendChild(table);
    viewer.appendChild(navigation);
    document.body.prepend(viewer);
    
    setTimeout(() => {
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      if (prevBtn) prevBtn.addEventListener('click', showPreviousLine);
      if (nextBtn) nextBtn.addEventListener('click', showNextLine);
    }, 0);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Télécharger CSV';
    downloadBtn.className = 'csv-nav-button';
    downloadBtn.addEventListener('click', () => {
      const csvContent = state.csvLines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modified.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
    navigation.appendChild(downloadBtn);
  }

  // Gestionnaire de messages
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message reçu:', request.type);
    
    if (request.type === 'CSV_LOADED') {
      try {
        // S'assurer que le document est prêt
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => processCSV(request.data));
        } else {
          processCSV(request.data);
        }
        sendResponse({status: 'OK'});
      } catch (error) {
        console.error('Erreur:', error);
        sendResponse({status: 'ERROR', message: error.message});
      }
      return true;
    }
  });

  function processCSV(data) {
    console.log('Données brutes reçues:', data.substring(0, 200)); // Affiche le début du fichier
    
    // Normaliser les sauts de ligne
    const normalizedData = data.replace(/\r\n|\r|\n/g, '\n');
    
    // Détecter le séparateur
    state.separator = detectSeparator(normalizedData);
    console.log('Séparateur choisi:', state.separator);
    
    // Parser les lignes
    state.csvLines = normalizedData
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Analyser la structure
    const firstLine = parseCSVLine(state.csvLines[0]);
    const secondLine = state.csvLines[1] ? parseCSVLine(state.csvLines[1]) : [];
    
    console.log('Analyse du parsing:', {
        'Nombre de colonnes': firstLine.length,
        'En-têtes détectés': firstLine,
        'Exemple première ligne de données': secondLine,
        'Nombre total de lignes': state.csvLines.length
    });

    // Vérifier la cohérence des colonnes
    const columnCounts = state.csvLines
        .slice(0, 5) // Vérifier les 5 premières lignes
        .map(line => parseCSVLine(line).length);
    
    console.log('Vérification colonnes:', {
        'Nombre de colonnes par ligne (5 premières lignes)': columnCounts,
        'Cohérent': new Set(columnCounts).size === 1 ? 'Oui' : 'Non'
    });

    if (!document.getElementById('csv-viewer')) {
      createCSVViewer();
    }
    
    // Charger l'index sauvegardé ou commencer à 1
    chrome.storage.local.get('currentIndex', function(result) {
      state.currentIndex = result.currentIndex || 1;
      
      if (state.csvLines.length > 1) {
        displayLine(state.currentIndex);
        showNotification('CSV chargé avec succès !');
      } else {
        showNotification('Erreur: Pas assez de données dans le fichier CSV', true);
      }
    });
  }

  function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: ${isError ? '#f44336' : '#4CAF50'};
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 1000000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Fonction améliorée pour détecter le séparateur
  function detectSeparator(data) {
    const firstLine = data.split(/\r\n|\r|\n/)[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    
    console.log('Analyse des séparateurs:', { 
        commaCount, 
        semicolonCount,
        'exemple première ligne': firstLine 
    });
    
    // Tester les deux séparateurs pour voir lequel donne le meilleur résultat
    const commaColumns = firstLine.split(',').length;
    const semicolonColumns = firstLine.split(';').length;
    
    console.log('Nombre de colonnes détectées:', {
        'avec virgules': commaColumns,
        'avec points-virgules': semicolonColumns
    });
    
    return semicolonColumns > commaColumns ? ';' : ',';
  }

  // Fonction modifiée pour parser une ligne CSV
  function parseCSVLine(line) {
    if (!line) return [];
    
    const result = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if ((char === state.separator) && !inQuotes) {
            result.push(cell);
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell);
    
    const cleanedResult = result.map(c => c.trim().replace(/(^"|"$)/g, ''));
    
    // Log pour cette ligne spécifique
    console.log('Parsing ligne:', {
        'Ligne originale': line,
        'Nombre de colonnes': cleanedResult.length,
        'Colonnes': cleanedResult
    });
    
    return cleanedResult;
  }
})(); 
