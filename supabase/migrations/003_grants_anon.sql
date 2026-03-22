-- Exécuter dans Supabase → SQL Editor si DELETE / INSERT échouent encore.
-- Donne à anon / authenticated les droits sur les tables du lobby.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.rooms to anon, authenticated;
grant select, insert, update, delete on table public.lobby_players to anon, authenticated;
