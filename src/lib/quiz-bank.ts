import { GEO_FLAG_ROWS, GEO_SHAPE_ROWS } from "./geo-quiz-data";

// --- IMPORTS DES NOUVEAUX FICHIERS DE QUESTIONS ---
import { trueFalseQuestions } from "./questions/true_false";
import { qcmQuestions } from "./questions/qcm";
import { estimationQuestions } from "./questions/estimation";
import { openQuestions } from "./questions/open";
import { dateQuestions } from "./questions/date";

export type QuestionType =
  | "qcm"
  | "estimation"
  | "open"
  | "date"
  | "minibac"
  | "true_false"
  | "geo_flag"
  | "geo_shape";

export type QuestionTheme = "Géographie" | "Sciences" | "Histoire" | "Culture G" | "Mini-Bac" | "Sport" | "Dessin animé";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  theme: QuestionTheme;
  question: string;
  answer: string | number;
  options?: string[];
  points: number;
  countryCode?: string;
  answerAliases?: string[];
  letter?: string;
  categories?: string[];
}

export function buildGeoFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}

export function buildGeoShapeUrl(countryCode: string): string {
  return `https://cdn.jsdelivr.net/gh/djaiss/mapsicon@master/all/${countryCode.toLowerCase()}/128.png`;
}

const GEO_IN_POOL_RATIO = 0.9;
const MINIBAC_POINTS_PER_VALIDATED_CELL = 20;

function randomIntBelow(n: number): number {
  if (n <= 0) return 0;
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0]! % n;
  }
  return Math.floor(Math.random() * n);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomIntBelow(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function sampleGeoRows<T>(rows: T[], keepRatio: number): T[] {
  if (rows.length === 0) return [];
  const shuffled = shuffle([...rows]);
  const n = Math.max(1, Math.floor(rows.length * keepRatio));
  return shuffled.slice(0, Math.min(n, rows.length));
}

const GEO_FLAG_QUESTIONS: QuizQuestion[] = sampleGeoRows(GEO_FLAG_ROWS, GEO_IN_POOL_RATIO).map((r, i) => ({
  id: `gf-${i}-${r.code}`,
  type: "geo_flag",
  theme: "Géographie",
  question: "Quel pays correspond à ce drapeau ?",
  answer: r.answer,
  answerAliases: r.aliases,
  countryCode: r.code,
  points: 120,
}));

const GEO_SHAPE_QUESTIONS: QuizQuestion[] = sampleGeoRows(GEO_SHAPE_ROWS, GEO_IN_POOL_RATIO).map((r, i) => ({
  id: `gs-${i}-${r.code}`,
  type: "geo_shape",
  theme: "Géographie",
  question: "À quel pays correspond cette forme ?",
  answer: r.answer,
  answerAliases: r.aliases,
  countryCode: r.code,
  points: 140,
}));

// Configuration Mini-Bac
const MINI_BAC_CATEGORIES = [
  "Un pays", "Un fruit ou légume", "Un métier", "Un animal", "Une marque",
  "Un prénom masculin", "Un prénom féminin", "Un sport", "Un objet du quotidien",
  "Une célébrité", "Un vêtement", "Une ville", "Un film ou série",
  "Un instrument de musique", "Un moyen de transport", "Une chose qu'on trouve dans une cuisine",
  "Un super-pouvoir", "Un gros mot poli", "Un truc qui pue"
];
const MINI_BAC_LETTERS = "ABCDEFGHIJKLMNOPQRSTV";


// --- LA MÉGA BANQUE DE QUESTIONS (MAINTENANT DYNAMIQUE) ---
export const QUIZ_BANK: QuizQuestion[] = [
  ...trueFalseQuestions,
  ...qcmQuestions,
  ...estimationQuestions,
  ...openQuestions,
  ...dateQuestions,
  ...GEO_FLAG_QUESTIONS,
  ...GEO_SHAPE_QUESTIONS,
];


export function getRandomQuestionsByTheme(count: number, activeThemes: QuestionTheme[]): QuizQuestion[] {
  const pool = QUIZ_BANK.filter((q) => activeThemes.includes(q.theme) && q.theme !== "Mini-Bac");
  const shuffled = shuffle([...pool]);
  let selected = shuffled.slice(0, count);

  if (activeThemes.includes("Mini-Bac") && count >= 5 && selected.length >= 4) {
    const numMiniBacs = count >= 15 ? 2 : 1;

    for (let i = 0; i < numMiniBacs; i++) {
      const randomLetter = MINI_BAC_LETTERS[randomIntBelow(MINI_BAC_LETTERS.length)]!;
      const shuffledCategories = shuffle([...MINI_BAC_CATEGORIES]).slice(0, 4);

      const miniBacQuestion: QuizQuestion = {
        id: `minibac-${Date.now()}-${i}-${randomIntBelow(1_000_000_000)}`,
        type: "minibac",
        theme: "Mini-Bac",
        question: `Mini-Bac : Lettre ${randomLetter}`,
        answer: "vote",
        points: MINIBAC_POINTS_PER_VALIDATED_CELL,
        letter: randomLetter,
        categories: shuffledCategories,
      };

      const replaceIndex = Math.floor(selected.length * 0.6) + i;
      if (replaceIndex < selected.length) {
        selected[replaceIndex] = miniBacQuestion;
      }
    }
  }

  return shuffle(selected);
}