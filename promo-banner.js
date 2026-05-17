import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. INJECT RESPONSIVE BOTTOM TOAST STYLES
const style = document.createElement('style');
style.innerHTML = `
    #dramakan-bottom-promo {
        position: fixed; 
        bottom: 25px; 
        left: 50%; 
        transform: translate(-50%, 150%);
        width: max-content; 
        max-width: 600px; 
        background: rgba(18, 18, 22, 0.75);
        backdrop-filter: blur(24px) saturate(200%);
        -webkit-backdrop-filter: blur(24px) saturate(200%);
        border: 1px solid rgba(138, 43, 226, 0.3); 
        border-radius: 16px; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(138, 43, 226, 0.15);
        display: flex; 
        align-items: center; 
        gap: 15px; 
        padding: 12px 18px; 
        z-index: 9999;
        transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease;
        opacity: 0;
    }
    
    #dramakan-bottom-promo.show-promo {
        transform: translate(-50%, 0);
        opacity: 1;
    }

    .promo-toast-icon {
        width: 38px; height: 38px; border-radius: 10px;
        background: linear-gradient(135deg, rgba(138, 43, 226, 0.8), rgba(106, 27, 154, 0.9));
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem; color: #fff; flex-shrink: 0;
    }

    .promo-toast-content { flex-grow: 1; max-width: 400px; }
    .promo-toast-title { font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
    .promo-toast-desc { font-size: 0.75rem; color: rgba(255,255,255,0.85); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    
    .promo-toast-btn {
        background: #fff; color: #8A2BE2; padding: 8px 16px; border-radius: 50px;
        font-weight: 700; font-size: 0.75rem; text-transform: uppercase; text-decoration: none;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: all 0.3s ease; white-space: nowrap; flex-shrink: 0;
    }
    .promo-toast-btn:hover { background: #f0f0f0; transform: scale(1.05); }

    .promo-toast-close { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 1.1rem; cursor: pointer; transition: 0.3s; padding: 0 4px; flex-shrink: 0;}
    .promo-toast-close:hover { color: #fff; }

    /* MOBILE: Switch to Grid Layout to prevent squashing */
    @media (max-width: 992px) { 
        #dramakan-bottom-promo { 
            bottom: 85px; /* Sits right above the bottom nav */
            width: 90%; 
            display: grid;
            grid-template-columns: auto 1fr auto;
            grid-template-areas: 
                "icon text close"
                "btn btn btn";
            gap: 12px 10px;
            padding: 14px 16px;
        }
        .promo-toast-icon { grid-area: icon; align-self: center; }
        .promo-toast-content { grid-area: text; max-width: none; align-self: center;}
        .promo-toast-close { grid-area: close; align-self: start; margin-top: -2px;}
        .promo-toast-btn { grid-area: btn; width: 100%; text-align: center; padding: 10px; font-size: 0.8rem; }
        .promo-toast-desc { -webkit-line-clamp: 3; } /* Allows up to 3 lines before cutting off, preventing height blowout */
    }
`;
document.head.appendChild(style);

const promoContainer = document.createElement('div');
promoContainer.id = 'dramakan-bottom-promo';
document.body.appendChild(promoContainer);

// 2. LISTEN TO FIREBASE & INJECT
const bannerRef = doc(db, "site_settings", "main_banner");
onSnapshot(bannerRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        const now = Date.now();
        
        // Expiry Logic Check
        const isExpired = data.expiryDate && now > data.expiryDate;
        
        if (!data.isActive || isExpired || sessionStorage.getItem('dramakan_promo_closed')) {
            promoContainer.classList.remove('show-promo');
            return;
        }

        // Render Bottom Toast
        promoContainer.innerHTML = `
            <div class="promo-toast-icon"><i class="fas fa-gift"></i></div>
            <div class="promo-toast-content">
                <div class="promo-toast-title">Special Offer</div>
                <div class="promo-toast-desc">${data.message}</div>
            </div>
            <button class="promo-toast-close" id="closeBottomPromo"><i class="fas fa-times"></i></button>
            <a href="${data.link}" class="promo-toast-btn">${data.buttonText}</a>
        `;
        
        // Small delay for smooth pop-up
        setTimeout(() => promoContainer.classList.add('show-promo'), 1000);

        document.getElementById('closeBottomPromo').onclick = () => {
            promoContainer.classList.remove('show-promo');
            sessionStorage.setItem('dramakan_promo_closed', 'true');
        };

        // 3. PUSH TO NOTIFICATION HUB (Bell Icon)
        let notifHistory = JSON.parse(localStorage.getItem('Anykan_Notif_History')) || [];
        const promoId = "PROMO_BANNER_STATIC";
        const existsInHub = notifHistory.find(n => n.id === promoId);
        
        if (!existsInHub) {
            notifHistory.unshift({
                id: promoId,
                title: "🎁 Special Offer",
                body: data.message,
                timestamp: Date.now(),
                read: false,
                link: data.link 
            });
            localStorage.setItem('Anykan_Notif_History', JSON.stringify(notifHistory));
            
            // Triggers the red badge update if the function exists
            if (window.renderGlobalHistory) window.renderGlobalHistory(); 
        }
    } else {
        promoContainer.classList.remove('show-promo');
    }
});