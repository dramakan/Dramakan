export async function loadDramasFromJson(predicate) {
    const grid = document.getElementById('drama-grid');
    try {
        const response = await fetch('dramas.json');
        const allDramas = await response.json();
        const filtered = allDramas.filter(predicate);
        grid.innerHTML = filtered.map(drama => `
                    <a href="${drama.link}" class="drama-card">
                        <div class="drama-card-img"><img loading="lazy" src="${drama.img}" alt="${drama.title}"></div>
                        <div class="drama-card-info"><h3 class="drama-card-title">${drama.title}</h3></div>
                    </a>
                `).join('');
    } catch (e) {
        grid.innerHTML = "<p>Failed to load dramas.</p>";
    }
}
