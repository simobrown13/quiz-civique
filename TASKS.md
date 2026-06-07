# TASKS.md — Todo List Claude Code

## 🔴 Priorité haute (faire en premier)

- [x] **T1** — Créer `src/styles.css` complet (design system couleurs France, typo, composants card/button/option/badge/chrono/nav-dot/barre thème)
- [x] **T2** — Créer `src/index.html` skeleton (structure DOM complète : loading, examHeader, questionNav, quizCard, result, reviewSection)
- [x] **T3** — Créer `src/api.js` (fetch API Anthropic, extraction JSON robuste, fallback offline équilibré 8/thème, shuffle Fisher-Yates sans mutation)
- [x] **T4** — Créer `src/quiz.js` (loadQuestion, selectOption, goTo, buildNavGrid, updateNav, buildFooter ; THEMES dérivé de themes.json)
- [x] **T5** — Créer `src/timer.js` (startTimer, updateChrono, alertes couleur, fin automatique)
- [x] **T6** — Créer `src/results.js` (submitExam, calcul score, stats thèmes, buildReview, toggleReview)
- [x] **T7** — Créer `data/questions.json` avec 40 questions de fallback (offline) couvrant les 5 thèmes (8/thème)
- [x] **T8** — Build final : inliner tout dans `dist/simulateur.html`
- [x] **T9** — Tester en ouvrant `dist/simulateur.html` dans un navigateur (double-clic)

## 🟡 Priorité moyenne

- [x] **T10** — Ajouter mode Quiz par thème (écran de sélection + 10 questions + correction immédiate)
- [x] **T11** — Ajouter page d'accueil avec choix entre Simulateur et Quiz par thème
- [x] **T12** — Ajouter compteur "questions répondues / 40" visible en permanence
- [x] **T13** — Ajouter animation sur la barre de progression des thèmes (transition CSS)

## 🟢 Bonus

- [x] **T14** — Ajouter un historique des 5 derniers scores (stocké en variable JS de session, affiché sur l'accueil)
- [x] **T15** — Ajouter bouton pour passer en mode "révision" (40 questions, correction immédiate, sans chrono)
- [x] **T16** — Responsive : vérifier l'affichage mobile 380px (testé via captures headless Edge — 0 débordement sur accueil, carte question + grille nav, résultats)

---

## Ordre d'exécution recommandé

```
T7 (data) → T3 (api) → T1 (styles) → T2 (html) → T4 (quiz) → T5 (timer) → T6 (results) → T8 (build) → T9 (test)
```

## Commande de build

```bash
node build.js
# ou manuellement :
python3 build.py
```
