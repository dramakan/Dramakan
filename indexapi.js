// indexapi.js — Frontend Integration for Dramacool9 API

const API_BASE = "http://127.0.0.1:8788/v1/dramacool9";
const API_KEY = "key1"; // Updated to match the active local key

/**
 * Master fetch wrapper for the Dramacool9 local API
 */
async function fetchXyraAPI(endpoint, params = {}) {
    params.api_key = API_KEY;
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}${endpoint}?${qs}`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const json = await res.json();
        
        if (!json.success) throw new Error(json.message || "API returned success: false");
        
        return json.data;
    } catch (e) {
        console.error(`[Dramacool9 API Error] Failed to fetch ${endpoint}:`, e.message);
        return null;
    }
}

/**
 * Extracts a clean slug from full URL IDs (Leaves quality tags intact for dramacool9)
 */
function extractSlug(rawId) {
    if (!rawId) return '';
    let slug = rawId;
    
    if (rawId.includes('http')) {
        try {
            slug = new URL(rawId).pathname.split('/').filter(Boolean).pop();
        } catch(e) { slug = rawId; }
    } else if (rawId.includes('/')) {
        slug = rawId.split('/').filter(Boolean).pop();
    }
    
    // We stopped stripping the tags here! watchapi.html will handle it dynamically.
    return slug;
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
    } catch(e) { console.error("[Dramacool9 API Error] CW Render Error:", e); }
}

/**
 * Generates aesthetic, glass-styled HTML for a single drama card
 */
function createDramaCard(item) {
    const rawId = item.id || item.dramaId || item.original_id;
    const slug = extractSlug(rawId); 
    
    const title = item.title || item.name;
    const img = item.image || item.img || item.poster || 'https://via.placeholder.com/300x450?text=No+Poster';
    
    // Extracting episode safely, falling back to time or default values
    const ep = item.episode || item.time || item.latest_episode || (item.status === 'Completed' ? 'Completed' : 'Series');
    
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
 * Utility to populate a specific grid
 */
function populateGrid(gridId, dataArray) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
        grid.innerHTML = dataArray.slice(0, 15).map(createDramaCard).join('');
    } else {
        grid.innerHTML = '<p style="color:#a1a1aa; padding:20px; text-align:center; width:100%;">Failed to load content.</p>';
    }
}

/**
 * Initializes the grid populations on page load with multi-country layout filters
 */
async function initializeDramaSite() {
    renderContinueWatching();
    window.addEventListener('historySynced', renderContinueWatching);

    // Apply loading skeletons to the newly customized grids
    const gridIds = ['latest-grid', 'popular-grid', 'korean-grid', 'japanese-grid', 'chinese-grid'];
    gridIds.forEach(id => {
        const el = document.getElementById(id);
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

    try {
        // Parallel fetching including your dynamic country list parameters
        const [homeData, popularData, japanData, chinaData] = await Promise.all([
            fetchXyraAPI('/home'),
            fetchXyraAPI('/popular', { page: 1 }),
            fetchXyraAPI('/list', { country: 'japan', page: 1 }),
            fetchXyraAPI('/list', { country: 'china', page: 1 })
        ]);

        // Process Global Home & Popular Data
        if (homeData) {
            populateGrid('latest-grid', homeData.drama);
            // Default home feed works beautifully to showcase the newest Korean entries
            populateGrid('korean-grid', homeData.drama); 
        } else {
            console.error("[Dramacool9 API Error] Home data feed failed.");
            populateGrid('latest-grid', []);
            populateGrid('korean-grid', []);
        }

        populateGrid('popular-grid', popularData);

        // Populate targeted regional channels
        populateGrid('japanese-grid', japanData);
        populateGrid('chinese-grid', chinaData);

    } catch (error) {
        console.error("[Dramacool9 API Error] Initialization failed:", error);
    }
}
/**
 * Handles Live Search interactions utilizing the /search endpoint
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
                const results = await fetchXyraAPI('/search', { query: query, page: 1 });
                
                if (results && results.length > 0) {
                    searchResults.innerHTML = results.slice(0, 8).map(item => {
                        const slug = extractSlug(item.id || item.dramaId || item.original_id);
                        return `
                        <a href="watchapi.html?id=${encodeURIComponent(slug)}" class="search-result-item">
                            <img src="${item.image || item.img}" width="45" height="60" loading="lazy" onerror="this.src='https://via.placeholder.com/45x60'">
                            <div class="search-result-text">
                                <div class="search-result-title">${item.title || item.name}</div>
                                <small style="color:var(--primary); font-weight:500;">${item.time || item.episode || 'Series'}</small>
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