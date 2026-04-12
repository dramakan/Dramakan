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
// 1. GLOBAL VARIABLES & TRACKING ENGINE
// ==========================================
// FIX: Variables must be global so Part B doesn't throw a ReferenceError
const urlParams = new URLSearchParams(window.location.search || window.location.hash.substring(1));
const dramaIdFromUrl = urlParams.get('id');
const creatorRef = urlParams.get('ref');

const pagePath = window.location.pathname.replace(/^\/+/, '') + window.location.search;
const isExcludePage = pagePath.toLowerCase().includes('index.html') || 
                      pagePath.toLowerCase().includes('profile.html') || 
                      pagePath.toLowerCase().includes('login.html') ||
                      pagePath === '' || pagePath === '/';

window.processDramaTracking = function(id, title, img, link) {
    if(!id) return;
    try {
        let history = JSON.parse(localStorage.getItem('dramakan_history')) || {};
        let epIndex = localStorage.getItem(`dramakan_ep_${id}`) || "0";
        
        title = title || history[id]?.title || "Watch Drama";
        img = img || history[id]?.img || `https://api.dicebear.com/7.x/shapes/svg?seed=${id}`;
        
        if(history[id] && history[id].img && !history[id].img.includes('dicebear') && img.includes('dicebear')) {
            img = history[id].img;
        }

        history[id] = { title, img, link: link || pagePath, timestamp: Date.now(), epIndex };
        localStorage.setItem('dramakan_history', JSON.stringify(history));
        window.dispatchEvent(new Event('historySynced'));
    } catch(e) { console.error("Tracking Error:", e); }
};

function initDramaTracker() {
    if (dramaIdFromUrl && !isExcludePage) {
        // INSTANT SOFT-SAVE
        window.processDramaTracking(dramaIdFromUrl, document.title || "Loading Drama...", null, pagePath);

        // Auto Seek Episode Logic
        let epIndex = localStorage.getItem(`dramakan_ep_${dramaIdFromUrl}`) || "0";
        if (epIndex !== "0") {
            let epSearch = 0;
            const seeker = setInterval(() => {
                const targetEp = document.querySelector(`.episode-item[data-index="${epIndex}"]`);
                if (targetEp) {
                    targetEp.click();
                    try { targetEp.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){}
                    clearInterval(seeker);
                }
                if (++epSearch > 20) clearInterval(seeker);
            }, 500);
        }

        // Aggressive DOM Scraper
        let scanAttempts = 0;
        const scanner = setInterval(() => {
            let title = ""; let img = "";
            
            const h1 = document.querySelector('h1, h2, h3.title, .drama-title');
            if (h1 && !h1.innerText.includes('Loading') && !h1.innerText.includes('DramaKan')) {
                title = h1.innerText.trim();
            } else if (document.title && document.title.includes('-')) {
                title = document.title.split('-')[0].replace('Watch', '').trim();
            }

            const vid = document.querySelector('video');
            if (vid && vid.poster) {
                img = vid.poster;
            } else {
                const imgs = Array.from(document.querySelectorAll('img')).filter(i => i.src && i.clientWidth > 100 && !i.src.includes('logo'));
                if(imgs.length > 0) img = imgs[0].src;
            }

            if (title && title !== 'Loading Drama...' && img) {
                clearInterval(scanner);
                window.processDramaTracking(dramaIdFromUrl, title, img, pagePath);
            }
            
            if (++scanAttempts > 10) { 
                clearInterval(scanner);
                window.processDramaTracking(dramaIdFromUrl, title, img, pagePath);
            }
        }, 500);

        // SYNCHRONOUS EPISODE CLICKER
        document.addEventListener('click', (e) => {
            const epBtn = e.target.closest('.episode-item');
            if (epBtn) {
                let newEpIdx = epBtn.getAttribute('data-index') || epBtn.innerText.replace(/\D/g, '');
                if(!newEpIdx) newEpIdx = "1";
                
                localStorage.setItem(`dramakan_ep_${dramaIdFromUrl}`, newEpIdx);
                let history = JSON.parse(localStorage.getItem('dramakan_history')) || {};
                
                if(history[dramaIdFromUrl]) {
                    history[dramaIdFromUrl].epIndex = newEpIdx;
                    history[dramaIdFromUrl].timestamp = Date.now();
                    localStorage.setItem('dramakan_history', JSON.stringify(history));
                } else {
                    window.processDramaTracking(dramaIdFromUrl, document.title, null, pagePath);
                }
                
                window.dispatchEvent(new CustomEvent('updateCloudHistory', { detail: { id: dramaIdFromUrl, epIndex: newEpIdx } }));
            }
        });
    }
}

// Execute Tracker
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDramaTracker);
} else {
    initDramaTracker();
}

// ---------------------------------------------------------
// PART B: ASYNCHRONOUS FIREBASE SYNC & USER PROFILES
// ---------------------------------------------------------
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

    // Background Listeners for Live Tracking
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

    // Global Site Visits
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