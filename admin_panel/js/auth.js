const LOGIN_URL = '/api/admins/auth-with-password';

let currentAdmin = null;

async function login(email, password) {
    const data = await apiPost(LOGIN_URL, { identity: email, password });
    if (data.token) {
        localStorage.setItem('pb_token', data.token);
    }
    currentAdmin = data.record ? { email: data.record.email, id: data.record.id } : { email };
    return data;
}

async function logout() {
    currentAdmin = null;
    localStorage.removeItem('pb_token');
    const view = document.getElementById('auth-view');
    const panel = document.getElementById('panel-view');
    const btnLogout = document.getElementById('btn-logout');
    if (view) view.style.display = 'block';
    if (panel) panel.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
    const form = document.getElementById('login-form');
    if (form) form.reset();
    if (window.app) window.app.showTab('quizzes');
}

function isLoggedIn() {
    return !!localStorage.getItem('pb_token');
}

function getAdmin() {
    return currentAdmin;
}

function handleUnauthorized() {
    logout();
    const err = document.getElementById('login-error');
    if (err) {
        err.style.display = 'block';
        err.textContent = 'Сессия истекла. Войдите снова.';
    }
}

async function restoreSession() {
    if (!isLoggedIn()) return;
    const view = document.getElementById('auth-view');
    const panel = document.getElementById('panel-view');
    const btnLogout = document.getElementById('btn-logout');
    if (view) view.style.display = 'none';
    if (panel) panel.style.display = 'block';
    if (btnLogout) btnLogout.style.display = 'inline-block';
    if (window.app) {
        try {
            await window.app.init();
            await window.app.showTab('quizzes');
        } catch (err) {
            if (err && err.message === 'Unauthorized') return;
            console.error('Session restore failed:', err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const err = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.style.display = 'none';
        const email = form.email.value.trim();
        const password = form.password.value;
        try {
            await login(email, password);
            const view = document.getElementById('auth-view');
            const panel = document.getElementById('panel-view');
            if (view) view.style.display = 'none';
            if (panel) panel.style.display = 'block';
            if (btnLogout) btnLogout.style.display = 'inline-block';
            if (window.app) {
                window.app.init();
                window.app.showTab('quizzes');
            }
        } catch (err_) {
            err.style.display = 'block';
            err.textContent = err_.message || 'Неверный логин или пароль.';
        }
    });

    btnLogout.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    restoreSession();
});

window.auth = {
    login,
    logout,
    isLoggedIn,
    getAdmin,
    handleUnauthorized,
};


