// indexapi.js — Frontend Integration for Xyra API

const API_BASE = "http://127.0.0.1:8788/v1/dramacool";
const API_KEY = "somekey1"; // Updated to match your active local key

/**
 * Master fetch wrapper for the local Xyra API
 */
async function fetchXyraAPI(endpoint, params = {}) {
    params.api_key = API_KEY;
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}${endpoint}?${qs}`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        // Handle Xyra's specific nested structures (like /home vs /popular)
        if (data.data && data.data.recently_added) return data.data.recently_added;
        return data.data || data.results || [];
    } catch (e) {
        console.error(`[Xyra API Error] Failed to fetch ${endpoint}:`, e.message);
        return [];
    }
}

/**
 * Extracts a clean slug from Xyra's full URL IDs
 */
function extractSlug(rawId) {
    if (!rawId) return '';
    if (rawId.includes('http')) {
        try {
            return new URL(rawId).pathname.split('/').filter(Boolean).pop();
        } catch(e) { return rawId; }
    }
    if (rawId.includes('/')) return rawId.split('/').filter(Boolean).pop();
    return rawId;
}

/**
 * Formats timestamps nicely
 */
function formatTime(seconds) {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Renders the Continue Watching section from LocalStorage
 */
function renderContinueWatching() {
    try {
        const historyObj = JSON.parse(localStorage.getItem('dramakan_history')) || {};
        const historyArr = Object.values(historyObj)
            .filter(item => item && item.id && item.title)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
        
        const cwSection = document.getElementById('continue-watching-section');
        const cwGrid = document.getElementById('continue-watching-grid');
        
        if (cwSection && cwGrid) {
            if(historyArr.length > 0) {
                cwSection.style.display = 'block';
                cwGrid.innerHTML = historyArr.map(item => `
                    <a href="watchapi.html?id=${encodeURIComponent(item.id)}&ep=${item.episode || 1}&t=${item.progress || 0}" class="drama-card" style="border-color: rgba(138, 43, 226, 0.4);">
                        <div class="drama-card-img"><img src="${item.img}" alt="${item.title}" loading="lazy" decoding="async"></div>
                        <div class="drama-card-info">
                            <h3 class="drama-card-title">${item.title}</h3>
                            <p class="drama-card-meta" style="color: var(--primary);">
                                <i class="fas fa-play"></i> Ep ${item.episode || '1'} • ${formatTime(item.progress)}
                            </p>
                        </div>
                    </a>
                `).join('');
            } else {
                cwSection.style.display = 'none';
            }
        }
    } catch(e) { console.error("CW Render Error:", e); }
}

/**
 * Generates aesthetic, glass-styled HTML for a single drama card
 */
function createDramaCard(item) {
    const rawId = item.id || item.dramaId || item.original_id;
    const slug = extractSlug(rawId); // Clean the ID!
    
    const title = item.title || item.name;
    const img = item.image || item.img || item.poster || 'https://via.placeholder.com/300x450?text=No+Poster';
    const ep = item.episode || item.latest_episode || (item.status === 'Completed' ? 'Completed' : 'Series');
    
    const watchLink = `watchapi.html?id=${encodeURIComponent(slug)}`;

    return `
    <a href="${watchLink}" class="drama-card">
        <div class="drama-card-img">
            <img src="${img}" alt="${title}" loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/400x225?text=No+Image'">
        </div>
        <div class="drama-card-info">
            <h3 class="drama-card-title">${title}</h3>
            <p class="drama-card-meta">${ep}</p>
        </div>
        <button class="bookmark-btn" onclick="event.preventDefault(); window.toggleMyList(this, '${encodeURIComponent(title)}', '${encodeURIComponent(img)}', '${watchLink}')" title="Add to My List">
            <i class="fas fa-plus"></i>
        </button>
    </a>`;
}

/**
 * Initializes the grid populations on page load
 */
async function initializeDramaSite() {
    renderContinueWatching();
    window.addEventListener('historySynced', renderContinueWatching);

    const gridConfigs = [
        { id: 'latest-grid', endpoint: '/latest' },
        { id: 'popular-grid', endpoint: '/popular' },
        { id: 'ongoing-grid', endpoint: '/ongoing' },
        { id: 'upcoming-grid', endpoint: '/upcoming' }
    ];

    gridConfigs.forEach(config => {
        const el = document.getElementById(config.id);
        if (el) {
            el.innerHTML = Array(6).fill(0).map(() => `
                <div class="drama-card" style="pointer-events:none; border: 1px solid rgba(255,255,255,0.05);">
                    <div class="drama-card-img" style="background:rgba(255,255,255,0.05); border-radius:12px; aspect-ratio:16/9; animation:pulse 1.5s ease-in-out infinite;"></div>
                    <div class="drama-card-info" style="padding:15px; background: transparent !important; bottom: 0;">
                        <div style="height:16px; background:rgba(255,255,255,0.1); border-radius:4px; margin-bottom:8px; width:80%; animation:pulse 1.5s ease-in-out infinite;"></div>
                        <div style="height:12px; width:50%; background:rgba(255,255,255,0.1); border-radius:4px; animation:pulse 1.5s ease-in-out infinite;"></div>
                    </div>
                </div>`).join('');
        }
    });

    const results = await Promise.allSettled(
        gridConfigs.map(config => fetchXyraAPI(config.endpoint))
    );

    gridConfigs.forEach((config, i) => {
        const grid = document.getElementById(config.id);
        if (!grid) return;

        const data = results[i].status === 'fulfilled' ? results[i].value : [];
        
        if (data.length > 0) {
            grid.innerHTML = data.slice(0, 15).map(createDramaCard).join('');
        } else {
            grid.innerHTML = '<p style="color:#a1a1aa; padding:20px; text-align:center; width:100%;">Failed to load content.</p>';
        }
    });
}

/**
 * Handles Live Search interactions
 */
function setupLiveSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    let debounceTimer;

    if (searchInput && searchResults) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                const results = await fetchXyraAPI('/search', { query: query });
                
                if (results && results.length > 0) {
                    searchResults.innerHTML = results.slice(0, 8).map(item => {
                        const slug = extractSlug(item.id || item.dramaId || item.original_id);
                        return `
                        <a href="watchapi.html?id=${encodeURIComponent(slug)}" class="search-result-item">
                            <img src="${item.image || item.img}" width="45" height="60" loading="lazy" onerror="this.src='https://via.placeholder.com/45x60'">
                            <div class="search-result-text">
                                <div class="search-result-title">${item.title || item.name}</div>
                                <small style="color:var(--primary); font-weight:500;">${item.episode || 'Series'}</small>
                            </div>
                        </a>`;
                    }).join('');
                    searchResults.style.display = 'block';
                } else {
                    searchResults.innerHTML = '<div style="padding:15px; text-align:center; color:#a1a1aa;">No dramas found</div>';
                    searchResults.style.display = 'block';
                }
            }, 500);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar')) searchResults.style.display = 'none';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeDramaSite();
    setupLiveSearch();
});