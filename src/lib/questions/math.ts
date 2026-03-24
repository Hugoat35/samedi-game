import type { QuizQuestion } from "../quiz-bank";

// Petite fonction utilitaire pour générer des nombres aléatoires facilement
function randomIntBelow(n: number): number {
  if (n <= 0) return 0;
  return Math.floor(Math.random() * n);
}

export function generateMathQuestion(): QuizQuestion {
  // Liste de tous les modèles de problèmes possibles
  const problemTypes = ["multiplication", "addition", "pommes", "age"];
  const type = problemTypes[randomIntBelow(problemTypes.length)];

  let questionText = "";
  let answer: number = 0;
  let timeLimit = 15; // Temps par défaut

  switch (type) {
    case "multiplication": {
      const a = randomIntBelow(10) + 3; // 3 à 12
      const b = randomIntBelow(10) + 3; // 3 à 12
      questionText = `Calcul mental express : Combien font ${a} x ${b} ?`;
      answer = a * b;
      timeLimit = 10; // Très rapide !
      break;
    }
    case "addition": {
      const a = randomIntBelow(50) + 50; 
      const b = randomIntBelow(50) + 50;
      questionText = `Calcul mental express : ${a} + ${b} = ?`;
      answer = a + b;
      timeLimit = 10; // Très rapide
      break;
    }
    case "pommes": {
      const total = randomIntBelow(20) + 30; // 30 à 49
      const mangées = randomIntBelow(10) + 5; // 5 à 14
      const données = randomIntBelow(5) + 2; // 2 à 6
      questionText = `Problème : Jean achète ${total} pommes. Il en mange ${mangées} et en donne ${données} à son ami. Combien lui en reste-t-il ?`;
      answer = total - mangées - données;
      timeLimit = 35; // Problème textuel = plus de temps
      break;
    }
    case "age": {
      const agePaul = randomIntBelow(10) + 15; // 15 à 24
      const diff = randomIntBelow(5) + 3; // 3 à 7
      questionText = `Problème : Paul a ${agePaul} ans. Sa soeur a ${diff} ans de moins que lui. Quel est l'âge de sa soeur ?`;
      answer = agePaul - diff;
      timeLimit = 30; // Problème textuel
      break;
    }
    
    // Ajoute tes futurs patterns ici !
    // case "train": { ... }
    // case "vitesse": { ... }
  }

  return {
    id: `math-${Date.now()}-${randomIntBelow(10000)}`,
    type: "open", // On utilise un champ texte classique
    theme: "Mathématiques",
    question: questionText,
    answer: answer,
    points: 150,
    timeLimit: timeLimit, // Le temps dynamique appliqué !
  };
}