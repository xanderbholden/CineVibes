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
   DISPLAY — TOP 5 MOVIES (FULL DESCRIPTION + WHY MESSAGE)
============================================================ */
async function displayTopFiveMovies(movies) {
    const container = document.getElementById("perfectResults");
    container.innerHTML = "";

    for (let i = 0; i < movies.length; i++) {
        const m = movies[i];

        // Fetch complete details
        const details = await fetch(`${BASE_URL}/movie/${m.id}?api_key=${API_KEY}&language=en-US`)
            .then(r => r.json());

        const card = document.createElement("div");
        card.className = i === 0 ? "featured-movie" : "top-pick-card";

        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w500${m.poster_path}" alt="${m.title}" class="movie-poster">

            <div class="movie-info">
                <h2>${m.title}</h2>
                <p class="tagline">${details.tagline || ""}</p>

                <p><strong>Rating:</strong> ${m.vote_average}/10</p>
                <p><strong>Release:</strong> ${m.release_date}</p>
                <p><strong>Runtime:</strong> ${details.runtime || "?"} min</p>

                <p class="overview">${details.overview}</p>

                <div class="why-box">
                    <strong>Why this movie?</strong>
                    <p>${m._why}</p>
                </div>
            </div>
        `;

        container.appendChild(card);
    }
}
