-- ============================================================
--  PANEL ADMINISTRATIVO CON LA SESION DE CLIENTE - Catalogo Nevada
-- ============================================================
--  Gerencia y el personal tambien son clientes de la empresa. Con
--  este cambio, quien inicia sesion en el catalogo con su codigo de
--  cliente y su contraseña, y esta en la lista nevada.admins_clientes,
--  abre el panel con 3 clics en el logo: ya no se pide otro usuario
--  ni otra contraseña.
--
--  Reemplaza el ingreso con las cuentas de Supabase Auth (las de
--  perfumeria) que usaba crear_panel.sql: esas cuentas dejan de
--  tener acceso a Nevada. Perfumeria no cambia en nada.
--
--  Niveles de acceso (nevada.admins_clientes.rol):
--    'admin'   = todo.
--    'editor'  = ve todo; edita la ficha de los productos (nombre,
--                marca, categoria, foto, detalles, ocultar, Nuevo
--                Ingreso) y corrige el stock a mano (dura hasta la
--                siguiente sincronizacion con Interakzion). No crea ni
--                borra productos, ni cambia clientes, pedidos o ajustes.
--    'lectura' = ve todo, no cambia nada.
--
--  Todo el panel pasa por funciones public.nevada_panel_* que reciben
--  el token de la sesion del cliente y revisan en la base que sea
--  administrador. Los cambios quedan en el historial desde la base
--  (no los puede inventar el navegador).
--
--  Se pega en Supabase -> SQL Editor -> Run (proyecto "ImpoHogar's
--  Project"), DESPUES de crear_panel.sql. Se puede volver a correr.
-- ============================================================

-- ---------- Quienes son administradores (por codigo de cliente) ----------
create table if not exists nevada.admins_clientes (
  codigo text primary key references nevada.clientes(codigo) on delete cascade,
  rol    text not null default 'lectura',
  creado timestamptz not null default now()
);
alter table nevada.admins_clientes drop constraint if exists admins_clientes_rol_check;
update nevada.admins_clientes set rol = 'lectura' where rol not in ('admin', 'editor', 'lectura');
alter table nevada.admins_clientes add constraint admins_clientes_rol_check check (rol in ('admin', 'editor', 'lectura'));
alter table nevada.admins_clientes enable row level security;
revoke all on nevada.admins_clientes from public, anon, authenticated;

-- Quien hizo cada cambio: "codigo · nombre" del cliente administrador.
alter table public.nevada_auditoria add column if not exists admin_cliente text;

-- ---------- Revisar la sesion ----------
-- Devuelve el administrador de esa sesion (null si no lo es). Solo
-- cuenta si ya creo su propia contraseña.
create or replace function nevada.admin_de_sesion(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('codigo', c.codigo, 'nombre', c.nombre, 'rol', a.rol)
  from nevada.cliente_de_sesion(p_token) c
  join nevada.admins_clientes a on a.codigo = c.codigo
  where c.codigo is not null and not c.debe_cambiar and c.eliminado_en is null
$$;

-- Corta con "No autorizado" si la sesion no es de un administrador con
-- uno de esos roles. Si pasa, deja anotado (solo durante esta llamada)
-- quien es, para el historial y para las funciones nevada_admin_*
-- (que confian en que la funcion del panel ya reviso el permiso).
create or replace function nevada.entrar_panel(p_token text, p_roles text[] default array['admin']) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a jsonb := nevada.admin_de_sesion(p_token);
begin
  if a is null or not ((a ->> 'rol') = any (p_roles)) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  perform set_config('nevada.panel_ok', '1', true);
  perform set_config('nevada.panel_quien', (a ->> 'codigo') || ' · ' || (a ->> 'nombre'), true);
  return a;
end $$;

-- Las funciones nevada_admin_* (de crear_panel.sql) aceptan: la clave
-- secreta (administrar_clientes.bat), el SQL Editor, o una llamada que
-- ya paso por nevada.entrar_panel. Ya no aceptan cuentas de Supabase Auth.
create or replace function nevada.exigir_admin(p_roles text[] default array['admin']) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.role()) = 'service_role' or session_user = 'postgres' then return; end if;
  if coalesce(current_setting('nevada.panel_ok', true), '') <> '1' then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end $$;

create or replace function nevada.auditar(p_accion text, p_entidad text, p_entidad_id text, p_detalle jsonb default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.nevada_auditoria (admin_cliente, accion, entidad, entidad_id, detalle)
  values (nullif(current_setting('nevada.panel_quien', true), ''), p_accion, p_entidad, p_entidad_id, p_detalle)
$$;

revoke all on function nevada.admin_de_sesion(text) from public, anon, authenticated;
revoke all on function nevada.entrar_panel(text, text[]) from public, anon, authenticated;
revoke all on function nevada.exigir_admin(text[]) from public, anon, authenticated;
revoke all on function nevada.auditar(text, text, text, jsonb) from public, anon, authenticated;

-- ---------- Funciones del panel ----------

-- Rol de quien tiene la sesion: {codigo, nombre, rol} o null (no es admin).
create or replace function public.nevada_panel_rol(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select nevada.admin_de_sesion(p_token)
$$;

-- Productos: todos (incluida la papelera).
create or replace function public.nevada_panel_productos(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor', 'lectura']);
  return (select coalesce(jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb) from public.nevada_productos p);
end $$;

-- Crear (p_id null) o editar un producto. p_datos: brand, name, code,
-- categoria, img, notes (lista de textos), hidden, date_added.
create or replace function public.nevada_panel_producto_guardar(p_token text, p_id integer, p_datos jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_brand text := btrim(coalesce(p_datos ->> 'brand', ''));
  v_name  text := btrim(coalesce(p_datos ->> 'name', ''));
  v_code  text := btrim(coalesce(p_datos ->> 'code', ''));
  v_cat   text := coalesce(nullif(btrim(coalesce(p_datos ->> 'categoria', '')), ''), 'Otros');
  v_img   text := nullif(btrim(coalesce(p_datos ->> 'img', '')), '');
  v_notes jsonb := case when jsonb_typeof(p_datos -> 'notes') = 'array'
                        then (select coalesce(jsonb_agg(left(btrim(x), 300)), '[]'::jsonb)
                              from jsonb_array_elements_text(p_datos -> 'notes') x where btrim(x) <> '')
                        else '[]'::jsonb end;
  v_hidden boolean := coalesce((p_datos ->> 'hidden')::boolean, false);
  v_fecha date := nullif(p_datos ->> 'date_added', '')::date;
  v_id integer := p_id;
  r public.nevada_productos;
begin
  -- Crear: solo admin. Editar la ficha: admin y editor.
  perform nevada.entrar_panel(p_token, case when p_id is null then array['admin'] else array['admin', 'editor'] end);
  if v_brand = '' or v_name = '' or v_code = '' then
    return jsonb_build_object('ok', false, 'error', 'Marca, nombre y código son obligatorios.');
  end if;
  if v_id is null then
    lock table public.nevada_productos in share row exclusive mode;
    select coalesce(max(id), 0) + 1 into v_id from public.nevada_productos;
    insert into public.nevada_productos (id, code, brand, name, categoria, img, notes, date_added, hidden)
    values (v_id, v_code, v_brand, v_name, v_cat, v_img, v_notes, v_fecha, v_hidden)
    returning * into r;
    perform nevada.auditar('crear', 'producto', v_id::text, jsonb_build_object('brand', v_brand, 'name', v_name, 'code', v_code));
  else
    update public.nevada_productos
       set code = v_code, brand = v_brand, name = v_name, categoria = v_cat, img = v_img, notes = v_notes,
           date_added = v_fecha, hidden = v_hidden, actualizado = now()
     where id = v_id
    returning * into r;
    if r.id is null then return jsonb_build_object('ok', false, 'error', 'No existe ese producto.'); end if;
    perform nevada.auditar('editar', 'producto', v_id::text, jsonb_build_object('brand', v_brand, 'name', v_name, 'code', v_code));
  end if;
  return jsonb_build_object('ok', true, 'producto', to_jsonb(r));
end $$;

create or replace function public.nevada_panel_producto_papelera(p_token text, p_id integer, p_papelera boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.nevada_productos;
begin
  perform nevada.entrar_panel(p_token);
  update public.nevada_productos
     set eliminado_en = case when p_papelera then now() else null end, actualizado = now()
   where id = p_id
  returning * into r;
  if r.id is null then return jsonb_build_object('ok', false, 'error', 'No existe ese producto.'); end if;
  perform nevada.auditar(case when p_papelera then 'papelera' else 'restaurar' end, 'producto', p_id::text);
  return jsonb_build_object('ok', true, 'producto', to_jsonb(r));
end $$;

create or replace function public.nevada_panel_producto_eliminar(p_token text, p_id integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token);
  delete from public.nevada_productos where id = p_id and eliminado_en is not null;
  if not found then return jsonb_build_object('ok', false, 'error', 'Solo se puede eliminar definitivamente un producto que esté en la papelera.'); end if;
  perform nevada.auditar('eliminar_definitivo', 'producto', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

-- Clientes: pasan a las funciones nevada_admin_* de crear_panel.sql.
create or replace function public.nevada_panel_clientes(p_token text, p_buscar text, p_papelera boolean, p_limite integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor', 'lectura']);
  return public.nevada_admin_clientes(p_buscar, p_papelera, p_limite);
end $$;

create or replace function public.nevada_panel_clientes_todos(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor', 'lectura']);
  return public.nevada_admin_clientes_todos();
end $$;

create or replace function public.nevada_panel_cliente_guardar(p_token text, p_codigo text, p_nombre text, p_vendedor text, p_tel1 text, p_tel2 text, p_correo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform nevada.entrar_panel(p_token);
  r := public.nevada_admin_cliente_guardar(p_codigo, p_nombre, p_vendedor, p_tel1, p_tel2, p_correo);
  if (r ->> 'ok')::boolean then perform nevada.auditar('editar', 'cliente', p_codigo, jsonb_build_object('nombre', p_nombre)); end if;
  return r;
end $$;

create or replace function public.nevada_panel_cliente_crear(p_token text, p_codigo text, p_nombre text, p_vendedor text, p_tel1 text, p_tel2 text, p_correo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform nevada.entrar_panel(p_token);
  r := public.nevada_admin_cliente_crear(p_codigo, p_nombre, p_vendedor, p_tel1, p_tel2, p_correo);
  if (r ->> 'ok')::boolean then perform nevada.auditar('crear', 'cliente', r ->> 'codigo', jsonb_build_object('nombre', p_nombre)); end if;
  return r;
end $$;

create or replace function public.nevada_panel_cliente_papelera(p_token text, p_codigo text, p_papelera boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform nevada.entrar_panel(p_token);
  r := public.nevada_admin_cliente_papelera(p_codigo, p_papelera);
  if (r ->> 'ok')::boolean then perform nevada.auditar(case when p_papelera then 'papelera' else 'restaurar' end, 'cliente', p_codigo); end if;
  return r;
end $$;

create or replace function public.nevada_panel_cliente_eliminar(p_token text, p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform nevada.entrar_panel(p_token);
  r := public.nevada_admin_cliente_eliminar(p_codigo);
  if (r ->> 'ok')::boolean then perform nevada.auditar('eliminar_definitivo', 'cliente', p_codigo); end if;
  return r;
end $$;

create or replace function public.nevada_panel_clave_temporal(p_token text, p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform nevada.entrar_panel(p_token);
  -- Solo clientes que ya existen (para crear uno se usa "+ Agregar").
  if not exists (select 1 from nevada.clientes where codigo = btrim(coalesce(p_codigo, ''))) then
    return jsonb_build_object('ok', false, 'error', 'No existe ese código.');
  end if;
  r := public.nevada_admin_clave_temporal(p_codigo, null, null);
  if (r ->> 'ok')::boolean then perform nevada.auditar('clave_temporal', 'cliente', p_codigo); end if;
  return r;
end $$;

create or replace function public.nevada_panel_cliente_activo(p_token text, p_codigo text, p_activo boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform nevada.entrar_panel(p_token);
  r := public.nevada_admin_activo(p_codigo, p_activo);
  if (r ->> 'ok')::boolean then perform nevada.auditar(case when p_activo then 'activar' else 'bloquear' end, 'cliente', p_codigo); end if;
  return r;
end $$;

create or replace function public.nevada_panel_estado_sync(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor', 'lectura']);
  return public.nevada_admin_estado_sync();
end $$;

-- Pedidos. Fechas en ISO; busca en
-- cliente, codigo, telefono y vendedor.
create or replace function public.nevada_panel_pedidos(p_token text, p_buscar text, p_desde timestamptz, p_hasta timestamptz, p_limite integer, p_offset integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t text := '%' || coalesce(btrim(p_buscar), '') || '%';
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor', 'lectura']);
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.creado_en desc), '[]'::jsonb) from (
    select p.* from public.nevada_pedidos p
    where (coalesce(btrim(p_buscar), '') = '' or coalesce(p.cliente_nombre, '') ilike t or coalesce(p.cliente_codigo, '') ilike t
           or coalesce(p.cliente_telefono, '') ilike t or coalesce(p.vendedor, '') ilike t)
      and (p_desde is null or p.creado_en >= p_desde)
      and (p_hasta is null or p.creado_en <= p_hasta)
    order by p.creado_en desc
    limit greatest(1, least(coalesce(p_limite, 50), 2000)) offset greatest(0, coalesce(p_offset, 0))
  ) x);
end $$;

create or replace function public.nevada_panel_pedido_vincular(p_token text, p_id uuid, p_codigo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token);
  if not exists (select 1 from nevada.clientes where codigo = btrim(coalesce(p_codigo, ''))) then
    return jsonb_build_object('ok', false, 'error', 'No existe ese cliente.');
  end if;
  update public.nevada_pedidos set cliente_codigo = btrim(p_codigo) where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'No existe ese pedido.'); end if;
  perform nevada.auditar('vincular', 'pedido', p_id::text, jsonb_build_object('cliente_codigo', btrim(p_codigo)));
  return jsonb_build_object('ok', true);
end $$;

-- Corregir a mano la cantidad de un producto (admin y editor). Cambia
-- solo ese codigo en el inventario en vivo; la siguiente sincronizacion
-- con Interakzion (cada 30 min) vuelve a poner la cantidad del sistema.
create or replace function public.nevada_panel_stock_corregir(p_token text, p_code text, p_cantidad integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := btrim(coalesce(p_code, ''));
  v_antes jsonb;
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor']);
  if p_cantidad is null or p_cantidad < 0 or p_cantidad > 9999999 then
    return jsonb_build_object('ok', false, 'error', 'Cantidad no válida.');
  end if;
  if not exists (select 1 from public.nevada_productos where code = v_code and eliminado_en is null) then
    return jsonb_build_object('ok', false, 'error', 'Ese código no está en el catálogo.');
  end if;
  select datos -> v_code into v_antes from public.nevada_inventario where id = 'stock' for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Todavía no hay inventario sincronizado.'); end if;
  update public.nevada_inventario set datos = jsonb_set(datos, array[v_code], to_jsonb(p_cantidad), true) where id = 'stock';
  perform nevada.auditar('corregir_stock', 'producto', v_code,
    jsonb_build_object('code', v_code, 'antes', v_antes, 'despues', p_cantidad));
  return jsonb_build_object('ok', true, 'cantidad', p_cantidad);
end $$;

-- Ajustes: solo "vendedores" y "low_rotation".
create or replace function public.nevada_panel_ajuste_guardar(p_token text, p_clave text, p_valor jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token);
  if p_clave not in ('vendedores', 'low_rotation') or p_valor is null or jsonb_typeof(p_valor) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Ajuste no válido.');
  end if;
  insert into public.nevada_ajustes (clave, valor, actualizado_en) values (p_clave, p_valor, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_en = now();
  perform nevada.auditar('editar', p_clave, null,
    case when p_clave = 'vendedores' then jsonb_build_object('total', (select count(*) from jsonb_object_keys(p_valor)))
         else jsonb_build_object('start_date', p_valor ->> 'start_date',
                                 'lotes', coalesce(jsonb_array_length(case when jsonb_typeof(p_valor -> 'batches') = 'array' then p_valor -> 'batches' end), 0)) end);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nevada_panel_historial(p_token text, p_buscar text, p_limite integer, p_offset integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t text := '%' || coalesce(btrim(p_buscar), '') || '%';
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor', 'lectura']);
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.creado_en desc, x.id desc), '[]'::jsonb) from (
    select a.* from public.nevada_auditoria a
    where coalesce(btrim(p_buscar), '') = '' or a.accion ilike t or a.entidad ilike t or coalesce(a.entidad_id, '') ilike t
          or coalesce(a.admin_cliente, '') ilike t or coalesce(a.admin_email, '') ilike t
    order by a.creado_en desc, a.id desc
    limit greatest(1, least(coalesce(p_limite, 50), 500)) offset greatest(0, coalesce(p_offset, 0))
  ) x);
end $$;

-- ---------- Permisos ----------
-- El catalogo solo lee productos activos y los ajustes; todo lo demas
-- pasa por las funciones del panel.
drop policy if exists "nevada_productos lectura" on public.nevada_productos;
create policy "nevada_productos lectura" on public.nevada_productos for select to anon, authenticated
  using (eliminado_en is null);
drop policy if exists "nevada_productos admin insertar" on public.nevada_productos;
drop policy if exists "nevada_productos admin actualizar" on public.nevada_productos;
drop policy if exists "nevada_productos admin eliminar" on public.nevada_productos;
drop policy if exists "nevada_ajustes admin insertar" on public.nevada_ajustes;
drop policy if exists "nevada_ajustes admin actualizar" on public.nevada_ajustes;
drop policy if exists "nevada_pedidos admin leer" on public.nevada_pedidos;
drop policy if exists "nevada_pedidos admin vincular" on public.nevada_pedidos;
drop policy if exists "nevada_auditoria admin escribir" on public.nevada_auditoria;
drop policy if exists "nevada_auditoria admin leer" on public.nevada_auditoria;
revoke insert, update, delete on public.nevada_productos from anon, authenticated;
revoke insert, update, delete on public.nevada_ajustes from anon, authenticated;
revoke all on public.nevada_pedidos from anon, authenticated;
revoke all on public.nevada_auditoria from anon, authenticated;

-- Las nevada_admin_* quedan solo para la clave secreta (y para las
-- funciones del panel, que las llaman por dentro).
revoke execute on function public.nevada_admin_clientes(text, boolean, integer) from authenticated;
revoke execute on function public.nevada_admin_clientes_todos() from authenticated;
revoke execute on function public.nevada_admin_cliente_guardar(text, text, text, text, text, text) from authenticated;
revoke execute on function public.nevada_admin_cliente_crear(text, text, text, text, text, text) from authenticated;
revoke execute on function public.nevada_admin_cliente_papelera(text, boolean) from authenticated;
revoke execute on function public.nevada_admin_cliente_eliminar(text) from authenticated;
revoke execute on function public.nevada_admin_clave_temporal(text, text, text) from authenticated;
revoke execute on function public.nevada_admin_activo(text, boolean) from authenticated;
revoke execute on function public.nevada_admin_estado_sync() from authenticated;

-- El ingreso con cuentas de Supabase Auth ya no se usa en Nevada.
drop function if exists public.nevada_admin_rol();
drop table if exists nevada.admins;

do $$
declare f text;
begin
  foreach f in array array[
    'public.nevada_panel_rol(text)',
    'public.nevada_panel_productos(text)',
    'public.nevada_panel_producto_guardar(text, integer, jsonb)',
    'public.nevada_panel_producto_papelera(text, integer, boolean)',
    'public.nevada_panel_producto_eliminar(text, integer)',
    'public.nevada_panel_clientes(text, text, boolean, integer)',
    'public.nevada_panel_clientes_todos(text)',
    'public.nevada_panel_cliente_guardar(text, text, text, text, text, text, text)',
    'public.nevada_panel_cliente_crear(text, text, text, text, text, text, text)',
    'public.nevada_panel_cliente_papelera(text, text, boolean)',
    'public.nevada_panel_cliente_eliminar(text, text)',
    'public.nevada_panel_clave_temporal(text, text)',
    'public.nevada_panel_cliente_activo(text, text, boolean)',
    'public.nevada_panel_estado_sync(text)',
    'public.nevada_panel_pedidos(text, text, timestamptz, timestamptz, integer, integer)',
    'public.nevada_panel_pedido_vincular(text, uuid, text)',
    'public.nevada_panel_stock_corregir(text, text, integer)',
    'public.nevada_panel_ajuste_guardar(text, text, jsonb)',
    'public.nevada_panel_historial(text, text, integer, integer)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end $$;

-- ---------- Quienes entran ----------
-- Solo estas personas (por su codigo de cliente). Para cambiar a
-- alguien, editar esta lista y volver a correr este archivo.
insert into nevada.admins_clientes (codigo, rol) values
  ('806', 'admin'),     -- LUIS EMILIO VARGAS ALFARO: completo
  ('222', 'editor'),    -- ERNESTO BRENES JIMENEZ: ve todo, edita productos y stock
  ('863', 'editor'),    -- JORGE LUIS SANTAMARIA RAMIREZ: ve todo, edita productos y stock
  ('559', 'editor'),    -- VLADIMIR ALEMAN: ve todo, edita productos y stock
  ('23',  'lectura'),   -- CARLOS ALEMAN VILLALOBOS: solo ver
  ('92',  'lectura')    -- MARJORIE CHACON JIMENEZ: solo ver
on conflict (codigo) do update set rol = excluded.rol;
delete from nevada.admins_clientes where codigo not in ('806', '222', '863', '559', '23', '92');
