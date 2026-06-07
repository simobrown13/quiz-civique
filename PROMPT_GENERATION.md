# MISSION : Générer la banque de questions officielle + simulateur complet

## Sources officielles (URLs exactes à utiliser)

### 1. Fichier JSON officiel — data.gouv.fr
**URL directe de téléchargement** :
https://www.data.gouv.fr/api/1/datasets/r/97442533-9cfd-4e85-90fa-8ecd3f482c86

Ce fichier contient les **vraies questions officielles** du ministère de l'Intérieur
(issues de formation-civique.interieur.gouv.fr), structurées par thème.
Format : `{ "id", "question", "suggested_answers": [...] }`
209 questions (version 1.1 du 24 mars 2026), Licence Ouverte 2.0 Etalab.

### 2. Site officiel de préparation
https://formation-civique.interieur.gouv.fr
→ 222 fiches thématiques + liste officielle des questions

### 3. Page officielle examen civique (DGEF)
https://www.immigration.interieur.gouv.fr/Immigration/Examen-civique-pour-une-premiere-demande-de-titre-de-sejour-pluriannuel

### 4. Service-Public.fr
https://www.service-public.gouv.fr/particuliers/vosdroits/F39530

---

## Étape 1 — Télécharger et parser le JSON officiel

```python
import urllib.request, json

url = "https://www.data.gouv.fr/api/1/datasets/r/97442533-9cfd-4e85-90fa-8ecd3f482c86"
urllib.request.urlretrieve(url, "data/official_questions_raw.json")

with open("data/official_questions_raw.json", encoding="utf-8") as f:
    raw = json.load(f)

print(f"Téléchargé : {len(raw)} entrées")
print("Structure d'une entrée :", json.dumps(raw[0], ensure_ascii=False, indent=2))
```

Analyser la structure exacte du JSON, puis adapter le parsing.

---

## Étape 2 — Transformer en format quiz

Convertir chaque question officielle en objet quiz avec 4 options (A/B/C/D) :
- La bonne réponse = suggested_answers[0]
- Les 3 distracteurs = à générer via l'API Anthropic (plausibles mais incorrects)
- Mapper le champ theme aux 5 identifiants : valeurs | institutions | droits | histoire | societe

Script Python à créer : scripts/convert_official.py

Prompt API pour les distracteurs :
```
Question officielle : "{q}"
Bonne réponse : "{correct}"
Génère 3 réponses incorrectes mais plausibles pour un QCM sur l'examen civique français.
Les distracteurs doivent être du même type que la bonne réponse, plausibles mais clairement
incorrects pour quelqu'un qui connaît le sujet.
Réponds UNIQUEMENT avec un JSON : ["distracteur1", "distracteur2", "distracteur3"]
```

---

## Étape 3 — Compléter jusqu'à 100 questions par thème

Les 209 questions officielles ne couvrent pas tous les sous-thèmes.
Compléter jusqu'à 100 questions par thème en générant les manquantes via l'API.
Pour chaque thème, calculer : manquantes = 100 - nb_questions_officielles_du_thème

---

## Étape 4 — Créer les fichiers par thème

Sauvegarder dans data/questions_bank/ :
- valeurs.json      — 100 questions
- institutions.json — 100 questions
- droits.json       — 100 questions
- histoire.json     — 100 questions
- societe.json      — 100 questions

Format de chaque objet :
```json
{
  "id": "valeurs_001",
  "q": "Quelle est la devise de la République française ?",
  "options": ["Unité, Travail, Progrès", "Liberté, Égalité, Fraternité", "Honneur, Patrie, Valeur", "Ordre et Progrès"],
  "answer": 1,
  "theme": "valeurs",
  "difficulte": "facile",
  "source": "Constitution 1958, Article 2 — formation-civique.interieur.gouv.fr",
  "explication": "La devise Liberté, Égalité, Fraternité est inscrite à l'article 2 de la Constitution. Elle est issue de la Révolution française."
}
```

---

## Étape 5 — Générer 10 examens blancs équilibrés

Créer data/examens/examen_01.json à examen_10.json.
Chaque examen : 40 questions, 8 par thème, piochées aléatoirement dans la banque.
Script : scripts/generate_exams.py

---

## Étape 6 — Fusionner en questions.json

Fusionner les 500 questions en data/questions.json (fallback offline du simulateur).
Vérifier : zéro doublon sur le champ id, 100 questions par thème.

---

## Étape 7 — Mettre à jour src/api.js

Modifier generateExamQuestions() pour :
1. Essayer l'API Anthropic (questions fraîches)
2. Si offline → charger window.QUESTIONS_FALLBACK (500 questions locales)
   puis tirer 8 questions aléatoires par thème

---

## Étape 8 — Rebuilder

```bash
python3 build.py
```

Vérifier que dist/simulateur.html :
- Contient les 500 questions en fallback offline
- Fonctionne sans connexion internet
- Génère de nouvelles questions via API si connecté

---

## Ordre d'exécution exact

```
1. python3 scripts/convert_official.py   # télécharge + transforme les 209 questions officielles
2. python3 scripts/complete_themes.py    # génère les questions manquantes via API
3. python3 scripts/generate_exams.py     # génère les 10 examens blancs
4. python3 scripts/merge_questions.py    # fusionne en data/questions.json
5. Modifier src/api.js
6. python3 build.py
7. Ouvrir dist/simulateur.html dans le navigateur
```

---

## Attribution obligatoire (Licence Ouverte 2.0 Etalab)

Inclure dans le code HTML généré :
"Questions officielles issues de formation-civique.interieur.gouv.fr — Réponses suggérées par leqcmcivique.fr"
