#!/usr/bin/env python3
"""
generate_exams.py — Génère 10 examens blancs équilibrés depuis la banque par thème.

Chaque examen : 40 questions (8 par thème), tirées sans doublon intra-examen.
Tirage déterministe (seed par numéro d'examen) → reproductible.

Sortie : data/examens/examen_01.json … examen_10.json
"""

import json
import os
import random

BASE     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK_DIR = os.path.join(BASE, "data", "questions_bank")
OUT_DIR  = os.path.join(BASE, "data", "examens")

THEMES = ["valeurs", "institutions", "droits", "histoire", "societe"]
PER_THEME = 8
N_EXAMS = 10


def main():
    banks = {}
    for t in THEMES:
        with open(os.path.join(BANK_DIR, f"{t}.json"), encoding="utf-8") as f:
            banks[t] = json.load(f)
        if len(banks[t]) < PER_THEME:
            raise SystemExit(f"❌ Thème {t} : {len(banks[t])} questions < {PER_THEME} requises")

    os.makedirs(OUT_DIR, exist_ok=True)
    for n in range(1, N_EXAMS + 1):
        rng = random.Random(1000 + n)  # seed fixe par examen → reproductible
        questions = []
        for t in THEMES:
            questions.extend(rng.sample(banks[t], PER_THEME))  # 8 distincts par thème
        rng.shuffle(questions)  # mélange l'ordre des thèmes dans l'examen

        exam = {
            "id": f"examen_{n:02d}",
            "titre": f"Examen blanc n°{n}",
            "duree_minutes": 45,
            "seuil_reussite": 80,
            "questions": questions,
        }
        with open(os.path.join(OUT_DIR, f"examen_{n:02d}.json"), "w", encoding="utf-8") as f:
            json.dump(exam, f, ensure_ascii=False, indent=2)
            f.write("\n")

    print(f"✅ {N_EXAMS} examens générés dans {OUT_DIR} (40 questions, 8/thème)")


if __name__ == "__main__":
    main()
