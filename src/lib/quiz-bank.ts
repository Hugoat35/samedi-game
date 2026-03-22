import { GEO_FLAG_ROWS, GEO_SHAPE_ROWS } from "./geo-quiz-data";

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
 * Les fichiers sont sous `all/{code iso}/128.png`, pas `countries/…`.
 */
export function buildGeoShapeUrl(countryCode: string): string {
  return `https://cdn.jsdelivr.net/gh/djaiss/mapsicon@master/all/${countryCode.toLowerCase()}/128.png`;
}

const GEO_FLAG_QUESTIONS: QuizQuestion[] = GEO_FLAG_ROWS.map((r, i) => ({
  id: `gf-${i}-${r.code}`,
  type: "geo_flag",
  question: "Quel pays correspond à ce drapeau ?",
  answer: r.answer,
  answerAliases: r.aliases,
  countryCode: r.code,
  points: 120,
}));

const GEO_SHAPE_QUESTIONS: QuizQuestion[] = GEO_SHAPE_ROWS.map((r, i) => ({
  id: `gs-${i}-${r.code}`,
  type: "geo_shape",
  question: "À quel pays correspond cette forme ?",
  answer: r.answer,
  answerAliases: r.aliases,
  countryCode: r.code,
  points: 140,
}));

// Les catégories possibles pour le Mini-Bac
const MINI_BAC_CATEGORIES = [
  "Un pays", "Un fruit ou légume", "Un métier", "Un animal", "Une marque",
  "Un prénom masculin", "Un prénom féminin", "Un sport", "Un objet du quotidien",
  "Une célébrité", "Un vêtement", "Une ville", "Un film ou série",
  "Un instrument de musique", "Un moyen de transport", "Une chose qu'on trouve dans une cuisine",
  "Un super-pouvoir", "Un gros mot poli", "Un truc qui pue"
];

// Mini-Bac : pas de U, W, X, Y, Z (trop difficiles / peu de mots)
const MINI_BAC_LETTERS = "ABCDEFGHIJKLMNOPQRSTV";

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
  { id: "tf29", type: "true_false", question: "L'ADN humain est identique à 50% à celui d'une banane.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf30", type: "true_false", question: "Le cœur d'une crevette se situe dans sa tête.", answer: "Vrai", options: ["Vrai", "Faux"], points: 80 },
  { id: "tf31", type: "true_false", question: "Les antibiotiques sont efficaces contre les virus.", answer: "Faux", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf32", type: "true_false", question: "Le fémur est l'os le plus solide du corps humain.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf33", type: "true_false", question: "Le son peut se propager dans le vide spatial.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf34", type: "true_false", question: "Les neurones sont les seules cellules du corps qui ne se divisent jamais.", answer: "Faux", options: ["Vrai", "Faux"], points: 90 },
  { id: "tf35", type: "true_false", question: "Un éclair est cinq fois plus chaud que la surface du Soleil.", answer: "Vrai", options: ["Vrai", "Faux"], points: 80 },
  { id: "tf36", type: "true_false", question: "Les veines transportent toujours du sang pauvre en oxygène.", answer: "Faux", options: ["Vrai", "Faux"], points: 100 }, // Exception : veines pulmonaires

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
  { id: "qcm34", type: "qcm", question: "Quel empire était dirigé par Soliman le Magnifique ?", answer: "L'Empire Ottoman", options: ["L'Empire Perse", "L'Empire Ottoman", "L'Empire Moghol", "L'Empire Romain"], points: 100 },
  { id: "qcm35", type: "qcm", question: "Quelle est la capitale la plus haute du monde (altitude) ?", answer: "La Paz", options: ["Quito", "La Paz", "Bogota", "Lhassa"], points: 120 },
  { id: "qcm36", type: "qcm", question: "En quelle année a été découvert le tombeau de Toutânkhamon ?", answer: "1922", options: ["1898", "1912", "1922", "1936"], points: 100 },
  { id: "qcm37", type: "qcm", question: "Lequel de ces pays ne possède pas d'accès à la mer ?", answer: "Suisse", options: ["Belgique", "Suisse", "Norvège", "Portugal"], points: 80 },
  { id: "qcm38", type: "qcm", question: "Qui était le président des USA durant la Guerre de Sécession ?", answer: "Abraham Lincoln", options: ["George Washington", "Andrew Jackson", "Abraham Lincoln", "Ulysses S. Grant"], points: 100 },
  { id: "qcm39", type: "qcm", question: "Quel fleuve traverse le plus grand nombre de pays ?", answer: "Le Danube", options: ["Le Nil", "L'Amazone", "Le Danube", "Le Rhin"], points: 120 },
  { id: "qcm40", type: "qcm", question: "Quelle était la capitale de l'Empire Inca ?", answer: "Cuzco", options: ["Machu Picchu", "Lima", "Quito", "Cuzco"], points: 100 },
  { id: "qcm41", type: "qcm", question: "Quel pays possède le plus d'îles au monde ?", answer: "La Suède", options: ["L'Indonésie", "La Grèce", "Le Canada", "La Suède"], points: 150 }, // Plus de 220 000 îles !

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
  { id: "est34", type: "estimation", question: "Combien d'éléments contient le tableau périodique actuel ?", answer: 118, points: 100 },
  { id: "est35", type: "estimation", question: "Quelle est la distance entre la Terre et Mars (en millions de km, au plus proche) ?", answer: 55, points: 150 },
  { id: "est36", type: "estimation", question: "Combien de muscles possède le corps humain (environ) ?", answer: 650, points: 100 },
  { id: "est37", type: "estimation", question: "Combien de temps met la lumière du Soleil pour atteindre la Terre (en secondes) ?", answer: 499, points: 150 }, // ~8 min 19s
  { id: "est38", type: "estimation", question: "Quel est le record du monde de durée de sommeil pour un humain (en heures) ?", answer: 264, points: 200 }, // Expérience de Randy Gardner
  { id: "est39", type: "estimation", question: "Combien de battements de cœur un humain fait-il en moyenne par minute au repos ?", answer: 70, points: 50 },
  { id: "est40", type: "estimation", question: "Quelle est la température du zéro absolu (en degrés Celsius) ?", answer: -273, points: 150 },
  { id: "est41", type: "estimation", question: "Combien de vertèbres compose la colonne dorsale humaine ?", answer: 33, points: 120 },

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
  { id: "op29", type: "open", question: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?", answer: "Dioxyde de carbone", points: 100 },
  { id: "op30", type: "open", question: "Comment appelle-t-on la partie colorée de l'œil ?", answer: "Iris", points: 80 },
  { id: "op31", type: "open", question: "Qui a découvert la pénicilline ?", answer: "Fleming", points: 150 },
  { id: "op32", type: "open", question: "Quelle est la plus grande glande du corps humain ?", answer: "Foie", points: 120 },
  { id: "op33", type: "open", question: "Quel instrument utilise un médecin pour écouter le cœur ?", answer: "Stéthoscope", points: 100 },
  { id: "op34", type: "open", question: "Dans quel pays se trouve le mont Kilimandjaro ?", answer: "Tanzanie", points: 120 },
  { id: "op35", type: "open", question: "Quel est le nom du pigment qui donne la couleur à la peau ?", answer: "Mélanine", points: 100 },
  { id: "op36", type: "open", question: "Quel acide trouve-t-on en abondance dans l'estomac ?", answer: "Chlorhydrique", points: 130 },

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
  { id: "date29", type: "date", question: "En quelle année a commencé la construction de la pyramide de Khéops (environ) ?", answer: -2560, points: 250 },
  { id: "date30", type: "date", question: "En quelle année l'esclavage a-t-il été aboli aux États-Unis ?", answer: 1865, points: 150 },
  { id: "date31", type: "date", question: "En quelle année a été fondée l'ONU ?", answer: 1945, points: 100 },
  { id: "date32", type: "date", question: "En quelle année Einstein a-t-il publié la théorie de la relativité générale ?", answer: 1915, points: 180 },
  { id: "date33", type: "date", question: "En quelle année a eu lieu la première transplantation cardiaque ?", answer: 1967, points: 200 },
  { id: "date34", type: "date", question: "En quelle année s'est terminé l'Empire Romain d'Occident ?", answer: 476, points: 150 },
  { id: "date35", type: "date", question: "En quelle année a été lancé le premier satellite artificiel, Spoutnik ?", answer: 1957, points: 150 },
  { id: "date36", type: "date", question: "En quelle année la structure de l'ADN a-t-elle été découverte ?", answer: 1953, points: 180 },

  ...GEO_FLAG_QUESTIONS,
  ...GEO_SHAPE_QUESTIONS,
];

/** Entier uniforme dans [0, n) — préfère crypto pour un tirage moins prévisible. */
function randomIntBelow(n: number): number {
  if (n <= 0) return 0;
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0]! % n;
  }
  return Math.floor(Math.random() * n);
}

/** Mélange équitable (Fisher–Yates) : chaque permutation a la même probabilité. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomIntBelow(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// --- GÉNÉRATEUR DYNAMIQUE DE QUESTIONS ---
/** Tirage uniforme sans remise : chaque entrée de la banque a la même probabilité (géo ou non). */
export function getRandomQuestions(count: number): QuizQuestion[] {
  const shuffled = shuffle([...QUIZ_BANK]);
  let selected = shuffled.slice(0, Math.min(count, QUIZ_BANK.length));

  // 2. LA MAGIE DU MINI-BAC (indices basés sur la taille réelle du lot tiré)
  if (count >= 5 && selected.length >= 5) {
    const numMiniBacs = count >= 15 ? 2 : 1;

    for (let i = 0; i < numMiniBacs; i++) {
      const randomLetter = MINI_BAC_LETTERS[randomIntBelow(MINI_BAC_LETTERS.length)]!;
      const shuffledCategories = shuffle([...MINI_BAC_CATEGORIES]).slice(0, 4);

      const miniBacQuestion: QuizQuestion = {
        id: `minibac-${Date.now()}-${i}-${randomIntBelow(1_000_000_000)}`,
        type: "minibac",
        question: `Mini-Bac : Lettre ${randomLetter}`,
        answer: "vote",
        points: 200,
        letter: randomLetter,
        categories: shuffledCategories,
      };

      const replaceIndex = Math.floor(selected.length * 0.6) + i;
      if (replaceIndex < selected.length) {
        selected[replaceIndex] = miniBacQuestion;
      }
    }
  }

  return selected;
}