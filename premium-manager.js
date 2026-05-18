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

// 1. Get cached tier immediately so the page doesn't flash ads while loading
const activeTier = localStorage.getItem('dramakan_vip_tier') || 'Basic';

function applyPremiumFeatures(tier) {
    // --- FEATURE 1: HIDE GOOGLE/UI ADS (ELITE & CROWN) ---
    if (tier.includes('Elite') || tier.includes('Crown')) {
        document.body.classList.add('premium-active');
        if (!document.getElementById('premium-ad-blocker')) {
            const style = document.createElement('style');
            style.id = 'premium-ad-blocker';
            style.innerHTML = `
                /* Add all Google Ads and UI Ad classes here */
                ins.adsbygoogle, .ad-container, .ad-banner, .popup-ad, [id^="div-gpt-ad"] {
                    display: none !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        document.body.classList.remove('premium-active');
        const style = document.getElementById('premium-ad-blocker');
        if (style) style.remove();
    }

    // --- FEATURE 2: KILL VIDEO ADS VIA SANDBOX (CROWN ONLY) ---
    if (tier.includes('Crown')) {
        blockVideoPopups();
        // Setup a MutationObserver just in case the iframe loads a few seconds late
        const observer = new MutationObserver(() => blockVideoPopups());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- FEATURE 3: DYNAMIC HEADER BUTTON ---
    updateVIPButton(tier);
}

// Applies strict sandbox rules to stop video popups and redirects
function blockVideoPopups() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        // Ignore Google Auth/Recaptcha iframes, target video players only
        if (!iframe.src.includes('google') && !iframe.src.includes('firebase')) {
            // Omitting 'allow-popups' and 'allow-top-navigation' completely kills video ads
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
        }
    });
}

function updateVIPButton(tier) {
    const vipBtns = document.querySelectorAll('.vip-header-btn');
    vipBtns.forEach(btn => {
        if (tier.includes('Crown')) {
            btn.innerHTML = '<i class="fas fa-crown"></i> Crown VIP';
            btn.className = 'vip-header-btn status-crown';
            btn.href = 'profile.html'; // Already max tier, link to profile
        } else if (tier.includes('Elite')) {
            btn.innerHTML = '<i class="fas fa-gem"></i> Elite VIP';
            btn.className = 'vip-header-btn status-elite';
            btn.href = 'subscription.html'; // Can still upgrade to Crown
        } else {
            btn.innerHTML = '<i class="fas fa-bolt"></i> Upgrade VIP';
            btn.className = 'vip-header-btn status-basic';
            btn.href = 'subscription.html';
        }
    });
}

// Run immediately from cache
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
                    // Expired or Basic
                    localStorage.setItem('dramakan_vip_tier', 'Basic');
                    applyPremiumFeatures('Basic');
                }
            }
        } catch (error) {
            console.error("Premium Verification Error", error);
        }
    } else {
        // Logged out
        localStorage.setItem('dramakan_vip_tier', 'Basic');
        applyPremiumFeatures('Basic');
    }
});