-- À exécuter dans Supabase → SQL Editor (après 001_lobby.sql).
-- Autorise la suppression d’une salle (hôte) ou d’un joueur (quitter).

drop policy if exists "rooms_delete" on public.rooms;
create policy "rooms_delete" on public.rooms for delete using (true);

drop policy if exists "lobby_players_delete" on public.lobby_players;
create policy "lobby_players_delete" on public.lobby_players for delete using (true);
