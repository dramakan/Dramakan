// ============================================================================
// DRAMAKAN - TARGETED REAL-TIME NOTIFICATION SYSTEM (WITH PROMO SUPPORT)
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 1. INJECT POPUP STYLES (Bottom Toast for Admin Broadcasts)
const style = document.createElement('style');
style.innerHTML = `
    #anykan-global-notif {
        position: fixed; top: 25px; right: 25px; transform: translateY(-150%);
        width: 90%; max-width: 420px; background: rgba(15, 15, 20, 0.65);
        backdrop-filter: blur(40px) saturate(200%); -webkit-backdrop-filter: blur(40px) saturate(200%);
        border: 1px solid rgba(138, 43, 226, 0.4); border-radius: 24px;
        box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 30px rgba(138, 43, 226, 0.15);
        z-index: 99999; display: flex; gap: 18px; padding: 20px;
        transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
    }
    #anykan-global-notif.show-notif { transform: translateY(0); }
    .notif-popup-icon { width: 45px; height: 45px; border-radius: 50%; background: rgba(138, 43, 226, 0.2); color: #8A2BE2; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
    .notif-popup-content { display: flex; flex-direction: column; flex-grow: 1; justify-content: center; }
    .notif-popup-title { color: #fff; font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; }
    .notif-popup-body { color: rgba(255,255,255,0.8); font-size: 0.8rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;}
    .notif-popup-close { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 1.2rem; cursor: pointer; position: absolute; top: 15px; right: 15px; transition: color 0.3s; }
    .notif-popup-close:hover { color: #fff; }

    /* Special highlight for Promo Items in the dropdown */
    .global-notif-item.promo-highlight {
        background: rgba(138, 43, 226, 0.15) !important;
        border: 1px solid rgba(138, 43, 226, 0.5) !important;
    }
    .global-notif-item.promo-highlight .global-notif-icon {
        background: linear-gradient(135deg, #FFD700, #FFA500) !important; /* Gold gradient for offers */
        color: #000 !important;
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4) !important;
    }

    @media (max-width: 768px) { #anykan-global-notif { right: 5%; width: 90%; top: 15px; } }
`;
document.head.appendChild(style);

const popupContainer = document.createElement('div');
popupContainer.id = 'anykan-global-notif';
popupContainer.innerHTML = `
    <div class="notif-popup-icon"><i class="fas fa-bell"></i></div>
    <div class="notif-popup-content">
        <div class="notif-popup-title" id="notif-popup-title">Broadcast</div>
        <div class="notif-popup-body" id="notif-popup-body">Message</div>
    </div>
    <button class="notif-popup-close" id="anykan-notif-close"><i class="fas fa-times"></i></button>
`;
document.body.appendChild(popupContainer);

let autoHideTimer;
function showPopup(title, body) {
    document.getElementById('notif-popup-title').innerText = title;
    document.getElementById('notif-popup-body').innerText = body;
    popupContainer.classList.add('show-notif');
    document.getElementById('anykan-notif-close').onclick = () => popupContainer.classList.remove('show-notif');
    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(() => popupContainer.classList.remove('show-notif'), 8000);
}

// 2. HISTORY & AUTH LOGIC
let notifHistory = JSON.parse(localStorage.getItem('Anykan_Notif_History')) || [];
let deletedNotifs = JSON.parse(localStorage.getItem('Anykan_Deleted_Notifs')) || []; 

window.renderGlobalHistory = function() {
    const list = document.getElementById('globalNotifList');
    const badge = document.getElementById('globalNotifBadge');
    if (!list) return;

    if (notifHistory.length === 0) {
        list.innerHTML = `<div class="empty-notifs" style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.85rem; padding: 20px 0;">No notifications yet.</div>`;
        if (badge) badge.style.display = 'none';
        return;
    }

    list.innerHTML = notifHistory.map(n => {
        const isPromo = n.id === "PROMO_BANNER_STATIC";
        const customClass = isPromo ? "global-notif-item promo-highlight" : "global-notif-item";
        const iconClass = isPromo ? "fas fa-gift" : "fas fa-bell";
        
        const actionBtn = n.link ? 
            `<a href="${n.link}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: linear-gradient(135deg, #8A2BE2, #6a1b9a); color: #fff; border-radius: 8px; font-size: 0.75rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.3s;">
                Claim Offer <i class="fas fa-arrow-right" style="margin-left: 5px;"></i>
            </a>` : '';

        return `
        <div class="${customClass}" style="${n.read ? 'opacity: 0.8;' : 'border-left: 3px solid #8A2BE2;'}">
            <div class="global-notif-icon"><i class="${iconClass}"></i></div>
            <div class="global-notif-content" style="flex-grow: 1;">
                <div class="global-notif-title">${n.title}</div>
                <div class="global-notif-body" style="white-space: normal;">${n.body}</div>
                ${actionBtn}
                <div class="global-notif-time">${new Date(n.timestamp).toLocaleString()}</div>
            </div>
            <button class="global-notif-delete" onclick="window.deleteGlobalNotif('${n.id}')"><i class="fas fa-trash-alt"></i></button>
        </div>
    `}).join('');

    const unread = notifHistory.some(n => !n.read);
    if (badge) badge.style.display = unread ? 'block' : 'none';
};

window.deleteGlobalNotif = (id) => {
    notifHistory = notifHistory.filter(n => n.id !== id);
    deletedNotifs.push(id);
    if (deletedNotifs.length > 100) deletedNotifs = deletedNotifs.slice(-50);
    localStorage.setItem('Anykan_Notif_History', JSON.stringify(notifHistory));
    localStorage.setItem('Anykan_Deleted_Notifs', JSON.stringify(deletedNotifs));
    window.renderGlobalHistory();
};

// 3. SECURE FIREBASE LISTENER
let listenerUnsubscribe = null;

onAuthStateChanged(auth, (user) => {
    if (listenerUnsubscribe) listenerUnsubscribe(); 

    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(30));
    
    listenerUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            
            // LOGIC A: Admin added a new notification
            if (change.type === "added") {
                const data = change.doc.data();
                const notifId = change.doc.id;
                
                const target = data.target || "all";
                const isForMe = target === "all" || (user && (target === user.uid || target === user.email));

                if (!isForMe) return; 

                const exists = notifHistory.find(n => n.id === notifId);
                const isDeleted = deletedNotifs.includes(notifId);

                if (!exists && !isDeleted) {
                    const newNotif = {
                        id: notifId,
                        title: data.title || "Admin Update",
                        body: data.message || data.body || "",
                        link: data.link || null,
                        timestamp: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now(),
                        read: false
                    };
                    
                    notifHistory.unshift(newNotif);
                    if (notifHistory.length > 30) notifHistory.pop();
                    localStorage.setItem('Anykan_Notif_History', JSON.stringify(notifHistory));
                    window.renderGlobalHistory();
                    
                    if (Date.now() - newNotif.timestamp < 5 * 60 * 1000) {
                        showPopup(newNotif.title, newNotif.body);
                    }
                }
            }
            
            // LOGIC B: Admin deleted a notification globally
            if (change.type === "removed") {
                const deletedId = change.doc.id;
                notifHistory = notifHistory.filter(n => n.id !== deletedId);
                localStorage.setItem('Anykan_Notif_History', JSON.stringify(notifHistory));
                if (window.renderGlobalHistory) window.renderGlobalHistory();
            }
        });
    });
});

// Bind UI dropdown logic
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById('globalNotifBtn');
    const dropdown = document.getElementById('globalNotifDropdown');
    const clearBtn = document.getElementById('clearNotifsBtn');

    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            notifHistory.forEach(n => n.read = true);
            localStorage.setItem('Anykan_Notif_History', JSON.stringify(notifHistory));
            window.renderGlobalHistory();
        });
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.remove('active');
        });
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            notifHistory.forEach(n => deletedNotifs.push(n.id));
            localStorage.setItem('Anykan_Deleted_Notifs', JSON.stringify(deletedNotifs.slice(-50)));
            notifHistory = [];
            localStorage.setItem('Anykan_Notif_History', JSON.stringify([]));
            window.renderGlobalHistory();
        });
    }
    
    setTimeout(() => {
        window.renderGlobalHistory();
    }, 500);
});