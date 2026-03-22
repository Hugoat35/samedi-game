-- Vérification dictionnaire côté client (sans exposer la table).

create or replace function public.wordle_word_exists(p_word text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.wordle_dictionary
    where word = upper(trim(p_word))
  );
$$;

grant execute on function public.wordle_word_exists(text) to anon, authenticated;
