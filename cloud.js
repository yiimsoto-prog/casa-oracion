/* Capa de nube: Auth + REST de Supabase con la clave anon (RLS aplica). */
'use strict';

(function (global) {
  const cfg = global.IGLESIA_CLOUD || {};
  const BASE = (cfg.url || '').replace(/\/$/, '');
  const ANON = cfg.anon || '';
  const TOKEN_KEY = 'iglesia_cloud_token_v1';
  const REFRESH_KEY = 'iglesia_cloud_refresh_v1';
  const EMAIL_DOMAIN = 'casaoracion.app';
  const ACCOUNT_MAP = {
    pastor: { email: 'pastor@' + EMAIL_DOMAIN, role: 'lider', name: 'Pastor' },
    tesorero: { email: 'tesorero@' + EMAIL_DOMAIN, role: 'tesorero', name: 'Tesorero' },
    secretario: { email: 'secretario@' + EMAIL_DOMAIN, role: 'secretario', name: 'Secretario' },
    miembro: { email: 'miembro@' + EMAIL_DOMAIN, role: 'miembro', name: 'Miembro' }
  };

  const TABLE_MAP = {
    diezmos: 'diezmos',
    servicios: 'servicios',
    ingresos: 'ingresos',
    remuneraciones: 'remuneraciones',
    cajachica: 'cajachica',
    members: 'miembros',
    santacena: 'santacena',
    agendas: 'agendas',
    presupuestos: 'presupuestos',
    auditoria: 'auditoria'
  };

  const TO_CLOUD = {
    tipoOp: 'tipo_op',
    nroComp: 'nro_comp',
    fechaBautizo: 'fecha_bautizo'
  };
  const FROM_CLOUD = Object.fromEntries(Object.entries(TO_CLOUD).map(([a, b]) => [b, a]));

  let token = '';
  let refresh = '';
  let status = 'off';
  let syncTimer = null;
  let pending = new Map();

  try {
    token = sessionStorage.getItem(TOKEN_KEY) || '';
    refresh = sessionStorage.getItem(REFRESH_KEY) || '';
  } catch (e) {
    token = '';
    refresh = '';
  }

  function enabled() { return !!(BASE && ANON); }
  function online() { return enabled() && !!token && navigator.onLine !== false; }
  function getStatus() { return !enabled() ? 'off' : !token ? 'ready' : status; }
  function setStatus(s) { status = s; }

  function headers(extra) {
    return Object.assign({
      apikey: ANON,
      Authorization: 'Bearer ' + (token || ANON),
      'Content-Type': 'application/json'
    }, extra || {});
  }

  async function req(path, opts) {
    opts = opts || {};
    const res = await fetch(BASE + path, Object.assign({}, opts, { headers: headers(opts.headers) }));
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
    if (!res.ok) {
      const msg = (body && (body.msg || body.error_description || body.error || body.message)) || ('HTTP ' + res.status);
      const err = new Error(typeof msg === 'string' ? msg : 'Error de nube');
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  function persistTokens(access, refreshToken) {
    token = access || '';
    if (refreshToken) refresh = refreshToken;
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
      if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh);
      else sessionStorage.removeItem(REFRESH_KEY);
    } catch (e) { }
  }

  async function refreshIfNeeded() {
    if (!enabled() || !refresh) return false;
    try {
      const data = await req('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh })
      });
      persistTokens(data.access_token, data.refresh_token || refresh);
      setStatus('ok');
      return true;
    } catch (e) {
      persistTokens('', '');
      setStatus('ready');
      return false;
    }
  }

  function toEmail(user) {
    const u = String(user || '').trim().toLowerCase();
    if (!u) return '';
    if (u.includes('@')) return u;
    // Solo alias cortos explícitos; no inventar correos arbitrarios usuario@dominio
    if (ACCOUNT_MAP[u]) return ACCOUNT_MAP[u].email;
    return '';
  }

  function toLocalUser(email) {
    const e = String(email || '').toLowerCase();
    const hit = Object.entries(ACCOUNT_MAP).find(([, v]) => v.email === e);
    return hit ? hit[0] : e.split('@')[0];
  }

  function mapOut(row) {
    if (!row || typeof row !== 'object') return row;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === 'created_at') continue;
      out[FROM_CLOUD[k] || k] = v;
    }
    return out;
  }

  function mapIn(row) {
    if (!row || typeof row !== 'object') return row;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === '' || v === undefined) continue;
      out[TO_CLOUD[k] || k] = v;
    }
    return out;
  }

  function isUuid(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));
  }

  async function login(user, password) {
    if (!enabled()) return { ok: false, reason: 'off' };
    const email = toEmail(user);
    if (!email) return { ok: false, reason: 'Use el correo completo de la cuenta' };
    try {
      const data = await req('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      persistTokens(data.access_token, data.refresh_token || '');
      let perfil = null;
      try {
        perfil = await req('/rest/v1/perfiles?select=rol,nombre&id=eq.' + encodeURIComponent(data.user.id), {
          headers: { Accept: 'application/vnd.pgrst.object+json' }
        });
      } catch (e) { perfil = null; }
      const localUser = toLocalUser(email);
      if (!perfil || !perfil.rol) {
        setStatus('err');
        return { ok: false, reason: 'Sin perfil de rol en la nube. Contacte al administrador.' };
      }
      const me = {
        id: data.user.id,
        user: localUser,
        name: perfil.nombre || (ACCOUNT_MAP[localUser] && ACCOUNT_MAP[localUser].name) || localUser,
        role: String(perfil.rol || '').toLowerCase(),
        cloud: true
      };
      setStatus('ok');
      return { ok: true, me };
    } catch (e) {
      setStatus('err');
      return { ok: false, reason: e.message || 'auth' };
    }
  }

  async function fetchPerfil(userId) {
    return await req('/rest/v1/perfiles?select=rol,nombre&id=eq.' + encodeURIComponent(userId), {
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
  }

  /** Revalida JWT + rol desde Supabase. El rol nunca se toma del cliente. */
  async function sessionFromServer() {
    if (!enabled()) return { ok: false, reason: 'off' };
    if (!token) {
      const refreshed = await refreshIfNeeded();
      if (!refreshed) return { ok: false, reason: 'sin sesión' };
    }
    try {
      await refreshIfNeeded();
      const user = await req('/auth/v1/user');
      if (!user || !user.id) return { ok: false, reason: 'sin usuario' };
      const perfil = await fetchPerfil(user.id);
      if (!perfil || !perfil.rol) return { ok: false, reason: 'Sin perfil de rol en la nube' };
      const email = (user.email || '').toLowerCase();
      const localUser = toLocalUser(email);
      setStatus('ok');
      return {
        ok: true,
        me: {
          id: user.id,
          user: localUser,
          name: perfil.nombre || (ACCOUNT_MAP[localUser] && ACCOUNT_MAP[localUser].name) || localUser,
          role: String(perfil.rol || '').toLowerCase(),
          cloud: true
        }
      };
    } catch (e) {
      setStatus('err');
      return { ok: false, reason: e.message || 'auth' };
    }
  }

  async function logout() {
    try {
      if (token) await req('/auth/v1/logout', { method: 'POST', body: '{}' });
    } catch (e) { }
    persistTokens('', '');
    setStatus(enabled() ? 'ready' : 'off');
  }

  async function pullTable(remote) {
    const page = 1000;
    let from = 0;
    const all = [];
    while (true) {
      const rows = await req('/rest/v1/' + remote + '?select=*&order=created_at.asc&limit=' + page + '&offset=' + from);
      if (!rows || !rows.length) break;
      all.push(...rows);
      if (rows.length < page) break;
      from += page;
      if (from > 50000) break;
    }
    return all;
  }

  async function pullAll(db) {
    if (!online()) {
      const refreshed = await refreshIfNeeded();
      if (!refreshed || !online()) return false;
    }
    setStatus('sync');
    try {
      for (const [localKey, remote] of Object.entries(TABLE_MAP)) {
        const rows = await pullTable(remote);
        const remoteMapped = (rows || []).map(mapOut);
        const local = Array.isArray(db[localKey]) ? db[localKey] : [];
        const map = new Map(local.filter(r => r && r.id).map(r => [String(r.id), r]));
        remoteMapped.forEach(r => {
          if (!r || !r.id) return;
          const prev = map.get(String(r.id));
          const ru = String(r.updated_at || r.fecha || '');
          const pu = prev ? String(prev.updated_at || prev.fecha || '') : '';
          if (!prev || ru >= pu) map.set(String(r.id), Object.assign({}, prev || {}, r));
        });
        db[localKey] = [...map.values()];
      }
      setStatus('ok');
      return true;
    } catch (e) {
      setStatus('err');
      throw e;
    }
  }

  async function upsertRow(localKey, row) {
    if (!online() || !row) return;
    const remote = TABLE_MAP[localKey];
    if (!remote) return;
    const payload = mapIn(row);
    const hasId = isUuid(payload.id);
    if (!hasId) delete payload.id;
    const path = '/rest/v1/' + remote + (hasId ? '?on_conflict=id' : '');
    const saved = await req(path, {
      method: 'POST',
      headers: { Prefer: hasId ? 'resolution=merge-duplicates,return=representation' : 'return=representation' },
      body: JSON.stringify(payload)
    });
    const one = Array.isArray(saved) ? saved[0] : saved;
    if (one && one.id) row.id = one.id;
    setStatus('ok');
    return mapOut(one || row);
  }

  async function deleteRow(localKey, id) {
    if (!online() || !isUuid(id)) return;
    const remote = TABLE_MAP[localKey];
    if (!remote) return;
    await req('/rest/v1/' + remote + '?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
    setStatus('ok');
  }

  async function flush() {
    if (!online() || !pending.size) return;
    const jobs = [...pending.values()];
    pending.clear();
    setStatus('sync');
    try {
      for (const job of jobs) {
        if (job.op === 'del') await deleteRow(job.table, job.id);
        else if (job.row) await upsertRow(job.table, job.row);
      }
      setStatus('ok');
    } catch (e) {
      jobs.forEach(j => pending.set(j.key, j));
      setStatus('err');
    }
  }

  function queueSave(localKey, row) {
    if (!TABLE_MAP[localKey] || !row) return;
    const key = localKey + ':' + (row.id || ('tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)));
    pending.set(key, { op: 'upsert', table: localKey, row, key });
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (typeof global.__iglesiaFlushCloud === 'function') global.__iglesiaFlushCloud();
    }, 500);
  }

  function queueDelete(localKey, id) {
    if (!TABLE_MAP[localKey] || !isUuid(id)) return;
    const key = 'del:' + localKey + ':' + id;
    pending.set(key, { op: 'del', table: localKey, id, key });
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (typeof global.__iglesiaFlushCloud === 'function') global.__iglesiaFlushCloud();
    }, 500);
  }

  global.Cloud = {
    enabled, online, getStatus, setStatus, login, logout, pullAll,
    upsertRow, deleteRow, flush, queueSave, queueDelete, ACCOUNT_MAP, isUuid, mapIn, mapOut,
    refreshIfNeeded, sessionFromServer, fetchPerfil
  };
})(window);
