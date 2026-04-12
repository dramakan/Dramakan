// --- UNIFIED MASTER FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007",
    storageBucket: "dramakan007.firebasestorage.app",
    messagingSenderId: "1069933586213",
    appId: "1:1069933586213:web:b28ab37436679a4906dccc"
};

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

    // --- 2. GLOBAL MY LIST LOGIC ---
    window.toggleMyList = async function(btn, title, img, link) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
            const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
            const { getFirestore, doc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
            
            const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
            const auth = getAuth(app);
            const db = getFirestore(app);

            if (!auth.currentUser) {
                alert("Please Sign In to add dramas to your List!");
                window.location.href = "login.html";
                return;
            }

            const decodedTitle = decodeURIComponent(title);
            const userRef = doc(db, "users", auth.currentUser.uid);
            
            await updateDoc(userRef, {
                myList: arrayUnion({ title: decodedTitle, img: decodeURIComponent(img), link: decodeURIComponent(link), addedAt: Date.now() })
            });

            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.color = 'var(--primary-color)';
            btn.style.background = 'white';
        } catch (e) {
            console.error(e);
            btn.innerHTML = '<i class="fas fa-plus"></i>';
            alert("Error saving to My List.");
        }
    };

    // --- 3. DATA POPULATION & CAROUSELS ---
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
            <div class="drama-card" style="position:relative;">
                <a href="${drama.link}" style="display:block;">
                    <div class="drama-card-img"><img src="${drama.img}" alt="${drama.title}"></div>
                    <div class="drama-card-info">
                        <h3 class="drama-card-title">${drama.title}</h3>
                        <p class="drama-card-meta">${drama.type}</p>
                    </div>
                </a>
                <button class="bookmark-btn" onclick="event.preventDefault(); window.toggleMyList(this, '${safeTitle}', '${safeImg}', '${safeLink}')" title="Add to My List">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        }).join('');
    }

    async function initializeDramaSite() {
        try {
            const response = await fetch('dramas.json');
            let data = await response.json();

            try {
                const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
                const { getFirestore, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
                
                const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
                const db = getFirestore(app);

                const cmsSnap = await getDocs(collection(db, "dramas"));
                cmsSnap.forEach((doc) => { data.push(doc.data()); });
            } catch(e) {}

            fuse = new Fuse(data, { keys: ['title'], threshold: 0.4 });

            function renderContinueWatching() {
                const historyObj = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                const historyArr = Object.values(historyObj)
                    .filter(item => item.link && !item.link.toLowerCase().includes('index.html') && item.img && item.img.length > 5)
                    .sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
                
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

            try {
                const { getFirestore, collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
                const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
                const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
                const db = getFirestore(app);

                const q = query(collection(db, "drama_stats"), orderBy("views", "desc"), limit(15));
                const querySnapshot = await getDocs(q);
                let dynamicTrending = [];
                querySnapshot.forEach((doc) => {
                    const found = data.find(d => d.title.toLowerCase() === doc.data().title.toLowerCase());
                    if(found) dynamicTrending.push(found);
                });
                if(dynamicTrending.length > 0) populateGrid('trending-grid', dynamicTrending);
                else populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15));
            } catch(e) { populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15)); }

            populateGrid('kdrama-grid', shuffleArray(data.filter(d => d.type === "K-Drama")).slice(0, 15));
            populateGrid('cdrama-grid', shuffleArray(data.filter(d => d.type === "C-Drama")).slice(0, 15));
            populateGrid('jdrama-grid', shuffleArray(data.filter(d => d.type === "J-Drama")).slice(0, 15));
            populateGrid('pdrama-grid', shuffleArray(data.filter(d => d.type === "P-Drama")).slice(0, 15));
            populateGrid('tdrama-grid', shuffleArray(data.filter(d => d.type === "T-Drama")).slice(0, 15));
            populateGrid('upcoming-grid', shuffleArray(data.filter(d => d.release_date === "Upcoming")).slice(0, 15));
            populateGrid('turkishdrama-grid', shuffleArray(data.filter(d => d.type === "Turkish-Drama")).slice(0, 15));
            populateGrid('usdrama-grid', shuffleArray(data.filter(d => d.type === "US-Drama")).slice(0, 15));
            populateGrid('Movie-grid', shuffleArray(data.filter(d => d.type === "Movie")).slice(0, 15));

        } catch (err) { console.error("Data Load Error:", err); }
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (query.length < 1 || !fuse) { searchResults.style.display = 'none'; return; }
            const results = fuse.search(query, { limit: 10 });
            searchResults.innerHTML = results.map(({ item }) => {
                const safeTitle = encodeURIComponent(item.title); const safeImg = encodeURIComponent(item.img); const safeLink = encodeURIComponent(item.link);
                return `
                <div style="position:relative;">
                    <a href="${item.link}" class="search-result-item">
                        <img src="${item.img}" width="40" height="55">
                        <div><div style="color:#fff; font-weight:600;">${item.title}</div><small style="color:#aaa;">${item.type}</small></div>
                    </a>
                    <button class="bookmark-btn" style="top:13px; right:10px; width:30px; height:30px; font-size:0.75rem;" onclick="event.preventDefault(); window.toggleMyList(this, '${safeTitle}', '${safeImg}', '${safeLink}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>`;
            }).join('');
            searchResults.style.display = 'block';
        });
    }

    const sliderWrapper = document.querySelector('.slider-wrapper');
    if (sliderWrapper) {
        let slideIndex = 0;
        const heroSlides = document.querySelectorAll('.slide');
        
        if (window.innerWidth <= 992 && heroSlides.length > 1) {
            sliderWrapper.prepend(sliderWrapper.lastElementChild);
            sliderWrapper.style.transition = 'none';
            sliderWrapper.style.transform = `translateX(-100%)`;
            Array.from(sliderWrapper.children).forEach(s => s.classList.remove('active'));
            sliderWrapper.children[1].classList.add('active');

            setInterval(() => {
                sliderWrapper.style.transition = 'transform 0.3s ease-in-out';
                sliderWrapper.style.transform = `translateX(-200%)`; 
                sliderWrapper.children[1].classList.remove('active');
                sliderWrapper.children[2].classList.add('active');
                setTimeout(() => {
                    sliderWrapper.style.transition = 'none';
                    sliderWrapper.appendChild(sliderWrapper.firstElementChild);
                    sliderWrapper.style.transform = `translateX(-100%)`; 
                }, 300); 
            }, 3000);
        } else {
            setInterval(() => {
                slideIndex = (slideIndex + 1) % heroSlides.length;
                sliderWrapper.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
            }, 5000);
        }
        heroSlides.forEach(slide => {
            slide.addEventListener('click', () => {
                if (window.innerWidth <= 992 && !slide.classList.contains('active')) return;
                const btn = slide.querySelector('.btn-primary');
                if (btn) window.location.href = btn.getAttribute('href');
            });
        });
    }

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
            const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
            const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
            const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
            const auth = getAuth(app);
            
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
            submitBtn.innerText = "Sending...";
            submitBtn.disabled = true;

            try {
                const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
                const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
                const { getFirestore, collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
                
                const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
                const auth = getAuth(app);
                const db = getFirestore(app);

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
                status.style.color = "#4CAF50";
                status.innerText = "Request securely sent! Check your Profile later.";
                form.reset();

            } catch (err) {
                console.error("FIREBASE ERROR:", err);
                status.style.display = "block";
                status.style.color = "#ff4d4d";
                // SMART ERROR CATCHING: Directly tells you if Firebase Rules are blocking it
                if (err.code === 'permission-denied' || err.message.includes('permission')) {
                    status.innerText = "Error: Database Rules are blocking this request. Update Firebase Rules!";
                } else {
                    status.innerText = "Error: " + err.message;
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

// --- 7. SMART LOGIN PROMPT LOGIC ---
document.addEventListener("DOMContentLoaded", function() {
    const loginPopup = document.getElementById('loginPromptPopup');
    const closePopupBtn = document.getElementById('closeLoginPopup');
    if (loginPopup && closePopupBtn) {
        setTimeout(() => {
            const topAuthBtn = document.getElementById('topAuthBtn');
            const isLoggedIn = topAuthBtn && topAuthBtn.innerText.includes('Profile');
            if (!isLoggedIn && sessionStorage.getItem('hideLoginPopup') !== 'true') {
                loginPopup.classList.remove('hidden');
            }
        }, 2000);
        closePopupBtn.addEventListener('click', () => {
            loginPopup.classList.add('hidden');
            setTimeout(() => { loginPopup.style.display = 'none'; }, 400); 
            sessionStorage.setItem('hideLoginPopup', 'true');
        });
    }
});