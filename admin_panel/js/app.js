window.app = {
    init: async function () {
        if (!window.auth.isLoggedIn()) return;
        await window.quizzes.loadQuizzes();
        window.quizzes.renderQuizzes();
        window.questions.loadQuizSelect();
        window.attempts.loadAttemptQuizSelect();
        await window.attempts.loadAttempts(null);
        window.attempts.renderAttempts();
        this.bindNav();
        this.bindAdd();
        if (window.quizzes.bindImport) window.quizzes.bindImport();
    },

    showTab: async function (tab) {
        document.querySelectorAll('.tab-view').forEach(v => v.style.display = 'none');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const view = document.getElementById(`${tab}-view`);
        const btn = document.querySelector(`.nav-item[data-tab="${tab}"]`);
        if (view) view.style.display = 'block';
        if (btn) btn.classList.add('active');

        const title = document.getElementById('page-title');
        const labels = { quizzes: 'Тесты', questions: 'Вопросы', attempts: 'Результаты' };
        if (title) title.textContent = labels[tab] || tab;

        const btnImport = document.getElementById('btn-import-quiz');
        if (btnImport) btnImport.style.display = (tab === 'quizzes') ? 'inline-block' : 'none';
        if (tab === 'quizzes') {
            btnAdd.style.display = 'inline-block';
            btnAdd.textContent = '+ Добавить тест';
            btnAdd.onclick = () => window.quizzes.openQuizModal(null);
        } else if (tab === 'questions') {
            btnAdd.style.display = 'inline-block';
            btnAdd.textContent = '+ Добавить вопрос';
            const select = document.getElementById('quiz-select');
            btnAdd.onclick = () => {
                const id = select.value;
                if (!id) { alert('Выберите тест'); return; }
                window.questions.addQuestion(id);
            };
        } else {
            btnAdd.style.display = 'none';
        }

        if (tab === 'questions') {
            window.questions.loadQuizSelect();
            const select = document.getElementById('quiz-select');
            select.onchange = async () => {
                const id = select.value;
                document.getElementById('questions-empty').style.display = id ? 'none' : 'block';
                document.querySelector('#questions-view table').style.display = id ? 'table' : 'none';
                if (!id) return;
                await window.questions.loadQuestions(id);
                window.questions.renderQuestions();
            };
        }

        if (tab === 'attempts') {
            const select = document.getElementById('attempt-quiz-select');
            select.onchange = async () => {
                const id = select.value;
                await window.attempts.loadAttempts(id || null);
                window.attempts.renderAttempts();
            };
            await window.attempts.loadAttempts(null);
            window.attempts.renderAttempts();
            window.attempts.loadAttemptQuizSelect();
        }
    },

    bindNav: function () {
        document.querySelectorAll('.nav-item').forEach(n => {
            n.addEventListener('click', () => this.showTab(n.dataset.tab));
        });
    },

    bindAdd: function () {
        const btn = document.getElementById('btn-add');
        if (btn) btn.onclick = () => window.quizzes.openQuizModal(null);
    },
};
