/* ============================================================
   CINEVIBES — CUSTOM RECOMMENDATION ENGINE (UTILS)
   Advanced Mood Logic + Match Scoring + Explanations
============================================================ */

const API_KEY = "b0cf86c33b5cf40aebd94b3ce2728dbb";
const BASE_URL = "https://api.themoviedb.org/3";

/* ------------------------------------------------------------
   PAGE NAVIGATION (Unchanged)
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

/* ============================================================
   TMDB FETCH WRAPPER — Returns a full movie pool
============================================================ */
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

/* ============================================================
   GENRE & COMPANY LOADING
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

    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">Any Era</option>`;

    decades.forEach(([range, label]) => {
        const opt = document.createElement("option");
        opt.value = range;
        opt.textContent = label;
        select.appendChild(opt);
    });
}

/* ============================================================
   MOOD → GENRE / KEYWORD / INTENSITY MAPS
============================================================ */

const MoodProfiles = {
    happy: {
        genres: [35, 16],                // Comedy, Animation
        keywords: [521, 9702],           // funny, feel good
        energy: 0.3,                     // lower intensity
        darkness: 0.1
    },
    adventure: {
        genres: [12, 28, 14],            // Adventure, Action, Fantasy
        keywords: [9715, 180547],        // heroic adventure, big action
        energy: 0.9,
        darkness: 0.4
    },
    calm: {
        genres: [10749, 18],             // Romance, Drama
        keywords: [1583, 12377],         // feel-good, peaceful
        energy: 0.2,
        darkness: 0.1
    },
    excited: {
        genres: [28, 53, 878],           // Action, Thriller, Sci-fi
        keywords: [430, 561],            // fast pace, intense
        energy: 1.0,
        darkness: 0.7
    },
    fantasy: {
        genres: [14, 16],                // Fantasy, Animation
        keywords: [156395, 1584],        // magical, imaginative
        energy: 0.6,
        darkness: 0.2
    },
    animals: {
        genres: [16, 10751],             // Animation, Family
        keywords: [310, 971],            // animals, friendship
        energy: 0.4,
        darkness: 0.0
    },
    family: {
        genres: [10751, 35, 16],         // Family, Comedy, Animation
        keywords: [9712, 176982],        // heartwarming, family-focused
        energy: 0.5,
        darkness: 0.0
    },
    surprise: {
        genres: [],
        keywords: [],
        energy: 0.5,
        darkness: 0.3
    }
};

/* ============================================================
   MATCH SCORE CALCULATOR
============================================================ */
function calculateMatchScore(movie, userChoices, isKidMode = false) {
    let score = 0;

    const { mood, genre, company, decade } = userChoices;
    const moodProfile = MoodProfiles[mood] || null;

    /* ------------------------------
       GENRE MATCH (25%)
    ------------------------------ */
    if (genre) {
        if (movie.genre_ids.includes(parseInt(genre))) {
            score += 25;
        }
    }

    /* ------------------------------
       STUDIO MATCH (10%)
    ------------------------------ */
    if (company) {
        if (String(movie.production_companies?.[0]?.id) === String(company)) {
            score += 10;
        }
    }

    /* ------------------------------
       DECADE MATCH (10%)
    ------------------------------ */
    if (decade) {
        const [start, end] = decade.split("-");
        const year = parseInt(movie.release_date?.substring(0, 4) || 0);

        if (year >= start && year <= end) {
            score += 10;
        }
    }

    /* ------------------------------
       POPULARITY + RATING (10%)
    ------------------------------ */
    score += Math.min(movie.vote_average * 1.2, 10);

    /* ------------------------------
       MOOD MATCH (40%)
    ------------------------------ */
    if (moodProfile) {
        // Genre influence
        const genreMatch = movie.genre_ids.some(g => moodProfile.genres.includes(g));
        if (genreMatch) score += 20;

        // Energy / pacing influence
        score += moodProfile.energy * 10;

        // Darkness / tone influence
        const isDarkGenre = movie.genre_ids.includes(27) || movie.genre_ids.includes(53);

        if (isDarkGenre) {
            score += moodProfile.darkness * 10;
        }
    }

    /* ------------------------------
       KID MODE SAFETY FILTERS
    ------------------------------ */
    if (isKidMode) {
        const forbiddenGenres = [27, 53, 80, 18]; // horror, thriller, crime, heavy drama
        if (movie.genre_ids.some(g => forbiddenGenres.includes(g))) {
            return 0; // auto-remove
        }
        if (movie.adult) {
            return 0;
        }
    }

    return score;
}

/* ============================================================
   MATCH EXPLANATION (Fun + Detailed)
============================================================ */
function explainMatch(movie, userChoices, score) {
    const { mood, genre, decade } = userChoices;
    const moodText = mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : "your selected";
  
    return `
        <strong>Why this movie?</strong><br>
        ${moodText} mood detected! This movie lines up with your picks through strong energy,
        genre alignment, and great fan reception — landing a match score of
        <strong>${Math.round(score)}%</strong> for what you're craving right now.
    `;
}

/* ============================================================
   BUILD TOP 5 GRID (UI)
============================================================ */
function buildTopFiveGrid(movies, targetId, userChoices, isKidMode = false) {
    const container = document.getElementById(targetId);
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "movie-grid";

    movies.forEach(obj => {
        const movie = obj.movie;
        const score = obj.score;

        const card = document.createElement("div");
        card.className = "movie-card";

        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" class="poster">
            <h3>${movie.title}</h3>
            <p>⭐ ${movie.vote_average} / 10</p>
            <p class="why">${explainMatch(movie, userChoices, score)}</p>
        `;

        grid.appendChild(card);
    });

    container.appendChild(grid);
}
