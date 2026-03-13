document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('dramakan_token');
    if (token) {
        const bottomAuth = document.getElementById('bottomAuthBtn');
        if(bottomAuth) {
            bottomAuth.href = 'profile.html';
            bottomAuth.innerHTML = '<i class="fas fa-user-circle nav-icon"></i><span class="nav-label">Profile</span>';
        }
    }
});