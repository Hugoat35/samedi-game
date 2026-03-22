-- Fusion atomique des réponses (évite la perte de réponse si deux joueurs valident en même temps).
-- À exécuter dans Supabase → SQL Editor.

alter table public.rooms add column if not exists game_data jsonb default '{}'::jsonb;
alter table public.rooms add column if not exists game_state text default 'lobby';
alter table public.rooms add column if not exists current_question_index int default 0;

drop policy if exists "rooms_update" on public.rooms;
create policy "rooms_update" on public.rooms for update using (true) with check (true);

create or replace function public.merge_room_answer(
  p_code text,
  p_player_id text,
  p_question_id text,
  p_question_type text,
  p_answer_str text,
  p_minibac jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gd jsonb;
  hist jsonb;
  ans jsonb;
  i int;
  len int;
  found boolean;
  subs jsonb;
  new_entry jsonb;
begin
  select game_data into gd from public.rooms where code = p_code for update;
  if gd is null then
    gd := '{}'::jsonb;
  end if;

  ans := coalesce(gd->'answers', '{}'::jsonb)
    || jsonb_build_object(p_player_id, to_jsonb(p_answer_str));
  gd := jsonb_set(gd, '{answers}', ans);

  if p_question_type = 'minibac' and p_minibac is not null then
    hist := coalesce(gd->'minibac_history', '[]'::jsonb);
    found := false;
    len := coalesce(jsonb_array_length(hist), 0);

    if len > 0 then
      for i in 0..(len - 1) loop
        if coalesce((hist->i)->>'questionId', '') = p_question_id then
          subs := coalesce(hist->i->'submissions', '{}'::jsonb)
            || jsonb_build_object(p_player_id, p_minibac);
          hist := jsonb_set(hist, array[i::text, 'submissions'], subs, true);
          found := true;
          exit;
        end if;
      end loop;
    end if;

    if not found then
      new_entry := jsonb_build_object(
        'questionId', to_jsonb(p_question_id),
        'submissions', jsonb_build_object(p_player_id, p_minibac)
      );
      hist := hist || jsonb_build_array(new_entry);
    end if;

    gd := jsonb_set(gd, '{minibac_history}', hist);
  end if;

  update public.rooms set game_data = gd where code = p_code;
end;
$$;

grant execute on function public.merge_room_answer(text, text, text, text, text, jsonb) to anon, authenticated;
