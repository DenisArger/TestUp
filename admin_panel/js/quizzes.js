let quizzes = [];

async function loadQuizzes() {
    const res = await apiGet('/collections/quizzes/records?sort=-created');
    quizzes = res.items || [];
    return quizzes;
}

function renderQuizzes() {
    const tbody = document.getElementById('quizzes-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const q of quizzes) {
        const tr = document.createElement('tr');
        const created = formatDate(q.created);
        tr.innerHTML = `
            <td><strong>${escapeHtml(q.title)}</strong></td>
            <td>${escapeHtml(q.description || '')}</td>
            <td><input type="checkbox" ${q.active ? 'checked' : ''} disabled></td>
            <td>${created}</td>
            <td class="actions">
                <button class="btn btn-sm btn-primary" onclick="window.quizzes.editQuiz('${q.id}')">Редактировать</button>
                <button class="btn btn-sm btn-danger" onclick="window.quizzes.deleteQuiz('${q.id}', '${escapeHtml(q.title)}')">Удалить</button>
            </td>
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

async function createQuiz(data) {
    const created = await apiPost('/collections/quizzes/records', data);
    quizzes.unshift(created);
    renderQuizzes();
    return created;
}

async function updateQuiz(id, data) {
    const updated = await apiPatch(`/collections/quizzes/records/${id}`, data);
    const idx = quizzes.findIndex(q => q.id === id);
    if (idx !== -1) quizzes[idx] = updated;
    renderQuizzes();
    return updated;
}

async function deleteQuiz(id) {
    await apiDelete(`/collections/quizzes/records/${id}`);
    quizzes = quizzes.filter(q => q.id !== id);
    renderQuizzes();
}

async function openQuizModal(existing) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    const close = document.getElementById('modal-close');

    const isEdit = !!existing;
    body.innerHTML = `
        <h3>${isEdit ? 'Редактировать тест' : 'Создать тест'}</h3>
        <form id="quiz-form">
            <div class="form-group">
                <label>Название <span style="color:red">*</span></label>
                <input type="text" name="title" value="${escapeHtml(existing ? existing.title : '')}" required>
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea name="description" rows="3">${escapeHtml(existing ? existing.description || '' : '')}</textarea>
            </div>
            <div class="form-group">
                <label><input type="checkbox" name="active" ${existing && existing.active ? 'checked' : ''}> Активен</label>
            </div>
            <div style="display:flex; gap:8px; margin-top:16px;">
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn" id="quiz-modal-cancel">Отмена</button>
            </div>
        </form>
    `;

    modal.style.display = 'flex';

    const form = document.getElementById('quiz-form');
    const cancel = document.getElementById('quiz-modal-cancel');

    const cleanup = () => {
        modal.style.display = 'none';
        body.innerHTML = '';
        form.removeEventListener('submit', onSubmit);
        cancel.removeEventListener('click', onCancel);
        close.removeEventListener('click', onClose);
    };

    const onClose = () => cleanup();
    const onCancel = () => cleanup();

    const onSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
            title: fd.get('title'),
            description: fd.get('description'),
            active: fd.get('active') === 'on',
        };
        try {
            if (isEdit) {
                await updateQuiz(existing.id, data);
            } else {
                await createQuiz(data);
            }
            cleanup();
        } catch (err_) {
            alert(err_.message || 'Ошибка сохранения');
        }
    };

    form.addEventListener('submit', onSubmit);
    cancel.addEventListener('click', onCancel);
    close.addEventListener('click', onClose);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cleanup();
    });
}

window.quizzes = {
    loadQuizzes,
    renderQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    openQuizModal,
    getQuizzes: () => quizzes,
};
