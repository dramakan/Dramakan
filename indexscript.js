// --- 0. THEME & HARDWARE DETECTION (RUNS IMMEDIATELY) ---
(function initUI() {
    // A. Theme Setup
    const savedTheme = localStorage.getItem('dramakan_theme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    
    // Automatically apply light mode if user prefers it or previously saved it
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.documentElement.classList.add('light-mode');
    }

    // B. Hardware Power Setup (Lite Mode Fallback)
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

    // --- 0. THEME TOGGLE LISTENER ---
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (document.documentElement.classList.contains('light-mode')) icon.className = 'fas fa-moon';
        else icon.className = 'fas fa-sun';

        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('light-mode');
            const isLight = document.documentElement.classList.contains('light-mode');
            localStorage.setItem('dramakan_theme', isLight ? 'light' : 'dark');
            icon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
        });
    }

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
            // 1. CHECK CACHE AND VERSION VERSION FIRST
            const cachedDramas = localStorage.getItem('dramakan_master_db');
            const localVersion = localStorage.getItem('dramakan_db_version') || "0";
            
            const fb = await getFirebase();
            const db = fb.db;
            const firestoreModule = fb.firestoreModule;
            const { collection, getDocs, doc, getDoc, query, orderBy, limit } = firestoreModule;

            // --- THE 1-READ CHECK ---
            // We check ONE document to see if the database has been updated
            let serverVersion = "0";
            try {
                const configRef = doc(db, "system", "config");
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    serverVersion = configSnap.data().lastUpdated.toString();
                }
            } catch(e) { console.log("Version check skipped/failed.", e); }

            // If they have a cache AND the version numbers match, use the free local data!
            if (cachedDramas && localVersion === serverVersion) {
                data = JSON.parse(cachedDramas);
                console.log("Database is up to date! Loaded from LocalStorage (0 extra reads).");
            } else {
                // 2. VERSIONS DON'T MATCH OR NO CACHE? FETCH FRESH FROM FIREBASE
                console.log("New update detected! Fetching fresh dramas from Firebase...");
                const cmsSnap = await getDocs(collection(db, "dramas"));
                cmsSnap.forEach((d) => { 
                    data.push(d.data()); 
                });
                
                // Save the new data AND the new version number to their phone
                localStorage.setItem('dramakan_master_db', JSON.stringify(data));
                localStorage.setItem('dramakan_db_version', serverVersion);
            }

            fuse = new Fuse(data, { keys: ['title'], threshold: 0.4 });

            // RENDER CONTINUE WATCHING DYNAMICALLY
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

            // RENDER TRENDING (Immediate render because it's near the top)
            try {
                const q = query(collection(db, "drama_stats"), orderBy("views", "desc"), limit(15));
                const querySnapshot = await getDocs(q);
                let dynamicTrending = [];
                querySnapshot.forEach((docStats) => {
                    const found = data.find(d => d.title.toLowerCase() === docStats.data().title.toLowerCase());
                    if(found) dynamicTrending.push(found);
                });
                if(dynamicTrending.length > 0) populateGrid('trending-grid', dynamicTrending);
                else populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15));
            } catch(e) { 
                populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15)); 
            }

            // ==========================================
            // PERFORMANCE FIX: TRUE LAZY DOM RENDERING
            // ==========================================
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
                                sectionData = shuffleArray(data.filter(d => d.release_date === "Upcoming")).slice(0, 15);
                            } else {
                                sectionData = shuffleArray(data.filter(d => d.type === config.filterType)).slice(0, 15);
                            }
                            
                            // Only build the HTML when the user scrolls near it!
                            populateGrid(targetId, sectionData);
                            observer.unobserve(entry.target);
                        }
                    }
                });
            }, { rootMargin: '300px' }); // Trigger rendering 300px before it comes onto the screen

            gridConfigs.forEach(config => {
                const el = document.getElementById(config.id);
                if (el) gridObserver.observe(el);
            });

        } catch (err) { console.error("Firebase Database Load Error:", err); }
    }

    // --- SEARCH DEBOUNCE LOGIC (CPU SAVER) ---
    if (searchInput) {
        let debounceTimer; // Create a timer variable
        
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer); // Clear the timer on every keystroke
            
            // Set a new timer to run the search after 300ms of no typing
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
            }, 300); // 300ms delay feels instant but saves massive CPU
        });
    }

    // --- 3. HERO SLIDER LOGIC (INTERACTIVE & SWIPEABLE) ---
    const sliderWrapper = document.querySelector('.slider-wrapper');
    if (sliderWrapper) {
        let slideIndex = 0;
        const heroSlides = document.querySelectorAll('.slide');
        const prevBtn = document.getElementById('prevSlide');
        const nextBtn = document.getElementById('nextSlide');
        let autoSlideInterval;
        let isAnimating = false; // Prevents spamming swipes/clicks

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

        function startAutoSlide() {
            clearInterval(autoSlideInterval);
            autoSlideInterval = setInterval(moveNext, window.innerWidth <= 992 ? 3500 : 5000);
        }

        function resetAutoSlide() {
            startAutoSlide();
        }

        // 1. Button Controls
        if (nextBtn) {
            nextBtn.addEventListener('click', () => { moveNext(); resetAutoSlide(); });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => { movePrev(); resetAutoSlide(); });
        }

        // 2. Swipe & Drag Controls
        let startX = 0;
        let isDragging = false;
        let dragThresholdMet = false;

        function handleDragStart(e) {
            if (isAnimating) return;
            isDragging = true;
            dragThresholdMet = false;
            startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
            clearInterval(autoSlideInterval); // Pause auto-slide while holding
        }

        function handleDragMove(e) {
            if (!isDragging) return;
            const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
            if (Math.abs(startX - currentX) > 10) {
                dragThresholdMet = true; // Indicates intent to swipe, not click
            }
        }

        function handleDragEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            const endX = e.type.includes('mouse') ? e.pageX : e.changedTouches[0].clientX;
            const diffX = startX - endX;

            if (Math.abs(diffX) > 50) { // 50px threshold to trigger the slide
                if (diffX > 0) moveNext(); // Swiped left -> Next
                else movePrev(); // Swiped right -> Prev
            }
            resetAutoSlide(); // Resume auto-slide
        }

        sliderWrapper.addEventListener('touchstart', handleDragStart, { passive: true });
        sliderWrapper.addEventListener('touchmove', handleDragMove, { passive: true });
        sliderWrapper.addEventListener('touchend', handleDragEnd);
        
        sliderWrapper.addEventListener('mousedown', handleDragStart);
        sliderWrapper.addEventListener('mousemove', handleDragMove);
        sliderWrapper.addEventListener('mouseup', handleDragEnd);
        sliderWrapper.addEventListener('mouseleave', handleDragEnd);

        // 3. Click logic (ignores clicks if user was dragging)
        heroSlides.forEach(slide => {
            slide.addEventListener('click', (e) => {
                if (dragThresholdMet) {
                    e.preventDefault();
                    return; // Prevent triggering link if user was swiping
                }
                if (window.innerWidth <= 992 && !slide.classList.contains('active')) return;
                const btn = slide.querySelector('.btn-primary');
                // Target the hero-play-btn link on mobile or the main watch button on PC
                const mobileLink = slide.querySelector('a[href^="watch.html"]');
                
                if (btn) {
                    window.location.href = btn.getAttribute('href');
                } else if (mobileLink) {
                    window.location.href = mobileLink.getAttribute('href');
                }
            });
        });

        initSlider();
    }

    // --- 4. APP-LIKE SCROLL REVEAL (NEW FIX) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Triggers when 15% of the section is visible
    };

    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Animate only once
            }
        });
    }, observerOptions);

    // Dynamically apply to all sections so you don't need to manually edit index.html
    document.querySelectorAll('.latest-episodes').forEach(section => {
        section.classList.add('fade-in-section');
        sectionObserver.observe(section);
    });

    initializeDramaSite();
});

// --- 5. DRAMA REQUEST MODAL (FIREBASE SECURED) ---
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
            } else {
                modal.style.display = "flex";
            }
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
                
                if (!user) {
                    status.style.display = "block";
                    status.style.color = "#ff4d4d";
                    status.innerText = "Error: Authentication expired. Please login again.";
                    return;
                }
                
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
                if (err.code === 'permission-denied' || err.message.includes('permission')) {
                    status.innerHTML = "<i class='fas fa-exclamation-circle'></i> Error: Database Rules are blocking this request.";
                } else {
                    status.innerHTML = "<i class='fas fa-exclamation-circle'></i> Error: " + err.message;
                }
            } finally {
                submitBtn.innerText = "Send Request";
                submitBtn.disabled = false;
            }
        };
    }
});

// --- 6. PWA SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Failed', err));
  });
}

// --- 7. SMART APP INSTALL PROMPT LOGIC ---
document.addEventListener("DOMContentLoaded", function() {
    const installPopup = document.getElementById('appInstallPopup');
    const closeInstallBtn = document.getElementById('closeInstallPopup');
    
    if (installPopup && closeInstallBtn) {
        if (sessionStorage.getItem('hideInstallPopup') === 'true') {
            installPopup.classList.add('hidden');
        }

        closeInstallBtn.addEventListener('click', () => {
            installPopup.classList.add('hidden');
            sessionStorage.setItem('hideInstallPopup', 'true');
        });
    }
});