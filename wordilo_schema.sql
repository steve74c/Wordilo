-- =============================================================================
-- Wordilo · Schema del database (Supabase / Postgres) · Passo 2
--
-- Crea le tabelle della §10 della specifica, attiva le regole di sicurezza
-- (RLS) e inserisce i dati iniziali (parametri di gioco + dizionario di prova).
--
-- SICURO DA RIESEGUIRE: usa "if not exists", upsert e "drop policy if exists",
-- quindi puoi lanciarlo più volte senza duplicare né rompere nulla.
-- =============================================================================

-- Estensione per generare UUID casuali (di norma già attiva su Supabase).
create extension if not exists pgcrypto;


-- =============================================================================
-- TABELLE
-- =============================================================================

-- 1. PROFILI — estende la tabella auth.users gestita da Supabase.
--    (email e provider di login stanno già in auth.users, non qui.)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nick        text unique not null,
  nome        text,
  cognome     text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- 2. DIZIONARIO — parole normalizzate: MAIUSCOLE, senza accenti.
create table if not exists public.words (
  id          bigint generated always as identity primary key,
  word        text     not null,
  length      smallint not null check (length in (5, 6)),
  is_solution boolean  not null default true,   -- true = estraibile come target
  lang        text     not null default 'it',
  unique (word, lang)
);

-- 3. PARAMETRI PER MODALITÀ — così i numeri chiave si cambiano senza ricompilare.
create table if not exists public.game_settings (
  mode                text primary key check (mode in ('principiante', 'esperto')),
  max_attempts        int      not null default 7,
  seconds_per_attempt int,                        -- null = senza timer
  points_win          smallint not null default 10,
  points_lose         smallint not null default 0,
  points_draw         smallint not null default 5,
  updated_at          timestamptz not null default now()
);

-- 3b. PARAMETRI GLOBALI — una sola riga (id sempre = 1).
create table if not exists public.app_config (
  id              int primary key default 1 check (id = 1),
  skill_min_games int not null default 10        -- soglia classifica bravura
);

-- 4. PARTITE ONLINE — l'incontro fra due giocatori. Resta vuota fino all'online.
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  room_code   text unique,
  mode        text check (mode in ('principiante', 'esperto')),
  word_id     bigint references public.words(id),
  word_length smallint,
  host_id     uuid references public.profiles(id),
  guest_id    uuid references public.profiles(id),
  status      text not null default 'waiting'
              check (status in ('waiting', 'playing', 'finished')),
  winner_id   uuid references public.profiles(id),
  is_draw     boolean not null default false,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- 5. GIOCATE — una riga per partita giocata da un utente (single player e online).
create table if not exists public.games (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  match_id      uuid references public.matches(id),          -- null = single player
  mode          text not null check (mode in ('principiante', 'esperto', 'online')),
  word_length   smallint check (word_length in (5, 6)),
  word_id       bigint references public.words(id),
  result        text not null check (result in ('won', 'lost', 'draw')),
  attempts_used smallint,
  duration_ms   int,
  points        smallint not null default 0,                 -- 0 in single player
  guesses       jsonb,                                        -- traccia dei tentativi
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

-- Indice per leggere in fretta "le ultime partite dell'utente".
create index if not exists games_user_created_idx
  on public.games (user_id, created_at desc);


-- =============================================================================
-- SICUREZZA A LIVELLO DI RIGA (RLS)
-- Ogni utente vede/scrive solo i PROPRI dati; dizionario e parametri sono in
-- lettura pubblica; i profili sono leggibili (serviranno alle classifiche).
-- =============================================================================

-- PROFILI
alter table public.profiles enable row level security;

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public
  on public.profiles for select using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- DIZIONARIO / PARAMETRI — sola lettura, aperta a tutti (anche non loggati).
alter table public.words enable row level security;
drop policy if exists words_select_public on public.words;
create policy words_select_public on public.words for select using (true);

alter table public.game_settings enable row level security;
drop policy if exists game_settings_select_public on public.game_settings;
create policy game_settings_select_public on public.game_settings for select using (true);

alter table public.app_config enable row level security;
drop policy if exists app_config_select_public on public.app_config;
create policy app_config_select_public on public.app_config for select using (true);

-- GIOCATE — ognuno legge/scrive solo le proprie.
alter table public.games enable row level security;

drop policy if exists games_select_own on public.games;
create policy games_select_own on public.games for select using (auth.uid() = user_id);

drop policy if exists games_insert_own on public.games;
create policy games_insert_own on public.games for insert with check (auth.uid() = user_id);

-- PARTITE ONLINE — visibili solo ai due partecipanti.
-- (Le scritture passeranno dal server con la chiave service_role, più avanti.)
alter table public.matches enable row level security;

drop policy if exists matches_select_participant on public.matches;
create policy matches_select_participant
  on public.matches for select
  using (auth.uid() = host_id or auth.uid() = guest_id);


-- =============================================================================
-- DATI INIZIALI
-- =============================================================================

-- Parametri di gioco. Esperto: 25 secondi (come deciso). L'upsert ri-afferma i
-- valori a ogni esecuzione dello script.
insert into public.game_settings
  (mode, max_attempts, seconds_per_attempt, points_win, points_lose, points_draw)
values
  ('principiante', 7, null, 10, 0, 5),
  ('esperto',      7, 25,   10, 0, 5)
on conflict (mode) do update set
  max_attempts        = excluded.max_attempts,
  seconds_per_attempt = excluded.seconds_per_attempt,
  points_win          = excluded.points_win,
  points_lose         = excluded.points_lose,
  points_draw         = excluded.points_draw,
  updated_at          = now();

-- Parametro globale.
insert into public.app_config (id, skill_min_games)
values (1, 10)
on conflict (id) do update set skill_min_games = excluded.skill_min_games;

-- Dizionario di PROVA (verrà sostituito dall'import reale). MAIUSCOLE, no accenti.
insert into public.words (word, length, is_solution, lang) values
  ('CARTA', 5, true, 'it'), ('PONTE', 5, true, 'it'), ('LIBRO', 5, true, 'it'),
  ('FIORE', 5, true, 'it'), ('GATTO', 5, true, 'it'), ('VERDE', 5, true, 'it'),
  ('MONTE', 5, true, 'it'), ('NOTTE', 5, true, 'it'), ('PORTA', 5, true, 'it'),
  ('TERRA', 5, true, 'it'), ('PASTA', 5, true, 'it'), ('CUORE', 5, true, 'it'),
  ('SOGNO', 5, true, 'it'), ('SEDIA', 5, true, 'it'), ('FESTA', 5, true, 'it'),
  ('PAROLA', 6, true, 'it'), ('SCUOLA', 6, true, 'it'), ('GELATO', 6, true, 'it'),
  ('MATITA', 6, true, 'it'), ('STRADA', 6, true, 'it'), ('CUCINA', 6, true, 'it'),
  ('FINITO', 6, true, 'it'), ('NUVOLA', 6, true, 'it'), ('TAVOLO', 6, true, 'it'),
  ('GIORNO', 6, true, 'it'), ('MONETA', 6, true, 'it'), ('SERENO', 6, true, 'it')
on conflict (word, lang) do nothing;

-- =============================================================================
-- Fine. Le VISTE per statistiche e classifiche (user_stats, leaderboard_*)
-- arriveranno ai passi "statistiche" e "online": richiedono una piccola scelta
-- in più (viste in lettura pubblica controllata) che vedremo lì.
-- =============================================================================
