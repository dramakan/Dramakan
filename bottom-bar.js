// ==========================================
// 1. THE MASTER TRACKING & MEMORY ENGINE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const creatorRef = urlParams.get('ref');

    // Indestructible DOM Selectors
    const videoIframe = document.querySelector('iframe') || document.querySelector('video') || document.querySelector('.video-container');
    const dramaTitleElement = document.querySelector('.info-title') || document.querySelector('h1') || document.querySelector('.drama-title');

    // ---------------------------------------------------------
    // PART A: CONTINUE WATCHING & AUTO-RESUME (Runs Instantly!)
    // ---------------------------------------------------------
    if (videoIframe && dramaTitleElement) {
        const dramaTitle = dramaTitleElement.innerText.trim();
        const dramaId = dramaTitle.replace(/\s+/g, '').toLowerCase();

        // 1. Save to Homepage / Profile History
        const dramaImg = document.querySelector('.info-poster img')?.src || document.querySelector('.poster img')?.src || '';
        const pagePath = window.location.pathname.split('/').pop() || window.location.href;

        let history = JSON.parse(localStorage.getItem('dramakan_history')) || {};
        history[dramaId] = { title: dramaTitle, img: dramaImg, link: pagePath, timestamp: Date.now() };
        localStorage.setItem('dramakan_history', JSON.stringify(history));

        // 2. The "Seeker" Auto-Resume Episode
        const savedEpIndex = localStorage.getItem(`dramakan_ep_${dramaId}`);
        if (savedEpIndex && savedEpIndex !== "0") {
            let searchAttempts = 0;
            const episodeSeeker = setInterval(() => {
                const targetEp = document.querySelector(`.episode-item[data-index="${savedEpIndex}"]`);
                if (targetEp) {
                    targetEp.click();
                    targetEp.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    clearInterval(episodeSeeker);
                }
                searchAttempts++;
                if (searchAttempts > 10) clearInterval(episodeSeeker); // Give up after 5 seconds
            }, 500);
        }

        // 3. Save Episode Progress Automatically
        document.addEventListener('click', (e) => {
            const clickedEpItem = e.target.closest('.episode-item');
            const clickedNextPrev = e.target.closest('#next-ep-btn') || e.target.closest('#prev-ep-btn');

            if (clickedEpItem) {
                localStorage.setItem(`dramakan_ep_${dramaId}`, clickedEpItem.getAttribute('data-index'));
            } else if (clickedNextPrev) {
                setTimeout(() => {
                    const currentActiveEp = document.querySelector('.episode-item.current') || document.querySelector('.episode-item.active');
                    if (currentActiveEp) {
                        localStorage.setItem(`dramakan_ep_${dramaId}`, currentActiveEp.getAttribute('data-index'));
                    }
                }, 500);
            }
        });
    }

    // ---------------------------------------------------------
    // PART B: FIREBASE AUTH & LIVE TRACKING (Loads in background)
    // ---------------------------------------------------------
    Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
    ]).then(([appModule, authModule, fsModule]) => {
        const { initializeApp, getApps, getApp } = appModule;
        const { getAuth, onAuthStateChanged } = authModule;
        // ADDED getDoc to fetch the user's avatar
        const { getFirestore, doc, setDoc, increment, collection, query, where, getDocs, updateDoc, getDoc } = fsModule;

        const firebaseConfig = {
            apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
            authDomain: "dramakan007.firebaseapp.com",
            projectId: "dramakan007",
            storageBucket: "dramakan007.firebasestorage.app",
            messagingSenderId: "1069933586213",
            appId: "1:1069933586213:web:b28ab37436679a4906dccc"
        };

        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        const db = getFirestore(app);

        // 1. Update Profile Buttons with User's Avatar if Logged In
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                let avatarSrc = 'https://api.dicebear.com/7.x/adventurer/svg?seed=DramaKan'; // Fallback
                
                try {
                    // Fetch the user's profile data
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.avatarUrl) {
                            avatarSrc = data.avatarUrl; // Use their custom uploaded photo
                        } else if (data.username) {
                            avatarSrc = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.username)}`; // Use their unique Dicebear
                        }
                    }
                } catch (error) {
                    console.warn("Could not fetch user avatar, using default.");
                }

                // Pre-build the HTML for the avatar image
                const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
                const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

                // Update Mobile Bottom Bar
                const bottomAuth = document.getElementById('bottomAuthBtn');
                if(bottomAuth) {
                    bottomAuth.href = 'profile.html';
                    bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`;
                }

                // Update PC Top Header
                const topAuthBtn = document.getElementById('topAuthBtn');
                if(topAuthBtn) {
                    topAuthBtn.href = 'profile.html';
                    topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`;
                }
            }
        });

        // 2. Affiliate Clicks
        if (creatorRef) {
            const findCreatorQuery = query(collection(db, "creators"), where("creatorId", "==", creatorRef));
            getDocs(findCreatorQuery).then((querySnapshot) => {
                querySnapshot.forEach((document) => {
                    updateDoc(document.ref, { totalClicks: increment(1), unpaidClicks: increment(1) });
                });
            });
        }

        // 3. Live Drama Views (For Trending)
        if (videoIframe && dramaTitleElement) {
            const dramaTitle = dramaTitleElement.innerText.trim();
            const dramaId = dramaTitle.replace(/\s+/g, '').toLowerCase();
            setDoc(doc(db, "drama_stats", dramaId), {
                title: dramaTitle,
                views: increment(1),
                lastActive: new Date()
            }, { merge: true }).catch(() => {}); // Failsafe so adblockers don't crash it
        }

    }).catch(err => console.warn("Firebase scripts delayed by browser."));
});

// ==========================================
// 2. SECRET ADMIN PORTAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'Y') window.location.href = 'admin-dashboard.html';
    });
    const footerText = document.querySelector('.main-footer') || document.querySelector('footer');
    if (footerText) {
        let tapCount = 0; let tapTimer;
        footerText.addEventListener('click', () => {
            tapCount++; clearTimeout(tapTimer);
            if (tapCount >= 5) window.location.href = 'admin-dashboard.html';
            tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
        });
    }
});