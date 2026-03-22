export type QuestionType = "qcm" | "estimation" | "open" | "date" | "minibac" | "true_false";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  answer: string | number;
  options?: string[];
  points: number;
}

export const QUIZ_BANK: QuizQuestion[] = [
  { id: "q1", type: "estimation", question: "Combien pèse la Tour Eiffel en tonnes ?", answer: 10100, points: 100 },
  { id: "q2", type: "true_false", question: "Les requins ont des os.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "q3", type: "qcm", question: "Quelle est la capitale de l'Australie ?", answer: "Canberra", options: ["Sydney", "Melbourne", "Canberra", "Perth"], points: 100 }
];

export function getRandomQuestions(count: number): QuizQuestion[] {
  const shuffled = [...QUIZ_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}