// ============================================================================
// DRAMAKAN - CLOUD-SYNCED REAL-TIME NOTIFICATION SYSTEM
// ============================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, updateDoc, setDoc, getDoc, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// 1. INJECT POPUP STYLES (Bottom Toast for Admin Broadcasts)
const style = document.createElement('style');
style.innerHTML = `
    #anykan-global-notif {
        position: fixed; top: 25px; right: 25px; transform: translateY(-150%);
        width: 90%; max-width: 420px; background: rgba(15, 15, 20, 0.85);
        backdrop-filter: blur(40px) saturate(200%); -webkit-backdrop-filter: blur(40px) saturate(200%);
        border: 1px solid rgba(138, 43, 226, 0.4); border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 30px rgba(138, 43, 226, 0.15);
        z-index: 99999; display: flex; gap: 18px; padding: 20px;
        transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
    }
    #anykan-global-notif.show-notif { transform: translateY(0); }
    .notif-popup-icon { width: 45px; height: 45px; border-radius: 50%; background: rgba(138, 43, 226, 0.2); color: #8A2BE2; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
    .notif-popup-content { display: flex; flex-direction: column; flex-grow: 1; justify-content: center; padding-right: 15px;}
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
        background: linear-gradient(135deg, #FFD700, #FFA500) !important; 
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

// 2. CLOUD-FIRST STATE MANAGEMENT
let globalNotifs = []; // Raw feed from the cloud
let cloudDeletedNotifs = []; // Synced array of deleted IDs
let cloudLastReadTime = 0; // Synced timestamp of last read
let currentUserDocRef = null;
let currentUserId = null;

// Fallback for guests
let guestDeletedNotifs = JSON.parse(localStorage.getItem('Anykan_Deleted_Notifs')) || [];
let guestLastReadTime = parseInt(localStorage.getItem('Anykan_Last_Read')) || 0;

window.renderGlobalHistory = function() {
    const list = document.getElementById('globalNotifList');
    const badge = document.getElementById('globalNotifBadge');
    if (!list) return;

    const deletedRef = currentUserId ? cloudDeletedNotifs : guestDeletedNotifs;
    const readTimeRef = currentUserId ? cloudLastReadTime : guestLastReadTime;

    const displayNotifs = globalNotifs.filter(n => !deletedRef.includes(n.id));

    if (displayNotifs.length === 0) {
        list.innerHTML = `<div class="empty-notifs" style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.85rem; padding: 30px 0;">No updates right now.</div>`;
        if (badge) badge.style.display = 'none';
        return;
    }

    let unreadCount = 0;

    list.innerHTML = displayNotifs.map(n => {
        const isRead = n.timestamp <= readTimeRef;
        if (!isRead) unreadCount++;

        const isPromo = n.id === "PROMO_BANNER_STATIC" || n.title.includes('🎁');
        const customClass = isPromo ? "global-notif-item promo-highlight" : "global-notif-item";
        const iconClass = isPromo ? "fas fa-gift" : "fas fa-bell";
        
        const actionBtn = n.link ? 
            `<a href="${n.link}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: linear-gradient(135deg, #8A2BE2, #6a1b9a); color: #fff; border-radius: 8px; font-size: 0.75rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.3s;">
                View Details <i class="fas fa-arrow-right" style="margin-left: 5px;"></i>
            </a>` : '';

        return `
        <div class="${customClass}" style="${isRead ? 'opacity: 0.6;' : 'border-left: 3px solid #8A2BE2; background: rgba(255,255,255,0.05);'}">
            <div class="global-notif-icon"><i class="${iconClass}"></i></div>
            <div class="global-notif-content" style="flex-grow: 1;">
                <div class="global-notif-title">${n.title}</div>
                <div class="global-notif-body" style="white-space: normal;">${n.body}</div>
                ${actionBtn}
                <div class="global-notif-time">${new Date(n.timestamp).toLocaleString()}</div>
            </div>
            <button class="global-notif-delete" onclick="window.deleteGlobalNotif('${n.id}')" title="Remove"><i class="fas fa-trash-alt"></i></button>
        </div>
    `}).join('');

    if (badge) badge.style.display = unreadCount > 0 ? 'block' : 'none';
};

window.deleteGlobalNotif = async (id) => {
    if (currentUserId && currentUserDocRef) {
        cloudDeletedNotifs.push(id);
        if (cloudDeletedNotifs.length > 150) cloudDeletedNotifs = cloudDeletedNotifs.slice(-100);
        try { await updateDoc(currentUserDocRef, { deletedNotifs: cloudDeletedNotifs }); } catch(e) { console.error("Cloud delete fail:", e); }
    } else {
        guestDeletedNotifs.push(id);
        localStorage.setItem('Anykan_Deleted_Notifs', JSON.stringify(guestDeletedNotifs));
        window.renderGlobalHistory();
    }
};

// 3. SECURE FIREBASE CLOUD LISTENERS
let notifUnsubscribe = null;
let userUnsubscribe = null;

onAuthStateChanged(auth, async (user) => {
    if (notifUnsubscribe) notifUnsubscribe();
    if (userUnsubscribe) userUnsubscribe();

    if (user) {
        currentUserId = user.uid;
        currentUserDocRef = doc(db, "users", user.uid);

        // Listen to User's read/delete memory
        userUnsubscribe = onSnapshot(currentUserDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const d = docSnap.data();
                cloudDeletedNotifs = d.deletedNotifs || [];
                cloudLastReadTime = d.lastReadTime || 0;
            } else {
                try { await setDoc(currentUserDocRef, { deletedNotifs: [], lastReadTime: 0 }, { merge: true }); } catch(e){}
            }
            window.renderGlobalHistory();
        });
    } else {
        currentUserId = null;
        currentUserDocRef = null;
        window.renderGlobalHistory();
    }

    // Listen to Global Feed
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(30));
    notifUnsubscribe = onSnapshot(q, (snapshot) => {
        globalNotifs = [];
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const notifId = docSnap.id;
            
            const target = data.target || "all";
            const isForMe = target === "all" || target === "viewers" || (user && (target === user.uid || target === user.email));

            if (isForMe) {
                const timestamp = data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt) : Date.now();
                globalNotifs.push({
                    id: notifId,
                    title: data.title || "Admin Update",
                    body: data.message || data.body || "",
                    link: data.link || null,
                    timestamp: timestamp
                });

                // Show popup for brand new notifications (within last 3 minutes)
                const readTimeRef = currentUserId ? cloudLastReadTime : guestLastReadTime;
                const deletedRef = currentUserId ? cloudDeletedNotifs : guestDeletedNotifs;
                
                if (Date.now() - timestamp < 3 * 60 * 1000 && timestamp > readTimeRef && !deletedRef.includes(notifId)) {
                    // Prevent duplicate popups across tabs by checking session
                    if(!sessionStorage.getItem(`popup_shown_${notifId}`)) {
                        showPopup(data.title || "Admin Update", data.message || data.body || "");
                        sessionStorage.setItem(`popup_shown_${notifId}`, "true");
                    }
                }
            }
        });
        window.renderGlobalHistory();
    });
});

// 4. UI DROPDOWN & CLOUD MARK-AS-READ LOGIC
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById('globalNotifBtn');
    const dropdown = document.getElementById('globalNotifDropdown');
    const clearBtn = document.getElementById('clearNotifsBtn');

    if (btn && dropdown) {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            
            // Mark all as read instantly in the cloud
            if (dropdown.classList.contains('active')) {
                const now = Date.now();
                if (currentUserId && currentUserDocRef) {
                    try { await updateDoc(currentUserDocRef, { lastReadTime: now }); } catch(err){}
                } else {
                    guestLastReadTime = now;
                    localStorage.setItem('Anykan_Last_Read', now);
                    window.renderGlobalHistory();
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.remove('active');
        });
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            const deletedRef = currentUserId ? cloudDeletedNotifs : guestDeletedNotifs;
            
            // Add all currently visible to deleted array
            globalNotifs.forEach(n => {
                if (!deletedRef.includes(n.id)) deletedRef.push(n.id);
            });

            if (currentUserId && currentUserDocRef) {
                if (deletedRef.length > 150) cloudDeletedNotifs = deletedRef.slice(-100);
                try { await updateDoc(currentUserDocRef, { deletedNotifs: cloudDeletedNotifs }); } catch(err){}
            } else {
                if (guestDeletedNotifs.length > 150) guestDeletedNotifs = guestDeletedNotifs.slice(-100);
                localStorage.setItem('Anykan_Deleted_Notifs', JSON.stringify(guestDeletedNotifs));
                window.renderGlobalHistory();
            }
        });
    }
});