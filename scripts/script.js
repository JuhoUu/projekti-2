// Funktio, joka hakee elokuvien lyhyet kuvaukset
function fetchMovieDescriptions() {
    const eventsUrl = 'https://www.finnkino.fi/xml/Events/';
    return fetch(eventsUrl)
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            const movies = xmlDoc.querySelectorAll('Event');
            const descriptionsMap = new Map();

            movies.forEach(movie => {
                const title = movie.querySelector('Title').textContent;
                const description = movie.querySelector('ShortSynopsis').textContent;
                descriptionsMap.set(title, description);
            });

            return descriptionsMap;
        })
        .catch(error => {
            console.error('Error fetching movie descriptions:', error);
            return new Map(); // Palauta tyhjä Map virhetilanteessa
        });
}

// Funktio, joka hakee valitun teatterin elokuvatiedot ja näyttää ne ryhmiteltynä aakkosjärjestyksessä
function fetchMovies(theaterId, searchString = '') {
    const apiUrl = `https://www.finnkino.fi/xml/Schedule/?area=${theaterId}`;
    fetch(apiUrl)
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            let movies = xmlDoc.querySelectorAll('Show');

            // Suorita hakusanalla suodatus, jos hakukenttä ei ole tyhjä
            if (searchString) {
                const searchRegex = new RegExp(searchString, 'i');
                movies = [...movies].filter(movie => {
                    const title = movie.querySelector('Title').textContent;
                    return searchRegex.test(title);
                });
            }

            // Ryhmitellään elokuvat niiden nimien perusteella
            const movieMap = new Map();
            movies.forEach(movie => {
                const title = movie.querySelector('Title').textContent;
                const start = formatDateTime(movie.querySelector('dttmShowStart').textContent);
                const end = formatDateTime(movie.querySelector('dttmShowEnd').textContent);
                const imageUrl = movie.querySelector('EventSmallImagePortrait').textContent;

                if (!movieMap.has(title)) {
                    movieMap.set(title, []);
                }

                movieMap.get(title).push({ start, end, imageUrl });
            });

            // Järjestetään elokuvat aakkosjärjestykseen
            const sortedMovies = [...movieMap.keys()].sort();

            // Haetaan elokuvien lyhyet kuvaukset
            fetchMovieDescriptions().then(descriptionsMap => {
                const moviesList = document.getElementById('movies-list');
                moviesList.innerHTML = ''; // Tyhjennä lista ennen kuin lisätään uudet elokuvat

                // Näytetään elokuvat ja niiden näytösajat ryhmiteltynä
                sortedMovies.forEach(title => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('movie-item');

                    const movieShowtimes = movieMap.get(title).map(showtime => {
                        return `<p>Start: ${showtime.start} - End: ${showtime.end}</p>`;
                    }).join('');

                    // Näytä lyhyt kuvaus, jos se on saatavilla
                    const description = descriptionsMap.get(title) || 'Description not available';
                    movieDiv.innerHTML = `
                        <h2>${title}</h2>
                        <img src="${movieMap.get(title)[0].imageUrl}" alt="${title} Image">
                        <p>${description}</p>
                        ${movieShowtimes}
                    `;
                    moviesList.appendChild(movieDiv);
                });
            });
        })
        .catch(error => console.error('Error fetching movies:', error));
}

// Funktio, joka muuttaa päivämäärän ja ajan suomalaiseen muotoon
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const hours = (date.getHours() < 10 ? '0' : '') + date.getHours();
    const minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    const formattedTime = `${hours}:${minutes}`;
    return `${formattedDate} ${formattedTime}`;
}

// Funktio, joka hakee teatterien tiedot ja lisää ne alasvetovalikkoon
function fetchTheaters() {
    fetch('https://www.finnkino.fi/xml/TheatreAreas/')
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, 'text/xml');
            const theaters = xmlDoc.querySelectorAll('TheatreArea');

            const theaterSelect = document.getElementById('theater-select');
            theaters.forEach(theater => {
                const option = document.createElement('option');
                option.textContent = theater.querySelector('Name').textContent;
                option.value = theater.querySelector('ID').textContent;
                theaterSelect.appendChild(option);
            });

            // Kuuntele teatterin valinnan muutoksia ja päivitä elokuvat sen perusteella
            theaterSelect.addEventListener('change', event => {
                const selectedTheaterId = event.target.value;
                fetchMovies(selectedTheaterId);
            });

            // Kuuntele hakukentän muutoksia ja päivitä elokuvat sen perusteella
            const searchInput = document.getElementById('search-input');
            searchInput.addEventListener('input', event => {
                const searchString = event.target.value.trim();
                const selectedTheaterId = theaterSelect.value;
                fetchMovies(selectedTheaterId, searchString);
            });

            // Haetaan ensin teatterit ja sen jälkeen päivitetään elokuvat valitusta teatterista
            const selectedTheaterId = theaterSelect.value;
            fetchMovies(selectedTheaterId);
        })
        .catch(error => console.error('Error fetching theaters:', error));
}

// Kutsu fetchTheaters-funktiota, kun sivu on ladattu
window.addEventListener('load', fetchTheaters);
