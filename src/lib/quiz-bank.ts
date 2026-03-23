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

// NOUVEAU : Les thèmes pour le filtre de la partie
export type QuestionTheme = "Géographie" | "Sciences" | "Histoire" | "Culture G" | "Mini-Bac" | "Sport" | "Dessin animé";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  theme: QuestionTheme; // Ajout de la propriété obligatoire
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

/** ~10 % de questions drapeau / silhouette en moins dans la banque (probabilité d’apparition réduite). */
const GEO_IN_POOL_RATIO = 0.9;

/** Points affichés + attribués au Tribunal par case acceptée (aligné sur `MINIBAC_POINTS_PER_CELL` dans lobby-remote). */
const MINIBAC_POINTS_PER_VALIDATED_CELL = 20;

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

/** Mélange équitable (Fisher–Yates). */
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
  // 🟢 VRAI OU FAUX
  { id: "tf1", type: "true_false", theme: "Géographie", question: "La Grande Muraille de Chine est visible depuis la Lune à l'œil nu.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf2", type: "true_false", theme: "Sciences", question: "La tomate est botaniquement un fruit.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf3", type: "true_false", theme: "Sciences", question: "Les chauves-souris sont aveugles.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf4", type: "true_false", theme: "Sciences", question: "L'eau chaude gèle plus vite que l'eau froide.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf5", type: "true_false", theme: "Sciences", question: "Les humains n'utilisent que 10% de leur cerveau.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf6", type: "true_false", theme: "Géographie", question: "Le Sahara est le plus grand désert du monde.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf7", type: "true_false", theme: "Sciences", question: "Les poissons rouges ont une mémoire de 3 secondes.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf8", type: "true_false", theme: "Sciences", question: "Le miel ne se périme jamais.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf9", type: "true_false", theme: "Sciences", question: "La foudre ne tombe jamais deux fois au même endroit.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf10", type: "true_false", theme: "Histoire", question: "Napoléon Bonaparte était anormalement petit pour son époque.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf11", type: "true_false", theme: "Sciences", question: "Les autruches enfouissent leur tête dans le sable quand elles ont peur.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf12", type: "true_false", theme: "Sciences", question: "Un an sur Vénus est plus court qu'un jour sur Vénus.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf13", type: "true_false", theme: "Sciences", question: "Le sang des homards est bleu.", answer: "Vrai", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf14", type: "true_false", theme: "Sciences", question: "La langue est le muscle le plus fort du corps humain.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf15", type: "true_false", theme: "Sciences", question: "Les requins sont des mammifères.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf16", type: "true_false", theme: "Géographie", question: "Le drapeau du Népal est le seul au monde à ne pas être rectangulaire.", answer: "Vrai", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf17", type: "true_false", theme: "Culture G", question: "Walt Disney detient le record du plus grand nombre d'Oscars remportés.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf18", type: "true_false", theme: "Culture G", question: "L'inventeur de la machine à barbe à papa était un dentiste.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf19", type: "true_false", theme: "Sciences", question: "Le cri du canard ne produit pas d'écho.", answer: "Faux", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf20", type: "true_false", theme: "Sciences", question: "Il y a plus d'étoiles dans l'univers que de grains de sable sur Terre.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf21", type: "true_false", theme: "Géographie", question: "La lune est plus grande que l'Australie.", answer: "Faux", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf22", type: "true_false", theme: "Sciences", question: "Les pieuvres ont trois cœurs.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf23", type: "true_false", theme: "Sciences", question: "Le record de survie d'un poulet sans tête est de 18 mois.", answer: "Vrai", options: ["Vrai", "Faux"], points: 80 },
  { id: "tf24", type: "true_false", theme: "Géographie", question: "L'Everest est la montagne la plus proche de l'espace.", answer: "Faux", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf25", type: "true_false", theme: "Sciences", question: "Un hippopotame peut courir plus vite qu'un humain.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf26", type: "true_false", theme: "Géographie", question: "La France est le pays avec le plus de fuseaux horaires au monde.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf27", type: "true_false", theme: "Sciences", question: "Les bananes poussent sur des arbres.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf28", type: "true_false", theme: "Sciences", question: "Le son voyage plus vite dans l'eau que dans l'air.", answer: "Vrai", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf29", type: "true_false", theme: "Sciences", question: "L'ADN humain est identique à 50% à celui d'une banane.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf30", type: "true_false", theme: "Sciences", question: "Le cœur d'une crevette se situe dans sa tête.", answer: "Vrai", options: ["Vrai", "Faux"], points: 80 },
  { id: "tf31", type: "true_false", theme: "Sciences", question: "Les antibiotiques sont efficaces contre les virus.", answer: "Faux", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf32", type: "true_false", theme: "Sciences", question: "Le fémur est l'os le plus solide du corps humain.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf33", type: "true_false", theme: "Sciences", question: "Le son peut se propager dans le vide spatial.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf34", type: "true_false", theme: "Sciences", question: "Les neurones sont les seules cellules du corps qui ne se divisent jamais.", answer: "Faux", options: ["Vrai", "Faux"], points: 90 },
  { id: "tf35", type: "true_false", theme: "Sciences", question: "Un éclair est cinq fois plus chaud que la surface du Soleil.", answer: "Vrai", options: ["Vrai", "Faux"], points: 80 },
  { id: "tf36", type: "true_false", theme: "Sciences", question: "Les veines transportent toujours du sang pauvre en oxygène.", answer: "Faux", options: ["Vrai", "Faux"], points: 100 },
  { id: "tf-sp1", type: "true_false", theme: "Sport", question: "Le tennis de table est un sport olympique.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-sp2", type: "true_false", theme: "Sport", question: "Au tennis, le point qui vient après 30 est 45.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-sp3", type: "true_false", theme: "Sport", question: "Un match de rugby à XV dure 80 minutes.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-da1", type: "true_false", theme: "Dessin animé", question: "Pikachu est un Pokémon de type Électrik.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-da2", type: "true_false", theme: "Dessin animé", question: "Dans 'Toy Story', le dinosaure vert s'appelle Woody.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-sp4", type: "true_false", theme: "Sport", question: "Usain Bolt détient le record du monde du 100m.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-sp5", type: "true_false", theme: "Sport", question: "Au basket-ball, un tir réussi de très loin vaut 4 points.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-sp6", type: "true_false", theme: "Sport", question: "Le Tour de France est la compétition cycliste la plus suivie au monde.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-sp7", type: "true_false", theme: "Sport", question: "Une partie de bowling se compose de 15 manches (frames).", answer: "Faux", options: ["Vrai", "Faux"], points: 60 },
  { id: "tf-sp8", type: "true_false", theme: "Sport", question: "La ceinture noire est la ceinture la plus élevée que l'on puisse atteindre au judo.", answer: "Faux", options: ["Vrai", "Faux"], points: 80 }, // C'est la rouge (largement méconnu !)
  { id: "tf-da3", type: "true_false", theme: "Dessin animé", question: "Homer Simpson travaille dans une centrale nucléaire.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-da4", type: "true_false", theme: "Dessin animé", question: "Mickey Mouse devait initialement s'appeler Mortimer.", answer: "Vrai", options: ["Vrai", "Faux"], points: 70 },
  { id: "tf-da5", type: "true_false", theme: "Dessin animé", question: "Dans 'La Reine des Neiges', le bonhomme de neige s'appelle Sven.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 }, // Sven c'est le renne, Olaf le bonhomme de neige
  { id: "tf-da6", type: "true_false", theme: "Dessin animé", question: "Shrek est un ogre de couleur bleue.", answer: "Faux", options: ["Vrai", "Faux"], points: 50 },
  { id: "tf-da7", type: "true_false", theme: "Dessin animé", question: "Bob l'éponge travaille au Crabe Croustillant.", answer: "Vrai", options: ["Vrai", "Faux"], points: 50 },

  // 🔵 QCM
  { id: "qcm1", type: "qcm", theme: "Géographie", question: "Quelle est la capitale de l'Australie ?", answer: "Canberra", options: ["Sydney", "Melbourne", "Canberra", "Perth"], points: 100 },
  { id: "qcm2", type: "qcm", theme: "Sciences", question: "Quel est l'animal le plus rapide du monde en piqué ?", answer: "Le faucon pèlerin", options: ["Le guépard", "L'aigle royal", "Le faucon pèlerin", "L'espadon"], points: 100 },
  { id: "qcm3", type: "qcm", theme: "Sciences", question: "Quel est le métal le plus abondant dans la croûte terrestre ?", answer: "L'aluminium", options: ["Le fer", "L'or", "Le cuivre", "L'aluminium"], points: 100 },
  { id: "qcm4", type: "qcm", theme: "Culture G", question: "Qui a peint La Jeune Fille à la perle ?", answer: "Johannes Vermeer", options: ["Vincent van Gogh", "Johannes Vermeer", "Rembrandt", "Claude Monet"], points: 100 },
  { id: "qcm5", type: "qcm", theme: "Géographie", question: "Combien y a-t-il de fuseaux horaires en Russie ?", answer: "11", options: ["7", "9", "11", "13"], points: 100 },
  { id: "qcm6", type: "qcm", theme: "Géographie", question: "Quel est le plus grand océan de la Terre ?", answer: "Océan Pacifique", options: ["Océan Atlantique", "Océan Indien", "Océan Pacifique", "Océan Arctique"], points: 100 },
  { id: "qcm7", type: "qcm", theme: "Sciences", question: "Quelle planète est surnommée l'étoile du berger ?", answer: "Vénus", options: ["Mars", "Vénus", "Jupiter", "Mercure"], points: 100 },
  { id: "qcm8", type: "qcm", theme: "Géographie", question: "Dans quel pays se trouve la ville de Tombouctou ?", answer: "Mali", options: ["Sénégal", "Niger", "Mali", "Maroc"], points: 100 },
  { id: "qcm9", type: "qcm", theme: "Culture G", question: "Quel est le nom du bateau dans Le Vieil Homme et la Mer ?", answer: "Il n'a pas de nom", options: ["L'Orca", "Le Pilar", "Le Pequod", "Il n'a pas de nom"], points: 100 },
  { id: "qcm10", type: "qcm", theme: "Culture G", question: "Quel ingrédient principal compose le guacamole ?", answer: "Avocat", options: ["Tomate", "Avocat", "Piment", "Citron vert"], points: 100 },
  { id: "qcm11", type: "qcm", theme: "Sciences", question: "Quel est le plus grand os du corps humain ?", answer: "Le fémur", options: ["Le tibia", "Le fémur", "L'humérus", "Le péroné"], points: 100 },
  { id: "qcm12", type: "qcm", theme: "Géographie", question: "Quelle est la monnaie du Japon ?", answer: "Le Yen", options: ["Le Yuan", "Le Won", "Le Yen", "Le Ringgit"], points: 100 },
  { id: "qcm13", type: "qcm", theme: "Culture G", question: "Qui est le dieu grec des enfers ?", answer: "Hadès", options: ["Ares", "Apollon", "Poséidon", "Hadès"], points: 100 },
  { id: "qcm14", type: "qcm", theme: "Culture G", question: "Quelle série met en scène Walter White ?", answer: "Breaking Bad", options: ["Prison Break", "Dexter", "Breaking Bad", "The Wire"], points: 100 },
  { id: "qcm15", type: "qcm", theme: "Sciences", question: "En informatique, que signifie 'RAM' ?", answer: "Random Access Memory", options: ["Read Access Memory", "Random Access Memory", "Run All Memory", "Real Allocation Mode"], points: 100 },
  { id: "qcm16", type: "qcm", theme: "Sciences", question: "Quel gaz compose majoritairement l'air que nous respirons ?", answer: "Azote", options: ["Oxygène", "Azote", "Gaz carbonique", "Hydrogène"], points: 100 },
  { id: "qcm17", type: "qcm", theme: "Culture G", question: "Quel pays a remporté le plus de Coupes du Monde de football ?", answer: "Brésil", options: ["Allemagne", "Italie", "France", "Brésil"], points: 100 },
  { id: "qcm18", type: "qcm", theme: "Géographie", question: "Quelle est la capitale de l'Islande ?", answer: "Reykjavik", options: ["Oslo", "Reykjavik", "Stockholm", "Helsinki"], points: 100 },
  { id: "qcm19", type: "qcm", theme: "Culture G", question: "Qui a écrit le roman '1984' ?", answer: "George Orwell", options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Ernest Hemingway"], points: 100 },
  { id: "qcm20", type: "qcm", theme: "Sciences", question: "Quelle est la vitesse de la lumière (environ) ?", answer: "300 000 km/s", options: ["150 000 km/s", "300 000 km/s", "1 000 000 km/s", "300 000 km/h"], points: 120 },
  { id: "qcm21", type: "qcm", theme: "Géographie", question: "Quel est le plus grand pays du monde par la taille ?", answer: "Russie", options: ["Canada", "Chine", "États-Unis", "Russie"], points: 80 },
  { id: "qcm22", type: "qcm", theme: "Géographie", question: "Dans quelle ville se trouve le Colisée ?", answer: "Rome", options: ["Athènes", "Rome", "Naples", "Florence"], points: 80 },
  { id: "qcm23", type: "qcm", theme: "Sciences", question: "Quel est le nom de la galaxie dans laquelle nous vivons ?", answer: "La Voie Lactée", options: ["Andromède", "La Voie Lactée", "La Grande Ourse", "Orion"], points: 100 },
  { id: "qcm24", type: "qcm", theme: "Sciences", question: "Quel est l'oiseau qui pond les plus gros œufs ?", answer: "L'autruche", options: ["L'aigle", "L'autruche", "Le condor", "L'émeu"], points: 100 },
  { id: "qcm25", type: "qcm", theme: "Géographie", question: "Dans quelle ville se trouve le siège de l'ONU ?", answer: "New York", options: ["Genève", "Washington", "New York", "Bruxelles"], points: 100 },
  { id: "qcm26", type: "qcm", theme: "Sciences", question: "Quel est l'élément chimique le plus léger ?", answer: "Hydrogène", options: ["Hélium", "Oxygène", "Azote", "Hydrogène"], points: 100 },
  { id: "qcm27", type: "qcm", theme: "Culture G", question: "Qui a écrit 'Les Fleurs du Mal' ?", answer: "Charles Baudelaire", options: ["Victor Hugo", "Charles Baudelaire", "Arthur Rimbaud", "Paul Verlaine"], points: 100 },
  { id: "qcm28", type: "qcm", theme: "Culture G", question: "Combien de cordes possède une guitare classique ?", answer: "6", options: ["4", "5", "6", "12"], points: 80 },
  { id: "qcm29", type: "qcm", theme: "Géographie", question: "Quel est le plus petit pays du monde ?", answer: "Vatican", options: ["Monaco", "Saint-Marin", "Vatican", "Andorre"], points: 100 },
  { id: "qcm30", type: "qcm", theme: "Géographie", question: "Quelle est la capitale du Canada ?", answer: "Ottawa", options: ["Toronto", "Montréal", "Ottawa", "Québec"], points: 100 },
  { id: "qcm31", type: "qcm", theme: "Sciences", question: "Quel organe produit l'insuline ?", answer: "Le pancréas", options: ["Le foie", "Le pancréas", "La rate", "Les reins"], points: 120 },
  { id: "qcm32", type: "qcm", theme: "Culture G", question: "Qui a réalisé le film 'Inception' ?", answer: "Christopher Nolan", options: ["Steven Spielberg", "Christopher Nolan", "Quentin Tarantino", "Martin Scorsese"], points: 100 },
  { id: "qcm33", type: "qcm", theme: "Sciences", question: "Quel est le plus grand mammifère terrestre ?", answer: "L'éléphant d'Afrique", options: ["Le rhinocéros", "L'éléphant d'Afrique", "La girafe", "L'hippopotame"], points: 80 },
  { id: "qcm34", type: "qcm", theme: "Histoire", question: "Quel empire était dirigé par Soliman le Magnifique ?", answer: "L'Empire Ottoman", options: ["L'Empire Perse", "L'Empire Ottoman", "L'Empire Moghol", "L'Empire Romain"], points: 100 },
  { id: "qcm35", type: "qcm", theme: "Géographie", question: "Quelle est la capitale la plus haute du monde (altitude) ?", answer: "La Paz", options: ["Quito", "La Paz", "Bogota", "Lhassa"], points: 120 },
  { id: "qcm36", type: "qcm", theme: "Histoire", question: "En quelle année a été découvert le tombeau de Toutânkhamon ?", answer: "1922", options: ["1898", "1912", "1922", "1936"], points: 100 },
  { id: "qcm37", type: "qcm", theme: "Géographie", question: "Lequel de ces pays ne possède pas d'accès à la mer ?", answer: "Suisse", options: ["Belgique", "Suisse", "Norvège", "Portugal"], points: 80 },
  { id: "qcm38", type: "qcm", theme: "Histoire", question: "Qui était le président des USA durant la Guerre de Sécession ?", answer: "Abraham Lincoln", options: ["George Washington", "Andrew Jackson", "Abraham Lincoln", "Ulysses S. Grant"], points: 100 },
  { id: "qcm39", type: "qcm", theme: "Géographie", question: "Quel fleuve traverse le plus grand nombre de pays ?", answer: "Le Danube", options: ["Le Nil", "L'Amazone", "Le Danube", "Le Rhin"], points: 120 },
  { id: "qcm40", type: "qcm", theme: "Histoire", question: "Quelle était la capitale de l'Empire Inca ?", answer: "Cuzco", options: ["Machu Picchu", "Lima", "Quito", "Cuzco"], points: 100 },
  { id: "qcm41", type: "qcm", theme: "Géographie", question: "Quel pays possède le plus d'îles au monde ?", answer: "La Suède", options: ["L'Indonésie", "La Grèce", "Le Canada", "La Suède"], points: 150 },
  { id: "qcm-sp1", type: "qcm", theme: "Sport", question: "Dans quel sport s'illustre Rafael Nadal ?", answer: "Tennis", options: ["Football", "Tennis", "Golf", "Basket-ball"], points: 100 },
  { id: "qcm-sp2", type: "qcm", theme: "Sport", question: "Quelle est la durée réglementaire d'un match de football (sans prolongations) ?", answer: "90 minutes", options: ["60 minutes", "80 minutes", "90 minutes", "120 minutes"], points: 100 },
  { id: "qcm-da1", type: "qcm", theme: "Dessin animé", question: "Comment s'appelle le lionceau héros du film 'Le Roi Lion' ?", answer: "Simba", options: ["Mufasa", "Scar", "Kovu", "Simba"], points: 100 },
  { id: "qcm-da2", type: "qcm", theme: "Dessin animé", question: "Dans le manga 'Naruto', quel est le rêve du personnage principal ?", answer: "Devenir Hokage", options: ["Devenir pirate", "Trouver les boules de cristal", "Devenir Hokage", "Devenir un super saiyan"], points: 100 },
  { id: "qcm-sp3", type: "qcm", theme: "Sport", question: "Quel pays a remporté la Coupe du Monde de football 2022 ?", answer: "Argentine", options: ["France", "Brésil", "Croatie", "Argentine"], points: 80 },
  { id: "qcm-sp4", type: "qcm", theme: "Sport", question: "Combien de joueurs composent une équipe de volley-ball sur le terrain ?", answer: "6", options: ["5", "6", "7", "11"], points: 100 },
  { id: "qcm-sp5", type: "qcm", theme: "Sport", question: "De quelle couleur est le maillot du leader du classement général sur le Tour de France ?", answer: "Jaune", options: ["Vert", "Jaune", "Blanc à pois rouges", "Rose"], points: 80 },
  { id: "qcm-sp6", type: "qcm", theme: "Sport", question: "Dans quel sport utilise-t-on le terme 'Home Run' ?", answer: "Baseball", options: ["Cricket", "Football Américain", "Baseball", "Hockey"], points: 100 },
  { id: "qcm-sp7", type: "qcm", theme: "Sport", question: "Quelle est la discipline de Teddy Riner ?", answer: "Judo", options: ["Karaté", "Boxe", "Lutte", "Judo"], points: 80 },
  { id: "qcm-da3", type: "qcm", theme: "Dessin animé", question: "Quel animal est le maître Shifu dans Kung Fu Panda ?", answer: "Un panda roux", options: ["Un panda roux", "Un raton laveur", "Un renard", "Un lémurien"], points: 120 },
  { id: "qcm-da4", type: "qcm", theme: "Dessin animé", question: "Quel est le nom de la méchante dans 'La Petite Sirène' ?", answer: "Ursula", options: ["Maléfique", "Cruella", "Ursula", "Gothel"], points: 100 },
  { id: "qcm-da5", type: "qcm", theme: "Dessin animé", question: "Dans quel village ninja vit Naruto ?", answer: "Konoha", options: ["Suna", "Kiri", "Konoha", "Iwa"], points: 100 },
  { id: "qcm-da6", type: "qcm", theme: "Dessin animé", question: "De quel pays vient le célèbre studio d'animation Ghibli ?", answer: "Japon", options: ["Corée du Sud", "Chine", "Japon", "États-Unis"], points: 80 },
  { id: "qcm-da7", type: "qcm", theme: "Dessin animé", question: "Comment s'appellent les petites créatures jaunes dans 'Moi, moche et méchant' ?", answer: "Les Minions", options: ["Les Rabbids", "Les Minions", "Les Tic-Tacs", "Les Oompa Loompas"], points: 80 },

  // 🟠 ESTIMATION / JUSTE PRIX
  { id: "est1", type: "estimation", theme: "Culture G", question: "Combien pèse la Tour Eiffel (en tonnes) ?", answer: 10100, points: 100 },
  { id: "est2", type: "estimation", theme: "Sciences", question: "Combien de jours l'humain a-t-il passé dans l'espace en cumulé ? (à la louche)", answer: 29000, points: 100 },
  { id: "est3", type: "estimation", theme: "Sciences", question: "Combien d'os y a-t-il dans le corps d'un adulte humain ?", answer: 206, points: 100 },
  { id: "est4", type: "estimation", theme: "Sciences", question: "Combien de cœurs possède une pieuvre ?", answer: 3, points: 100 },
  { id: "est5", type: "estimation", theme: "Géographie", question: "Quelle est la hauteur du Mont Blanc (en mètres, mesure stricte) ?", answer: 4805, points: 100 },
  { id: "est6", type: "estimation", theme: "Culture G", question: "Combien d'épisodes compte la série Les Simpson (environ, fin 2023) ?", answer: 750, points: 100 },
  { id: "est7", type: "estimation", theme: "Culture G", question: "En minutes, combien de temps dure le film Titanic ?", answer: 194, points: 100 },
  { id: "est8", type: "estimation", theme: "Sciences", question: "Quelle est la distance Terre-Lune (en km, moyenne) ?", answer: 384400, points: 100 },
  { id: "est9", type: "estimation", theme: "Sciences", question: "Combien de pattes a un mille-pattes commun (en moyenne) ?", answer: 300, points: 100 },
  { id: "est10", type: "estimation", theme: "Géographie", question: "Combien de pays compte l'ONU ?", answer: 193, points: 100 },
  { id: "est11", type: "estimation", theme: "Culture G", question: "Quelle est la vitesse maximale enregistrée par Usain Bolt (en km/h) ?", answer: 44, points: 100 },
  { id: "est12", type: "estimation", theme: "Culture G", question: "Combien de touches y a-t-il sur un piano classique ?", answer: 88, points: 100 },
  { id: "est13", type: "estimation", theme: "Sciences", question: "Combien de temps (en jours) dure la gestation d'une éléphante ?", answer: 640, points: 100 },
  { id: "est14", type: "estimation", theme: "Culture G", question: "Combien de mètres mesure la plus grande statue du monde (Statue de l'Unité) ?", answer: 182, points: 100 },
  { id: "est15", type: "estimation", theme: "Géographie", question: "Combien de kilomètres fait le fleuve Amazone (environ) ?", answer: 6400, points: 100 },
  { id: "est16", type: "estimation", theme: "Sciences", question: "Combien de dents possède un humain adulte (sans dents de sagesse) ?", answer: 28, points: 100 },
  { id: "est17", type: "estimation", theme: "Géographie", question: "Quelle est la population mondiale en milliards (2024) ?", answer: 8, points: 100 },
  { id: "est18", type: "estimation", theme: "Culture G", question: "Combien de marches compte la Tour Eiffel jusqu'au sommet ?", answer: 1665, points: 150 },
  { id: "est19", type: "estimation", theme: "Géographie", question: "Combien de pays y a-t-il officiellement en Afrique ?", answer: 54, points: 120 },
  { id: "est20", type: "estimation", theme: "Géographie", question: "Quelle est la longueur de la Grande Muraille de Chine en km ?", answer: 21196, points: 200 },
  { id: "est21", type: "estimation", theme: "Sciences", question: "Combien de jours dure une année sur Mars ?", answer: 687, points: 150 },
  { id: "est22", type: "estimation", theme: "Géographie", question: "Combien d'États compte les États-Unis d'Amérique ?", answer: 50, points: 80 },
  { id: "est23", type: "estimation", theme: "Sciences", question: "Quelle est la température en surface du Soleil (en degrés Celsius) ?", answer: 5500, points: 200 },
  { id: "est24", type: "estimation", theme: "Sciences", question: "Combien de litres de sang contient le corps d'un adulte (environ) ?", answer: 5, points: 100 },
  { id: "est25", type: "estimation", theme: "Géographie", question: "Combien d'États membres compte l'Union Européenne (en 2024) ?", answer: 27, points: 100 },
  { id: "est26", type: "estimation", theme: "Culture G", question: "Combien de secondes y a-t-il dans une journée ?", answer: 86400, points: 150 },
  { id: "est27", type: "estimation", theme: "Géographie", question: "Quelle est la profondeur moyenne de l'océan (en mètres) ?", answer: 3700, points: 150 },
  { id: "est28", type: "estimation", theme: "Géographie", question: "Combien de pays ont le français comme langue officielle ?", answer: 29, points: 120 },
  { id: "est29", type: "estimation", theme: "Culture G", question: "Combien d'anneaux compose le logo des Jeux Olympiques ?", answer: 5, points: 50 },
  { id: "est30", type: "estimation", theme: "Culture G", question: "Combien de pièces y a-t-il au début d'une partie d'échecs (total) ?", answer: 32, points: 100 },
  { id: "est31", type: "estimation", theme: "Culture G", question: "Quelle est la longueur de la piscine olympique (en mètres) ?", answer: 50, points: 80 },
  { id: "est32", type: "estimation", theme: "Géographie", question: "En kilomètres, quelle est la circonférence de la Terre ?", answer: 40075, points: 200 },
  { id: "est33", type: "estimation", theme: "Sciences", question: "Combien d'atomes d'oxygène y a-t-il dans une molécule d'eau ?", answer: 1, points: 50 },
  { id: "est34", type: "estimation", theme: "Sciences", question: "Combien d'éléments contient le tableau périodique actuel ?", answer: 118, points: 100 },
  { id: "est35", type: "estimation", theme: "Sciences", question: "Quelle est la distance entre la Terre et Mars (en millions de km, au plus proche) ?", answer: 55, points: 150 },
  { id: "est36", type: "estimation", theme: "Sciences", question: "Combien de muscles possède le corps humain (environ) ?", answer: 650, points: 100 },
  { id: "est37", type: "estimation", theme: "Sciences", question: "Combien de temps met la lumière du Soleil pour atteindre la Terre (en secondes) ?", answer: 499, points: 150 },
  { id: "est38", type: "estimation", theme: "Sciences", question: "Quel est le record du monde de durée de sommeil pour un humain (en heures) ?", answer: 264, points: 200 },
  { id: "est39", type: "estimation", theme: "Sciences", question: "Combien de battements de cœur un humain fait-il en moyenne par minute au repos ?", answer: 70, points: 50 },
  { id: "est40", type: "estimation", theme: "Sciences", question: "Quelle est la température du zéro absolu (en degrés Celsius) ?", answer: -273, points: 150 },
  { id: "est41", type: "estimation", theme: "Sciences", question: "Combien de vertèbres compose la colonne dorsale humaine ?", answer: 33, points: 120 },
  { id: "est-sp1", type: "estimation", theme: "Sport", question: "Combien de kilomètres fait un marathon (arrondi à l'entier) ?", answer: 42, points: 150 },
  { id: "est-sp2", type: "estimation", theme: "Sport", question: "Combien de joueurs composent une équipe de rugby à XV sur le terrain ?", answer: 15, points: 100 },
  { id: "est-da1", type: "estimation", theme: "Dessin animé", question: "Combien y a-t-il de Dalmatiens dans le célèbre dessin animé de Disney ?", answer: 101, points: 100 },
  { id: "est-da2", type: "estimation", theme: "Dessin animé", question: "Combien de boules de cristal magiques faut-il réunir dans Dragon Ball ?", answer: 7, points: 100 },
  { id: "est-sp3", type: "estimation", theme: "Sport", question: "Quelle est la hauteur officielle d'un panier de basket en NBA (en centimètres) ?", answer: 305, points: 150 },
  { id: "est-sp4", type: "estimation", theme: "Sport", question: "Combien de trous compte un parcours de golf de compétition complet ?", answer: 18, points: 100 },
  { id: "est-sp5", type: "estimation", theme: "Sport", question: "Combien de quilles doit-on faire tomber au bowling en un seul lancer pour faire un strike ?", answer: 10, points: 80 },
  { id: "est-sp6", type: "estimation", theme: "Sport", question: "En kilomètres, quelle est la distance d'un semi-marathon (arrondi à l'entier) ?", answer: 21, points: 150 },
  { id: "est-sp7", type: "estimation", theme: "Sport", question: "Combien de minutes dure un quart-temps en NBA ?", answer: 12, points: 120 },
  { id: "est-da3", type: "estimation", theme: "Dessin animé", question: "Combien d'émotions principales y a-t-il dans la tête de Riley dans le film 'Vice-Versa' (le 1er film) ?", answer: 5, points: 100 },
  { id: "est-da4", type: "estimation", theme: "Dessin animé", question: "Combien de doigts possède un Minion sur une seule main ?", answer: 3, points: 120 },
  { id: "est-da5", type: "estimation", theme: "Dessin animé", question: "Combien de fées marraines se penchent sur le berceau de La Belle au Bois Dormant ?", answer: 3, points: 100 },
  { id: "est-da6", type: "estimation", theme: "Dessin animé", question: "Combien de nains accompagnent Blanche-Neige ?", answer: 7, points: 80 },
  { id: "est-da7", type: "estimation", theme: "Dessin animé", question: "Combien de têtes possède le dragon 'Touffu' dans l'univers de Harry Potter ?", answer: 3, points: 100 }, // Clin d'oeil pop culture

  // 🟣 QUESTIONS OUVERTES TEXTE
  { id: "op1", type: "open", theme: "Géographie", question: "Quelle est la capitale du Japon ?", answer: "Tokyo", points: 100 },
  { id: "op2", type: "open", theme: "Sciences", question: "Quel est le symbole chimique de l'or ?", answer: "Au", points: 100 },
  { id: "op3", type: "open", theme: "Sciences", question: "Quelle planète est la plus proche du soleil ?", answer: "Mercure", points: 100 },
  { id: "op4", type: "open", theme: "Culture G", question: "Qui a écrit Les Misérables ?", answer: "Victor Hugo", points: 100 },
  { id: "op5", type: "open", theme: "Sciences", question: "Quel animal miaule ?", answer: "Chat", points: 100 },
  { id: "op6", type: "open", theme: "Culture G", question: "De quelle couleur est le cheval blanc d'Henri IV ?", answer: "Blanc", points: 50 },
  { id: "op7", type: "open", theme: "Géographie", question: "Quel est le plus grand pays du monde en superficie ?", answer: "Russie", points: 100 },
  { id: "op8", type: "open", theme: "Géographie", question: "Quelle est la monnaie utilisée au Royaume-Uni ?", answer: "Livre", points: 100 },
  { id: "op9", type: "open", theme: "Culture G", question: "Quel fruit est le logo de l'entreprise de Steve Jobs ?", answer: "Pomme", points: 50 },
  { id: "op10", type: "open", theme: "Culture G", question: "Comment s'appelle l'éponge jaune qui vit dans un ananas sous la mer ?", answer: "Bob l'Éponge", points: 100 },
  { id: "op11", type: "open", theme: "Sciences", question: "Quel est l'organe le plus lourd du corps humain ?", answer: "Peau", points: 120 },
  { id: "op12", type: "open", theme: "Géographie", question: "Quel pays est surnommé le pays du Soleil Levant ?", answer: "Japon", points: 80 },
  { id: "op13", type: "open", theme: "Sciences", question: "Quel est le métal dont le symbole chimique est Fe ?", answer: "Fer", points: 100 },
  { id: "op14", type: "open", theme: "Géographie", question: "Quelle est la capitale de l'Espagne ?", answer: "Madrid", points: 80 },
  { id: "op15", type: "open", theme: "Culture G", question: "Quel artiste est célèbre pour avoir peint la Joconde ?", answer: "Léonard de Vinci", points: 100 },
  { id: "op16", type: "open", theme: "Sciences", question: "Comment appelle-t-on le bébé du cheval ?", answer: "Poulain", points: 80 },
  { id: "op17", type: "open", theme: "Géographie", question: "Dans quel pays peut-on visiter les pyramides de Gizeh ?", answer: "Égypte", points: 80 },
  { id: "op18", type: "open", theme: "Géographie", question: "Quel est le plus long fleuve du monde ?", answer: "Nil", points: 100 },
  { id: "op19", type: "open", theme: "Géographie", question: "Quelle est la capitale du Portugal ?", answer: "Lisbonne", points: 100 },
  { id: "op20", type: "open", theme: "Sciences", question: "Quel est le nom du scientifique qui a formulé la théorie de la relativité ?", answer: "Einstein", points: 100 },
  { id: "op21", type: "open", theme: "Culture G", question: "De quel pays vient la pizza ?", answer: "Italie", points: 50 },
  { id: "op22", type: "open", theme: "Géographie", question: "Quel est le plus grand continent du monde ?", answer: "Asie", points: 80 },
  { id: "op23", type: "open", theme: "Sciences", question: "Comment s'appelle la peur des araignées ?", answer: "Arachnophobie", points: 120 },
  { id: "op24", type: "open", theme: "Sciences", question: "Quelle planète est surnommée la planète rouge ?", answer: "Mars", points: 80 },
  { id: "op25", type: "open", theme: "Culture G", question: "Quel est le prénom du célèbre sorcier Potter ?", answer: "Harry", points: 50 },
  { id: "op26", type: "open", theme: "Culture G", question: "Dans quel sport utilise-t-on un volant ?", answer: "Badminton", points: 100 },
  { id: "op27", type: "open", theme: "Sciences", question: "Quel est l'animal le plus haut du monde ?", answer: "Girafe", points: 80 },
  { id: "op28", type: "open", theme: "Géographie", question: "Quel océan borde la côte ouest des États-Unis ?", answer: "Pacifique", points: 100 },
  { id: "op29", type: "open", theme: "Sciences", question: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?", answer: "Dioxyde de carbone", points: 100 },
  { id: "op30", type: "open", theme: "Sciences", question: "Comment appelle-t-on la partie colorée de l'œil ?", answer: "Iris", points: 80 },
  { id: "op31", type: "open", theme: "Sciences", question: "Qui a découvert la pénicilline ?", answer: "Fleming", points: 150 },
  { id: "op32", type: "open", theme: "Sciences", question: "Quelle est la plus grande glande du corps humain ?", answer: "Foie", points: 120 },
  { id: "op33", type: "open", theme: "Sciences", question: "Quel instrument utilise un médecin pour écouter le cœur ?", answer: "Stéthoscope", points: 100 },
  { id: "op34", type: "open", theme: "Géographie", question: "Dans quel pays se trouve le mont Kilimandjaro ?", answer: "Tanzanie", points: 120 },
  { id: "op35", type: "open", theme: "Sciences", question: "Quel est le nom du pigment qui donne la couleur à la peau ?", answer: "Mélanine", points: 100 },
  { id: "op36", type: "open", theme: "Sciences", question: "Quel acide trouve-t-on en abondance dans l'estomac ?", answer: "Chlorhydrique", points: 130 },
  { id: "op-sp1", type: "open", theme: "Sport", question: "Quel sport se joue avec un club, une petite balle blanche et des trous ?", answer: "Golf", points: 80 },
  { id: "op-sp2", type: "open", theme: "Sport", question: "Quelle nation les 'All Blacks' représentent-ils au rugby ?", answer: "Nouvelle-Zélande", points: 120 },
  { id: "op-da1", type: "open", theme: "Dessin animé", question: "Comment s'appelle l'ogre vert des studios DreamWorks ?", answer: "Shrek", points: 80 },
  { id: "op-da2", type: "open", theme: "Dessin animé", question: "Quel est le nom du célèbre petit chien blanc de Tintin ?", answer: "Milou", points: 80 },
  { id: "op-sp3", type: "open", theme: "Sport", question: "Comment s'appelle le célèbre footballeur argentin vainqueur de la Coupe du Monde 2022 ?", answer: "Messi", answerAliases: ["Lionel Messi", "Leo Messi"], points: 80 },
  { id: "op-sp4", type: "open", theme: "Sport", question: "Dans quelle ville se déroule le grand tournoi de tennis sur terre battue de Roland-Garros ?", answer: "Paris", points: 80 },
  { id: "op-sp5", type: "open", theme: "Sport", question: "Quel art martial japonais se pratique en saisissant le kimono (judogi) de l'adversaire ?", answer: "Judo", points: 100 },
  { id: "op-sp6", type: "open", theme: "Sport", question: "Quel accessoire tenu à la main utilise-t-on pour frapper le volant au badminton ?", answer: "Raquette", answerAliases: ["Une raquette"], points: 80 },
  { id: "op-sp7", type: "open", theme: "Sport", question: "Quel est le sport pratiqué par la légende américaine Michael Jordan ?", answer: "Basket", answerAliases: ["Basketball", "Basket-ball", "Le basket"], points: 80 },
  { id: "op-da3", type: "open", theme: "Dessin animé", question: "Comment s'appelle le chien de Mickey Mouse ?", answer: "Pluto", points: 80 },
  { id: "op-da4", type: "open", theme: "Dessin animé", question: "Quel aliment mange Popeye pour devenir super fort ?", answer: "Epinards", answerAliases: ["Des épinards", "Épinards"], points: 80 },
  { id: "op-da5", type: "open", theme: "Dessin animé", question: "Comment s'appelle la célèbre souris mâle qui accompagne souvent Jerry ?", answer: "Tom", answerAliases: ["Tom le chat"], points: 80 },
  { id: "op-da6", type: "open", theme: "Dessin animé", question: "Comment s'appelle le meilleur ami (une étoile de mer) de Bob l'éponge ?", answer: "Patrick", answerAliases: ["Patrick l'étoile de mer"], points: 80 },
  { id: "op-da7", type: "open", theme: "Dessin animé", question: "Quel est le prénom de l'héroïne Disney qui a de très longs cheveux magiques ?", answer: "Raiponce", points: 80 },

  // 🔴 DATES
  { id: "date1", type: "date", theme: "Histoire", question: "En quelle année le Titanic a-t-il coulé ?", answer: 1912, points: 150 },
  { id: "date2", type: "date", theme: "Histoire", question: "En quelle année a eu lieu la Révolution Française ?", answer: 1789, points: 150 },
  { id: "date3", type: "date", theme: "Histoire", question: "En quelle année l'homme a-t-il marché sur la Lune ?", answer: 1969, points: 150 },
  { id: "date4", type: "date", theme: "Culture G", question: "En quelle année est sorti le tout premier iPhone ?", answer: 2007, points: 150 },
  { id: "date5", type: "date", theme: "Histoire", question: "En quelle année s'est terminée la Seconde Guerre mondiale ?", answer: 1945, points: 150 },
  { id: "date6", type: "date", theme: "Histoire", question: "En quelle année a eu lieu la chute du mur de Berlin ?", answer: 1989, points: 150 },
  { id: "date7", type: "date", theme: "Culture G", question: "En quelle année est sorti le premier film Star Wars au cinéma ?", answer: 1977, points: 150 },
  { id: "date8", type: "date", theme: "Histoire", question: "En quelle année Christophe Colomb a-t-il découvert l'Amérique ?", answer: 1492, points: 150 },
  { id: "date9", type: "date", theme: "Culture G", question: "En quelle année la France a-t-elle gagné sa première Coupe du Monde de foot ?", answer: 1998, points: 150 },
  { id: "date10", type: "date", theme: "Culture G", question: "En quelle année a été lancée la console PlayStation 1 en Europe ?", answer: 1995, points: 150 },
  { id: "date11", type: "date", theme: "Histoire", question: "En quelle année l'Euro a-t-il été mis en circulation ?", answer: 2002, points: 150 },
  { id: "date12", type: "date", theme: "Culture G", question: "En quelle année Facebook a-t-il été créé ?", answer: 2004, points: 150 },
  { id: "date13", type: "date", theme: "Histoire", question: "En quelle année a eu lieu l'attentat des tours jumelles (9/11) ?", answer: 2001, points: 120 },
  { id: "date14", type: "date", theme: "Histoire", question: "En quelle année Napoléon Ier est-il mort à Sainte-Hélène ?", answer: 1821, points: 180 },
  { id: "date15", type: "date", theme: "Histoire", question: "En quelle année a été signée la Déclaration d'Indépendance des USA ?", answer: 1776, points: 200 },
  { id: "date16", type: "date", theme: "Histoire", question: "En quelle année a été inaugurée la Tour Eiffel ?", answer: 1889, points: 150 },
  { id: "date17", type: "date", theme: "Culture G", question: "En quelle année a été lancé le premier iPhone ?", answer: 2007, points: 120 },
  { id: "date18", type: "date", theme: "Histoire", question: "En quelle année s'est terminé le règne de Louis XIV ?", answer: 1715, points: 200 },
  { id: "date19", type: "date", theme: "Histoire", question: "En quelle année l'Algérie est-elle devenue indépendante ?", answer: 1962, points: 150 },
  { id: "date20", type: "date", theme: "Culture G", question: "En quelle année est mort Michael Jackson ?", answer: 2009, points: 120 },
  { id: "date21", type: "date", theme: "Culture G", question: "En quelle année a été inventé le World Wide Web (Web) ?", answer: 1989, points: 180 },
  { id: "date22", type: "date", theme: "Histoire", question: "En quelle année l'esclavage a-t-il été définitivement aboli en France ?", answer: 1848, points: 200 },
  { id: "date23", type: "date", theme: "Sciences", question: "En quelle année a été lancé le télescope spatial Hubble ?", answer: 1990, points: 150 },
  { id: "date24", type: "date", theme: "Histoire", question: "En quelle année l'URSS a-t-elle été dissoute ?", answer: 1991, points: 150 },
  { id: "date25", type: "date", theme: "Histoire", question: "En quelle année a eu lieu le premier vol des frères Wright ?", answer: 1903, points: 200 },
  { id: "date26", type: "date", theme: "Histoire", question: "En quelle année Nelson Mandela a-t-il été libéré de prison ?", answer: 1990, points: 180 },
  { id: "date27", type: "date", theme: "Histoire", question: "En quelle année a débuté la guerre du Vietnam ?", answer: 1955, points: 200 },
  { id: "date28", type: "date", theme: "Histoire", question: "En quelle année a été fondé l'empire romain ?", answer: -27, points: 250 },
  { id: "date29", type: "date", theme: "Histoire", question: "En quelle année a commencé la construction de la pyramide de Khéops (environ) ?", answer: -2560, points: 250 },
  { id: "date30", type: "date", theme: "Histoire", question: "En quelle année l'esclavage a-t-il été aboli aux États-Unis ?", answer: 1865, points: 150 },
  { id: "date31", type: "date", theme: "Histoire", question: "En quelle année a été fondée l'ONU ?", answer: 1945, points: 100 },
  { id: "date32", type: "date", theme: "Sciences", question: "En quelle année Einstein a-t-il publié la théorie de la relativité générale ?", answer: 1915, points: 180 },
  { id: "date33", type: "date", theme: "Sciences", question: "En quelle année a eu lieu la première transplantation cardiaque ?", answer: 1967, points: 200 },
  { id: "date34", type: "date", theme: "Histoire", question: "En quelle année s'est terminé l'Empire Romain d'Occident ?", answer: 476, points: 150 },
  { id: "date35", type: "date", theme: "Histoire", question: "En quelle année a été lancé le premier satellite artificiel, Spoutnik ?", answer: 1957, points: 150 },
  { id: "date36", type: "date", theme: "Sciences", question: "En quelle année la structure de l'ADN a-t-elle été découverte ?", answer: 1953, points: 180 },
  { id: "date-sp1", type: "date", theme: "Sport", question: "En quelle année ont eu lieu les Jeux Olympiques d'été à Pékin ?", answer: 2008, points: 180 },
  { id: "date-sp2", type: "date", theme: "Sport", question: "En quelle année l'équipe de France de football a gagné sa deuxième étoile (Coupe du monde) ?", answer: 2018, points: 150 },
  { id: "date-da1", type: "date", theme: "Dessin animé", question: "En quelle année est sorti le tout premier film d'animation 'Toy Story' ?", answer: 1995, points: 200 },
  { id: "date-da2", type: "date", theme: "Dessin animé", question: "En quelle année Mickey Mouse a-t-il fait sa toute première apparition à l'écran ?", answer: 1928, points: 250 },
  { id: "date-sp3", type: "date", theme: "Sport", question: "En quelle année ont eu lieu les premiers Jeux Olympiques de l'ère moderne (à Athènes) ?", answer: 1896, points: 250 },
  { id: "date-sp4", type: "date", theme: "Sport", question: "En quelle année a eu lieu la toute première édition du Tour de France cycliste ?", answer: 1903, points: 200 },
  { id: "date-sp5", type: "date", theme: "Sport", question: "En quelle année l'équipe de France a-t-elle remporté sa PREMIÈRE Coupe du Monde de football ?", answer: 1998, points: 150 },
  { id: "date-sp6", type: "date", theme: "Sport", question: "En quelle année la ligue américaine de basket-ball (NBA) a-t-elle été créée ?", answer: 1946, points: 200 },
  { id: "date-sp7", type: "date", theme: "Sport", question: "En quelle année Usain Bolt a-t-il pulvérisé le record du monde du 100m en 9.58 secondes ?", answer: 2009, points: 180 },
  { id: "date-da3", type: "date", theme: "Dessin animé", question: "En quelle année est sorti 'Blanche-Neige', le tout premier long métrage d'animation Disney ?", answer: 1937, points: 250 },
  { id: "date-da4", type: "date", theme: "Dessin animé", question: "En quelle année a été diffusé le tout premier épisode régulier des Simpson aux États-Unis ?", answer: 1989, points: 200 },
  { id: "date-da5", type: "date", theme: "Dessin animé", question: "En quelle année est sorti au cinéma le premier film 'Shrek' ?", answer: 2001, points: 180 },
  { id: "date-da6", type: "date", theme: "Dessin animé", question: "En quelle année le célèbre manga 'Dragon Ball' a-t-il été publié pour la toute première fois ?", answer: 1984, points: 200 },
  { id: "date-da7", type: "date", theme: "Dessin animé", question: "En quelle année est sorti le magnifique chef-d'œuvre de Ghibli 'Le Voyage de Chihiro' ?", answer: 2001, points: 180 },

  ...GEO_FLAG_QUESTIONS,
  ...GEO_SHAPE_QUESTIONS,
];

// --- GÉNÉRATEUR DYNAMIQUE PAR THÈME (MODE ON/OFF) ---
export function getRandomQuestionsByTheme(count: number, activeThemes: QuestionTheme[]): QuizQuestion[] {
  // 1. On filtre la banque pour ne garder que les questions des thèmes activés
  const pool = QUIZ_BANK.filter((q) => activeThemes.includes(q.theme) && q.theme !== "Mini-Bac");
  const shuffled = shuffle([...pool]);
  let selected = shuffled.slice(0, count);

  // 2. LA MAGIE DU MINI-BAC (S'il est activé dans les thèmes)
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

      // On remplace une question classique vers la fin par le Mini-Bac
      const replaceIndex = Math.floor(selected.length * 0.6) + i;
      if (replaceIndex < selected.length) {
        selected[replaceIndex] = miniBacQuestion;
      }
    }
  }

  // 3. On remélange un petit coup pour intégrer le Mini-Bac naturellement
  return shuffle(selected);
}