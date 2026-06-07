# SUITE MISSION — Générer tout sans API (mode offline complet)

## Situation actuelle
- Fichier officiel téléchargé : data/official_questions_raw.json (83 Ko, 209 questions)
- Pas de clé API ni SDK anthropic disponible dans cet environnement
- Solution : générer TOUT statiquement, sans appel API

---

## Étape 1 — Inspecter la structure du fichier officiel

```python
import json

with open("data/official_questions_raw.json", encoding="utf-8") as f:
    raw = json.load(f)

print(f"Total entrées : {len(raw)}")
print("Structure première entrée :")
print(json.dumps(raw[0], ensure_ascii=False, indent=2))
print("\nStructure deuxième entrée :")
print(json.dumps(raw[1], ensure_ascii=False, indent=2))

# Analyser les thèmes présents
themes = {}
for item in raw:
    t = item.get("theme") or item.get("thematique") or item.get("category") or "?"
    themes[t] = themes.get(t, 0) + 1
print("\nRépartition par thème :", json.dumps(themes, ensure_ascii=False, indent=2))
```

Affiche la structure complète, puis adapte tout le code qui suit.

---

## Étape 2 — Créer scripts/convert_and_build.py

Ce script fait TOUT en une seule passe, sans API :

```python
#!/usr/bin/env python3
"""
convert_and_build.py
Transforme les 209 questions officielles + génère les distracteurs en dur
→ produit data/questions.json (500 questions) + data/examens/*.json (10 examens)
"""
import json, random, re
from pathlib import Path

# --- Charger le fichier officiel ---
with open("data/official_questions_raw.json", encoding="utf-8") as f:
    raw = json.load(f)

# --- Mapping thèmes (adapter selon la structure réelle du fichier) ---
THEME_MAP = {
    # Ajouter ici les vraies valeurs de thème trouvées dans le fichier
    # Exemple : "Principes et valeurs": "valeurs", "Institutions": "institutions"
}

THEMES = ["valeurs", "institutions", "droits", "histoire", "societe"]

# --- Distracteurs pré-rédigés par sous-thème ---
# Pour chaque bonne réponse, 3 distracteurs plausibles écrits à la main
# Structure : { "mot_clé_dans_la_bonne_réponse": ["dist1", "dist2", "dist3"] }
# Claude Code doit générer ces distracteurs en lisant chaque question
# et en écrivant 3 réponses plausibles mais incorrectes.

def make_distractors(question_text, correct_answer):
    """
    Génère 3 distracteurs plausibles pour une question donnée.
    Logique : selon le TYPE de réponse attendue, proposer des alternatives proches.
    """
    correct = correct_answer.strip()
    
    # Réponses numériques (dates, chiffres, durées)
    if re.match(r'^\d{4}$', correct):  # Année
        year = int(correct)
        return random.sample([str(year-10), str(year+10), str(year-5), str(year+5), str(year-15), str(year+15)], 3)
    
    if re.match(r'^\d+ ans$', correct):  # Durée en années
        n = int(re.search(r'\d+', correct).group())
        opts = [f"{n-1} ans", f"{n+1} ans", f"{n+2} ans", f"{n-2} ans", f"{n+3} ans"]
        return random.sample([o for o in opts if o != correct], 3)
    
    # Pour les autres : retourner des distracteurs génériques basés sur le contexte
    # Claude Code doit enrichir cette fonction avec des cas spécifiques
    return ["À compléter", "À compléter", "À compléter"]

# Le vrai travail : Claude Code doit LIRE chaque question officielle
# et écrire les 3 distracteurs appropriés directement dans le script.
```

---

## CE QUE CLAUDE CODE DOIT FAIRE (instructions précises)

### 1. Inspecter le fichier JSON officiel
Lire `data/official_questions_raw.json` et afficher :
- La structure exacte (clés disponibles)
- La répartition par thème
- 5 exemples de questions avec leurs réponses

### 2. Créer `scripts/build_questions.py` qui :

**Pour chaque question officielle (209 questions) :**
- Prend le texte de la question (`question` ou autre clé)
- Prend la bonne réponse (`suggested_answers[0]` ou autre)
- Écrit 3 distracteurs plausibles EN DUR dans le code (pas d'API)
  → Lire la question, comprendre le sujet, écrire 3 fausses réponses cohérentes
- Mélange les 4 options aléatoirement
- Génère une explication courte (2 phrases) EN DUR
- Assigne un thème parmi les 5

**Pour atteindre 500 questions (291 questions supplémentaires) :**
Écrire EN DUR dans le script 291 questions supplémentaires couvrant les sous-thèmes
non encore couverts par les 209 questions officielles.
Se baser sur `docs/PROGRAMME.md` pour identifier les lacunes.

### 3. Créer `scripts/generate_exams.py`
Générer 10 fichiers `data/examens/examen_0X.json`
Chaque examen : 40 questions, 8 par thème, tirage aléatoire sans doublon intra-examen.

### 4. Relancer `python3 build.py`
Le build.py existant injecte `data/questions.json` dans `dist/simulateur.html`.

---

## Format de sortie attendu

### data/questions.json
```json
[
  {
    "id": "valeurs_001",
    "q": "Texte exact de la question officielle",
    "options": ["Bonne réponse", "Distracteur 1", "Distracteur 2", "Distracteur 3"],
    "answer": 0,
    "theme": "valeurs",
    "difficulte": "facile",
    "source": "formation-civique.interieur.gouv.fr",
    "explication": "Explication courte. Référence légale si applicable."
  }
]
```

### data/examens/examen_01.json
```json
{
  "id": "examen_01",
  "titre": "Examen blanc n°1",
  "duree_minutes": 45,
  "seuil_reussite": 80,
  "questions": [ ... 40 objets question complets ... ]
}
```

---

## Priorités

1. D'abord inspecter la structure réelle du fichier officiel
2. Parser les 209 questions officielles avec leurs vraies réponses
3. Écrire les distracteurs en dur (pas d'API nécessaire)
4. Générer 10 examens blancs équilibrés
5. Builder dist/simulateur.html avec tout intégré

---

## Note importante

Les questions officielles doivent être reproduites à l'identique (texte du ministère).
Attribution à inclure dans le HTML final :
"Questions officielles : formation-civique.interieur.gouv.fr — Licence Ouverte 2.0 Etalab"
