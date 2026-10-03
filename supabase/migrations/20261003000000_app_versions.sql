-- =====================================================================
--  SpotLex — Aggiornamento obbligatorio
--  1) tabella app_versions con le versioni   2) controllo versione lato server
--
--  Esegui tutto nel SQL Editor di Supabase.
-- =====================================================================

-- 1) Tabella di configurazione (una riga per piattaforma) ----------------
create table if not exists public.app_versions (
  platform             text primary key check (platform in ('android', 'ios')),
  min_version_code     integer not null default 1,  -- sotto questa versione NON si gioca
  latest_version_code  integer not null default 1,  -- ultima pubblicata (aggiornamento facoltativo)
  store_url            text,                        -- link allo store (serve per iOS; Android lo ricava da solo)
  updated_at           timestamptz not null default now()
);

-- Valori iniziali: metti qui il versionCode che hai ora su Play (lo vedi in
-- Play Console o in expo.dev > Builds). Finché min = 1 nessuno viene bloccato.
insert into public.app_versions (platform, min_version_code, latest_version_code)
values ('android', 1, 1), ('ios', 1, 1)
on conflict (platform) do nothing;

create or replace function public.app_versions_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists app_versions_touch on public.app_versions;
create trigger app_versions_touch
  before update on public.app_versions
  for each row execute function public.app_versions_touch();

-- Leggibile da tutti (anche non loggati); si modifica solo dalla dashboard.
-- NON mettere il blocco di versione su questa tabella: un'app vecchia deve
-- poterla leggere per scoprire che va aggiornata.
alter table public.app_versions enable row level security;

drop policy if exists "app_versions leggibile da tutti" on public.app_versions;
create policy "app_versions leggibile da tutti"
  on public.app_versions for select
  to anon, authenticated
  using (true);


-- 2) Controllo versione dagli header della richiesta ---------------------
--    L'app manda su ogni richiesta:
--      x-app-platform: android | ios | web
--      x-app-version:  <versionCode>   (vuoto sul web)
create or replace function public.is_client_version_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_headers  json := nullif(current_setting('request.headers', true), '')::json;
  v_platform text := v_headers ->> 'x-app-platform';
  v_version  text := v_headers ->> 'x-app-version';
  v_min      integer;
begin
  -- Chiamata senza header HTTP (es. SQL Editor, cron, trigger interni): consenti
  if v_headers is null then
    return true;
  end if;

  -- La versione web è sempre l'ultima pubblicata: consenti
  if v_platform = 'web' then
    return true;
  end if;

  -- App vecchia che non manda ancora gli header, o valori strani: rifiuta
  if coalesce(v_platform, '') not in ('android', 'ios')
     or v_version is null or v_version !~ '^\d+$' then
    return false;
  end if;

  select min_version_code into v_min from public.app_versions where platform = v_platform;
  if v_min is null then
    return true;
  end if;

  return v_version::integer >= v_min;
end $$;

grant execute on function public.is_client_version_allowed() to anon, authenticated;

-- Versione "che lancia errore": comoda dentro le tue funzioni RPC.
-- L'app riconosce il messaggio 'APP_VERSION_TOO_OLD' e mostra la schermata di aggiornamento.
create or replace function public.require_client_version()
returns void
language plpgsql
stable
as $$
begin
  if not public.is_client_version_allowed() then
    raise exception 'APP_VERSION_TOO_OLD' using errcode = 'P0001';
  end if;
end $$;

grant execute on function public.require_client_version() to anon, authenticated;


-- 3) DOVE applicare il blocco ---------------------------------------------
--
-- a) Funzioni RPC (registra_partita_solo, paga_ingresso_online, parola_casuale, ...)
--    Se sono SECURITY DEFINER ignorano le RLS, quindi il controllo va messo
--    DENTRO la funzione, come prima riga del corpo:
--
--      begin
--        perform public.require_client_version();
--        ... resto della funzione invariato ...
--      end;
--
-- b) Tabelle di gioco scritte direttamente dall'app (es. matches):
--    aggiungi una policy RESTRICTIVE, che si somma a quelle che hai già:
--
--      create policy "richiede versione minima app"
--        on public.matches
--        as restrictive
--        for all
--        to anon, authenticated
--        using (public.is_client_version_allowed())
--        with check (public.is_client_version_allowed());
--
-- Ordine consigliato: prima pubblica su Play la versione dell'app che manda gli
-- header, aspetta che quasi tutti l'abbiano, POI applica i punti a) e b).
-- Altrimenti le versioni già installate (che non mandano header) verrebbero
-- bloccate lato server senza vedere la schermata di aggiornamento.
