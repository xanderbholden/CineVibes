/* ============================================================
   CINE VIBES — SMART RECOMMENDATION ENGINE v3
   (No repeats + Accurate + Keyword/Mood/Actor/Director Intelligence)
============================================================ */

console.log("best.js loaded — Smart Engine v3");

// Prevent repeats during session
let previouslyRecommended = new Set();

document.addEventListener("DOMContentLoaded", () => {
    loadGenres("genreSelect");

    const btn = document.getElementById("perfectFindBtn");
    if (btn) btn.addEventListener("click", findPerfectMovie);
});

/* ============================================================
   MOOD → GENRE CLUSTERS (Advanced)
============================================================ */
const moodClusters = {
    happy:    { primary:[35,10751], secondary:[10402,10749], tertiary:[16,18], fallback:[12] },
    excited:  { primary:[28,12], secondary:[53,878], tertiary:[80,14], fallback:[36] },
    romantic: { primary:[10749], secondary:[35,18], tertiary:[10751], fallback:[14] },
    scary:    { primary:[27,53], secondary:[9648], tertiary:[80], fallback:[18] },
    funny:    { primary:[35], secondary:[16,10751], tertiary:[10402], fallback:[18] },
    sad:      { primary:[18], secondary:[10749], tertiary:[36], fallback:[10752] },
    mysterious:{primary:[9648], secondary:[53], tertiary:[80,18], fallback:[14] },
    chill:    { primary:[35,10749], secondary:[16,10751], tertiary:[18], fallback:[10402] },
    adventure:{ primary:[12,14], secondary:[28,878], tertiary:[10751], fallback:[16] },
    thrilling:{ primary:[53,28], secondary:[9648], tertiary:[80], fallback:[18] },
    family:   { primary:[10751,16], secondary:[35], tertiary:[12], fallback:[10402] },
    smart:    { primary:[18,9648], secondary:[36,99], tertiary:[53], fallback:[878] },
    dark:     { primary:[80,27], secondary:[18,53], tertiary:[9648], fallback:[14] },
    comfort:  { primary:[35,10751], secondary:[10749], tertiary:[16], fallback:[18] },
    epic:     { primary:[14,12], secondary:[28,878], tertiary:[36], fallback:[18] },
    true:     { primary:[36,99], secondary:[18], tertiary:[10752], fallback:[53] }
};

/* ============================================================
   FETCH HELPERS
============================================================ */
async function getMovies(url) {
    const r = await fetch(url);
    const d = await r.json();
    return d.results || [];
}

async function getCandidates(mood, genre) {
    const cluster = moodClusters[mood] || null;

    const queries = [
        `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=1`,
        `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=2`,
        `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=1`,
        `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=2`,
        `${BASE_URL}/movie/now_playing?api_key=${API_KEY}`,
        `${BASE_URL}/movie/upcoming?api_key=${API_KEY}`
    ];

    if (genre) {
        queries.push(
            `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genre}&sort_by=popularity.desc`
        );
    }

    if (cluster) {
        const prim = cluster.primary.join(",");
        queries.push(
            `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${prim}&sort_by=popularity.desc`
        );
    }

    let pool = [];
    for (let q of queries) pool = pool.concat(await getMovies(q));

    // De-duplicate
    return Array.from(new Map(pool.map(m => [m.id, m])).values());
}

/* ============================================================
   ACTOR + DIRECTOR AFFINITY
============================================================ */
async function getActorId(name) {
    if (!name) return null;
    const r = await fetch(`${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(name)}`);
    const d = await r.json();
    if (!d.results?.length) return null;
    return d.results.sort((a, b) => b.popularity - a.popularity)[0].id;
}

async function getActorTopMovies(id) {
    const r = await fetch(`${BASE_URL}/person/${id}/movie_credits?api_key=${API_KEY}`);
    const d = await r.json();
    return new Set(d.cast.filter(c => c.order <= 5).map(m => m.id));
}

async function getDirectorForMovie(id) {
    const r = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const d = await r.json();
    const dir = d.crew?.find(c => c.job === "Director");
    return dir ? dir.id : null;
}

/* ============================================================
   KEYWORD SENTIMENT
============================================================ */
const moodKeywords = {
    happy: ["friendship","family","humor","coming-of-age"],
    scary: ["demon","ghost","survival","monster","gore"],
    dark: ["crime","revenge","violence","corruption"],
    smart: ["science","psychology","future","time travel"],
    romantic: ["love","relationship","marriage"],
    sad: ["death","grief","loss","tragedy"]
};

async function getKeywords(id) {
    const r = await fetch(`${BASE_URL}/movie/${id}/keywords?api_key=${API_KEY}`);
    const d = await r.json();
    return d.keywords?.map(k => k.name.toLowerCase()) || [];
}

/* ============================================================
   SCORING FUNCTIONS
============================================================ */
function scoreMoodGenre(m, mood) {
    const c = moodClusters[mood]; if (!c) return 0;
    let s = 0;
    m.genre_ids.forEach(g => {
        if (c.primary.includes(g)) s += 25;
        else if (c.secondary.includes(g)) s += 18;
        else if (c.tertiary.includes(g)) s += 12;
        else if (c.fallback.includes(g)) s += 5;
    });
    return s;
}

function scoreKeywords(kw, mood) {
    const desired = moodKeywords[mood] || [];
    return kw.reduce((s, k) => s + (desired.includes(k) ? 10 : 0), 0);
}

function scoreActorAff(m, actorSet) {
    return actorSet.has(m.id) ? 50 : 0;
}

function scoreDirectorAff(movieDir, favDir) {
    return movieDir === favDir ? 40 : 0;
}

function scoreEra(m, era) {
    if (!era) return 0;
    const y = +(m.release_date?.split("-")[0] || 0);
    if (era === "classic" && y < 1980) return 15;
    if (era === "older" && y >= 1980 && y <= 1999) return 15;
    if (era === "modern" && y >= 2000 && y <= 2015) return 15;
    if (era === "recent" && y >= 2016) return 15;
    return 0;
}

function scoreQuality(m) {
    const v = m.vote_count || 1;
    return m.vote_average * 10 + Math.log(v) * 5;
}

function scoreTrending(m, pref) {
    return pref === "yes" ? m.popularity * 0.15 : 0;
}

/* ============================================================
   MAIN ENGINE — FIND PERFECT MOVIE
============================================================ */
async function findPerfectMovie() {
    showLoader("perfectResults");

    const mood = document.getElementById("moodSelect").value;
    const genre = document.getElementById("genreSelect").value;
    const actorName = document.getElementById("actorInput").value.trim();
    const era = document.getElementById("eraSelect").value;
    const trending = document.getElementById("trendingToggle").value;

    let pool = await getCandidates(mood, genre);

    // Exclude previously recommended
    pool = pool.filter(m => !previouslyRecommended.has(m.id));

    // Expand pool if necessary
    if (pool.length < 50) {
        const extras = [
            `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=3`,
            `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=3`
        ];
        for (let q of extras) {
            const more = await getMovies(q);
            more.forEach(m => {
                if (!previouslyRecommended.has(m.id)) pool.push(m);
            });
        }
    }

    // Actor affinity
    let actorSet = new Set();
    if (actorName) {
        const actorId = await getActorId(actorName);
        if (actorId) actorSet = await getActorTopMovies(actorId);
    }

    // Director affinity
    const favoriteDirector = pool.length ? await getDirectorForMovie(pool[0].id) : null;

    /* ========================================================
       SCORING EACH MOVIE
    ======================================================== */
    let scored = [];

    for (let m of pool) {
        const dir = await getDirectorForMovie(m.id);
        const kw = await getKeywords(m.id);

        const microRandom = Math.random() * 3;

        const score =
            scoreMoodGenre(m, mood) * 2.5 +
            scoreKeywords(kw, mood) * 2 +
            scoreActorAff(m, actorSet) * 2 +
            scoreDirectorAff(dir, favoriteDirector) * 1.6 +
            scoreEra(m, era) * 1.3 +
            scoreTrending(m, trending) * 1.2 +
            scoreQuality(m) * 1.4 +
            microRandom;

        // Explanation building
        const why = [];
        if (scoreMoodGenre(m, mood) > 0) why.push("Matches your selected mood.");
        if (actorSet.has(m.id)) why.push(`Features your favorite actor (${actorName}).`);
        if (dir === favoriteDirector) why.push("Directed by a filmmaker aligned with your taste.");
        if (scoreKeywords(kw, mood) > 0) why.push("Contains themes related to your mood.");
        if (scoreTrending(m, trending) > 0) why.push("This movie is currently trending.");
        if (m.vote_average > 7.5) why.push("Highly rated by audiences.");

        m._score = score;
        m._why = why.join(" ");

        scored.push(m);
    }

    scored.sort((a, b) => b._score - a._score);

    const topFive = scored.slice(0, 5);
    topFive.forEach(m => previouslyRecommended.add(m.id));

    displayTopFiveMovies(topFive);
}
