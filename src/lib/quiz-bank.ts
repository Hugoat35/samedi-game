export type QuestionType = "qcm" | "estimation" | "open" | "date" | "minibac" | "true_false";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  answer: string | number; // Le résultat attendu (chiffre ou texte)
  options?: string[]; // Les choix possibles (pour QCM ou Vrai/Faux)
  points: number;
}

// TA BANQUE DE QUESTIONS (Tu pourras en ajouter des centaines ici)
export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "q1",
    type: "estimation",
    question: "Combien pèse la Tour Eiffel en tonnes ?",
    answer: 10100,
    points: 100,
  },
  {
    id: "q2",
    type: "true_false",
    question: "Les requins ont des os.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    points: 50,
  },
  {
    id: "q3",
    type: "qcm",
    question: "Quelle est la capitale de l'Australie ?",
    answer: "Canberra",
    options: ["Sydney", "Melbourne", "Canberra", "Perth"],
    points: 100,
  },
  {
    id: "q4",
    type: "open",
    question: "Quel est le prénom du sorcier à lunettes avec un éclair sur le front ?",
    answer: "Harry",
    points: 100,
  }
];

// Fonction magique qui pioche X questions au hasard sans doublon
export function getRandomQuestions(count: number): QuizQuestion[] {
  const shuffled = [...QUIZ_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}