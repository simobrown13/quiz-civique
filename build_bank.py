#!/usr/bin/env python3
"""
build_bank.py — Enrichit data/questions.json via l'API Anthropic.

Génère N questions par thème (5 thèmes), dédoublonne contre la banque existante,
valide le format, puis fusionne le tout dans data/questions.json. Plus la banque
est grande, plus les examens tirés par buildBalancedExam() (8 questions/thème)
sont variés — y compris hors-ligne, sans dépendre de l'API au runtime.

Usage :
    pip install anthropic
    set ANTHROPIC_API_KEY=sk-...      (PowerShell : $env:ANTHROPIC_API_KEY="sk-...")
    python build_bank.py                 # 30 questions/thème (défaut)
    python build_bank.py --per-theme 40
    python build_bank.py --model claude-sonnet-4-6
    python build_bank.py --dry-run       # n'écrit pas, affiche seulement le bilan

Puis régénérer le HTML : python build.py
"""

import argparse
import json
import os
import sys
import unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))
QUESTIONS_PATH = os.path.join(BASE, "data", "questions.json")

THEMES = [
    ("valeurs",      "Valeurs et principes de la République (devise, laïcité, symboles, DDHC)"),
    ("institutions", "Système institutionnel et politique (Président, Parlement, collectivités, UE)"),
    ("droits",       "Droits et devoirs du citoyen (droits fondamentaux, vote, travail, protection sociale)"),
    ("histoire",     "Histoire, géographie et culture (dates clés, personnages, régions, patrimoine)"),
    ("societe",      "Vivre dans la société française (école, famille, santé, logement, intégration)"),
]

# Schéma de sortie structurée : un objet { "questions": [ ... ] }
QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "q":           {"type": "string"},
                    "options":     {"type": "array", "items": {"type": "string"}},
                    "answer":      {"type": "integer", "enum": [0, 1, 2, 3]},
                    "explication": {"type": "string"},
                },
                "required": ["q", "options", "answer", "explication"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["questions"],
    "additionalProperties": False,
}


def system_prompt(theme_id, theme_label, n, existing_qs):
    deja = "\n".join(f"- {q}" for q in existing_qs) or "(aucune)"
    return f"""Tu es un expert de l'examen civique français (décret 2025-647, arrêté du 10 octobre 2025).
Génère exactement {n} questions QCM sur le thème : {theme_label}.

Contraintes :
- Chaque question a exactement 4 options.
- "answer" = index 0-3 de la bonne réponse dans "options".
- Questions variées, réalistes, niveau carte de résident 10 ans.
- Explications courtes et pédagogiques (2 phrases max).
- Faits exacts et vérifiables (dates, chiffres, institutions).
- Ne reproduis PAS les questions déjà présentes ci-dessous, ni de simples reformulations :
{deja}

Réponds uniquement via le format structuré demandé."""


def norm(text):
    """Clé de déduplication : minuscules, sans accents ni ponctuation superflue."""
    t = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode().lower()
    return "".join(c for c in t if c.isalnum() or c == " ").strip()


def load_existing():
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        return json.load(f)


def valid(q, theme_id):
    return (
        isinstance(q.get("q"), str) and q["q"].strip()
        and isinstance(q.get("options"), list) and len(q["options"]) == 4
        and all(isinstance(o, str) and o.strip() for o in q["options"])
        and isinstance(q.get("answer"), int) and 0 <= q["answer"] <= 3
    )


def generate_theme(client, model, theme_id, theme_label, n, existing_texts):
    """Appelle l'API et renvoie une liste de questions normalisées et valides."""
    resp = client.messages.create(
        model=model,
        max_tokens=16000,
        system=system_prompt(theme_id, theme_label, n, existing_texts),
        messages=[{"role": "user",
                   "content": f"Génère {n} questions QCM sur le thème « {theme_label} »."}],
        output_config={"format": {"type": "json_schema", "schema": QUESTION_SCHEMA}},
    )
    raw = next((b.text for b in resp.content if b.type == "text"), "")
    data = json.loads(raw)
    out = []
    for q in data.get("questions", []):
        if not valid(q, theme_id):
            continue
        out.append({
            "q": q["q"].strip(),
            "options": [o.strip() for o in q["options"]],
            "answer": int(q["answer"]),
            "theme": theme_id,
            "explication": (q.get("explication") or "").strip(),
        })
    return out


def main():
    parser = argparse.ArgumentParser(description="Enrichit data/questions.json via l'API Anthropic.")
    parser.add_argument("--per-theme", type=int, default=30, help="Nombre de questions à viser par thème (défaut 30).")
    parser.add_argument("--model", default=os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8"),
                        help="ID de modèle Anthropic (défaut claude-opus-4-8).")
    parser.add_argument("--dry-run", action="store_true", help="N'écrit pas le fichier ; affiche seulement le bilan.")
    args = parser.parse_args()

    try:
        import anthropic
    except ImportError:
        sys.exit("❌ SDK manquant. Installe-le : pip install anthropic")

    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        sys.exit("❌ Clé API absente. Définis ANTHROPIC_API_KEY puis relance.")

    client = anthropic.Anthropic()

    bank = load_existing()
    seen = {norm(q["q"]) for q in bank}
    print(f"📚 Banque actuelle : {len(bank)} questions. Modèle : {args.model}")

    added_total = 0
    for theme_id, theme_label in THEMES:
        have = sum(1 for q in bank if q.get("theme") == theme_id)
        need = max(0, args.per_theme - have)
        if need == 0:
            print(f"  ✓ {theme_id} : déjà {have} (cible {args.per_theme}) — rien à faire")
            continue

        existing_texts = [q["q"] for q in bank if q.get("theme") == theme_id]
        # On demande un peu plus que nécessaire pour absorber les doublons rejetés.
        print(f"  → {theme_id} : {have} → cible {args.per_theme} (génération de ~{need})…")
        try:
            generated = generate_theme(client, args.model, theme_id, theme_label,
                                       min(need + 5, 50), existing_texts)
        except Exception as e:
            print(f"    ⚠ échec API pour {theme_id} : {e}")
            continue

        added = 0
        for q in generated:
            key = norm(q["q"])
            if key in seen:
                continue
            seen.add(key)
            bank.append(q)
            added += 1
            if added >= need:
                break
        added_total += added
        print(f"    + {added} ajoutées ({len(generated)} générées, doublons écartés)")

    # Trier par thème (ordre officiel) pour un fichier lisible
    order = {tid: i for i, (tid, _) in enumerate(THEMES)}
    bank.sort(key=lambda q: order.get(q.get("theme"), 99))

    counts = {}
    for q in bank:
        counts[q["theme"]] = counts.get(q["theme"], 0) + 1
    print(f"\n📊 Total : {len(bank)} questions — {counts}")
    print(f"   (+{added_total} cette session)")

    if args.dry_run:
        print("🟡 --dry-run : fichier non modifié.")
        return

    with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"✅ Écrit dans {QUESTIONS_PATH}")
    print("   Régénère le HTML : python build.py")


if __name__ == "__main__":
    main()
