// ==========================================
// 1. PREMIUM PAGE TRANSITION ENGINE (SMOOTH MASK)
// ==========================================
(function initPageTransitions() {
    // 1. Inject the premium loader styles dynamically
    if (!document.getElementById('dk-transition-styles')) {
        const style = document.createElement('style');
        style.id = 'dk-transition-styles';
        style.innerHTML = `
            #dk-global-loader {
                position: fixed; inset: 0; z-index: 999999;
                background: var(--background-color, #0B0C10);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                opacity: 1; visibility: visible;
                transition: opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.4s;
            }
            #dk-global-loader.hidden {
                opacity: 0; visibility: hidden; pointer-events: none;
            }
            .dk-loader-content {
                display: flex; flex-direction: column; align-items: center; gap: 15px;
                transform: scale(0.95); transition: transform 0.4s ease-out;
            }
            #dk-global-loader:not(.hidden) .dk-loader-content {
                transform: scale(1);
            }
            .dk-spinner {
                width: 45px; height: 45px;
                border: 3px solid rgba(138, 43, 226, 0.15);
                border-top-color: var(--primary-color, #8A2BE2);
                border-radius: 50%;
                animation: dk-spin 0.8s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite;
                box-shadow: 0 0 15px rgba(138, 43, 226, 0.2);
            }
            .dk-loader-text {
                color: var(--text-color, #F5F5F5); font-weight: 600; font-family: 'Poppins', sans-serif;
                letter-spacing: 2px; font-size: 0.9rem; opacity: 0.8;
                text-shadow: 0 2px 10px rgba(0,0,0,0.5);
            }
            @keyframes dk-spin { to { transform: rotate(360deg); } }
            
            /* Add a subtle fade-in to the whole page body for extra smoothness */
            body { animation: dk-body-fade 0.5s ease-out forwards; }
            @keyframes dk-body-fade { from { opacity: 0.8; } to { opacity: 1; } }
        `;
        document.head.appendChild(style);
    }

    // 2. Create and inject the loader element
    let loader = document.getElementById('dk-global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'dk-global-loader';
        loader.innerHTML = `
            <div class="dk-loader-content">
                <div class="dk-spinner"></div>
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
            
            // Wait for the fade-in animation to start, then navigate
            setTimeout(() => {
                window.location.href = link.href;
            }, 250); 
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