let attempts = [];

async function loadAttempts(quizId) {
    let allItems = [];
    let page = 1;
    const perPage = 100;
    const filter = quizId ? `filter=quiz_id="${quizId}"` : '';
    const sort = '&sort=-created';

    while (true) {
        const url = `/collections/attempts/records?${filter}${sort}&page=${page}&perPage=${perPage}&expand=quiz_id`;
        const res = await apiGet(url);
        const items = res.items || [];
        allItems.push(...items);

        if (page >= res.totalPages || items.length === 0) break;
        page++;
    }
    attempts = allItems;
    return attempts;
}

function renderAttempts() {
    const tbody = document.getElementById('attempts-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const a of attempts) {
        const quizName = a.expand && a.expand.quiz_id ? escapeHtml(a.expand.quiz_id.title) : '—';
        const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(a.respondent_name || '—')}</td>
            <td>${a.score}</td>
            <td>${a.total}</td>
            <td>${pct}%</td>
            <td>${formatDate(a.started_at)}</td>
            <td>${formatDate(a.finished_at)}</td>
        `;
        tbody.appendChild(tr);
    }
}

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadAttemptQuizSelect() {
    const select = document.getElementById('attempt-quiz-select');
    if (!select) return;
    const list = window.quizzes.getQuizzes ? window.quizzes.getQuizzes() : [];
    select.innerHTML = '<option value="">Все тесты</option>';
    for (const q of list) {
        const opt = document.createElement('option');
        opt.value = q.id;
        opt.textContent = q.title;
        select.appendChild(opt);
    }
}

window.attempts = {
    loadAttempts,
    renderAttempts,
    loadAttemptQuizSelect,
};
