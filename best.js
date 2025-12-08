/* ============================================================
    CINE VIBES — PROFESSIONAL MOVIE RECOMMENDATION ENGINE
    OPTION C — ADVANCED MODEL (Actor + Director Affinity)
============================================================ */

console.log("best.js loaded — Professional Engine Enabled");

document.addEventListener("DOMContentLoaded", () => {
    loadGenres("genreSelect");

    const findBtn = document.getElementById("perfectFindBtn");
    if (findBtn) {
        findBtn.addEventListener("click", findPerfectMovie);
    }
});

/* ============================================================
   MOOD GENRE CLUSTERS (Advanced Model)
============================================================ */
const moodClusters = {
    happy: {
        primary: [35, 10751],
        secondary: [10402, 10749],
        tertiary: [16, 18],
        fallback: [12]
    },
    excited: {
        primary: [28, 12],
        secondary: [53, 878],
        tertiary: [80, 14],
        fallback: [36]
    },
    romantic: {
        primary: [10749],
        secondary: [35, 18],
        tertiary: [10751],
        fallback: [14]
    },
    scary: {
        primary: [27, 53],
        secondary: [9648],
        tertiary: [80],
        fallback: [18]
    },
    funny: {
        primary: [35],
        secondary: [10751],
        tertiary: [10402, 16],
        fallback: [18]
    },
    sad: {
        primary: [18],
        secondary: [10749],
        tertiary: [36],
        fallback: [10752]
    },
    mysterious: {
        primary: [9648],
        secondary: [53],
        tertiary: [80, 18],
        fallback: [14]
    },
    chill: {
        primary: [35, 10749],
        secondary: [16, 10751],
        tertiary: [18],
        fallback: [10402]
    },
    adventure: {
        primary: [12, 14],
        secondary: [28, 878],
        tertiary: [10751],
        fallback: [16]
    },
    thrilling: {
        primary: [53, 28],
        secondary: [9648],
        tertiary: [80],
        fallback: [18]
    },
    family: {
        primary: [10751, 16],
        secondary: [12],
        tertiary: [35],
        fallback: [10402]
    },
    smart: {
        primary: [18, 9648],
        secondary: [36, 99],
        tertiary: [53],
        fallback: [878]
    },
    dark: {
        primary: [80, 27],
        secondary: [18, 53],
        tertiary: [9648],
        fallback: [14]
    },
    comfort: {
        primary: [35, 10751],
        secondary: [10749],
        tertiary: [16],
        fallback: [18]
    },
    epic: {
        primary: [14, 12],
        secondary: [28, 878],
        tertiary: [36],
        fallback: [18]
    },
    true: {
        primary: [36, 99],
        secondary: [18],
        tertiary: [10752],
        fallback: [53]
    }
};

/* ============================================================
   HELPERS — Multi-pass movie pool generation
============================================================ */
async function getMovies(url) {
    const r = await fetch(url);
    const data = await r.json();
    return data.results || [];
}

async function getCandidates(mood, genre) {
    const cluster = moodClusters[mood] || null;

    const queries = [];

    // Popular
    queries.push(
        `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`
    );

    // Top rated
    queries.push(
        `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
    );

    // Now playing
    queries.push(
        `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`
    );

    // Upcoming
    queries.push(
        `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=en-US&page=1`
    );

    // Discover by Genre
    if (genre) {
        queries.push(
            `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genre}&sort_by=popularity.desc`
        );
    }

    // Discover by mood (primary genres)
    if (cluster) {
        const primary = cluster.primary.join(",");
        queries.push(
            `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${primary}&sort_by=popularity.desc`
        );
    }

    let pool = [];
    for (let q of queries) {
        const subset = await getMovies(q);
        pool = pool.concat(subset);
    }

    // Remove duplicates
    const unique = new Map();
    pool.forEach(m => unique.set(m.id, m));

    return Array.from(unique.values()).slice(0, 200);
}

/* ============================================================
   HELPERS — Actor + Director affinity scoring
============================================================ */

// 1. Get actor ID
async function getActorId(name) {
    if (!name.trim()) return null;
    const url = `${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.results?.length) return null;
    d.results.sort((a, b) => b.popularity - a.popularity);
    return d.results[0].id;
}

// 2. Get actor's major films
async function getActorTopMovies(actorId) {
    const r = await fetch(`${BASE_URL}/person/${actorId}/movie_credits?api_key=${API_KEY}`);
    const d = await r.json();
    if (!d.cast) return [];
    return d.cast.filter(c => c.order <= 5).map(m => m.id);
}

// 3. Get director ID for each movie
async function getDirectorForMovie(movieId) {
    const r = await fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`);
    const d = await r.json();
    const director = d.crew?.find(c => c.job === "Director");
    return director ? director.id : null;
}

/* ============================================================
   KEYWORD SENTIMENT SCORING
============================================================ */
const moodKeywords = {
    happy: ["friendship", "family", "music", "humor", "coming-of-age"],
    scary: ["demon", "ghost", "survival", "monster", "gore", "haunted"],
    dark: ["revenge", "crime", "corruption", "violence", "trauma"],
    smart: ["psychology", "science", "time travel", "future", "philosophy"],
    romantic: ["love", "relationship", "wedding", "romance"],
    sad: ["death", "grief", "loss", "tragedy"]
};

async function getKeywords(movieId) {
    const r = await fetch(`${BASE_URL}/movie/${movieId}/keywords?api_key=${API_KEY}`);
    const d = await r.json();
    return d.keywords?.map(k => k.name.toLowerCase()) || [];
}

function scoreKeywords(movieKeywords, mood) {
    let score = 0;
    const desired = moodKeywords[mood] || [];
    movieKeywords.forEach(kw => {
        if (desired.includes(kw)) score += 12;
    });
    return score;
}

/* ============================================================
   MAIN SCORING LOGIC
============================================================ */
function scoreMoodGenre(movie, mood) {
    if (!moodClusters[mood]) return 0;

    let score = 0;
    const cluster = moodClusters[mood];

    movie.genre_ids.forEach(g => {
        if (cluster.primary.includes(g)) score += 25;
        else if (cluster.secondary.includes(g)) score += 18;
        else if (cluster.tertiary.includes(g)) score += 12;
        else if (cluster.fallback.includes(g)) score += 5;
    });

    return score;
}

function scoreDirectorAffinity(movieDirector, favoriteDirector) {
    return movieDirector === favoriteDirector ? 40 : 0;
}

function scoreActorAffinity(movie, actorMovies) {
    if (actorMovies.has(movie.id)) return 50; // major role
    return 0;
}

function scoreEra(movie, era) {
    if (!era) return 0;
    const year = parseInt(movie.release_date?.split("-")[0] || "0");

    if (era === "classic" && year < 1980) return 15;
    if (era === "older" && year >= 1980 && year <= 1999) return 15;
    if (era === "modern" && year >= 2000 && year <= 2015) return 15;
    if (era === "recent" && year >= 2016) return 15;

    return 0;
}

function scoreQuality(movie) {
    const v = movie.vote_count || 1;
    return movie.vote_average * 10 + Math.log(v) * 6;
}

function scoreTrending(movie, pref) {
    if (pref === "yes") return movie.popularity * 0.15;
    return 0;
}

/* ============================================================
   MAIN FUNCTION — FIND PERFECT MOVIE
============================================================ */
async function findPerfectMovie() {
    showLoader("perfectResults");

    const mood = document.getElementById("moodSelect").value;
    const genre = document.getElementById("genreSelect").value;
    const actorName = document.getElementById("actorInput").value.trim();
    const era = document.getElementById("eraSelect").value;
    const trending = document.getElementById("trendingToggle").value;

    // Build pool
    let pool = await getCandidates(mood, genre);

    // ACTOR affinity
    let actorMovies = new Set();
    if (actorName) {
        const actorId = await getActorId(actorName);
        if (actorId) {
            const topMovies = await getActorTopMovies(actorId);
            actorMovies = new Set(topMovies);
        }
    }

    // DIRECTOR affinity (based on favorite movie)
    let favoriteDirector = null;

    // Fetch director only for top movie (saves API overhead)
    if (pool.length > 0) {
        const director = await getDirectorForMovie(pool[0].id);
        favoriteDirector = director;
    }

    // Score movies
    let scored = [];
    for (let m of pool) {
        const director = await getDirectorForMovie(m.id);
        const keywords = await getKeywords(m.id);

        const s =
            scoreMoodGenre(m, mood) * 3 +
            scoreKeywords(keywords, mood) * 2 +
            scoreActorAffinity(m, actorMovies) * 2 +
            scoreDirectorAffinity(director, favoriteDirector) * 2 +
            scoreEra(m, era) +
            scoreTrending(m, trending) +
            scoreQuality(m);

        m._score = s;
        scored.push(m);
    }

    scored.sort((a, b) => b._score - a._score);

    const topFive = scored.slice(0, 5);

    displayTopFiveMovies(topFive);
}
