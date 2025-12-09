/* ============================================================
   CINEVIBES PERFECT MATCH ENGINE — A2 SPEED MODE
   No director affinity • No duplicate API keys • Fully stable
============================================================ */

const PLACEHOLDER_POSTER = "images/placeholder_poster.png";

/* -----------------------------
   HYBRID MEMORY SYSTEM
----------------------------- */
let userMemory = JSON.parse(localStorage.getItem("cinevibes_memory")) || {
    moods:{}, genres:{}, actors:{}, tones:{}, pace:{}, history:[]
};

function saveMemory() {
    localStorage.setItem("cinevibes_memory", JSON.stringify(userMemory));
}

function reinforceMemory(obj,key,amt=1) {
    if(!key) return;
    obj[key] = (obj[key] || 0) + amt;
}

function decayMemory() {
    const d = 0.95;
    for (const area of ["moods","genres","actors","tones","pace"]) {
        for (const k in userMemory[area]) {
            userMemory[area][k] *= d;
            if (userMemory[area][k] < 0.1) delete userMemory[area][k];
        }
    }
}
decayMemory();

/* -----------------------------
   MOOD CLUSTERS
----------------------------- */
const moodClusters = {
    happy:{primary:[35,10751],secondary:[16,12,10749]},
    excited:{primary:[28,12,878],secondary:[53]},
    romantic:{primary:[10749],secondary:[18,35]},
    funny:{primary:[35],secondary:[10751,16]},
    scary:{primary:[27,53],secondary:[9648]},
    sad:{primary:[18],secondary:[10749,36]},
    thrilling:{primary:[53,28],secondary:[9648]},
    epic:{primary:[14,12],secondary:[28]},
    dark:{primary:[80,18],secondary:[53]}
};

/* -----------------------------
   TONE + PACE
----------------------------- */
const toneKeywords = {
    light:["wholesome","family","funny","cute","inspirational","friendship"],
    emotional:["heartbreaking","emotional","tragic","romance","drama"],
    dark:["dark","violent","crime","revenge","disturbing"],
    atmospheric:["mystery","dreamlike","surreal","fantasy"],
    intense:["thriller","tense","chaos","high stakes","battle"]
};

function inferTone(keys) {
    const s={light:0,emotional:0,dark:0,atmospheric:0,intense:0};
    keys.forEach(k=>{
        for(const t in toneKeywords){
            if(toneKeywords[t].some(w=>k.includes(w))) s[t]++;
        }
    });
    return Object.entries(s).sort((a,b)=>b[1]-a[1])[0][0] || "neutral";
}

function inferPace(runtime,keys){
    if(runtime<100) return "fast";
    if(runtime>130) return "slow";
    if(keys.some(k=>k.includes("fast"))) return "fast";
    if(keys.some(k=>k.includes("slow"))) return "slow";
    return "medium";
}

/* ============================================================
   TMDB FETCH HELPERS — API_KEY & BASE_URL COME FROM utils.js
============================================================ */

async function tmdbFetch(endpoint,params={}) {
    const url = new URL(BASE_URL + endpoint);
    url.searchParams.set("api_key", API_KEY);
    for (const k in params) url.searchParams.set(k, params[k]);
    const r = await fetch(url);
    return await r.json();
}

async function getMovieKeywords(id){
    const d = await tmdbFetch(`/movie/${id}/keywords`);
    return d.keywords ? d.keywords.map(k=>k.name.toLowerCase()) : [];
}

async function getMovieDetails(id){
    return await tmdbFetch(`/movie/${id}`,{language:"en-US"});
}

async function getActorId(name){
    if(!name) return null;
    const d = await tmdbFetch(`/search/person`,{query:name});
    return d.results?.length ? d.results[0].id : null;
}

async function getActorTopMovies(id){
    const d = await tmdbFetch(`/person/${id}/movie_credits`);
    return new Set((d.cast||[]).slice(0,20).map(m=>m.id));
}

async function fetchGenreMovies(genre,pages=1){
    let out=[];
    for(let p=1;p<=pages;p++){
        const d = await tmdbFetch(`/discover/movie`,{
            with_genres:genre,
            sort_by:"popularity.desc",
            language:"en-US",
            page:p
        });
        out = out.concat(d.results||[]);
    }
    return out;
}

async function getBasePool(){
    let arr=[];
    const feeds=[`/movie/popular`,`/movie/top_rated`,`/trending/movie/week`];
    for(const ep of feeds){
        const d = await tmdbFetch(ep,{language:"en-US",page:1});
        arr = arr.concat(d.results||[]);
    }
    return arr;
}

/* ============================================================
   CANDIDATE POOL (FIXED)
============================================================ */
async function getCandidatePool(mood,genre,actorName){
    let pool = await getBasePool();

    if(genre) pool = pool.concat(await fetchGenreMovies(genre,2));

    if(mood){
        const c = moodClusters[mood];
        if(c){
            for(const g of c.primary) pool = pool.concat(await fetchGenreMovies(g,1));
            for(const g of c.secondary||[]) pool = pool.concat(await fetchGenreMovies(g,1));
        }
    }

    let actorMovieSet = new Set();
    if(actorName){
        const id = await getActorId(actorName);
        if(id) actorMovieSet = await getActorTopMovies(id);
    }

    const map=new Map();
    pool.forEach(m=>{ if(!map.has(m.id)) map.set(m.id,m); });

    return {
        pool:[...map.values()],
        actorMovieSet
    };
}

/* ============================================================
   ENRICH MOVIE — no director calls (A2 mode)
============================================================ */
async function enrichMovie(m){
    const [details, keywords] = await Promise.all([
        getMovieDetails(m.id),
        getMovieKeywords(m.id)
    ]);

    const tone = inferTone(keywords);
    const pace = inferPace(details.runtime, keywords);

    return {
        ...m,
        details,
        keywords,
        tone,
        pace,
        poster_path: m.poster_path
            ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
            : PLACEHOLDER_POSTER
    };
}

/* ============================================================
   SCORING ENGINE
============================================================ */

function scoreMood(m,mood){
    if(!mood) return 0;
    const c = moodClusters[mood];
    if(!c) return 0;

    let s=0;
    m.genre_ids?.forEach(g=>{
        if(c.primary.includes(g)) s+=30;
        else if(c.secondary.includes(g)) s+=15;
    });
    return s;
}

function scoreGenre(m,genre){
    return genre && m.genre_ids?.includes(parseInt(genre)) ? 25 : 0;
}

function scoreKeywords(m,mood){
    if(!mood) return 0;

    const sets={
        happy:["funny","bright","wholesome","joy","family"],
        excited:["intense","battle","action","explosive"],
        romantic:["romance","kiss","love","heart"],
        funny:["comedy","humor","goofy"],
        scary:["horror","fear","dark","disturbing"],
        sad:["tragic","emotional","heartbreak"],
        thrilling:["tension","suspense","thriller"],
        epic:["fantasy","legend","myth"],
        dark:["crime","violent","revenge"]
    };

    const moodSet = sets[mood] || [];
    return m.keywords.reduce((s,k)=>s + (moodSet.some(x=>k.includes(x)) ? 10 : 0),0);
}

function scoreTone(m,mood){
    const rules={
        happy:["light"],
        excited:["intense"],
        romantic:["emotional"],
        funny:["light"],
        scary:["dark","intense"],
        sad:["emotional"],
        thrilling:["intense"],
        epic:["atmospheric"],
        dark:["dark"]
    };
    return (rules[mood]||[]).includes(m.tone) ? 20 : 0;
}

function scorePace(m,mood){
    const fast=["excited","funny","thrilling"];
    const slow=["sad","romantic","dark"];
    if(fast.includes(mood) && m.pace==="fast") return 15;
    if(slow.includes(mood) && m.pace==="slow") return 15;
    return 0;
}

function scoreActor(m,actorSet){
    return actorSet.has(m.id) ? 30 : 0;
}

function scoreQuality(m){
    return (m.vote_average||0)*10 + (m.popularity||0)*0.5;
}

function computeAIScore(m,mood,genre,actorSet){
    const total =
        scoreMood(m,mood)*1.3 +
        scoreGenre(m,genre)*1.2 +
        scoreKeywords(m,mood)*1.2 +
        scoreTone(m,mood)*1.2 +
        scorePace(m,mood)*1.1 +
        scoreActor(m,actorSet)*1.4 +
        scoreQuality(m)*1.0 +
        Math.random()*3;

    m._score = total;
    return total;
}

/* ============================================================
   DISPLAY RESULTS
============================================================ */

function displayTopFiveMovies(list){
    const wrap=document.getElementById("perfectResults");
    wrap.innerHTML="";

    list.forEach((m,i)=>{
        const card=document.createElement("div");
        card.className=i===0?"featured-movie":"top-pick-card";

        card.innerHTML=`
            <img src="${m.poster_path}" class="movie-poster">

            <div class="movie-info">
                <h2>${m.title}</h2>
                <p class="tagline">${m.details.tagline||""}</p>
                <p><strong>Rating:</strong> ${m.vote_average}/10</p>
                <p><strong>Release:</strong> ${m.release_date}</p>
                <p>${m.details.overview}</p>
            </div>
        `;

        wrap.appendChild(card);
    });
}

/* ============================================================
   MAIN FUNCTION
============================================================ */

async function findPerfectMovie(){
    showLoader("perfectResults");

    const mood=document.getElementById("moodSelect").value;
    const genre=document.getElementById("genreSelect").value;
    const actorName=document.getElementById("actorInput")?.value.trim() || "";

    const { pool, actorMovieSet } = await getCandidatePool(mood,genre,actorName);

    const enriched=[];
    for(const m of pool){
        try{ enriched.push(await enrichMovie(m)); }
        catch(e){ console.warn("Movie failed:",m.id); }
    }

    enriched.forEach(m=>computeAIScore(m,mood,genre,actorMovieSet));

    const topFive = enriched.sort((a,b)=>b._score - a._score).slice(0,5);

    displayTopFiveMovies(topFive);
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", ()=>{
    loadGenres("genreSelect");
    document.getElementById("perfectFindBtn")
        ?.addEventListener("click", findPerfectMovie);
});
