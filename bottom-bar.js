// ==========================================
// 1. THE MASTER TRACKING & MEMORY ENGINE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const creatorRef = urlParams.get('ref');

    // STRICT DOM Selectors (Prevents the Homepage Overwrite Bug)
    const dramaTitleElement = document.querySelector('.info-title');
    const dramaPosterElement = document.querySelector('.info-poster img');
    const pagePath = window.location.pathname.split('/').pop() || window.location.href;
    
    // Only triggers if we are DEFINITELY on a Drama Page
    const isDramaPage = dramaTitleElement && dramaPosterElement && !pagePath.toLowerCase().includes('index.html') && !pagePath.toLowerCase().includes('profile.html');

    // ---------------------------------------------------------
    // PART A: CONTINUE WATCHING & AUTO-RESUME (Local Cache)
    // ---------------------------------------------------------
    if (isDramaPage) {
        const dramaTitle = dramaTitleElement.innerText.trim();
        const dramaId = dramaTitle.replace(/\s+/g, '').toLowerCase();
        const dramaImg = dramaPosterElement.src;

        // 1. Save to Local History Cache immediately
        let history = JSON.parse(localStorage.getItem('dramakan_history')) || {};
        history[dramaId] = { 
            title: dramaTitle, 
            img: dramaImg, 
            link: pagePath, 
            timestamp: Date.now(),
            epIndex: localStorage.getItem(`dramakan_ep_${dramaId}`) || "0"
        };
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
                if (searchAttempts > 10) clearInterval(episodeSeeker); 
            }, 500);
        }

        // 3. Save Episode Progress Locally Automatically
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
    // PART B: FIREBASE CLOUD SYNC & LIVE TRACKING 
    // ---------------------------------------------------------
    Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
    ]).then(([appModule, authModule, fsModule]) => {
        const { initializeApp, getApps, getApp } = appModule;
        const { getAuth, onAuthStateChanged } = authModule;
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

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // --- 1. UI AVATAR UPDATE ---
                let avatarSrc = 'https://api.dicebear.com/7.x/adventurer/svg?seed=DramaKan'; 
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.avatarUrl) avatarSrc = data.avatarUrl; 
                        else if (data.username) avatarSrc = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.username)}`;
                    }
                } catch (error) { console.warn("Could not fetch avatar."); }

                const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
                const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

                const bottomAuth = document.getElementById('bottomAuthBtn');
                if(bottomAuth) { bottomAuth.href = 'profile.html'; bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`; }
                const topAuthBtn = document.getElementById('topAuthBtn');
                if(topAuthBtn) { topAuthBtn.href = 'profile.html'; topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`; }

                // --- 2. CROSS-DEVICE CLOUD SYNC FOR CONTINUE WATCHING ---
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        let cloudHistory = data.watchHistory || {};
                        let localHistory = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                        let changed = false;

                        // Pull History from Cloud to Local
                        for (const [id, cloudItem] of Object.entries(cloudHistory)) {
                            // Only pull clean, uncorrupted data
                            if (cloudItem.link && !cloudItem.link.includes('index.html')) {
                                if (!localHistory[id] || cloudItem.timestamp > localHistory[id].timestamp) {
                                    localHistory[id] = cloudItem;
                                    if (cloudItem.epIndex) localStorage.setItem(`dramakan_ep_${id}`, cloudItem.epIndex);
                                    changed = true;
                                }
                            }
                        }

                        // Push Local History Up to Cloud
                        for (const [id, localItem] of Object.entries(localHistory)) {
                            // Only push clean, uncorrupted data
                            if (localItem.link && !localItem.link.includes('index.html')) {
                                if (!cloudHistory[id] || localItem.timestamp > cloudHistory[id].timestamp) {
                                    localItem.epIndex = localStorage.getItem(`dramakan_ep_${id}`) || "0";
                                    cloudHistory[id] = localItem;
                                    changed = true;
                                }
                            }
                        }

                        if (changed) {
                            localStorage.setItem('dramakan_history', JSON.stringify(localHistory));
                            await updateDoc(userDocRef, { watchHistory: cloudHistory });
                            window.dispatchEvent(new Event('historySynced')); 
                        }

                        // Live-Sync Episodes
                        if (isDramaPage) {
                            const dramaTitle = dramaTitleElement.innerText.trim();
                            const dramaId = dramaTitle.replace(/\s+/g, '').toLowerCase();

                            document.addEventListener('click', (e) => {
                                const clickedEpItem = e.target.closest('.episode-item');
                                const clickedNextPrev = e.target.closest('#next-ep-btn') || e.target.closest('#prev-ep-btn');

                                if (clickedEpItem || clickedNextPrev) {
                                    setTimeout(async () => {
                                        const epIndex = localStorage.getItem(`dramakan_ep_${dramaId}`);
                                        if (epIndex) {
                                            const dramaImg = dramaPosterElement.src;
                                            const historyUpdate = {};
                                            historyUpdate[`watchHistory.${dramaId}`] = {
                                                title: dramaTitle,
                                                img: dramaImg,
                                                link: pagePath,
                                                timestamp: Date.now(),
                                                epIndex: epIndex
                                            };
                                            await updateDoc(userDocRef, historyUpdate).catch(()=>{});
                                        }
                                    }, 1000); 
                                }
                            });
                        }
                    }
                } catch (err) {
                    console.warn("Cloud Sync skipped:", err);
                }
            }
        });

        // 3. Affiliate Clicks
        if (creatorRef) {
            const findCreatorQuery = query(collection(db, "creators"), where("creatorId", "==", creatorRef));
            getDocs(findCreatorQuery).then((querySnapshot) => {
                querySnapshot.forEach((document) => {
                    updateDoc(document.ref, { totalClicks: increment(1), unpaidClicks: increment(1) });
                });
            });
        }

        // 4. Live Drama Views (For Trending)
        if (isDramaPage) {
            const dramaTitle = dramaTitleElement.innerText.trim();
            const dramaId = dramaTitle.replace(/\s+/g, '').toLowerCase();
            setDoc(doc(db, "drama_stats", dramaId), {
                title: dramaTitle,
                views: increment(1),
                lastActive: new Date()
            }, { merge: true }).catch(() => {});
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