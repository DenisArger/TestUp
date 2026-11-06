const params = new URLSearchParams(location.search);
const quizId = params.get("id");
let quiz = null,
  questions = [],
  answers = {},
  idx = 0,
  startedAt = null,
  timerId = null,
  timeLeft = 0;

function show(id) {
  document
    .querySelectorAll(".container > div")
    .forEach((d) => d.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

async function init() {
  try {
    quiz = await apiGet(`/collections/quizzes/records/${quizId}`);
    if (!quiz.active) {
      document.getElementById("screen-loading").textContent = "Тест недоступен";
      return;
    }
    const qRes = await apiGet(
      `/collections/questions/records?filter=quiz_id="${quizId}"&perPage=200`,
    );
    questions = qRes.items || [];
    document.getElementById("quiz-title").textContent = quiz.title;
    document.getElementById("quiz-desc").textContent = quiz.description || "";
    document.getElementById("name-label").textContent = "Введите имя и фамилию";
    show("screen-name");
  } catch (e) {
    document.getElementById("screen-loading").textContent = e.message;
  }
}

document.getElementById("start-btn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  if (!name) return;
  const limit = quiz.attempts_limit || 0;
  if (limit > 0) {
    const aRes = await apiGet(
      `/collections/attempts/records?filter=quiz_id="${quizId}" && respondent_name="${name}"`,
    );
    if ((aRes.totalItems || 0) >= limit) {
      const m = document.getElementById("limit-msg");
      m.textContent = "Лимит попыток исчерпан";
      m.classList.remove("hidden");
      return;
    }
  }
  startedAt = new Date().toISOString();
  idx = 0;
  answers = {};
  timeLeft = quiz.time_limit || 0;
  show("screen-quiz");
  renderQuestion();
  if (timeLeft > 0) startTimer();
});

function renderQuestion() {
  const q = questions[idx];
  const el = document.getElementById("question");
  const progressEl = document.getElementById("progress");
  if (progressEl) {
    progressEl.textContent = `Вопрос ${idx + 1} из ${questions.length} • Пройдено: ${idx}, осталось: ${questions.length - idx - 1}`;
  }
  let html = `<h2>${q.text}</h2>`;
  if (q.type === "text") {
    html += `<textarea id="ans" rows="3">${answers[q.id] || ""}</textarea>`;
  } else {
    const opts = q.options || [];
    opts.forEach((o, i) => {
      const checked =
        q.type === "single"
          ? answers[q.id] === i
          : (answers[q.id] || []).includes(i);
      html += `<label class="option"><input type="${q.type === "single" ? "radio" : "checkbox"}" name="q" value="${i}" ${checked ? "checked" : ""}> ${o}</label>`;
    });
  }
  el.innerHTML = html;
  document.getElementById("next-btn").textContent =
    idx < questions.length - 1 ? "Далее" : "Отправить";
}

document.getElementById("next-btn").addEventListener("click", () => {
  const q = questions[idx];
  if (q.type === "text") {
    const v = document.getElementById("ans").value.trim();
    if (!v) {
      alert("Ответ обязателен");
      return;
    }
    answers[q.id] = v;
  } else {
    const checked = [
      ...document.querySelectorAll('input[name="q"]:checked'),
    ].map((x) => +x.value);
    if (q.type === "single") {
      if (!checked.length) {
        alert("Выберите ответ");
        return;
      }
      answers[q.id] = checked[0];
    } else {
      if (!checked.length) {
        alert("Выберите ответ");
        return;
      }
      answers[q.id] = checked;
    }
  }
  if (idx < questions.length - 1) {
    idx++;
    renderQuestion();
  } else submit();
});

function startTimer() {
  const t = document.getElementById("timer");
  timerId = setInterval(() => {
    timeLeft--;
    t.textContent = `Осталось: ${timeLeft} сек`;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      t.textContent = "Время вышло";
      submit();
    }
  }, 1000);
  t.textContent = `Осталось: ${timeLeft} сек`;
}

async function submit() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  const name = document.getElementById("name").value.trim();
  let score = 0;
  questions.forEach((q) => {
    const ua = answers[q.id];
    let correct = false;
    if (q.type === "text") {
      correct =
        String(ua || "")
          .trim()
          .toLowerCase() ===
        String(q.correct_answer || "")
          .trim()
          .toLowerCase();
    } else if (q.type === "single") {
      correct = String(ua) === String(q.correct_answer);
    } else {
      const uaArr = (ua || []).slice().sort().join(",");
      const caArr = (Array.isArray(q.correct_answer) ? q.correct_answer : [])
        .slice()
        .sort()
        .join(",");
      correct = uaArr === caArr;
    }
    if (correct) score++;
  });
  const finishedAt = new Date().toISOString();
  try {
    await apiPost("/collections/attempts/records", {
      quiz_id: quizId,
      respondent_name: name,
      score,
      total: questions.length,
      started_at: startedAt,
      finished_at: finishedAt,
    });
  } catch (e) {
    console.error(e);
  }
  showResult(score);
}

function showResult(score) {
  show("screen-result");
  document.getElementById("score").textContent =
    `${score} / ${questions.length} (${Math.round((score / questions.length) * 100)}%)`;
  const bd = document.getElementById("breakdown");
  bd.innerHTML = "";
  questions.forEach((q, i) => {
    const ua = answers[q.id];
    let correct = false;
    if (q.type === "text")
      correct =
        String(ua || "")
          .trim()
          .toLowerCase() ===
        String(q.correct_answer || "")
          .trim()
          .toLowerCase();
    else if (q.type === "single")
      correct = String(ua) === String(q.correct_answer);
    else {
      correct =
        (ua || []).slice().sort().join(",") ===
        (Array.isArray(q.correct_answer) ? q.correct_answer : [])
          .slice()
          .sort()
          .join(",");
    }
    const div = document.createElement("div");
    div.className = "result-item " + (correct ? "correct" : "wrong");
    let extra = "";
    if (quiz.show_answers !== false) {
      if (q.type === "text") extra = ` (правильный: ${q.correct_answer})`;
      else if (Array.isArray(q.options))
        extra = ` (правильный: ${(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).map((i) => q.options[i]).join(", ")})`;
    }
    div.textContent = `${i + 1}. ${q.text} — ${correct ? "верно" : "неверно"}${extra}`;
    bd.appendChild(div);
  });
  bd.classList.remove("hidden");
}

init();
