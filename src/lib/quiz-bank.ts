export type QuestionType = "qcm" | "estimation" | "open" | "date" | "minibac" | "true_false";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  answer: string | number;
  options?: string[]; // Pour QCM / Vrai_Faux
  points: number;
  // Spécial Mini-Bac
  letter?: string;
  categories?: string[];
}

// Les catégories possibles pour le Mini-Bac
const MINI_BAC_CATEGORIES = [
  "Un pays", "Un fruit ou légume", "Un métier", "Un animal", "Une marque",
  "Un prénom masculin", "Un prénom féminin", "Un sport", "Un objet du quotidien",
  "Une célébrité", "Un vêtement", "Une ville", "Un film ou série",
  "Un instrument de musique", "Un moyen de transport", "Une chose qu'on trouve dans une cuisine",
  "Un super-pouvoir", "Un gros mot poli", "Un truc qui pue"
];

// Les lettres faciles/moyennes pour le Mini-Bac (on évite W, X, Y, Z pour l'instant)
const MINI_BAC_LETTERS = "ABCDEFGHIJKLMNOPQRSTUV";

// --- LA MÉGA BANQUE DE QUESTIONS ---
export const QUIZ_BANK: QuizQuestion[] = [
  // 🟢 VRAI OU FAUX (10 questions)
  { id: "tf1", type: "true_false", question: "La Grande Muraille de Chine est visible depuis la Lune à l'œil nu.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf2", type: "true_false", question: "La tomate est botaniquement un fruit.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf3", type: "true_false", question: "Les chauves-souris sont aveugles.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf4", type: "true_false", question: "L'eau chaude gèle plus vite que l'eau froide.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf5", type: "true_false", question: "Les humains n'utilisent que 10% de leur cerveau.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf6", type: "true_false", question: "Le Sahara est le plus grand désert du monde.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 }, // C'est l'Antarctique
  { id: "tf7", type: "true_false", question: "Les poissons rouges ont une mémoire de 3 secondes.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf8", type: "true_false", question: "Le miel ne se périme jamais.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf9", type: "true_false", question: "La foudre ne tombe jamais deux fois au même endroit.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf10", type: "true_false", question: "Napoléon Bonaparte était anormalement petit pour son époque.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },

  // 🔵 QCM (15 questions)
  { id: "qcm1", type: "qcm", question: "Quelle est la capitale de l'Australie ?", answer: "Canberra", options: ["Sydney", "Melbourne", "Canberra", "Perth"], points: 100 },
  { id: "qcm2", type: "qcm", question: "Quel est l'animal le plus rapide du monde en piqué ?", answer: "Le faucon pèlerin", options: ["Le guépard", "L'aigle royal", "Le faucon pèlerin", "L'espadon"], points: 100 },
  { id: "qcm3", type: "qcm", question: "Quel est le métal le plus abondant dans la croûte terrestre ?", answer: "L'aluminium", options: ["Le fer", "L'or", "Le cuivre", "L'aluminium"], points: 100 },
  { id: "qcm4", type: "qcm", question: "Qui a peint La Jeune Fille à la perle ?", answer: "Johannes Vermeer", options: ["Vincent van Gogh", "Johannes Vermeer", "Rembrandt", "Claude Monet"], points: 100 },
  { id: "qcm5", type: "qcm", question: "Combien y a-t-il de fuseaux horaires en Russie ?", answer: "11", options: ["7", "9", "11", "13"], points: 100 },
  { id: "qcm6", type: "qcm", question: "Quel est le plus grand océan de la Terre ?", answer: "Océan Pacifique", options: ["Océan Atlantique", "Océan Indien", "Océan Pacifique", "Océan Arctique"], points: 100 },
  { id: "qcm7", type: "qcm", question: "Quelle planète est surnommée l'étoile du berger ?", answer: "Vénus", options: ["Mars", "Vénus", "Jupiter", "Mercure"], points: 100 },
  { id: "qcm8", type: "qcm", question: "Dans quel pays se trouve la ville de Tombouctou ?", answer: "Mali", options: ["Sénégal", "Niger", "Mali", "Maroc"], points: 100 },
  { id: "qcm9", type: "qcm", question: "Quel est le nom du bateau dans Le Vieil Homme et la Mer ?", answer: "Il n'a pas de nom", options: ["L'Orca", "Le Pilar", "Le Pequod", "Il n'a pas de nom"], points: 100 },
  { id: "qcm10", type: "qcm", question: "Quel ingrédient principal compose le guacamole ?", answer: "Avocat", options: ["Tomate", "Avocat", "Piment", "Citron vert"], points: 100 },
  { id: "qcm11", type: "qcm", question: "Quel est le plus grand os du corps humain ?", answer: "Le fémur", options: ["Le tibia", "Le fémur", "L'humérus", "Le péroné"], points: 100 },
  { id: "qcm12", type: "qcm", question: "Quelle est la monnaie du Japon ?", answer: "Le Yen", options: ["Le Yuan", "Le Won", "Le Yen", "Le Ringgit"], points: 100 },
  { id: "qcm13", type: "qcm", question: "Qui est le dieu grec des enfers ?", answer: "Hadès", options: ["Ares", "Apollon", "Poséidon", "Hadès"], points: 100 },
  { id: "qcm14", type: "qcm", question: "Quelle série met en scène Walter White ?", answer: "Breaking Bad", options: ["Prison Break", "Dexter", "Breaking Bad", "The Wire"], points: 100 },
  { id: "qcm15", type: "qcm", question: "En informatique, que signifie 'RAM' ?", answer: "Random Access Memory", options: ["Read Access Memory", "Random Access Memory", "Run All Memory", "Real Allocation Mode"], points: 100 },

  // 🟠 ESTIMATION / JUSTE PRIX (15 questions)
  { id: "est1", type: "estimation", question: "Combien pèse la Tour Eiffel (en tonnes) ?", answer: 10100, points: 100 },
  { id: "est2", type: "estimation", question: "Combien de jours l'humain a-t-il passé dans l'espace en cumulé ? (à la louche)", answer: 29000, points: 100 },
  { id: "est3", type: "estimation", question: "Combien d'os y a-t-il dans le corps d'un adulte humain ?", answer: 206, points: 100 },
  { id: "est4", type: "estimation", question: "Combien de cœurs possède une pieuvre ?", answer: 3, points: 100 },
  { id: "est5", type: "estimation", question: "Quelle est la hauteur du Mont Blanc (en mètres, mesure stricte) ?", answer: 4805, points: 100 },
  { id: "est6", type: "estimation", question: "Combien d'épisodes compte la série Les Simpson (environ, fin 2023) ?", answer: 750, points: 100 },
  { id: "est7", type: "estimation", question: "En minutes, combien de temps dure le film Titanic ?", answer: 194, points: 100 },
  { id: "est8", type: "estimation", question: "Quelle est la distance Terre-Lune (en km, moyenne) ?", answer: 384400, points: 100 },
  { id: "est9", type: "estimation", question: "Combien de pattes a un mille-pattes commun (en moyenne) ?", answer: 300, points: 100 },
  { id: "est10", type: "estimation", question: "Combien de pays compte l'ONU ?", answer: 193, points: 100 },
  { id: "est11", type: "estimation", question: "Quelle est la vitesse maximale enregistrée par Usain Bolt (en km/h) ?", answer: 44, points: 100 },
  { id: "est12", type: "estimation", question: "Combien de touches y a-t-il sur un piano classique ?", answer: 88, points: 100 },
  { id: "est13", type: "estimation", question: "Combien de temps (en jours) dure la gestation d'une éléphante ?", answer: 640, points: 100 }, // ~21 mois
  { id: "est14", type: "estimation", question: "Combien de mètres mesure la plus grande statue du monde (Statue de l'Unité) ?", answer: 182, points: 100 },
  { id: "est15", type: "estimation", question: "Combien de kilomètres fait le fleuve Amazone (environ) ?", answer: 6400, points: 100 },

  // 🟣 QUESTIONS OUVERTES TEXTE (10 questions)
  { id: "op1", type: "open", question: "Quelle est la capitale du Japon ?", answer: "Tokyo", points: 100 },
  { id: "op2", type: "open", question: "Quel est le symbole chimique de l'or ?", answer: "Au", points: 100 },
  { id: "op3", type: "open", question: "Quelle planète est la plus proche du soleil ?", answer: "Mercure", points: 100 },
  { id: "op4", type: "open", question: "Qui a écrit Les Misérables ?", answer: "Victor Hugo", points: 100 },
  { id: "op5", type: "open", question: "Quel animal miaule ?", answer: "Chat", points: 100 },
  { id: "op6", type: "open", question: "De quelle couleur est le cheval blanc d'Henri IV ?", answer: "Blanc", points: 50 },
  { id: "op7", type: "open", question: "Quel est le plus grand pays du monde en superficie ?", answer: "Russie", points: 100 },
  { id: "op8", type: "open", question: "Quelle est la monnaie utilisée au Royaume-Uni ?", answer: "Livre", points: 100 }, // Accepte Livre ou Livre sterling (à gérer dans la tolérance plus tard)
  { id: "op9", type: "open", question: "Quel fruit est le logo de l'entreprise de Steve Jobs ?", answer: "Pomme", points: 50 },
  { id: "op10", type: "open", question: "Comment s'appelle l'éponge jaune qui vit dans un ananas sous la mer ?", answer: "Bob", points: 100 },

  // 🔴 DATES (Années exactes - On utilise le pavé numérique comme pour les estimations)
  { id: "date1", type: "date", question: "En quelle année le Titanic a-t-il coulé ?", answer: 1912, points: 150 },
  { id: "date2", type: "date", question: "En quelle année a eu lieu la Révolution Française ?", answer: 1789, points: 150 },
  { id: "date3", type: "date", question: "En quelle année l'homme a-t-il marché sur la Lune ?", answer: 1969, points: 150 },
  { id: "date4", type: "date", question: "En quelle année est sorti le tout premier iPhone ?", answer: 2007, points: 150 },
  { id: "date5", type: "date", question: "En quelle année s'est terminée la Seconde Guerre mondiale ?", answer: 1945, points: 150 },
  { id: "date6", type: "date", question: "En quelle année a eu lieu la chute du mur de Berlin ?", answer: 1989, points: 150 },
  { id: "date7", type: "date", question: "En quelle année est sorti le premier film Star Wars au cinéma ?", answer: 1977, points: 150 },
  { id: "date8", type: "date", question: "En quelle année Christophe Colomb a-t-il découvert l'Amérique ?", answer: 1492, points: 150 },
  { id: "date9", type: "date", question: "En quelle année la France a-t-elle gagné sa première Coupe du Monde de foot ?", answer: 1998, points: 150 },
  { id: "date10", type: "date", question: "En quelle année a été lancée la console PlayStation 1 en Europe ?", answer: 1995, points: 150 },
];

// --- GÉNÉRATEUR DYNAMIQUE DE QUESTIONS ---
export function getRandomQuestions(count: number): QuizQuestion[] {
  // 1. On mélange la grande banque de questions
  const shuffled = [...QUIZ_BANK].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, QUIZ_BANK.length));

  // 2. LA MAGIE DU MINI-BAC : 
  // Si la partie comporte au moins 5 questions, on injecte 1 ou 2 Mini-Bacs aléatoires !
  if (count >= 5) {
    const numMiniBacs = count >= 15 ? 2 : 1; // 2 mini-bacs si c'est une très longue partie
    
    for (let i = 0; i < numMiniBacs; i++) {
      // Choix d'une lettre au hasard
      const randomLetter = MINI_BAC_LETTERS[Math.floor(Math.random() * MINI_BAC_LETTERS.length)];
      
      // Choix de 4 catégories au hasard
      const shuffledCategories = [...MINI_BAC_CATEGORIES].sort(() => 0.5 - Math.random()).slice(0, 4);
      
      const miniBacQuestion: QuizQuestion = {
        id: `minibac-${Date.now()}-${i}`,
        type: "minibac",
        question: `Mini-Bac : Lettre ${randomLetter}`, // Le titre de la question
        answer: "vote", // L'answer n'est pas fixe, elle dépendra du vote !
        points: 200, // Le mini-bac rapporte gros
        letter: randomLetter,
        categories: shuffledCategories
      };

      // On remplace une question normale (vers la fin du quiz pour le suspense) par ce Mini-Bac
      const replaceIndex = Math.floor(count * 0.6) + i; 
      if (replaceIndex < selected.length) {
        selected[replaceIndex] = miniBacQuestion;
      }
    }
  }

  return selected;
}