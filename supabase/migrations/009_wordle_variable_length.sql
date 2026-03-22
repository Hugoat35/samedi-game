-- Wordle : longueur de mot 5–7 selon le nombre de joueurs (≤3 → 5, 4–5 → 6, ≥6 → 7).

do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'wordle_dictionary' and con.contype = 'c'
  loop
    execute format('alter table public.wordle_dictionary drop constraint %I', cname);
  end loop;
end $$;

alter table public.wordle_dictionary
  add constraint wordle_dictionary_word_len_check
  check (char_length(word) between 5 and 7 and word = upper(word));

do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'wordle_secrets' and con.contype = 'c'
  loop
    execute format('alter table public.wordle_secrets drop constraint %I', cname);
  end loop;
end $$;

alter table public.wordle_secrets
  add constraint wordle_secrets_secret_len_check
  check (char_length(secret) between 5 and 7 and secret = upper(secret));

-- 6 lettres: 66 mots
insert into public.wordle_dictionary (word) values
  ('BANQUE'),
  ('BESOIN'),
  ('BILLET'),
  ('BOUTON'),
  ('BUREAU'),
  ('CABINE'),
  ('CADRAN'),
  ('CAMION'),
  ('CANARD'),
  ('CANINE'),
  ('CANTON'),
  ('CAPTIF'),
  ('CARAFE'),
  ('CARBON'),
  ('CASSER'),
  ('CASTOR'),
  ('CASTRE'),
  ('CAVITE'),
  ('CENDRE'),
  ('CENTRE'),
  ('CERCLE'),
  ('CHAINE'),
  ('CHARGE'),
  ('CHASSE'),
  ('CHATTE'),
  ('CHAUDE'),
  ('CHEMIN'),
  ('CHEQUE'),
  ('CHEVAL'),
  ('CHEVEU'),
  ('CHEVRE'),
  ('CHIMIE'),
  ('CHINER'),
  ('CHOISI'),
  ('CIMIER'),
  ('DRAGON'),
  ('DROITE'),
  ('ECOUTE'),
  ('EDITEE'),
  ('EDITER'),
  ('EFFACE'),
  ('EGALER'),
  ('ELANCE'),
  ('EMERVE'),
  ('ENCART'),
  ('FARINE'),
  ('FEMINE'),
  ('FESTIN'),
  ('FILTRE'),
  ('FINALE'),
  ('GARAGE'),
  ('JARDIN'),
  ('LIMITE'),
  ('LOUCHE'),
  ('MARCHE'),
  ('MARINE'),
  ('MORALE'),
  ('NAVIRE'),
  ('ORACLE'),
  ('PISTON'),
  ('PLACEE'),
  ('RIVAGE'),
  ('ROMANE'),
  ('SALINE'),
  ('TURBIN'),
  ('VALISE')
on conflict (word) do nothing;

-- 7 lettres: 68 mots
insert into public.wordle_dictionary (word) values
  ('ABSURDE'),
  ('ACADEME'),
  ('ACCORDE'),
  ('ACCUSER'),
  ('ACHETER'),
  ('ACTEURS'),
  ('ADAPTER'),
  ('ADJOINT'),
  ('ADMETTE'),
  ('ADOPTER'),
  ('ADORANT'),
  ('AERIENS'),
  ('AGENCER'),
  ('AGITANT'),
  ('AIGRETE'),
  ('AILANTE'),
  ('AISTERE'),
  ('BANQUET'),
  ('BARQUET'),
  ('BASTION'),
  ('BATAIVE'),
  ('BATINET'),
  ('BATISSE'),
  ('BATTURE'),
  ('BEATRIX'),
  ('BRIGADE'),
  ('BRIGAND'),
  ('CALCULS'),
  ('CAPITAL'),
  ('CAPRICE'),
  ('CAPTIVE'),
  ('CARTIER'),
  ('CARTONS'),
  ('CHALETS'),
  ('CHALEUR'),
  ('CHAMBRE'),
  ('CHANTER'),
  ('CHANTRE'),
  ('CHAPEAU'),
  ('CHARITE'),
  ('CHARMER'),
  ('CHASSER'),
  ('CHATEAU'),
  ('CHATONS'),
  ('CHATTER'),
  ('CHEMISE'),
  ('CHIENNE'),
  ('CHIFFRE'),
  ('DOMAINE'),
  ('DURABLE'),
  ('ECHANGE'),
  ('FESTINS'),
  ('GARDIEN'),
  ('HABITAT'),
  ('JARDINS'),
  ('MALADIE'),
  ('MARCHES'),
  ('NATUREL'),
  ('PASSAGE'),
  ('PEINTRE'),
  ('QUALITE'),
  ('RAPPORT'),
  ('SECTION'),
  ('SILENCE'),
  ('TABLEAU'),
  ('TRAVAIL'),
  ('VILLAGE'),
  ('VITESSE')
on conflict (word) do nothing;

create or replace function public.wordle_feedback(secret text, guess text)
returns text[]
language plpgsql
immutable
as $$
declare
  s text := upper(trim(secret));
  g text := upper(trim(guess));
  n int;
  res text[];
  s_chr text[];
  g_chr text[];
  i int;
  j int;
begin
  n := length(s);
  if n < 5 or n > 7 or length(g) <> n then
    if n between 5 and 7 then
      return array_fill('X'::text, ARRAY[n]);
    end if;
    return array_fill('X'::text, ARRAY[greatest(length(g), length(s), 1)]);
  end if;

  res := array_fill('X'::text, ARRAY[n]);
  s_chr := array_fill(''::text, ARRAY[n]);
  g_chr := array_fill(''::text, ARRAY[n]);

  for i in 1..n loop
    s_chr[i] := substr(s, i, 1);
    g_chr[i] := substr(g, i, 1);
  end loop;

  for i in 1..n loop
    if g_chr[i] = s_chr[i] then
      res[i] := 'G';
      s_chr[i] := null;
      g_chr[i] := null;
    end if;
  end loop;

  for i in 1..n loop
    if g_chr[i] is null then
      continue;
    end if;
    for j in 1..n loop
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
  n_players int;
  word_len int;
begin
  if p_rounds < 1 or p_rounds > 25 then
    return jsonb_build_object('ok', false, 'error', 'bad_rounds');
  end if;

  select array_agg(id::text order by random()) into ord
  from lobby_players where room_code = p_code;

  if ord is null or coalesce(array_length(ord, 1), 0) < 1 then
    return jsonb_build_object('ok', false, 'error', 'no_players');
  end if;

  n_players := array_length(ord, 1);

  if n_players <= 3 then word_len := 5;
  elsif n_players <= 5 then word_len := 6;
  else word_len := 7;
  end if;

  select d.word into sec
  from wordle_dictionary d
  where char_length(d.word) = word_len
  order by random() limit 1;

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
    'yellow_points', 20,
    'word_length', word_len
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
  prior int[];
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
  n int;
  word_len int;
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

  n := length(secret);
  word_len := coalesce((w->>'word_length')::int, n);
  prior := array_fill(0, ARRAY[n]);

  if length(g_word) <> n or g_word !~ '^[A-Z]+$' then
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
  for j in 1..n loop
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
  for j in 1..n loop
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

    select d.word into next_secret
    from wordle_dictionary d
    where char_length(d.word) = word_len
    order by random() limit 1;

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
