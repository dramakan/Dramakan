document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize Firebase to check Auth State reliably across all pages
    const firebaseConfig = {
        apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
        authDomain: "dramakan007.firebaseapp.com",
        projectId: "dramakan007"
    };

    try {
        const authModule = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js");
        const appModule = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
        
        const app = !appModule.getApps().length ? appModule.initializeApp(firebaseConfig) : appModule.getApp();
        const auth = authModule.getAuth(app);

        // 2. Check user status
        authModule.onAuthStateChanged(auth, (user) => {
            if (!user) {
                // User is NOT logged in. Check if we already showed it this session.
                if (!sessionStorage.getItem('dramakan_login_prompt_shown')) {
                    // Show popup 3 seconds after they load the page
                    setTimeout(showLoginPrompt, 3000); 
                }
            }
        });
    } catch (error) {
        console.error("Auth check for global popup failed:", error);
    }

    // 3. The function that creates and styles the popup dynamically
    function showLoginPrompt() {
        // Prevent multiple popups if triggered twice
        if(document.getElementById('globalLoginOverlay')) return; 

        // Inject the Premium Glassmorphism CSS
        const style = document.createElement('style');
        style.innerHTML = `
            #globalLoginOverlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                z-index: 9999999; display: flex; justify-content: center; align-items: center;
                opacity: 0; transition: opacity 0.5s ease;
            }
            .global-login-card {
                background: rgba(11, 12, 16, 0.95); border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 16px; padding: 40px 30px; max-width: 380px; width: 90%;
                text-align: center; box-shadow: 0 15px 50px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);
                transform: translateY(30px) scale(0.95); transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
                position: relative;
            }
            #globalLoginOverlay.show { opacity: 1; }
            #globalLoginOverlay.show .global-login-card { transform: translateY(0) scale(1); }
            
            .global-login-icon { font-size: 3rem; color: #8A2BE2; margin-bottom: 15px; text-shadow: 0 0 20px rgba(138,43,226,0.5); }
            .global-login-title { font-size: 1.6rem; font-weight: 700; color: #fff; margin-bottom: 10px; font-family: 'Poppins', sans-serif; }
            .global-login-desc { font-size: 0.9rem; color: #a0a0a0; margin-bottom: 25px; line-height: 1.5; font-family: 'Poppins', sans-serif;}
            
            .global-login-btn {
                display: flex; align-items: center; justify-content: center; gap: 10px;
                width: 100%; padding: 14px; border-radius: 8px; font-weight: 600;
                font-size: 1rem; text-decoration: none; transition: all 0.3s ease; margin-bottom: 12px;
                font-family: 'Poppins', sans-serif; cursor: pointer; border: none; outline: none;
            }
            .btn-go-login { background: #8A2BE2; color: #fff; box-shadow: 0 4px 15px rgba(138,43,226,0.4); }
            .btn-go-login:hover { background: #7a22cc; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(138,43,226,0.6); color: #fff;}
            
            .btn-close-prompt { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
            .btn-close-prompt:hover { background: rgba(255,255,255,0.1); }
        `;
        document.head.appendChild(style);

        // Inject the HTML structure
        const overlay = document.createElement('div');
        overlay.id = 'globalLoginOverlay';
        overlay.innerHTML = `
            <div class="global-login-card">
                <i class="fas fa-crown global-login-icon"></i>
                <h3 class="global-login-title">Unlock Dramakan</h3>
                <p class="global-login-desc">Sign in to track your watch history, save your favorites, and request missing titles!</p>
                <a href="login.html" class="global-login-btn btn-go-login"><i class="fas fa-sign-in-alt"></i> Login / Sign Up</a>
                <button class="global-login-btn btn-close-prompt" id="closeGlobalLogin">Maybe Later</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Trigger the smooth fade-up animation
        setTimeout(() => overlay.classList.add('show'), 50);

        // Handle the "Maybe Later" close button
        document.getElementById('closeGlobalLogin').onclick = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 500);
            
            // This ensures they aren't spammed with the popup on every single page load during their visit
            sessionStorage.setItem('dramakan_login_prompt_shown', 'true');
        };
    }
});