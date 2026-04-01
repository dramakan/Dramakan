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
// 2. DRAMAKAN BULLETPROOF "CINEMA MODE" ENGINE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const videoIframe = document.querySelector('iframe');
    if (!videoIframe) return;

    const cinemaBtn = document.createElement('button');
    cinemaBtn.className = 'btn-cinema';
    cinemaBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Cinema Mode';
    videoIframe.parentNode.insertBefore(cinemaBtn, videoIframe);

    cinemaBtn.addEventListener('click', () => {
        document.body.classList.toggle('cinema-mode-active');
        
        if(document.body.classList.contains('cinema-mode-active')) {
            cinemaBtn.innerHTML = '<i class="fas fa-sun"></i> Turn on Lights';
            videoIframe.style.position = 'relative';
            videoIframe.style.zIndex = '99999';
            cinemaBtn.style.position = 'relative';
            cinemaBtn.style.zIndex = '99999';
            videoIframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            cinemaBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Cinema Mode';
            videoIframe.style.zIndex = '1';
            cinemaBtn.style.zIndex = '1';
        }
    });
});

// ==========================================
// 3. DRAMAKAN SECURE AFFILIATE TRACKING
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const creatorRef = urlParams.get('ref');

if (creatorRef) {
    // Dynamically load Firebase securely
    Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
    ]).then(([appModule, fsModule]) => {
        
        const { initializeApp, getApps, getApp } = appModule;
        const { getFirestore, collection, query, where, getDocs, updateDoc, increment } = fsModule;

        const firebaseConfig = {
            apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
            authDomain: "dramakan007.firebaseapp.com",
            projectId: "dramakan007",
            storageBucket: "dramakan007.firebasestorage.app",
            messagingSenderId: "1069933586213",
            appId: "1:1069933586213:web:b28ab37436679a4906dccc"
        };
        
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(app);
        
        const creatorsCollection = collection(db, "creators");
        const findCreatorQuery = query(creatorsCollection, where("creatorId", "==", creatorRef));
        
        getDocs(findCreatorQuery).then((querySnapshot) => {
            querySnapshot.forEach((document) => {
                updateDoc(document.ref, {
                    totalClicks: increment(1),
                    unpaidClicks: increment(1)
                });
                console.log("View tracked securely for: " + creatorRef);
            });
        });
        
    }).catch(err => console.error("Tracking error:", err));
}