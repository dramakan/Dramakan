document.addEventListener('DOMContentLoaded', function () {

    // --- 1. MOBILE MENU SIDEBAR LOGIC ---
    const menuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });

        // Close sidebar when clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                menuToggle.querySelector('i').className = 'fas fa-bars';
            }
        });
    }

    // --- 2. ASYNC SEARCH & GRID LOADING ---
    let fuse;
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    async function initializeDatabase() {
        try {
            const response = await fetch('dramas.json');
            const data = await response.json();

            // Initialize Fuzzy Search for 5000+ items
            fuse = new Fuse(data, {
                keys: ['title'],
                threshold: 0.4,
                distance: 100,
                ignoreLocation: true,
                minMatchCharLength: 2
            });

            // Populate Grids automatically from JSON
            populateGrid('trending-grid', data.slice(0, 10)); // Top 10 items
            populateGrid('kdrama-grid', data.filter(d => d.type === "K-Drama").slice(0, 10));
            populateGrid('cdrama-grid', data.filter(d => d.type === "C-Drama").slice(0, 10));

        } catch (err) {
            console.error("Database failed to load:", err);
        }
    }

    function populateGrid(elementId, items) {
        const grid = document.getElementById(elementId);
        if (!grid) return;
        grid.innerHTML = items.map(drama => `
            <a href="${drama.link}" class="drama-card">
                <div class="drama-card-img">
                    <img loading="lazy" src="${drama.img}" alt="${drama.title}">
                </div>
                <div class="drama-card-info">
                    <h3 class="drama-card-title">${drama.title}</h3>
                    <p class="drama-card-meta">${drama.type}</p>
                </div>
            </a>
        `).join('');
    }

    // --- 3. HIGH PERFORMANCE DEBOUNCED SEARCH ---
    function debounce(fn, delay = 150) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const runSearch = debounce(() => {
        const query = searchInput.value.trim();
        if (query.length < 2 || !fuse) {
            searchResults.style.display = 'none';
            return;
        }

        const results = fuse.search(query, { limit: 10 });
        
        requestAnimationFrame(() => {
            searchResults.innerHTML = '';
            if (!results.length) {
                searchResults.innerHTML = `<div class="no-result">No results found</div>`;
            } else {
                const fragment = document.createDocumentFragment();
                results.forEach(({ item }) => {
                    const a = document.createElement('a');
                    a.href = item.link;
                    a.className = 'search-result-item';
                    a.innerHTML = `
                        <img src="${item.img}" alt="${item.title}" width="45" height="65">
                        <div class="search-item-info">
                            <div class="search-item-title">${item.title}</div>
                            <small class="search-item-type">${item.type}</small>
                        </div>`;
                    fragment.appendChild(a);
                });
                searchResults.appendChild(fragment);
            }
            searchResults.style.display = 'block';
        });
    }, 150);

    searchInput.addEventListener('input', runSearch);
    initializeDatabase();

    // --- 4. REQUEST POPUP ---
    const setupPopup = () => {
        const btn = document.createElement('a');
        btn.id = 'drama-request-toggle-button';
        btn.innerHTML = 'Didn’t Find Your Drama?';
        document.body.appendChild(btn);

        const overlay = document.createElement('div');
        overlay.id = 'drama-request-overlay-center';
        overlay.innerHTML = `
            <div id="drama-request-content-center">
                <h3>Request a Drama</h3>
                <p>DM us the drama name on Telegram</p>
                <a href="https://t.me/iamashish6700" target="_blank" class="btn btn-primary" style="background:#0088CC; color:white; width:100%; display:block; padding:10px; text-decoration:none;">Request Now</a>
                <button class="popup-close-btn">&times;</button>
            </div>`;
        document.body.appendChild(overlay);

        btn.onclick = () => overlay.classList.add('active');
        overlay.onclick = (e) => {
            if (e.target.classList.contains('popup-close-btn') || e.target === overlay) {
                overlay.classList.remove('active');
            }
        };
    };
    setupPopup();
});