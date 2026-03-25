// Ajout de "length_less" dans les types
export type BombConstraintType = "starts_with" | "ends_with" | "contains" | "not_contains" | "length_greater" | "length_exactly" | "length_less";

export type BombConstraint = {
  type: BombConstraintType;
  value: string;
  label: string;
};

export type BombDifficulty = "facile" | "normal" | "difficile";

const PREFIXES = ["BA", "CA", "CH", "CO", "DE", "DI", "EN", "FI", "GA", "IN", "LA", "MA", "MI", "MO", "PA", "PI", "PO", "PR", "QU", "RE", "RO", "SA", "SE", "TA", "TE", "TR", "VA", "VI", "ACC", "APP", "COM", "CON", "DES", "ENT", "PAR", "PRE", "PRO", "SOU", "SUR", "TRA"];
const SUFFIXES = ["AL", "AS", "AT", "EE", "EL", "ER", "ES", "ET", "EU", "EZ", "IE", "IR", "IS", "IT", "NT", "ON", "OS", "OT", "RE", "TE", "TS", "UR", "US", "UX", "AIT", "ANT", "ARD", "AUX", "BLE", "EAU", "ENT", "EUR", "IER", "ION", "OIR", "OIS", "ONS", "OUR", "TTE", "URE"];
const INFIXES = ["AL", "AN", "AR", "AS", "AT", "CH", "EI", "EM", "EN", "ER", "ES", "ET", "EU", "IL", "IM", "IN", "IR", "IS", "IT", "OI", "OM", "ON", "OR", "OS", "OU", "QU", "RE", "SS", "TE", "TI", "TR", "UI", "UN", "UR", "AIN", "AIR", "ANT", "EAU", "EIN", "ENT", "EUR", "ILL", "ION", "OUR", "QUE", "TRE"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateBombConstraint(difficulty: BombDifficulty = "normal"): BombConstraint {
  const rand = Math.random();

  // 25% de chance d'avoir une règle spéciale de longueur ou de lettre (pour TOUS les niveaux !)
  if (rand < 0.25) {
    const specialRand = Math.random();
    
    if (specialRand < 0.25) {
      // LETTRE INTERDITE
      let letter;
      if (difficulty === "facile") letter = randomChoice(["K", "W", "Z", "X", "Y"]);
      else if (difficulty === "normal") letter = randomChoice(["E", "I", "O", "U"]);
      else letter = randomChoice(["A", "S", "R", "T", "N"]);
      
      return { type: "not_contains", value: letter, label: `Sans la lettre "${letter}"` };
      
    } else if (specialRand < 0.50) {
      // PLUS DE X LETTRES
      let len;
      if (difficulty === "facile") len = randomChoice([4, 5]);
      else if (difficulty === "normal") len = randomChoice([6, 7]);
      else len = randomChoice([8, 9]);
      
      return { type: "length_greater", value: len.toString(), label: `Plus de ${len} lettres` };
      
    } else if (specialRand < 0.75) {
      // MOINS DE X LETTRES
      let len;
      if (difficulty === "facile") len = randomChoice([8, 9]); // ex: max 7 lettres
      else if (difficulty === "normal") len = randomChoice([6, 7]); // ex: max 5 lettres
      else len = randomChoice([4, 5]); // ex: max 3 ou 4 lettres (très court !)
      
      return { type: "length_less", value: len.toString(), label: `Moins de ${len} lettres` };

    } else {
      // EXACTEMENT X LETTRES
      let len;
      if (difficulty === "facile") len = randomChoice([4, 5]);
      else if (difficulty === "normal") len = randomChoice([6, 7]);
      else len = randomChoice([8, 9]);
      
      return { type: "length_exactly", value: len.toString(), label: `Exactement ${len} lettres` };
    }
  }

  // Sinon (75% du temps), on utilise les syllabes classiques
  let pools = { pre: PREFIXES, suf: SUFFIXES, inf: INFIXES };
  
  if (difficulty === "facile") {
    pools = { 
      pre: PREFIXES.filter(s => s.length <= 2), 
      suf: SUFFIXES.filter(s => s.length <= 2), 
      inf: INFIXES.filter(s => s.length <= 2) 
    };
  } else if (difficulty === "difficile") {
    pools = { 
      pre: PREFIXES.filter(s => s.length >= 3), 
      suf: SUFFIXES.filter(s => s.length >= 3), 
      inf: INFIXES.filter(s => s.length >= 3) 
    };
  }

  const typeRand = Math.random();
  if (typeRand < 0.33) {
    const v = randomChoice(pools.pre);
    return { type: "starts_with", value: v, label: `Commence par "${v}"` };
  } else if (typeRand < 0.66) {
    const v = randomChoice(pools.suf);
    return { type: "ends_with", value: v, label: `Finit par "${v}"` };
  } else {
    const v = randomChoice(pools.inf);
    return { type: "contains", value: v, label: `Contient "${v}"` };
  }
}

// L'arbitre vérifie les mots
export function checkConstraint(word: string, constraint: BombConstraint): boolean {
  const w = word.toUpperCase();
  const v = constraint.value.toUpperCase();
  
  switch (constraint.type) {
    case "starts_with": return w.startsWith(v);
    case "ends_with": return w.endsWith(v);
    case "contains": return w.includes(v);
    case "not_contains": return !w.includes(v);
    case "length_greater": return w.length > Number(v);
    case "length_less": return w.length < Number(v); // NOUVEAU !
    case "length_exactly": return w.length === Number(v);
    default: return false;
  }
}