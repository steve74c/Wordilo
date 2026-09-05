-- ============================================================
-- C1 — Tabella delle sfide online (matches) + sicurezza (RLS)
-- ============================================================

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  room_code    text unique not null,                 -- es. "K7P2Q"
  mode         text not null
                 check (mode in ('principiante','esperto')),
  word_id      bigint references public.words(id),   -- stessa parola per i due
  word_length  smallint not null,                    -- 5 o 6
  host_id      uuid not null references public.profiles(id) on delete cascade,
  guest_id     uuid references public.profiles(id) on delete set null,
  status       text not null default 'waiting'
                 check (status in ('waiting','playing','finished')),
  winner_id    uuid references public.profiles(id),
  is_draw      boolean not null default false,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- Accende la "sicurezza per riga": senza una regola, nessuno può leggere/scrivere.
alter table public.matches enable row level security;

-- 1) Chi crea la stanza deve essere sé stesso come host.
create policy "host crea match"
  on public.matches for insert to authenticated
  with check (host_id = auth.uid());

-- 2) Puoi leggere una sfida se sei uno dei due giocatori,
--    oppure se è ancora "in attesa" (così l'ospite la trova col codice).
create policy "leggi match propri o in attesa"
  on public.matches for select to authenticated
  using (
    host_id = auth.uid()
    or guest_id = auth.uid()
    or status = 'waiting'
  );

-- 3) Puoi aggiornare una sfida se ci giochi,
--    oppure per ENTRARE in una stanza ancora libera (diventi tu l'ospite).
create policy "aggiorna match (entra o gioca)"
  on public.matches for update to authenticated
  using (
    host_id = auth.uid()
    or guest_id = auth.uid()
    or (status = 'waiting' and guest_id is null)
  )
  with check (
    host_id = auth.uid()
    or guest_id = auth.uid()
  );