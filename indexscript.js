document.addEventListener('DOMContentLoaded', function () {

    // --- 1. MOBILE MENU LOGIC ---
    const menuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            overlay.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close when clicking overlay
        overlay.addEventListener('click', () => {
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            if (menuToggle.querySelector('i')) {
                menuToggle.querySelector('i').className = 'fas fa-bars';
            }
        });
    }

    // --- 2. SEARCH & DATA POPULATION ---
    let fuse;
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    async function initializeDramaSite() {
        try {
            const response = await fetch('dramas.json');
            const data = await response.json();

            fuse = new Fuse(data, {
                keys: ['title'],
                threshold: 0.4
            });
// Add this helper function at the top
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

async function initializeDramaSite() {
    try {
        const response = await fetch('dramas.json');
        const data = await response.json();

        fuse = new Fuse(data, { keys: ['title'], threshold: 0.4 });

        // 1. Logic for Randomization (except Trending)
        populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15)); 
        populateGrid('kdrama-grid', shuffleArray(data.filter(d => d.type === "K-Drama")).slice(0, 15));
        populateGrid('cdrama-grid', shuffleArray(data.filter(d => d.type === "C-Drama")).slice(0, 15));
        populateGrid('jdrama-grid', shuffleArray(data.filter(d => d.type === "J-Drama")).slice(0, 15));

        // 2. Carousel Button Logic
        document.querySelectorAll('.carousel-container').forEach(container => {
            const track = container.querySelector('.carousel-track');
            const nextBtn = container.querySelector('.next');
            const prevBtn = container.querySelector('.prev');

            nextBtn.addEventListener('click', () => {
                track.scrollBy({ left: 300, behavior: 'smooth' });
            });
            prevBtn.addEventListener('click', () => {
                track.scrollBy({ left: -300, behavior: 'smooth' });
            });
        });

        // 3. Floating Button Modal Logic
        const modal = document.getElementById('request-modal');
        const btn = document.getElementById('floating-request-btn');
        const close = document.querySelector('.close-modal');

        btn.onclick = () => modal.classList.add('active');
        close.onclick = () => modal.classList.remove('active');
        window.onclick = (e) => { if(e.target == modal) modal.classList.remove('active'); }

    } catch (err) {
        console.error("Data Load Error:", err);
    }
}
    function populateGrid(elementId, items) {
        const grid = document.getElementById(elementId);
        if (!grid) return;
        grid.innerHTML = items.map(drama => `
            <a href="${drama.link}" class="drama-card">
                <div class="drama-card-img"><img src="${drama.img}" alt="${drama.title}"></div>
                <div class="drama-card-info">
                    <h3 class="drama-card-title">${drama.title}</h3>
                    <p class="drama-card-meta">${drama.type}</p>
                </div>
            </a>
        `).join('');
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (query.length < 1 || !fuse) {
                searchResults.style.display = 'none';
                return;
            }
            const results = fuse.search(query, { limit: 10 });
            searchResults.innerHTML = results.map(({ item }) => `
                <a href="${item.link}" class="search-result-item">
                    <img src="${item.img}" width="40" height="55">
                    <div>
                        <div style="color:#fff; font-weight:600;">${item.title}</div>
                        <small style="color:#aaa;">${item.type}</small>
                    </div>
                </a>
            `).join('');
            searchResults.style.display = 'block';
        });
    }

    // --- 3. HERO SLIDER ---
    const sliderWrapper = document.querySelector('.slider-wrapper');
    if (sliderWrapper) {
        let slideIndex = 0;
        const slides = document.querySelectorAll('.slide');
        setInterval(() => {
            slideIndex = (slideIndex + 1) % slides.length;
            sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
        }, 5000);
    }

    initializeDramaSite();
});

     