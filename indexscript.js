// --- 0. THEME, HARDWARE & CSS FIXES (RUNS IMMEDIATELY) ---
(function initUI() {
    const injectedStyles = document.createElement('style');
    injectedStyles.innerHTML = `
        /* FIX: Prevent search text from overlapping icons */
        #searchInput { padding: 10px 40px 10px 40px !important; }
        .search-bar i.fa-search { pointer-events: none; }
        .search-filter-link { pointer-events: auto; z-index: 2; }
        
        /* WHO'S WATCHING OVERLAY STYLES */
        #home-profile-switcher-overlay {
            position: fixed; inset: 0; background: var(--bg-base, #050507); z-index: 999999;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            transition: transform 0.8s cubic-bezier(0.85, 0, 0.15, 1), opacity 0.8s ease;
            font-family: 'Poppins', sans-serif;
        }
        #home-profile-switcher-overlay.hidden { transform: scale(1.1); opacity: 0; pointer-events: none; }
        .switcher-title { font-size: 2.5rem; font-weight: 500; margin-bottom: 40px; letter-spacing: 1px; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.5); text-align: center;}
        .profiles-list { display: flex; gap: 30px; flex-wrap: wrap; justify-content: center; max-width: 800px;}
        .profile-select-card { display: flex; flex-direction: column; align-items: center; gap: 15px; cursor: pointer; transition: all 0.3s ease; opacity: 0; transform: translateY(20px); animation: fadeUp 0.6s ease forwards 0.2s; }
        .profile-select-card:hover .switcher-avatar-img { border-color: #fff; transform: scale(1.05); }
        .profile-select-card:hover .switcher-name { color: #fff; }
        .switcher-avatar-img { width: 140px; height: 140px; border-radius: 16px; object-fit: cover; border: 3px solid transparent; transition: all 0.3s ease; box-shadow: 0 10px 25px rgba(0,0,0,0.5); background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 4rem; color: #fff;}
        .switcher-name { color: #9CA3AF; font-size: 1.1rem; transition: color 0.3s ease; font-weight: 500;}
        
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
            .switcher-title { font-size: 1.8rem; }
            .switcher-avatar-img { width: 100px; height: 100px; font-size: 3rem; }
        }
        
        /* PREMIUM LIQUID GLASS AD CARD STYLES FOR GRIDS */
        .ad-card-wrapper {
            position: relative;
            background: rgba(26, 26, 29, 0.45); 
            border: 1px solid rgba(255, 255, 255, 0.08); 
            border-radius: 8px;
            display: flex; 
            align-items: center; 
            justify-content: center;
            overflow: hidden;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            aspect-ratio: 2/3; 
        }
        .ad-card-wrapper::before {
            content: 'Ad';
            position: absolute;
            top: 6px;
            left: 8px;
            font-size: 0.65rem;
            font-weight: 600;
            color: rgba(255,255,255,0.6);
            background: rgba(0,0,0,0.5);
            padding: 2px 6px;
            border-radius: 4px;
            z-index: 10;
        }
    `;
    document.head.appendChild(injectedStyles);

    let isLowEnd = false;
    if ('deviceMemory' in navigator && navigator.deviceMemory < 4) isLowEnd = true;
    if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 4) isLowEnd = true;
    if ('connection' in navigator && (navigator.connection.effectiveType === '3g' || navigator.connection.effectiveType === '2g')) isLowEnd = true;

    if (isLowEnd) {
        document.documentElement.classList.add('lite-mode');
        console.log("Budget device detected: Lite UI activated.");
    }
})();

// --- 1. CORE CONFIGURATION & FIREBASE ---
const tmdbKey = "hidden_by_proxy"; 
const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

let firebaseInstance = null;
let unsubscribeHistory = null; 

async function getFirebase() {
    if (firebaseInstance) return firebaseInstance;
    const [appModule, authModule, firestoreModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
    ]);
    const app = !appModule.getApps().length ? appModule.initializeApp(firebaseConfig) : appModule.getApp();
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);
    firebaseInstance = { app, auth, db, appModule, authModule, firestoreModule };
    return firebaseInstance;
}

// --- 2. GLOBAL UI UTILITIES & RENDERERS ---
async function renderContinueWatching(cloudHistoryArr = null) {
    try {
        let historyArr = cloudHistoryArr;
        
        if (!historyArr) {
            const historyObj = JSON.parse(localStorage.getItem('dramakan_history')) || {};
            historyArr = Object.values(historyObj)
                .filter(item => item && item.link && item.title && !item.link.toLowerCase().includes('index.html'))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
        }
        
        const cwSection = document.getElementById('continue-watching-section');
        const cwGrid = document.getElementById('continue-watching-grid');
        
        if (cwSection && cwGrid) {
            if (historyArr.length > 0) {
                cwSection.style.display = 'block';

                const updatedItems = await Promise.all(historyArr.map(async (item) => {
                    let imgUrl = item.backdrop_path ? `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev/image/t/p/w780${item.backdrop_path}` : (item.backdrop || item.bgImg);
                    
                    if (!imgUrl) {
                        try {
                            if (item.id) {
                                let tmdbRes = await fetch(`https://dramakan-tmdb-proxy.zabaazcreations.workers.dev//3/tv/${item.id}?api_key=${tmdbKey}`);
                                if (!tmdbRes.ok) tmdbRes = await fetch(`https://dramakan-tmdb-proxy.zabaazcreations.workers.dev//3/movie/${item.id}?api_key=${tmdbKey}`);
                                
                                if (tmdbRes.ok) {
                                    const tmdbData = await tmdbRes.json();
                                    if (tmdbData.backdrop_path) {
                                        imgUrl = `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev/image/t/p/w780${tmdbData.backdrop_path}`;
                                    }
                                }
                            }
                            
                            if (!imgUrl && item.title) {
                                const searchRes = await fetch(`https://dramakan-tmdb-proxy.zabaazcreations.workers.dev//3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(item.title)}`);
                                if (searchRes.ok) {
                                    const searchData = await searchRes.json();
                                    if (searchData.results && searchData.results.length > 0 && searchData.results[0].backdrop_path) {
                                        imgUrl = `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev/image/t/p/w780${searchData.results[0].backdrop_path}`;
                                    }
                                }
                            }
                            
                            if (imgUrl) {
                                item.backdrop_path = imgUrl.replace('https://dramakan-tmdb-proxy.zabaazcreations.workers.dev/image/t/p/w780', '');
                                let localHistory = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                                if (localHistory[item.id]) {
                                    localHistory[item.id].backdrop_path = item.backdrop_path;
                                    localStorage.setItem('dramakan_history', JSON.stringify(localHistory));
                                }
                            }
                        } catch(err) { console.warn("Backdrop fetch failed", err); }
                    }
                    
                    item.finalImgUrl = imgUrl || item.img;
                    return item;
                }));

                cwGrid.innerHTML = updatedItems.map(item => {
                    const progress = item.progress || Math.floor(Math.random() * 50 + 20); 
                    const season = item.season || 1;
                    const episode = item.episode || 1;

                    return `
                    <a href="${item.link}" class="cw-landscape-card">
                        <div class="cw-landscape-img-wrap">
                            <img src="${item.finalImgUrl}" alt="${item.title}" class="cw-landscape-img" loading="lazy" decoding="async" onerror="this.src='${item.img}'">
                            <button class="cw-remove-btn" onclick="event.preventDefault(); window.removeCard('history', '${item.id}')" title="Remove">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                        <div class="cw-progress-container">
                            <div class="cw-progress-bar" style="width: ${progress}%;"></div>
                        </div>
                        <div class="cw-landscape-info">
                            <h3 class="cw-landscape-title">${item.title}</h3>
                            <div class="cw-landscape-meta">
                                <span class="cw-play-badge"><i class="fas fa-play"></i> S${season} • E${episode}</span>
                                <span>${item.timeLeft ? item.timeLeft + 'm left' : ''}</span>
                            </div>
                        </div>
                    </a>
                    `;
                }).join('');
            } else { 
                cwSection.style.display = 'none'; 
            }
        }
    } catch(e) { console.error("CW Render Error:", e); }
}

window.removeCard = async (type, identifier) => {
    if (type === 'history') {
        let localHistory = JSON.parse(localStorage.getItem('dramakan_history')) || {};
        if (localHistory[identifier]) {
            delete localHistory[identifier];
            localStorage.setItem('dramakan_history', JSON.stringify(localHistory));
        }
        
        if (firebaseInstance && firebaseInstance.auth.currentUser) {
            try {
                const { doc, deleteDoc } = firebaseInstance.firestoreModule;
                await deleteDoc(doc(firebaseInstance.db, "users", firebaseInstance.auth.currentUser.uid, "history", String(identifier)));
            } catch(e) { console.error("Could not remove history from cloud", e); }
        }
        
        const historyArr = Object.values(localHistory).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
        renderContinueWatching(historyArr);
    }
};

function createProfileSwitcher(profiles) {
    if (document.getElementById('home-profile-switcher-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'home-profile-switcher-overlay';
    
    let profilesHtml = '';
    profiles.forEach((prof) => {
        const isEmoji = prof.avatar && prof.avatar.length <= 10 && !prof.avatar.includes('http') && !prof.avatar.includes('data:image');
        const avatarHtml = isEmoji 
            ? `<div class="switcher-avatar-img">${prof.avatar}</div>` 
            : `<img class="switcher-avatar-img" src="${prof.avatar}" alt="${prof.name}">`;
        
        profilesHtml += `
            <div class="profile-select-card" data-id="${prof.id}">
                ${avatarHtml}
                <span class="switcher-name">${prof.name}</span>
            </div>
        `;
    });

    overlay.innerHTML = `<h2 class="switcher-title">Who's watching?</h2><div class="profiles-list">${profilesHtml}</div>`;
    document.body.appendChild(overlay);

    const cards = overlay.querySelectorAll('.profile-select-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            localStorage.setItem('dramakan_profile_prompt_date', new Date().toDateString());
            localStorage.setItem('dramakan_active_profile_id', card.getAttribute('data-id'));
            
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 800);
            window.dispatchEvent(new CustomEvent('profileSelected'));
        });
    });
}

function updateHeaderAvatar(profiles) {
    const activeId = localStorage.getItem('dramakan_active_profile_id');
    let activeProf = profiles[0]; 
    
    if (activeId) {
        const found = profiles.find(p => p.id === activeId);
        if (found) activeProf = found;
    }

    const avatarUrl = activeProf.avatar;
    const authBtn = document.getElementById('topAuthBtn'); 
    const bottomAuthBtn = document.getElementById('bottomAuthBtn');

    let avatarHtml = '';
    if (avatarUrl && avatarUrl.length <= 10 && !avatarUrl.includes('http') && !avatarUrl.includes('data:image')) {
        avatarHtml = `<div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; box-shadow: 0 4px 15px rgba(138, 43, 226, 0.4); transition: transform 0.3s ease; color: #fff;">${avatarUrl}</div>`;
    } else {
        avatarHtml = `<img src="${avatarUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); box-shadow: 0 4px 15px rgba(138, 43, 226, 0.4); transition: transform 0.3s ease;">`;
    }

    if (authBtn) {
        authBtn.href = "profile.html";
        authBtn.innerHTML = avatarHtml; 
        authBtn.style.padding = "0"; 
        authBtn.style.background = "transparent";
        authBtn.style.border = "none";
        authBtn.onmouseover = () => authBtn.firstElementChild.style.transform = "scale(1.1)";
        authBtn.onmouseout = () => authBtn.firstElementChild.style.transform = "scale(1)";
    }
    
    if (bottomAuthBtn) {
        const navIcon = bottomAuthBtn.querySelector('.nav-icon');
        if (navIcon) {
            if (avatarUrl && avatarUrl.length <= 10 && !avatarUrl.includes('http') && !avatarUrl.includes('data:image')) {
                navIcon.outerHTML = `<div class="nav-icon" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 4px; border: 1px solid var(--primary-color); color: #fff;">${avatarUrl}</div>`;
            } else {
                navIcon.outerHTML = `<img src="${avatarUrl}" class="nav-icon" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; margin-bottom: 4px; border: 1px solid var(--primary-color);">`;
            }
        }
        bottomAuthBtn.href = "profile.html";
    }
}

// Global My List Toggle (Synchronizes with Firebase)
window.toggleMyList = async function(btnElement, titleSafe, imgSafe, linkSafe, rawId) {
    if(!rawId) return; 
    
    let profileMyList = JSON.parse(localStorage.getItem('dramakan_mylist')) || [];
    let watchlistObj = JSON.parse(localStorage.getItem('dramakan_watchlist')) || {};

    const title = decodeURIComponent(titleSafe);
    const img = decodeURIComponent(imgSafe);
    const link = decodeURIComponent(linkSafe);
    let inListIdx = profileMyList.findIndex(item => String(item.id) === String(rawId));
    
    if (inListIdx > -1) {
        profileMyList.splice(inListIdx, 1);
        delete watchlistObj[rawId];
        btnElement.classList.remove('active');
        btnElement.innerHTML = `<i class="fas fa-plus"></i> <span>My List</span>`;
    } else {
        const itemData = { id: String(rawId), title: title, img: img, link: link, timestamp: Date.now() };
        profileMyList.push(itemData);
        watchlistObj[rawId] = itemData;
        btnElement.classList.add('active');
        btnElement.innerHTML = `<i class="fas fa-check"></i> <span>In List</span>`;
    }
    localStorage.setItem('dramakan_mylist', JSON.stringify(profileMyList));
    localStorage.setItem('dramakan_watchlist', JSON.stringify(watchlistObj));
    
    if (firebaseInstance && firebaseInstance.auth.currentUser) {
        try {
            const user = firebaseInstance.auth.currentUser;
            const { doc, getDoc, updateDoc } = firebaseInstance.firestoreModule;
            const userRef = doc(firebaseInstance.db, "users", user.uid);
            
            const snap = await getDoc(userRef);
            if(snap.exists()) {
                let data = snap.data();
                if(data.profiles && data.profiles.length > 0) {
                    let activeId = localStorage.getItem('dramakan_active_profile_id');
                    let pIdx = data.profiles.findIndex(p => p.id === activeId);
                    if(pIdx === -1) pIdx = 0;
                    data.profiles[pIdx].myList = profileMyList;
                    await updateDoc(userRef, { profiles: data.profiles });
                } else {
                    await updateDoc(userRef, { myList: profileMyList });
                }
            }
        } catch(err) { console.error("Cloud list sync failed", err); }
    }
};

// --- 3. AUTHENTICATION & SYNC LAYER ---
async function initAuthSync() {
    try {
        const { auth, db, firestoreModule, authModule } = await getFirebase();
        const { doc, getDoc, collection, onSnapshot } = firestoreModule;
        const { onAuthStateChanged } = authModule;

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docSnap = await getDoc(doc(db, "users", user.uid));
                    let userProfiles = [];
                    let legacyAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.displayName || user.email || "User")}`;
                    
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.avatarUrl) legacyAvatar = data.avatarUrl;
                        
                        if (data.profiles && data.profiles.length > 0) {
                            userProfiles = data.profiles;
                            if (userProfiles[0].avatar.includes('Netflix-avatar.png') || !userProfiles[0].avatar) {
                                userProfiles[0].avatar = legacyAvatar;
                            }
                        } else {
                            userProfiles = [{ id: 'prof_default', name: data.username || "User", avatar: legacyAvatar }];
                        }
                        
                        const now = Date.now();
                        let activePlan = "Basic";
                        if (data.isPremium && data.premiumExpiry > now) {
                            activePlan = data.premiumPlan || "Elite_VIP_35";
                        }
                    
                        const headerVipBtn = document.querySelector('.vip-header-btn');
                        if (headerVipBtn) {
                            if (activePlan.includes('Crown')) {
                                headerVipBtn.style.display = 'none'; 
                            } else if (activePlan.includes('Elite')) {
                                headerVipBtn.className = 'vip-header-btn status-crown';
                                headerVipBtn.innerHTML = '<i class="fas fa-arrow-up"></i> Upgrade Crown';
                                headerVipBtn.style.display = 'inline-flex';
                            } else {
                                headerVipBtn.className = 'vip-header-btn status-basic';
                                headerVipBtn.innerHTML = '<i class="fas fa-bolt"></i> Upgrade VIP';
                                headerVipBtn.style.display = 'inline-flex';
                            }
                        }
                    
                        const hasClaimedTrial = data.trialClaimed === true;
                        const isPremiumActive = data.isPremium && data.premiumExpiry > now;
                        
                        if (hasClaimedTrial || isPremiumActive) {
                            localStorage.setItem('dramakan_promo_closed', 'true');
                            const blockStyle = document.createElement('style');
                            blockStyle.innerHTML = '#dramakan-bottom-promo, .promo-banner, #promoBanner { display: none !important; }';
                            document.head.appendChild(blockStyle);
                        }
                    }

                    const todayStr = new Date().toDateString();
                    const lastPromptDate = localStorage.getItem('dramakan_profile_prompt_date');

                    if (lastPromptDate !== todayStr && userProfiles.length > 0) {
                        createProfileSwitcher(userProfiles);
                    } else {
                        updateHeaderAvatar(userProfiles);
                    }

                    window.addEventListener('profileSelected', () => { updateHeaderAvatar(userProfiles); });

                    // Real-Time Cloud History Sync
                    const historyRef = collection(db, "users", user.uid, "history");
                    if(unsubscribeHistory) unsubscribeHistory(); 
                    
                    unsubscribeHistory = onSnapshot(historyRef, (snapshot) => {
                        let cloudHistory = {};
                        snapshot.forEach(doc => {
                            const histData = doc.data();
                            if(histData && histData.dramaId) {
                                histData.id = String(histData.dramaId);
                                cloudHistory[histData.id] = histData;
                            }
                        });
                        
                        localStorage.setItem('dramakan_history', JSON.stringify(cloudHistory));
                        const historyArr = Object.values(cloudHistory)
                            .filter(item => item && item.link && item.title && !item.link.toLowerCase().includes('index.html'))
                            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
                        
                        renderContinueWatching(historyArr);
                    });

                } catch (error) { console.error("Auth UI Error:", error); }
            } else {
                const authBtn = document.getElementById('topAuthBtn');
                if (authBtn) {
                    authBtn.href = "login.html";
                    authBtn.innerHTML = `<i class="fas fa-user"></i> <span>Login / Sign Up</span>`;
                    authBtn.style.cssText = ""; 
                }
                if(unsubscribeHistory) {
                    unsubscribeHistory();
                    unsubscribeHistory = null;
                }
                renderContinueWatching(); 
            }
        });
    } catch (err) { console.error("Failed to initialize Auth Sync", err); }
}
initAuthSync();


// --- 4. MASTER DOMContentLoaded INITIALIZER ---
document.addEventListener('DOMContentLoaded', () => {

    // Helper functions
    function shuffleArray(array) {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function populateGrid(elementId, items) {
        const grid = document.getElementById(elementId);
        if (!grid) return;
        
        let htmlContent = '';
        items.forEach((drama, index) => {
            const safeTitle = encodeURIComponent(drama.title);
            const safeImg = encodeURIComponent(drama.img);
            const safeLink = encodeURIComponent(drama.link);
            
            htmlContent += `
            <a href="${drama.link}" class="drama-card">
                <div class="drama-card-img"><img src="${drama.img}" alt="${drama.title}" loading="lazy" decoding="async"></div>
                <div class="drama-card-info">
                    <h3 class="drama-card-title">${drama.title}</h3>
                    <p class="drama-card-meta">${drama.type}</p>
                </div>
                <button class="bookmark-btn" onclick="event.preventDefault(); window.toggleMyList(this, '${safeTitle}', '${safeImg}', '${safeLink}', '${drama.id || drama.tmdbId || ''}')" title="Add to My List">
                    <i class="fas fa-plus"></i>
                </button>
            </a>`;

            // Ad injection loop
            if (index === 2 && ['trending-grid', 'everything-drama-grid', 'movie-grid', 'shows-grid', 'asian-grid', 'anime-grid'].includes(elementId)) {
                let adSlot = "8531757983"; 
                let layoutKey = "-6t+ed+2i-1n-4w"; 
                
                if (elementId === 'everything-drama-grid') { adSlot = "2322807703"; layoutKey = "+21+s4-18-23+8q"; } 
                else if (elementId === 'asian-grid') { adSlot = "6975017511"; layoutKey = "+2a+rx+1+2-3"; }
                
                htmlContent += `
                <div class="drama-card ad-card-wrapper">
                    <ins class="adsbygoogle" style="display:block; width:100%; height:100%;" 
                        data-ad-format="fluid" data-ad-layout-key="${layoutKey}" 
                        data-ad-client="ca-pub-3854581977852778" data-ad-slot="${adSlot}"></ins>
                </div>`;
            }
        });

        grid.innerHTML = htmlContent;
        setTimeout(() => {
            const uninitializedAds = grid.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status="done"])');
            uninitializedAds.forEach(() => { try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){} });
        }, 500);
    }

    // A. Mobile Menu Toggle
    const menuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            overlay.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) { icon.classList.toggle('fa-bars'); icon.classList.toggle('fa-times'); }
        });
        overlay.addEventListener('click', () => {
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            if (menuToggle.querySelector('i')) menuToggle.querySelector('i').className = 'fas fa-bars'; 
        });
    }

    // B. Main Data Initialization (Grids & Search)
    let fuse;
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    async function initializeDramaSite() {
        try {
            const response = await fetch('/dramas.json');
            const data = await response.json();
            
            localStorage.setItem('dramakan_master_db', JSON.stringify(data));
            fuse = new Fuse(data, { keys: ['title'], threshold: 0.4 });
            
            try {
                const trendResponse = await fetch('https://api.2embed.cc/trendingtv');
                if (!trendResponse.ok) throw new Error(`HTTP error! status: ${trendResponse.status}`);
                const trendData = await trendResponse.json();
                
                const apiTrendingItems = (trendData.results || []).slice(0, 15).map(item => ({
                    id: String(item.tmdb_id),
                    title: item.name || item.title || "Unknown Title",
                    img: item.poster || 'https://via.placeholder.com/500x750?text=No+Image',
                    link: item.embed_tmdb || `details.html?id=${item.tmdb_id}`, 
                    type: "Trending"
                }));
                populateGrid('trending-grid', apiTrendingItems);
            } catch (err) {
                console.error("2embed API failed, using fallback:", err);
                let fallbackItems = data.filter(d => d.Trend === "T" || d.trending === true);
                if (fallbackItems.length === 0) fallbackItems = data;
                populateGrid('trending-grid', fallbackItems.slice(0, 15));
            }

            const gridConfigs = [
                { id: 'everything-drama-grid', filterType: "Everything Drama" },
                { id: 'movie-grid', filterType: "Movie" },
                { id: 'shows-grid', filterType: "Shows" },
                { id: 'asian-grid', filterType: "Asian" },
                { id: 'anime-grid', filterType: "Anime" },
                { id: 'upcoming-grid', isUpcoming: true }
            ];

            const gridObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const targetId = entry.target.id;
                        const config = gridConfigs.find(c => c.id === targetId);

                        if (config) {
                            let sectionData = config.isUpcoming 
                                ? shuffleArray(data.filter(d => d.status === "Upcoming" || d.release_date === "Upcoming")).slice(0, 15)
                                : shuffleArray(data.filter(d => d.type === config.filterType)).slice(0, 15);
                            
                            const safeSectionData = sectionData.map(item => ({...item, id: String(item.id || item.tmdbId)}));
                            populateGrid(targetId, safeSectionData);
                            observer.unobserve(entry.target);
                        }
                    }
                });
            }, { rootMargin: '300px' });

            gridConfigs.forEach(config => {
                const el = document.getElementById(config.id);
                if (el) gridObserver.observe(el);
            });
        } catch (err) { console.error("JSON Load Error:", err); }
    }

    if (searchInput) {
        let debounceTimer; 
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer); 
            debounceTimer = setTimeout(() => {
                const query = searchInput.value.trim();
                if (query.length < 1 || !fuse) { searchResults.style.display = 'none'; return; }
                
                const results = fuse.search(query, { limit: 10 });
                searchResults.innerHTML = results.map(({ item }) => {
                    return `
                    <a href="${item.link}" class="search-result-item">
                        <img src="${item.img}" width="45" height="60" loading="lazy" decoding="async">
                        <div><div class="search-result-title">${item.title}</div><small style="color:var(--primary-color);">${item.type}</small></div>
                    </a>`;
                }).join('');
                searchResults.style.display = 'block';
            }, 300); 
        });
    }

    // C. Scroll Animations Setup
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); 
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.15 });

    document.querySelectorAll('.latest-episodes').forEach(section => {
        section.classList.add('fade-in-section');
        sectionObserver.observe(section);
    });

    // D. Drama Request Modal 
    const dramaModal = document.getElementById("dramaModal");
    const dramaRequestBtn = document.getElementById("dramaRequestBtn");
    const closeDramaModal = document.getElementById("closeDramaModal");
    const dramaForm = document.getElementById("dramaRequestForm");

    if (dramaRequestBtn && dramaModal) {
        dramaRequestBtn.onclick = async () => {
            const { auth } = await getFirebase();
            if (!auth.currentUser) {
                alert("You must be logged in to request content. Redirecting to Login...");
                window.location.href = "login.html";
            } else { dramaModal.style.display = "flex"; }
        };
        closeDramaModal.onclick = () => dramaModal.style.display = "none";
        window.addEventListener('click', (e) => { if(e.target === dramaModal) dramaModal.style.display = "none"; });
    }

    if (dramaForm) {
        dramaForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById("submitBtn");
            const status = document.getElementById("statusMessage");
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            try {
                const { auth, db, firestoreModule } = await getFirebase();
                const { collection, addDoc } = firestoreModule;
                const user = auth.currentUser;
                
                if (!user) throw new Error("Authentication expired. Please login again.");
                
                await addDoc(collection(db, "requests"), {
                    userId: user.uid,
                    userEmail: user.email || "No email provided", 
                    dramaName: document.getElementById("dramaName").value.trim(),
                    status: "Pending",
                    notified: false, 
                    createdAt: Date.now()
                });

                status.style.display = "block";
                status.style.color = "#10b981";
                status.innerHTML = "<i class='fas fa-check-circle'></i> Request securely sent! Check your Profile later.";
                dramaForm.reset();
            } catch (err) {
                console.error("FIREBASE ERROR:", err);
                status.style.display = "block";
                status.style.color = "#ef4444";
                status.innerHTML = "<i class='fas fa-exclamation-circle'></i> Error: " + err.message;
            } finally {
                submitBtn.innerText = "Send Request";
                submitBtn.disabled = false;
            }
        };
    }

    // E. Auth Modal Handling
    const authModal = document.getElementById("authModal");
    const closeAuthModal = document.getElementById("closeAuthModal");
    const authForm = document.getElementById("authForm");
    
    let isLogin = true;
    function bindAuthToggle() {
        const authToggleBtn = document.getElementById("authToggleBtn");
        if(authToggleBtn) {
            authToggleBtn.addEventListener("click", () => {
                isLogin = !isLogin;
                const nameInputGroup = document.getElementById("nameInputGroup");
                if(isLogin) {
                    document.getElementById("authTitle").innerText = "Welcome Back";
                    document.getElementById("authSubtitle").innerText = "Login to continue your journey";
                    nameInputGroup.style.display = "none";
                    document.getElementById("authName").removeAttribute("required");
                    document.getElementById("authSubmitBtn").innerText = "Login";
                    document.getElementById("authToggleText").innerHTML = `Don't have an account? <span id="authToggleBtn" class="auth-toggle-link">Sign Up</span>`;
                } else {
                    document.getElementById("authTitle").innerText = "Create Account";
                    document.getElementById("authSubtitle").innerText = "Join us and start tracking your favorites";
                    nameInputGroup.style.display = "block";
                    document.getElementById("authName").setAttribute("required", "true");
                    document.getElementById("authSubmitBtn").innerText = "Sign Up";
                    document.getElementById("authToggleText").innerHTML = `Already have an account? <span id="authToggleBtn" class="auth-toggle-link">Login</span>`;
                }
                bindAuthToggle(); 
            });
        }
    }
    bindAuthToggle();

    if(closeAuthModal) closeAuthModal.onclick = () => authModal.style.display = "none";
    window.addEventListener("click", (e) => { if(e.target === authModal) authModal.style.display = "none"; });

    function handleAuthInteraction(e) {
        if (this.innerText.includes("Login") || (this.innerHTML.includes("fa-user") && !this.innerHTML.includes("img"))) {
            e.preventDefault();
            authModal.style.display = "flex";
        }
    }

    const topAuthBtn = document.getElementById("topAuthBtn");
    const bottomAuthBtn = document.getElementById("bottomAuthBtn");
    if (topAuthBtn) topAuthBtn.addEventListener("click", handleAuthInteraction);
    if (bottomAuthBtn) bottomAuthBtn.addEventListener("click", handleAuthInteraction);

    if (authForm) {
        authForm.onsubmit = (e) => {
            e.preventDefault();
            const status = document.getElementById("authStatusMessage");
            const btn = document.getElementById("authSubmitBtn");
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;

            setTimeout(() => {
                status.style.display = "block";
                status.style.color = "#10b981";
                status.innerHTML = `<i class='fas fa-check-circle'></i> ${isLogin ? 'Login successful!' : 'Account created!'}`;
                
                setTimeout(() => { 
                    authModal.style.display = "none"; 
                    status.style.display = "none";
                    btn.innerText = isLogin ? "Login" : "Sign Up";
                    btn.disabled = false;
                    authForm.reset();
                }, 1500);
            }, 1000);
        };
    }

    // F. App Install Popup
    const installPopup = document.getElementById('appInstallPopup');
    const closeInstallBtn = document.getElementById('closeInstallPopup');
    if (installPopup && closeInstallBtn) {
        if (sessionStorage.getItem('hideInstallPopup') === 'true') installPopup.classList.add('hidden');
        closeInstallBtn.addEventListener('click', () => {
            installPopup.classList.add('hidden');
            sessionStorage.setItem('hideInstallPopup', 'true');
        });
    }

    // G. Ad-Free Reward System Check
    const adFreeKey = 'dramakan_ad_free_expiry';
    function checkAdFreeStatus() {
        const expiry = localStorage.getItem(adFreeKey);
        if (expiry && Date.now() < parseInt(expiry)) {
            document.body.classList.add('premium-ad-free-mode');
            const btn = document.getElementById('adFreeBtn');
            if(btn) btn.innerHTML = '<i class="fas fa-check"></i> Ad-Free Active';
        }
    }
    checkAdFreeStatus();

    const adFreeBtn = document.getElementById('adFreeBtn');
    if (adFreeBtn) {
        adFreeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert("Watch this short sponsor message to unlock 24 Hours of Ad-Free streaming!");
            setTimeout(() => {
                localStorage.setItem(adFreeKey, Date.now() + (24 * 60 * 60 * 1000));
                alert("Thank you! Enjoy 24 hours of uninterrupted, ad-free streaming.");
                location.reload(); 
            }, 2000); 
        });
    }

    // Final Init trigger
    initializeDramaSite();
});

// --- 5. SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { 
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Failed', err)); 
    });
}

// --- 6. NETFLIX HOVER AUTOPLAY TRAILERS (Global Listener) ---
const trailerCache = new Map();
document.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.drama-card');
    if (!card || window.innerWidth <= 992) return;

    card.hoverTimer = setTimeout(async () => {
        const imgWrap = card.querySelector('.drama-card-img');
        if (!imgWrap || imgWrap.querySelector('.card-hover-video')) return;

        const id = card.dataset.id;
        const type = card.dataset.type || 'tv';
        if (!id || id === 'undefined') return;

        try {
            let trailerKey = trailerCache.get(`${type}_${id}`);

            if (!trailerKey) {
                const res = await fetch(`https://dramakan-tmdb-proxy.zabaazcreations.workers.dev//3/${type}/${id}/videos?api_key=${tmdbKey}`);
                if (res.ok) {
                    const data = await res.json();
                    const results = data.results || [];
                    const trailer = results.find(v => v.type === 'Trailer' && v.site === 'YouTube') || results.find(v => v.site === 'YouTube') || results[0];
                    if (trailer && trailer.key) {
                        trailerKey = trailer.key;
                        trailerCache.set(`${type}_${id}`, trailerKey);
                    }
                }
            }

            if (trailerKey && !imgWrap.querySelector('.card-hover-video')) {
                const iframe = document.createElement('iframe');
                iframe.className = 'card-hover-video';
                iframe.src = `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerKey}&playsinline=1&rel=0`;
                iframe.setAttribute('allow', 'autoplay; encrypted-media');
                iframe.setAttribute('frameborder', '0');
                imgWrap.appendChild(iframe);
            }
        } catch (err) { console.warn('Trailer autoplay failed:', err); }
    }, 700); 
}, true);

document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.drama-card');
    if (card) {
        clearTimeout(card.hoverTimer);
        const iframe = card.querySelector('.card-hover-video');
        if (iframe) iframe.remove(); 
    }
}, true);

