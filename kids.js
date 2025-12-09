/* ============================================================
   KIDS PAGE — TOP 5 PERSONALIZED ENGINE (SAFE MODE)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("kids.js loaded!");

    // Load dropdown data
    loadGenres("genreSelect");
    loadCompanies("companySelect");

    // Era selector already in kids.html (ageSelect)
    const findBtn = document.getElementById("kidsFindBtn");
    const luckyBtn = document.getElementById("kidsLuckyBtn");

    findBtn.addEventListener("click", findKidsMovies);
    luckyBtn.addEventListener("click", kidsFeelingLucky);
});

/* ============================================================
   MAIN KIDS MOVIE FINDER — TOP 5 BEST MATCHES
============================================================ */
async function findKidsMovies() {
    showLoader("movieResults");

    const mood    = document.getElementById("moodSelect").value;
    const genre   = document.getElementById("genreSelect").value;
    const company = document.getElementById("companySelect").value;
    const era     = document.getElementById("ageSelect").value; // decade range

    const userChoices = { mood, genre, company, decade: era };

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        include_adult: "false",
        "vote_count.gte": "40",
        "certification_country": "US",
        "certification.lte": "PG-13"
    };

    // Apply era filter
    if (userChoices.decade) {
        const [start, end] = userChoices.decade.split("-");
        params["primary_release_date.gte"] = `${start}-01-01`;
        params["primary_release_date.lte"] = `${end}-12-31`;
    }

    // Fetch large movie pool for scoring accuracy
    const pool = await fetchMoviesRaw(params);

    // Score each movie & filter unsafe content
    const scored = pool
        .map(movie => ({
            movie,
            score: calculateMatchScore(movie, userChoices, true) // kid mode
        }))
        .filter(obj => obj.score > 0);

    if (scored.length === 0) {
        document.getElementById("movieResults").innerHTML =
            "<p>No suitable matches found. Try different settings!</p>";
        return;
    }

    // Sort by score DESC
    const topFive = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    // Display results
    buildTopFiveGrid(topFive, "movieResults", userChoices, true);
}

/* ============================================================
   KIDS FEELING LUCKY — PICKS 1 RANDOM SAFE MOVIE
============================================================ */
async function kidsFeelingLucky() {
    showLoader("movieResults");

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        include_adult: "false",
        "vote_count.gte": "40",
        "certification_country": "US",
        "certification.lte": "PG-13"
    };

    const pool = await fetchMoviesRaw(params);

    // Filter unsafe movies
    const safePool = pool.filter(m =>
        calculateMatchScore(m, {}, true) > 0
    );

    const pick = safePool[Math.floor(Math.random() * safePool.length)];

    const display = [{
        movie: pick,
        score: 100
    }];

    buildTopFiveGrid(display, "movieResults", {}, true);
}
