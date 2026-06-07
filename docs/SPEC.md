# SPEC.md — Spécification Fonctionnelle

## 1. Vue d'ensemble

**Nom** : Simulateur Examen Civique — Carte de Résident  
**Format** : Application HTML standalone (un seul fichier `.html`)  
**Public** : Personnes préparant l'examen civique pour la carte de résident 10 ans  
**Examen réel** : 40 QCM · 45 minutes · seuil 80% · centre agréé

---

## 2. Écrans et flux

```
[Accueil]
    ├── [Mode Simulateur] → [Chargement API] → [Examen 40Q/45min] → [Résultats]
    └── [Quiz par thème]  → [Choix thème]   → [Quiz 10Q]         → [Score thème]
```

---

## 3. Écran Accueil

- Logo drapeau tricolore animé
- Titre "Simulateur Examen Civique"
- Deux boutons :
  - **Simuler l'examen** (principal, bleu) → lance le simulateur
  - **Réviser par thème** (secondaire, outline) → lance le quiz thème
- Rappel : "40 questions · 45 min · Seuil 80%"

---

## 4. Mode Simulateur

### 4.1 Chargement
- Spinner animé (rotation bleu + rouge)
- Texte "Génération des questions…"
- Barre de progression 0→100%
- Messages d'étape textuels
- Si API OK : lancer l'examen
- Si API KO : charger `QUESTIONS_FALLBACK` (40 questions statiques)

### 4.2 Interface examen
**Header fixe** :
- Libellé "Examen Civique — Carte de Résident"
- Indicateur "Question X / 40"
- Chrono `MM:SS` (45:00 → 00:00)
  - Blanc > 5 min
  - Orange 5→2 min
  - Rouge + animation pulse < 2 min

**Navigation** :
- Lien "▾ Navigation rapide" → affiche/cache une grille de 40 points
- Chaque point = numéro de question, cliquable
- Couleur : gris = non répondu · bleu = répondu · blanc+gras = courant

**Card question** :
- Badge thème (couleur par thème)
- Texte question (Playfair Display)
- 4 boutons option (A/B/C/D)
  - Survol : fond légèrement plus clair + décalage 3px droite
  - Sélection : fond bleu foncé + bordure bleue (pas de correction immédiate)
- Footer : boutons Précédent / Suivant / Terminer

**Bouton Terminer** :
- Toujours visible sur la dernière question
- Visible aussi si toutes les questions sont répondues
- Label dynamique : "Terminer l'examen (40/40)" ou "Terminer (35/40 répondues)"
- Si < 40 répondues : `confirm()` avant soumission

### 4.3 Fin automatique
- Quand chrono atteint 00:00 → `submitExam(true)` avec mention "Temps écoulé"

---

## 5. Écran Résultats

### 5.1 Verdict
- Badge "✓ ADMIS" (vert, si ≥80%) ou "✗ AJOURNÉ" (rouge)
- Grand score numérique coloré (vert/rouge)
- Fraction X/40 + pourcentage
- "Seuil requis : 80% (32/40)"
- Message personnalisé selon résultat

### 5.2 Stats par thème (5 lignes)
Pour chaque thème :
- Nom du thème
- Barre de progression animée (vert si ≥80%, rouge sinon)
- Score X/8

### 5.3 Actions
- Bouton **"🔄 Nouvel examen"** → relance chargement + nouvelle génération API
- Bouton **"📋 Corriger"** → affiche/cache la correction détaillée

### 5.4 Correction détaillée
Affiche uniquement les questions ratées :
- Numéro + texte de la question
- Les 4 options avec :
  - ✓ Bonne réponse (vert)
  - ✗ Réponse donnée si incorrecte (rouge)
  - Autres options en gris
- Explication (bloc doré)
- Si aucune erreur : message "🎉 Aucune erreur !"

---

## 6. Mode Quiz par thème

### 6.1 Sélection du thème
5 cards cliquables, une par thème :
- Icône + Nom + Description courte
- Couleur d'accent par thème

### 6.2 Quiz (10 questions)
- Pas de chrono
- Correction immédiate après chaque réponse :
  - Bonne réponse surlignée en vert
  - Mauvaise réponse surlignée en rouge + bonne réponse révélée
  - Explication affichée
  - Bouton "Question suivante" apparaît

### 6.3 Score final thème
- Score X/10
- Message selon niveau : ≥8 = excellent, 6-7 = à consolider, <6 = à retravailler
- Bouton "Retour aux thèmes"
- Bouton "Recommencer ce thème"

---

## 7. Thèmes

| ID | Nom | Couleur | Icône |
|---|---|---|---|
| `valeurs` | Valeurs de la République | `#4f8ef7` | 🏛️ |
| `institutions` | Institutions & Politique | `#a78bfa` | ⚖️ |
| `droits` | Droits & Devoirs | `#34d399` | 📜 |
| `histoire` | Histoire & Géographie | `#f59e0b` | 🗺️ |
| `societe` | Vivre en société | `#f472b6` | 🤝 |

---

## 8. Gestion des erreurs

| Situation | Comportement |
|---|---|
| API timeout (>30s) | Charger fallback offline |
| JSON invalide | Retry 1 fois, puis fallback |
| API HTTP 4xx/5xx | Fallback immédiat + message discret |
| 0 questions reçues | Fallback immédiat |
| Question sans options | Skip silencieux |
