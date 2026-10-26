-- ============================================================
--  UBICACION APROXIMADA DE CADA PEDIDO (solo Catalogo Nevada)
-- ============================================================
--  Al guardar un pedido se anota, segun la conexion a internet del
--  cliente: lugar y provincia aproximados, proveedor, si fue con datos
--  moviles (cuando el navegador lo informa) y el equipo. No se guarda
--  la direccion IP. La ubicacion se borra sola a los 6 meses; el
--  pedido sigue guardado.
--
--  La lista de ubicaciones (nevada.geo_ip, nevada.geo_asn) sale de
--  DB-IP Lite (CC BY 4.0, https://db-ip.com) y se carga con
--  herramientas/ubicaciones/preparar_geo.py.
--
--  Se puede correr de nuevo sin problema.
-- ============================================================

-- ---------- Lista de ubicaciones de Costa Rica ----------
create table if not exists nevada.geo_ip (
  desde     bigint primary key,
  hasta     bigint not null,
  lugar     text not null,
  provincia text not null
);
create table if not exists nevada.geo_asn (
  desde     bigint primary key,
  hasta     bigint not null,
  proveedor text not null
);
alter table nevada.geo_ip enable row level security;
alter table nevada.geo_asn enable row level security;
revoke all on nevada.geo_ip, nevada.geo_asn from public, anon, authenticated;

-- ---------- Columnas nuevas del pedido ----------
alter table public.nevada_pedidos
  add column if not exists ubic_lugar     text,
  add column if not exists ubic_provincia text,
  add column if not exists ubic_proveedor text,
  add column if not exists ubic_movil     boolean,
  add column if not exists ubic_equipo    text;

-- ---------- Ubicacion de una conexion ----------
-- ip: la del cliente; ua: navegador (user-agent); conexion: lo que
-- informa el navegador ('cellular', 'wifi'...; solo Android lo da).
create or replace function nevada.ubicacion_de(p_ip text, p_ua text, p_conexion text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  n bigint;
  g nevada.geo_ip;
  pr text;
  ua text := coalesce(p_ua, '');
  equipo text;
begin
  if p_ip ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$' then
    n := split_part(p_ip, '.', 1)::bigint * 16777216 + split_part(p_ip, '.', 2)::bigint * 65536
       + split_part(p_ip, '.', 3)::bigint * 256 + split_part(p_ip, '.', 4)::bigint;
    select * into g from nevada.geo_ip where desde <= n order by desde desc limit 1;
    if g.hasta is null or g.hasta < n then g := null; end if;
    select a.proveedor into pr from nevada.geo_asn a where a.desde <= n and a.hasta >= n order by a.desde desc limit 1;
  end if;
  equipo := case
      when ua ~* 'iphone' then 'iPhone'
      when ua ~* 'ipad' then 'iPad'
      when ua ~* 'android' and ua ~* 'mobile' then 'Celular Android'
      when ua ~* 'android' then 'Tablet Android'
      when ua ~* 'windows' then 'Computadora Windows'
      when ua ~* 'macintosh|mac os' then 'Computadora Mac'
      when ua ~* 'linux' then 'Computadora Linux'
      else 'Equipo desconocido' end
    || coalesce(' · ' || case
      when ua ~* 'edg/' then 'Edge'
      when ua ~* 'samsungbrowser' then 'Samsung Internet'
      when ua ~* 'opr/|opera' then 'Opera'
      when ua ~* 'firefox|fxios' then 'Firefox'
      when ua ~* 'chrome|crios' then 'Chrome'
      when ua ~* 'safari' then 'Safari' end, '');
  return jsonb_build_object(
    'lugar', g.lugar, 'provincia', g.provincia, 'proveedor', pr,
    'movil', lower(coalesce(p_conexion, '')) = 'cellular' or coalesce(pr, '') ilike '%móvil%',
    'equipo', equipo);
end $$;
revoke all on function nevada.ubicacion_de(text, text, text) from public, anon, authenticated;

-- ---------- Registrar pedido (ahora con ubicacion) ----------
-- p_conexion es opcional: el catalogo viejo (sin recargar) sigue funcionando.
drop function if exists public.nevada_registrar_pedido(text, text, text, jsonb);
create or replace function public.nevada_registrar_pedido(p_token text, p_nombre text, p_telefono text, p_items jsonb, p_conexion text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c nevada.clientes;
  v_items jsonb;
  v_id uuid;
  v_u jsonb;
  v_h json;
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
  -- La ubicacion nunca frena el pedido.
  begin
    v_h := current_setting('request.headers', true)::json;
    v_u := nevada.ubicacion_de(btrim(split_part(coalesce(v_h ->> 'x-forwarded-for', ''), ',', 1)),
                               v_h ->> 'user-agent', left(p_conexion, 20));
  exception when others then v_u := null;
  end;
  insert into public.nevada_pedidos (cliente_codigo, cliente_nombre, cliente_telefono, items, total_lineas, total_unidades,
                                     ubic_lugar, ubic_provincia, ubic_proveedor, ubic_movil, ubic_equipo)
  values (c.codigo, left(coalesce(nullif(btrim(p_nombre), ''), c.nombre), 120), left(nullif(btrim(coalesce(p_telefono, '')), ''), 40), v_items,
          jsonb_array_length(v_items), (select coalesce(sum((x ->> 'qty')::integer), 0) from jsonb_array_elements(v_items) x),
          v_u ->> 'lugar', v_u ->> 'provincia', v_u ->> 'proveedor', (v_u ->> 'movil')::boolean, v_u ->> 'equipo')
  returning id into v_id;
  -- Ubicaciones de mas de 6 meses: se borran (el pedido se queda).
  update public.nevada_pedidos
     set ubic_lugar = null, ubic_provincia = null, ubic_proveedor = null, ubic_movil = null, ubic_equipo = null
   where creado_en < now() - interval '6 months' and (ubic_lugar is not null or ubic_provincia is not null or ubic_equipo is not null);
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
revoke all on function public.nevada_registrar_pedido(text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.nevada_registrar_pedido(text, text, text, jsonb, text) to anon;

-- ---------- Panel: lugares desde donde pidio cada cliente (6 meses) ----------
create or replace function public.nevada_panel_ubicaciones(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform nevada.entrar_panel(p_token, array['admin', 'editor', 'lectura']);
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.cliente_codigo, x.hasta desc), '[]'::jsonb) from (
    select p.cliente_codigo, p.ubic_lugar as lugar, p.ubic_provincia as provincia,
           count(*) as pedidos, count(*) filter (where p.ubic_movil) as movil,
           min(p.creado_en) as desde, max(p.creado_en) as hasta
      from public.nevada_pedidos p
     where p.cliente_codigo is not null and p.ubic_provincia is not null
       and p.creado_en >= now() - interval '6 months'
     group by p.cliente_codigo, p.ubic_lugar, p.ubic_provincia
  ) x);
end $$;
revoke all on function public.nevada_panel_ubicaciones(text) from public, anon, authenticated;
grant execute on function public.nevada_panel_ubicaciones(text) to anon;
