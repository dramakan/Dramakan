const firebaseConfig = {
    apiKey: "AIzaSyB7i67_T7fs87BHIY2Pxs6KRAknhXrowIA",
    authDomain: "dramakan007.firebaseapp.com",
    projectId: "dramakan007"
};

export async function loadCategory(predicate) {
    const grid = document.getElementById('category-grid');
    let data = [];
    const cached = localStorage.getItem('dramakan_master_db');
    if (cached) {
        data = JSON.parse(cached);
    } else {
        try {
            const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
            const { getFirestore, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            const snap = await getDocs(collection(db, "dramas"));
            snap.forEach(d => data.push(d.data()));
            localStorage.setItem('dramakan_master_db', JSON.stringify(data));
        } catch (e) {}
    }
    const filtered = data.filter(predicate);
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted-color);">No dramas found.</div>';
        return;
    }
    grid.innerHTML = filtered.map(drama => {
        const safeTitle = encodeURIComponent(drama.title);
        const safeImg = encodeURIComponent(drama.img);
        const safeLink = encodeURIComponent(drama.link);
        return `<a href="${drama.link}" class="drama-card"><div class="drama-card-img"><img src="${drama.img}" loading="lazy"></div><div class="drama-card-info"><h3 class="drama-card-title">${drama.title}</h3><p class="drama-card-meta">${drama.type}</p></div><button class="bookmark-btn" onclick="event.preventDefault(); window.toggleMyList(this, '${safeTitle}', '${safeImg}', '${safeLink}')"><i class="fas fa-plus"></i></button></a>`;
    }).join('');
}
