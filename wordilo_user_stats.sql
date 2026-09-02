-- =============================================================================
-- Wordilo · Vista delle statistiche per utente · Passo 6
--
-- Conta le partite di ciascun utente a partire dalla tabella `games`.
-- Grazie a "security_invoker = true", la vista rispetta la RLS di `games`:
-- quando l'app la interroga, ogni utente vede aggregata SOLO la propria riga
-- (non serve filtrare per user_id lato app). Sicuro da rieseguire.
-- =============================================================================

create or replace view public.user_stats
with (security_invoker = true) as
select
  user_id,
  count(*)::int                                     as giocate,
  count(*) filter (where result = 'won')::int       as vinte,
  count(*) filter (where result = 'lost')::int      as perse
from public.games
group by user_id;

-- Rende la vista interrogabile via API (PostgREST usa questi ruoli).
grant select on public.user_stats to anon, authenticated;

-- Fa ricaricare a PostgREST lo schema, così la vista è subito disponibile.
notify pgrst, 'reload schema';
