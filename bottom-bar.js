// ==========================================
// 1. UI AUTHENTICATION CHECK
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('dramakan_token');
    if (token) {
        const bottomAuth = document.getElementById('bottomAuthBtn');
        if(bottomAuth) {
            bottomAuth.href = 'profile.html';
            bottomAuth.innerHTML = '<i class="fas fa-user-circle nav-icon"></i><span class="nav-label">Profile</span>';
        }
    }
});

// ==========================================
// 2. THE MASTER TRACKING ENGINE (Affiliates & Views)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007",
    storageBucket: "dramakan007.firebasestorage.app",
    messagingSenderId: "1069933586213",
    appId: "1:1069933586213:web:b28ab37436679a4906dccc"
};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const creatorRef = urlParams.get('ref');
    
    // Check if we are on a drama page by looking for the video player
    const videoIframe = document.querySelector('iframe');
    const dramaTitleElement = document.querySelector('.info-title');

    // ONLY load Firebase if we need to track an affiliate OR a drama view (keeps site fast)
    if (creatorRef || (videoIframe && dramaTitleElement)) {
        Promise.all([
            import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
            import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
        ]).then(([appModule, fsModule]) => {
            const { initializeApp, getApps, getApp } = appModule;
            const { getFirestore, collection, query, where, getDocs, updateDoc, increment, doc, setDoc } = fsModule;
            
            const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
            const db = getFirestore(app);

            // A. AFFILIATE TRACKING
            if (creatorRef) {
                const findCreatorQuery = query(collection(db, "creators"), where("creatorId", "==", creatorRef));
                getDocs(findCreatorQuery).then((querySnapshot) => {
                    querySnapshot.forEach((document) => {
                        updateDoc(document.ref, { totalClicks: increment(1), unpaidClicks: increment(1) });
                    });
                });
            }

            // B. LIVE DRAMA VIEW TRACKING
            if (videoIframe && dramaTitleElement) {
                const dramaTitle = dramaTitleElement.innerText.trim();
                const dramaId = dramaTitle.replace(/\s+/g, '').toLowerCase(); // e.g., "boyfriendondemand"
                
                // Add +1 View to this drama in Firebase
                setDoc(doc(db, "drama_stats", dramaId), {
                    title: dramaTitle,
                    views: increment(1),
                    lastActive: new Date()
                }, { merge: true });
            }
        }).catch(err => console.error("Firebase tracking error:", err));
    }

    // C. CONTINUE WATCHING MEMORY (Saves to the user's phone instantly)
    if (videoIframe && dramaTitleElement) {
        const dramaTitle = dramaTitleElement.innerText.trim();
        const dramaImg = document.querySelector('.info-poster img')?.src || '';
        const pagePath = window.location.pathname.split('/').pop() || window.location.href;
        const dramaId = dramaTitle.replace(/\s+/g, '').toLowerCase();

        let history = JSON.parse(localStorage.getItem('dramakan_history')) || {};
        history[dramaId] = {
            title: dramaTitle,
            img: dramaImg,
            link: pagePath,
            timestamp: Date.now()
        };
        localStorage.setItem('dramakan_history', JSON.stringify(history));
    }
});

// ==========================================
// 3. SECRET ADMIN PORTAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'Y') window.location.href = 'admin-dashboard.html';
    });
    const footerText = document.querySelector('.main-footer');
    if (footerText) {
        let tapCount = 0; let tapTimer;
        footerText.addEventListener('click', () => {
            tapCount++; clearTimeout(tapTimer);
            if (tapCount >= 5) window.location.href = 'admin-dashboard.html';
            tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
        });
    }
});