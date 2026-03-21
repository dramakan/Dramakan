document.addEventListener('DOMContentLoaded', function () {

    // --- 1. MOBILE MENU LOGIC ---
    const menuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    
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

        overlay.addEventListener('click', () => {
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            if (menuToggle.querySelector('i')) {
                menuToggle.querySelector('i').className = 'fas fa-bars';
            }
        });
    }

     // --- 2. RANDOMIZATION UTILITY ---
    function shuffleArray(array) {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // --- 3. DATA POPULATION & CAROUSELS ---
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

            populateGrid('trending-grid', data.filter(d => d.Trend === "T").slice(0, 15)); 
            populateGrid('kdrama-grid', shuffleArray(data.filter(d => d.type === "K-Drama")).slice(0, 15));
            populateGrid('cdrama-grid', shuffleArray(data.filter(d => d.type === "C-Drama")).slice(0, 15));
            populateGrid('jdrama-grid', shuffleArray(data.filter(d => d.type === "J-Drama")).slice(0, 15));
            populateGrid('pdrama-grid', shuffleArray(data.filter(d => d.type === "P-Drama")).slice(0, 15));
            populateGrid('tdrama-grid', shuffleArray(data.filter(d => d.type === "T-Drama")).slice(0, 15));
            populateGrid('upcoming-grid', shuffleArray(data.filter(d => d.release_date === "Upcoming")).slice(0, 15));
            populateGrid('turkishdrama-grid', shuffleArray(data.filter(d => d.type === "Turkish-Drama")).slice(0, 15));
            populateGrid('usdrama-grid', shuffleArray(data.filter(d => d.type === "US-Drama")).slice(0, 15));
            populateGrid('Movie-grid', shuffleArray(data.filter(d => d.type === "Movie")).slice(0, 15));

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

    // --- 4. HERO SLIDER (PERFECT INFINITE LOOP) ---
    const sliderWrapper = document.querySelector('.slider-wrapper');
    if (sliderWrapper) {
        let slideIndex = 0;
        // Used heroSlides to avoid the duplicate declaration error freezing your app
        const heroSlides = document.querySelectorAll('.slide');
        
        // Mobile Setup
        if (window.innerWidth <= 992 && heroSlides.length > 1) {
            sliderWrapper.prepend(sliderWrapper.lastElementChild);
            sliderWrapper.style.transition = 'none';
            sliderWrapper.style.transform = `translateX(-100%)`;
            
            // Set initial active state
            Array.from(sliderWrapper.children).forEach(s => s.classList.remove('active'));
            sliderWrapper.children[1].classList.add('active');

            setInterval(() => {
                // Animate to left
                sliderWrapper.style.transition = 'transform 0.5s ease-in-out';
                sliderWrapper.style.transform = `translateX(-200%)`; 
                
                // Shift classes instantly for smooth scaling
                sliderWrapper.children[1].classList.remove('active');
                sliderWrapper.children[2].classList.add('active');
                
                // Quietly reset DOM behind the scenes
                setTimeout(() => {
                    sliderWrapper.style.transition = 'none';
                    sliderWrapper.appendChild(sliderWrapper.firstElementChild);
                    sliderWrapper.style.transform = `translateX(-100%)`; 
                }, 500); 
            }, 5000);
            
        } else {
            // Desktop Setup
            setInterval(() => {
                slideIndex = (slideIndex + 1) % heroSlides.length;
                sliderWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
            }, 5000);
        }

        // Click Logic 
        heroSlides.forEach(slide => {
            slide.addEventListener('click', () => {
                // Prevents user from clicking faded side-slides on mobile
                if (window.innerWidth <= 992 && !slide.classList.contains('active')) return;
                
                const btn = slide.querySelector('.btn-primary');
                if (btn) {
                    window.location.href = btn.getAttribute('href');
                }
            });
        });
    }

    initializeDramaSite();
});

document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("dramaModal");
    const openBtn = document.getElementById("dramaRequestBtn");
    const closeBtn = document.getElementById("closeDramaModal");
    const form = document.getElementById("dramaRequestForm");

    const BOT_TOKEN = "8473278366:AAFgUjLJGAjRoh4Ig1DCat0qCs2D7yZHcbA";
    const CHAT_ID = "5780542178";

    openBtn.onclick = () => modal.style.display = "flex";
    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (e) => { if(e.target === modal) modal.style.display = "none"; }

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const dramaName = document.getElementById("dramaName").value;
        const contactDetail = document.getElementById("contactname").value; 
        const status = document.getElementById("statusMessage");
        const submitBtn = document.getElementById("submitBtn");

        submitBtn.innerText = "Sending...";
        submitBtn.disabled = true;

        const text = `🎬 *New Drama Request*\n\n` +
                     `📺 *Drama:* ${dramaName}\n` +
                     `👤 *Contact:* ${contactDetail}`;  
        
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;

        try {
            const response = await fetch(url);
            if (response.ok) {
                status.style.display = "block";
                status.style.color = "#4CAF50";
                status.innerText = "Request sent! Check back in 48 hours.";
                form.reset();
            } else {
                throw new Error();
            }
        } catch (err) {
            status.style.display = "block";
            status.style.color = "#ff4d4d";
            status.innerText = "Error sending request. Try joining Telegram.";
        } finally {
            submitBtn.innerText = "Send Request";
            submitBtn.disabled = false;
        }
    };
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.log('Service Worker Failed', err));
  });
}