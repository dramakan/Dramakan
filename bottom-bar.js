// ==========================================
// 1. PREMIUM PAGE TRANSITION ENGINE (LIQUID GLASS)
// ==========================================
(function initPageTransitions() {
    // 1. Inject the premium liquid glass loader styles dynamically
    if (!document.getElementById('dk-transition-styles')) {
        const style = document.createElement('style');
        style.id = 'dk-transition-styles';
        style.innerHTML = `
            #dk-global-loader {
                position: fixed; inset: 0; z-index: 999999;
                background: rgba(var(--bg-rgb, 11, 12, 16), 0.35);
                backdrop-filter: blur(24px) saturate(180%);
                -webkit-backdrop-filter: blur(24px) saturate(180%);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                opacity: 1; visibility: visible;
                transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.5s;
            }
            #dk-global-loader.hidden {
                opacity: 0; visibility: hidden; pointer-events: none;
            }
            .dk-glass-pill {
                display: flex; align-items: center; gap: 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
                border-radius: 50px;
                padding: 12px 28px 12px 14px;
                transform: translateY(0) scale(1);
                transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            #dk-global-loader.hidden .dk-glass-pill {
                transform: translateY(15px) scale(0.95);
            }
            .dk-liquid-blob {
                width: 32px; height: 32px;
                background: linear-gradient(135deg, var(--primary-color, #8A2BE2), #c488ff);
                box-shadow: 0 0 20px rgba(138, 43, 226, 0.4);
                animation: dk-liquid-morph 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .dk-loader-text {
                color: var(--text-color, #F5F5F5); 
                font-weight: 600; font-family: 'Poppins', sans-serif;
                letter-spacing: 1.5px; font-size: 0.95rem; 
                opacity: 0.9;
            }
            @keyframes dk-liquid-morph {
                0%, 100% { border-radius: 40% 60% 70% 30% / 40% 40% 60% 50%; transform: rotate(0deg) scale(1); }
                34% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; transform: rotate(120deg) scale(1.05); }
                67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: rotate(240deg) scale(0.95); }
            }
            /* Premium body fade in (no filter to avoid fixed position breaking) */
            body { animation: dk-body-fade 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
            @keyframes dk-body-fade { 
                from { opacity: 0.5; } 
                to { opacity: 1; } 
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Create and inject the loader element
    let loader = document.getElementById('dk-global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'dk-global-loader';
        loader.innerHTML = `
            <div class="dk-glass-pill">
                <div class="dk-liquid-blob"></div>
                <div class="dk-loader-text">DRAMAKAN</div>
            </div>
        `;
        // Insert as the very first element in the body
        document.documentElement.appendChild(loader); 
    }

    // 3. Fade out loader when the page is actually ready
    const hideLoader = () => {
        setTimeout(() => {
            if (loader) loader.classList.add('hidden');
        }, 150); // Tiny delay to ensure browser paint is finished
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        hideLoader();
    } else {
        window.addEventListener('DOMContentLoaded', hideLoader);
        window.addEventListener('load', hideLoader);
    }

    // Fix for Safari/Mobile back button caching (bfcache)
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) hideLoader();
    });

    // 4. Intercept clicks to show loader BEFORE navigating
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        
        // Ignore if not a link, opens in new tab, has a download attr, or uses modifier keys
        if (!link || !link.href || link.target === '_blank' || link.hasAttribute('download') || e.ctrlKey || e.metaKey) return;
        
        const isInternal = link.origin === window.location.origin && !link.hash && !link.href.includes('javascript:');
        
        // If it's a valid internal link to a different page
        if (isInternal && link.href !== window.location.href) {
            e.preventDefault(); // Stop instant navigation
            
            // Show the loader immediately
            loader.classList.remove('hidden');
            
            // Wait for the liquid glass fade-in animation to start, then navigate
            setTimeout(() => {
                window.location.href = link.href;
            }, 300); 
        }
    });
})();

// ==========================================
// 2. GLOBAL OPTIMISTIC UI (INSTANT DATA)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const cachedUser = localStorage.getItem('dk_user_cache');
    if (cachedUser) {
        try {
            const userData = JSON.parse(cachedUser);
            
            let avatarSrc = 'https://api.dicebear.com/7.x/adventurer/svg?seed=DramaKan';
            if(userData.avatarUrl) avatarSrc = userData.avatarUrl;
            else if(userData.username) avatarSrc = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userData.username)}`;
            
            const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
            const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

            const bottomAuth = document.getElementById('bottomAuthBtn');
            if(bottomAuth) { bottomAuth.href = 'profile.html'; bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`; }
            const topAuthBtn = document.getElementById('topAuthBtn');
            if(topAuthBtn) { topAuthBtn.href = 'profile.html'; topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`; }

            const uiUser = document.getElementById('ui-username');
            if(uiUser) uiUser.textContent = userData.username || "DramaFan";
            const uiEmail = document.getElementById('ui-email');
            if(uiEmail) uiEmail.textContent = userData.email || "";
            const uiAvatar = document.getElementById('ui-avatar');
            if(uiAvatar) uiAvatar.src = avatarSrc;

            const myListGrid = document.getElementById('mylist-grid-container');
            if(myListGrid && userData.myList) {
                const listArray = userData.myList;
                if (listArray.length > 0) {
                    myListGrid.innerHTML = listArray.slice().reverse().map(item => `
                        <div class="item-wrapper">
                            <a href="${item.link}" class="drama-card">
                                <div class="drama-card-img"><img src="${item.img}" alt="${item.title}"></div>
                                <div class="drama-card-info"><h3 class="drama-card-title">${item.title}</h3></div>
                            </a>
                            <button class="remove-btn" onclick="removeFromMyList('${item.title.replace(/'/g, "\\'")}')"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('');
                } else {
                    myListGrid.innerHTML = `<div class="empty-state"><i class="fas fa-bookmark"></i><h3>Your list is empty</h3></div>`;
                }
            }
        } catch(e) { console.error("Cache read error"); }
    }

    const historyGrid = document.getElementById('history-grid');
    if (historyGrid) {
        try {
            const historyObj = JSON.parse(localStorage.getItem('dramakan_history')) || {};
            const historyArr = Object.entries(historyObj)
                .filter(([k, i]) => i && i.link && i.title && !i.link.includes('index.html'))
                .sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            if (historyArr.length > 0) {
                historyGrid.innerHTML = historyArr.map(([id, item]) => `
                    <div class="item-wrapper">
                        <a href="${item.link}" class="drama-card">
                            <div class="drama-card-img"><img src="${item.img}"></div>
                            <div class="drama-card-info">
                                <h3 class="drama-card-title">${item.title}</h3>
                                <p class="drama-card-meta"><i class="fas fa-play"></i> Ep ${item.epIndex === "0" ? "1" : item.epIndex}</p>
                            </div>
                        </a>
                        <button class="remove-btn" onclick="removeFromHistory('${id}')"><i class="fas fa-times"></i></button>
                    </div>
                `).join('');
            } else {
                historyGrid.innerHTML = `<div class="empty-state"><i class="fas fa-tv"></i><h3>No watch history</h3></div>`;
            }
        } catch(e) {}
    }
});

// ==========================================
// 3. GLOBAL FUNCTION: MY LIST
// ==========================================
window.toggleMyList = async function(btn, title, img, link) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const { getFirestore, doc, setDoc, arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
        
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
        
        await setDoc(userRef, {
            myList: arrayUnion({ title: decodedTitle, img: decodeURIComponent(img), link: decodeURIComponent(link), addedAt: Date.now() })
        }, { merge: true });

        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.color = 'var(--primary-color)';
        btn.style.background = 'white';
        btn.style.borderColor = 'var(--primary-color)';
    } catch (e) {
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        alert("Error saving to My List.");
    }
};

// ==========================================
// 4. FIREBASE BACKGROUND SYNC (SILENT UPDATER)
// ==========================================
const urlParams = new URLSearchParams(window.location.search || window.location.hash.substring(1));
const dramaIdFromUrl = urlParams.get('id');
const creatorRef = urlParams.get('ref');

Promise.all([
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
]).then(async ([appModule, authModule, fsModule]) => {
    const { initializeApp, getApps, getApp } = appModule;
    const { getAuth, onAuthStateChanged } = authModule;
    const { getFirestore, doc, setDoc, increment, collection, query, where, getDocs, getDoc } = fsModule;

    const firebaseConfig = { apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA", authDomain: "dramakan007.firebaseapp.com", projectId: "dramakan007" };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    window.addEventListener('updateCloudHistory', async (e) => {
        if (auth.currentUser) {
            const { id } = e.detail;
            const localData = JSON.parse(localStorage.getItem('dramakan_history')) || {};
            if(localData[id]) {
                let historyUpdate = {};
                historyUpdate[`watchHistory.${id}`] = localData[id];
                await setDoc(doc(db, "users", auth.currentUser.uid), historyUpdate, {merge: true}).catch(()=>{});
            }
        }
    });

    if (!sessionStorage.getItem('dk_visited')) {
        sessionStorage.setItem('dk_visited', 'true');
        setDoc(doc(db, "drama_stats", "_global_visits_"), { views: increment(1), lastActive: new Date() }, { merge: true }).catch(() => {});
    }
    if (dramaIdFromUrl) setDoc(doc(db, "drama_stats", dramaIdFromUrl), { views: increment(1), lastActive: new Date() }, { merge: true }).catch(() => {});

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    localStorage.setItem('dk_user_cache', JSON.stringify(data));

                    let cloudHistory = data.watchHistory || {};
                    let localHistory = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                    let changed = false;

                    for (const [id, cloudItem] of Object.entries(cloudHistory)) {
                        if (cloudItem.link && !cloudItem.link.includes('index.html')) {
                            if (!localHistory[id] || Number(cloudItem.timestamp) > Number(localHistory[id].timestamp || 0)) {
                                localHistory[id] = cloudItem;
                                if (cloudItem.epIndex) localStorage.setItem(`dramakan_ep_${id}`, cloudItem.epIndex);
                                changed = true;
                            }
                        }
                    }
                    if (changed) {
                        localStorage.setItem('dramakan_history', JSON.stringify(localHistory));
                        window.dispatchEvent(new Event('historySynced')); 
                    }
                }
            } catch (err) {}
        } else {
            localStorage.removeItem('dk_user_cache');
        }
    });

    if (creatorRef) {
        const findCreatorQuery = query(collection(db, "creators"), where("creatorId", "==", creatorRef));
        getDocs(findCreatorQuery).then((snap) => snap.forEach((d) => setDoc(d.ref, { totalClicks: increment(1), unpaidClicks: increment(1) }, {merge: true})));
    }
}).catch(err => console.warn("Firebase scripts delayed."));

// ==========================================
// 5. NATIVE SCROLL MEMORY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    const pageKey = 'dk_scroll_' + window.location.pathname;

    window.addEventListener('beforeunload', () => sessionStorage.setItem(pageKey, window.scrollY));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') sessionStorage.setItem(pageKey, window.scrollY);
    });

    window.addEventListener('load', () => {
        const savedScroll = sessionStorage.getItem(pageKey);
        if (savedScroll) {
            window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' });
            setTimeout(() => window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' }), 500); 
        }
    });
});
// ==========================================
// 6. HIDDEN ADMIN EASTER EGG (Premium Transition)
// ==========================================
(function initAdminEasterEgg() {
    // 1. Inject Premium Admin Transition Styles Dynamically
    if (!document.getElementById('dk-admin-transition-styles')) {
        const style = document.createElement('style');
        style.id = 'dk-admin-transition-styles';
        style.innerHTML = `
            #admin-secret-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                z-index: 9999999; pointer-events: none; display: flex; 
                justify-content: center; align-items: center; overflow: hidden;
            }
            .admin-iris {
                width: 10px; height: 10px; border-radius: 50%;
                background: rgba(138, 43, 226, 0.95);
                box-shadow: 0 0 80px rgba(138, 43, 226, 1), inset 0 0 30px rgba(255,255,255,0.4);
                backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
                transform: scale(0); opacity: 0;
                transition: transform 1s cubic-bezier(0.7, 0, 0.2, 1), opacity 0.3s ease;
            }
            .admin-iris.expand {
                opacity: 1; transform: scale(400); /* Expands to swallow any screen size */
            }
            .admin-auth-wrapper {
                position: absolute; display: flex; flex-direction: column; align-items: center;
                opacity: 0; transform: translateY(20px) scale(0.95);
                transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s;
            }
            .admin-auth-wrapper.show {
                opacity: 1; transform: translateY(0) scale(1);
            }
            .admin-auth-icon { 
                font-size: 3rem; color: #fff; margin-bottom: 15px;
                filter: drop-shadow(0 0 15px rgba(255,255,255,0.6));
            }
            .admin-auth-text {
                color: white; font-family: 'Poppins', sans-serif;
                font-size: 1.5rem; font-weight: 700; letter-spacing: 4px;
                text-transform: uppercase; text-shadow: 0 0 20px rgba(255,255,255,0.8);
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Create the overlay elements in the DOM
    const overlay = document.createElement('div');
    overlay.id = 'admin-secret-overlay';
    
    const iris = document.createElement('div');
    iris.className = 'admin-iris';
    
    const authWrapper = document.createElement('div');
    authWrapper.className = 'admin-auth-wrapper';
    authWrapper.innerHTML = `
        <i class="fas fa-fingerprint admin-auth-icon"></i>
        <div class="admin-auth-text">System Unlocked</div>
    `;

    overlay.appendChild(iris);
    overlay.appendChild(authWrapper);
    document.body.appendChild(overlay);

    // 3. The Cinematic Transition Function
    function triggerAdminTransition() {
        // Prevent multiple triggers if someone spams the button
        if (iris.classList.contains('expand')) return;
        
        // Hide the standard page loader so they don't overlap
        const standardLoader = document.getElementById('dk-global-loader');
        if (standardLoader) standardLoader.style.display = 'none';

        // Fire the animation
        iris.classList.add('expand');
        authWrapper.classList.add('show');
        
        // Wait for the visual effect to peak, then navigate
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 1300); 
    }

    // --- TRIGGER 1: PC Keyboard Secret Word ---
    const secretCode = ['a', 'd', 'm', 'i', 'n'];
    let codeIndex = 0;
    
    document.addEventListener('keydown', (e) => {
        // Ignore typing if the user is inside a search bar or form
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key.toLowerCase() === secretCode[codeIndex]) {
            codeIndex++;
            if (codeIndex === secretCode.length) {
                triggerAdminTransition();
                codeIndex = 0;
            }
        } else {
            codeIndex = 0; // Reset if they break the sequence
        }
    });

    // --- TRIGGER 2: Mobile/Touch Footer Tapping ---
    let tapCount = 0;
    let tapTimer = null;
    
    document.addEventListener('DOMContentLoaded', () => {
        const footers = document.querySelectorAll('.main-footer');
        
        footers.forEach(footer => {
            footer.addEventListener('click', () => {
                tapCount++;
                clearTimeout(tapTimer);
                
                // 7 Taps required
                if (tapCount >= 7) {
                    triggerAdminTransition();
                    tapCount = 0;
                }
                
                // Reset the count if they stop tapping for 1 second
                tapTimer = setTimeout(() => {
                    tapCount = 0;
                }, 1000); 
            });
        });
    });
})();
// ==========================================
// 7. REAL-TIME BROADCAST LISTENER
// ==========================================
(async function initLiveNotifications() {
    // 1. Inject Premium Toast CSS
    if (!document.getElementById('dk-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'dk-toast-styles';
        style.innerHTML = `
            #dk-toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
            .dk-toast { background: rgba(11, 12, 16, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(138, 43, 226, 0.4); border-left: 4px solid var(--primary-color, #8A2BE2); border-radius: 12px; padding: 16px 20px; width: 320px; max-width: calc(100vw - 40px); box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(138, 43, 226, 0.15); transform: translateX(120%); opacity: 0; transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1); pointer-events: auto; cursor: pointer; }
            .dk-toast.show { transform: translateX(0); opacity: 1; }
            .dk-toast-title { color: #fff; font-weight: 600; font-size: 0.95rem; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif;}
            .dk-toast-body { color: #a1a1aa; font-size: 0.85rem; line-height: 1.4; font-family: 'Poppins', sans-serif;}
            .dk-toast-icon { color: var(--primary-color, #8A2BE2); animation: pulse 2s infinite; }
            @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        `;
        document.head.appendChild(style);
    }

    // 2. Create Toast Container
    const toastContainer = document.createElement('div');
    toastContainer.id = 'dk-toast-container';
    document.body.appendChild(toastContainer);

    function showToast(title, message, link) {
        const toast = document.createElement('div');
        toast.className = 'dk-toast';
        toast.innerHTML = `
            <div class="dk-toast-title"><i class="fas fa-bell dk-toast-icon"></i> ${title}</div>
            <div class="dk-toast-body">${message}</div>
        `;
        
        if (link) {
            toast.addEventListener('click', () => { window.location.href = link; });
        } else {
            toast.addEventListener('click', () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); });
        }

        toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => { requestAnimationFrame(() => { toast.classList.add('show'); }); });
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 8000);
    }

    // 3. Connect to Firebase and Listen
    const { getFirestore, collection, query, orderBy, limit, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
    const db = getFirestore();
    const auth = getAuth();

    // Only listen to notifications created AFTER the user loaded the page
    const PAGE_LOAD_TIME = Date.now();
    const notifQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(1));

    let isFirstLoad = true;

    onSnapshot(notifQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                
                // Prevent spamming the last notification on initial page load
                if (isFirstLoad || data.createdAt <= PAGE_LOAD_TIME) return;

                // Target Audience Routing
                const currentUser = auth.currentUser;
                const cachedUser = localStorage.getItem('dk_user_cache'); // Custom cache you built
                
                // Determine user type
                let userType = 'guest';
                if (currentUser) {
                    // Check if they are an affiliate (your dashboard uses current URL or cache logic, adjusting safely here)
                    if (window.location.pathname.includes('affiliate')) {
                        userType = 'creators';
                    } else {
                        userType = 'viewers';
                    }
                }

                // Show notification based on target
                if (data.target === 'all' || data.target === userType) {
                    showToast(data.title, data.message, data.link);
                }
            }
        });
        isFirstLoad = false;
    });
})();
// ==========================================
// 8. PUSH NOTIFICATION REGISTRATION
// ==========================================
Promise.all([
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging.js"),
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
]).then(async ([appModule, msgModule, authModule, fsModule]) => {
    const app = appModule.getApp(); // Re-use existing initialized app
    const messaging = msgModule.getMessaging(app);
    const auth = authModule.getAuth(app);
    const db = fsModule.getFirestore(app);

    // You need to generate a VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration
    const VAPID_KEY = "REPLACE_WITH_YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE"; 

    async function requestNotificationPermission(user) {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const currentToken = await msgModule.getToken(messaging, { vapidKey: VAPID_KEY });
                if (currentToken) {
                    // Save token to user's profile
                    await fsModule.updateDoc(fsModule.doc(db, "users", user.uid), {
                        fcmToken: currentToken
                    });
                }
            }
        } catch (error) {
            console.log("Push notifications denied or failed.", error);
        }
    }

    // When user logs in, ask for permission
    authModule.onAuthStateChanged(auth, (user) => {
        if (user) {
            requestNotificationPermission(user);
        }
    });
});