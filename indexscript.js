// --- 0. THEME, HARDWARE & CSS FIXES (RUNS IMMEDIATELY) ---
(function initUI() {
    // Inject vital CSS fixes for the Search Bar and Profile Overlay directly so you don't need to edit CSS files
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
    `;
    document.head.appendChild(injectedStyles);

    // Hardware Power Setup (Lite Mode Fallback)
    let isLowEnd = false;
    if ('deviceMemory' in navigator && navigator.deviceMemory < 4) isLowEnd = true;
    if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 4) isLowEnd = true;
    if ('connection' in navigator && (navigator.connection.effectiveType === '3g' || navigator.connection.effectiveType === '2g')) isLowEnd = true;

    if (isLowEnd) {
        document.documentElement.classList.add('lite-mode');
        console.log("Budget device detected: Lite UI activated.");
    }
})();

// --- UNIFIED MASTER FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

// --- SINGLETON FIREBASE LOADER ---
let firebaseInstance = null;
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

document.addEventListener('DOMContentLoaded', function () {

    // --- 1. MOBILE MENU LOGIC ---
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

    // --- 2. DATA POPULATION & CAROUSELS ---
    let fuse;
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    function populateGrid(elementId, items) {
        const grid = document.getElementById(elementId);
        if (!grid) return;
        grid.innerHTML = items.map(drama => {
            const safeTitle = encodeURIComponent(drama.title);
            const safeImg = encodeURIComponent(drama.img);
            const safeLink = encodeURIComponent(drama.link);
            return `
            <a href="${drama.link}" class="drama-card">
                <div class="drama-card-img"><img src="${drama.img}" alt="${drama.title}" loading="lazy" decoding="async"></div>
                <div class="drama-card-info">
                    <h3 class="drama-card-title">${drama.title}</h3>
                    <p class="drama-card-meta">${drama.type}</p>
                </div>
                <button class="bookmark-btn" onclick="event.preventDefault(); window.toggleMyList(this, '${safeTitle}', '${safeImg}', '${safeLink}')" title="Add to My List">
                    <i class="fas fa-plus"></i>
                </button>
            </a>
        `;
        }).join('');
    }

    async function initializeDramaSite() {
        let data = [];
        try {
            const response = await fetch('/dramas.json');
            data = await response.json();
            
            localStorage.setItem('dramakan_master_db', JSON.stringify(data));
            fuse = new Fuse(data, { keys: ['title'], threshold: 0.4 });

            function renderContinueWatching() {
                try {
                    const historyObj = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                    const historyArr = Object.values(historyObj)
                        .filter(item => item && item.link && item.title && !item.link.toLowerCase().includes('index.html'))
                        .sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
                    
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
                                        <p class="drama-card-meta" style="color: var(--primary-color);"><i class="fas fa-play"></i> Resume</p>
                                    </div>
                                </a>
                            `).join('');
                        } else {
                            cwSection.style.display = 'none';
                        }
                    }
                } catch(e) { console.error("CW Render Error:", e); }
            }
            
            renderContinueWatching(); 
            window.addEventListener('historySynced', renderContinueWatching);

            populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15));

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
                            
                            populateGrid(targetId, sectionData);
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

    // --- 3. HERO SLIDER LOGIC ---
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
                const mobileLink = slide.querySelector('a[href^="watch.html"]');
                if (btn) window.location.href = btn.getAttribute('href');
                else if (mobileLink) window.location.href = mobileLink.getAttribute('href');
            });
        });

        initSlider();
    }

    // --- 4. APP-LIKE SCROLL REVEAL ---
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

// --- 5. DRAMA REQUEST MODAL ---
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

// --- 6. PWA SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Failed', err)); });
}

// --- 7. SMART APP INSTALL PROMPT LOGIC ---
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

// --- 8. AUTHENTICATION UI SYNC & WHO'S WATCHING OVERLAY ---

// Creates the "Who's Watching" Overlay dynamically
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
            
            // Mark today's date so we don't show the prompt again until tomorrow
            const todayStr = new Date().toDateString();
            localStorage.setItem('dramakan_profile_prompt_date', todayStr);
            
            localStorage.setItem('dramakan_active_profile_id', selectedId);
            
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 800);

            window.dispatchEvent(new CustomEvent('profileSelected'));
        });
    });
}

// Updates the Header UI to show only the Image
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
        authBtn.innerHTML = avatarHtml; // STRIPS OUT TEXT, LEAVES ONLY IMAGE
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

// Master Authentication Listener
async function initAuthSync() {
    try {
        const { auth, db, firestoreModule, authModule } = await getFirebase();
        const { doc, getDoc } = firestoreModule;
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
                    }

                    // Check if we already showed the prompt today
                    const todayStr = new Date().toDateString();
                    const lastPromptDate = localStorage.getItem('dramakan_profile_prompt_date');

                    // Show "Who's Watching" if it's a new day, else just render the header
                    if (lastPromptDate !== todayStr && userProfiles.length > 0) {
                        createProfileSwitcher(userProfiles);
                    } else {
                        updateHeaderAvatar(userProfiles);
                    }

                    // Update UI if user clicked a profile in the overlay
                    window.addEventListener('profileSelected', () => {
                        updateHeaderAvatar(userProfiles);
                        window.dispatchEvent(new Event('historySynced')); // Force CW section to refresh
                    });

                } catch (error) {
                    console.error("Auth UI Error:", error);
                }
            } else {
                // Completely Logged Out State
                const authBtn = document.getElementById('topAuthBtn');
                if (authBtn) {
                    authBtn.href = "login.html";
                    authBtn.innerHTML = `<i class="fas fa-user"></i> <span>Login</span>`;
                    authBtn.style.padding = "8px 24px";
                    authBtn.style.background = "var(--primary-color)";
                    authBtn.style.border = "none";
                    authBtn.style.borderRadius = "50px";
                }
            }
        });
    } catch (err) {
        console.error("Failed to initialize Auth Sync", err);
    }
}

initAuthSync();