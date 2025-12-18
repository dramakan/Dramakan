document.addEventListener('DOMContentLoaded', function () {
  

  document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');
  
  if (menuToggle && navLinks) {
    // Open/Close menu
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking anywhere else
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
      }
    });
  }
});
// Populate Grids automatically from JSON
            populateGrid('trending-grid', data.slice(0, 15)); // Top 10 items
            populateGrid('kdrama-grid', data.filter(d => d.type === "K-Drama").slice(0, 15));
            populateGrid('cdrama-grid', data.filter(d => d.type === "C-Drama").slice(0, 15));
            populateGrid('cdrama-grid', data.filter(d => d.type === "J-Drama").slice(0, 15));

      
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
  /* ================= 1. LOGIN & PROFILE LOGIC ================= */
  const userString = localStorage.getItem('dramaKanUser');
  const loginButton = document.getElementById('login-button');
  const profileButton = document.getElementById('profile-button');
  const mobileProfileText = document.getElementById('mobile-nav-profile-text');

  let isLoggedIn = false;
  if (userString) {
    try {
      isLoggedIn = JSON.parse(userString).isLoggedIn;
    } catch (e) {}
  }

  if (loginButton && profileButton) {
    loginButton.style.display = isLoggedIn ? 'none' : 'inline-block';
    profileButton.style.display = isLoggedIn ? 'inline-block' : 'none';
  }

  if (mobileProfileText) {
    mobileProfileText.textContent = isLoggedIn ? 'Profile' : 'Login';
    const profileNavItem = document.querySelector('.mobile-footer-nav a[data-page="profile"]');
    if (profileNavItem) {
      profileNavItem.href = isLoggedIn ? 'profile.html' : 'login.html';
    }
  }

  /* ================= 2. HERO SLIDER ================= */
  const sliderWrapper = document.querySelector('.slider-wrapper');
  if (sliderWrapper) {
    const slides = document.querySelectorAll('.slide');
    let index = 0;
    setInterval(() => {
      index = (index + 1) % slides.length;
      sliderWrapper.style.transform = `translateX(-${index * 100}%)`;
    }, 5000);
  }

  /* ================= 3. ASYNC SEARCH SYSTEM (FETCH JSON) ================= */
  let fuse; 
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  // Load the JSON file in the background
  fetch('dramas.json')
    .then(response => {
      if (!response.ok) throw new Error("Could not load dramas.json");
      return response.json();
    })
    .then(data => {
      // Initialize Fuse with optimized settings for 5000+ items
      fuse = new Fuse(data, {
        keys: ['title'],
        threshold: 0.4,           // Typo tolerance (0.0 exact, 1.0 loose)
        distance: 100,
        ignoreLocation: true,
        minMatchCharLength: 1
      });
      console.log("Search database loaded successfully.");
    })
    .catch(err => {
      console.error("Search Error:", err);
      // Optional: Show error in search bar
      searchInput.placeholder = "Search disabled (Error loading data)";
    });

  // Debounce prevents the search from firing on every single keystroke
  function debounce(fn, delay = 150) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  const runSearch = debounce(() => {
    const query = searchInput.value.trim();
    
    // Reset if search is empty or data isn't loaded yet
    if (query.length < 2 || !fuse) {
      searchResults.style.display = 'none';
      searchResults.innerHTML = '';
      return;
    }

    // Perform the search
    const results = fuse.search(query, { limit: 10 });

    // Update UI efficiently using DocumentFragment
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
            <img loading="lazy" src="${item.img}" alt="${item.title}" width="45" height="65">
            <div>
              <div style="font-weight:600; font-size:14px; color:#fff;">${item.title}</div>
              <small style="color:#fff;">${item.type}</small>
            </div>
          `;
          fragment.appendChild(a);
        });
        searchResults.appendChild(fragment);
      }
      searchResults.style.display = 'block';
    });
  }, 150);

  searchInput.addEventListener('input', runSearch);

  // Close search when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
      searchResults.style.display = 'none';
    }
  });

  /* ================= 4. DRAMA REQUEST POPUP ================= */
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
        <a href="https://t.me/iamashish6700" target="_blank" class="btn btn-primary" style="background:#0088CC; color:white; width:100%; border:none; display:block; padding:10px; border-radius:5px; text-decoration:none;">Request Now</a>
        <button id="close-popup" style="position:absolute; top:10px; right:10px; border:none; background:none; font-size:20px; cursor:pointer;">&times;</button>
      </div>
    `;
    document.body.appendChild(overlay);

    btn.onclick = (e) => {
      e.preventDefault();
      overlay.classList.add('active');
    };
    
    overlay.onclick = (e) => {
      if (e.target.id === 'close-popup' || e.target === overlay) {
        overlay.classList.remove('active');
      }
    };
  };
  setupPopup();

  
});
