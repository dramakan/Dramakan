// ==========================================
// GLOBAL FUNCTION: MY LIST / BOOKMARKS
// ==========================================
window.toggleMyList = async function(btn, title, img, link) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const { getFirestore, doc, setDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        
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

        if (!auth.currentUser) {
            alert("Please Sign In to add dramas to your List!");
            window.location.href = "login.html";
            return;
        }

        const decodedTitle = decodeURIComponent(title);
        const userRef = doc(db, "users", auth.currentUser.uid);
        
        await setDoc(userRef, {
            myList: arrayUnion({ title: decodedTitle, img: decodeURIComponent(img), link: decodeURIComponent(link), addedAt: Date.now() })
        }, { merge: true });

        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.color = 'var(--primary-color)';
        btn.style.background = 'white';
        btn.style.borderColor = 'var(--primary-color)';
    } catch (e) {
        console.error(e);
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        alert("Error saving to My List.");
    }
};

// ==========================================
// 1. THE MASTER TRACKING & MEMORY ENGINE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const creatorRef = urlParams.get('ref');
    const dramaIdFromUrl = urlParams.get('id');

    const pagePath = window.location.pathname.replace(/^\/+/, '') + window.location.search;
    const isExcludePage = pagePath.toLowerCase().includes('index.html') || 
                          pagePath.toLowerCase().includes('profile.html') || 
                          pagePath.toLowerCase().includes('login.html') ||
                          pagePath.toLowerCase().includes('community.html') ||
                          pagePath.toLowerCase().includes('admin') ||
                          pagePath.toLowerCase().includes('affiliate') ||
                          pagePath === '' || pagePath === '/';

    // ---------------------------------------------------------
    // PART A: FIREBASE CLOUD SYNC & LIVE TRACKING
    // ---------------------------------------------------------
    Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
    ]).then(async ([appModule, authModule, fsModule]) => {
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

        // Global Visits
        if (!sessionStorage.getItem('dk_visited')) {
            sessionStorage.setItem('dk_visited', 'true');
            setDoc(doc(db, "drama_stats", "_global_visits_"), { views: increment(1), lastActive: new Date() }, { merge: true }).catch(() => {});
        }

        // =========================================================
        // 🔥 THE FIX: INDESTRUCTIBLE HYBRID TRACKER
        // =========================================================
        async function processDramaTracking(id, title, img, link) {
            try {
                let history = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                let epIndex = localStorage.getItem(`dramakan_ep_${id}`) || "0";
                
                history[id] = { title, img, link, timestamp: Date.now(), epIndex };
                localStorage.setItem('dramakan_history', JSON.stringify(history));
                window.dispatchEvent(new Event('historySynced'));

                if (epIndex !== "0") {
                    let epSearch = 0;
                    const episodeSeeker = setInterval(() => {
                        const targetEp = document.querySelector(`.episode-item[data-index="${epIndex}"]`);
                        if (targetEp) {
                            targetEp.click();
                            try { targetEp.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){}
                            clearInterval(episodeSeeker);
                        }
                        epSearch++;
                        if (epSearch > 20) clearInterval(episodeSeeker);
                    }, 500);
                }

                document.addEventListener('click', (e) => {
                    const clickedEpItem = e.target.closest('.episode-item');
                    const clickedNextPrev = e.target.closest('#next-ep-btn') || e.target.closest('#prev-ep-btn');

                    if (clickedEpItem || clickedNextPrev) {
                        setTimeout(() => {
                            const activeEp = document.querySelector('.episode-item.current') || document.querySelector('.episode-item.active') || clickedEpItem;
                            if (activeEp) {
                                const newEpIdx = activeEp.getAttribute('data-index');
                                localStorage.setItem(`dramakan_ep_${id}`, newEpIdx);
                                
                                if (auth.currentUser) {
                                    let historyUpdate = {};
                                    historyUpdate[`watchHistory.${id}`] = { title, img, link, timestamp: Date.now(), epIndex: newEpIdx };
                                    setDoc(doc(db, "users", auth.currentUser.uid), historyUpdate, {merge: true}).catch(()=>{});
                                }
                            }
                        }, 500);
                    }
                });
                
                setDoc(doc(db, "drama_stats", id), { title: title, views: increment(1), lastActive: new Date() }, { merge: true }).catch(() => {});
            } catch(e) { console.error("Tracking Error:", e); }
        }

        let trackingFired = false;

        // Method 1: Fast Cloud Tracking
        if (dramaIdFromUrl) {
            try {
                const dDoc = await getDoc(doc(db, "dramas", dramaIdFromUrl));
                if(dDoc.exists()) {
                    const d = dDoc.data();
                    processDramaTracking(dramaIdFromUrl, d.title, d.img, `watch.html?id=${dramaIdFromUrl}`);
                    trackingFired = true;
                }
            } catch(e) { console.warn("Cloud fallback to DOM", e); }
        }

        // Method 2: Aggressive DOM Scraper Fallback
        if (!trackingFired && !isExcludePage) {
            let scanAttempts = 0;
            const scanner = setInterval(() => {
                const titleEl = document.querySelector('.info-title') || document.querySelector('.drama-title') || document.querySelector('h1');
                const imgEl = document.querySelector('.info-poster img') || document.querySelector('.poster img') || document.querySelector('.drama-card-img img');
                
                if (titleEl && imgEl && !titleEl.innerText.includes('Loading')) {
                    clearInterval(scanner);
                    const title = titleEl.innerText.trim();
                    const id = dramaIdFromUrl || title.replace(/\s+/g, '').toLowerCase();
                    if(imgEl.src && !imgEl.src.includes('favicon')) {
                        processDramaTracking(id, title, imgEl.src, pagePath);
                    }
                }
                scanAttempts++;
                if(scanAttempts > 30) clearInterval(scanner); // Stop after 15 seconds
            }, 500);
        }

        // =========================================================
        // USER AUTH & CROSS-DEVICE SYNC
        // =========================================================
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                
                // UI Avatar Sync
                let avatarSrc = 'https://api.dicebear.com/7.x/adventurer/svg?seed=DramaKan'; 
                try {
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        if (data.avatarUrl) avatarSrc = data.avatarUrl; 
                        else if (data.username) avatarSrc = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.username)}`;
                    }
                } catch (error) { }

                const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
                const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

                const bottomAuth = document.getElementById('bottomAuthBtn');
                if(bottomAuth) { bottomAuth.href = 'profile.html'; bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`; }
                const topAuthBtn = document.getElementById('topAuthBtn');
                if(topAuthBtn) { topAuthBtn.href = 'profile.html'; topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`; }

                // Initial Cloud History Backup Sync
                if (dramaIdFromUrl) {
                    const savedHistory = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                    if(savedHistory[dramaIdFromUrl]) {
                        await setDoc(userDocRef, { watchHistory: { [dramaIdFromUrl]: savedHistory[dramaIdFromUrl] } }, { merge: true }).catch(()=>{});
                    }
                }

                // Cross-Device Sync Engine
                try {
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        let cloudHistory = data.watchHistory || {};
                        let localHistory = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                        let changed = false;

                        for (const [id, cloudItem] of Object.entries(cloudHistory)) {
                            if (cloudItem.link && !cloudItem.link.includes('index.html')) {
                                if (!localHistory[id] || cloudItem.timestamp > localHistory[id].timestamp) {
                                    localHistory[id] = cloudItem;
                                    if (cloudItem.epIndex) localStorage.setItem(`dramakan_ep_${id}`, cloudItem.epIndex);
                                    changed = true;
                                }
                            }
                        }

                        for (const [id, localItem] of Object.entries(localHistory)) {
                            if (localItem.link && !localItem.link.includes('index.html')) {
                                if (!cloudHistory[id] || localItem.timestamp > (cloudHistory[id].timestamp || 0)) {
                                    localItem.epIndex = localStorage.getItem(`dramakan_ep_${id}`) || "0";
                                    cloudHistory[id] = localItem;
                                    changed = true;
                                }
                            }
                        }

                        if (changed) {
                            localStorage.setItem('dramakan_history', JSON.stringify(localHistory));
                            await setDoc(userDocRef, { watchHistory: cloudHistory }, { merge: true });
                            window.dispatchEvent(new Event('historySynced')); 
                        }
                    }
                } catch (err) {}

                // Request Notifications
                try {
                    const reqQuery = query(collection(db, "requests"), where("userId", "==", user.uid), where("status", "==", "Uploaded"), where("notified", "==", false));
                    const reqSnap = await getDocs(reqQuery);
                    reqSnap.forEach(async (docSnap) => {
                        const reqData = docSnap.data();
                        const toast = document.createElement('div');
                        toast.style.cssText = "position:fixed;top:20px;right:20px;background:rgba(138,43,226,0.95);backdrop-filter:blur(10px);color:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:99999;font-family:'Poppins',sans-serif;font-size:0.95rem;display:flex;align-items:center;gap:15px;border:1px solid rgba(255,255,255,0.2);transform:translateX(120%);transition:transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);";
                        
                        const linkHtml = reqData.link ? `<a href="${reqData.link}" style="display:inline-block; margin-top:6px; color:#c488ff; font-weight:600; font-size:0.85rem; text-decoration:none;"><i class="fas fa-play-circle"></i> Watch Now</a>` : '';
                        toast.innerHTML = `
                            <i class="fas fa-check-circle" style="font-size:1.5rem;color:#10b981;"></i> 
                            <div style="flex-grow: 1;">
                                <strong style="display:block;margin-bottom:2px;">Request Fulfilled!</strong>
                                <span style="font-size:0.85rem;opacity:0.9;">Your drama <b>"${reqData.dramaName}"</b> is now available!</span>
                                <br>${linkHtml}
                            </div> 
                            <button style="background:none;border:none;color:#fff;cursor:pointer;margin-left:10px;font-size:1.2rem;"><i class="fas fa-times"></i></button>
                        `;
                        
                        document.body.appendChild(toast);
                        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
                        toast.querySelector('button').onclick = () => { toast.style.transform = 'translateX(120%)'; setTimeout(()=>toast.remove(), 500); };
                        setTimeout(() => { if(toast.parentElement) { toast.style.transform = 'translateX(120%)'; setTimeout(()=>toast.remove(), 500); } }, 8000);
                        await updateDoc(docSnap.ref, { notified: true });
                    });
                } catch(e) {}
            }
        });

        // Affiliate Clicks Tracker
        if (creatorRef) {
            const findCreatorQuery = query(collection(db, "creators"), where("creatorId", "==", creatorRef));
            getDocs(findCreatorQuery).then((snap) => {
                snap.forEach((doc) => updateDoc(doc.ref, { totalClicks: increment(1), unpaidClicks: increment(1) }));
            });
        }

    }).catch(err => console.warn("Firebase scripts delayed.", err));
});

// ==========================================
// 8. GHOST PROTOCOL (ADMIN EASTER EGG)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    let secretKeys = '';
    document.addEventListener('keydown', (e) => {
        secretKeys += e.key.toLowerCase();
        if (secretKeys.length > 5) secretKeys = secretKeys.substring(secretKeys.length - 5);
        if (secretKeys === 'admin') {
            document.body.style.transition = "filter 0.5s ease";
            document.body.style.filter = "invert(1) hue-rotate(180deg)";
            setTimeout(() => window.location.href = 'admin-dashboard.html', 500);
        }
    });

    let footerTapCount = 0;
    let footerTapTimer;
    const footer = document.querySelector('.main-footer');
    if (footer) {
        footer.addEventListener('click', () => {
            footerTapCount++;
            clearTimeout(footerTapTimer);
            if (footerTapCount >= 7) {
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                document.body.style.transition = "filter 0.5s ease";
                document.body.style.filter = "invert(1) hue-rotate(180deg)";
                setTimeout(() => window.location.href = 'admin-dashboard.html', 500);
                footerTapCount = 0;
            }
            footerTapTimer = setTimeout(() => { footerTapCount = 0; }, 1500);
        });
    }
});