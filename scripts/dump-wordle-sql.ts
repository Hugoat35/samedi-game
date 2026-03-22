import { WORDS_FR_5, WORDS_FR_6, WORDS_FR_7 } from "../src/lib/wordle-dict";

function dump(label: string, words: readonly string[]) {
  console.log(`-- ${label}: ${words.length} mots`);
  console.log(`insert into public.wordle_dictionary (word) values`);
  console.log(words.map((w) => `  ('${w}')`).join(",\n") + "\non conflict (word) do nothing;");
}

dump("5 lettres", WORDS_FR_5);
dump("6 lettres", WORDS_FR_6);
dump("7 lettres", WORDS_FR_7);
