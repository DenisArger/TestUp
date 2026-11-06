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
                <button class="btn btn-sm btn-success" onclick="window.quizzes.shareQuiz('${q.id}')">Поделиться</button>
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

function shareQuiz(id) {
    const url = `${location.origin}/index.html?id=${id}`;
    if (navigator.clipboard) { navigator.clipboard.writeText(url); }
    prompt('Ссылка на тест (скопирована):', url);
}

function editQuiz(id) {
    const q = quizzes.find(x=>x.id===id);
    if (q) openQuizModal(q);
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
                <label>Лимит попыток (0 = без лимита)</label>
                <input type="number" name="attempts_limit" value="${existing ? (existing.attempts_limit||0) : 1}" min="0">
            </div>
            <div class="form-group">
                <label>Лимит времени, сек (0 = без лимита)</label>
                <input type="number" name="time_limit" value="${existing ? (existing.time_limit||0) : 0}" min="0">
            </div>
            <div class="form-group">
                <label><input type="checkbox" name="show_answers" ${existing && existing.show_answers !== false ? 'checked' : 'checked'}> Показывать ответы</label>
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
            attempts_limit: Number(fd.get('attempts_limit')||0),
            time_limit: Number(fd.get('time_limit')||0),
            show_answers: fd.get('show_answers') === 'on',
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


function parseQuizImport(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Неверный JSON: ожидается объект');
    let quiz, questions;
    if (obj.quiz && typeof obj.quiz === 'object' && !Array.isArray(obj.quiz)) {
        quiz = obj.quiz;
        questions = obj.questions;
    } else {
        const { questions: qs, ...rest } = obj;
        quiz = rest;
        questions = qs;
    }
    if (!Array.isArray(questions)) throw new Error('Неверный формат: поле "questions" должно быть массивом');
    return { quiz, questions };
}

function toNumIndex(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && /^\s*-?\d+\s*$/.test(v)) return Number(v.trim());
    return NaN;
}

function validateQuizImport(data) {
    const errors = [];
    let quizIn, questionsIn;
    try {
        ({ quiz: quizIn, questions: questionsIn } = parseQuizImport(data));
    } catch (e) {
        return { ok: false, errors: [e.message], quiz: null, questions: null };
    }
    quizIn = quizIn || {};
    const title = (quizIn.title == null ? '' : String(quizIn.title)).trim();
    if (!title) errors.push('Отсутствует название теста (quiz.title)');
    const quiz = {
        title,
        description: quizIn.description == null ? '' : String(quizIn.description).trim(),
        active: quizIn.active === undefined ? false : Boolean(quizIn.active),
        attempts_limit: quizIn.attempts_limit === undefined ? 1 : Number(quizIn.attempts_limit),
        time_limit: quizIn.time_limit === undefined ? 0 : Number(quizIn.time_limit),
        show_answers: quizIn.show_answers === undefined ? true : Boolean(quizIn.show_answers),
    };

    const normalizedQs = [];
    const skipped = [];
    (questionsIn || []).forEach((q, idx) => {
        const n = idx + 1;
        const qErrors = [];
        const log = (msg) => console.log(`[Import][Вопрос ${n}] ${msg}`);

        if (!q || typeof q !== 'object' || Array.isArray(q)) {
            errors.push(`Вопрос ${n}: должен быть объектом`);
            log('ОШИБКА: вопрос не является объектом, пропущен');
            skipped.push({ n, reason: 'не объект', raw: q });
            return;
        }
        log(`Исходные данные: type=${JSON.stringify(q.type)}, options_count=${Array.isArray(q.options) ? q.options.length : 'нет options'}, correct_answer=${JSON.stringify(q.correct_answer)}`);

        const text = (q.text == null ? '' : String(q.text)).trim();
        if (!text) { errors.push(`Вопрос ${n}: отсутствует текст (text)`); qErrors.push('отсутствует text'); log('ОШИБКА: нет текста'); }
        const type = String(q.type || '').trim();
        if (!['single','multiple','text'].includes(type)) { errors.push(`Вопрос ${n}: неверный тип (type)`); qErrors.push(`неверный тип "${type}"`); log(`ОШИБКА: неверный тип "${type}"`); }

        let options = [];
        if (q.options !== undefined && q.options !== null) {
            if (!Array.isArray(q.options)) { errors.push(`Вопрос ${n}: options должен быть массивом`); qErrors.push('options не массив'); log(`ОШИБКА: options не массив (${typeof q.options})`); }
            else {
                options = q.options.map((o, i) => {
                    const s = (o == null ? '' : String(o).trim());
                    if (!s) log(`ПРЕДУПРЕЖДЕНИЕ: вариант #${i} пустой, будет удалён`);
                    return s;
                }).filter(o => o);
                log(`Распаршено ${options.length} непустых вариантов из ${q.options.length}`);
            }
        } else {
            log('ПРЕДУПРЕЖДЕНИЕ: поле options отсутствует');
        }

        let correct_answer;
        if (type === 'single' || type === 'multiple') {
            if (options.length === 0) { errors.push(`Вопрос ${n}: нужны непустые варианты (options)`); qErrors.push('нет вариантов'); log('ОШИБКА: нет вариантов для single/multiple'); }
        }
        if (type === 'single') {
            const ci = toNumIndex(q.correct_answer);
            log(`single: correct_answer="${q.correct_answer}" -> индекс ${ci}, диапазон 0..${options.length - 1}`);
            if (!Number.isInteger(ci) || ci < 0 || ci >= options.length) { errors.push(`Вопрос ${n}: correct_answer вне диапазона`); qErrors.push('correct_answer вне диапазона'); log(`ОШИБКА: индекс ${ci} вне диапазона 0..${options.length - 1}`); }
            else correct_answer = String(ci);
        } else if (type === 'multiple') {
            let arr = q.correct_answer;
            if (typeof arr === 'string') {
                log(`multiple: correct_answer строка "${arr}", пробуем JSON.parse`);
                try { arr = JSON.parse(arr); } catch { errors.push(`Вопрос ${n}: correct_answer не JSON`); qErrors.push('correct_answer не JSON'); log('ОШИБКА: не удалось распарсить JSON'); arr = null; }
            }
            if (!Array.isArray(arr)) { if (!errors.some(e=>e.startsWith(`Вопрос ${n}: correct_answer`))) errors.push(`Вопрос ${n}: correct_answer должен быть массивом`); qErrors.push('correct_answer не массив'); log(`ОШИБКА: correct_answer не массив (${typeof arr})`); }
            else {
                const nums = arr.map(toNumIndex);
                log(`multiple: исходный массив ${JSON.stringify(arr)} -> числа ${JSON.stringify(nums)}, диапазон 0..${options.length - 1}`);
                if (nums.some(x => !Number.isInteger(x) || x < 0 || x >= options.length)) { errors.push(`Вопрос ${n}: correct_answer вне диапазона`); qErrors.push('correct_answer вне диапазона'); log(`ОШИБКА: правильные индексы вне диапазона`); }
                if (arr.length === 0) { errors.push(`Вопрос ${n}: выберите хотя бы один правильный вариант`); qErrors.push('нет правильных вариантов'); log('ОШИБКА: пустой список правильных ответов'); }
                if (!qErrors.some(e => e.includes('вне диапазона') || e.includes('нет правильных') || e.includes('не JSON') || e.includes('не массив'))) {
                    correct_answer = JSON.stringify(nums);
                    log(`УСПЕХ: multiple correct_answer=${correct_answer}`);
                }
            }
        } else if (type === 'text') {
            const ca = (q.correct_answer == null ? '' : String(q.correct_answer)).trim();
            log(`text: correct_answer="${ca}"`);
            if (!ca) { errors.push(`Вопрос ${n}: отсутствует correct_answer`); qErrors.push('нет correct_answer'); log('ОШИБКА: нет правильного ответа'); }
            else { correct_answer = ca; log(`УСПЕХ: text correct_answer="${correct_answer}"`); }
        }

        if (text && type && qErrors.length === 0) {
            normalizedQs.push({ text, type, options: (type==='text' ? (options.length?options:[]) : options), correct_answer });
            log(`Вопрос добавлен в список на импорт`);
        } else {
            skipped.push({ n, reason: qErrors.join('; '), raw: q });
            log(`Вопрос ПРОПУЩЕН по причинам: ${qErrors.join('; ')}`);
        }
    });

    // push normalized for questions without errors already? We push above only when no errors for that question.
    // But if some question had error, normalizedQs may be partial; still mark not ok.
    const ok = errors.length === 0;
    console.log(`[Import][Валидация] Всего вопросов: ${(questionsIn || []).length}, валидных: ${normalizedQs.length}, пропущено: ${skipped.length}, ошибок: ${errors.length}`);
    return { ok, errors, quiz, questions: ok ? normalizedQs : normalizedQs };
}

async function importQuizFromObject(data) {
    const v = validateQuizImport(data);
    if (!v.ok) {
        const err = new Error(v.errors.join('\n'));
        err.errors = v.errors;
        throw err;
    }
    const createdQuiz = await apiPost('/collections/quizzes/records', v.quiz);
    console.log('[Import] Тест создан:', createdQuiz.id, createdQuiz.title);
    const total = v.questions.length;
    let createdCount = 0;
    const failed = [];
    console.log(`[Import] Начинаем импорт ${total} вопросов...`);
    for (let i = 0; i < v.questions.length; i++) {
        const q = v.questions[i];
        console.log(`[Import] Отправка вопроса #${i + 1}:`, JSON.stringify(q));
        try {
            await apiPost('/collections/questions/records', { quiz_id: createdQuiz.id, text: q.text, type: q.type, options: q.options, correct_answer: q.correct_answer });
            createdCount++;
            console.log(`[Import] Вопрос #${i + 1} успешно создан`);
        } catch (e) {
            console.error(`[Import] ОШИБКА при создании вопроса #${i + 1}:`, e.message || e, 'Данные:', JSON.stringify(q));
            failed.push({ index: i + 1, message: e.message || String(e) });
        }
    }
    console.log(`[Import] Импорт завершён: ${createdCount}/${total} вопросов, ${failed.length} ошибок`);
    return { quiz: createdQuiz, total, createdCount, failed };
}

async function handleImportFile(file) {
    if (!file) return;
    const btn = document.getElementById('btn-import-quiz');
    if (btn) btn.disabled = true;
    const input = document.getElementById('import-quiz-file');
    try {
        const text = await file.text();
        let obj;
        try { obj = JSON.parse(text); } catch { throw new Error('Неверный JSON: не удалось разобрать файл'); }
        const res = await importQuizFromObject(obj);
        console.log('[Import] РЕЗУЛЬТАТ:', JSON.stringify(res));
        if (res.failed.length === 0) {
            alert(`Импортирован тест «${res.quiz.title}»: ${res.createdCount} вопросов`);
        } else {
            const errs = res.failed.map(f => `#${f.index}: ${f.message}`).join('\n');
            alert(`Создан тест «${res.quiz.title}» (id ${res.quiz.id}). Сохранено ${res.createdCount} из ${res.total} вопросов. Ошибки:\n${errs}`);
        }
        await loadQuizzes();
        renderQuizzes();
        if (window.questions && window.questions.loadQuizSelect) window.questions.loadQuizSelect();
    } catch (e) {
        alert(e.message || 'Ошибка импорта');
    } finally {
        if (input) input.value = '';
        if (btn) btn.disabled = false;
    }
}

function bindImport() {
    const btn = document.getElementById('btn-import-quiz');
    const input = document.getElementById('import-quiz-file');
    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => input && input.click());
    }
    if (input && !input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('change', (e) => handleImportFile(e.target.files && e.target.files[0]));
    }
}

// bind on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindImport);
} else {
    bindImport();
}

window.quizzes = {
    loadQuizzes,
    renderQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    editQuiz,
    shareQuiz,
    openQuizModal,
    getQuizzes: () => quizzes,
    parseQuizImport,
    validateQuizImport,
    importQuizFromObject,
    handleImportFile,
    bindImport,
};
