Dictionnaire Wordle (gros fichier, non versionné)
================================================

1. Place ton fichier texte ici, par exemple :
      data/wordlist-fr.txt

2. Une ligne = un mot (accents acceptés : ils seront retirés à l’import).

3. Longueurs utilisées en jeu : 3 à 7 lettres (le reste est ignoré).

4. Import vers Supabase (après avoir configuré les variables d’environnement) :
      npm run import-wordlist

   Variables requises dans .env.local (ou l’environnement) :
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY   (clé « service_role », jamais dans le front)

5. Après import, exécute sur Supabase (SQL) :
      ANALYZE public.wordle_dictionary;
