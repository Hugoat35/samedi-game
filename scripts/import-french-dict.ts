import { createReadStream, existsSync, readFileSync } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// --- Ajout de la fonction pour lire le fichier .env.local ---
function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const s = readFileSync(p, "utf8");
  for (const line of s.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// On charge les variables d'environnement
loadEnvLocal();
// -------------------------------------------------------------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Clés Supabase manquantes dans l'environnement.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const PATH = resolve(process.cwd(), "scripts/wordlist_bomb.txt");

async function main() {
  if (!existsSync(PATH)) return console.error(`Fichier introuvable : ${PATH}`);

  const rl = createInterface({
    input: createReadStream(PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let batch: { word: string }[] = [];
  let total = 0;

  console.log("🚀 Envoi des mots vers french_dictionary...");

  for await (const line of rl) {
    const word = line.trim();
    if (word) {
      batch.push({ word });
      total++;
    }

    // On envoie par paquets de 1000
    if (batch.length >= 1000) {
      const { error } = await supabase.from("french_dictionary").upsert(batch, { onConflict: "word", ignoreDuplicates: true });
      if (error) console.error("Erreur:", error.message);
      batch = [];
      process.stdout.write(`\r${total} mots envoyés...`);
    }
  }

  // Envoi des derniers mots restants
  if (batch.length > 0) {
    const { error } = await supabase.from("french_dictionary").upsert(batch, { onConflict: "word", ignoreDuplicates: true });
    if (error) console.error("Erreur:", error.message);
  }

  console.log(`\n✅ Terminé ! ${total} mots importés dans french_dictionary.`);
}

main();