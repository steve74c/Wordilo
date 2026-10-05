-- =====================================================================
--  SpotLex — AIUTI a pagamento (monete)
--
--  1) tabella `aiuti`: COSA si può comprare, a QUANTO, DOVE (da solo/online)
--     e QUANTE volte per partita. Si cambia dal Table Editor, senza toccare
--     l'app né questo script.
--  2) `movimenti_monete` accetta il nuovo tipo 'aiuto'.
--  3) funzione `compra_aiuto(...)`: scala le monete lato server.
--
--  Esegui tutto nel SQL Editor di Supabase. Si può rieseguire.
-- =====================================================================


-- 1) CONFIGURAZIONE ---------------------------------------------------------
--    Una riga per (tipo di aiuto, modalità).
--      costo          → monete da pagare
--      attivo         → false = il pulsante sparisce
--      in_solo        → acquistabile nelle partite da solo
--      in_online      → acquistabile nelle sfide online
--      max_per_partita→ quante volte si può comprare nella stessa partita
--      valore         → per 'tempo': secondi in più (per le lettere non serve)
create table if not exists public.aiuti (
  tipo             text    not null check (tipo in ('lettera_arancione', 'lettera_verde', 'tempo')),
  modalita         text    not null check (modalita in ('principiante', 'esperto')),
  costo            integer not null check (costo >= 0),
  attivo           boolean not null default true,
  in_solo          boolean not null default true,
  in_online        boolean not null default true,
  max_per_partita  integer not null default 1 check (max_per_partita >= 0),
  valore           integer,
  ordine           smallint not null default 0,   -- ordine dei pulsanti nell'app
  updated_at       timestamptz not null default now(),
  primary key (tipo, modalita)
);

-- ✏️ Valori iniziali (rieseguire lo script NON li sovrascrive: si cambiano dal Table Editor).
insert into public.aiuti (tipo, modalita, costo, attivo, valore, ordine) values
  ('lettera_arancione', 'principiante', 100, true,  null, 1),
  ('lettera_arancione', 'esperto',      200, true,  null, 1),
  ('lettera_verde',     'principiante', 150, true,  null, 2),
  ('lettera_verde',     'esperto',      300, true,  null, 2),
  ('tempo',             'principiante', 350, false, 20,   3),  -- principiante non ha timer
  ('tempo',             'esperto',      350, true,  20,   3)
on conflict (tipo, modalita) do nothing;

create or replace function public.aiuti_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists aiuti_touch on public.aiuti;
create trigger aiuti_touch before update on public.aiuti
  for each row execute function public.aiuti_touch();

-- Leggibile da tutti, modificabile solo dalla dashboard.
alter table public.aiuti enable row level security;
drop policy if exists "aiuti leggibili da tutti" on public.aiuti;
create policy "aiuti leggibili da tutti" on public.aiuti
  for select to anon, authenticated using (true);


-- 2) STORICO: nuovo tipo di movimento 'aiuto' --------------------------------
--    Il check su `tipo` va ricreato; il nome del vincolo lo cerchiamo da soli.
do $$
declare v_nome text;
begin
  for v_nome in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.movimenti_monete'::regclass
      and c.contype = 'c'
      and a.attname = 'tipo'
  loop
    execute format('alter table public.movimenti_monete drop constraint %I', v_nome);
  end loop;
end $$;

alter table public.movimenti_monete
  add constraint movimenti_monete_tipo_check
  check (tipo in ('solo', 'ingresso_online', 'esito_online', 'aiuto'));

-- Per contare in fretta gli acquisti di una partita.
create index if not exists movimenti_monete_aiuti_idx
  on public.movimenti_monete (user_id, (dettagli ->> 'partita'), (dettagli ->> 'aiuto'))
  where tipo = 'aiuto';


-- 3) ACQUISTO -----------------------------------------------------------------
--    p_tipo      'lettera_arancione' | 'lettera_verde' | 'tempo'
--    p_modalita  'principiante' | 'esperto'
--    p_partita   identificativo della partita scelto dall'app (serve a contare
--                gli acquisti "per partita")
--    p_match_id  null = partita da solo; altrimenti la sfida online
--
--    → jsonb { saldo, costo, valore }
--    Errori: NON_AUTENTICATO, AIUTO_NON_DISPONIBILE, NON_PARTECIPANTE,
--            LIMITE_AIUTO, MONETE_INSUFFICIENTI
create or replace function public.compra_aiuto(
  p_tipo      text,
  p_modalita  text,
  p_partita   text,
  p_match_id  uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_aiuto  public.aiuti%rowtype;
  v_usati  integer;
  v_saldo  integer;
begin
  if v_uid is null then
    raise exception 'NON_AUTENTICATO';
  end if;
  if p_partita is null or length(p_partita) = 0 or length(p_partita) > 100 then
    raise exception 'AIUTO_NON_DISPONIBILE';
  end if;

  select * into v_aiuto from public.aiuti where tipo = p_tipo and modalita = p_modalita;
  if not found or not v_aiuto.attivo then
    raise exception 'AIUTO_NON_DISPONIBILE';
  end if;

  if p_match_id is null then
    if not v_aiuto.in_solo then raise exception 'AIUTO_NON_DISPONIBILE'; end if;
  else
    if not v_aiuto.in_online then raise exception 'AIUTO_NON_DISPONIBILE'; end if;
    if not exists (
      select 1 from public.matches m
      where m.id = p_match_id and v_uid in (m.host_id, m.guest_id) and m.status <> 'finished'
    ) then
      raise exception 'NON_PARTECIPANTE';
    end if;
  end if;

  -- Blocca la riga del profilo: due tocchi rapidi non pagano due volte.
  select monete into v_saldo from public.profiles where id = v_uid for update;
  if not found then raise exception 'NON_AUTENTICATO'; end if;

  select count(*) into v_usati
  from public.movimenti_monete
  where user_id = v_uid and tipo = 'aiuto'
    and dettagli ->> 'partita' = p_partita
    and dettagli ->> 'aiuto'   = p_tipo;
  if v_usati >= v_aiuto.max_per_partita then
    raise exception 'LIMITE_AIUTO';
  end if;

  if v_saldo < v_aiuto.costo then
    raise exception 'MONETE_INSUFFICIENTI';
  end if;

  update public.profiles set monete = monete - v_aiuto.costo
  where id = v_uid
  returning monete into v_saldo;

  insert into public.movimenti_monete (user_id, tipo, importo, match_id, dettagli)
  values (
    v_uid, 'aiuto', -v_aiuto.costo, p_match_id,
    jsonb_build_object('aiuto', p_tipo, 'modalita', p_modalita, 'partita', p_partita)
  );

  return jsonb_build_object('saldo', v_saldo, 'costo', v_aiuto.costo, 'valore', v_aiuto.valore);
end $$;

revoke all on function public.compra_aiuto(text, text, text, uuid) from public, anon;
grant execute on function public.compra_aiuto(text, text, text, uuid) to authenticated;
