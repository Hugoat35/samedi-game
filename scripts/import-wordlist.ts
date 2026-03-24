/**
 * Importe un fichier texte (1 mot par ligne) dans public.wordle_dictionary.
 * Place le fichier dans data/wordlist-fr.txt ou passe WORDLIST_PATH.
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service_role, pas l’anon).
 */
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

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

loadEnvLocal();

const WORDLIST_DEFAULT = resolve(process.cwd(), "data/wordlist_finale.txt");

/** Sans accents, A–Z uniquement, longueurs 3–7 (aligné jeu Wordle). */
function normalizeWord(raw: string): string | null {
  const s = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  if (s.length < 3 || s.length > 10) return null;
  if (!/^[A-Z]+$/.test(s)) return null;
  return s;
}

async function main() {
  const path = process.env.WORDLIST_PATH?.trim() || WORDLIST_DEFAULT;
  if (!existsSync(path)) {
    console.error(`Fichier introuvable : ${path}`);
    console.error("Copie ton fichier sous data/wordlist-fr.txt ou définis WORDLIST_PATH.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const seen = new Set<string>();
  let lines = 0;
  let kept = 0;
  let batch: { word: string }[] = [];
  const BATCH = 800;

  const flush = async () => {
    if (batch.length === 0) return;
    const chunk = batch;
    batch = [];
    const { error } = await supabase.from("wordle_dictionary").upsert(chunk, {
      onConflict: "word",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("Erreur insert:", error.message);
      process.exit(1);
    }
  };

  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lines++;
    const w = normalizeWord(line);
    if (!w || seen.has(w)) continue;
    seen.add(w);
    kept++;
    batch.push({ word: w });
    if (batch.length >= BATCH) {
      await flush();
      process.stdout.write(`\r${kept} mots uniques importés…`);
    }
  }

  await flush();
  console.log(`\nOK : ${lines} lignes lues, ${kept} mots uniques (3–10 lettres, sans accents).`);
  console.log("Sur Supabase SQL, exécute : ANALYZE public.wordle_dictionary;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
