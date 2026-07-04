// --- 0. THEME, HARDWARE & CSS FIXES (RUNS IMMEDIATELY) ---
(function initUI() {
    const injectedStyles = document.createElement('style');
    injectedStyles.innerHTML = `
        /* FIX: Prevent search text from overlapping icons */
        #searchInput { padding: 10px 40px 10px 40px !important; }
        .search-bar i.fa-search, .search-filter-link { pointer-events: none; z-index: 2; }
        
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

const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

let firebaseInstance = null;
let unsubscribeHistory = null; // Store listener globally to handle cleanup

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

// --- NEW CLOUD-FIRST CONTINUE WATCHING RENDERER ---
function renderContinueWatching(cloudHistoryArr = null) {
    try {
        let historyArr = cloudHistoryArr;
        
        // Fallback to local storage only if cloud isn't passed (guest user)
        if (!historyArr) {
            const historyObj = JSON.parse(localStorage.getItem('dramakan_history')) || {};
            historyArr = Object.values(historyObj)
                .filter(item => item && item.link && item.title && !item.link.toLowerCase().includes('index.html'))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 10);
        }
        
        const cwSection = document.getElementById('continue-watching-section');
        const cwGrid = document.getElementById('continue-watching-grid');
        
        if (cwSection && cwGrid) {
            if(historyArr.length > 0) {
                cwSection.style.display = 'block';
                cwGrid.innerHTML = historyArr.map(item => `
                    <a href="${item.link}" class="drama-card" style="border-color: rgba(138, 43, 226, 0.4);">
                        <div class="drama-card-img"><img src="${item.img}" alt="${item.title}" loading="lazy" decoding="async"></div>
                        <div class="drama-card-info">
                            <h3 class="drama-card-title">${item.title}</h3>
                            <p class="drama-card-meta" style="color: var(--primary-color);"><i class="fas fa-play"></i> Resume S${item.season || 1}:E${item.episode || 1}</p>
                        </div>
                    </a>
                `).join('');
            } else {
                cwSection.style.display = 'none';
            }
        }
    } catch(e) { console.error("CW Render Error:", e); }
}

document.addEventListener('DOMContentLoaded', function () {

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
            if (menuToggle.querySelector('i')) { menuToggle.querySelector('i').className = 'fas fa-bars'; }
        });
    }

    function shuffleArray(array) {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    let fuse;
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

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
            </a>
            `;

            if (index === 2) {
                if (['trending-grid', 'kdrama-grid', 'cdrama-grid', 'jdrama-grid', 'Movie-grid'].includes(elementId)) {
                    let adSlot = "8531757983"; 
                    let layoutKey = "-6t+ed+2i-1n-4w"; 
                    
                    if (elementId === 'kdrama-grid') {
                        adSlot = "2322807703"; layoutKey = "+21+s4-18-23+8q";
                    } else if (elementId === 'jdrama-grid') {
                        adSlot = "6975017511"; layoutKey = "+2a+rx+1+2-3";
                    } else if (elementId === 'cdrama-grid') {
                        adSlot = "[INSERT_CDRAMA_INFEED_ID_HERE]";
                    } else if (elementId === 'trending-grid') {
                        adSlot = "[INSERT_TRENDING_INFEED_ID_HERE]";
                    } else if (elementId === 'Movie-grid') {
                        adSlot = "[INSERT_MOVIE_INFEED_ID_HERE]";
                    }

                    htmlContent += `
                    <div class="drama-card ad-card-wrapper">
                        <ins class="adsbygoogle" 
                            style="display:block; width:100%; height:100%;" 
                            data-ad-format="fluid" 
                            data-ad-layout-key="${layoutKey}" 
                            data-ad-client="ca-pub-3854581977852778" 
                            data-ad-slot="${adSlot}"></ins>
                    </div>`;
                }
            }
        });

        grid.innerHTML = htmlContent;

        setTimeout(() => {
            const uninitializedAds = grid.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status="done"])');
            uninitializedAds.forEach(() => {
                try { (adsbygoogle = window.adsbygoogle || []).push({}); } 
                catch (e) { console.error("Dynamic Ad Init Error", e); }
            });
        }, 500);
    }

    // --- CLOUD-FIRST GLOBAL MY LIST TOGGLE ---
    window.toggleMyList = async function(btnElement, titleSafe, imgSafe, linkSafe, rawId) {
        if(!rawId) return; // Fail safe
        
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
            const itemData = {
                id: String(rawId), title: title, img: img, link: link, timestamp: Date.now()
            };
            profileMyList.push(itemData);
            watchlistObj[rawId] = itemData;
            btnElement.classList.add('active');
            btnElement.innerHTML = `<i class="fas fa-check"></i> <span>In List</span>`;
        }
        localStorage.setItem('dramakan_mylist', JSON.stringify(profileMyList));
        localStorage.setItem('dramakan_watchlist', JSON.stringify(watchlistObj));
        
        // Instantly sync up to Firebase as the absolute source of truth
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

    async function initializeDramaSite() {
        let data = [];
        try {
            const response = await fetch('/dramas.json');
            data = await response.json();
            
            localStorage.setItem('dramakan_master_db', JSON.stringify(data));
            fuse = new Fuse(data, { keys: ['title'], threshold: 0.4 });
            
            try {
                const trendResponse = await fetch('https://api.2embed.cc/trendingtv');
                if (!trendResponse.ok) throw new Error(`HTTP error! status: ${trendResponse.status}`);
                const trendData = await trendResponse.json();
                
                const resultsArray = trendData.results || [];
                if (resultsArray.length === 0) throw new Error("No results found in API response.");

                const apiTrendingItems = resultsArray.slice(0, 15).map(item => ({
                    id: String(item.tmdb_id),
                    title: item.name || item.title || "Unknown Title",
                    img: item.poster || 'https://via.placeholder.com/500x750?text=No+Image',
                    link: item.embed_tmdb || `details.html?id=${item.tmdb_id}`, 
                    type: "Trending TV"
                }));
                
                populateGrid('trending-grid', apiTrendingItems);
                
            } catch (err) {
                console.error("2embed API failed, using fallback:", err);
                let fallbackItems = data.filter(d => d.Trend === "T" || d.trending === true);
                if (fallbackItems.length === 0) fallbackItems = data;
                populateGrid('trending-grid', fallbackItems.slice(0, 15));
            }

            const gridConfigs = [
                { id: 'kdrama-grid', filterType: "K-Drama" },
                { id: 'cdrama-grid', filterType: "C-Drama" },
                { id: 'jdrama-grid', filterType: "J-Drama" },
                { id: 'pdrama-grid', filterType: "P-Drama" },
                { id: 'tdrama-grid', filterType: "T-Drama" },
                { id: 'turkishdrama-grid', filterType: "Turkish-Drama" },
                { id: 'usdrama-grid', filterType: "US-Drama" },
                { id: 'Movie-grid', filterType: "Movie" },
                { id: 'upcoming-grid', isUpcoming: true }
            ];

            const gridObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const targetId = entry.target.id;
                        const config = gridConfigs.find(c => c.id === targetId);

                        if (config) {
                            let sectionData = [];
                            if (config.isUpcoming) {
                                sectionData = shuffleArray(data.filter(d => d.status === "Upcoming" || d.release_date === "Upcoming")).slice(0, 15);
                            } else {
                                sectionData = shuffleArray(data.filter(d => d.type === config.filterType)).slice(0, 15);
                            }
                            
                            // Map existing JSON data ids explicitly as strings
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

    const sliderWrapper = document.querySelector('.slider-wrapper');
    if (sliderWrapper) {
        let slideIndex = 0;
        const heroSlides = document.querySelectorAll('.slide');
        const prevBtn = document.getElementById('prevSlide');
        const nextBtn = document.getElementById('nextSlide');
        let autoSlideInterval;
        let isAnimating = false; 

        function initSlider() {
            if (window.innerWidth <= 992 && heroSlides.length > 1) {
                sliderWrapper.prepend(sliderWrapper.lastElementChild);
                sliderWrapper.style.transition = 'none';
                sliderWrapper.style.transform = `translateX(-100%)`;
                Array.from(sliderWrapper.children).forEach(s => s.classList.remove('active'));
                sliderWrapper.children[1].classList.add('active');
            }
            startAutoSlide();
        }

        function moveNext() {
            if (isAnimating) return;
            isAnimating = true;

            if (window.innerWidth <= 992 && heroSlides.length > 1) {
                sliderWrapper.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
                sliderWrapper.style.transform = `translateX(-200%)`;
                sliderWrapper.children[1].classList.remove('active');
                sliderWrapper.children[2].classList.add('active');

                setTimeout(() => {
                    sliderWrapper.style.transition = 'none';
                    sliderWrapper.appendChild(sliderWrapper.firstElementChild);
                    sliderWrapper.style.transform = `translateX(-100%)`;
                    isAnimating = false;
                }, 700);
            } else {
                slideIndex = (slideIndex + 1) % heroSlides.length;
                sliderWrapper.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
                sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
                setTimeout(() => { isAnimating = false; }, 700);
            }
        }

        function movePrev() {
            if (isAnimating) return;
            isAnimating = true;

            if (window.innerWidth <= 992 && heroSlides.length > 1) {
                sliderWrapper.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
                sliderWrapper.style.transform = `translateX(0%)`;
                sliderWrapper.children[1].classList.remove('active');
                sliderWrapper.children[0].classList.add('active');

                setTimeout(() => {
                    sliderWrapper.style.transition = 'none';
                    sliderWrapper.prepend(sliderWrapper.lastElementChild);
                    sliderWrapper.style.transform = `translateX(-100%)`;
                    isAnimating = false;
                }, 700);
            } else {
                slideIndex = (slideIndex - 1 + heroSlides.length) % heroSlides.length;
                sliderWrapper.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
                sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
                setTimeout(() => { isAnimating = false; }, 700);
            }
        }

        function startAutoSlide() { clearInterval(autoSlideInterval); autoSlideInterval = setInterval(moveNext, window.innerWidth <= 992 ? 3500 : 5000); }
        function resetAutoSlide() { startAutoSlide(); }

        if (nextBtn) nextBtn.addEventListener('click', () => { moveNext(); resetAutoSlide(); });
        if (prevBtn) prevBtn.addEventListener('click', () => { movePrev(); resetAutoSlide(); });

        let startX = 0;
        let isDragging = false;
        let dragThresholdMet = false;

        function handleDragStart(e) {
            if (isAnimating) return;
            isDragging = true; dragThresholdMet = false;
            startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
            clearInterval(autoSlideInterval); 
        }

        function handleDragMove(e) {
            if (!isDragging) return;
            const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
            if (Math.abs(startX - currentX) > 10) dragThresholdMet = true; 
        }

        function handleDragEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            const endX = e.type.includes('mouse') ? e.pageX : e.changedTouches[0].clientX;
            const diffX = startX - endX;
            if (Math.abs(diffX) > 50) { if (diffX > 0) moveNext(); else movePrev(); }
            resetAutoSlide(); 
        }

        sliderWrapper.addEventListener('touchstart', handleDragStart, { passive: true });
        sliderWrapper.addEventListener('touchmove', handleDragMove, { passive: true });
        sliderWrapper.addEventListener('touchend', handleDragEnd);
        
        sliderWrapper.addEventListener('mousedown', handleDragStart);
        sliderWrapper.addEventListener('mousemove', handleDragMove);
        sliderWrapper.addEventListener('mouseup', handleDragEnd);
        sliderWrapper.addEventListener('mouseleave', handleDragEnd);

        heroSlides.forEach(slide => {
            slide.addEventListener('click', (e) => {
                if (dragThresholdMet) { e.preventDefault(); return; }
                if (window.innerWidth <= 992 && !slide.classList.contains('active')) return;
                const btn = slide.querySelector('.btn-primary');
                const mobileLink = slide.querySelector('a[href^="details.html"]');
                if (btn) window.location.href = btn.getAttribute('href');
                else if (mobileLink) window.location.href = mobileLink.getAttribute('href');
            });
        });

        initSlider();
    }

    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    document.querySelectorAll('.latest-episodes').forEach(section => {
        section.classList.add('fade-in-section');
        sectionObserver.observe(section);
    });

    initializeDramaSite();
});

document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("dramaModal");
    const openBtn = document.getElementById("dramaRequestBtn");
    const closeBtn = document.getElementById("closeDramaModal");
    const form = document.getElementById("dramaRequestForm");

    if(openBtn && modal) {
        openBtn.onclick = async () => {
            const { auth } = await getFirebase();
            if (!auth.currentUser) {
                alert("You must be logged in to request a drama. Redirecting to Login...");
                window.location.href = "login.html";
            } else { modal.style.display = "flex"; }
        };
        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (e) => { if(e.target === modal) modal.style.display = "none"; }
    }

    if(form) {
        form.onsubmit = async (e) => {
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
                
                const dramaName = document.getElementById("dramaName").value.trim();
                await addDoc(collection(db, "requests"), {
                    userId: user.uid,
                    userEmail: user.email || "No email provided", 
                    dramaName: dramaName,
                    status: "Pending",
                    notified: false, 
                    createdAt: new Date().getTime()
                });

                status.style.display = "block";
                status.style.color = "#10b981";
                status.innerHTML = "<i class='fas fa-check-circle'></i> Request securely sent! Check your Profile later.";
                form.reset();

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
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Failed', err)); });
}

document.addEventListener("DOMContentLoaded", function() {
    const installPopup = document.getElementById('appInstallPopup');
    const closeInstallBtn = document.getElementById('closeInstallPopup');
    if (installPopup && closeInstallBtn) {
        if (sessionStorage.getItem('hideInstallPopup') === 'true') installPopup.classList.add('hidden');
        closeInstallBtn.addEventListener('click', () => {
            installPopup.classList.add('hidden');
            sessionStorage.setItem('hideInstallPopup', 'true');
        });
    }
});

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

    overlay.innerHTML = `
        <h2 class="switcher-title">Who's watching?</h2>
        <div class="profiles-list">
            ${profilesHtml}
        </div>
    `;
    document.body.appendChild(overlay);

    const cards = overlay.querySelectorAll('.profile-select-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const selectedId = card.getAttribute('data-id');
            
            const todayStr = new Date().toDateString();
            localStorage.setItem('dramakan_profile_prompt_date', todayStr);
            localStorage.setItem('dramakan_active_profile_id', selectedId);
            
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
                            const existingPromo = document.getElementById('dramakan-bottom-promo');
                            if(existingPromo) existingPromo.style.display = 'none';
                        }
                    }

                    const todayStr = new Date().toDateString();
                    const lastPromptDate = localStorage.getItem('dramakan_profile_prompt_date');

                    if (lastPromptDate !== todayStr && userProfiles.length > 0) {
                        createProfileSwitcher(userProfiles);
                    } else {
                        updateHeaderAvatar(userProfiles);
                    }

                    window.addEventListener('profileSelected', () => {
                        updateHeaderAvatar(userProfiles);
                    });

                    // --- REAL-TIME CLOUD HISTORY SYNC ---
                    const historyRef = collection(db, "users", user.uid, "history");
                    if(unsubscribeHistory) unsubscribeHistory(); // Clear older bindings
                    
                    unsubscribeHistory = onSnapshot(historyRef, (snapshot) => {
                        let cloudHistory = {};
                        snapshot.forEach(doc => {
                            const histData = doc.data();
                            if(histData && histData.dramaId) {
                                // Clean up old structures and enforce string IDs for TMDB compatibility
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

                } catch (error) {
                    console.error("Auth UI Error:", error);
                }
            } else {
                const authBtn = document.getElementById('topAuthBtn');
                if (authBtn) {
                    authBtn.href = "login.html";
                    authBtn.innerHTML = `<i class="fas fa-user"></i> <span>Login / Sign Up</span>`;
                    
                    authBtn.style.padding = "";
                    authBtn.style.background = "";
                    authBtn.style.border = "";
                    authBtn.style.borderRadius = "";
                }
                
                if(unsubscribeHistory) {
                    unsubscribeHistory();
                    unsubscribeHistory = null;
                }
                renderContinueWatching(); 
            }
        });
    } catch (err) {
        console.error("Failed to initialize Auth Sync", err);
    }
}

initAuthSync();