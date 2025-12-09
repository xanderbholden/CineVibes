/* ============================================================
   ADULTS PAGE LOGIC (13+)
============================================================ */

// Make functions available globally
window.findAdultMovies = findAdultMovies;
window.adultsFeelingLucky = adultsFeelingLucky;
window.clearResults = clearResults;

document.addEventListener("DOMContentLoaded", () => {
    console.log("adults.js LOADED");

    // Load dropdown data
    loadGenres("genreSelect");
    loadCompanies("companySelect");
    loadDecades("yearSelect");

    // Buttons
    const findBtn = document.getElementById("adultsFindBtn");
    const luckyBtn = document.getElementById("adultsLuckyBtn");

    findBtn.addEventListener("click", () => {
        console.log("FindAdultMovies CLICKED");
        findAdultMovies();
    });

    luckyBtn.addEventListener("click", () => {
        console.log("AdultsFeelingLucky CLICKED");
        adultsFeelingLucky();
    });
});

/* ============================================================
   FIND ADULT MOVIES
============================================================ */
async function findAdultMovies() {
    showLoader("movieResults");

    const mood     = document.getElementById("moodSelect").value;
    const genre    = document.getElementById("genreSelect").value;
    const company  = document.getElementById("companySelect").value;
    const decade   = document.getElementById("yearSelect").value;

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        include_adult: "true",
        "vote_count.gte": "100",
        "certification_country": "US",
        "certification.gte": "PG-13" 
    };

    if (genre) params.with_genres = genre;
    if (company) params.with_companies = company;

    if (decade) {
        const [start, end] = decade.split("-");
        params["primary_release_date.gte"] = `${start}-01-01`;
        params["primary_release_date.lte"] = `${end}-12-31`;
    }

    // Mood boosting logic (optional simple weighting)
    if (mood && mood !== "") {
        params.with_keywords = getMoodKeywords(mood);
    }

    const results = await fetchMoviesRaw(params);

    displayMovieGrid(results.slice(0, 12), "movieResults");
}

/* ============================================================
   FEELING LUCKY (Adult Version)
============================================================ */
async function adultsFeelingLucky() {
    showLoader("movieResults");

    const randomPage = Math.floor(Math.random() * 30) + 1;

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        page: randomPage.toString(),
        include_adult: "true",
        "certification_country": "US",
        "certification.gte": "PG-13",
        "vote_count.gte": "50"
    };

    const results = await fetchMoviesRaw(params);

    if (!results || results.length === 0) {
        displayMovieGrid([], "movieResults");
        return;
    }

    const pick = results[Math.floor(Math.random() * results.length)];

    displayMovieGrid([pick], "movieResults");
}

/* ============================================================
   CLEAR RESULTS
============================================================ */
function clearResults() {
    document.getElementById("movieResults").innerHTML = "";
}

/* ============================================================
   MOOD → KEYWORD MAPPING (TMDB keyword IDs)
============================================================ */
function getMoodKeywords(mood) {
    const map = {
        happy: "1721, 15060",
        adventure: "999, 9663",
        calm: "1583, 12377",
        excited: "430, 561",
        thriller: "180547, 9715",
        romantic: "1253, 14531",
        dark: "180547, 9882",
        surprise: "" // TMDB will randomize
    };

    return map[mood] || "";
}
