-- Si tu n’as que la table `rooms` : exécute CE script entier dans Supabase → SQL Editor.
-- Il crée `lobby_players` (liste des joueurs), les politiques RLS, le temps réel et les droits.

-- 1) Table des joueurs dans la salle (liée au code de la salle)
create table if not exists public.lobby_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms (code) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists lobby_players_room_code_idx on public.lobby_players (room_code);

-- 2) RLS
alter table public.lobby_players enable row level security;

drop policy if exists "lobby_players_read" on public.lobby_players;
create policy "lobby_players_read" on public.lobby_players for select using (true);

drop policy if exists "lobby_players_insert" on public.lobby_players;
create policy "lobby_players_insert" on public.lobby_players for insert with check (true);

drop policy if exists "lobby_players_delete" on public.lobby_players;
create policy "lobby_players_delete" on public.lobby_players for delete using (true);

-- 3) Temps réel (ignore l’erreur si la table est déjà dans la publication)
alter publication supabase_realtime add table public.lobby_players;

-- 4) Droits pour l’API (clé anon)
grant select, insert, update, delete on table public.lobby_players to anon, authenticated;
