/**
 * DramaKan Admin Ecosystem Navigation Core (Easter Egg Engine)
 * Handles encrypted back-alley authentication transitions to bypass public visibility parameters.
 */
(function initAdminEcosystem() {
    // 1. Inject Cinematic Back-Alley Matrix Shell Canvas Styles
    if (!document.getElementById('dk-admin-easter-egg-styles')) {
        const style = document.createElement('style');
        style.id = 'dk-admin-easter-egg-styles';
        style.innerHTML = `
            #admin-secret-overlay {
                position: fixed; inset: 0; z-index: 9999999; pointer-events: none;
                display: flex; justify-content: center; align-items: center; overflow: hidden;
            }
            .admin-iris {
                width: 15px; height: 15px; border-radius: 50%;
                background: rgba(138, 43, 226, 0.98);
                box-shadow: 0 0 100px #8A2BE2, inset 0 0 30px rgba(255,255,255,0.3);
                backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
                transform: scale(0); opacity: 0;
                transition: transform 1.1s cubic-bezier(0.85, 0, 0.15, 1), opacity 0.4s ease;
            }
            .admin-iris.expand { opacity: 1; transform: scale(350); }
            
            .admin-auth-wrapper {
                position: absolute; display: flex; flex-direction: column; align-items: center; gap: 10px;
                opacity: 0; transform: translateY(30px) scale(0.9);
                transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s;
            }
            .admin-auth-wrapper.show { opacity: 1; transform: translateY(0) scale(1); }
            .admin-auth-icon { font-size: 3.5rem; color: #fff; filter: drop-shadow(0 0 20px rgba(255,255,255,0.7)); }
            .admin-auth-text {
                color: white; font-family: 'Inter', sans-serif; font-size: 1.3rem; font-weight: 700;
                letter-spacing: 5px; text-transform: uppercase; text-align: center;
            }
            .admin-auth-subtext {
                color: rgba(255,255,255,0.5); font-family: 'Inter', sans-serif; font-size: 0.8rem;
                text-transform: uppercase; letter-spacing: 2px; margin-top: -5px;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Structural Assembly inside active viewport
    const overlay = document.createElement('div');
    overlay.id = 'admin-secret-overlay';
    const iris = document.createElement('div');
    iris.className = 'admin-iris';
    const authWrapper = document.createElement('div');
    authWrapper.className = 'admin-auth-wrapper';
    authWrapper.innerHTML = `
        <i class="fas fa-fingerprint admin-auth-icon"></i>
        <div class="admin-auth-text" id="egg-dest-title">Terminal Unlocked</div>
        <div class="admin-auth-subtext" id="egg-dest-route">Routing Network Protocol</div>
    `;
    overlay.appendChild(iris);
    overlay.appendChild(authWrapper);
    document.body.appendChild(overlay);

    // 3. Central Router Transition Logic Engine
    function triggerAdminTransition(destinationPage, systemLabel) {
        if (iris.classList.contains('expand')) return;

        // Neutralize default app loader layers if present
        const mainLoader = document.getElementById('dk-global-loader');
        if (mainLoader) mainLoader.style.display = 'none';

        // Update tracking UI text metrics dynamically
        document.getElementById('egg-dest-title').textContent = systemLabel + " Unlocked";
        document.getElementById('egg-dest-route').textContent = `Initializing path to ${destinationPage}`;

        // Fire physical portal scale-out array
        iris.classList.add('expand');
        authWrapper.classList.add('show');

        setTimeout(() => {
            window.location.href = destinationPage;
        }, 1200);
    }

    // =======================================================
    // HARDWARE VECTOR INTERFACES [PC: TYPING COMBINATIONS]
    // =======================================================
    const keyRegistry = {
        'panel': { sequence: ['p','a','n','e','l'], idx: 0, url: 'admin-panel.html', label: 'Admin OS' },
        'd9audio': { sequence: ['d','9','a','u','d','i','o'], idx: 0, url: 'admin_audio.html', label: 'Audio Vault' }
    };

    document.addEventListener('keydown', (e) => {
        // Halt sequence recording if operator is typing inside text forms
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const typedKey = e.key.toLowerCase();

        for (const token in keyRegistry) {
            const currentObj = keyRegistry[token];
            if (typedKey === currentObj.sequence[currentObj.idx]) {
                currentObj.idx++;
                if (currentObj.idx === currentObj.sequence.length) {
                    triggerAdminTransition(currentObj.url, currentObj.label);
                    currentObj.idx = 0; // Reset matrix path
                }
            } else {
                currentObj.idx = 0; // Reset track iteration on collision break
            }
        }
    });

    // =======================================================
    // TOUCH SURFACE INTERFACES [MOBILE: HIDDEN TAP SIGNATURES]
    // =======================================================
    let footerTapCount = 0;
    let footerTapTimer = null;
    
    let logoTapCount = 0;
    let logoTapTimer = null;

    document.addEventListener('DOMContentLoaded', () => {
        // INTERACTION METHOD A: Tap the primary platform footer 5 times -> Launches Master Dashboard
        const systemFooters = document.querySelectorAll('.main-footer, footer');
        systemFooters.forEach(footer => {
            footer.style.userSelect = 'none'; // Prevent browser selection highlights during execution
            footer.addEventListener('click', () => {
                footerTapCount++;
                clearTimeout(footerTapTimer);
                
                if (footerTapCount >= 5) {
                    triggerAdminTransition('admin-dashboard.html', 'Dashboard');
                    footerTapCount = 0;
                }
                footerTapTimer = setTimeout(() => { footerTapCount = 0; }, 1200);
            });
        });

        // INTERACTION METHOD B: Tap the brand logo element 5 times -> Launches Admin Panel OS
        const logoElements = document.querySelectorAll('.logo, .admin-brand, .logo-wrap');
        logoElements.forEach(logo => {
            logo.addEventListener('click', (e) => {
                // Check if device uses touch framework to keep it native to mobile triggers
                if (window.innerWidth > 900) return; 
                
                e.preventDefault(); // Stop landing link routing sequence
                logoTapCount++;
                clearTimeout(logoTapTimer);

                if (logoTapCount >= 5) {
                    triggerAdminTransition('admin-panel.html', 'Admin OS');
                    logoTapCount = 0;
                }
                logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1200);
            });
        });

        // INTERACTION METHOD C: Secret Top-Right Quadrant Node Taps -> Launches Audio Management
        // Tapping the absolute top-right 60px corner of the window grid 4 times opens audio keys.
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const screenWidth = window.innerWidth;
            
            // Check if coordinates land in the dead top-right zone
            if (touch.clientX > (screenWidth - 65) && touch.clientY < 65) {
                if (!window.cornerTapMetrics) {
                    window.cornerTapMetrics = { count: 0, timer: null };
                }
                
                window.cornerTapMetrics.count++;
                clearTimeout(window.cornerTapMetrics.timer);

                if (window.cornerTapMetrics.count >= 4) {
                    triggerAdminTransition('admin_audio.html', 'Audio Vault');
                    window.cornerTapMetrics.count = 0;
                }
                
                window.cornerTapMetrics.timer = setTimeout(() => { 
                    window.cornerTapMetrics.count = 0; 
                }, 1200);
            }
        });
    });
})();