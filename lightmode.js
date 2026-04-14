// =========================================================
// GLOBAL THEME & HARDWARE ENGINE (lightmode.js)
// =========================================================

// 1. INSTANT EXECUTION (Runs before the page paints to prevent flashing)
(function applyThemeAndHardware() {
    // --- THEME DETECTION ---
    const savedTheme = localStorage.getItem('dramakan_theme');
    // Check if their operating system is set to light mode
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    
    // Apply light mode if saved, OR if no save exists but OS prefers light
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }

    // --- HARDWARE DETECTION (LITE MODE) ---
    // Globally protects budget devices across all your pages
    let isLowEnd = false;
    if ('deviceMemory' in navigator && navigator.deviceMemory < 4) isLowEnd = true;
    if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 4) isLowEnd = true;
    if ('connection' in navigator && (navigator.connection.effectiveType === '3g' || navigator.connection.effectiveType === '2g')) isLowEnd = true;

    if (isLowEnd) {
        document.documentElement.classList.add('lite-mode');
        console.log("Dramakan: Budget device detected. Lite UI active.");
    }
})();

// 2. TOGGLE BUTTON LISTENER (Runs after HTML loads)
document.addEventListener('DOMContentLoaded', () => {
    // This will work on any page that has a button with id="themeToggle"
    const themeToggle = document.getElementById('themeToggle');
    
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        
        // Set the correct initial icon based on current theme
        if (document.documentElement.classList.contains('light-mode')) {
            icon.className = 'fas fa-moon';
        } else {
            icon.className = 'fas fa-sun';
        }

        // Handle the click event
        themeToggle.addEventListener('click', () => {
            // Toggle the class on the HTML tag
            document.documentElement.classList.toggle('light-mode');
            const isLight = document.documentElement.classList.contains('light-mode');
            
            // Save preference to localStorage so ALL pages know the choice
            localStorage.setItem('dramakan_theme', isLight ? 'light' : 'dark');
            
            // Update the icon
            icon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
        });
    }
});