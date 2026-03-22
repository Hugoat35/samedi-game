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
  // VRAI / FAUX (5 questions)
  { id: "tf1", type: "true_false", question: "Les requins ont des os.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf2", type: "true_false", question: "La Grande Muraille de Chine est visible depuis la Lune à l'œil nu.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf3", type: "true_false", question: "L'eau chaude gèle plus vite que l'eau froide.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf4", type: "true_false", question: "Les humains n'utilisent que 10% de leur cerveau.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf5", type: "true_false", question: "La foudre ne tombe jamais deux fois au même endroit.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },

  // QCM (5 questions)
  { id: "qcm1", type: "qcm", question: "Quelle est la capitale de l'Australie ?", answer: "Canberra", options: ["Sydney", "Melbourne", "Canberra", "Perth"], points: 100 },
  { id: "qcm2", type: "qcm", question: "Quel est l'animal le plus rapide du monde en piqué ?", answer: "Le faucon pèlerin", options: ["Le guépard", "L'aigle royal", "Le faucon pèlerin", "L'espadon"], points: 100 },
  { id: "qcm3", type: "qcm", question: "En quelle année le Titanic a-t-il coulé ?", answer: "1912", options: ["1905", "1912", "1920", "1918"], points: 100 },
  { id: "qcm4", type: "qcm", question: "Quel est le métal le plus abondant dans la croûte terrestre ?", answer: "L'aluminium", options: ["Le fer", "L'or", "Le cuivre", "L'aluminium"], points: 100 },
  { id: "qcm5", type: "qcm", question: "Qui a peint La Jeune Fille à la perle ?", answer: "Johannes Vermeer", options: ["Vincent van Gogh", "Johannes Vermeer", "Rembrandt", "Claude Monet"], points: 100 },

  // ESTIMATION (5 questions)
  { id: "est1", type: "estimation", question: "Combien pèse la Tour Eiffel (en tonnes) ?", answer: 10100, points: 100 },
  { id: "est2", type: "estimation", question: "Combien de jours l'humain a-t-il passé dans l'espace en cumulé ? (à peu près)", answer: 29000, points: 100 },
  { id: "est3", type: "estimation", question: "Combien d'os y a-t-il dans le corps d'un adulte humain ?", answer: 206, points: 100 },
  { id: "est4", type: "estimation", question: "En quelle année est sorti le premier iPhone ?", answer: 2007, points: 100 },
  { id: "est5", type: "estimation", question: "Combien de cœurs possède une pieuvre ?", answer: 3, points: 100 },
];

export function getRandomQuestions(count: number): QuizQuestion[] {
  const shuffled = [...QUIZ_BANK].sort(() => 0.5 - Math.random());
  // Si le joueur demande plus de questions qu'il n'y en a, on donne tout ce qu'on a !
  return shuffled.slice(0, Math.min(count, QUIZ_BANK.length));
}