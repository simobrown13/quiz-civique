// quiz.js — Logique principale du quiz

// ===== ÉTAT GLOBAL =====
// Repli codé en dur si window.THEMES_DATA (data/themes.json) n'est pas injecté.
const THEMES_FALLBACK = [
  { id: 'valeurs',      label: 'Valeurs de la République', color: '#4f8ef7', icon: '🏛️' },
  { id: 'institutions', label: 'Institutions & Politique', color: '#a78bfa', icon: '⚖️' },
  { id: 'droits',       label: 'Droits & Devoirs',         color: '#34d399', icon: '📜' },
  { id: 'histoire',     label: 'Histoire & Géographie',    color: '#f59e0b', icon: '🗺️' },
  { id: 'societe',      label: 'Vivre en société',         color: '#f472b6', icon: '🤝' },
];

const THEMES = (window.THEMES_DATA && window.THEMES_DATA.length)
  ? window.THEMES_DATA.map(t => ({ id: t.id, label: t.label, color: t.color, icon: t.icon }))
  : THEMES_FALLBACK;

let allQuestions  = [];
let userAnswers   = [];
let current       = 0;
let examMode      = 'simulateur'; // 'simulateur' | 'theme' | 'revision'
let navVisible    = false;
let examFinished  = false;
let scoreHistory  = []; // 5 derniers scores (mémoire de session uniquement)

// Modes à correction immédiate (réponse révélée dès la sélection, sans chrono)
function isImmediateMode() { return examMode === 'theme' || examMode === 'revision'; }

// ===== THÈME CLAIR / SOMBRE (état en mémoire de session) =====
// Initialisé depuis la préférence système ; bascule manuelle sans persistance.
let currentTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
  ? 'light' : 'dark';

function applyTheme(mode) {
  currentTheme = mode;
  document.documentElement.setAttribute('data-theme', mode);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = (mode === 'light') ? '🌙' : '☀️';
    btn.setAttribute('aria-label', mode === 'light' ? 'Passer en thème sombre' : 'Passer en thème clair');
  }
}

function toggleTheme() {
  applyTheme(currentTheme === 'light' ? 'dark' : 'light');
}

applyTheme(currentTheme); // applique le thème initial dès le chargement du script

// ===== NAVIGATION ÉCRANS =====
function showScreen(id) {
  const screens = ['screenHome','screenLoading','screenError','screenThemeSelect','screenResult'];
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === id) ? 'block' : 'none';
  });
  // Header examen + nav : afficher seulement pendant le quiz
  const inQuiz = (id === null); // null = mode quiz actif
  document.getElementById('examHeader').style.display  = inQuiz ? 'block' : 'none';
  document.getElementById('questionNav').style.display = inQuiz ? 'block' : 'none';
  const card = document.getElementById('quizCard');
  if (card) card.style.display = inQuiz ? 'block' : 'none';
}

function showHome() {
  stopTimer();
  renderHistory();
  showScreen('screenHome');
}

// ===== HISTORIQUE DES SCORES (session) =====
function pushHistory(rec) {
  scoreHistory.unshift(rec);
  scoreHistory = scoreHistory.slice(0, 5);
}

function renderHistory() {
  const box = document.getElementById('historyBox');
  if (!box) return;
  if (scoreHistory.length === 0) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  const rows = scoreHistory.map(h => {
    const cls = h.reussi ? 'hist-ok' : 'hist-ko';
    return `<div class="hist-row">
      <span class="hist-mode">${h.label}</span>
      <span class="hist-score ${cls}">${h.score}/${h.total} · ${h.pct}%</span>
    </div>`;
  }).join('');
  box.innerHTML = `<div class="hist-title">Vos derniers scores</div>${rows}`;
  box.style.display = 'block';
}

function showThemeSelect() {
  buildThemeCards();
  showScreen('screenThemeSelect');
}

function setLoading(title, text) {
  document.getElementById('loaderTitle').textContent = title;
  document.getElementById('loaderText').textContent  = text;
  setLoaderStep('Initialisation…');
  setLoaderBar(0);
  showScreen('screenLoading');
}

function setLoaderStep(t)  { document.getElementById('loaderStep').textContent = t; }
function setLoaderBar(pct) { document.getElementById('loaderBar').style.width = pct + '%'; }

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showScreen('screenError');
}

// ===== THEME CARDS =====
function themeQuestionCount(themeId) {
  return (window.QUESTIONS_FALLBACK || []).filter(q => q.theme === themeId).length;
}

function buildThemeCards() {
  const container = document.getElementById('themeCards');
  container.innerHTML = '';
  THEMES.forEach(t => {
    const count = themeQuestionCount(t.id);
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.innerHTML = `
      <div class="theme-card-icon">${t.icon}</div>
      <div class="theme-card-info">
        <div class="theme-card-name" style="color:${t.color}">${t.label}</div>
        <div class="theme-card-desc">${count} questions · Correction immédiate</div>
      </div>
      <div style="color:#555;font-size:0.8rem">→</div>`;
    card.onclick = () => startThemeQuiz(t);
    container.appendChild(card);
  });
}

// ===== DÉMARRAGE =====
async function startSimulator() {
  examMode = 'simulateur';
  examFinished = false;
  setLoading('Préparation de l\'examen…', '40 questions · 5 thèmes · 45 minutes');

  try {
    const questions = await generateExamQuestions((step, pct) => {
      setLoaderStep(step);
      setLoaderBar(pct);
    });
    setLoaderBar(100);
    setLoaderStep('✓ Prêt — Bonne chance !');
    await new Promise(r => setTimeout(r, 600));

    allQuestions = questions;
    userAnswers  = new Array(allQuestions.length).fill(null);
    current      = 0;
    navVisible   = false;

    showScreen(null); // affiche header + nav + card
    buildNavGrid();
    startTimer();
    loadQuestion();

  } catch (err) {
    showError(err.message);
  }
}

async function startThemeQuiz(theme) {
  examMode = 'theme';
  examFinished = false;
  setLoading(`Révision — ${theme.label}`, `${themeQuestionCount(theme.id)} questions · Correction immédiate`);

  try {
    const questions = await generateThemeQuestions(theme.id, theme.label, (step, pct) => {
      setLoaderStep(step);
      setLoaderBar(pct);
    });
    setLoaderBar(100);
    setLoaderStep('✓ Questions prêtes !');
    await new Promise(r => setTimeout(r, 500));

    allQuestions = questions;
    userAnswers  = new Array(allQuestions.length).fill(null);
    current      = 0;

    // Quiz thème : pas de chrono ni de nav
    document.getElementById('examHeader').style.display  = 'none';
    document.getElementById('questionNav').style.display = 'none';
    document.getElementById('quizCard').style.display    = 'block';
    showScreen(null); // cache les autres écrans
    document.getElementById('examHeader').style.display  = 'none';
    document.getElementById('questionNav').style.display = 'none';

    loadQuestion();

  } catch (err) {
    showError(err.message);
  }
}

// ===== MODE RÉVISION (40 questions, correction immédiate, sans chrono) =====
async function startRevision() {
  examMode = 'revision';
  examFinished = false;
  setLoading('Mode révision', '40 questions · correction immédiate · sans chrono');

  try {
    const questions = await generateExamQuestions((step, pct) => {
      setLoaderStep(step);
      setLoaderBar(pct);
    });
    setLoaderBar(100);
    setLoaderStep('✓ Prêt — révise à ton rythme !');
    await new Promise(r => setTimeout(r, 500));

    allQuestions = questions;
    userAnswers  = new Array(allQuestions.length).fill(null);
    current      = 0;

    // Pas de chrono ni de nav : parcours linéaire avec correction immédiate
    showScreen(null);
    document.getElementById('examHeader').style.display  = 'none';
    document.getElementById('questionNav').style.display = 'none';
    loadQuestion();

  } catch (err) {
    showError(err.message);
  }
}

// ===== NAV GRID =====
function buildNavGrid() {
  const grid = document.getElementById('navGrid');
  grid.innerHTML = '';
  allQuestions.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'nav-dot' + (i === 0 ? ' current' : '');
    dot.id = `dot-${i}`;
    dot.textContent = i + 1;
    dot.onclick = () => goTo(i);
    grid.appendChild(dot);
  });
}

function updateNav() {
  allQuestions.forEach((_, i) => {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) return;
    let cls = 'nav-dot';
    if (i === current) cls += ' current';
    else if (userAnswers[i] !== null) cls += ' answered';
    dot.className = cls;
  });
}

function toggleNav() {
  navVisible = !navVisible;
  document.getElementById('navGrid').style.display = navVisible ? 'flex' : 'none';
  document.getElementById('navToggleBtn').textContent =
    (navVisible ? '▴' : '▾') + ' Navigation rapide';
}

function goTo(idx) {
  current = idx;
  animateCard(() => loadQuestion());
}

function animateCard(fn) {
  const card = document.getElementById('quizCard');
  card.style.animation = 'none';
  setTimeout(() => { card.style.animation = 'slideUp 0.32s ease both'; fn(); }, 10);
}

// ===== CHARGER UNE QUESTION =====
function loadQuestion() {
  if (current >= allQuestions.length) { showResult(); return; }
  const q = allQuestions[current];
  const theme = THEMES.find(t => t.id === q.theme) || THEMES[0];

  document.getElementById('qNumber').textContent = `Q${current + 1}`;
  document.getElementById('qTheme').textContent  = theme.label;
  document.getElementById('qTheme').style.color  = theme.color;
  document.getElementById('questionText').textContent = q.q;

  // Header examen
  if (examMode === 'simulateur') {
    document.getElementById('examProgress').textContent =
      `Question ${current + 1} / ${allQuestions.length}`;
    document.getElementById('barFill').style.width =
      ((current + 1) / allQuestions.length * 100) + '%';
    updateNav();
  }

  // Options
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';
  (q.options || []).forEach((opt, i) => {
    const btn = document.createElement('button');
    const isSel = userAnswers[current] === i;
    btn.className = 'option' + (isSel ? ' selected' : '');
    btn.textContent = opt;
    btn.id = `opt-${i}`;
    btn.onclick = () => selectOption(i);
    if (isImmediateMode() && userAnswers[current] !== null) {
      btn.disabled = true; // déjà répondu (correction immédiate)
      btn.className = 'option' +
        (i === Number(q.answer) ? ' correct' : (isSel ? ' wrong' : ''));
    }
    container.appendChild(btn);
  });

  // Explication (correction immédiate, si déjà répondu)
  const explEl = document.getElementById('explication');
  if (isImmediateMode() && userAnswers[current] !== null && q.explication) {
    explEl.textContent = q.explication;
    explEl.style.display = 'block';
  } else {
    explEl.style.display = 'none';
    explEl.textContent = '';
  }

  buildFooter();
}

// ===== SÉLECTIONNER UNE RÉPONSE =====
function selectOption(idx) {
  if (examMode === 'simulateur') {
    // Pas de correction immédiate
    userAnswers[current] = idx;
    document.querySelectorAll('.option').forEach((b, i) => {
      b.className = 'option' + (i === idx ? ' selected' : '');
    });
    updateNav();
    buildFooter();

  } else {
    // Correction immédiate (mode thème)
    if (userAnswers[current] !== null) return; // déjà répondu
    userAnswers[current] = idx;
    const correct = Number(allQuestions[current].answer);
    document.querySelectorAll('.option').forEach((b, i) => {
      b.disabled = true;
      if (i === correct) b.className = 'option correct';
      else if (i === idx && idx !== correct) b.className = 'option wrong';
      else b.className = 'option';
    });
    // Afficher explication
    const expl = allQuestions[current].explication;
    if (expl) {
      const explEl = document.getElementById('explication');
      explEl.textContent = expl;
      explEl.style.display = 'block';
    }
    buildFooter();
  }
}

// ===== FOOTER =====
function buildFooter() {
  const footer = document.getElementById('cardFooter');
  footer.innerHTML = '';
  const total    = allQuestions.length;
  const answered = userAnswers.filter(a => a !== null).length;

  // Précédent
  if (current > 0) {
    const prev = document.createElement('button');
    prev.className = 'btn btn-outline';
    prev.textContent = '← Précédent';
    prev.onclick = () => goTo(current - 1);
    footer.appendChild(prev);
  }

  if (examMode === 'simulateur') {
    // Suivant
    if (current < total - 1) {
      const next = document.createElement('button');
      next.className = 'btn btn-primary';
      next.textContent = 'Suivant →';
      next.onclick = () => goTo(current + 1);
      footer.appendChild(next);
    }
    // Terminer
    if (current === total - 1 || answered === total) {
      const sub = document.createElement('button');
      sub.className = 'btn btn-danger';
      sub.textContent = answered === total
        ? `Terminer l'examen (${answered}/${total})`
        : `Terminer (${answered}/${total} répondues)`;
      sub.onclick = () => {
        if (answered < total) {
          if (!confirm(`${total - answered} question(s) sans réponse. Terminer quand même ?`)) return;
        }
        submitExam(false);
      };
      footer.appendChild(sub);
    }

  } else {
    // Mode thème : Suivant / Terminer
    if (userAnswers[current] !== null) {
      if (current < total - 1) {
        const next = document.createElement('button');
        next.className = 'btn btn-primary';
        next.textContent = 'Question suivante →';
        next.onclick = () => animateCard(() => { current++; loadQuestion(); });
        footer.appendChild(next);
      } else {
        const fin = document.createElement('button');
        fin.className = 'btn btn-primary';
        fin.textContent = 'Voir mon score →';
        fin.onclick = () => submitExam(false);
        footer.appendChild(fin);
      }
    }
  }
}

function restart() {
  stopTimer();
  examFinished = false;
  navVisible   = false;
  renderHistory();
  showScreen('screenHome');
}
