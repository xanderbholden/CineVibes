/* ============================================================
   CINEVIBES — UNIVERSAL UTILS (FINAL & STABLE)
   Works for:
   ✔ Kids page
   ✔ Adults page
   ✔ Perfect Match page
============================================================ */

const API_KEY = "b0cf86c33b5cf40aebd94b3ce2728dbb";
const BASE_URL = "https://api.themoviedb.org/3";

/* ------------------------------------------------------------
   PAGE NAVIGATION
------------------------------------------------------------- */
function fadeNavigate(page) {
    document.body.classList.add("fade-out");
    setTimeout(() => (window.location.href = page), 300);
}

document.addEventListener("DOMContentLoaded", () => {
    const back = document.getElementById("goBackButton");
    if (back) back.addEventListener("click", () => fadeNavigate("index.html"));
});

/* ------------------------------------------------------------
   LOADER
------------------------------------------------------------- */
function showLoader(targetId) {
    document.getElementById(targetId).innerHTML = `
        <div class="loader"></div>
        <p>Finding your best movie matches...</p>
    `;
}

/* ------------------------------------------------------------
   TMDB DISCOVER FETCH WRAPPER
------------------------------------------------------------- */
async function fetchMoviesRaw(params) {
    const url = new URL(`${BASE_URL}/discover/movie`);
    url.searchParams.append("api_key", API_KEY);

    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }

    try {
        const res = await fetch(url);
        const json = await res.json();
        return json.results || [];
    } catch (err) {
        console.error("TMDB Fetch Error:", err);
        return [];
    }
}

/* ------------------------------------------------------------
   GENRE LOADER
------------------------------------------------------------- */
async function loadGenres(selectId) {
    try {
        const r = await fetch(
            `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en`
        );
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

/* ------------------------------------------------------------
   STUDIO LOADER
------------------------------------------------------------- */
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
        } catch {
            // ignore failing companies
        }
    }
}

/* ------------------------------------------------------------
   DECADE LOADER — REQUIRED FOR ADULTS PAGE
------------------------------------------------------------- */
function loadDecades(selectId) {
    const decades = [
        ["1950-1959", "1950–1959"],
        ["1960-1969", "1960–1969"],
        ["1970-1979", "1970–1979"],
        ["1980-1989", "1980–1989"],
        ["1990-1999", "1990–1999"],
        ["2000-2009", "2000–2009"],
        ["2010-2019", "2010–2019"],
        ["2020-2025", "2020–2025"]
    ];

    const sel = document.getElementById(selectId);
    sel.innerHTML = `<option value="">Any Era</option>`;

    decades.forEach(([range, label]) => {
        const opt = document.createElement("option");
        opt.value = range;
        opt.textContent = label;
        sel.appendChild(opt);
    });
}

/* ------------------------------------------------------------
   MATCH SCORE — KIDS + ADULTS ONLY
------------------------------------------------------------- */
function calculateMatchScore(movie, userChoices = {}, isKidMode = false) {
    let score = 0;

    const { mood, genre, company, decade } = userChoices;

    // Genre match
    if (genre && movie.genre_ids.includes(parseInt(genre))) {
        score += 25;
    }

    // Studio match
    if (company && String(movie.production_companies?.[0]?.id) === String(company)) {
        score += 10;
    }

    // Decade match
    if (decade) {
        const [start, end] = decade.split("-");
        const year = parseInt(movie.release_date?.slice(0, 4) || 0);
        if (year >= start && year <= end) {
            score += 10;
        }
    }

    // Base popularity/rating
    score += Math.min(movie.vote_average * 1.2, 10);

    // Mood influence
    if (mood) score += 20;

    // Kids Mode filters
    if (isKidMode) {
        const forbidden = [27, 53, 80, 18]; // Horror, Thriller, Crime, Heavy Drama  
        if (movie.adult) return 0;
        if (movie.genre_ids.some(g => forbidden.includes(g))) return 0;
    }

    return score;
}

/* ------------------------------------------------------------
   TOP 5 GRID (Kids + Adults)
------------------------------------------------------------- */
function buildTopFiveGrid(items, targetId) {
    const container = document.getElementById(targetId);
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "movie-grid";

    items.forEach(obj => {
        const movie = obj.movie;
        const score = obj.score;

        const card = document.createElement("div");
        card.className = "movie-card";

        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" class="poster">
            <h3>${movie.title}</h3>
            <p>⭐ ${movie.vote_average}</p>
            <p class="why">
                Match Score: <strong>${Math.round(score)}%</strong>
            </p>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/* ------------------------------------------------------------
   CLEAR RESULTS (Used by all pages)
------------------------------------------------------------- */
function clearResults() {
    const targets = [
        document.getElementById("movieResults"),
        document.getElementById("perfectResults")
    ];

    targets.forEach(el => {
        if (el) el.innerHTML = "";
    });
}
