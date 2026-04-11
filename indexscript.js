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
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        overlay.addEventListener('click', () => {
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            if (menuToggle.querySelector('i')) {
                menuToggle.querySelector('i').className = 'fas fa-bars';
            }
        });
    }

     // --- 2. RANDOMIZATION UTILITY ---
    function shuffleArray(array) {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // --- 3. DATA POPULATION & CAROUSELS (WITH FIREBASE LIVE TRENDING & CONTINUE WATCHING) ---
    let fuse;
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    function populateGrid(elementId, items) {
        const grid = document.getElementById(elementId);
        if (!grid) return;
        grid.innerHTML = items.map(drama => `
            <a href="${drama.link}" class="drama-card">
                <div class="drama-card-img"><img src="${drama.img}" alt="${drama.title}"></div>
                <div class="drama-card-info">
                    <h3 class="drama-card-title">${drama.title}</h3>
                    <p class="drama-card-meta">${drama.type}</p>
                </div>
            </a>
        `).join('');
    }

    async function initializeDramaSite() {
        try {
            // A. Load the base JSON data
            const response = await fetch('dramas.json');
            const data = await response.json();

            fuse = new Fuse(data, {
                keys: ['title'],
                threshold: 0.4
            });

           // B. RENDER CONTINUE WATCHING (With Auto-Clean Filter)
            function renderContinueWatching() {
                const historyObj = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                
                // FILTER: Instantly ignores any corrupt data caused by the old homepage bug
                const historyArr = Object.values(historyObj)
                    .filter(item => item.link && !item.link.toLowerCase().includes('index.html') && item.img && item.img.length > 5)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10);
                
                if(historyArr.length > 0) {
                    const cwSection = document.getElementById('continue-watching-section');
                    const cwGrid = document.getElementById('continue-watching-grid');
                    if (cwSection && cwGrid) {
                        cwSection.style.display = 'block';
                        cwGrid.innerHTML = historyArr.map(item => `
                            <a href="${item.link}" class="drama-card" style="border-color: #8A2BE2; box-shadow: 0 0 15px rgba(138, 43, 226, 0.15);">
                                <div class="drama-card-img"><img src="${item.img}" alt="${item.title}"></div>
                                <div class="drama-card-info">
                                    <h3 class="drama-card-title">${item.title}</h3>
                                    <p class="drama-card-meta" style="color: #a1a1aa;"><i class="fas fa-history"></i> Jump back in</p>
                                </div>
                            </a>
                        `).join('');
                    }
                }
            }
            
            renderContinueWatching(); 
            window.addEventListener('historySynced', renderContinueWatching);

            // C. RENDER LIVE TRENDING (From Firebase Database)
            try {
                const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
                const { getFirestore, collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
                
                const firebaseConfig = {
                    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
                    authDomain: "dramakan007.firebaseapp.com",
                    projectId: "dramakan007"
                };
                const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
                const db = getFirestore(app);

                // Fetch the top 15 most viewed dramas
                const q = query(collection(db, "drama_stats"), orderBy("views", "desc"), limit(15));
                const querySnapshot = await getDocs(q);
                
                let dynamicTrending = [];
                querySnapshot.forEach((doc) => {
                    const found = data.find(d => d.title.toLowerCase() === doc.data().title.toLowerCase());
                    if(found) dynamicTrending.push(found);
                });

                if(dynamicTrending.length > 0) {
                    populateGrid('trending-grid', dynamicTrending);
                } else {
                    populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15));
                }
            } catch(firebaseErr) {
                console.warn("Live Trending skipped (Using offline mode).", firebaseErr);
                populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15));
            }

            // D. RENDER THE REST OF THE CATEGORIES
            populateGrid('kdrama-grid', shuffleArray(data.filter(d => d.type === "K-Drama")).slice(0, 15));
            populateGrid('cdrama-grid', shuffleArray(data.filter(d => d.type === "C-Drama")).slice(0, 15));
            populateGrid('jdrama-grid', shuffleArray(data.filter(d => d.type === "J-Drama")).slice(0, 15));
            populateGrid('pdrama-grid', shuffleArray(data.filter(d => d.type === "P-Drama")).slice(0, 15));
            populateGrid('tdrama-grid', shuffleArray(data.filter(d => d.type === "T-Drama")).slice(0, 15));
            populateGrid('upcoming-grid', shuffleArray(data.filter(d => d.release_date === "Upcoming")).slice(0, 15));
            populateGrid('turkishdrama-grid', shuffleArray(data.filter(d => d.type === "Turkish-Drama")).slice(0, 15));
            populateGrid('usdrama-grid', shuffleArray(data.filter(d => d.type === "US-Drama")).slice(0, 15));
            populateGrid('Movie-grid', shuffleArray(data.filter(d => d.type === "Movie")).slice(0, 15));

        } catch (err) {
            console.error("Data Load Error:", err);
        }
    }

    // --- SEARCH LOGIC ---
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (query.length < 1 || !fuse) {
                searchResults.style.display = 'none';
                return;
            }
            const results = fuse.search(query, { limit: 10 });
            searchResults.innerHTML = results.map(({ item }) => `
                <a href="${item.link}" class="search-result-item">
                    <img src="${item.img}" width="40" height="55">
                    <div>
                        <div style="color:#fff; font-weight:600;">${item.title}</div>
                        <small style="color:#aaa;">${item.type}</small>
                    </div>
                </a>
            `).join('');
            searchResults.style.display = 'block';
        });
    }

    // --- 4. HERO SLIDER (PERFECT INFINITE LOOP) ---
    const sliderWrapper = document.querySelector('.slider-wrapper');
    if (sliderWrapper) {
        let slideIndex = 0;
        const heroSlides = document.querySelectorAll('.slide');
        
        // Mobile Setup
        if (window.innerWidth <= 992 && heroSlides.length > 1) {
            sliderWrapper.prepend(sliderWrapper.lastElementChild);
            sliderWrapper.style.transition = 'none';
            sliderWrapper.style.transform = `translateX(-100%)`;
            
            // Set initial active state
            Array.from(sliderWrapper.children).forEach(s => s.classList.remove('active'));
            sliderWrapper.children[1].classList.add('active');

            setInterval(() => {
                // Animate to left
                sliderWrapper.style.transition = 'transform 0.3s ease-in-out';
                sliderWrapper.style.transform = `translateX(-200%)`; 
                
                // Shift classes instantly for smooth scaling
                sliderWrapper.children[1].classList.remove('active');
                sliderWrapper.children[2].classList.add('active');
                
                // Quietly reset DOM behind the scenes
                setTimeout(() => {
                    sliderWrapper.style.transition = 'none';
                    sliderWrapper.appendChild(sliderWrapper.firstElementChild);
                    sliderWrapper.style.transform = `translateX(-100%)`; 
                }, 300); 
            }, 3000);
            
        } else {
            // Desktop Setup
            setInterval(() => {
                slideIndex = (slideIndex + 1) % heroSlides.length;
                sliderWrapper.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
            }, 5000);
        }

        // Click Logic 
        heroSlides.forEach(slide => {
            slide.addEventListener('click', () => {
                // Prevents user from clicking faded side-slides on mobile
                if (window.innerWidth <= 992 && !slide.classList.contains('active')) return;
                
                const btn = slide.querySelector('.btn-primary');
                if (btn) {
                    window.location.href = btn.getAttribute('href');
                }
            });
        });
    }

    initializeDramaSite();
});

// --- 5. DRAMA REQUEST MODAL (TELEGRAM BOT) ---
document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("dramaModal");
    const openBtn = document.getElementById("dramaRequestBtn");
    const closeBtn = document.getElementById("closeDramaModal");
    const form = document.getElementById("dramaRequestForm");

    const BOT_TOKEN = "8473278366:AAFgUjLJGAjRoh4Ig1DCat0qCs2D7yZHcbA";
    const CHAT_ID = "5780542178";

    if(openBtn && modal) {
        openBtn.onclick = () => modal.style.display = "flex";
        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (e) => { if(e.target === modal) modal.style.display = "none"; }
    }

    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const dramaName = document.getElementById("dramaName").value;
            const contactDetail = document.getElementById("contactname").value; 
            const status = document.getElementById("statusMessage");
            const submitBtn = document.getElementById("submitBtn");

            submitBtn.innerText = "Sending...";
            submitBtn.disabled = true;

            const text = `🎬 *New Drama Request*\n\n` +
                         `📺 *Drama:* ${dramaName}\n` +
                         `👤 *Contact:* ${contactDetail}`;  
            
            const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;

            try {
                const response = await fetch(url);
                if (response.ok) {
                    status.style.display = "block";
                    status.style.color = "#4CAF50";
                    status.innerText = "Request sent! Check back in 48 hours.";
                    form.reset();
                } else {
                    throw new Error();
                }
            } catch (err) {
                status.style.display = "block";
                status.style.color = "#ff4d4d";
                status.innerText = "Error sending request. Try joining Telegram.";
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
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.log('Service Worker Failed', err));
  });
}

// --- 7. APP INSTALL POPUP LOGIC ---
document.addEventListener("DOMContentLoaded", function() {
    const installPopup = document.getElementById('appInstallPopup');
    const closePopupBtn = document.getElementById('closeInstallPopup');

    if (installPopup && closePopupBtn) {
        if (sessionStorage.getItem('hideAppInstallPopup') === 'true') {
            installPopup.style.display = 'none';
        } else {
            installPopup.classList.add('hidden');
            setTimeout(() => {
                installPopup.classList.remove('hidden');
            }, 800);
        }

        closePopupBtn.addEventListener('click', () => {
            installPopup.classList.add('hidden');
            setTimeout(() => {
                installPopup.style.display = 'none';
            }, 400); 
            sessionStorage.setItem('hideAppInstallPopup', 'true');
        });
    }
});
// --- 6. IMMERSIVE SCROLL REVEAL ANIMATIONS ---
document.addEventListener("DOMContentLoaded", function() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Triggers when 15% of the section is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Stop observing once revealed
            }
        });
    }, observerOptions);

    // Apply the fade-in class to all major sections
    document.querySelectorAll('section.latest-episodes').forEach(section => {
        section.classList.add('fade-in-section');
        observer.observe(section);
    });
});

// --- 7. SMART LOGIN PROMPT LOGIC ---
document.addEventListener("DOMContentLoaded", function() {
    const loginPopup = document.getElementById('loginPromptPopup');
    const closePopupBtn = document.getElementById('closeLoginPopup');

    if (loginPopup && closePopupBtn) {
        // Wait 2 seconds so Firebase has time to confirm if they are logged in
        setTimeout(() => {
            // Check if the top button says "Profile" (meaning Firebase logged them in)
            const topAuthBtn = document.getElementById('topAuthBtn');
            const isLoggedIn = topAuthBtn && topAuthBtn.innerText.includes('Profile');

            // Only show the popup if they are NOT logged in and haven't closed it recently
            if (!isLoggedIn && sessionStorage.getItem('hideLoginPopup') !== 'true') {
                loginPopup.classList.remove('hidden');
            }
        }, 2000);

        closePopupBtn.addEventListener('click', () => {
            loginPopup.classList.add('hidden');
            setTimeout(() => {
                loginPopup.style.display = 'none';
            }, 400); 
            sessionStorage.setItem('hideLoginPopup', 'true');
        });
    }
});