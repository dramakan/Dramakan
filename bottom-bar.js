// ==========================================
// 1. GLOBAL OPTIMISTIC UI (ZERO-LAG RENDER)
// ==========================================
// This runs instantly to stop the UI from flashing blank sections or "Loading" states
document.addEventListener('DOMContentLoaded', () => {
    const cachedUser = localStorage.getItem('dk_user_cache');
    
    if (cachedUser) {
        try {
            const userData = JSON.parse(cachedUser);
            
            // --- A. Instant Header Auth Icons ---
            let avatarSrc = 'https://api.dicebear.com/7.x/adventurer/svg?seed=DramaKan';
            if(userData.avatarUrl) avatarSrc = userData.avatarUrl;
            else if(userData.username) avatarSrc = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userData.username)}`;
            
            const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
            const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

            const bottomAuth = document.getElementById('bottomAuthBtn');
            if(bottomAuth) { bottomAuth.href = 'profile.html'; bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`; }
            const topAuthBtn = document.getElementById('topAuthBtn');
            if(topAuthBtn) { topAuthBtn.href = 'profile.html'; topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`; }

            // --- B. Instant Profile Page Data ---
            const uiUser = document.getElementById('ui-username');
            if(uiUser) uiUser.textContent = userData.username || "DramaFan";
            
            const editUser = document.getElementById('edit-username');
            if(editUser) editUser.value = userData.username || "";
            
            const uiEmail = document.getElementById('ui-email');
            if(uiEmail) uiEmail.textContent = userData.email || "";
            
            const editEmail = document.getElementById('edit-email');
            if(editEmail) editEmail.value = userData.email || "";
            
            const uiAvatar = document.getElementById('ui-avatar');
            if(uiAvatar) uiAvatar.src = avatarSrc;

            // --- C. Instant My List Grid (Profile & MyList pages) ---
            const myListGrid = document.getElementById('mylist-grid-container');
            if(myListGrid && userData.myList) {
                const listArray = userData.myList;
                if (listArray.length > 0) {
                    // Create a copy of array with slice() before reversing to avoid mutating the cache
                    myListGrid.innerHTML = listArray.slice().reverse().map(item => `
                        <div class="item-wrapper">
                            <a href="${item.link}" class="drama-card">
                                <div class="drama-card-img"><img src="${item.img}" alt="${item.title}"></div>
                                <div class="drama-card-info">
                                    <h3 class="drama-card-title">${item.title}</h3>
                                </div>
                            </a>
                            <button class="remove-btn" onclick="removeFromMyList('${item.title.replace(/'/g, "\\'")}')" title="Remove from My List">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('');
                } else {
                    myListGrid.innerHTML = `<div class="empty-state"><i class="fas fa-bookmark"></i><h3>Your list is empty</h3><p style="font-size:0.9rem; margin-top:10px;">Find dramas you like and tap the + button to save them here.</p><a href="index.html" style="display:inline-block; margin-top:20px; padding: 10px 24px; background:var(--primary-color); color:#fff; border-radius:50px; text-decoration:none; font-weight:500;">Browse Dramas</a></div>`;
                }
            }
        } catch(e) { console.error("Cache read error"); }
    }
});

// ==========================================
// 2. GLOBAL FUNCTION: MY LIST / BOOKMARKS
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
        console.error(e);
        btn.innerHTML = '<i class="fas fa-plus"></i>';
        alert("Error saving to My List.");
    }
};

// ==========================================
// GLOBAL VARIABLES FOR SYNC
// ==========================================
const urlParams = new URLSearchParams(window.location.search || window.location.hash.substring(1));
const dramaIdFromUrl = urlParams.get('id');
const creatorRef = urlParams.get('ref');

// ==========================================
// 3. ASYNCHRONOUS FIREBASE SYNC (SILENT UPDATER)
// ==========================================
Promise.all([
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
]).then(async ([appModule, authModule, fsModule]) => {
    const { initializeApp, getApps, getApp } = appModule;
    const { getAuth, onAuthStateChanged } = authModule;
    const { getFirestore, doc, setDoc, increment, collection, query, where, getDocs, updateDoc, getDoc } = fsModule;

    const firebaseConfig = { apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA", authDomain: "dramakan007.firebaseapp.com", projectId: "dramakan007" };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Listen for Save Events from watch.html
    window.addEventListener('updateCloudHistory', async (e) => {
        if (auth.currentUser) {
            const { id, epIndex } = e.detail;
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

    if (dramaIdFromUrl) {
        setDoc(doc(db, "drama_stats", dramaIdFromUrl), { views: increment(1), lastActive: new Date() }, { merge: true }).catch(() => {});
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            
            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    
                    // SAVE THE ENTIRE FRESH FIREBASE DOC TO CACHE FOR ZERO-LAG ON NEXT PAGE LOAD
                    localStorage.setItem('dk_user_cache', JSON.stringify(data));
                    
                    // Update Auth Buttons if needed
                    let avatarSrc = 'https://api.dicebear.com/7.x/adventurer/svg?seed=DramaKan'; 
                    if (data.avatarUrl) avatarSrc = data.avatarUrl; 
                    else if (data.username) avatarSrc = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.username)}`;

                    const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
                    const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

                    const bottomAuth = document.getElementById('bottomAuthBtn');
                    if(bottomAuth) { bottomAuth.href = 'profile.html'; bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`; }
                    const topAuthBtn = document.getElementById('topAuthBtn');
                    if(topAuthBtn) { topAuthBtn.href = 'profile.html'; topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`; }

                    // Sync History quietly
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

                    for (const [id, localItem] of Object.entries(localHistory)) {
                        if (localItem.link && !localItem.link.includes('index.html')) {
                            if (!cloudHistory[id] || Number(localItem.timestamp) > Number(cloudHistory[id].timestamp || 0)) {
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
        } else {
            // User is explicitly logged out - destroy the cache and revert UI to Login
            localStorage.removeItem('dk_user_cache');
            
            const bottomAuth = document.getElementById('bottomAuthBtn');
            if(bottomAuth) { bottomAuth.href = 'login.html'; bottomAuth.innerHTML = `<i class="fa-solid fa-user nav-icon"></i><span class="nav-label">Login</span>`; }
            const topAuthBtn = document.getElementById('topAuthBtn');
            if(topAuthBtn) { topAuthBtn.href = 'login.html'; topAuthBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Login`; }
        }
    });

    if (creatorRef) {
        const findCreatorQuery = query(collection(db, "creators"), where("creatorId", "==", creatorRef));
        getDocs(findCreatorQuery).then((snap) => {
            snap.forEach((doc) => updateDoc(doc.ref, { totalClicks: increment(1), unpaidClicks: increment(1) }));
        });
    }
}).catch(err => console.warn("Firebase scripts delayed."));

// ==========================================
// 4. GLOBAL NATIVE-APP SCROLL MEMORY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    const pageKey = 'dk_scroll_' + window.location.pathname;

    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem(pageKey, window.scrollY);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            sessionStorage.setItem(pageKey, window.scrollY);
        }
    });

    window.addEventListener('load', () => {
        const savedScroll = sessionStorage.getItem(pageKey);
        if (savedScroll) {
            window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' });
            setTimeout(() => {
                window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' });
            }, 500); 
        }
    });
});

// ==========================================
// 5. ADMIN EASTER EGG
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
});