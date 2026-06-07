# CLAUDE.md — Simulateur Examen Civique

## Contexte du projet
Application HTML/CSS/JS **standalone** (un seul fichier, zéro dépendance externe sauf Google Fonts) 
pour préparer l'examen civique requis pour la **carte de résident 10 ans** en France.

L'examen officiel : 40 QCM · 45 minutes · seuil de réussite 80% (32/40 bonnes réponses).
Programme officiel : décret 2025-647, arrêté du 10 octobre 2025.

---

## Objectif
Générer `dist/simulateur.html` — un fichier HTML complet qui fonctionne en local (double-clic).

---

## Architecture

```
quiz-civique/
├── CLAUDE.md              ← ce fichier (instructions Claude Code)
├── TASKS.md               ← tâches à compléter
├── data/
│   ├── questions.json     ← banque de questions statiques (fallback)
│   └── themes.json        ← définition des 5 thèmes
├── src/
│   ├── index.html         ← skeleton HTML
│   ├── styles.css         ← styles complets
│   ├── quiz.js            ← logique quiz (chargement questions, navigation)
│   ├── timer.js           ← chronomètre 45 min
│   ├── results.js         ← calcul score, stats par thème, correction
│   └── api.js             ← appel API Anthropic (génération dynamique)
├── docs/
│   ├── SPEC.md            ← spécification fonctionnelle complète
│   └── PROGRAMME.md       ← programme officiel de l'examen
└── dist/
    └── simulateur.html    ← OUTPUT FINAL (tout inline)
```

---

## Instructions de build

Pour générer `dist/simulateur.html`, inliner tous les fichiers src/ :
1. Lire `src/styles.css` → insérer dans `<style>`
2. Lire `src/quiz.js` + `src/timer.js` + `src/results.js` + `src/api.js` → insérer dans `<script>`
3. Lire `data/questions.json` → injecter comme variable JS `window.QUESTIONS_FALLBACK`
4. Écrire le tout dans `dist/simulateur.html`

---

## Règles techniques ABSOLUES

- **Zéro framework** : HTML/CSS/JS vanilla uniquement
- **Zéro localStorage / sessionStorage** : état en mémoire JS uniquement
- **Un seul fichier de sortie** : `dist/simulateur.html` tout inline
- **Google Fonts autorisé** via `@import url(...)` dans le CSS
- **API Anthropic** : endpoint `https://api.anthropic.com/v1/messages`, modèle `claude-sonnet-4-20250514`, pas de clé API dans le code (injectée au runtime par le proxy claude.ai)
- Fallback offline : si l'API échoue → charger `window.QUESTIONS_FALLBACK` depuis `data/questions.json`
- Compatible mobile (viewport 380px min)

---

## Design system

Couleurs :
```
--bleu:  #002395   (bleu France)
--rouge: #ED2939   (rouge France)
--or:    #C8A951   (accent doré)
--fond:  #0e0e1a   (fond sombre)
--blanc: #F8F6F0   (texte principal)
--vert:  #22c55e   (succès)
```

Typographie :
- Titres : `Playfair Display` (700/900), importée via Google Fonts
- Corps : `Source Sans 3` (400/600), importée via Google Fonts

Composants :
- Cards avec `background: rgba(255,255,255,0.04)` + `border: 1px solid rgba(255,255,255,0.1)`
- Border-radius : 16px cards, 10px boutons, 99px badges
- Animations : `fadeDown`, `slideUp`, `fadeIn`, `spin`, `pulse` (voir styles.css)

---

## Fonctionnalités requises

### Mode Simulateur (principal)
- [ ] Génération de 40 questions via API (8 par thème)
- [ ] Chrono 45 min avec alertes couleur (orange <5min, rouge <2min, pulse)
- [ ] Navigation libre entre questions (grille de points cliquables)
- [ ] Sélection de réponse (pas de correction immédiate)
- [ ] Bouton "Terminer" avec confirmation si questions non répondues
- [ ] Fin automatique à 00:00

### Résultats
- [ ] Verdict ADMIS (≥80%) / AJOURNÉ (<80%) en grand
- [ ] Score / 40 + pourcentage
- [ ] Barre de progression par thème (5 barres colorées)
- [ ] Correction détaillée des erreurs (question + bonne réponse + explication)
- [ ] Bouton "Nouvel examen" (régénère via API)

### Mode Quiz par thème (secondaire)
- [ ] Sélection du thème
- [ ] 10 questions sur le thème choisi
- [ ] Correction immédiate après chaque réponse
- [ ] Score final avec encouragement

### Chargement
- [ ] Écran de chargement avec spinner + barre de progression
- [ ] Message d'étape ("Génération des questions…", "Presque prêt…")
- [ ] Fallback offline si API inaccessible

---

## Format JSON des questions

```json
{
  "q": "Quelle est la devise de la République française ?",
  "options": ["Unité, Travail, Progrès", "Liberté, Égalité, Fraternité", "Ordre et Progrès", "Honneur, Patrie, Valeur"],
  "answer": 1,
  "theme": "valeurs",
  "explication": "La devise Liberté, Égalité, Fraternité est inscrite dans la Constitution de 1958 et remonte à la Révolution française."
}
```

Champs :
- `q` : texte de la question
- `options` : tableau de 4 choix (strings)
- `answer` : index 0-3 de la bonne réponse
- `theme` : `"valeurs"` | `"institutions"` | `"droits"` | `"histoire"` | `"societe"`
- `explication` : texte court (2 phrases max)

---

## Prompt système API (à utiliser dans api.js)

```
Tu es un expert de l'examen civique français (décret 2025-647, arrêté 10 octobre 2025).
Génère exactement 40 questions QCM pour simuler l'examen civique carte de résident.
Répartition : 8 questions par thème dans cet ordre :
1. valeurs — Valeurs et principes de la République (devise, laïcité, symboles, DDHC)
2. institutions — Système institutionnel et politique (Président, Parlement, collectivités, UE)
3. droits — Droits et devoirs du citoyen (droits fondamentaux, vote, travail, protection sociale)
4. histoire — Histoire, géographie et culture (dates clés, personnages, régions, patrimoine)
5. societe — Vivre dans la société française (école, famille, santé, logement, intégration)

Format JSON strict, tableau de 40 objets :
{"q":"...","options":["A","B","C","D"],"answer":INDEX_0_3,"theme":"valeurs|institutions|droits|histoire|societe","explication":"..."}

Règles :
- answer = index 0-3 de la bonne réponse dans options
- Questions variées, niveau carte de résident, réalistes
- Explications courtes et pédagogiques (2 phrases max)
- UNIQUEMENT le tableau JSON, aucun texte autour, aucune balise markdown
```

---

## Débogage fréquent

| Problème | Cause probable | Solution |
|---|---|---|
| Quiz ne démarre pas | JSON mal parsé | Utiliser regex `\[[\s\S]*\]` pour extraire le JSON |
| `answer` incorrect | API renvoie string "1" au lieu de int 1 | `Number(q.answer)` à chaque comparaison |
| Options vides | `q.options` undefined | Guard `(q.options \|\| [])` |
| Chrono ne s'arrête pas | `clearInterval` oublié | Appeler `clearInterval(timerInterval)` dans `submitExam()` |
| Animations cassées | Animation déjà jouée | Reset `el.style.animation = 'none'` puis setTimeout |
