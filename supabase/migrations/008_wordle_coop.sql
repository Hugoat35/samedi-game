-- Wordle coopératif : mot secret côté serveur, indices partagés, tour par tour.
-- Exécuter dans Supabase → SQL Editor après les migrations précédentes.

create table if not exists public.wordle_dictionary (
  word text primary key check (char_length(word) = 5 and word = upper(word))
);

create table if not exists public.wordle_secrets (
  room_code text primary key references public.rooms (code) on delete cascade,
  secret text not null check (char_length(secret) = 5 and secret = upper(secret))
);

-- Pas d’accès direct client : seules les fonctions SECURITY DEFINER lisent/écrivent.
revoke all on public.wordle_secrets from anon, authenticated;
grant all on public.wordle_secrets to postgres;

revoke all on public.wordle_dictionary from anon, authenticated;
grant all on public.wordle_dictionary to postgres;

create or replace function public.wordle_fb_rank(f text)
returns int
language sql
immutable
as $$
  select case f
    when 'G' then 3
    when 'Y' then 2
    when 'X' then 1
    else 0
  end;
$$;

create or replace function public.wordle_feedback(secret text, guess text)
returns text[]
language plpgsql
immutable
as $$
declare
  s text := upper(trim(secret));
  g text := upper(trim(guess));
  res text[] := array['X','X','X','X','X'];
  s_chr text[];
  g_chr text[];
  i int;
  j int;
begin
  if length(s) <> 5 or length(g) <> 5 then
    return res;
  end if;

  s_chr := array['','','','',''];
  g_chr := array['','','','',''];
  for i in 1..5 loop
    s_chr[i] := substr(s, i, 1);
    g_chr[i] := substr(g, i, 1);
  end loop;

  for i in 1..5 loop
    if g_chr[i] = s_chr[i] then
      res[i] := 'G';
      s_chr[i] := null;
      g_chr[i] := null;
    end if;
  end loop;

  for i in 1..5 loop
    if g_chr[i] is null then
      continue;
    end if;
    for j in 1..5 loop
      if s_chr[j] is not null and s_chr[j] = g_chr[i] then
        res[i] := 'Y';
        s_chr[j] := null;
        exit;
      end if;
    end loop;
  end loop;

  return res;
end;
$$;
-- 346 mots
insert into public.wordle_dictionary (word) values
  ('AIDER'),
  ('AIGLE'),
  ('AIGRE'),
  ('AIRES'),
  ('ARBRE'),
  ('AUTEL'),
  ('AVION'),
  ('BAGUE'),
  ('BALLE'),
  ('BANAL'),
  ('BARGE'),
  ('BARRE'),
  ('BATON'),
  ('BICHE'),
  ('BILLE'),
  ('BISON'),
  ('BRIDE'),
  ('CABAN'),
  ('CABAS'),
  ('CABLE'),
  ('CANAL'),
  ('CARTE'),
  ('CASSE'),
  ('CASTE'),
  ('CAUSE'),
  ('CHAIR'),
  ('CHANT'),
  ('CHAPE'),
  ('CHAUX'),
  ('CHEFS'),
  ('CHERS'),
  ('CHUTE'),
  ('CIBLE'),
  ('CIDRE'),
  ('CIGNE'),
  ('CIGUE'),
  ('CISTE'),
  ('CITEE'),
  ('CITES'),
  ('CIVIL'),
  ('CLONE'),
  ('DANSE'),
  ('DATES'),
  ('DEBIT'),
  ('DEBUT'),
  ('DECOR'),
  ('DELIT'),
  ('DEMIE'),
  ('DEPOT'),
  ('DETTE'),
  ('DEUIL'),
  ('DIANE'),
  ('DIVAN'),
  ('DOIGT'),
  ('DOUZE'),
  ('DROIT'),
  ('DUVET'),
  ('ECLAT'),
  ('ELITE'),
  ('ELOGE'),
  ('EMAIL'),
  ('ENFER'),
  ('ENTRE'),
  ('ENVOI'),
  ('ENVOL'),
  ('EPOUX'),
  ('EPURE'),
  ('ERGOT'),
  ('ESSAI'),
  ('ETAGE'),
  ('ETAIN'),
  ('ETUDE'),
  ('FABLE'),
  ('FACON'),
  ('FAIRE'),
  ('FATAL'),
  ('FAUNE'),
  ('FEMME'),
  ('FERME'),
  ('FESTE'),
  ('FIOLE'),
  ('FIXER'),
  ('FLORE'),
  ('FORCE'),
  ('FORGE'),
  ('FORME'),
  ('FORTE'),
  ('FOYER'),
  ('FRUIT'),
  ('FUMER'),
  ('GAMME'),
  ('GARDE'),
  ('GENIE'),
  ('GENRE'),
  ('GESTE'),
  ('GIVRE'),
  ('GLACE'),
  ('GLOBE'),
  ('GRADE'),
  ('GRAIN'),
  ('GRAND'),
  ('GRAVE'),
  ('GRISE'),
  ('GUERE'),
  ('HACHE'),
  ('HALLE'),
  ('HARPE'),
  ('HAUTE'),
  ('HERBE'),
  ('HEROS'),
  ('HOTEL'),
  ('HUILE'),
  ('HUTTE'),
  ('IDEAL'),
  ('IMAGE'),
  ('INDEX'),
  ('JAPON'),
  ('JETON'),
  ('JEUDI'),
  ('JEUNE'),
  ('JOUER'),
  ('JOUET'),
  ('JUGES'),
  ('JUSTE'),
  ('KAYAK'),
  ('LABEL'),
  ('LACHE'),
  ('LAINE'),
  ('LAPIN'),
  ('LARGE'),
  ('LASER'),
  ('LATIN'),
  ('LEGAL'),
  ('LENTE'),
  ('LEVER'),
  ('LIGNE'),
  ('LISSE'),
  ('LISTE'),
  ('LIVRE'),
  ('LOCAL'),
  ('LOGIS'),
  ('LOUPE'),
  ('LOYAL'),
  ('LUNDI'),
  ('MACHE'),
  ('MAGIE'),
  ('MAMAN'),
  ('MANGE'),
  ('MARIE'),
  ('MARIN'),
  ('MASSE'),
  ('MERCI'),
  ('METAL'),
  ('METRE'),
  ('MICRO'),
  ('MIEUX'),
  ('MILLE'),
  ('MINCE'),
  ('MONDE'),
  ('MONTE'),
  ('MORAL'),
  ('MOTTE'),
  ('MOULE'),
  ('MUSEE'),
  ('NAIVE'),
  ('NATIF'),
  ('NAVET'),
  ('NEIGE'),
  ('NEUVE'),
  ('NICHE'),
  ('NIECE'),
  ('NOIRE'),
  ('NORME'),
  ('NOTRE'),
  ('NUAGE'),
  ('OASIS'),
  ('OCEAN'),
  ('OFFRE'),
  ('OMBRE'),
  ('ONCLE'),
  ('OPERA'),
  ('ORAGE'),
  ('ORDRE'),
  ('OVALE'),
  ('PACTE'),
  ('PAIRE'),
  ('PALME'),
  ('PANNE'),
  ('PAPES'),
  ('PARCS'),
  ('PARES'),
  ('PARTI'),
  ('PASSE'),
  ('PATIO'),
  ('PAUME'),
  ('PAUSE'),
  ('PAYES'),
  ('PEINE'),
  ('PENCE'),
  ('PENSE'),
  ('PERLE'),
  ('PESTE'),
  ('PETIT'),
  ('PIECE'),
  ('PIEGE'),
  ('PINCE'),
  ('PISTE'),
  ('PIVOT'),
  ('PLACE'),
  ('PLAGE'),
  ('PLANE'),
  ('PLUME'),
  ('POEME'),
  ('POETE'),
  ('POINT'),
  ('POMME'),
  ('POMPE'),
  ('PORTE'),
  ('POSER'),
  ('POSTE'),
  ('POULE'),
  ('PRETE'),
  ('PRISE'),
  ('PRIVE'),
  ('PROSE'),
  ('PULSE'),
  ('PURGE'),
  ('QUART'),
  ('QUEUE'),
  ('QUIET'),
  ('RADAR'),
  ('RAIDE'),
  ('RANGE'),
  ('RATES'),
  ('RATIO'),
  ('RAVIN'),
  ('RAYON'),
  ('REGAL'),
  ('REGLE'),
  ('REINE'),
  ('REJET'),
  ('RELIE'),
  ('RENNE'),
  ('RENTE'),
  ('REPAS'),
  ('RESTE'),
  ('REVUE'),
  ('RHUME'),
  ('RICHE'),
  ('ROBIN'),
  ('ROCHE'),
  ('ROMAN'),
  ('RONDE'),
  ('ROUGE'),
  ('ROULE'),
  ('ROUTE'),
  ('ROYAL'),
  ('RUBAN'),
  ('RURAL'),
  ('RUSSE'),
  ('SABLE'),
  ('SABOT'),
  ('SABRE'),
  ('SAINE'),
  ('SAINT'),
  ('SALON'),
  ('SALUE'),
  ('SANTE'),
  ('SAUCE'),
  ('SAUTE'),
  ('SAUVE'),
  ('SAVON'),
  ('SCENE'),
  ('SCORE'),
  ('SECHE'),
  ('SELLE'),
  ('SENSE'),
  ('SERGE'),
  ('SERIE'),
  ('SERVE'),
  ('SIEGE'),
  ('SIGNE'),
  ('SILOS'),
  ('SIMON'),
  ('SIRES'),
  ('SITES'),
  ('SOBRE'),
  ('SOEUR'),
  ('SOINS'),
  ('SOLDE'),
  ('SONGE'),
  ('SORTE'),
  ('SOUDE'),
  ('SOULE'),
  ('SOUPE'),
  ('SPACE'),
  ('SPOTS'),
  ('STADE'),
  ('STAGE'),
  ('STOCK'),
  ('STORE'),
  ('STYLE'),
  ('SUCRE'),
  ('SUITE'),
  ('SUJET'),
  ('SUPER'),
  ('SURGE'),
  ('SWING'),
  ('TABAC'),
  ('TABLE'),
  ('TACHE'),
  ('TALON'),
  ('TAPES'),
  ('TAPIS'),
  ('TARDE'),
  ('TARES'),
  ('TARTE'),
  ('TASSE'),
  ('TAXES'),
  ('TAXIS'),
  ('TELLE'),
  ('TEMPS'),
  ('TENUE'),
  ('TERME'),
  ('TERRE'),
  ('TESTS'),
  ('TETES'),
  ('TEXTE'),
  ('THEME'),
  ('THESE'),
  ('THONS'),
  ('TIGRE'),
  ('TILDE'),
  ('TITRE'),
  ('TOMBE'),
  ('TONNE'),
  ('TOQUE'),
  ('TOURS'),
  ('TOUTE'),
  ('TRACT'),
  ('TRAIN'),
  ('TRAIT'),
  ('TRAME'),
  ('TREVE'),
  ('TULLE'),
  ('TUYAU')
on conflict (word) do nothing;
create or replace function public.wordle_start_game(p_code text, p_rounds int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ord text[];
  sec text;
  w jsonb;
  gd jsonb;
begin
  if p_rounds < 1 or p_rounds > 25 then
    return jsonb_build_object('ok', false, 'error', 'bad_rounds');
  end if;

  select array_agg(id::text order by random()) into ord
  from lobby_players where room_code = p_code;

  if ord is null or coalesce(array_length(ord, 1), 0) < 1 then
    return jsonb_build_object('ok', false, 'error', 'no_players');
  end if;

  select word into sec from wordle_dictionary order by random() limit 1;
  if sec is null then
    return jsonb_build_object('ok', false, 'error', 'no_dictionary');
  end if;

  insert into wordle_secrets (room_code, secret)
  values (p_code, sec)
  on conflict (room_code) do update set secret = excluded.secret;

  w := jsonb_build_object(
    'rounds_total', p_rounds,
    'round_index', 0,
    'guesses', '[]'::jsonb,
    'player_order', to_jsonb(ord),
    'turn_index', 0,
    'status', 'playing',
    'last_revealed_word', null,
    'last_round_guesses', null,
    'win_points', 200,
    'green_points', 50,
    'yellow_points', 20
  );

  gd := jsonb_build_object(
    'game_kind', 'wordle',
    'scores', '{}'::jsonb,
    'wordle', w
  );

  update public.rooms
  set
    game_state = 'playing',
    current_question_index = 0,
    game_data = gd
  where code = p_code;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.wordle_submit_guess(p_code text, p_player_id uuid, p_guess text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gd jsonb;
  w jsonb;
  secret text;
  guesses jsonb;
  prior int[] := array[0,0,0,0,0];
  gi int;
  j int;
  fb text[];
  g_word text := upper(trim(p_guess));
  turn_idx int;
  ord jsonb;
  current_id text;
  n_players int;
  green_bonus int;
  yellow_bonus int;
  win_pts int;
  green_pts int;
  yellow_pts int;
  line_pts int;
  pid text := p_player_id::text;
  rounds_total int;
  round_idx int;
  new_guess jsonb;
  scores jsonb;
  f text;
  prior_g int;
  won boolean;
  next_secret text;
  new_ord text[];
  row_t text;
  pos int;
begin
  select game_data into gd from public.rooms where code = p_code for update;
  if gd is null then
    return jsonb_build_object('ok', false, 'error', 'no_room');
  end if;

  if coalesce(gd->>'game_kind', '') <> 'wordle' then
    return jsonb_build_object('ok', false, 'error', 'not_wordle');
  end if;

  w := gd->'wordle';
  if coalesce(w->>'status', '') <> 'playing' then
    return jsonb_build_object('ok', false, 'error', 'not_playing');
  end if;

  select s.secret into secret from public.wordle_secrets s where s.room_code = p_code;
  if secret is null then
    return jsonb_build_object('ok', false, 'error', 'no_secret');
  end if;

  if length(g_word) <> 5 or g_word !~ '^[A-Z]+$' then
    return jsonb_build_object('ok', false, 'error', 'bad_length');
  end if;

  if not exists (select 1 from wordle_dictionary d where d.word = g_word) then
    return jsonb_build_object('ok', false, 'error', 'unknown_word');
  end if;

  ord := w->'player_order';
  n_players := coalesce(jsonb_array_length(ord), 0);
  if n_players < 1 then
    return jsonb_build_object('ok', false, 'error', 'no_order');
  end if;

  turn_idx := coalesce((w->>'turn_index')::int, 0);
  current_id := ord->>turn_idx;

  if current_id is null or current_id <> pid then
    return jsonb_build_object('ok', false, 'error', 'not_your_turn');
  end if;

  guesses := coalesce(w->'guesses', '[]'::jsonb);

  if coalesce(jsonb_array_length(guesses), 0) > 0 then
    for gi in 0..(jsonb_array_length(guesses) - 1) loop
      pos := 1;
      for row_t in select * from jsonb_array_elements_text((guesses->gi)->'feedback') loop
        prior[pos] := greatest(prior[pos], public.wordle_fb_rank(row_t));
        pos := pos + 1;
      end loop;
    end loop;
  end if;

  fb := public.wordle_feedback(secret, g_word);

  green_bonus := 0;
  yellow_bonus := 0;
  for j in 1..5 loop
    f := fb[j];
    prior_g := prior[j];
    if f = 'G' and prior_g < 3 then
      green_bonus := green_bonus + 1;
    elsif f = 'Y' and prior_g < 2 then
      yellow_bonus := yellow_bonus + 1;
    end if;
  end loop;

  win_pts := coalesce((w->>'win_points')::int, 200);
  green_pts := coalesce((w->>'green_points')::int, 50);
  yellow_pts := coalesce((w->>'yellow_points')::int, 20);

  won := true;
  for j in 1..5 loop
    if fb[j] <> 'G' then
      won := false;
      exit;
    end if;
  end loop;

  line_pts := green_bonus * green_pts + yellow_bonus * yellow_pts;
  scores := coalesce(gd->'scores', '{}'::jsonb);

  if won then
    scores := jsonb_set(
      scores,
      array[pid],
      to_jsonb(coalesce((scores->>pid)::int, 0) + line_pts + win_pts)
    );
  else
    scores := jsonb_set(
      scores,
      array[pid],
      to_jsonb(coalesce((scores->>pid)::int, 0) + line_pts)
    );
  end if;

  new_guess := jsonb_build_object(
    'playerId', pid,
    'word', g_word,
    'feedback', to_jsonb(fb)
  );

  guesses := guesses || jsonb_build_array(new_guess);

  rounds_total := coalesce((w->>'rounds_total')::int, 1);
  round_idx := coalesce((w->>'round_index')::int, 0);

  if won then
    w := jsonb_set(w, '{last_revealed_word}', to_jsonb(secret), true);
    w := jsonb_set(w, '{last_round_guesses}', guesses, true);
    round_idx := round_idx + 1;
    w := jsonb_set(w, '{round_index}', to_jsonb(round_idx), true);

    if round_idx >= rounds_total then
      w := jsonb_set(w, '{status}', '"game_over"', true);
      w := jsonb_set(w, '{guesses}', '[]'::jsonb, true);

      update public.rooms
      set
        game_data = jsonb_build_object(
          'game_kind', 'wordle',
          'scores', scores,
          'wordle', w
        ),
        game_state = 'finished'
      where code = p_code;

      return jsonb_build_object(
        'ok', true,
        'won', true,
        'game_over', true,
        'feedback', to_jsonb(fb)
      );
    end if;

    select d.word into next_secret from wordle_dictionary d order by random() limit 1;
    if next_secret is null then
      return jsonb_build_object('ok', false, 'error', 'no_dictionary');
    end if;

    update public.wordle_secrets s set secret = next_secret where s.room_code = p_code;

    select array_agg(u order by random()) into new_ord
    from (select jsonb_array_elements_text(ord) as u) s;

    w := jsonb_set(w, '{guesses}', '[]'::jsonb, true);
    w := jsonb_set(w, '{player_order}', to_jsonb(new_ord), true);
    w := jsonb_set(w, '{turn_index}', to_jsonb(0), true);
    w := jsonb_set(w, '{last_round_guesses}', 'null'::jsonb, true);

    gd := jsonb_build_object(
      'game_kind', 'wordle',
      'scores', scores,
      'wordle', w
    );

    update public.rooms set game_data = gd where code = p_code;

    return jsonb_build_object(
      'ok', true,
      'won', true,
      'game_over', false,
      'feedback', to_jsonb(fb)
    );
  end if;

  turn_idx := (turn_idx + 1) % n_players;
  w := jsonb_set(w, '{guesses}', guesses, true);
  w := jsonb_set(w, '{turn_index}', to_jsonb(turn_idx), true);

  gd := jsonb_build_object(
    'game_kind', 'wordle',
    'scores', scores,
    'wordle', w
  );

  update public.rooms set game_data = gd where code = p_code;

  return jsonb_build_object(
    'ok', true,
    'won', false,
    'game_over', false,
    'feedback', to_jsonb(fb)
  );
end;
$$;

grant execute on function public.wordle_start_game(text, int) to anon, authenticated;
grant execute on function public.wordle_submit_guess(text, uuid, text) to anon, authenticated;
