/* ============================================================
   PERFECT MATCH — PREMIUM TOP 5 ENGINE (ADULT MODE ONLY)
============================================================ */

console.log("best.js loaded — Premium Perfect Match Engine v1.0");

document.addEventListener("DOMContentLoaded", () => {
    loadGenres("genreSelect");
    loadCompanies("companySelect");
    loadDecades("yearSelect");

    const btn = document.getElementById("perfectFindBtn");
    btn.addEventListener("click", runPerfectMatch);
});

/* ============================================================
   MAIN PERFECT MATCH ENGINE
============================================================ */
async function runPerfectMatch() {
    showLoader("perfectResults");

    const mood     = document.getElementById("moodSelect").value;
    const genre    = document.getElementById("genreSelect").value;
    const company  = document.getElementById("companySelect").value;
    const decade   = document.getElementById("yearSelect").value;
    const actor    = document.getElementById("actorInput").value.trim();
    const trending = document.getElementById("trendingToggle").value;

    const userChoices = { mood, genre, company, decade };

    let params = {
        language: "en-US",
        include_adult: "true",
        sort_by: "popularity.desc",
        "vote_count.gte": "80"
    };

    if (decade) {
        const [start, end] = decade.split("-");
        params["primary_release_date.gte"] = `${start}-01-01`;
        params["primary_release_date.lte"] = `${end}-12-31`;
    }

    // Fetch raw pool
    let pool = await fetchMoviesRaw(params);

    /* ========================================================
       ADD: ACTOR AFFINITY BOOST
    ======================================================== */
    let actorSet = new Set();

    if (actor) {
        try {
            const actorSearch = await fetch(`${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(actor)}`);
            const data = await actorSearch.json();
            if (data.results?.length) {
                const actorId = data.results[0].id;

                const credits = await fetch(`${BASE_URL}/person/${actorId}/movie_credits?api_key=${API_KEY}`);
                const cjson = await credits.json();

                actorSet = new Set(cjson.cast.map(m => m.id));
            }
        } catch (err) {
            console.warn("Actor lookup failed:", err);
        }
    }

    /* ========================================================
       SCORE EACH MOVIE USING GLOBAL ENGINE
    ======================================================== */
    const scored = pool.map(movie => {
        let score = calculateMatchScore(movie, userChoices, false);

        // Actor affinity bonus
        if (actorSet.has(movie.id)) {
            score += 30;
        }

        // Trending bonus
        if (trending === "yes") {
            score += Math.min(movie.popularity * 0.05, 20);
        }

        return { movie, score };
    });

    /* ========================================================
       CLEAN + SORT + PICK TOP 5
    ======================================================== */
    const filtered = scored.filter(obj => obj.score > 0);

    if (filtered.length === 0) {
        document.getElementById("perfectResults").innerHTML =
            "<p>No strong matches found. Try adjusting your preferences.</p>";
        return;
    }

    const topFive = filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    /* ========================================================
       DISPLAY TOP 5
    ======================================================== */
    buildTopFiveGrid(topFive, "perfectResults", userChoices, false);
}
