export type BombConstraintType = "starts_with" | "ends_with" | "contains";

export type BombConstraint = {
  type: BombConstraintType;
  value: string;
  label: string;
};

const PREFIXES = [
  // 2 lettres (très courants)
  "BA", "CA", "CH", "CO", "DE", "DI", "EN", "FI", "GA", "IN", 
  "LA", "MA", "MI", "MO", "PA", "PI", "PO", "PR", "QU", "RE", 
  "RO", "SA", "SE", "TA", "TE", "TR", "VA", "VI",
  // 3 lettres (classiques)
  "ACC", "APP", "COM", "CON", "DES", "ENT", "PAR", "PRE", 
  "PRO", "SOU", "SUR", "TRA"
];

const SUFFIXES = [
  // 2 lettres
  "AL", "AS", "AT", "EE", "EL", "ER", "ES", "ET", "EU", "EZ", 
  "IE", "IR", "IS", "IT", "NT", "ON", "OS", "OT", "RE", "TE", 
  "TS", "UR", "US", "UX",
  // 3 lettres (terminaisons fréquentes)
  "AIT", "ANT", "ARD", "AUX", "BLE", "EAU", "ENT", "EUR", 
  "IER", "ION", "OIR", "OIS", "ONS", "OUR", "TTE", "URE"
];

const INFIXES = [
  // 2 lettres (les sons les plus fréquents)
  "AL", "AN", "AR", "AS", "AT", "CH", "EI", "EM", "EN", "ER", 
  "ES", "ET", "EU", "IL", "IM", "IN", "IR", "IS", "IT", "OI", 
  "OM", "ON", "OR", "OS", "OU", "QU", "RE", "SS", "TE", "TI", 
  "TR", "UI", "UN", "UR",
  // 3 lettres (sons complexes mais très courants au milieu d'un mot)
  "AIN", "AIR", "ANT", "EAU", "EIN", "ENT", "EUR", "ILL", 
  "ION", "OUR", "QUE", "TRE"
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateBombConstraint(): BombConstraint {
  const typeRand = Math.random();
  
  if (typeRand < 0.33) {
    const val = randomChoice(PREFIXES);
    return { type: "starts_with", value: val, label: `Commence par "${val}"` };
  } else if (typeRand < 0.66) {
    const val = randomChoice(SUFFIXES);
    return { type: "ends_with", value: val, label: `Finit par "${val}"` };
  } else {
    const val = randomChoice(INFIXES);
    return { type: "contains", value: val, label: `Contient "${val}"` };
  }
}

// Fonction utilitaire pour vérifier si un mot respecte la consigne
export function checkConstraint(word: string, constraint: BombConstraint): boolean {
  const w = word.toUpperCase();
  const v = constraint.value.toUpperCase();
  
  switch (constraint.type) {
    case "starts_with": return w.startsWith(v);
    case "ends_with": return w.endsWith(v);
    case "contains": return w.includes(v);
    default: return false;
  }
}