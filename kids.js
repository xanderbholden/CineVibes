/* ============================================================
   KIDS PAGE LOGIC (0–12)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("kids.js loaded!");

    // Populate dropdowns
    loadGenres("genreSelect");
    loadCompanies("companySelect");

    const findBtn = document.getElementById("kidsFindBtn");
    const luckyBtn = document.getElementById("kidsLuckyBtn");

    if (findBtn) {
        findBtn.addEventListener("click", findKidsMovies);
    }

    if (luckyBtn) {
        luckyBtn.addEventListener("click", kidsFeelingLucky);
    }
});

/* ============================================================
   MAIN KIDS SEARCH
============================================================ */
async function findKidsMovies() {
    showLoader("movieResults");

    const genre   = document.getElementById("genreSelect").value;
    const company = document.getElementById("companySelect").value;
    const ageBand = document.getElementById("ageSelect").value;

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        "vote_count.gte": "50",
        "certification_country": "US",
        "certification.lte": "PG-13"
    };

    if (genre) {
        params.with_genres = genre;
    }

    if (company) {
        params.with_companies = company;
    }

    if (ageBand) {
        const [startYear, endYear] = ageBand.split("-");
        params["primary_release_date.gte"] = `${startYear}-01-01`;
        params["primary_release_date.lte"] = `${endYear}-12-31`;
    }

    const results = await fetchMoviesRaw(params);

    displayMovieGrid(results.slice(0, 12), "movieResults");
}

/* ============================================================
   FEELING LUCKY (Kids)
============================================================ */
async function kidsFeelingLucky() {
    showLoader("movieResults");

    const randomPage = Math.floor(Math.random() * 20) + 1;

    const params = {
        language: "en-US",
        sort_by: "popularity.desc",
        "vote_count.gte": "50",
        "certification_country": "US",
        "certification.lte": "PG-13",
        page: randomPage.toString()
    };

    const results = await fetchMoviesRaw(params);

    if (!results || results.length === 0) {
        displayMovieGrid([], "movieResults");
        return;
    }

    const randomIndex = Math.floor(Math.random() * results.length);
    const pick = results[randomIndex];

    displayMovieGrid([pick], "movieResults");
}
