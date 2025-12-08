/* ============================================================
   GLOBAL TMDB CONFIG
============================================================ */
const API_KEY = "b0cf86c33b5cf40aebd94b3ce2728dbb";
const BASE_URL = "https://api.themoviedb.org/3";

/* ============================================================
   PAGE NAVIGATION (Smooth Fade)
============================================================ */
function fadeNavigate(page) {
    document.body.classList.add("fade-out");
    setTimeout(() => {
        window.location.href = page;
    }, 400);
}

document.addEventListener("DOMContentLoaded", () => {
    const goBack = document.getElementById("goBackButton");
    if (goBack) {
        goBack.addEventListener("click", () => fadeNavigate("index.html"));
    }
});

/* ============================================================
   LOADER
============================================================ */
function showLoader(targetId) {
    const container = document.getElementById(targetId);
    container.innerHTML = `
        <div class="loader">
            <div></div><div></div><div></div>
        </div>
        <p>Loading movies...</p>
    `;
}

/* ============================================================
   SHARED: Populate Dropdowns
============================================================ */

/* GENRES */
async function loadGenres(selectId) {
    try {
        const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en`);
        const data = await res.json();

        const select = document.getElementById(selectId);
        if (!select) return;

        data.genres.forEach(g => {
            const opt = document.createElement("option");
            opt.value = g.id;
            opt.textContent = g.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Genre fetch failed:", err);
    }
}

/* PRODUCTION COMPANIES (Preselected for Quality) */
async function loadCompanies(selectId) {
    const companies = [420, 25, 33, 5, 174, 2, 19551, 9993, 122, 34];

    const select = document.getElementById(selectId);
    if (!select) return;

    for (let id of companies) {
        try {
            const res = await fetch(`${BASE_URL}/company/${id}?api_key=${API_KEY}`);
            const data = await res.json();

            const opt = document.createElement("option");
            opt.value = data.id;
            opt.textContent = data.name;
            select.appendChild(opt);
        } catch (err) {
            console.warn("Company fetch failed:", err);
        }
    }
}

/* DECADES / ERAS */
function loadDecades(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    for (let year = 1920; year <= 2020; year += 10) {
        const opt = document.createElement("option");
        opt.value = `${year}-${year + 9}`;
        opt.textContent = `${year}s`;
        select.appendChild(opt);
    }
}

/* ============================================================
   FETCH RAW MOVIES (For all pages)
============================================================ */
async function fetchMoviesRaw(params) {
    const url = new URL(`${BASE_URL}/discover/movie`);
    url.searchParams.append("api_key", API_KEY);

    Object.entries(params).forEach(([key, val]) => {
        if (val !== "" && val !== null && val !== undefined) {
            url.searchParams.append(key, val);
        }
    });

    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.results || [];
    } catch (err) {
        console.error("Movie fetch failed:", err);
        return [];
    }
}

/* ============================================================
   DISPLAY MOVIES (Kids & Adults)
============================================================ */
function displayMovieGrid(movies, targetId = "movieResults") {
    const container = document.getElementById(targetId);

    if (!movies || movies.length === 0) {
        container.innerHTML = `<p>No movies found. Try different settings.</p>`;
        return;
    }

    container.innerHTML = "";

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";

        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
            <h3>${movie.title}</h3>
            <p>⭐ ${movie.vote_average}</p>
            <p>${movie.release_date}</p>
        `;

        container.appendChild(card);
    });
}

/* ============================================================
   DISPLAY TOP 5 (Featured + Grid)
============================================================ */
function displayTopFiveMovies(results) {
    const container = document.getElementById("perfectResults");

    if (!results || results.length === 0) {
        container.innerHTML = `<p>No matches found.</p>`;
        return;
    }

    const [featured, ...others] = results;

    container.innerHTML = `
        <div class="featured-movie">
            <img src="https://image.tmdb.org/t/p/w500${featured.poster_path}" alt="${featured.title}">
            <h2 class="featured-title">⭐ Top Pick: ${featured.title}</h2>
            <p>${featured.overview}</p>
            <p><strong>Rating:</strong> ${featured.vote_average} / 10</p>
            <p><strong>Release:</strong> ${featured.release_date}</p>
        </div>

        <div class="top-picks-grid"></div>
    `;

    const grid = container.querySelector(".top-picks-grid");

    others.forEach(movie => {
        const card = document.createElement("div");
        card.className = "top-pick-card";

        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
            <h3>${movie.title}</h3>
            <p>⭐ ${movie.vote_average}</p>
        `;

        grid.appendChild(card);
    });
}

/* ============================================================
   CLEAR RESULTS
============================================================ */
function clearResults() {
    const results = document.getElementById("movieResults");
    const perfect = document.getElementById("perfectResults");

    if (results) results.innerHTML = "";
    if (perfect) perfect.innerHTML = "";
}
