fetch('/json/clvlkn.json')
    .then(response => response.json())
    .then(data => {
        const dictionaryList = document.getElementById('dictionary');
        dictionaryList.innerHTML = '';

        for (const entry of data) {
            const listItem = document.createElement('li');
            listItem.innerText = `${entry.word}\n
                Broad Transcription: ${entry.ipa.broad}\n
                Narrow Transcription: ${entry.ipa.narrow}\n
                Root: ${entry.root}, Pattern: ${entry.deriv_cat}\n
                Origin: ${entry.origin}, Class: ${entry.word_class}, Type: ${entry.noun_class}\n
                Definition:\n
                ${entry.meanings[0]}`;
            dictionaryList.appendChild(listItem);
        }

        const searchBar = document.getElementById('search-bar');
        searchBar.addEventListener('input', event => {
            const searchValue = event.target.value;

            const filteredEntries = data.filter(entry => {
                return entry.word.includes(searchValue);
            });

            dictionaryList.innerHTML = '';

            for (const entry of filteredEntries) {
                const listItem = document.createElement('li');
                listItem.innerText = `${entry.word}\n
                                    Broad Transcription: ${entry.ipa.broad}\n
                                    Narrow Transcription: ${entry.ipa.narrow}\n
                                    Root: ${entry.root}, Pattern: ${entry.deriv_cat}\n
                                    Origin: ${entry.origin}, Class: ${entry.word_class}, Type: ${entry.noun_class}\n
                                    Definition:\n
                                    ${entry.meanings[0]}`;

                dictionaryList.appendChild(listItem);
            }
        });
    });