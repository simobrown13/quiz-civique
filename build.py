#!/usr/bin/env python3
"""
build.py — Assemble dist/simulateur.html depuis les fichiers src/ et data/
Usage : python3 build.py
"""

import json
import os
import sys

# Console Windows (cp1252) : forcer UTF-8 pour les emojis des messages de build.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

BASE = os.path.dirname(os.path.abspath(__file__))

def read(path):
    with open(os.path.join(BASE, path), encoding='utf-8') as f:
        return f.read()

def build():
    print("🔨 Build simulateur.html...")

    css       = read("src/styles.css")
    html_skel = read("src/index.html")
    js_api    = read("src/api.js")
    js_timer  = read("src/timer.js")
    js_quiz   = read("src/quiz.js")
    js_result = read("src/results.js")
    questions = json.loads(read("data/questions.json"))
    themes    = json.loads(read("data/themes.json"))

    # 1. Injecter le CSS
    html = html_skel.replace(
        "/* === styles.css sera inliné ici par le build === */",
        css
    )

    # 2. Injecter le JS (api + timer + quiz + results) + données (questions + thèmes)
    fallback_js = f"window.QUESTIONS_FALLBACK = {json.dumps(questions, ensure_ascii=False)};"
    themes_js   = f"window.THEMES_DATA = {json.dumps(themes, ensure_ascii=False)};"

    combined_js = "\n\n".join([
        "// === API ===", js_api,
        "// === TIMER ===", js_timer,
        "// === QUIZ ===", js_quiz,
        "// === RESULTS ===", js_result,
        "// === DATA (thèmes + questions de secours) ===", themes_js, fallback_js,
        "// === INIT ===",
        "document.addEventListener('DOMContentLoaded', function() { showHome(); });"
    ])

    html = html.replace(
        """    /* === quiz.js + timer.js + results.js + api.js seront inlinés ici === */
    /* === window.QUESTIONS_FALLBACK sera injecté ici par le build === */""",
        combined_js
    )

    # 3. Écrire dans dist/
    dist_dir = os.path.join(BASE, "dist")
    os.makedirs(dist_dir, exist_ok=True)
    out_path = os.path.join(dist_dir, "simulateur.html")

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"✅ dist/simulateur.html généré ({size_kb:.1f} KB)")
    print(f"   → {out_path}")
    print("   Ouvre ce fichier dans ton navigateur pour tester.")

if __name__ == "__main__":
    build()
