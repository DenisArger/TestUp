let questions = [];

async function loadQuestions(quizId) {
    let allItems = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const url = `/collections/questions/records?filter=quiz_id="${quizId}"&sort=-created&page=${page}&perPage=${perPage}`;
        const res = await apiGet(url);
        const items = res.items || [];
        allItems.push(...items);

        if (page >= res.totalPages || items.length === 0) break;
        page++;
    }
    questions = allItems;
    return questions;
}

function renderQuestions() {
    const tbody = document.getElementById('questions-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const q of questions) {
        const options = Array.isArray(q.options) ? q.options : [];
        const correctShort = shortCorrect(q);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(q.text)}</td>
            <td><span class="badge">${badgeLabel(q.type)}</span></td>
            <td>${options.length}</td>
            <td>${escapeHtml(correctShort)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-primary" onclick="window.questions.editQuestion('${q.id}')">Редактировать</button>
                <button class="btn btn-sm btn-danger" onclick="window.questions.deleteQuestion('${q.id}')">Удалить</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

function badgeLabel(type) {
    const map = { single: 'Один ответ', multiple: 'Несколько', text: 'Текст' };
    return map[type] || type;
}

function shortCorrect(q) {
    if (q.type === 'text') return escapeHtml(q.correct_answer || '—');
    if (q.type === 'single') {
        const idx = Number(q.correct_answer);
        const opts = Array.isArray(q.options) ? q.options : [];
        return opts[idx] !== undefined ? `Вариант ${idx + 1}` : q.correct_answer;
    }
    if (q.type === 'multiple') {
        try {
            const idxs = Array.isArray(q.correct_answer) ? q.correct_answer : JSON.parse(q.correct_answer || '[]');
            const opts = Array.isArray(q.options) ? q.options : [];
            return idxs.map(i => `Вар. ${i + 1}`).join(', ') || '—';
        } catch {
            return q.correct_answer || '—';
        }
    }
    return '—';
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadQuizSelect() {
    const select = document.getElementById('quiz-select');
    if (!select) return;
    const list = window.quizzes.getQuizzes ? window.quizzes.getQuizzes() : [];
    select.innerHTML = '<option value="">Выберите тест...</option>';
    for (const q of list) {
        const opt = document.createElement('option');
        opt.value = q.id;
        opt.textContent = q.title;
        select.appendChild(opt);
    }
}

async function openQuestionModal(existing, quizId) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    const close = document.getElementById('modal-close');
    const isEdit = !!existing;

    body.innerHTML = `
        <h3>${isEdit ? 'Редактировать вопрос' : 'Новый вопрос'}</h3>
        <form id="question-form">
            <div class="form-group">
                <label>Текст вопроса <span style="color:red">*</span></label>
                <textarea name="text" rows="3" required>${escapeHtml(existing ? existing.text : '')}</textarea>
            </div>
            <div class="form-group answer-type-select">
                <label>Тип вопроса <span style="color:red">*</span></label>
                <select name="type" id="q-type">
                    <option value="single" ${existing && existing.type === 'single' ? 'selected' : ''}>Один ответ (single)</option>
                    <option value="multiple" ${existing && existing.type === 'multiple' ? 'selected' : ''}>Несколько ответов (multiple)</option>
                    <option value="text" ${existing && existing.type === 'text' ? 'selected' : ''}>Свободный текст (text)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Варианты ответа</label>
                <div class="options-list" id="options-list"></div>
                <button type="button" class="btn btn-add-option" id="btn-add-option">+ Добавить вариант</button>
            </div>
            <div class="form-group answer-field" id="answer-single" style="display:${existing && existing.type === 'single' ? 'block' : 'none'};">
                <label>Правильный вариант отмечен радио-кнопкой в строке варианта выше</label>
            </div>
            <div class="form-group answer-field" id="answer-multiple" style="display:${existing && existing.type === 'multiple' ? 'block' : 'none'};">
                <label>Правильные варианты отмечены чекбоксами в строках вариантов выше</label>
            </div>
            <div class="form-group answer-field" id="answer-text" style="display:${existing && existing.type === 'text' ? 'block' : 'none'};">
                <label>Ключевое слово / фраза</label>
                <input type="text" name="correct_answer" id="q-correct-text" value="${escapeHtml(existing && existing.type === 'text' ? existing.correct_answer || '' : '')}">
            </div>
            <input type="hidden" name="quiz_id" value="${quizId || ''}">
            <div style="display:flex; gap:8px; margin-top:16px;">
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn" id="q-modal-cancel">Отмена</button>
            </div>
        </form>
    `;

    modal.style.display = 'flex';

    const form = document.getElementById('question-form');
    const typeSelect = document.getElementById('q-type');
    const optionsList = document.getElementById('options-list');
    const btnAdd = document.getElementById('btn-add-option');
    const cancel = document.getElementById('q-modal-cancel');

    let options = existing ? (Array.isArray(existing.options) ? existing.options : []) : [];

    function renderOptions() {
        optionsList.innerHTML = '';
        options.forEach((opt, i) => {
            const row = document.createElement('div');
            row.className = 'option-row';
            const type = typeSelect.value;
            row.innerHTML = `
                <input type="text" value="${escapeHtml(opt)}" oninput="window.questions.updateOption(${i}, this.value)">
                ${type === 'single' ? `<input type="radio" name="correct_idx" value="${i}" ${existing && existing.type === 'single' && Number(existing.correct_answer) === i ? 'checked' : ''}>` : ''}
                ${type === 'multiple' ? `<input type="checkbox" name="correct_idx" value="${i}" ${existing && existing.type === 'multiple' && isSelected(i, existing.correct_answer) ? 'checked' : ''}>` : ''}
                <div class="option-actions">
                    <button type="button" class="btn-small" onclick="window.questions.removeOption(${i})">Удалить</button>
                </div>
            `;
            optionsList.appendChild(row);
        });
        renderAnswerFields();
    }

    function renderAnswerFields() {
        const type = typeSelect.value;
        document.getElementById('answer-single').style.display = type === 'single' ? 'block' : 'none';
        document.getElementById('answer-multiple').style.display = type === 'multiple' ? 'block' : 'none';
        document.getElementById('answer-text').style.display = type === 'text' ? 'block' : 'none';

        if (type === 'text') {
            const textInput = document.getElementById('q-correct-text');
            if (textInput && existing && existing.type === 'text') {
                textInput.value = existing.correct_answer || '';
            }
        }
    }

    function isSelected(i, correct) {
        if (Array.isArray(correct)) return correct.includes(i);
        try {
            const arr = JSON.parse(correct || '[]');
            return Array.isArray(arr) && arr.includes(i);
        } catch {
            return false;
        }
    }

    btnAdd.addEventListener('click', () => {
        options.push('');
        renderOptions();
    });

    window.questions.removeOption = (i) => {
        options.splice(i, 1);
        renderOptions();
    };
    window.questions.updateOption = (i, value) => {
        options[i] = value;
    };

    typeSelect.addEventListener('change', () => {
        renderOptions();
    });

    const cleanup = () => {
        modal.style.display = 'none';
        body.innerHTML = '';
        form.removeEventListener('submit', onSubmit);
        cancel.removeEventListener('click', onCancel);
        close.removeEventListener('click', onClose);
        btnAdd.removeEventListener('click', null);
        typeSelect.removeEventListener('change', null);
        window.questions.removeOption = null;
        options.forEach((_, i) => {
            const btn = optionsList.querySelector(`button[onclick*="removeOption(${i})"]`);
            if (btn) btn.removeAttribute('onclick');
        });
    };

    const onClose = () => cleanup();
    const onCancel = () => cleanup();

    const onSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const text = fd.get('text').trim();
        const type = fd.get('type');
        const quizIdVal = fd.get('quiz_id');

        if (!text) {
            alert('Введите текст вопроса');
            return;
        }

        if (type === 'single' || type === 'multiple') {
            if (options.length === 0 || options.every(o => !o.trim())) {
                alert('Добавьте хотя бы один вариант ответа');
                return;
            }
        }

        let correctAnswer;
        const correctInputs = form.querySelectorAll('input[name="correct_idx"]:checked');
        if (type === 'single') {
            correctAnswer = correctInputs.length > 0 ? correctInputs[0].value : String(options.findIndex(o => o.trim()) );
            if (correctInputs.length === 0) {
                alert('Выберите правильный вариант');
                return;
            }
        } else if (type === 'multiple') {
            correctAnswer = JSON.stringify(Array.from(correctInputs).map(inp => Number(inp.value)));
            if (correctInputs.length === 0) {
                alert('Выберите хотя бы один правильный вариант');
                return;
            }
        } else {
            correctAnswer = fd.get('correct_answer').trim();
            if (!correctAnswer) {
                alert('Введите правильный ответ');
                return;
            }
        }

        const bodyData = {
            quiz_id: quizIdVal,
            text,
            type,
            options: options.map(o => o.trim()).filter(o => o),
            correct_answer: correctAnswer,
        };

        try {
            if (isEdit) {
                await apiPatch(`/collections/questions/records/${existing.id}`, bodyData);
            } else {
                await apiPost('/collections/questions/records', bodyData);
            }
            cleanup();
            if (quizIdVal) {
                await loadQuestions(quizIdVal);
                renderQuestions();
            }
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

    renderOptions();
}

async function addQuestion(quizId) {
    await openQuestionModal(null, quizId);
}

async function editQuestion(id) {
    const q = questions.find(x => x.id === id);
    if (!q) return;
    await openQuestionModal(q, q.quiz_id);
}

async function deleteQuestion(id) {
    if (!confirm('Удалить вопрос?')) return;
    await apiDelete(`/collections/questions/records/${id}`);
    questions = questions.filter(x => x.id !== id);
    renderQuestions();
}

window.questions = {
    loadQuestions,
    renderQuestions,
    loadQuizSelect,
    addQuestion,
    editQuestion,
    deleteQuestion,
    openQuestionModal,
    removeOption: () => {},
};
