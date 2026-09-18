// subscription.js
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/**
 * Checks if a user has an active subscription and what tier it is.
 * @param {object} db - Firestore database instance
 * @param {string} uid - Firebase Auth User UID
 * @returns {Promise<{isActive: boolean, plan: string, daysLeft: number}>}
 */
export async function getSubscriptionStatus(db, uid) {
    if (!uid) return { isActive: false, plan: "Basic", daysLeft: 0 };

    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return { isActive: false, plan: "Basic", daysLeft: 0 };
        }

        const data = userSnap.data();
        const now = Date.now();
        const isPremium = data.isPremium === true;
        const expiry = data.premiumExpiry || 0;
        const isExpired = now > expiry;

        // If the plan has expired, treat them as a Basic free user
        if (!isPremium || isExpired) {
            return { isActive: false, plan: "Basic", daysLeft: 0 };
        }

        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        const plan = data.premiumPlan || "Plus_VIP_29";

        return {
            isActive: true,
            plan: plan, // "Plus_VIP_29" or "Premium_VIP_49"
            daysLeft: daysLeft
        };
    } catch (err) {
        console.error("Subscription check error:", err);
        return { isActive: false, plan: "Basic", daysLeft: 0 };
    }
}

/**
 * Automatically applies ad-blocking and VIP styling site-wide.
 * @param {object} sub - Subscription object from getSubscriptionStatus
 */
export function applySubscriptionPrivileges(sub) {
    // 1. If Premium VIP (₹49), kill all banner ads on the page
    if (sub.isActive && sub.plan === "Premium_VIP_49") {
        document.body.classList.add("premium-ad-free-mode");

        // Hide all ad containers and iframes
        const adElements = document.querySelectorAll(
            ".watch-ad-section, .sidebar-widget:has(iframe[src*='ad']), .section-divider-ad, .ad-card-wrapper"
        );
        adElements.forEach(el => el.remove());
    }

    // 2. Save active plan in localStorage for instant UI checks
    localStorage.setItem("dramakan_user_plan", sub.isActive ? sub.plan : "Basic");
}