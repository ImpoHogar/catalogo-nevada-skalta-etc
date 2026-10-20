-- ============================================================
--  PANEL ADMINISTRATIVO - Catalogo Nevada
-- ============================================================
--  Lo que necesita el panel (5 clics en el logo del catalogo):
--  productos, pedidos, ajustes e historial de cambios de NEVADA.
--  Todo con el prefijo "nevada": no usa ni modifica ninguna tabla de
--  perfumeria (productos, clientes, pedidos, ajustes_catalogo,
--  auditoria_admin, admin_usuarios).
--
--  IMPORTANTE: despues de este archivo se corre panel_por_cliente.sql,
--  que cambia quien entra al panel: ya no las cuentas de Supabase Auth
--  de perfumeria, sino los clientes de gerencia con su propia sesion del
--  catalogo. Si alguna vez se vuelve a correr este archivo, correr
--  tambien panel_por_cliente.sql despues.
--
--  Se pega una vez en Supabase -> SQL Editor -> Run (proyecto
--  "ImpoHogar's Project"). Se puede volver a correr sin perder datos.
--  Requiere haber corrido antes herramientas/acceso_clientes/crear_acceso.sql.
-- ============================================================

-- ---------- Administradores de Nevada ----------
create table if not exists nevada.admins (
  email  text primary key,
  rol    text not null default 'admin' check (rol in ('admin', 'pedidos')),
  creado timestamptz not null default now()
);
alter table nevada.admins enable row level security;
revoke all on nevada.admins from public, anon, authenticated;

-- Al crear el panel entran todos los administradores que ya existen
-- en Supabase Auth (los de perfumeria). Para quitar o limitar a
-- alguien: delete / update en nevada.admins.
insert into nevada.admins (email, rol)
select lower(u.email), 'admin' from auth.users u where u.email is not null
on conflict (email) do nothing;

-- Rol del administrador que hace la llamada (null = no es admin de Nevada).
create or replace function public.nevada_admin_rol() returns text
language sql stable security definer set search_path = '' as $$
  select a.rol from nevada.admins a
  where (select auth.role()) = 'authenticated'
    and a.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
$$;
revoke all on function public.nevada_admin_rol() from public, anon, authenticated;
-- anon tambien la necesita: las reglas de lectura de productos la llaman
-- (para anon siempre devuelve null).
grant execute on function public.nevada_admin_rol() to anon, authenticated;

-- Corta con error si quien llama no es admin (o la clave secreta).
create or replace function nevada.exigir_admin(p_roles text[] default array['admin']) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  -- Clave secreta (sincronizador, administrar_clientes.bat) o el SQL Editor
  -- de Supabase (sesion directa "postgres"; las llamadas por internet
  -- llegan siempre como "authenticator").
  if (select auth.role()) = 'service_role' or session_user = 'postgres' then return; end if;
  if public.nevada_admin_rol() is null or not (public.nevada_admin_rol() = any (p_roles)) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end $$;
revoke all on function nevada.exigir_admin(text[]) from public, anon, authenticated;

-- ---------- Productos del catalogo ----------
create table if not exists public.nevada_productos (
  id           integer primary key,
  code         text not null,
  brand        text not null,
  name         text not null,
  categoria    text not null default 'Otros',
  img          text,                                  -- archivo en img/productos/ (null = sin foto)
  notes        jsonb not null default '[]'::jsonb,    -- detalles que se muestran en la ficha
  date_added   date,                                  -- "Nuevo ingreso" desde esa fecha
  hidden       boolean not null default false,        -- oculto del catalogo publico
  eliminado_en timestamptz,                           -- papelera
  actualizado  timestamptz not null default now()
);
create index if not exists nevada_productos_code_idx on public.nevada_productos(code);
alter table public.nevada_productos enable row level security;
revoke all on public.nevada_productos from public, anon, authenticated;
grant select on public.nevada_productos to anon, authenticated;
grant insert, update, delete on public.nevada_productos to authenticated;
drop policy if exists "nevada_productos lectura" on public.nevada_productos;
create policy "nevada_productos lectura" on public.nevada_productos for select to anon, authenticated
  using (eliminado_en is null or public.nevada_admin_rol() = 'admin');
drop policy if exists "nevada_productos admin insertar" on public.nevada_productos;
create policy "nevada_productos admin insertar" on public.nevada_productos for insert to authenticated
  with check (public.nevada_admin_rol() = 'admin');
drop policy if exists "nevada_productos admin actualizar" on public.nevada_productos;
create policy "nevada_productos admin actualizar" on public.nevada_productos for update to authenticated
  using (public.nevada_admin_rol() = 'admin') with check (public.nevada_admin_rol() = 'admin');
drop policy if exists "nevada_productos admin eliminar" on public.nevada_productos;
create policy "nevada_productos admin eliminar" on public.nevada_productos for delete to authenticated
  using (public.nevada_admin_rol() = 'admin');

-- ---------- Ajustes (vendedores, rotacion de nuevos ingresos) ----------
create table if not exists public.nevada_ajustes (
  clave          text primary key,
  valor          jsonb not null,
  actualizado_en timestamptz not null default now()
);
alter table public.nevada_ajustes enable row level security;
revoke all on public.nevada_ajustes from public, anon, authenticated;
grant select on public.nevada_ajustes to anon, authenticated;
grant insert, update on public.nevada_ajustes to authenticated;
drop policy if exists "nevada_ajustes lectura" on public.nevada_ajustes;
create policy "nevada_ajustes lectura" on public.nevada_ajustes for select to anon, authenticated using (true);
drop policy if exists "nevada_ajustes admin insertar" on public.nevada_ajustes;
create policy "nevada_ajustes admin insertar" on public.nevada_ajustes for insert to authenticated
  with check (public.nevada_admin_rol() = 'admin');
drop policy if exists "nevada_ajustes admin actualizar" on public.nevada_ajustes;
create policy "nevada_ajustes admin actualizar" on public.nevada_ajustes for update to authenticated
  using (public.nevada_admin_rol() = 'admin') with check (public.nevada_admin_rol() = 'admin');

-- ---------- Pedidos ----------
create table if not exists public.nevada_pedidos (
  id               uuid primary key default gen_random_uuid(),
  cliente_codigo   text,
  cliente_nombre   text,
  cliente_telefono text,
  vendedor         text,
  items            jsonb not null default '[]'::jsonb,   -- [{code, name, brand, qty}]
  total_lineas     integer not null default 0,
  total_unidades   integer not null default 0,
  creado_en        timestamptz not null default now()
);
create index if not exists nevada_pedidos_creado_idx on public.nevada_pedidos(creado_en desc);
alter table public.nevada_pedidos enable row level security;
revoke all on public.nevada_pedidos from public, anon, authenticated;
grant select, update on public.nevada_pedidos to authenticated;
drop policy if exists "nevada_pedidos admin leer" on public.nevada_pedidos;
create policy "nevada_pedidos admin leer" on public.nevada_pedidos for select to authenticated
  using (public.nevada_admin_rol() is not null);
drop policy if exists "nevada_pedidos admin vincular" on public.nevada_pedidos;
create policy "nevada_pedidos admin vincular" on public.nevada_pedidos for update to authenticated
  using (public.nevada_admin_rol() is not null) with check (public.nevada_admin_rol() is not null);

-- ---------- Historial de cambios ----------
create table if not exists public.nevada_auditoria (
  id          bigserial primary key,
  creado_en   timestamptz not null default now(),
  admin_email text,
  accion      text not null,
  entidad     text not null,
  entidad_id  text,
  detalle     jsonb
);
alter table public.nevada_auditoria enable row level security;
revoke all on public.nevada_auditoria from public, anon, authenticated;
grant select, insert on public.nevada_auditoria to authenticated;
grant usage on sequence public.nevada_auditoria_id_seq to authenticated;
drop policy if exists "nevada_auditoria admin escribir" on public.nevada_auditoria;
create policy "nevada_auditoria admin escribir" on public.nevada_auditoria for insert to authenticated
  with check (public.nevada_admin_rol() is not null
              and admin_email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
drop policy if exists "nevada_auditoria admin leer" on public.nevada_auditoria;
create policy "nevada_auditoria admin leer" on public.nevada_auditoria for select to authenticated
  using (public.nevada_admin_rol() = 'admin');

-- ---------- Clientes: datos de contacto y papelera ----------
alter table nevada.clientes add column if not exists tel1 text;
alter table nevada.clientes add column if not exists tel2 text;
alter table nevada.clientes add column if not exists correo text;
alter table nevada.clientes add column if not exists eliminado_en timestamptz;

-- Lista para la pestana Clientes (busqueda por codigo, nombre o telefono).
create or replace function public.nevada_admin_clientes(p_buscar text default '', p_papelera boolean default false, p_limite integer default 60) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t text := '%' || coalesce(btrim(p_buscar), '') || '%';
  r jsonb;
begin
  perform nevada.exigir_admin();
  select coalesce(jsonb_agg(x order by x->>'nombre'), '[]'::jsonb) into r from (
    select jsonb_build_object(
      'codigo', c.codigo, 'nombre', c.nombre, 'vendedor', c.vendedor, 'tel1', c.tel1, 'tel2', c.tel2,
      'correo', c.correo, 'activo', c.activo, 'debe_cambiar', c.debe_cambiar, 'ultimo_ingreso', c.ultimo_ingreso,
      'bloqueado_hasta', c.bloqueado_hasta, 'eliminado_en', c.eliminado_en) x
    from nevada.clientes c
    where (case when p_papelera then c.eliminado_en is not null else c.eliminado_en is null end)
      and (coalesce(btrim(p_buscar), '') = '' or c.codigo ilike t or c.nombre ilike t
           or coalesce(c.tel1, '') ilike t or coalesce(c.tel2, '') ilike t or coalesce(c.correo, '') ilike t)
    order by c.nombre
    limit greatest(1, least(coalesce(p_limite, 60), 2000))
  ) s;
  return r;
end $$;

-- Lista corta de todos los clientes (para cruzar pedidos). Tambien la usa el rol 'pedidos'.
create or replace function public.nevada_admin_clientes_todos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform nevada.exigir_admin(array['admin', 'pedidos']);
  return (select coalesce(jsonb_agg(jsonb_build_object('codigo', codigo, 'nombre', nombre, 'tel1', tel1, 'tel2', tel2)), '[]'::jsonb)
          from nevada.clientes where eliminado_en is null);
end $$;

create or replace function public.nevada_admin_cliente_guardar(p_codigo text, p_nombre text, p_vendedor text, p_tel1 text, p_tel2 text, p_correo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.exigir_admin();
  if nullif(btrim(coalesce(p_nombre, '')), '') is null then return jsonb_build_object('ok', false, 'error', 'El nombre es obligatorio.'); end if;
  update nevada.clientes
     set nombre = btrim(p_nombre), vendedor = nullif(btrim(coalesce(p_vendedor, '')), ''),
         tel1 = nullif(btrim(coalesce(p_tel1, '')), ''), tel2 = nullif(btrim(coalesce(p_tel2, '')), ''),
         correo = nullif(btrim(coalesce(p_correo, '')), '')
   where codigo = btrim(coalesce(p_codigo, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'No existe ese código.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Crea un cliente con su contrasena temporal (la devuelve una sola vez).
create or replace function public.nevada_admin_cliente_crear(p_codigo text, p_nombre text, p_vendedor text, p_tel1 text, p_tel2 text, p_correo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_clave text := nevada.clave_aleatoria();
begin
  perform nevada.exigir_admin();
  if nullif(btrim(coalesce(p_nombre, '')), '') is null then return jsonb_build_object('ok', false, 'error', 'El nombre es obligatorio.'); end if;
  if v_codigo = '' then v_codigo := 'MANUAL-' || to_char(clock_timestamp(), 'YYMMDDHH24MISS'); end if;
  if exists (select 1 from nevada.clientes where codigo = v_codigo) then
    return jsonb_build_object('ok', false, 'error', 'Ese código ya existe.');
  end if;
  insert into nevada.clientes (codigo, nombre, vendedor, tel1, tel2, correo, clave_hash)
  values (v_codigo, btrim(p_nombre), nullif(btrim(coalesce(p_vendedor, '')), ''), nullif(btrim(coalesce(p_tel1, '')), ''),
          nullif(btrim(coalesce(p_tel2, '')), ''), nullif(btrim(coalesce(p_correo, '')), ''),
          extensions.crypt(v_clave, extensions.gen_salt('bf', 8)));
  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'clave_temporal', v_clave);
end $$;

-- Papelera: el cliente deja de poder entrar (y se cierran sus sesiones). Restaurar lo reactiva.
create or replace function public.nevada_admin_cliente_papelera(p_codigo text, p_papelera boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.exigir_admin();
  update nevada.clientes
     set eliminado_en = case when p_papelera then now() else null end, activo = not p_papelera
   where codigo = btrim(coalesce(p_codigo, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'No existe ese código.'); end if;
  if p_papelera then delete from nevada.sesiones where codigo = btrim(p_codigo); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Eliminar definitivo: solo clientes que ya estan en la papelera.
create or replace function public.nevada_admin_cliente_eliminar(p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.exigir_admin();
  delete from nevada.clientes where codigo = btrim(coalesce(p_codigo, '')) and eliminado_en is not null;
  if not found then return jsonb_build_object('ok', false, 'error', 'Solo se puede eliminar definitivamente un cliente que esté en la papelera.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Las de crear_acceso.sql pasan a aceptar tambien a los admins del panel.
create or replace function public.nevada_admin_clave_temporal(p_codigo text, p_nombre text default null, p_vendedor text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_clave text := nevada.clave_aleatoria();
  v_hash text := extensions.crypt(v_clave, extensions.gen_salt('bf', 8));
begin
  perform nevada.exigir_admin();
  if v_codigo = '' then return jsonb_build_object('ok', false, 'error', 'Falta el código.'); end if;
  if exists (select 1 from nevada.clientes where codigo = v_codigo) then
    update nevada.clientes
       set clave_hash = v_hash, debe_cambiar = true, intentos_fallidos = 0, bloqueado_hasta = null, activo = true, eliminado_en = null,
           nombre = coalesce(nullif(btrim(p_nombre), ''), nombre), vendedor = coalesce(nullif(btrim(p_vendedor), ''), vendedor)
     where codigo = v_codigo;
    delete from nevada.sesiones where codigo = v_codigo;
  else
    if nullif(btrim(coalesce(p_nombre, '')), '') is null then
      return jsonb_build_object('ok', false, 'error', 'El cliente no existe; para crearlo hace falta el nombre.');
    end if;
    insert into nevada.clientes (codigo, nombre, vendedor, clave_hash) values (v_codigo, btrim(p_nombre), nullif(btrim(p_vendedor), ''), v_hash);
  end if;
  return jsonb_build_object('ok', true, 'codigo', v_codigo, 'clave_temporal', v_clave);
end $$;

create or replace function public.nevada_admin_activo(p_codigo text, p_activo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.exigir_admin();
  update nevada.clientes set activo = p_activo where codigo = btrim(coalesce(p_codigo, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'No existe ese código.'); end if;
  if not p_activo then delete from nevada.sesiones where codigo = btrim(p_codigo); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Estado de la sincronizacion (pestana "Sincronización").
create or replace function public.nevada_admin_estado_sync() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  perform nevada.exigir_admin(array['admin', 'pedidos']);
  select jsonb_build_object(
    'inventario', (select jsonb_build_object('total', total, 'actualizado', actualizado) from public.nevada_inventario where id = 'stock'),
    'precios', (select jsonb_build_object('total', total, 'actualizado', actualizado) from nevada.precios where id = 'p4'),
    'clientes', (select jsonb_build_object(
        'total', count(*) filter (where eliminado_en is null),
        'activos', count(*) filter (where eliminado_en is null and activo),
        'con_temporal', count(*) filter (where eliminado_en is null and activo and debe_cambiar),
        'ingresaron', count(*) filter (where eliminado_en is null and ultimo_ingreso is not null),
        'ingresaron_7d', count(*) filter (where eliminado_en is null and ultimo_ingreso > now() - interval '7 days'))
      from nevada.clientes),
    'productos', (select jsonb_build_object('total', count(*) filter (where eliminado_en is null),
        'ocultos', count(*) filter (where eliminado_en is null and hidden),
        'sin_foto', count(*) filter (where eliminado_en is null and img is null),
        'papelera', count(*) filter (where eliminado_en is not null)) from public.nevada_productos)
  ) into r;
  return r;
end $$;

-- ---------- Pedidos desde el catalogo (con la sesion del cliente) ----------
-- El cliente queda identificado por su sesion: no se puede registrar
-- un pedido a nombre de otro.
create or replace function public.nevada_registrar_pedido(p_token text, p_nombre text, p_telefono text, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c nevada.clientes;
  v_items jsonb;
  v_id uuid;
begin
  c := nevada.cliente_de_sesion(p_token);
  if c.codigo is null then return jsonb_build_object('ok', false, 'error', 'Sin sesión.'); end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 3000 then
    return jsonb_build_object('ok', false, 'error', 'Pedido vacío o inválido.');
  end if;
  select jsonb_agg(jsonb_build_object(
           'code', left(coalesce(e ->> 'code', ''), 40), 'name', left(coalesce(e ->> 'name', ''), 200),
           'brand', left(coalesce(e ->> 'brand', ''), 80),
           'qty', case when (e ->> 'qty') ~ '^\d{1,7}$' then (e ->> 'qty')::integer else 0 end))
    into v_items from jsonb_array_elements(p_items) e;
  insert into public.nevada_pedidos (cliente_codigo, cliente_nombre, cliente_telefono, items, total_lineas, total_unidades)
  values (c.codigo, left(coalesce(nullif(btrim(p_nombre), ''), c.nombre), 120), left(nullif(btrim(coalesce(p_telefono, '')), ''), 40), v_items,
          jsonb_array_length(v_items), (select coalesce(sum((x ->> 'qty')::integer), 0) from jsonb_array_elements(v_items) x))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Anota a que vendedor envio el cliente su pedido (al abrir WhatsApp).
create or replace function public.nevada_pedido_vendedor(p_token text, p_id uuid, p_vendedor text) returns void
language plpgsql security definer set search_path = '' as $$
declare c nevada.clientes;
begin
  c := nevada.cliente_de_sesion(p_token);
  if c.codigo is null then return; end if;
  update public.nevada_pedidos set vendedor = left(btrim(coalesce(p_vendedor, '')), 80)
   where id = p_id and cliente_codigo = c.codigo and creado_en > now() - interval '1 day';
end $$;

-- ---------- Permisos de las funciones ----------
revoke all on function public.nevada_admin_clientes(text, boolean, integer) from public, anon, authenticated;
revoke all on function public.nevada_admin_clientes_todos() from public, anon, authenticated;
revoke all on function public.nevada_admin_cliente_guardar(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.nevada_admin_cliente_crear(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.nevada_admin_cliente_papelera(text, boolean) from public, anon, authenticated;
revoke all on function public.nevada_admin_cliente_eliminar(text) from public, anon, authenticated;
revoke all on function public.nevada_admin_clave_temporal(text, text, text) from public, anon, authenticated;
revoke all on function public.nevada_admin_activo(text, boolean) from public, anon, authenticated;
revoke all on function public.nevada_admin_estado_sync() from public, anon, authenticated;
revoke all on function public.nevada_registrar_pedido(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.nevada_pedido_vendedor(text, uuid, text) from public, anon, authenticated;

grant execute on function public.nevada_admin_clientes(text, boolean, integer) to authenticated, service_role;
grant execute on function public.nevada_admin_clientes_todos() to authenticated, service_role;
grant execute on function public.nevada_admin_cliente_guardar(text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.nevada_admin_cliente_crear(text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.nevada_admin_cliente_papelera(text, boolean) to authenticated, service_role;
grant execute on function public.nevada_admin_cliente_eliminar(text) to authenticated, service_role;
grant execute on function public.nevada_admin_clave_temporal(text, text, text) to authenticated, service_role;
grant execute on function public.nevada_admin_activo(text, boolean) to authenticated, service_role;
grant execute on function public.nevada_admin_estado_sync() to authenticated, service_role;
grant execute on function public.nevada_registrar_pedido(text, text, text, jsonb) to anon;
grant execute on function public.nevada_pedido_vendedor(text, uuid, text) to anon;
