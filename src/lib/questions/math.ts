import type { QuizQuestion } from "../quiz-bank";

function randomIntBelow(n: number): number {
  if (n <= 0) return 0;
  return Math.floor(Math.random() * n);
}

// ============================================================================
// MOTEUR DE GÉNÉRATION DE CALCUL MENTAL 100% ALÉATOIRE (Arbre Syntaxique)
// ============================================================================

type ASTNode =
  | { type: "num"; value: number }
  | { type: "op"; op: string; left: ASTNode; right: ASTNode };

function generateMathTree(maxDepth: number): ASTNode {
  if (maxDepth === 0 || Math.random() < 0.3) {
    return { type: "num", value: randomIntBelow(12) + 2 }; 
  }
  const ops = ["+", "+", "-", "-", "*", "/"];
  const op = ops[randomIntBelow(ops.length)];
  
  return {
    type: "op",
    op,
    left: generateMathTree(maxDepth - 1),
    right: generateMathTree(maxDepth - 1),
  };
}

function evaluateAST(node: ASTNode): number {
  if (node.type === "num") return node.value;
  const left = evaluateAST(node.left);
  const right = evaluateAST(node.right);
  switch (node.op) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/": return left / right;
  }
  return 0;
}

function isCleanTree(node: ASTNode): boolean {
  if (node.type === "num") return true;
  if (!isCleanTree(node.left) || !isCleanTree(node.right)) return false;

  const leftVal = evaluateAST(node.left);
  const rightVal = evaluateAST(node.right);

  if (node.op === "/") {
    if (rightVal === 0) return false; 
    if (leftVal % rightVal !== 0) return false; 
  }
  
  const val = evaluateAST(node);
  if (val > 250 || val < -20) return false;

  return true;
}

function countNodes(node: ASTNode): number {
  if (node.type === "num") return 1;
  return countNodes(node.left) + countNodes(node.right);
}

function astToString(node: ASTNode, parentOp: string | null = null, isRightChild: boolean = false): string {
  if (node.type === "num") return node.value.toString();

  const precedence = (node.op === "+" || node.op === "-") ? 1 : 2;
  const parentPrecedence = (parentOp === "+" || parentOp === "-") ? 1 : (parentOp === "*" || parentOp === "/") ? 2 : 0;

  let needsParens = false;
  if (parentPrecedence > precedence) {
    needsParens = true;
  } else if (parentPrecedence === precedence && isRightChild) {
    if (parentOp === "-" || parentOp === "/") {
      needsParens = true;
    }
  }

  const displayOp = node.op === "*" ? "×" : node.op === "/" ? "÷" : node.op;
  const str = `${astToString(node.left, node.op, false)} ${displayOp} ${astToString(node.right, node.op, true)}`;
  
  return needsParens ? `(${str})` : str;
}

function calculateDifficultyPoints(node: ASTNode): number {
  if (node.type === "num") return node.value > 9 ? 15 : 10; 
  let pts = calculateDifficultyPoints(node.left) + calculateDifficultyPoints(node.right);
  switch (node.op) {
    case "+": pts += 15; break;
    case "-": pts += 20; break;
    case "*": pts += 35; break;
    case "/": pts += 45; break;
  }
  return pts;
}

// ============================================================================
// MODE HARDCORE : CHRONOS TRÈS RÉDUITS
// ============================================================================
function calculateTimeLimit(points: number): number {
  if (points <= 40) return 4;   // 4 secondes pour un calcul basique
  if (points <= 60) return 5;   // 5 secondes
  if (points <= 90) return 7;   // 7 secondes
  if (points <= 120) return 9;  // 9 secondes
  return 12;                    // 12 secondes maximum pour les pires calculs mentaux purs !
}

function generateRandomCalculation() {
  let tree: ASTNode | null = null;
  let valid = false;

  while (!valid) {
    tree = generateMathTree(2);
    const numCount = countNodes(tree);
    if (numCount >= 2 && numCount <= 4 && isCleanTree(tree)) {
      valid = true;
    }
  }

  const rawPoints = calculateDifficultyPoints(tree!);
  const finalPoints = Math.round(rawPoints / 10) * 10;
  const calculatedTimeLimit = calculateTimeLimit(finalPoints);

  return {
    text: astToString(tree!),
    value: evaluateAST(tree!),
    points: finalPoints,
    timeLimit: calculatedTimeLimit
  };
}

// ============================================================================
// EXPORT DE LA QUESTION POUR LE JEU
// ============================================================================

export function generateMathQuestion(): QuizQuestion {
  const problemTypes = [
    "calcul_aleatoire", "calcul_aleatoire", "calcul_aleatoire", "calcul_aleatoire", "calcul_aleatoire",
    "achats", "vitesse", "survivants", "age_complexe", "baignoire",
    "tresor_pirate", "concert", "rpg_donjon", "boulangerie", "vaisseau"
  ];
  
  const type = problemTypes[randomIntBelow(problemTypes.length)];

  let questionText = "";
  let answer: number = 0;
  let timeLimit = 15;
  let points = 100;

  switch (type) {
    case "calcul_aleatoire": {
      const calc = generateRandomCalculation();
      questionText = `Calcul rapide : ${calc.text} = ?`;
      answer = calc.value;
      points = calc.points;
      timeLimit = calc.timeLimit;
      break;
    }
    
    // --- LES PROBLÈMES : TEMPS DIVISÉS PAR DEUX (HARDCORE) ---

    case "achats": {
      const budget = (randomIntBelow(5) + 5) * 10;
      const prixLivre = randomIntBelow(4) + 12;
      const nbLivres = 2;
      const prixStylo = randomIntBelow(3) + 2;
      const nbStylos = randomIntBelow(3) + 3;
      questionText = `Problème : Léa a ${budget} €. Elle achète ${nbLivres} livres à ${prixLivre} € l'unité et ${nbStylos} stylos à ${prixStylo} € l'unité. Combien d'euros lui reste-t-il ?`;
      answer = budget - (nbLivres * prixLivre) - (nbStylos * prixStylo);
      timeLimit = 20;
      points = 150;
      break;
    }
    case "vitesse": {
      const v1 = (randomIntBelow(4) + 5) * 10;
      const t1 = randomIntBelow(3) + 2;
      const v2 = (randomIntBelow(3) + 9) * 10;
      const t2 = randomIntBelow(2) + 1;
      questionText = `Problème : Un train roule à ${v1} km/h pendant ${t1}h, puis à ${v2} km/h pendant ${t2}h. Quelle distance totale a-t-il parcourue ?`;
      answer = (v1 * t1) + (v2 * t2);
      timeLimit = 18;
      points = 140;
      break;
    }
    case "survivants": {
      const base = (randomIntBelow(5) + 5) * 10;
      const infectes = randomIntBelow(10) + 15;
      const gueris = randomIntBelow(5) + 5;
      const nouveaux = randomIntBelow(10) + 10;
      questionText = `Problème : Sur ${base} survivants, ${infectes} sont infectés, mais ${gueris} guérissent. Si ${nouveaux} personnes rejoignent le camp, combien y a-t-il de survivants sains ?`;
      answer = base - infectes + gueris + nouveaux;
      timeLimit = 18;
      points = 130;
      break;
    }
    case "age_complexe": {
      const ageEnfant = randomIntBelow(4) + 6;
      const multiplicateur = randomIntBelow(2) + 3;
      const anneesPlusTard = randomIntBelow(5) + 5;
      questionText = `Problème : Léo a ${ageEnfant} ans. Son père est ${multiplicateur} fois plus âgé que lui. Quel âge aura le père dans ${anneesPlusTard} ans ?`;
      answer = (ageEnfant * multiplicateur) + anneesPlusTard;
      timeLimit = 15;
      points = 120;
      break;
    }
    case "baignoire": {
      const remplissage = randomIntBelow(5) + 15;
      const fuite = randomIntBelow(5) + 4;
      const temps = randomIntBelow(4) + 5;
      questionText = `Problème : Un bassin vide est rempli de ${remplissage} L/min, mais il fuit de ${fuite} L/min. Quel sera le volume d'eau après ${temps} minutes ?`;
      answer = (remplissage - fuite) * temps;
      timeLimit = 20;
      points = 150;
      break;
    }
    case "tresor_pirate": {
      const nbMarins = randomIntBelow(4) + 3; 
      const partMarin = (randomIntBelow(5) + 5) * 10; 
      const partCapitaine = (randomIntBelow(6) + 10) * 10; 
      const totalTresor = partCapitaine + (nbMarins * partMarin);
      questionText = `Problème : Sur un trésor de ${totalTresor} pièces, le capitaine prend ${partCapitaine} pièces. Le reste est divisé équitablement entre ${nbMarins} marins. Combien chacun reçoit-il ?`;
      answer = partMarin;
      timeLimit = 20;
      points = 140; 
      break;
    }
    case "concert": {
      const prixVip = (randomIntBelow(3) + 4) * 10; 
      const nbVip = randomIntBelow(5) + 4; 
      const prixStd = 20; 
      const nbStd = (randomIntBelow(4) + 2) * 10; 
      questionText = `Problème : Un concert a vendu ${nbVip} places VIP à ${prixVip} € et ${nbStd} places standards à ${prixStd} €. Quelle est la recette totale ?`;
      answer = (nbVip * prixVip) + (nbStd * prixStd);
      timeLimit = 18;
      points = 130;
      break;
    }
    case "rpg_donjon": {
      const hpMax = (randomIntBelow(3) + 8) * 10; 
      const nbPotions = 2;
      const soin = randomIntBelow(3) + 12; 
      const nbAttaques = 3;
      const degats = randomIntBelow(4) + 15; 
      questionText = `Problème : Un héros a ${hpMax} PV. Il boit ${nbPotions} potions qui rendent ${soin} PV chacune, puis subit ${nbAttaques} attaques à ${degats} PV chacune. Combien lui reste-t-il de PV ?`;
      answer = hpMax + (nbPotions * soin) - (nbAttaques * degats);
      timeLimit = 22;
      points = 160; 
      break;
    }
    case "boulangerie": {
      const kgFarine = randomIntBelow(3) + 3; 
      const consoBaguette = 250; 
      const nbBaguettes = randomIntBelow(5) + 8; 
      questionText = `Problème : Un boulanger a ${kgFarine} kg de farine. Il prépare ${nbBaguettes} baguettes nécessitant ${consoBaguette} g de farine chacune. Combien de grammes lui reste-t-il ?`;
      answer = (kgFarine * 1000) - (nbBaguettes * consoBaguette);
      timeLimit = 20;
      points = 150;
      break;
    }
    case "vaisseau": {
      const carburantInit = (randomIntBelow(3) + 2) * 100; 
      const consoSecteur = randomIntBelow(3) + 4; 
      const dist1 = (randomIntBelow(3) + 2) * 10; 
      const recharge = (randomIntBelow(5) + 5) * 10; 
      const dist2 = 15; 
      questionText = `Problème : Un vaisseau part avec ${carburantInit} L et consomme ${consoSecteur} L par secteur. Il avance de ${dist1} secteurs, recharge ${recharge} L, puis avance de ${dist2} secteurs. Combien de litres lui reste-t-il ?`;
      answer = carburantInit - (dist1 * consoSecteur) + recharge - (dist2 * consoSecteur);
      timeLimit = 25;
      points = 180; 
      break;
    }
  }

  return {
    id: `math-${Date.now()}-${randomIntBelow(10000)}`,
    type: "open",
    theme: "Mathématiques",
    question: questionText,
    answer: answer,
    points: points,
    timeLimit: timeLimit,
  };
}