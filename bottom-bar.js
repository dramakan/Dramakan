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
// ==========================================
// 4. SECRET ADMIN PORTAL (EASTER EGG)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // PC METHOD: The Keyboard Cheat Code (Ctrl + Shift + Y)
    document.addEventListener('keydown', (e) => {
        // You can change 'Y' to any letter you want!
        if (e.ctrlKey && e.shiftKey && e.key === 'Y') {
            window.location.href = 'admin-dashboard.html';
        }
    });

    // MOBILE METHOD: The "5-Tap" Footer Trick
    // Finds the footer at the bottom of the page
    const footerText = document.querySelector('.main-footer') || document.querySelector('footer');
    
    if (footerText) {
        let tapCount = 0;
        let tapTimer;

        footerText.addEventListener('click', () => {
            tapCount++;
            clearTimeout(tapTimer);

            // If tapped 5 times fast, teleport to the admin dashboard
            if (tapCount >= 5) {
                window.location.href = 'admin-dashboard.html';
            }

            // Reset the counter if you stop tapping for 1.5 seconds
            tapTimer = setTimeout(() => { 
                tapCount = 0; 
            }, 1500);
        });
    }
});
