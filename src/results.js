// results.js — Calcul des résultats et affichage de la correction

let reviewOpen = false;

function submitExam(timeout) {
  examFinished = true;
  stopTimer();

  // Calculer le score global et par thème
  let score = 0;
  const themeScores = {};
  THEMES.forEach(t => { themeScores[t.id] = { correct: 0, total: 0 }; });

  allQuestions.forEach((q, i) => {
    const tid = q.theme || 'valeurs';
    if (!themeScores[tid]) themeScores[tid] = { correct: 0, total: 0 };
    themeScores[tid].total++;
    if (userAnswers[i] === Number(q.answer)) {
      score++;
      themeScores[tid].correct++;
    }
  });

  const total      = allQuestions.length;
  const pct        = Math.round(score / total * 100);
  const reussi     = pct >= 80;
  const seuilCount = Math.ceil(total * 0.8); // nb de bonnes réponses pour valider (80%)

  // Masquer l'interface examen
  document.getElementById('examHeader').style.display  = 'none';
  document.getElementById('questionNav').style.display = 'none';
  document.getElementById('quizCard').style.display    = 'none';
  // Masquer les autres écrans
  ['screenHome','screenLoading','screenError','screenThemeSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  reviewOpen = false;
  document.getElementById('reviewSection').style.display = 'none';
  document.getElementById('btnReview').textContent = '📋 Corriger';

  // Afficher résultats
  document.getElementById('screenResult').style.display = 'block';

  // Badge
  const badge = document.getElementById('resultBadge');
  badge.textContent = reussi ? '✓ ADMIS' : '✗ AJOURNÉ';
  badge.className = 'result-badge ' + (reussi ? 'reussi' : 'echec');

  // Score
  document.getElementById('scoreBig').textContent    = score;
  document.getElementById('scoreBig').className      = 'score-big ' + (reussi ? 'reussi' : 'echec');
  document.getElementById('scoreFraction').textContent = `${score} / ${total}`;
  document.getElementById('scorePct').textContent    = `${pct}%`;

  // Verdict
  const manque = Math.max(0, seuilCount - score);
  let verdict, msg;
  if (timeout) {
    verdict = 'Temps écoulé !';
    msg = reussi
      ? `Malgré le temps écoulé, tu obtiens ${pct}% et passes le seuil de 80%. Bravo !`
      : `Temps écoulé. Tu obtiens ${pct}% — il manque ${manque} bonne(s) réponse(s) pour valider.`;
  } else if (reussi) {
    verdict = 'Félicitations !';
    msg = `Tu obtiens ${pct}% et dépasses le seuil de 80%.`
        + (examMode === 'simulateur' ? ' Tu es prêt pour l\'examen réel.' : '');
  } else {
    verdict = 'Objectif non atteint';
    msg = `Tu obtiens ${pct}% — il te manque ${manque} bonne(s) réponse(s). Travaille les thèmes faibles et recommence.`;
  }
  document.getElementById('resultVerdict').textContent = verdict;
  document.getElementById('resultMsg').textContent     = msg;

  // Seuil : affiché pour l'examen et la révision (sur 40), masqué en quiz par thème
  const seuilEl = document.querySelector('.score-seuil');
  if (seuilEl) {
    if (examMode === 'theme') {
      seuilEl.style.display = 'none';
    } else {
      seuilEl.style.display = '';
      seuilEl.textContent = `Seuil requis : 80% (${seuilCount}/${total})`;
    }
  }

  // Stats thèmes
  renderThemeStats(themeScores);

  // Enregistrer le score dans l'historique de session (5 derniers)
  pushHistory({ label: historyLabel(), score, total, pct, reussi });

  // Préparer correction (pré-calculée)
  buildReview(score);
}

// Libellé du mode courant pour l'historique
function historyLabel() {
  if (examMode === 'simulateur') return 'Examen blanc';
  if (examMode === 'revision')   return 'Révision libre';
  const t = THEMES.find(t => t.id === (allQuestions[0] || {}).theme);
  return 'Thème · ' + (t ? t.label : 'révision');
}

function renderThemeStats(themeScores) {
  const container = document.getElementById('themeStats');
  container.innerHTML = '';

  THEMES.forEach(t => {
    const ts = themeScores[t.id];
    if (!ts || ts.total === 0) return;
    const tpct = Math.round(ts.correct / ts.total * 100);
    const color = tpct >= 80 ? '#22c55e' : '#ED2939';
    const textColor = tpct >= 80 ? '#86efac' : '#fca5a5';

    const row = document.createElement('div');
    row.className = 'theme-row';
    row.innerHTML = `
      <div class="theme-row-name">${t.icon} ${t.label}</div>
      <div class="theme-row-bar-bg">
        <div class="theme-row-bar-fill" style="width:0%;background:${color}" data-target="${tpct}"></div>
      </div>
      <div class="theme-row-score" style="color:${textColor}">${ts.correct}/${ts.total}</div>`;
    container.appendChild(row);
  });

  // Animer les barres après le rendu
  setTimeout(() => {
    container.querySelectorAll('.theme-row-bar-fill').forEach(el => {
      el.style.width = el.dataset.target + '%';
    });
  }, 100);
}

function buildReview(score) {
  const container = document.getElementById('reviewItems');
  container.innerHTML = '';

  const errors = allQuestions
    .map((q, i) => ({ q, i, userAns: userAnswers[i] }))
    .filter(({ q, i }) => userAnswers[i] !== Number(q.answer));

  if (errors.length === 0) {
    container.innerHTML = '<div style="color:#86efac;font-size:0.88rem;text-align:center;padding:20px">🎉 Aucune erreur — résultat parfait !</div>';
    return;
  }

  errors.forEach(({ q, i, userAns }) => {
    const correct = Number(q.answer);
    const item = document.createElement('div');
    item.className = 'review-item';

    const optsHtml = (q.options || []).map((opt, oi) => {
      let cls = 'neutral';
      let prefix = '';
      if (oi === correct) { cls = 'correct'; prefix = '✓ '; }
      else if (oi === userAns) { cls = 'wrong'; prefix = '✗ '; }
      return `<div class="review-opt ${cls}">${prefix}${opt}</div>`;
    }).join('');

    item.innerHTML = `
      <div class="review-q"><strong>Q${i + 1}.</strong> ${q.q}</div>
      <div class="review-answers">${optsHtml}</div>
      ${q.explication ? `<div class="review-expl">${q.explication}</div>` : ''}`;
    container.appendChild(item);
  });
}

function toggleReview() {
  reviewOpen = !reviewOpen;
  document.getElementById('reviewSection').style.display = reviewOpen ? 'block' : 'none';
  document.getElementById('btnReview').textContent = reviewOpen ? '▲ Masquer' : '📋 Corriger';
}
