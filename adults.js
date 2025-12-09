/* ============================================================
   ADULTS PAGE — TOP 5 ADVANCED PERSONALIZED ENGINE
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("adults.js loaded!");

    loadGenres("genreSelect");
    loadCompanies("companySelect");
    loadDecades("yearSelect");

    const findBtn  = document.getElementById("adultsFindBtn");
    const luckyBtn = document.getElementById("adultsLuckyBtn");

    findBtn.addEventListener("click", findAdultMovies);
    luckyBtn.addEventListener("click", adultsFeelingLucky);
});

/* ============================================================
   MAIN ADULT MOVIE FINDER — TOP 5 BEST MATCHES
============================================================ */
async function findAdultMovies() {
    showLoader("movieResults");

    const mood    = document.getElementById("moodSelect").value;
    const genre   = document.getElementById("genreSelect").value;
    const company = document.getElementById("companySelect").value;
    const decade  = document.getElementById("yearSelect").value;

    const userChoices = { mood, genre, company, decade };

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        include_adult: "true",
        "vote_count.gte": "80",
        "certification_country": "US",
        "certification.gte": "PG-13"
    };

    // Apply decade filter
    if (decade) {
        const [start, end] = decade.split("-");
        params["primary_release_date.gte"] = `${start}-01-01`;
        params["primary_release_date.lte"] = `${end}-12-31`;
    }

    // Fetch a large pool for scoring accuracy
    const pool = await fetchMoviesRaw(params);

    // Score and sort movies
    const scored = pool.map(movie => ({
        movie,
        score: calculateMatchScore(movie, userChoices, false) // ADULT mode
    }));

    // Remove movies with no match strength at all
    const filtered = scored.filter(obj => obj.score > 0);

    if (filtered.length === 0) {
        document.getElementById("movieResults").innerHTML =
            "<p>No strong matches found. Try adjusting your settings!</p>";
        return;
    }

    // Sort highest score → lowest
    const topFive = filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    // Display results in the Top-5 grid
    buildTopFiveGrid(topFive, "movieResults", userChoices, false);
}

/* ============================================================
   FEELING LUCKY — RANDOM ADULT MATCH
============================================================ */
async function adultsFeelingLucky() {
    showLoader("movieResults");

    const randomPage = Math.floor(Math.random() * 20) + 1;

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        include_adult: "true",
        page: randomPage.toString(),
        "vote_count.gte": "50",
        "certification_country": "US",
        "certification.gte": "PG-13"
    };

    const pool = await fetchMoviesRaw(params);

    if (!pool || pool.length === 0) {
        document.getElementById("movieResults").innerHTML =
            "<p>Couldn't find anything at the moment — try again!</p>";
        return;
    }

    // Pick something randomly
    const pick = pool[Math.floor(Math.random() * pool.length)];

    const display = [{
        movie: pick,
        score: 100
    }];

    buildTopFiveGrid(display, "movieResults", {}, false);
}
