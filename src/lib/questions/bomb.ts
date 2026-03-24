export type BombConstraintType = "starts_with" | "ends_with" | "contains";

export type BombConstraint = {
  type: BombConstraintType;
  value: string;
  label: string;
};

const PREFIXES = ["CO", "RE", "MA", "DE", "EN", "PA", "IN", "PR", "PO", "TE", "CA", "SA"];
const SUFFIXES = ["ER", "ES", "NT", "ON", "TE", "UR", "IR", "IE", "AL", "ET", "EZ", "IS"];
const INFIXES = ["AR", "OU", "EN", "AN", "ON", "OR", "IN", "AL", "UR", "OM", "IM", "OI"];

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