import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// 1. Get cached tier immediately
const activeTier = localStorage.getItem('dramakan_vip_tier') || 'Basic';
let sandboxObserver = null;

function applyPremiumFeatures(tier) {
    // --- FEATURE 1: HIDE GOOGLE/UI ADS (ELITE & CROWN) ---
    if (tier.includes('Elite') || tier.includes('Crown')) {
        document.body.classList.add('premium-active');
        if (!document.getElementById('premium-ad-blocker')) {
            const style = document.createElement('style');
            style.id = 'premium-ad-blocker';
            style.innerHTML = `
                ins.adsbygoogle, .ad-container, .ad-banner, .popup-ad, [id^="div-gpt-ad"] {
                    display: none !important; opacity: 0 !important; pointer-events: none !important; width: 0 !important; height: 0 !important;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        document.body.classList.remove('premium-active');
        const style = document.getElementById('premium-ad-blocker');
        if (style) style.remove();
    }

    // --- FEATURE 2: STRICT VIDEO SANDBOX LOGIC ---
    let iframeStateChanged = false;
    const iframes = document.querySelectorAll('iframe');

    if (tier.includes('Crown')) {
        // Enforce Sandbox for Crown ONLY
        iframes.forEach(iframe => {
            if (!iframe.src.includes('google') && !iframe.src.includes('firebase') && !iframe.hasAttribute('sandbox')) {
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
                iframeStateChanged = true;
            }
        });

        // Set up the observer to catch dynamically loaded iframes
        if (!sandboxObserver) {
            sandboxObserver = new MutationObserver(() => {
                document.querySelectorAll('iframe').forEach(iframe => {
                    if (!iframe.src.includes('google') && !iframe.src.includes('firebase') && !iframe.hasAttribute('sandbox')) {
                        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
                    }
                });
            });
            sandboxObserver.observe(document.body, { childList: true, subtree: true });
        }
    } else {
        // STRICTLY REMOVE Sandbox for Basic and Elite
        if (sandboxObserver) {
            sandboxObserver.disconnect();
            sandboxObserver = null;
        }
        
        iframes.forEach(iframe => {
            if (iframe.hasAttribute('sandbox')) {
                iframe.removeAttribute('sandbox');
                iframeStateChanged = true;
            }
        });
    }

    // If the state changed, reload the iframe to clear errors
    if (iframeStateChanged) {
        iframes.forEach(iframe => { 
            if (!iframe.src.includes('google') && !iframe.src.includes('firebase')) {
                const currentSrc = iframe.src;
                iframe.src = '';
                setTimeout(() => { iframe.src = currentSrc; }, 50);
            }
        });
    }

    // --- FEATURE 3: DYNAMIC HEADER BUTTON ---
    updateVIPButton(tier);
}

function updateVIPButton(tier) {
    const vipBtns = document.querySelectorAll('.vip-header-btn');
    vipBtns.forEach(btn => {
        if (tier.includes('Crown')) {
            btn.innerHTML = '<i class="fas fa-crown"></i> Crown VIP';
            btn.className = 'vip-header-btn status-crown';
            btn.href = 'profile.html'; 
        } else if (tier.includes('Elite')) {
            btn.innerHTML = '<i class="fas fa-gem"></i> Elite VIP';
            btn.className = 'vip-header-btn status-elite';
            btn.href = 'subscription.html'; 
        } else {
            btn.innerHTML = '<i class="fas fa-bolt"></i> Upgrade VIP';
            btn.className = 'vip-header-btn status-basic';
            btn.href = 'subscription.html';
        }
    });
}

// Initial Cached Run
applyPremiumFeatures(activeTier);

// 2. Securely verify the real status with Firebase Database
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const now = Date.now();
                
                if (data.isPremium === true && data.premiumExpiry > now) {
                    const plan = data.premiumPlan || 'Elite_VIP_35';
                    localStorage.setItem('dramakan_vip_tier', plan);
                    applyPremiumFeatures(plan);
                } else {
                    localStorage.setItem('dramakan_vip_tier', 'Basic');
                    applyPremiumFeatures('Basic');
                }
            }
        } catch (error) { console.error("Verification Error", error); }
    } else {
        localStorage.setItem('dramakan_vip_tier', 'Basic');
        applyPremiumFeatures('Basic');
    }
});