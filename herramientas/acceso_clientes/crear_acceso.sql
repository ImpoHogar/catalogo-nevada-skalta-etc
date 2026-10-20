-- ============================================================
--  ACCESO DE CLIENTES Y PRECIOS P4 - Catalogo Nevada
-- ============================================================
--  Inicio de sesion propio para los clientes de Nevada (codigo de
--  cliente + contrasena). NO usa los usuarios de Supabase Auth: ese
--  sistema lo usa perfumeria para sus administradores y sus reglas
--  dejan leer clientes y pedidos a cualquier usuario autenticado.
--  Aqui los clientes de Nevada nunca son "authenticated", asi que no
--  ven nada de perfumeria, y perfumeria no se toca.
--
--  Todo vive en el esquema privado "nevada" (no expuesto en la API).
--  El catalogo solo entra por las funciones public.nevada_* de abajo.
--
--  - Contrasenas con bcrypt (pgcrypto). Nunca se guardan en claro.
--  - Sesiones de 30 dias; el token se guarda solo como hash SHA-256.
--  - 5 intentos fallidos bloquean la cuenta 15 minutos.
--  - Los precios P4 solo se entregan con una sesion valida y despues
--    de que el cliente cambio su contrasena temporal.
--  - Las funciones de administracion y la subida de precios solo las
--    puede usar la clave secreta (service_role).
-- ============================================================

create schema if not exists nevada;
revoke all on schema nevada from public, anon, authenticated;

create table if not exists nevada.clientes (
  codigo            text primary key,
  nombre            text not null,
  vendedor          text,
  activo            boolean not null default true,
  clave_hash        text not null,
  debe_cambiar      boolean not null default true,
  intentos_fallidos integer not null default 0,
  bloqueado_hasta   timestamptz,
  ultimo_ingreso    timestamptz,
  clave_cambiada    timestamptz,
  creado            timestamptz not null default now()
);

create table if not exists nevada.sesiones (
  token_hash text primary key,
  codigo     text not null references nevada.clientes(codigo) on delete cascade,
  creada     timestamptz not null default now(),
  expira     timestamptz not null
);
create index if not exists sesiones_codigo_idx on nevada.sesiones(codigo);

create table if not exists nevada.precios (
  id          text primary key,          -- 'p4'
  datos       jsonb not null default '{}'::jsonb,   -- {"codigo": precio}
  total       integer not null default 0,
  actualizado timestamptz not null default now()
);

alter table nevada.clientes enable row level security;
alter table nevada.sesiones enable row level security;
alter table nevada.precios  enable row level security;
revoke all on all tables in schema nevada from public, anon, authenticated;

-- ---------- Ayudantes internos ----------
create or replace function nevada.hash_token(p_token text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

create or replace function nevada.cliente_de_sesion(p_token text) returns nevada.clientes
language sql stable security definer set search_path = '' as $$
  select c.* from nevada.sesiones s
  join nevada.clientes c on c.codigo = s.codigo
  where s.token_hash = nevada.hash_token(p_token) and s.expira > now() and c.activo
$$;

create or replace function nevada.clave_aleatoria() returns text
language sql volatile set search_path = '' as $$
  -- 8 caracteres sin letras ni numeros que se confundan (sin 0/O, 1/I/L).
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (get_byte(b, i) % 31) + 1, 1), '')
  from extensions.gen_random_bytes(8) b, generate_series(0, 7) i
$$;

revoke all on all functions in schema nevada from public, anon, authenticated;

-- ---------- Funciones que usa el catalogo (clave publica) ----------
create or replace function public.nevada_ingresar(p_codigo text, p_clave text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c nevada.clientes;
  v_clave text := coalesce(p_clave, '');
  v_token text;
begin
  select * into c from nevada.clientes where codigo = btrim(coalesce(p_codigo, ''));
  if not found or not c.activo then
    perform pg_sleep(0.4);
    return jsonb_build_object('ok', false, 'error', 'Código o contraseña incorrectos.');
  end if;
  if c.bloqueado_hasta is not null and c.bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'error', 'Demasiados intentos fallidos. Espera 15 minutos o contacta a tu vendedor.');
  end if;
  -- La temporal se acepta sin importar mayusculas, espacios ni guiones.
  if c.debe_cambiar then
    v_clave := upper(regexp_replace(v_clave, '[\s-]', '', 'g'));
  end if;
  if c.clave_hash is distinct from extensions.crypt(v_clave, c.clave_hash) then
    update nevada.clientes
       set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
           bloqueado_hasta   = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueado_hasta end
     where codigo = c.codigo;
    return jsonb_build_object('ok', false, 'error', 'Código o contraseña incorrectos.');
  end if;

  update nevada.clientes set intentos_fallidos = 0, bloqueado_hasta = null, ultimo_ingreso = now() where codigo = c.codigo;
  delete from nevada.sesiones where expira < now();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into nevada.sesiones (token_hash, codigo, expira) values (nevada.hash_token(v_token), c.codigo, now() + interval '30 days');
  return jsonb_build_object('ok', true, 'token', v_token, 'codigo', c.codigo, 'nombre', c.nombre, 'debe_cambiar', c.debe_cambiar);
end $$;

create or replace function public.nevada_sesion(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c nevada.clientes;
begin
  c := nevada.cliente_de_sesion(p_token);
  if c.codigo is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'codigo', c.codigo, 'nombre', c.nombre, 'debe_cambiar', c.debe_cambiar);
end $$;

create or replace function public.nevada_cambiar_clave(p_token text, p_actual text, p_nueva text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c nevada.clientes;
  v_actual text := coalesce(p_actual, '');
  v_nueva text := coalesce(p_nueva, '');
begin
  c := nevada.cliente_de_sesion(p_token);
  if c.codigo is null then
    return jsonb_build_object('ok', false, 'error', 'Tu sesión venció. Vuelve a ingresar.');
  end if;
  if c.debe_cambiar then v_actual := upper(regexp_replace(v_actual, '[\s-]', '', 'g')); end if;
  if c.clave_hash is distinct from extensions.crypt(v_actual, c.clave_hash) then
    return jsonb_build_object('ok', false, 'error', 'La contraseña actual no es correcta.');
  end if;
  if length(v_nueva) < 8 then
    return jsonb_build_object('ok', false, 'error', 'La nueva contraseña debe tener al menos 8 caracteres.');
  end if;
  if v_nueva = coalesce(p_actual, '') or upper(v_nueva) = v_actual then
    return jsonb_build_object('ok', false, 'error', 'La nueva contraseña debe ser distinta a la actual.');
  end if;
  update nevada.clientes
     set clave_hash = extensions.crypt(v_nueva, extensions.gen_salt('bf', 10)),
         debe_cambiar = false, clave_cambiada = now()
   where codigo = c.codigo;
  -- Cierra las demas sesiones abiertas de ese cliente.
  delete from nevada.sesiones where codigo = c.codigo and token_hash <> nevada.hash_token(p_token);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.nevada_salir(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from nevada.sesiones where token_hash = nevada.hash_token(p_token)
$$;

create or replace function public.nevada_precios(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c nevada.clientes;
  p nevada.precios;
begin
  c := nevada.cliente_de_sesion(p_token);
  if c.codigo is null or c.debe_cambiar then return jsonb_build_object('ok', false); end if;
  select * into p from nevada.precios where id = 'p4';
  return jsonb_build_object('ok', true, 'datos', coalesce(p.datos, '{}'::jsonb), 'actualizado', p.actualizado);
end $$;

-- ---------- Solo clave secreta (service_role) ----------
create or replace function public.nevada_subir_precios(p_datos jsonb, p_total integer) returns void
language sql security definer set search_path = '' as $$
  insert into nevada.precios (id, datos, total, actualizado) values ('p4', p_datos, p_total, now())
  on conflict (id) do update set datos = excluded.datos, total = excluded.total, actualizado = excluded.actualizado
$$;

-- Crea el cliente si no existe (necesita nombre) o le pone una nueva
-- contrasena temporal si ya existe. Devuelve la temporal.
create or replace function public.nevada_admin_clave_temporal(p_codigo text, p_nombre text default null, p_vendedor text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text := btrim(coalesce(p_codigo, ''));
  v_clave text := nevada.clave_aleatoria();
  v_hash text := extensions.crypt(v_clave, extensions.gen_salt('bf', 8));
begin
  if v_codigo = '' then return jsonb_build_object('ok', false, 'error', 'Falta el código.'); end if;
  if exists (select 1 from nevada.clientes where codigo = v_codigo) then
    update nevada.clientes
       set clave_hash = v_hash, debe_cambiar = true, intentos_fallidos = 0, bloqueado_hasta = null, activo = true,
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
  update nevada.clientes set activo = p_activo where codigo = btrim(coalesce(p_codigo, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'No existe ese código.'); end if;
  if not p_activo then delete from nevada.sesiones where codigo = btrim(p_codigo); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Permisos ----------
revoke all on function public.nevada_ingresar(text, text)              from public, anon, authenticated;
revoke all on function public.nevada_sesion(text)                      from public, anon, authenticated;
revoke all on function public.nevada_cambiar_clave(text, text, text)   from public, anon, authenticated;
revoke all on function public.nevada_salir(text)                       from public, anon, authenticated;
revoke all on function public.nevada_precios(text)                     from public, anon, authenticated;
revoke all on function public.nevada_subir_precios(jsonb, integer)     from public, anon, authenticated;
revoke all on function public.nevada_admin_clave_temporal(text, text, text) from public, anon, authenticated;
revoke all on function public.nevada_admin_activo(text, boolean)       from public, anon, authenticated;

grant execute on function public.nevada_ingresar(text, text)            to anon;
grant execute on function public.nevada_sesion(text)                    to anon;
grant execute on function public.nevada_cambiar_clave(text, text, text) to anon;
grant execute on function public.nevada_salir(text)                     to anon;
grant execute on function public.nevada_precios(text)                   to anon;

grant execute on function public.nevada_subir_precios(jsonb, integer)          to service_role;
grant execute on function public.nevada_admin_clave_temporal(text, text, text) to service_role;
grant execute on function public.nevada_admin_activo(text, boolean)            to service_role;
