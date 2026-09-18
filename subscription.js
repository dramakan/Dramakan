// subscription.js
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/**
 * Checks if a user has an active subscription and what tier it is.
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

        if (!isPremium || isExpired) {
            return { isActive: false, plan: "Basic", daysLeft: 0 };
        }

        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        const plan = data.premiumPlan || "Plus_VIP_29";

        return {
            isActive: true,
            plan: plan,
            daysLeft: daysLeft
        };
    } catch (err) {
        console.error("Subscription check error:", err);
        return { isActive: false, plan: "Basic", daysLeft: 0 };
    }
}

/**
 * Automatically applies ad-blocking site-wide.
 */
export function applySubscriptionPrivileges(sub) {
    const isPremiumUser = sub.isActive && (
        sub.plan === "Premium_VIP_49" || 
        sub.plan === "Crown_VIP_99" || 
        sub.plan.includes("Premium") || 
        sub.plan.includes("Crown")
    );

    if (isPremiumUser) {
        // 1. Add class to both html and body for instant CSS hiding
        document.documentElement.classList.add("premium-ad-free-mode");
        document.body.classList.add("premium-ad-free-mode");

        // 2. Remove all ad containers from the DOM
        const adElements = document.querySelectorAll(
            ".watch-ad-section, .section-divider-ad, .premium-ad-container, .ad-card-wrapper, .details-ad-section, .details-ad-container, .sidebar-ad-widget, .adsterra-wrapper, iframe[src*='ad-160x300'], iframe[src*='highrevenueformat'], iframe[src*='mammothsubway']"
        );
        adElements.forEach(el => el.remove());

        localStorage.setItem("dramakan_user_plan", "Premium_VIP_49");
    } else {
        document.documentElement.classList.remove("premium-ad-free-mode");
        document.body.classList.remove("premium-ad-free-mode");
        localStorage.setItem("dramakan_user_plan", sub.isActive ? sub.plan : "Basic");
    }
}