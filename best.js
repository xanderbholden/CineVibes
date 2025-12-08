/* ============================================================
   PERFECT MOVIE ENGINE — TOP 5 PICKS
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("best.js loaded!");

    loadGenres("genreSelect");

    const findBtn = document.getElementById("perfectFindBtn");
    if (findBtn) {
        findBtn.addEventListener("click", findPerfectMovie);
    }
});

/* ============================================================
   MOOD → GENRE MAP (Option 2 — Expanded Moods)
============================================================ */
const moodGenreMap = {
    happy:        [35, 16, 10751, 10402],           // Comedy, Animation, Family, Music
    excited:      [28, 12, 878],                    // Action, Adventure, Sci-Fi
    romantic:     [10749],                          // Romance
    scary:        [27, 53],                         // Horror, Thriller
    funny:        [35],                             // Comedy
    sad:          [18],                             // Drama
    mysterious:   [9648, 53],                       // Mystery, Thriller
    chill:        [10749, 35, 18],                   // Feel-good: Romance, Comedy, Drama
    adventure:    [12, 14, 878],                     // Adventure, Fantasy, Sci-Fi
    thrilling:    [53, 28],                          // Thriller, Action
    family:       [10751, 16],                       // Family, Animation
    smart:        [18, 9648, 36],                    // Drama, Mystery, History
    dark:         [80, 18, 27],                      // Crime, Drama, Horror
    comfort:      [35, 10751, 10749],                // Comedy, Family, Romance
    epic:         [14, 12, 28],                      // Fantasy, Adventure, Action
    true:         [36, 99, 18]                       // History, Documentary, Drama
};

/* ============================================================
   ACTOR SEARCH (Option A — major roles only)
============================================================ */

// Search actor by name → return TMDB actor ID
async function getActorId(name) {
    if (!name.trim()) return null;

    const r = await fetch(
        `${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`
    );
    const d = await r.json();

    if (!d.results || d.results.length === 0) return null;

    // Choose most popular match
    d.results.sort((a, b) => b.popularity - a.popularity);

    return d.results[0].id;
}

// Get movies where the actor is in TOP 5 billing only
async function getActorMajorMovies(actorId) {
    const r = await fetch(
        `${BASE_URL}/person/${actorId}/movie_credits?api_key=${API_KEY}`
    );
    const d = await r.json();
    if (!d.cast) return [];

    return d.cast.filter(c => c.order <= 5); // major roles only
}

/* ============================================================
   SCORING HELPERS
============================================================ */

// Mood scoring
function scoreMood(movie, mood) {
    if (!mood || !moodGenreMap[mood]) return 0;

    let score = 0;

    const genres = moodGenreMap[mood];
    movie.genre_ids.forEach(g => {
        if (genres.includes(g)) score += 20;
    });

    return score;
}

// Runtime scoring
function scoreRuntime(movie, pref) {
    if (!pref || !movie.runtime) return 0;

    if (pref === "short"  && movie.runtime < 90) return 15;
    if (pref === "medium" && movie.runtime >= 90 && movie.runtime <= 120) return 15;
    if (pref === "long"   && movie.runtime > 120) return 15;

    return 0;
}

// Era scoring
function scoreEra(movie, era) {
    if (!era) return 0;

    const year = parseInt(movie.release_date?.split("-")[0] || 0);

    if (era === "classic" && year < 1980) return 15;
    if (era === "older"   && year >= 1980 && year <= 1999) return 15;
    if (era === "modern"  && year >= 2000 && year <= 2015) return 15;
    if (era === "recent"  && year >= 2016) return 15;

    return 0;
}

// Trending scoring
function scoreTrending(movie, pref) {
    if (pref !== "yes") return 0;
    return movie.popularity > 200 ? 20 : 5;
}

/* ============================================================
   MAIN MOVIE SEARCH
============================================================ */
async function findPerfectMovie() {
    showLoader("perfectResults");

    const mood     = document.getElementById("moodSelect").value;
    const genre    = document.getElementById("genreSelect").value;
    const actor    = document.getElementById("actorInput").value.trim();
    const runtime  = document.getElementById("runtimeSelect").value;
    const era      = document.getElementById("eraSelect").value;
    const trending = document.getElementById("trendingToggle").value;

    let params = {
        language: "en-US",
        sort_by: "popularity.desc",
        "vote_count.gte": "150"
    };

    if (genre) params.with_genres = genre;

    // fetch raw movies list
    let movies = await fetchMoviesRaw(params);

    // fetch runtime details (TMDB requires separate fetch)
    for (let m of movies) {
        const r = await fetch(`${BASE_URL}/movie/${m.id}?api_key=${API_KEY}`);
        const d = await r.json();
        m.runtime = d.runtime;
    }

    // Optional actor filter
    if (actor !== "") {
        const actorId = await getActorId(actor);
        if (actorId) {
            const actorMovies = await getActorMajorMovies(actorId);
            const allowed = new Set(actorMovies.map(m => m.id));
            movies = movies.filter(m => allowed.has(m.id));
        }
    }

    // Score movies
    movies.forEach(m => {
        m._score =
            scoreMood(m, mood) +
            scoreRuntime(m, runtime) +
            scoreEra(m, era) +
            scoreTrending(m, trending) +
            m.vote_average * 2 +       // bonus for quality
            m.popularity * 0.1;         // bonus for trending
    });

    // Sort by score descending
    movies.sort((a, b) => b._score - a._score);

    // Top 5 picks
    const topFive = movies.slice(0, 5);

    displayTopFiveMovies(topFive);
}
