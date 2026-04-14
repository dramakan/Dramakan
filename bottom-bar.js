// ==========================================
// OPTIMISTIC UI: INSTANT AUTH RENDER
// ==========================================
// This runs instantly to stop the UI from flashing "Login" on every page load
document.addEventListener('DOMContentLoaded', () => {
    const cachedAuth = localStorage.getItem('dk_auth_cache');
    if (cachedAuth) {
        try {
            const { avatarSrc } = JSON.parse(cachedAuth);
            const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
            const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

            const bottomAuth = document.getElementById('bottomAuthBtn');
            if(bottomAuth) { bottomAuth.href = 'profile.html'; bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`; }
            const topAuthBtn = document.getElementById('topAuthBtn');
            if(topAuthBtn) { topAuthBtn.href = 'profile.html'; topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`; }
        } catch(e) { console.error("Auth cache error"); }
    }
});

// ==========================================
// GLOBAL FUNCTION: MY LIST / BOOKMARKS
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
// ASYNCHRONOUS FIREBASE SYNC & USER PROFILES
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
            
            let avatarSrc = 'https://api.dicebear.com/7.x/adventurer/svg?seed=DramaKan'; 
            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.avatarUrl) avatarSrc = data.avatarUrl; 
                    else if (data.username) avatarSrc = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(data.username)}`;
                }
            } catch (error) { }

            // Save the verified data to the local cache so the NEXT page load is instant
            localStorage.setItem('dk_auth_cache', JSON.stringify({ avatarSrc: avatarSrc }));

            const pcAvatarHtml = `<img src="${avatarSrc}" alt="Profile" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.8);">`;
            const mobileAvatarHtml = `<img src="${avatarSrc}" alt="Profile" class="nav-icon" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color); margin-bottom: 4px;">`;

            const bottomAuth = document.getElementById('bottomAuthBtn');
            if(bottomAuth) { bottomAuth.href = 'profile.html'; bottomAuth.innerHTML = `${mobileAvatarHtml}<span class="nav-label">Profile</span>`; }
            const topAuthBtn = document.getElementById('topAuthBtn');
            if(topAuthBtn) { topAuthBtn.href = 'profile.html'; topAuthBtn.innerHTML = `${pcAvatarHtml} Profile`; }

            try {
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const data = userDoc.data();
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
            localStorage.removeItem('dk_auth_cache');
            
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
// ADMIN EASTER EGG
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
// ==========================================
// GLOBAL NATIVE-APP SCROLL MEMORY
// ==========================================
// This makes every page remember where the user left off
document.addEventListener('DOMContentLoaded', () => {
    // 1. Disable the browser's clunky default jump
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // 2. Create a unique memory key for whichever page they are currently on
    // Example: "scroll_/profile.html" or "scroll_/mylist.html"
    const pageKey = 'dk_scroll_' + window.location.pathname;

    // 3. Save the exact pixel coordinate right before they leave the page
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem(pageKey, window.scrollY);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            sessionStorage.setItem(pageKey, window.scrollY);
        }
    });

    // 4. Restore the scroll position when they come back
    window.addEventListener('load', () => {
        const savedScroll = sessionStorage.getItem(pageKey);
        if (savedScroll) {
            // First attempt: Snap instantly for static pages
            window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' });
            
            // Second attempt: Wait 500ms for Firebase dynamic grids to finish building
            // then snap them perfectly into place
            setTimeout(() => {
                window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' });
            }, 500); 
        }
    });
});