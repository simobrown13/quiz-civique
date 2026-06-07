// timer.js — Chronomètre examen (45 minutes)

const EXAM_DURATION = 45 * 60; // secondes

let timerInterval = null;
let secondsLeft = EXAM_DURATION;

function startTimer() {
  secondsLeft = EXAM_DURATION;
  updateChrono();
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateChrono();
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      submitExam(true); // fin automatique
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateChrono() {
  const el = document.getElementById('chrono');
  if (!el) return;

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // Couleur selon temps restant
  if (secondsLeft <= 120) {
    el.className = 'chrono danger';  // rouge + pulse < 2 min
  } else if (secondsLeft <= 300) {
    el.className = 'chrono warning'; // orange < 5 min
  } else {
    el.className = 'chrono';         // blanc normal
  }
}

function getElapsedTime() {
  return EXAM_DURATION - secondsLeft;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${String(s).padStart(2, '0')}s`;
}
