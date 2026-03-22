export type QuestionType =
  | "qcm"
  | "estimation"
  | "open"
  | "date"
  | "minibac"
  | "true_false"
  | "geo_flag"
  | "geo_shape";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  answer: string | number;
  options?: string[]; // Pour QCM / Vrai_Faux
  points: number;
  /** ISO 3166-1 alpha-2 (ex. fr, de) — pour drapeau / silhouette */
  countryCode?: string;
  /** Autres libellés acceptés (ex. USA / États-Unis) */
  answerAliases?: string[];
  // Spécial Mini-Bac
  letter?: string;
  categories?: string[];
}

/** Drapeau (PNG) via flagcdn — code pays en minuscules recommandé. */
export function buildGeoFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}

/**
 * Silhouette du pays (PNG) — jeu d’icônes mapsicon (GitHub).
 * Même code ISO que pour le drapeau.
 */
export function buildGeoShapeUrl(countryCode: string): string {
  return `https://cdn.jsdelivr.net/gh/djaiss/mapsicon@master/countries/${countryCode.toLowerCase()}/128.png`;
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
  { id: "tf11", type: "true_false", question: "Les autruches enfouissent leur tête dans le sable quand elles ont peur.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf12", type: "true_false", question: "Un an sur Vénus est plus court qu'un jour sur Vénus.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf13", type: "true_false", question: "Le sang des homards est bleu.", answer: "Vrai", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf14", type: "true_false", question: "La langue est le muscle le plus fort du corps humain.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf15", type: "true_false", question: "Les requins sont des mammifères.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf16", type: "true_false", question: "Le drapeau du Népal est le seul au monde à ne pas être rectangulaire.", answer: "Vrai", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf17", type: "true_false", question: "Walt Disney detient le record du plus grand nombre d'Oscars remportés.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf18", type: "true_false", question: "L'inventeur de la machine à barbe à papa était un dentiste.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf19", type: "true_false", question: "Le cri du canard ne produit pas d'écho.", answer: "Faux", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf20", type: "true_false", question: "Il y a plus d'étoiles dans l'univers que de grains de sable sur Terre.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf21", type: "true_false", question: "La lune est plus grande que l'Australie.", answer: "Faux", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf22", type: "true_false", question: "Les pieuvres ont trois cœurs.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf23", type: "true_false", question: "Le record de survie d'un poulet sans tête est de 18 mois.", answer: "Vrai", options: ["Vrai", "Faux"], points: 80 },
  { id: "tf24", type: "true_false", question: "L'Everest est la montagne la plus proche de l'espace.", answer: "Faux", options: ["Vrai", "Faux"], points: 70 }, // C'est le volcan Chimborazo
  { id: "tf25", type: "true_false", question: "Un hippopotame peut courir plus vite qu'un humain.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf26", type: "true_false", question: "La France est le pays avec le plus de fuseaux horaires au monde.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf27", type: "true_false", question: "Les bananes poussent sur des arbres.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 }, // C'est une plante herbacée
  { id: "tf28", type: "true_false", question: "Le son voyage plus vite dans l'eau que dans l'air.", answer: "Vrai", options: ["Vrai", "Faux"], points: 60 },

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
  { id: "qcm16", type: "qcm", question: "Quel gaz compose majoritairement l'air que nous respirons ?", answer: "Azote", options: ["Oxygène", "Azote", "Gaz carbonique", "Hydrogène"], points: 100 },
  { id: "qcm17", type: "qcm", question: "Quel pays a remporté le plus de Coupes du Monde de football ?", answer: "Brésil", options: ["Allemagne", "Italie", "France", "Brésil"], points: 100 },
  { id: "qcm18", type: "qcm", question: "Quelle est la capitale de l'Islande ?", answer: "Reykjavik", options: ["Oslo", "Reykjavik", "Stockholm", "Helsinki"], points: 100 },
  { id: "qcm19", type: "qcm", question: "Qui a écrit le roman '1984' ?", answer: "George Orwell", options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Ernest Hemingway"], points: 100 },
  { id: "qcm20", type: "qcm", question: "Quelle est la vitesse de la lumière (environ) ?", answer: "300 000 km/s", options: ["150 000 km/s", "300 000 km/s", "1 000 000 km/s", "300 000 km/h"], points: 120 },
  { id: "qcm21", type: "qcm", question: "Quel est le plus grand pays du monde par la taille ?", answer: "Russie", options: ["Canada", "Chine", "États-Unis", "Russie"], points: 80 },
  { id: "qcm22", type: "qcm", question: "Dans quelle ville se trouve le Colisée ?", answer: "Rome", options: ["Athènes", "Rome", "Naples", "Florence"], points: 80 },
  { id: "qcm23", type: "qcm", question: "Quel est le nom de la galaxie dans laquelle nous vivons ?", answer: "La Voie Lactée", options: ["Andromède", "La Voie Lactée", "La Grande Ourse", "Orion"], points: 100 },
  { id: "qcm24", type: "qcm", question: "Quel est l'oiseau qui pond les plus gros œufs ?", answer: "L'autruche", options: ["L'aigle", "L'autruche", "Le condor", "L'émeu"], points: 100 },
  { id: "qcm25", type: "qcm", question: "Dans quelle ville se trouve le siège de l'ONU ?", answer: "New York", options: ["Genève", "Washington", "New York", "Bruxelles"], points: 100 },
  { id: "qcm26", type: "qcm", question: "Quel est l'élément chimique le plus léger ?", answer: "Hydrogène", options: ["Hélium", "Oxygène", "Azote", "Hydrogène"], points: 100 },
  { id: "qcm27", type: "qcm", question: "Qui a écrit 'Les Fleurs du Mal' ?", answer: "Charles Baudelaire", options: ["Victor Hugo", "Charles Baudelaire", "Arthur Rimbaud", "Paul Verlaine"], points: 100 },
  { id: "qcm28", type: "qcm", question: "Combien de cordes possède une guitare classique ?", answer: "6", options: ["4", "5", "6", "12"], points: 80 },
  { id: "qcm29", type: "qcm", question: "Quel est le plus petit pays du monde ?", answer: "Vatican", options: ["Monaco", "Saint-Marin", "Vatican", "Andorre"], points: 100 },
  { id: "qcm30", type: "qcm", question: "Quelle est la capitale du Canada ?", answer: "Ottawa", options: ["Toronto", "Montréal", "Ottawa", "Québec"], points: 100 },
  { id: "qcm31", type: "qcm", question: "Quel organe produit l'insuline ?", answer: "Le pancréas", options: ["Le foie", "Le pancréas", "La rate", "Les reins"], points: 120 },
  { id: "qcm32", type: "qcm", question: "Qui a réalisé le film 'Inception' ?", answer: "Christopher Nolan", options: ["Steven Spielberg", "Christopher Nolan", "Quentin Tarantino", "Martin Scorsese"], points: 100 },
  { id: "qcm33", type: "qcm", question: "Quel est le plus grand mammifère terrestre ?", answer: "L'éléphant d'Afrique", options: ["Le rhinocéros", "L'éléphant d'Afrique", "La girafe", "L'hippopotame"], points: 80 },

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
  { id: "est16", type: "estimation", question: "Combien de dents possède un humain adulte (sans dents de sagesse) ?", answer: 28, points: 100 },
  { id: "est17", type: "estimation", question: "Quelle est la population mondiale en milliards (2024) ?", answer: 8, points: 100 },
  { id: "est18", type: "estimation", question: "Combien de marches compte la Tour Eiffel jusqu'au sommet ?", answer: 1665, points: 150 },
  { id: "est19", type: "estimation", question: "Combien de pays y a-t-il officiellement en Afrique ?", answer: 54, points: 120 },
  { id: "est20", type: "estimation", question: "Quelle est la longueur de la Grande Muraille de Chine en km ?", answer: 21196, points: 200 },
  { id: "est21", type: "estimation", question: "Combien de jours dure une année sur Mars ?", answer: 687, points: 150 },
  { id: "est22", type: "estimation", question: "Combien d'États compte les États-Unis d'Amérique ?", answer: 50, points: 80 },
  { id: "est23", type: "estimation", question: "Quelle est la température en surface du Soleil (en degrés Celsius) ?", answer: 5500, points: 200 },
  { id: "est24", type: "estimation", question: "Combien de litres de sang contient le corps d'un adulte (environ) ?", answer: 5, points: 100 },
  { id: "est25", type: "estimation", question: "Combien d'États membres compte l'Union Européenne (en 2024) ?", answer: 27, points: 100 },
  { id: "est26", type: "estimation", question: "Combien de secondes y a-t-il dans une journée ?", answer: 86400, points: 150 },
  { id: "est27", type: "estimation", question: "Quelle est la profondeur moyenne de l'océan (en mètres) ?", answer: 3700, points: 150 },
  { id: "est28", type: "estimation", question: "Combien de pays ont le français comme langue officielle ?", answer: 29, points: 120 },
  { id: "est29", type: "estimation", question: "Combien d'anneaux compose le logo des Jeux Olympiques ?", answer: 5, points: 50 },
  { id: "est30", type: "estimation", question: "Combien de pièces y a-t-il au début d'une partie d'échecs (total) ?", answer: 32, points: 100 },
  { id: "est31", type: "estimation", question: "Quelle est la longueur de la piscine olympique (en mètres) ?", answer: 50, points: 80 },
  { id: "est32", type: "estimation", question: "En kilomètres, quelle est la circonférence de la Terre ?", answer: 40075, points: 200 },
  { id: "est33", type: "estimation", question: "Combien d'atomes d'oxygène y a-t-il dans une molécule d'eau ?", answer: 1, points: 50 },

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
  { id: "op10", type: "open", question: "Comment s'appelle l'éponge jaune qui vit dans un ananas sous la mer ?", answer: "Bob l'Éponge", points: 100 },
  { id: "op11", type: "open", question: "Quel est l'organe le plus lourd du corps humain ?", answer: "Peau", points: 120 },
  { id: "op12", type: "open", question: "Quel pays est surnommé le pays du Soleil Levant ?", answer: "Japon", points: 80 },
  { id: "op13", type: "open", question: "Quel est le métal dont le symbole chimique est Fe ?", answer: "Fer", points: 100 },
  { id: "op14", type: "open", question: "Quelle est la capitale de l'Espagne ?", answer: "Madrid", points: 80 },
  { id: "op15", type: "open", question: "Quel artiste est célèbre pour avoir peint la Joconde ?", answer: "Léonard de Vinci", points: 100 },
  { id: "op16", type: "open", question: "Comment appelle-t-on le bébé du cheval ?", answer: "Poulain", points: 80 },
  { id: "op17", type: "open", question: "Dans quel pays peut-on visiter les pyramides de Gizeh ?", answer: "Égypte", points: 80 },
  { id: "op18", type: "open", question: "Quel est le plus long fleuve du monde ?", answer: "Nil", points: 100 },
  { id: "op19", type: "open", question: "Quelle est la capitale du Portugal ?", answer: "Lisbonne", points: 100 },
  { id: "op20", type: "open", question: "Quel est le nom du scientifique qui a formulé la théorie de la relativité ?", answer: "Einstein", points: 100 },
  { id: "op21", type: "open", question: "De quel pays vient la pizza ?", answer: "Italie", points: 50 },
  { id: "op22", type: "open", question: "Quel est le plus grand continent du monde ?", answer: "Asie", points: 80 },
  { id: "op23", type: "open", question: "Comment s'appelle la peur des araignées ?", answer: "Arachnophobie", points: 120 },
  { id: "op24", type: "open", question: "Quelle planète est surnommée la planète rouge ?", answer: "Mars", points: 80 },
  { id: "op25", type: "open", question: "Quel est le prénom du célèbre sorcier Potter ?", answer: "Harry", points: 50 },
  { id: "op26", type: "open", question: "Dans quel sport utilise-t-on un volant ?", answer: "Badminton", points: 100 },
  { id: "op27", type: "open", question: "Quel est l'animal le plus haut du monde ?", answer: "Girafe", points: 80 },
  { id: "op28", type: "open", question: "Quel océan borde la côte ouest des États-Unis ?", answer: "Pacifique", points: 100 },

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
  { id: "date11", type: "date", question: "En quelle année l'Euro a-t-il été mis en circulation ?", answer: 2002, points: 150 },
  { id: "date12", type: "date", question: "En quelle année Facebook a-t-il été créé ?", answer: 2004, points: 150 },
  { id: "date13", type: "date", question: "En quelle année a eu lieu l'attentat des tours jumelles (9/11) ?", answer: 2001, points: 120 },
  { id: "date14", type: "date", question: "En quelle année Napoléon Ier est-il mort à Sainte-Hélène ?", answer: 1821, points: 180 },
  { id: "date15", type: "date", question: "En quelle année a été signée la Déclaration d'Indépendance des USA ?", answer: 1776, points: 200 },
  { id: "date16", type: "date", question: "En quelle année a été inaugurée la Tour Eiffel ?", answer: 1889, points: 150 },
  { id: "date17", type: "date", question: "En quelle année a été lancé le premier iPhone ?", answer: 2007, points: 120 },
  { id: "date18", type: "date", question: "En quelle année s'est terminé le règne de Louis XIV ?", answer: 1715, points: 200 },
  { id: "date19", type: "date", question: "En quelle année l'Algérie est-elle devenue indépendante ?", answer: 1962, points: 150 },
  { id: "date20", type: "date", question: "En quelle année est mort Michael Jackson ?", answer: 2009, points: 120 },
  { id: "date21", type: "date", question: "En quelle année a été inventé le World Wide Web (Web) ?", answer: 1989, points: 180 },
  { id: "date22", type: "date", question: "En quelle année l'esclavage a-t-il été définitivement aboli en France ?", answer: 1848, points: 200 },
  { id: "date23", type: "date", question: "En quelle année a été lancé le télescope spatial Hubble ?", answer: 1990, points: 150 },
  { id: "date24", type: "date", question: "En quelle année l'URSS a-t-elle été dissoute ?", answer: 1991, points: 150 },
  { id: "date25", type: "date", question: "En quelle année a eu lieu le premier vol des frères Wright ?", answer: 1903, points: 200 },
  { id: "date26", type: "date", question: "En quelle année Nelson Mandela a-t-il été libéré de prison ?", answer: 1990, points: 180 },
  { id: "date27", type: "date", question: "En quelle année a débuté la guerre du Vietnam ?", answer: 1955, points: 200 },
  { id: "date28", type: "date", question: "En quelle année a été fondé l'empire romain ?", answer: -27, points: 250 },

  // 🌍 GÉO — DRAPEAU (écrire le pays)
  {
    id: "gf1",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "France",
    countryCode: "fr",
    points: 120,
  },
  {
    id: "gf2",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Japon",
    countryCode: "jp",
    points: 120,
  },
  {
    id: "gf3",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Brésil",
    countryCode: "br",
    points: 120,
  },
  {
    id: "gf4",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Canada",
    countryCode: "ca",
    points: 120,
  },
  {
    id: "gf5",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Allemagne",
    countryCode: "de",
    points: 120,
  },
  {
    id: "gf6",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Italie",
    countryCode: "it",
    points: 120,
  },
  {
    id: "gf7",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Mexique",
    countryCode: "mx",
    points: 120,
  },
  {
    id: "gf8",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Australie",
    countryCode: "au",
    points: 120,
  },
  {
    id: "gf9",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Inde",
    countryCode: "in",
    points: 120,
  },
  {
    id: "gf10",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Argentine",
    countryCode: "ar",
    points: 120,
  },
  {
    id: "gf11",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Portugal",
    countryCode: "pt",
    points: 120,
  },
  {
    id: "gf12",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Norvège",
    countryCode: "no",
    points: 120,
  },
  {
    id: "gf13",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "États-Unis",
    answerAliases: ["USA", "Etats-Unis", "United States"],
    countryCode: "us",
    points: 120,
  },
  {
    id: "gf14",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Royaume-Uni",
    answerAliases: ["UK", "Angleterre", "Grande-Bretagne"],
    countryCode: "gb",
    points: 120,
  },
  {
    id: "gf15",
    type: "geo_flag",
    question: "Quel pays correspond à ce drapeau ?",
    answer: "Corée du Sud",
    answerAliases: ["Coree du Sud", "Corée", "Coree"],
    countryCode: "kr",
    points: 130,
  },

  // 🗺️ GÉO — SILHOUETTE (forme du pays)
  {
    id: "gs1",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "France",
    countryCode: "fr",
    points: 140,
  },
  {
    id: "gs2",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Italie",
    countryCode: "it",
    points: 140,
  },
  {
    id: "gs3",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Espagne",
    countryCode: "es",
    points: 140,
  },
  {
    id: "gs4",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Allemagne",
    countryCode: "de",
    points: 140,
  },
  {
    id: "gs5",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Grèce",
    countryCode: "gr",
    points: 140,
  },
  {
    id: "gs6",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Norvège",
    countryCode: "no",
    points: 140,
  },
  {
    id: "gs7",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Japon",
    countryCode: "jp",
    points: 140,
  },
  {
    id: "gs8",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Chili",
    countryCode: "cl",
    points: 150,
  },
  {
    id: "gs9",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Vietnam",
    countryCode: "vn",
    points: 150,
  },
  {
    id: "gs10",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Croatie",
    countryCode: "hr",
    points: 150,
  },
  {
    id: "gs11",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Islande",
    countryCode: "is",
    points: 150,
  },
  {
    id: "gs12",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Madagascar",
    countryCode: "mg",
    points: 150,
  },
  {
    id: "gs13",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "États-Unis",
    answerAliases: ["USA", "Etats-Unis"],
    countryCode: "us",
    points: 130,
  },
  {
    id: "gs14",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Brésil",
    countryCode: "br",
    points: 130,
  },
  {
    id: "gs15",
    type: "geo_shape",
    question: "À quel pays correspond cette forme ?",
    answer: "Australie",
    countryCode: "au",
    points: 130,
  },
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