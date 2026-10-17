-- ============================================================
--  INVENTARIO DEL CATALOGO NEVADA (ImpoHogar Market)
-- ============================================================
--  Tabla PROPIA del catalogo Nevada. No toca ni usa la tabla
--  "productos" del catalogo de perfumeria.
--
--  Una sola fila (id = 'stock') con todas las existencias:
--    datos       {"codigo de barras": cantidad, ...}
--    total       cuantos codigos trae
--    actualizado cuando se sincronizo por ultima vez
--
--  Lectura publica (el catalogo la lee con la clave publica).
--  Escritura SOLO con la clave secreta, que vive unicamente en la PC
--  del sincronizador (no hay politicas de escritura para el publico).
--
--  Como usarlo: Supabase > SQL Editor > New query > pegar todo > Run.
-- ============================================================

create table if not exists public.nevada_inventario (
  id          text primary key,
  datos       jsonb       not null default '{}'::jsonb,
  total       integer     not null default 0,
  actualizado timestamptz not null default now()
);

alter table public.nevada_inventario enable row level security;

drop policy if exists "nevada_inventario lectura publica" on public.nevada_inventario;
create policy "nevada_inventario lectura publica"
  on public.nevada_inventario
  for select
  to anon, authenticated
  using (true);

grant select on public.nevada_inventario to anon, authenticated;
