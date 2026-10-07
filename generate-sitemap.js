const fs = require('fs');

const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE'; // Insert your actual TMDB key
const BASE_URL = 'https://dramakan.site';
const PAGES_TO_FETCH = 25; // 25 pages = 500 items per category

const staticPages = [
    '/', '/movies.html', '/shows.html', '/anime.html', '/asian.html', 
    '/trending.html', '/filter.html', '/login.html', '/community.html'
];

async function fetchTMDB(endpoint) {
    let results = [];
    const separator = endpoint.includes('?') ? '&' : '?';
    
    for (let page = 1; page <= PAGES_TO_FETCH; page++) {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/${endpoint}${separator}api_key=${TMDB_API_KEY}&page=${page}`);
            const data = await res.json();
            if (data.results) results.push(...data.results);
        } catch (e) {
            console.error(`Error fetching page ${page} of ${endpoint}`);
        }
    }
    return results;
}

async function buildSitemap() {
    console.log("Fetching TMDB data. This may take a few seconds...");
    
    const [movies, tv, anime, asian] = await Promise.all([
        fetchTMDB('trending/movie/week'),
        fetchTMDB('trending/tv/week'),
        fetchTMDB('discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
        fetchTMDB('discover/tv?with_original_language=ko|zh|th&without_genres=16&sort_by=popularity.desc')
    ]);

    // Deduplicate TV shows (since anime and asian dramas might overlap with trending)
    const allTv = [...tv, ...anime, ...asian];
    const uniqueTvIds = new Set();
    const uniqueTv = [];
    
    for (const show of allTv) {
        if (show.id && !uniqueTvIds.has(show.id)) {
            uniqueTvIds.add(show.id);
            uniqueTv.push(show);
        }
    }

    const dateToday = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Inject Static Pages
    staticPages.forEach(page => {
        xml += `  <url>\n    <loc>${BASE_URL}${page}</loc>\n    <lastmod>${dateToday}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    });

    // 2. Inject Movies (Note: XML requires '&' to be escaped as '&amp;')
    movies.forEach(movie => {
        if (!movie.id) return;
        xml += `  <url>\n    <loc>${BASE_URL}/details.html?type=movie&amp;id=${movie.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    // 3. Inject TV Shows / Anime / Asian Dramas
    uniqueTv.forEach(show => {
        xml += `  <url>\n    <loc>${BASE_URL}/details.html?type=tv&amp;id=${show.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;

    fs.writeFileSync('sitemap.xml', xml);
    console.log(`✅ Generated sitemap.xml successfully!`);
    console.log(`Total URLs mapped: ${staticPages.length + movies.length + uniqueTv.length}`);
}

buildSitemap();