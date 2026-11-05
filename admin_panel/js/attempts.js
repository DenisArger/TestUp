let attempts = [];

async function loadAttempts(quizId) {
    const filter = quizId ? `filter=quiz_id="${quizId}"` : '';
    const sort = filter ? '&sort=-created' : 'sort=-created';
    const url = `/collections/attempts/records?${filter}${sort}`;
    const res = await apiGet(url);
    attempts = res.items || [];
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
