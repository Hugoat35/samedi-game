-- Exécuter ce script dans Supabase → SQL Editor (nouveau projet ou base existante).

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  constraint rooms_code_len check (char_length(code) = 4),
  created_at timestamptz not null default now()
);

create table if not exists public.lobby_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms (code) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists lobby_players_room_code_idx on public.lobby_players (room_code);

alter table public.rooms enable row level security;
alter table public.lobby_players enable row level security;

drop policy if exists "rooms_read" on public.rooms;
create policy "rooms_read" on public.rooms for select using (true);

drop policy if exists "rooms_insert" on public.rooms;
create policy "rooms_insert" on public.rooms for insert with check (true);

drop policy if exists "lobby_players_read" on public.lobby_players;
create policy "lobby_players_read" on public.lobby_players for select using (true);

drop policy if exists "lobby_players_insert" on public.lobby_players;
create policy "lobby_players_insert" on public.lobby_players for insert with check (true);

drop policy if exists "rooms_delete" on public.rooms;
create policy "rooms_delete" on public.rooms for delete using (true);

drop policy if exists "lobby_players_delete" on public.lobby_players;
create policy "lobby_players_delete" on public.lobby_players for delete using (true);

-- Temps réel : liste des joueurs synchronisée entre appareils
alter publication supabase_realtime add table public.lobby_players;
