// feedback-popup.js
(function initFeedbackPopup() {
    function setupPopup() {
        // Check if we should show the popup
        const popupDismissed = localStorage.getItem("dramakan_feedback_dismissed");
        const dismissalTime = localStorage.getItem("dramakan_feedback_time");
        
        // If dismissed, wait 7 days before showing again
        if (popupDismissed === "true" && dismissalTime) {
            const daysPassed = (Date.now() - parseInt(dismissalTime)) / (1000 * 60 * 60 * 24);
            if (daysPassed < 7) return; 
        }

        // Inject CSS for the popup
        const style = document.createElement("style");
        style.innerHTML = `
            .dk-feedback-toast {
                box-sizing: border-box;
                position: fixed; 
                bottom: -300px; /* Completely hidden off-screen */
                right: 20px; 
                z-index: 999999;
                background: rgba(20, 20, 28, 0.85); 
                border: 1px solid rgba(157, 78, 221, 0.4);
                backdrop-filter: blur(20px); 
                -webkit-backdrop-filter: blur(20px);
                border-radius: 20px; 
                padding: 22px; 
                width: 340px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.6), 0 0 20px rgba(157, 78, 221, 0.2);
                display: flex; 
                flex-direction: column; 
                gap: 12px;
                transition: bottom 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                font-family: 'Poppins', sans-serif; 
                color: #fff;
            }
            .dk-feedback-toast * { box-sizing: border-box; }
            
            /* Desktop placement */
            .dk-feedback-toast.show { bottom: 30px; }
            
            .dk-toast-header { display: flex; justify-content: space-between; align-items: center; }
            .dk-toast-header h4 { margin: 0; font-size: 1.05rem; font-weight: 600; display: flex; align-items: center; gap: 8px; color: #fff; }
            .dk-toast-header h4 i { color: #9D4EDD; font-size: 1.2rem; }
            
            .dk-toast-close { 
                background: none; border: none; color: #9CA3AF; cursor: pointer; 
                font-size: 1.6rem; line-height: 1; padding: 0; transition: color 0.3s; 
                display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
            }
            .dk-toast-close:hover { color: #ff4757; }
            
            .dk-toast-body p { margin: 0 0 15px 0; font-size: 0.85rem; color: #D1D5DB; line-height: 1.5; }
            
            .dk-toast-btn {
                background: linear-gradient(135deg, #9D4EDD, #7b2cbf); color: #fff; text-decoration: none;
                padding: 12px; border-radius: 12px; text-align: center; font-size: 0.95rem; font-weight: 600;
                display: block; transition: transform 0.3s, box-shadow 0.3s; border: none; outline: none;
            }
            .dk-toast-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(157, 78, 221, 0.4); color: #fff; }
            
            /* Mobile placement */
            @media (max-width: 768px) {
                .dk-feedback-toast { 
                    right: 5%; 
                    left: 5%; 
                    width: auto; /* Fixes the overflow bleed */
                }
                .dk-feedback-toast.show { 
                    bottom: 95px; /* Sits perfectly above the mobile bottom nav */
                }
            }
        `;
        document.head.appendChild(style);

        // Create the popup HTML
        const toast = document.createElement("div");
        toast.className = "dk-feedback-toast";
        toast.innerHTML = `
            <div class="dk-toast-header">
                <h4><i class="fas fa-heart"></i> Loving DramaKan?</h4>
                <button class="dk-toast-close">&times;</button>
            </div>
            <div class="dk-toast-body">
                <p>We're constantly improving! Let us know how you found us and drop some quick feedback.</p>
                <a href="feedback.html" class="dk-toast-btn">Share Feedback 🚀</a>
            </div>
        `;
        document.body.appendChild(toast);

        // Show popup after 45 seconds 
        setTimeout(() => {
            toast.classList.add("show");
        }, 45000); 

        // Handle dismissal
        toast.querySelector('.dk-toast-close').addEventListener('click', () => {
            toast.classList.remove("show");
            localStorage.setItem("dramakan_feedback_dismissed", "true");
            localStorage.setItem("dramakan_feedback_time", Date.now().toString());
        });
    }

    // Safety check to ensure DOM is ready regardless of how the script is loaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupPopup);
    } else {
        setupPopup();
    }
})();