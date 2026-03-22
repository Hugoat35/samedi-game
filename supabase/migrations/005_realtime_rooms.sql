-- Obligatoire pour expulser les invités quand l’hôte supprime la salle (écoute DELETE sur public.rooms).
-- Exécuter dans Supabase → SQL Editor (ignore l’erreur si la table est déjà dans la publication).

alter publication supabase_realtime add table public.rooms;
