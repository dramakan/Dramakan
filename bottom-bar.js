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
// DRAMAKAN AFFILIATE TRACKING ENGINE
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const creatorRef = urlParams.get('ref');

// If a creator link is detected, activate the tracking
if (creatorRef) {
    
    // We dynamically load Firebase ONLY when needed so the site stays fast
    Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
    ]).then(([firebaseApp, firestore]) => {
        
        // 1. PASTE YOUR FIREBASE KEYS HERE
       const firebaseConfig = {
  apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
  authDomain: "dramakan007.firebaseapp.com",
  projectId: "dramakan007",
  storageBucket: "dramakan007.firebasestorage.app",
  messagingSenderId: "1069933586213",
  appId: "1:1069933586213:web:b28ab37436679a4906dccc"
};
        
        // 2. Wake up the database
        const app = firebaseApp.initializeApp(firebaseConfig);
        const db = firestore.getFirestore(app);
        
        // 3. Find the specific creator in the database
        const creatorsCollection = firestore.collection(db, "creators");
        const findCreatorQuery = firestore.query(creatorsCollection, firestore.where("creatorId", "==", creatorRef));
        
        // 4. Add +1 to their clicks
        firestore.getDocs(findCreatorQuery).then((querySnapshot) => {
            querySnapshot.forEach((document) => {
                firestore.updateDoc(document.ref, {
                    totalClicks: firestore.increment(1),
                    unpaidClicks: firestore.increment(1)
                });
                console.log("View successfully credited to: " + creatorRef);
            });
        });
        
    }).catch(err => console.error("Tracking error:", err));
}