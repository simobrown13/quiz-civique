#!/usr/bin/env python3
"""
build_questions.py — Convertit les 209 questions officielles en QCM à 4 options.

Entrées :
  - data/official_questions_raw.json  (questions du ministère, via data.gouv.fr)
  - data/distractors.json             (3 distracteurs + explication par id, rédigés à la main)

Sorties :
  - data/questions_bank/<theme>.json  (banque par thème)
  - data/questions.json               (banque fusionnée = fallback offline du simulateur)

Aucune API. La bonne réponse est suggested_answers[0] ; les distracteurs sont
écrits à la main dans data/distractors.json (faux, mais ne recoupant aucune des
autres suggested_answers, qui sont elles aussi correctes).
"""

import json
import os
import random
import sys
import unicodedata

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_PATH         = os.path.join(BASE, "data", "official_questions_raw.json")
DISTRACTORS_DIR  = os.path.join(BASE, "data", "distractors")
BANK_DIR         = os.path.join(BASE, "data", "questions_bank")
OUT_PATH         = os.path.join(BASE, "data", "questions.json")


def load_distractors():
    """Fusionne tous les data/distractors/*.json (un par thème) en un seul dict id->entrée."""
    merged = {}
    if not os.path.isdir(DISTRACTORS_DIR):
        sys.exit(f"❌ Dossier introuvable : {DISTRACTORS_DIR}")
    for name in sorted(os.listdir(DISTRACTORS_DIR)):
        if name.endswith(".json"):
            with open(os.path.join(DISTRACTORS_DIR, name), encoding="utf-8") as f:
                merged.update(json.load(f))
    return merged

THEME_MAP = {
    "Principes et valeurs de la République": "valeurs",
    "Système institutionnel et politique":   "institutions",
    "Droits et devoirs":                      "droits",
    "Histoire géographie et culture":         "histoire",
    "Vivre dans la société française":        "societe",
}
THEME_ORDER = ["valeurs", "institutions", "droits", "histoire", "societe"]
SOURCE = "Question officielle : formation-civique.interieur.gouv.fr — Licence Ouverte 2.0 Etalab"


def norm(s):
    t = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return " ".join(t.split()).strip(" .")


def main():
    raw = json.load(open(RAW_PATH, encoding="utf-8"))
    distractors = load_distractors()

    per_theme = {t: [] for t in THEME_ORDER}
    missing, bad = [], []

    for entry in raw["data"]:
        theme_id = THEME_MAP[entry["theme"]]
        for q in entry["questions"]:
            qid = str(q["id"])
            suggested = [a.strip() for a in q.get("suggested_answers", []) if a.strip()]
            if not suggested:
                bad.append((qid, "aucune réponse correcte"))
                continue

            d = distractors.get(qid)
            if not d or len(d.get("distractors", [])) != 3:
                missing.append(qid)
                continue

            # "correct" permet de corriger une réponse mal formée dans la source officielle.
            correct = (d.get("correct") or suggested[0]).strip()

            dist = [x.strip() for x in d["distractors"]]
            # Garde-fou : un distracteur ne doit recouper aucune réponse correcte.
            accepted = {norm(a) for a in suggested}
            if any(norm(x) in accepted for x in dist):
                bad.append((qid, "distracteur = réponse correcte"))
                continue
            if len({norm(x) for x in dist}) != 3 or norm(correct) in {norm(x) for x in dist}:
                bad.append((qid, "options non uniques"))
                continue

            options = [correct] + dist
            random.Random(int(qid)).shuffle(options)  # mélange déterministe (reproductible)
            answer = options.index(correct)

            per_theme[theme_id].append({
                "id":          f"{theme_id}_{len(per_theme[theme_id]) + 1:03d}",
                "q":           q["question"].strip(),
                "options":     options,
                "answer":      answer,
                "theme":       theme_id,
                "difficulte":  d.get("difficulte", "moyen"),
                "source":      SOURCE,
                "explication": d.get("explication", "").strip(),
            })

    # Écrire la banque par thème
    os.makedirs(BANK_DIR, exist_ok=True)
    for t in THEME_ORDER:
        with open(os.path.join(BANK_DIR, f"{t}.json"), "w", encoding="utf-8") as f:
            json.dump(per_theme[t], f, ensure_ascii=False, indent=2)
            f.write("\n")

    merged = [q for t in THEME_ORDER for q in per_theme[t]]
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        f.write("\n")

    counts = {t: len(per_theme[t]) for t in THEME_ORDER}
    print("📊 par thème :", counts, "| total :", len(merged))
    if missing:
        print(f"⚠ {len(missing)} questions sans distracteurs (ignorées) : {missing[:15]}{'…' if len(missing) > 15 else ''}")
    if bad:
        print(f"⚠ {len(bad)} questions rejetées : {bad[:10]}")
    if not missing and not bad:
        print("✅ Toutes les questions officielles converties.")
    print(f"→ {OUT_PATH}")


if __name__ == "__main__":
    main()
