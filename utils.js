/* ============================================================
   GLOBAL TMDB CONFIG
============================================================ */
const API_KEY = "b0cf86c33b5cf40aebd94b3ce2728dbb";
const BASE_URL = "https://api.themoviedb.org/3";

/* ============================================================
   PAGE NAVIGATION
============================================================ */
function fadeNavigate(page) {
    document.body.classList.add("fade-out");
    setTimeout(() => (window.location.href = page), 300);
}

document.addEventListener("DOMContentLoaded", () => {
    const back = document.getElementById("goBackButton");
    if (back) back.addEventListener("click", () => fadeNavigate("index.html"));
});

/* ============================================================
   LOADER
============================================================ */
function showLoader(targetId) {
    document.getElementById(targetId).innerHTML = `
        <div class="loader"></div>
        <p>Finding your perfect movies...</p>
    `;
}

/* ============================================================
   GENRE & COMPANY LOADERS
============================================================ */
async function loadGenres(selectId) {
    try {
        const r = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en`);
        const d = await r.json();
        const sel = document.getElementById(selectId);
        d.genres.forEach(g => {
            const opt = document.createElement("option");
            opt.value = g.id;
            opt.textContent = g.name;
            sel.appendChild(opt);
        });
    } catch (err) {
        console.error("Genre load failed:", err);
    }
}

async function loadCompanies(selectId) {
    const studios = [420, 25, 33, 5, 174, 2, 19551, 9993];
    const sel = document.getElementById(selectId);
    for (let id of studios) {
        try {
            const r = await fetch(`${BASE_URL}/company/${id}?api_key=${API_KEY}`);
            const d = await r.json();
            const opt = document.createElement("option");
            opt.value = d.id;
            opt.textContent = d.name;
            sel.appendChild(opt);
        } catch { }
    }
}

/* ============================================================
   LOAD MOVIE DECADES / ERAS (ADULT PAGE)
============================================================ */
function loadDecades(selectId) {
    const sel = document.getElementById(selectId);

    const decades = [
        "1950-1959",
        "1960-1969",
        "1970-1979",
        "1980-1989",
        "1990-1999",
        "2000-2009",
        "2010-2019",
        "2020-2025"
    ];

    decades.forEach(range => {
        const opt = document.createElement("option");
        opt.value = range;
        opt.textContent = range.replace("-", " to ");
        sel.appendChild(opt);
    });
}

/* ============================================================
   OPTIONAL — KID-SAFE RESULT FILTERING
   (Used only by Kids Mode if needed)
============================================================ */
function filterForKids(results) {
    return results.filter(movie =>
        movie.adult === false &&
        movie.vote_average > 0 &&
        movie.genre_ids && movie.genre_ids.length > 0
    );
}

/* ============================================================
   UNIVERSAL MOVIE FETCHER
============================================================ */
async function fetchMoviesRaw(params) {
    try {
        const query = new URLSearchParams({ api_key: API_KEY, ...params });
        const response = await fetch(`${BASE_URL}/discover/movie?${query}`);
        const data = await response.json();
        return data.results || [];
    } catch (err) {
        console.error("Movie fetch failed:", err);
        return [];
    }
}

/* ============================================================
   DISPLAY MOVIE GRID (Kids + Adults)
============================================================ */
function displayMovieGrid(movies, targetId) {
    const container = document.getElementById(targetId);
    container.innerHTML = "";

    if (!movies || movies.length === 0) {
        container.innerHTML = "<p>No movies found. Try new filters!</p>";
        return;
    }

    const grid = document.createElement("div");
    grid.className = "movie-grid";

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";

        const poster = movie.poster_path
            ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
            : "images/placeholder.png";

        card.innerHTML = `
            <img src="${poster}" alt="${movie.title}" class="movie-poster">
            <h3>${movie.title}</h3>
            <p>⭐ ${movie.vote_average}</p>
            <p>${movie.release_date || "Unknown Year"}</p>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/* ============================================================
   DISPLAY — TOP 5 MOVIES (Perfect Match)
============================================================ */
async function displayTopFiveMovies(movies) {
    const container = document.getElementById("perfectResults");
    container.innerHTML = "";

    for (let i = 0; i < movies.length; i++) {
        const m = movies[i];

        const details = await fetch(`${BASE_URL}/movie/${m.id}?api_key=${API_KEY}&language=en-US`)
            .then(r => r.json());

        const card = document.createElement("div");
        card.className = i === 0 ? "featured-movie" : "top-pick-card";

        const poster = m.poster_path
            ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
            : "images/placeholder.png";

        card.innerHTML = `
            <img src="${poster}" alt="${m.title}" class="movie-poster">

            <div class="movie-info">
                <h2>${m.title}</h2>
                <p class="tagline">${details.tagline || ""}</p>

                <p><strong>Rating:</strong> ${m.vote_average}/10</p>
                <p><strong>Release:</strong> ${m.release_date}</p>
                <p><strong>Runtime:</strong> ${details.runtime || "?"} min</p>

                <p class="overview">${details.overview}</p>

                ${m._why ? `
                <div class="why-box">
                    <strong>Why this movie?</strong>
                    <p>${m._why}</p>
                </div>` : ""}
            </div>
        `;

        container.appendChild(card);
    }
}
