// api.js — Génération de questions via l'API Anthropic

const API_URL = "https://api.anthropic.com/v1/messages";
const API_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT_EXAM = `Tu es un expert de l'examen civique français (décret 2025-647, arrêté 10 octobre 2025).
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
- Questions variées, réalistes, niveau carte de résident
- Explications courtes et pédagogiques (2 phrases max)
- UNIQUEMENT le tableau JSON, aucun texte autour, aucune balise markdown`;

const SYSTEM_PROMPT_THEME = (themeId, themeLabel) => `Tu es un expert de l'examen civique français.
Génère exactement 10 questions QCM sur le thème : ${themeLabel}.
Format JSON strict, tableau de 10 objets :
{"q":"...","options":["A","B","C","D"],"answer":INDEX_0_3,"theme":"${themeId}","explication":"..."}
Règles :
- answer = index 0-3 de la bonne réponse
- Questions variées et pédagogiques
- Explications courtes (2 phrases max)
- UNIQUEMENT le tableau JSON, sans texte ni markdown`;

/**
 * Mélange un tableau (Fisher-Yates) sans muter la source.
 * @param {Array} arr
 * @returns {Array} nouvelle copie mélangée
 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Construit un examen équilibré de 40 questions (8 par thème) depuis une banque.
 * Complète avec des questions restantes si un thème est sous-fourni.
 * @param {Array} bank
 * @param {number} perTheme
 * @returns {Array}
 */
function buildBalancedExam(bank, perTheme = 8) {
  const themeIds = ['valeurs', 'institutions', 'droits', 'histoire', 'societe'];
  const picked = [];
  const used = new Set();

  themeIds.forEach(id => {
    const pool = shuffle(bank.filter(q => q.theme === id));
    pool.slice(0, perTheme).forEach(q => { picked.push(q); used.add(q); });
  });

  // Compléter si certains thèmes manquaient de questions
  const target = themeIds.length * perTheme;
  if (picked.length < target) {
    const rest = shuffle(bank.filter(q => !used.has(q)));
    picked.push(...rest.slice(0, target - picked.length));
  }

  return shuffle(picked);
}

/**
 * Appel API Anthropic avec retry et extraction JSON robuste
 * @param {string} systemPrompt
 * @param {number} maxTokens
 * @returns {Promise<Array>} tableau de questions parsées
 */
async function callAPI(systemPrompt, maxTokens = 10000) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: systemPrompt }]
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = (data.content || []).map(b => b.text || "").join("").trim();

  // Extraction JSON robuste : chercher le premier tableau JSON
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Aucun tableau JSON dans la réponse API");

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Tableau JSON vide");

  // Normaliser les champs
  return parsed.map(q => ({
    q:           q.q || "",
    options:     Array.isArray(q.options) ? q.options : [],
    answer:      Number(q.answer) || 0,
    theme:       q.theme || "valeurs",
    explication: q.explication || ""
  })).filter(q => q.q && q.options.length === 4);
}

/**
 * Générer 40 questions pour l'examen simulé
 * Tente l'API, fallback sur window.QUESTIONS_FALLBACK si échec
 */
async function generateExamQuestions(onStep) {
  try {
    onStep && onStep("Appel API en cours…", 20);
    const questions = await callAPI(SYSTEM_PROMPT_EXAM, 10000);
    onStep && onStep(`✓ ${questions.length} questions générées`, 95);
    return shuffle(questions);
  } catch (err) {
    console.warn("API échouée, fallback offline :", err.message);
    onStep && onStep("⚠ API indisponible — chargement hors-ligne…", 90);
    await new Promise(r => setTimeout(r, 500));
    if (window.QUESTIONS_FALLBACK && window.QUESTIONS_FALLBACK.length > 0) {
      return buildBalancedExam(window.QUESTIONS_FALLBACK, 8);
    }
    throw new Error("API indisponible et aucune question de secours trouvée.");
  }
}

/**
 * Générer 10 questions pour un thème donné
 */
async function generateThemeQuestions(themeId, themeLabel, onStep) {
  try {
    onStep && onStep(`Génération — ${themeLabel}…`, 20);
    const questions = await callAPI(SYSTEM_PROMPT_THEME(themeId, themeLabel), 4000);
    onStep && onStep("✓ Questions prêtes", 95);
    return shuffle(questions);
  } catch (err) {
    console.warn("API thème échouée, fallback :", err.message);
    onStep && onStep("⚠ Fallback hors-ligne…", 90);
    await new Promise(r => setTimeout(r, 400));
    const fallback = (window.QUESTIONS_FALLBACK || []).filter(q => q.theme === themeId);
    if (fallback.length >= 4) return shuffle(fallback).slice(0, 10);
    throw new Error(`Pas assez de questions de secours pour le thème "${themeLabel}".`);
  }
}
