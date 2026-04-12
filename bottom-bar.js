// ==========================================
// GLOBAL FUNCTION: MY LIST / BOOKMARKS
// ==========================================
window.toggleMyList = async function(btn, title, img, link) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const { getFirestore, doc, updateDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        
        const firebaseConfig = { apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA", authDomain: "dramakan007.firebaseapp.com", projectId: "dramakan007" };
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

    // Capture the correct relative path 
    const pagePath = window.location.pathname.replace(/^\/+/, '') + window.location.search;
    
    // Explicitly exclude non-drama pages
    const isExcludePage = pagePath.toLowerCase().includes('index.html') || 
                          pagePath.toLowerCase().includes('profile.html') || 
                          pagePath.toLowerCase().includes('login.html') ||
                          pagePath.toLowerCase().includes('community.html') ||
                          pagePath.toLowerCase().includes('admin') ||
                          pagePath.toLowerCase().includes('affiliate') ||
                          pagePath === '' || pagePath === '/';

    // It is a drama page if it has an ID parameter or is not on the exclude list
    const isDramaPage = dramaIdFromUrl || !isExcludePage;

    // ---------------------------------------------------------
    // PART A: CONTINUE WATCHING (Dynamic Polling for watch.html)
    // ---------------------------------------------------------
    if (isDramaPage) {
        let searchAttempts = 0;
        
        // DYNAMIC SENSOR: Wait until Firebase injects the content into the DOM
        const titleSensor = setInterval(() => {
            // Smart selectors to find dynamically injected titles and posters
            const dramaTitleElement = document.querySelector('.info-title') || document.querySelector('.drama-title') || document.querySelector('h1');
            const dramaPosterElement = document.querySelector('.info-poster img') || document.querySelector('.poster img') || document.querySelector('.drama-card-img img') || document.querySelector('img[src*="http"]');
            
            if (dramaTitleElement && dramaPosterElement) {
                const dramaTitle = dramaTitleElement.innerText.trim();
                
                if (dramaTitle && !dramaTitle.includes("Loading")) {
                    clearInterval(titleSensor); 
                    
                    // Use URL ID if available, otherwise fallback to stripped title
                    const dramaId = dramaIdFromUrl || dramaTitle.replace(/\s+/g, '').toLowerCase();
                    const dramaImg = dramaPosterElement.src;

                    // 1. Save to Local History Cache immediately
                    let history = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                    history[dramaId] = { 
                        title: dramaTitle, 
                        img: dramaImg, 
                        link: pagePath, // This will correctly save as watch.html?id=...
                        timestamp: Date.now(),
                        epIndex: localStorage.getItem(`dramakan_ep_${dramaId}`) || "0"
                    };
                    localStorage.setItem('dramakan_history', JSON.stringify(history));
                    
                    // Force the UI to refresh if it's open
                    window.dispatchEvent(new Event('historySynced')); 

                    // 2. The "Seeker" Auto-Resume Episode
                    const savedEpIndex = localStorage.getItem(`dramakan_ep_${dramaId}`);
                    if (savedEpIndex && savedEpIndex !== "0") {
                        let epSearch = 0;
                        const episodeSeeker = setInterval(() => {
                            const targetEp = document.querySelector(`.episode-item[data-index="${savedEpIndex}"]`);
                            if (targetEp) {
                                targetEp.click();
                                try { targetEp.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){}
                                clearInterval(episodeSeeker);
                            }
                            epSearch++;
                            if (epSearch > 20) clearInterval(episodeSeeker); // Stop looking after 10 seconds
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
            }
            searchAttempts++;
            if (searchAttempts > 30) clearInterval(titleSensor); // Give up after 15 seconds
        }, 500);
    }

    // ---------------------------------------------------------
    // PART B: FIREBASE CLOUD SYNC, LIVE TRACKING & NOTIFICATIONS
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

        // Global Visits
        if (!sessionStorage.getItem('dk_visited')) {
            sessionStorage.setItem('dk_visited', 'true');
            setDoc(doc(db, "drama_stats", "_global_visits_"), { views: increment(1), lastActive: new Date() }, { merge: true }).catch(() => {});
        }

        let userDocRef = null;

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userDocRef = doc(db, "users", user.uid);
                
                // 1. UI Avatar Sync
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

                // 2. DRAMA REQUEST NOTIFICATIONS
                try {
                    const reqQuery = query(collection(db, "requests"), where("userId", "==", user.uid), where("status", "==", "Uploaded"), where("notified", "==", false));
                    const reqSnap = await getDocs(reqQuery);
                    
                    reqSnap.forEach(async (docSnap) => {
                        const reqData = docSnap.data();
                        
                        const toast = document.createElement('div');
                        toast.style.cssText = "position:fixed;top:20px;right:20px;background:rgba(138,43,226,0.95);backdrop-filter:blur(10px);color:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:99999;font-family:'Poppins',sans-serif;font-size:0.95rem;display:flex;align-items:center;gap:15px;border:1px solid rgba(255,255,255,0.2);transform:translateX(120%);transition:transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);";
                        
                        const linkHtml = reqData.link 
                            ? `<a href="${reqData.link}" style="display:inline-block; margin-top:6px; color:#c488ff; font-weight:600; font-size:0.85rem; text-decoration:none;"><i class="fas fa-play-circle"></i> Watch Now</a>` 
                            : '';

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
                } catch(e) { console.warn("Notification error", e); }

                // 3. Cross-Device Sync
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
                    }
                } catch (err) {}
            }
        });

        // Live Sync for the specific drama you are watching
        if (isDramaPage) {
            document.addEventListener('click', (e) => {
                const clickedEpItem = e.target.closest('.episode-item');
                const clickedNextPrev = e.target.closest('#next-ep-btn') || e.target.closest('#prev-ep-btn');

                if (clickedEpItem || clickedNextPrev) {
                    setTimeout(async () => {
                        const dramaTitleElement = document.querySelector('.info-title') || document.querySelector('.drama-title') || document.querySelector('h1');
                        const dramaPosterElement = document.querySelector('.info-poster img') || document.querySelector('.drama-card-img img') || document.querySelector('img[src*="http"]');
                        
                        if (dramaTitleElement && dramaPosterElement) {
                            const dramaTitle = dramaTitleElement.innerText.trim();
                            const dramaId = dramaIdFromUrl || dramaTitle.replace(/\s+/g, '').toLowerCase();
                            
                            // Capture the exact episode index clicked
                            let epIndex = localStorage.getItem(`dramakan_ep_${dramaId}`) || "0";
                            if (clickedEpItem) {
                                epIndex = clickedEpItem.getAttribute('data-index');
                                localStorage.setItem(`dramakan_ep_${dramaId}`, epIndex);
                            }

                            // Force local timestamp update
                            let localHistory = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                            if (localHistory[dramaId]) {
                                localHistory[dramaId].timestamp = Date.now();
                                localHistory[dramaId].epIndex = epIndex;
                                localStorage.setItem('dramakan_history', JSON.stringify(localHistory));
                            }

                            if (userDocRef) {
                                const historyUpdate = {};
                                historyUpdate[`watchHistory.${dramaId}`] = {
                                    title: dramaTitle, img: dramaPosterElement.src, link: pagePath, timestamp: Date.now(), epIndex: epIndex
                                };
                                await updateDoc(userDocRef, historyUpdate).catch(()=>{});
                            }
                        }
                    }, 1000); 
                }
            });
            
            // Live Views Counter
            const titleSensorViews = setInterval(() => {
                const dramaTitleElement = document.querySelector('.info-title') || document.querySelector('h1');
                if (dramaTitleElement) {
                    const dramaTitle = dramaTitleElement.innerText.trim();
                    if (dramaTitle && !dramaTitle.includes("Loading")) {
                        clearInterval(titleSensorViews);
                        const dramaId = dramaIdFromUrl || dramaTitle.replace(/\s+/g, '').toLowerCase();
                        setDoc(doc(db, "drama_stats", dramaId), { title: dramaTitle, views: increment(1), lastActive: new Date() }, { merge: true }).catch(() => {});
                    }
                }
            }, 500);
        }

        // Affiliate Clicks
        if (creatorRef) {
            const findCreatorQuery = query(collection(db, "creators"), where("creatorId", "==", creatorRef));
            getDocs(findCreatorQuery).then((snap) => {
                snap.forEach((doc) => updateDoc(doc.ref, { totalClicks: increment(1), unpaidClicks: increment(1) }));
            });
        }

    }).catch(err => console.warn("Firebase scripts delayed."));
});

// ==========================================
// 8. GHOST PROTOCOL (ADMIN EASTER EGG)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // METHOD 1: PC/KEYBOARD - Type "admin" anywhere on the screen
    let secretKeys = '';
    document.addEventListener('keydown', (e) => {
        secretKeys += e.key.toLowerCase();
        if (secretKeys.length > 5) secretKeys = secretKeys.substring(secretKeys.length - 5);
        if (secretKeys === 'admin') {
            // Flash a quick transition effect
            document.body.style.transition = "filter 0.5s ease";
            document.body.style.filter = "invert(1) hue-rotate(180deg)";
            setTimeout(() => window.location.href = 'admin-dashboard.html', 500);
        }
    });

    // METHOD 2: MOBILE/TOUCH - Tap the Footer 7 times quickly
    let footerTapCount = 0;
    let footerTapTimer;
    
    // Attach listener to the footer
    const footer = document.querySelector('.main-footer');
    if (footer) {
        footer.addEventListener('click', () => {
            footerTapCount++;
            clearTimeout(footerTapTimer);
            
            if (footerTapCount >= 7) {
                // Haptic feedback if the mobile device supports it
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                document.body.style.transition = "filter 0.5s ease";
                document.body.style.filter = "invert(1) hue-rotate(180deg)";
                setTimeout(() => window.location.href = 'admin-dashboard.html', 500);
                footerTapCount = 0;
            }
            
            // Reset the counter if they stop tapping for 1.5 seconds
            footerTapTimer = setTimeout(() => { footerTapCount = 0; }, 1500);
        });
    }
});