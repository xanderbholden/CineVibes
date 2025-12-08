/* ============================================================
   ADULTS PAGE LOGIC (13+)
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("adults.js loaded!");

    // Populate dropdowns
    loadGenres("genreSelect");
    loadCompanies("companySelect");
    loadDecades("yearSelect");

    const findBtn = document.getElementById("adultsFindBtn");
    const luckyBtn = document.getElementById("adultsLuckyBtn");

    if (findBtn) {
        findBtn.addEventListener("click", findAdultMovies);
    }

    if (luckyBtn) {
        luckyBtn.addEventListener("click", adultsFeelingLucky);
    }
});

/* ============================================================
   MAIN ADULTS MOVIE SEARCH
============================================================ */
async function findAdultMovies() {
    showLoader("movieResults");

    const genre   = document.getElementById("genreSelect").value;
    const company = document.getElementById("companySelect").value;
    const decade  = document.getElementById("yearSelect").value;

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        "vote_count.gte": "100", // higher quality threshold
    };

    if (genre) {
        params.with_genres = genre;
    }

    if (company) {
        params.with_companies = company;
    }

    if (decade) {
        const [start, end] = decade.split("-");
        params["primary_release_date.gte"] = `${start}-01-01`;
        params["primary_release_date.lte"] = `${end}-12-31`;
    }

    const results = await fetchMoviesRaw(params);
    displayMovieGrid(results.slice(0, 12), "movieResults");
}

/* ============================================================
   FEELING LUCKY (Adults)
============================================================ */
async function adultsFeelingLucky() {
    showLoader("movieResults");

    const randomPage = Math.floor(Math.random() * 40) + 1;

    const params = {
        language: "en-US",
        sort_by: "popularity.desc",
        "vote_count.gte": "100",
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
