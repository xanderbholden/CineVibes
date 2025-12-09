/* ============================================================
   CINE VIBES — SMART RECOMMENDATION ENGINE (Hybrid v3.5)
============================================================ */

console.log("best.js loaded — Hybrid Engine v3.5 (Top 5)");

let previouslyRecommended = new Set();

document.addEventListener("DOMContentLoaded", () => {
    loadGenres("genreSelect");

    const btn = document.getElementById("perfectFindBtn");
    if (btn) btn.addEventListener("click", findPerfectMovie);
});

/* ============================================================
   MOOD → GENRE CLUSTERS (Fast + Accurate)
============================================================ */
const moodClusters = {
    happy: { primary: [35, 10751], secondary: [10749, 16], fallback: [12] },
    excited: { primary: [28, 12], secondary: [53, 878] },
    romantic: { primary: [10749], secondary: [35, 18] },
    funny: { primary: [35], secondary: [16, 10751] },
    scary: { primary: [27, 53], secondary: [9648] },
    mysterious: { primary: [9648, 53], secondary: [80] },
    dark: { primary: [80, 18], secondary: [53] },
    chill: { primary: [35, 10751], secondary: [16] },
    adventure: { primary: [12, 14], secondary: [28] },
    thrilling: { primary: [53, 28], secondary: [9648] },
    epic: { primary: [14, 12], secondary: [28] },
    family: { primary: [10751, 16], secondary: [35] },
    smart: { primary: [18, 9648], secondary: [36] },
    true: { primary: [36, 99], secondary: [18] }
};

/* ============================================================
   FETCH CANDIDATE POOL (Lightweight)
============================================================ */
async function getCandidates(mood, genre) {
    let pool = [];

    // Starter pool: popular + top-rated + trending
    const endpoints = [
        `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`,
        `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=1`,
        `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=2`
    ];

    for (let url of endpoints) {
        const r = await fetch(url);
        const d = await r.json();
        pool = pool.concat(d.results || []);
    }

    // Genre filtering if selected
    if (genre) {
        const g = await fetchMoviesRaw({
            with_genres: genre,
            sort_by: "popularity.desc",
            language: "en-US"
        });
        pool = pool.concat(g);
    }

    // Mood-based cluster filtering
    const cluster = moodClusters[mood];
    if (cluster) {
        const prim = cluster.primary.join(",");
        const m1 = await fetchMoviesRaw({ with_genres: prim, sort_by: "popularity.desc" });
        pool = pool.concat(m1);
    }

    // Remove duplicates
    return Array.from(new Map(pool.map(m => [m.id, m])).values());
}

/* ============================================================
   ACTOR AFFINITY (FAST version)
============================================================ */
async function getActorId(name) {
    if (!name) return null;
    const r = await fetch(`${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`);
    const d = await r.json();
    if (!d.results?.length) return null;
    return d.results[0].id;
}

async function getActorTopMovies(id) {
    const r = await fetch(`${BASE_URL}/person/${id}/movie_credits?api_key=${API_KEY}`);
    const d = await r.json();
    return new Set(d.cast.slice(0, 10).map(m => m.id)); // top 10 only for speed
}

/* ============================================================
   SCORING (Lightweight + Accurate)
============================================================ */
function scoreMoodGenre(m, mood) {
    const c = moodClusters[mood];
    if (!c) return 0;

    let s = 0;
    m.genre_ids.forEach(g => {
        if (c.primary.includes(g)) s += 20;
        else if (c.secondary?.includes(g)) s += 10;
        else if (c.fallback?.includes(g)) s += 4;
    });
    return s;
}

function scoreEra(m, era) {
    const y = parseInt(m.release_date || "0");

    if (era === "classic" && y < 1980) return 15;
    if (era === "older" && y >= 1980 && y <= 1999) return 14;
    if (era === "modern" && y >= 2000 && y <= 2015) return 12;
    if (era === "recent" && y >= 2016) return 12;

    return 0;
}

function scoreActorAff(m, actorSet) {
    return actorSet.has(m.id) ? 50 : 0;
}

function scoreTrending(m, pref) {
    return pref === "yes" ? m.popularity * 0.1 : 0;
}

function scoreQuality(m) {
    return m.vote_average * 10 + Math.log((m.vote_count || 1)) * 4;
}

/* ============================================================
   MAIN ENGINE — FIND TOP 5
============================================================ */
async function findPerfectMovie() {
    showLoader("perfectResults");

    const mood = document.getElementById("moodSelect").value;
    const genre = document.getElementById("genreSelect").value;
    const actorName = document.getElementById("actorInput").value.trim();
    const era = document.getElementById("eraSelect").value;
    const trending = document.getElementById("trendingToggle").value;

    let pool = await getCandidates(mood, genre);

    // Exclude repeats
    pool = pool.filter(m => !previouslyRecommended.has(m.id));

    // Actor affinity check
    let actorSet = new Set();
    if (actorName) {
        const id = await getActorId(actorName);
        if (id) actorSet = await getActorTopMovies(id);
    }

    // Score movies
    pool.forEach(m => {
        const s =
            scoreMoodGenre(m, mood) * 2 +
            scoreEra(m, era) * 1.5 +
            scoreActorAff(m, actorSet) * 2 +
            scoreTrending(m, trending) * 1.2 +
            scoreQuality(m) * 1.3 +
            Math.random() * 2;

        m._score = s;

        // Build explanation
        m._why = [];
        if (scoreMoodGenre(m, mood) > 0) m._why.push("Matches your selected mood.");
        if (actorSet.has(m.id)) m._why.push(`Features ${actorName}.`);
        if (scoreEra(m, era) > 0) m._why.push("Fits your preferred era.");
        if (scoreTrending(m, trending) > 0) m._why.push("This movie is trending.");
        if (m.vote_average > 7.5) m._why.push("Highly rated by audiences.");
        m._why = m._why.join(" ");
    });

    // Sort by score
    pool.sort((a, b) => b._score - a._score);

    // Final Top 5
    const topFive = pool.slice(0, 5);
    topFive.forEach(m => previouslyRecommended.add(m.id));

    displayTopFiveMovies(topFive);
}
