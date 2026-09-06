(function initUI() {
    const injectedStyles = document.createElement('style');
    injectedStyles.innerHTML = `
                #home-profile-switcher-overlay {
                    position: fixed; inset: 0; background: var(--bg-base, #050507); z-index: 999999;
                    display: flex; flex-direction: column; justify-content: center; align-items: center;
                    transition: transform 0.8s cubic-bezier(0.85, 0, 0.15, 1), opacity 0.8s ease;
                    font-family: 'Poppins', sans-serif;
                }
                #home-profile-switcher-overlay.hidden { transform: scale(1.1); opacity: 0; pointer-events: none; }
                .switcher-title { font-size: 2.5rem; font-weight: 500; margin-bottom: 40px; letter-spacing: 1px; color: #fff; text-shadow: 0 4px 20px rgba(0,0,0,0.5); text-align: center;}
                .profiles-list { display: flex; gap: 30px; flex-wrap: wrap; justify-content: center; max-width: 800px;}
                .profile-select-card { display: flex; flex-direction: column; align-items: center; gap: 15px; cursor: pointer; transition: all 0.3s ease; opacity: 0; transform: translateY(20px); animation: fadeUp 0.6s ease forwards 0.2s; }
                .profile-select-card:hover .switcher-avatar-img { border-color: #fff; transform: scale(1.05); }
                .profile-select-card:hover .switcher-name { color: #fff; }
                .switcher-avatar-img { width: 140px; height: 140px; border-radius: 16px; object-fit: cover; border: 3px solid transparent; transition: all 0.3s ease; box-shadow: 0 10px 25px rgba(0,0,0,0.5); background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 4rem; color: #fff;}
                .switcher-name { color: #9CA3AF; font-size: 1.1rem; transition: color 0.3s ease; font-weight: 500;}
                
                @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
                @media (max-width: 768px) {
                    .switcher-title { font-size: 1.8rem; }
                    .switcher-avatar-img { width: 100px; height: 100px; font-size: 3rem; }
                }
                
                .ad-card-wrapper {
                    position: relative; background: rgba(26, 26, 29, 0.45); 
                    border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); aspect-ratio: 2/3; 
                }
                .ad-card-wrapper::before {
                    content: 'Ad'; position: absolute; top: 6px; left: 8px;
                    font-size: 0.65rem; font-weight: 600; color: rgba(255,255,255,0.6);
                    background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; z-index: 10;
                }
            `;
    document.head.appendChild(injectedStyles);

    let isLowEnd = false;
    if ('deviceMemory' in navigator && navigator.deviceMemory < 4) isLowEnd = true;
    if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 4) isLowEnd = true;
    if ('connection' in navigator && (navigator.connection.effectiveType === '3g' || navigator.connection.effectiveType === '2g')) isLowEnd = true;

    if (isLowEnd) document.documentElement.classList.add('lite-mode');
})();

const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

let firebaseInstance = null;
async function getFirebase() {
    if (firebaseInstance) return firebaseInstance;
    const [appModule, authModule, firestoreModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js")
    ]);
    const app = !appModule.getApps().length ? appModule.initializeApp(firebaseConfig) : appModule.getApp();
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);
    firebaseInstance = { app, auth, db, appModule, authModule, firestoreModule };
    return firebaseInstance;
}

const tmdbKey = "hidden_by_proxy";

export function initLanguagePage(config) {
    const {
        tmdbLanguage,
        typeLabel,
        featuredFallback,
        gridId,
        failLabel,
        adLayoutKey,
        adSlot
    } = config;

    function populateGrid(elementId, items) {
        const grid = document.getElementById(elementId);
        if (!grid) return;

        let htmlContent = '';

        items.forEach((drama, index) => {
            const safeTitle = encodeURIComponent(drama.title);
            const safeImg = encodeURIComponent(drama.img);
            const safeLink = encodeURIComponent(drama.link);

            htmlContent += `
                <a href="${drama.link}" class="drama-card">
                    <div class="drama-card-img"><img src="${drama.img}" alt="${drama.title}" loading="lazy" decoding="async"></div>
                    <div class="drama-card-info">
                        <h3 class="drama-card-title">${drama.title}</h3>
                        <p class="drama-card-meta">${drama.type}</p>
                    </div>
                    <button class="bookmark-btn" onclick="event.preventDefault(); window.toggleMyList(this, '${safeTitle}', '${safeImg}', '${safeLink}')" title="Add to My List">
                        <i class="fas fa-plus"></i>
                    </button>
                </a>
                `;

            if (index === 4 || index === 14) {
                htmlContent += `
                    <div class="drama-card ad-card-wrapper">
                        <ins class="adsbygoogle" 
                            style="display:block; width:100%; height:100%;" 
                            data-ad-format="fluid" 
                            data-ad-layout-key="${adLayoutKey}" 
                            data-ad-client="ca-pub-3854581977852778" 
                            data-ad-slot="${adSlot}"></ins>
                    </div>`;
            }
        });

        grid.innerHTML = htmlContent;

        setTimeout(() => {
            const uninitializedAds = grid.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status="done"])');
            uninitializedAds.forEach(() => {
                try { (adsbygoogle = window.adsbygoogle || []).push({}); }
                catch (e) { console.error("Dynamic Ad Init Error", e); }
            });
        }, 500);
    }

    async function initializeDramaSite() {
        try {
            const url1 = `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev//3/discover/tv?api_key=${tmdbKey}&with_original_language=${tmdbLanguage}&sort_by=popularity.desc&without_genres=16&page=1`;
            const url2 = `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev//3/discover/tv?api_key=${tmdbKey}&with_original_language=${tmdbLanguage}&sort_by=popularity.desc&without_genres=16&page=2`;

            const [res1, res2] = await Promise.all([fetch(url1), fetch(url2)]);

            let allResults = [];
            if (res1.ok) {
                const data1 = await res1.json();
                allResults = [...allResults, ...data1.results];

                const topDrama = data1.results[0];
                if (topDrama) {
                    const bgImg = `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev/image/t/p/original${topDrama.backdrop_path || topDrama.poster_path}`;
                    const mobileImg = `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev/image/t/p/w780${topDrama.poster_path || topDrama.backdrop_path}`;
                    const titleText = topDrama.name || topDrama.title || featuredFallback;
                    const releaseYear = (topDrama.first_air_date || topDrama.release_date || "2026").substring(0, 4);

                    document.getElementById('hero-source-mobile').setAttribute('srcset', mobileImg);
                    document.getElementById('hero-image-main').setAttribute('src', bgImg);
                    document.getElementById('hero-image-main').setAttribute('alt', titleText);
                    document.getElementById('hero-title-text').textContent = titleText;

                    document.getElementById('hero-meta-container').innerHTML = `
                            <span>${typeLabel}</span><span class="meta-dot">•</span>
                            <span>Rating: ${topDrama.vote_average.toFixed(1)}</span><span class="meta-dot">•</span>
                            <span>${releaseYear}</span>
                        `;
                    document.getElementById('hero-play-link').setAttribute('href', `details.html?id=${topDrama.id}`);
                    document.getElementById('hero-mylist-btn').setAttribute('onclick', `event.preventDefault(); window.toggleMyList(this, '${encodeURIComponent(titleText)}', '${encodeURIComponent(mobileImg)}', 'details.html?id=${topDrama.id}')`);
                }
            }
            if (res2.ok) {
                const data2 = await res2.json();
                allResults = [...allResults, ...data2.results];
            }

            const mappedItems = allResults.map(i => ({
                title: i.name || i.title,
                img: i.poster_path ? `https://dramakan-tmdb-proxy.zabaazcreations.workers.dev/image/t/p/w500${i.poster_path}` : 'default-poster.jpg',
                link: `details.html?id=${i.id}`,
                type: typeLabel
            }));

            populateGrid(gridId, mappedItems);

        } catch (err) {
            console.error("API connection exception", err);
            document.getElementById(gridId).innerHTML = `<p style="color:#ef4444; grid-column:1/-1; text-align:center;">Failed to load ${failLabel}.</p>`;
        }
    }

    function createProfileSwitcher(profiles) {
        if (document.getElementById('home-profile-switcher-overlay')) return;
        const overlayContainer = document.createElement('div');
        overlayContainer.id = 'home-profile-switcher-overlay';

        let profilesHtml = '';
        profiles.forEach((prof) => {
            const isEmoji = prof.avatar && prof.avatar.length <= 10 && !prof.avatar.includes('http') && !prof.avatar.includes('data:image');
            const avatarHtml = isEmoji ? `<div class="switcher-avatar-img">${prof.avatar}</div>` : `<img class="switcher-avatar-img" src="${prof.avatar}" alt="${prof.name}">`;
            profilesHtml += `<div class="profile-select-card" data-id="${prof.id}">${avatarHtml}<span class="switcher-name">${prof.name}</span></div>`;
        });

        overlayContainer.innerHTML = `<h2 class="switcher-title">Who's watching?</h2><div class="profiles-list">${profilesHtml}</div>`;
        document.body.appendChild(overlayContainer);

        overlayContainer.querySelectorAll('.profile-select-card').forEach(card => {
            card.addEventListener('click', () => {
                localStorage.setItem('dramakan_profile_prompt_date', new Date().toDateString());
                localStorage.setItem('dramakan_active_profile_id', card.getAttribute('data-id'));
                overlayContainer.classList.add('hidden');
                setTimeout(() => overlayContainer.remove(), 800);
                window.dispatchEvent(new CustomEvent('profileSelected'));
            });
        });
    }

    function updateHeaderAvatar(profiles) {
        const activeId = localStorage.getItem('dramakan_active_profile_id');
        let activeProf = profiles[0];
        if (activeId) { const found = profiles.find(p => p.id === activeId); if (found) activeProf = found; }

        const avatarUrl = activeProf.avatar;
        const authBtn = document.getElementById('topAuthBtn');
        const bottomAuthBtn = document.getElementById('bottomAuthBtn');

        let avatarHtml = (avatarUrl && avatarUrl.length <= 10 && !avatarUrl.includes('http') && !avatarUrl.includes('data:image'))
            ? `<div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid var(--primary-color); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff;">${avatarUrl}</div>`
            : `<img src="${avatarUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color);">`;

        if (authBtn) {
            authBtn.href = "profile.html"; authBtn.innerHTML = avatarHtml;
            authBtn.style.padding = "0"; authBtn.style.background = "transparent"; authBtn.style.border = "none";
        }
        if (bottomAuthBtn) {
            const navIcon = bottomAuthBtn.querySelector('.nav-icon');
            if (navIcon) {
                navIcon.outerHTML = (avatarUrl && avatarUrl.length <= 10 && !avatarUrl.includes('http') && !avatarUrl.includes('data:image'))
                    ? `<div class="nav-icon" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 4px; border: 1px solid var(--primary-color); color: #fff;">${avatarUrl}</div>`
                    : `<img src="${avatarUrl}" class="nav-icon" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; margin-bottom: 4px; border: 1px solid var(--primary-color);">`;
            }
            bottomAuthBtn.href = "profile.html";
        }
    }

    async function initAuthSync() {
        try {
            const { auth, db, firestoreModule, authModule } = await getFirebase();
            const { doc, getDoc } = firestoreModule;
            const { onAuthStateChanged } = authModule;
            onAuthStateChanged(auth, async (user) => {
                const headerVipBtn = document.getElementById('headerVipBtn');

                if (user) {
                    const docSnap = await getDoc(doc(db, "users", user.uid));
                    let userProfiles = [];
                    let legacyAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.displayName || user.email || "User")}`;

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.avatarUrl) legacyAvatar = data.avatarUrl;
                        userProfiles = data.profiles && data.profiles.length > 0 ? data.profiles : [{ id: 'prof_default', name: data.username || "User", avatar: legacyAvatar }];

                        const now = Date.now();
                        let activePlan = "Basic";
                        if (data.isPremium && data.premiumExpiry > now) {
                            activePlan = data.premiumPlan || "";
                        }
                        if (headerVipBtn) {
                            if (activePlan.includes('Crown')) {
                                headerVipBtn.style.display = 'none';
                            } else {
                                headerVipBtn.style.display = 'inline-flex';
                            }
                        }
                    }

                    if (localStorage.getItem('dramakan_profile_prompt_date') !== new Date().toDateString() && userProfiles.length > 0) {
                        createProfileSwitcher(userProfiles);
                    } else { updateHeaderAvatar(userProfiles); }

                    window.addEventListener('profileSelected', () => { updateHeaderAvatar(userProfiles); });
                } else {
                    if (headerVipBtn) headerVipBtn.style.display = 'inline-flex';
                }
            });
        } catch (e) { console.warn("Authentication configuration sync failed", e); }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const modal = document.getElementById("dramaModal");
        const openBtn = document.getElementById("dramaRequestBtn");
        const closeBtn = document.getElementById("closeDramaModal");
        const form = document.getElementById("dramaRequestForm");

        if (openBtn && modal) {
            openBtn.onclick = async () => {
                const { auth } = await getFirebase();
                if (!auth.currentUser) {
                    alert("Please log in to request a drama. Redirecting to Login panel...");
                    window.location.href = "login.html";
                } else { modal.style.display = "flex"; }
            };
            closeBtn.onclick = () => modal.style.display = "none";
            window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; }
        }

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById("submitBtn");
                const status = document.getElementById("statusMessage");
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                submitBtn.disabled = true;

                try {
                    const { auth, db, firestoreModule } = await getFirebase();
                    const { collection, addDoc } = firestoreModule;
                    const user = auth.currentUser;

                    if (!user) throw new Error("Session expired. Authenticate to proceed.");

                    const dramaName = document.getElementById("dramaName").value.trim();
                    await addDoc(collection(db, "requests"), {
                        userId: user.uid,
                        userEmail: user.email || "Anonymous profile",
                        dramaName: dramaName,
                        status: "Pending",
                        notified: false,
                        createdAt: Date.now()
                    });

                    status.style.display = "block";
                    status.style.color = "#10b981";
                    status.innerHTML = "<i class='fas fa-check-circle'></i> Dispatched safely to Dashboard! Track progress on profile page.";
                    form.reset();
                    setTimeout(() => { modal.style.display = "none"; status.style.display = "none"; }, 2000);

                } catch (err) {
                    status.style.display = "block";
                    status.style.color = "#ef4444";
                    status.innerHTML = "<i class='fas fa-exclamation-circle'></i> Error: " + err.message;
                } finally {
                    submitBtn.innerText = "Send Request";
                    submitBtn.disabled = false;
                }
            };
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initializeDramaSite();
        initAuthSync();

        setTimeout(() => {
            const staticAds = document.querySelectorAll('.adsbygoogle:not([data-adsbygoogle-status="done"])');
            staticAds.forEach(() => {
                try { (adsbygoogle = window.adsbygoogle || []).push({}); }
                catch (e) { console.error("Ad Render Error", e); }
            });
        }, 800);
    });
}
