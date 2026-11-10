/* Iglesia Misionera Casa de Oración para Todas las Naciones Visión - Challhuahuacho
   Aplicativo móvil (PWA). Datos guardados localmente en el dispositivo (localStorage). */
'use strict';

const CHURCH = 'Iglesia Misionera Casa de Oración para Todas las Naciones Visión';
const PLACE = 'Challhuahuacho';
const PHRASE = 'Al Señor sea la gloria';
const TZ = 'America/Lima';
const DB_KEY = 'iglesia_db_v1';
const SESSION_KEY = 'iglesia_session_v2';
const APP_VERSION = '2026.11.9-r6';
const TABLES = ['users', 'diezmos', 'servicios', 'ingresos', 'remuneraciones', 'cajachica', 'members', 'santacena', 'agendas', 'presupuestos', 'auditoria'];
const AUDIT_MODS = ['cajachica', 'presupuestos', 'agendas'];

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
const money = n => 'S/ ' + (+n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const monthNow = () => todayStr().slice(0, 7);
const fmtDate = d => d ? d.split('-').reverse().join('/') : '';
const monthLabel = m => { if (!m) return 'Todos los meses'; const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }); };
function legacyHash(s) { // cyrb53 legacy (solo verificar cuentas antiguas)
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
function hash(s) { return legacyHash(s); }
function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
async function hashPassword(pass, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return { salt: b64(salt), pass: b64(bits) };
}
async function verifyPassword(userRow, pass) {
  if (!userRow || !pass) return false;
  if (userRow.salt) {
    const next = await hashPassword(pass, userRow.salt);
    return next.pass === userRow.pass;
  }
  return userRow.pass === legacyHash(pass);
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2200); }

/* ---------- versículo diario ---------- */
const DAILY_VERSES = [
  { t: "Pídeme, y te daré por herencia las naciones, y como posesión tuya los confines de la tierra.", r: "Salmos 2:8" },
  { t: "Fiel es Dios, por el cual fuisteis llamados a la comunión con su Hijo Jesucristo nuestro Señor.", r: "1 Corintios 1:9" },
  { t: "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar.", r: "Salmos 23:1-2" },
  { t: "Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.", r: "Mateo 6:33" },
  { t: "Todo lo puedo en Cristo que me fortalece.", r: "Filipenses 4:13" },
  { t: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal.", r: "Jeremías 29:11" },
  { t: "Confía en Jehová con todo tu corazón, y no te apoyes en tu propia prudencia.", r: "Proverbios 3:5" },
  { t: "El Señor es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida.", r: "Salmos 27:1" },
  { t: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo.", r: "Josué 1:9" },
  { t: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.", r: "Mateo 11:28" },
  { t: "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón.", r: "Juan 14:27" },
  { t: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego.", r: "Filipenses 4:6" },
  { t: "Si Dios es por nosotros, ¿quién contra nosotros?", r: "Romanos 8:31" },
  { t: "El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.", r: "Salmos 91:1" },
  { t: "Ciertamente el bien y la misericordia me seguirán todos los días de mi vida, y en la casa de Jehová moraré.", r: "Salmos 23:6" },
  { t: "Clama a mí, y yo te responderé, y te enseñaré cosas grandes y ocultas que tú no conoces.", r: "Jeremías 33:3" },
  { t: "Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.", r: "Isaías 40:31" },
  { t: "Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.", r: "Romanos 8:28" },
  { t: "Instruye al niño en su camino, y aun cuando fuere viejo no se apartará de él.", r: "Proverbios 22:6" },
  { t: "Lámpara es a mis pies tu palabra, y lumbrera a mi camino.", r: "Salmos 119:105" },
  { t: "El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece.", r: "1 Corintios 13:4" },
  { t: "De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.", r: "2 Corintios 5:17" },
  { t: "Bendito sea el Dios y Padre de nuestro Señor Jesucristo, Padre de misericordias y Dios de toda consolación.", r: "2 Corintios 1:3" },
  { t: "Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.", r: "1 Tesalonicenses 5:18" },
  { t: "No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.", r: "Gálatas 6:9" },
  { t: "He peleado la buena batalla, he acabado la carrera, he guardado la fe.", r: "2 Timoteo 4:7" },
  { t: "Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.", r: "Efesios 2:8" },
  { t: "Grande es su fidelidad; nuevas son sus misericordias cada mañana.", r: "Lamentaciones 3:23" },
  { t: "Torre fuerte es el nombre de Jehová; a él correrá el justo, y será levantado.", r: "Proverbios 18:10" },
  { t: "Yo soy el camino, y la verdad, y la vida; nadie viene al Padre, sino por mí.", r: "Juan 14:6" },
  { t: "Alabad a Jehová, porque él es bueno; porque para siempre es su misericordia.", r: "Salmos 136:1" }
];
function getDailyVerse() {
  const d = new Date();
  // Índice según día del año
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

/* ---------- base de datos estructurada con IndexedDB (Dexie) ---------- */
function seed() {
  return {
    users: [],
    diezmos: [], servicios: [], ingresos: [], remuneraciones: [], cajachica: [], members: [], santacena: [],
    agendas: [], presupuestos: [], auditoria: []
  };
}

// Configuración de IndexedDB con Dexie
let idb = null;
if (typeof Dexie !== 'undefined') {
  idb = new Dexie('IglesiaDB');
  const stores = {
    users: 'id, user, role',
    diezmos: 'id, fecha, nombre, tipoOp',
    servicios: 'id, fecha, concepto, comprobante',
    ingresos: 'id, fecha, concepto, tipoOp',
    remuneraciones: 'id, fecha, etapa, nombre',
    cajachica: 'id, fecha, tipo, comprobante',
    members: 'id, nombre, estado, bautizado, cargo',
    santacena: 'id, fecha',
    metadata: 'key'
  };
  idb.version(1).stores(stores);
  idb.version(2).stores({
    ...stores,
    agendas: 'id, fecha, estado, tipo',
    presupuestos: 'id, periodo, estado, categoria',
    auditoria: 'id, fecha, modulo, accion'
  });
}

// Estado en memoria y sincronización segura (Evita sobreescritura accidental)
let hasLocalStorage = false;
let db = (() => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.users) && d.users.length) {
        hasLocalStorage = true;
        return d;
      }
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return seed();
})();
TABLES.forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
db.cierres = db.cierres || {};

let persistTimer = null;
function flushLocal() {
  clearTimeout(persistTimer);
  persistTimer = null;
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
  catch (e) { console.error('Error guardando en localStorage:', e); }
}
const saveLocalOnly = () => {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(flushLocal, 40);
};
document.addEventListener('visibilitychange', () => { if (document.hidden) flushLocal(); });
window.addEventListener('pagehide', flushLocal);

// Sincronización con IndexedDB. Solo reescribe las tablas tocadas y encola
// un pase a la vez para no bloquear la interfaz en cada movimiento.
let syncing = false;
let dirty = false;
let dirtyAll = false;
let dirtySet = new Set();
async function syncToIndexedDB(list, snap, cierres) {
  for (const tbl of list) {
    if (!idb[tbl]) continue;
    const rows = snap[tbl] || [];
    await idb[tbl].clear();
    if (rows.length) await idb[tbl].bulkPut(rows);
  }
  if (cierres && idb.metadata) await idb.metadata.put({ key: 'cierres', value: cierres });
}
async function kickSync() {
  if (syncing || !idb) return;
  syncing = true;
  try {
    while (dirty) {
      dirty = false;
      const all = dirtyAll;
      const list = all ? TABLES.slice() : [...dirtySet];
      dirtyAll = false;
      dirtySet = new Set();
      const snap = {};
      for (const tbl of list) snap[tbl] = (db[tbl] || []).slice();
      await syncToIndexedDB(list, snap, all ? db.cierres : null);
    }
  } catch (err) {
    console.warn('Sync IndexedDB warning:', err);
  }
  syncing = false;
  if (dirty) kickSync();
}

// Inicialización segura contra pérdida de datos (Offline-First robusto)
async function initStorage() {
  if (!idb) {
    if (!hasLocalStorage) saveLocalOnly();
    return;
  }
  try {
    const userCount = await idb.users.count();
    if (!hasLocalStorage && userCount > 0) {
      // Caso crítico evitado: localStorage fue limpiado por el OS/navegador, pero IndexedDB aún conserva los datos reales
      for (const tbl of TABLES) {
        if (idb[tbl]) db[tbl] = await idb[tbl].toArray();
      }
      if (idb.metadata) {
        const c = await idb.metadata.get('cierres');
        if (c && c.value) db.cierres = c.value;
      }
      saveLocalOnly();
      render();
    } else if (hasLocalStorage) {
      dirty = true; dirtyAll = true; await kickSync();
    } else {
      saveLocalOnly();
      dirty = true; dirtyAll = true; await kickSync();
    }
  } catch (e) {
    console.warn('Init Storage error:', e);
  }
}

const save = (changed) => {
  saveLocalOnly();
  dirty = true;
  if (!changed) dirtyAll = true;
  else {
    dirtySet.add(changed);
    if (AUDIT_MODS.includes(changed)) dirtySet.add('auditoria');
  }
  kickSync();
};

window.__iglesiaFlushCloud = () => {
  if (window.Cloud) Cloud.flush().catch(() => { });
};
function cloudLabel() {
  if (!window.Cloud || !Cloud.enabled()) return 'Datos en este dispositivo';
  const s = Cloud.getStatus();
  if (s === 'ok') return 'Nube conectada';
  if (s === 'sync') return 'Sincronizando…';
  if (s === 'err') return 'Nube con error · copia local';
  return 'Nube lista';
}
function afterCloudWrite(key, row) {
  if (window.Cloud && me && me.cloud) Cloud.queueSave(key, row);
  if (key && AUDIT_MODS.includes(key) && db.auditoria.length) {
    const last = db.auditoria[db.auditoria.length - 1];
    if (window.Cloud && me && me.cloud) Cloud.queueSave('auditoria', last);
  }
}
function afterCloudDelete(key, id) {
  if (window.Cloud && me && me.cloud) Cloud.queueDelete(key, id);
}
function persistSessionStub() {
  if (!me) {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { }
    return;
  }
  // Nunca persistir el rol: solo identidad. El rol vive en memoria y se revalida.
  const stub = { id: me.id, user: me.user, name: me.name, cloud: !!me.cloud };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(stub)); } catch (e) { }
}

async function enterSession(userObj, opts) {
  me = userObj;
  if (me.cloud) {
    const checked = await Cloud.sessionFromServer();
    if (!checked.ok) {
      me = null;
      persistSessionStub();
      toast(checked.reason || 'No se pudo validar el rol en la nube');
      return go('home');
    }
    me = checked.me;
  } else {
    const local = (db.users || []).find(u => u.id === me.id);
    if (!local || !ROLES[local.role]) {
      me = null;
      persistSessionStub();
      toast('Sesión local inválida');
      return go('home');
    }
    me.role = local.role;
    me.name = local.name || me.name;
    me.user = local.user || me.user;
  }
  persistSessionStub();
  if (me.cloud && window.Cloud) {
    try {
      await Cloud.pullAll(db);
      TABLES.forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
      save();
      toast('Datos sincronizados con la nube');
    } catch (e) {
      toast('Sesión en la nube; no se pudo bajar el listado aún');
    }
  }
  if (me.role === 'tesorero') go('kpi');
  else if (me.role === 'secretario' || me.role === 'miembro') go('miembros');
  else go('home');
  if (opts && opts.warnPass && ROLES[me.role].users) toast('Actualice la contraseña en Usuarios y roles.');
}

initStorage();

/* ---------- roles ---------- */
const ROLES = {
  lider: { label: 'Líder / Administrador', view: ['fin', 'ecl'], edit: ['fin', 'ecl'], users: true },
  tesorero: { label: 'Tesorero', view: ['fin'], edit: ['fin'] },
  secretario: { label: 'Secretario', view: ['ecl'], edit: ['ecl'] },
  miembro: { label: 'Miembro', view: ['ecl'], edit: [] }
};
let me = null;
try {
  const stub = JSON.parse(sessionStorage.getItem(SESSION_KEY));
  if (stub && stub.id) me = Object.assign({ role: null }, stub);
} catch (e) { me = null; }

function activeRole() {
  if (!me) return null;
  if (me.cloud) return me.role && ROLES[me.role] ? me.role : null;
  const local = (db.users || []).find(u => u.id === me.id);
  if (!local || !ROLES[local.role]) return null;
  me.role = local.role;
  return me.role;
}
function roleInfo() {
  const r = activeRole();
  return r ? ROLES[r] : null;
}
const canView = a => !!(roleInfo() && roleInfo().view.includes(a));
const canEdit = a => !!(roleInfo() && roleInfo().edit.includes(a));
const canManageUsers = () => !!(roleInfo() && roleInfo().users);

async function revalidateAuthz() {
  if (!me) return false;
  if (me.cloud) {
    if (!window.Cloud || !Cloud.enabled()) return false;
    const checked = await Cloud.sessionFromServer();
    if (!checked.ok) {
      me = null;
      persistSessionStub();
      return false;
    }
    me = checked.me;
    persistSessionStub();
    return true;
  }
  return !!activeRole();
}

/* ---------- configuración de módulos financieros ---------- */
const OPS = ['Efectivo', 'Transferencia', 'Depósito', 'Yape/Plin'];
const MODS = {
  diezmos: {
    area: 'fin', title: 'Diezmos', icon: '🙏', date: 'fecha', total: 'precio', head: 'nombre',
    fields: [
      { k: 'concepto', l: 'Concepto', t: 'text', req: 1 }, { k: 'anexo', l: 'Anexo', t: 'text' },
      { k: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { k: 'nombre', l: 'Nombre', t: 'text', req: 1 },
      { k: 'tipoOp', l: 'Tipo de operación', t: 'select', o: OPS }, { k: 'numero', l: 'Número', t: 'text' },
      { k: 'precio', l: 'Precio (S/)', t: 'money', req: 1 }]
  },
  servicios: {
    area: 'fin', title: 'Servicios', icon: '💡', date: 'fecha', total: 'total', head: 'concepto',
    fields: [
      { k: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { k: 'concepto', l: 'Concepto', t: 'text', req: 1 },
      { k: 'tipo', l: 'Tipo', t: 'text' }, { k: 'descripcion', l: 'Descripción', t: 'textarea' },
      { k: 'operacion', l: 'Operación', t: 'select', o: OPS }, { k: 'transferencia', l: 'N° Transferencia', t: 'text' },
      { k: 'recibo', l: 'Recibo', t: 'text' }, { k: 'ruc', l: 'RUC', t: 'text' },
      { k: 'razon', l: 'Razón social', t: 'text' }, { k: 'comprobante', l: 'Comprobante', t: 'select', o: ['Boleta', 'Factura', 'Recibo', 'Otro'] },
      { k: 'total', l: 'Total (S/)', t: 'money', req: 1 }]
  },
  ingresos: {
    area: 'fin', title: 'Ingresos Varios', icon: '💰', date: 'fecha', total: 'total', head: 'concepto',
    fields: [
      { k: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { k: 'concepto', l: 'Concepto', t: 'text', req: 1 },
      { k: 'descripcion', l: 'Descripción', t: 'textarea' }, { k: 'tipoOp', l: 'Tipo de operación', t: 'select', o: OPS },
      { k: 'total', l: 'Total (S/)', t: 'money', req: 1 }]
  },
  remuneraciones: {
    area: 'fin', title: 'Remuneraciones', icon: '🧾', date: 'fecha', total: 'ofrenda', head: 'nombre',
    etapas: ['Pastor', 'EPAMI 1', 'EPAMI 2', 'EPAMI 3'],
    fields: [
      { k: 'etapa', l: 'Etapa', t: 'select', o: ['Pastor', 'EPAMI 1', 'EPAMI 2', 'EPAMI 3'], req: 1 },
      { k: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { k: 'nombre', l: 'Nombre', t: 'text', req: 1 },
      { k: 'cargo', l: 'Cargo', t: 'text' }, { k: 'recibo', l: 'Recibo', t: 'text' },
      { k: 'ofrenda', l: 'Ofrenda (S/)', t: 'money', req: 1 }]
  },
  cajachica: {
    area: 'fin', title: 'Caja Chica', icon: '🗃️', date: 'fecha', total: 'total', head: 'descripcion',
    fields: [
      { k: 'tipo', l: 'Tipo', t: 'select', o: ['Ingreso', 'Egreso'], req: 1 }, { k: 'fecha', l: 'Fecha', t: 'date', req: 1 },
      { k: 'descripcion', l: 'Descripción', t: 'textarea', req: 1 }, { k: 'comprobante', l: 'Comprobante', t: 'select', o: ['Boleta', 'Factura', 'Recibo', 'Sin comprobante'] },
      { k: 'ruc', l: 'RUC', t: 'text' }, { k: 'razon', l: 'Razón social', t: 'text' },
      { k: 'nroComp', l: 'N° de comprobante', t: 'text' }, { k: 'total', l: 'Total (S/)', t: 'money', req: 1 }]
  },
  agendas: {
    area: 'ecl', title: 'Agendas', icon: '📅', date: 'fecha', total: null, head: 'titulo',
    fields: [
      { k: 'titulo', l: 'Título', t: 'text', req: 1 },
      { k: 'fecha', l: 'Fecha', t: 'date', req: 1 },
      { k: 'hora', l: 'Hora', t: 'time' },
      { k: 'lugar', l: 'Lugar', t: 'text' },
      { k: 'tipo', l: 'Tipo', t: 'select', o: ['Culto', 'Reunión', 'Ensayo', 'Actividad', 'Pastoral', 'Otro'], req: 1 },
      { k: 'responsable', l: 'Responsable', t: 'text' },
      { k: 'estado', l: 'Estado', t: 'select', o: ['Programada', 'Confirmada', 'Realizada', 'Cancelada'], req: 1 },
      { k: 'notas', l: 'Notas', t: 'textarea' }]
  },
  presupuestos: {
    area: 'fin', title: 'Presupuestos', icon: '📒', date: 'periodo', total: 'asignado', head: 'concepto',
    fields: [
      { k: 'periodo', l: 'Periodo', t: 'month', req: 1 },
      { k: 'categoria', l: 'Categoría', t: 'select', o: ['Diezmos', 'Servicios', 'Remuneraciones', 'Caja chica', 'Ingresos varios', 'Otro'], req: 1 },
      { k: 'concepto', l: 'Concepto', t: 'text', req: 1 },
      { k: 'asignado', l: 'Asignado (S/)', t: 'money', req: 1 },
      { k: 'ejecutado', l: 'Ejecutado (S/)', t: 'money', req: 1 },
      { k: 'estado', l: 'Estado', t: 'select', o: ['Borrador', 'Asignado', 'Validado', 'Cerrado'], req: 1 },
      { k: 'responsable', l: 'Responsable', t: 'text' },
      { k: 'notas', l: 'Notas', t: 'textarea' }]
  }
};
MODS.diezmos.summary = rows => [['Diezmo de diezmos (10%)', rows.reduce((s, r) => s + (+r.precio || 0), 0) * 0.1]];
MODS.remuneraciones.summary = rows => MODS.remuneraciones.etapas.map(e => [e, rows.filter(r => r.etapa === e).reduce((s, r) => s + (+r.ofrenda || 0), 0)]);
MODS.cajachica.summary = rows => {
  const i = rows.filter(r => r.tipo === 'Ingreso').reduce((s, r) => s + (+r.total || 0), 0);
  const e = rows.filter(r => r.tipo === 'Egreso').reduce((s, r) => s + (+r.total || 0), 0);
  return [['Ingresos', i], ['Egresos', e], ['Saldo', i - e]];
};
MODS.cajachica.totalOf = rows => MODS.cajachica.summary(rows)[2][1];
MODS.agendas.summary = rows => ['Programada', 'Confirmada', 'Realizada', 'Cancelada'].map(e => [e, rows.filter(r => r.estado === e).length, true]);
MODS.presupuestos.summary = rows => {
  const a = rows.reduce((s, r) => s + (+r.asignado || 0), 0);
  const e = rows.reduce((s, r) => s + (+r.ejecutado || 0), 0);
  return [['Asignado', a], ['Ejecutado', e], ['Disponible', a - e]];
};
MODS.presupuestos.totalOf = rows => rows.reduce((s, r) => s + (+r.asignado || 0), 0);

const MEMBER_FIELDS = [
  { k: 'nombre', l: 'Nombres y apellidos', t: 'text', req: 1 }, { k: 'dni', l: 'DNI', t: 'text' },
  { k: 'telefono', l: 'Teléfono', t: 'text' }, { k: 'nacimiento', l: 'Fecha de nacimiento', t: 'date' },
  { k: 'cargo', l: 'Cargo / Rol', t: 'select', o: ['Miembro', 'Líder', 'EPAMI', 'Diácono', 'Pastor', 'Otro'] },
  { k: 'estado', l: 'Estado', t: 'select', o: ['Activo', 'Inactivo'] },
  { k: 'bautizado', l: '¿Bautizado?', t: 'select', o: ['No', 'Sí'] },
  { k: 'fechaBautizo', l: 'Fecha de bautizo', t: 'date' }
];

/* ---------- estado de navegación ---------- */
const S = { view: 'home', param: null, month: monthNow(), etapa: '', q: '', period: 'all', title: '', flt: {} };
function go(view, param = null, reset = true) {
  const prev = S.view; S.view = view; S.param = param;
  if (reset) { S.q = ''; S.etapa = ''; S.flt = {}; if (!/^mod:/.test(view)) S.month = S.month; }
  window.scrollTo(0, 0);
  if (me && prev !== view && document.querySelector('#app .main')) {
    clearTimeout(go.t); const m = document.querySelector('.main');
    m.querySelector('.content')?.remove();
    m.insertAdjacentHTML('beforeend', '<div class="content"><div class="sk h1"></div><div class="sk-row"><div class="sk h2"></div><div class="sk h2"></div><div class="sk h2"></div></div><div class="sk h3"></div></div>');
    go.t = setTimeout(render, 220);
  } else render();
}
let currentSpec = null;

/* ---------- reloj ---------- */
function tickClock() {
  if (document.hidden) return;
  const n = new Date();
  document.querySelectorAll('.clk-t').forEach(e => e.textContent = n.toLocaleTimeString('es-PE', { timeZone: TZ, hour12: true }));
  document.querySelectorAll('.clk-d').forEach(e => { const s = n.toLocaleDateString('es-PE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); e.textContent = s.charAt(0).toUpperCase() + s.slice(1); });
}
setInterval(tickClock, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tickClock(); });

/* ---------- iconos ---------- */
const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  cash: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  drop: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  xls: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  wallet: '<path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>'
};
const I = n => `<svg class="ic" viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;

/* ---------- navegación lateral ---------- */
const NAV = [
  { g: 'Control ejecutivo', items: [{ v: 'kpi', t: 'Tablero ejecutivo', i: 'chart', a: 'fin', tag: 'EJEC', c: '#b08948', d: 'Indicadores y cierre' }] },
  { g: 'Operación', items: [
    { v: 'mod:agendas', t: 'Agendas', i: 'cal', a: 'ecl', c: '#8c5a3c', d: 'Cultos, reuniones y actividades' },
    { v: 'mod:presupuestos', t: 'Presupuestos', i: 'wallet', a: 'fin', c: '#b08948', d: 'Asignación y validación' },
    { v: 'auditoria', t: 'Auditoría', i: 'shield', a: 'fin', c: '#9b3a3a', d: 'Historial de caja y presupuestos' }]
  },
  {
    g: 'Finanzas', items: [
      { v: 'mod:diezmos', t: 'Diezmos', i: 'cash', a: 'fin', c: '#6e3b2e', d: 'Registro de diezmos' },
      { v: 'd10', t: 'Diezmo de Diezmos', i: 'percent', a: 'fin', c: '#8c5a3c', d: '10% y resumen general' },
      { v: 'mod:servicios', t: 'Servicios', i: 'zap', a: 'fin', c: '#e8833a', d: 'Egresos por servicios' },
      { v: 'mod:ingresos', t: 'Ingresos Varios', i: 'trend', a: 'fin', c: '#16a06b', d: 'Otros ingresos' },
      { v: 'mod:remuneraciones', t: 'Remuneraciones', i: 'file', a: 'fin', c: '#8d5a3c', d: 'Pastor y EPAMI 1-3' },
      { v: 'mod:cajachica', t: 'Caja Chica', i: 'brief', a: 'fin', c: '#d64545', d: 'Ingresos y egresos' }]
  },
  {
    g: 'Eclesiástico', items: [
      { v: 'miembros', t: 'Miembros', i: 'users', a: 'ecl', c: '#6e3b2e', d: 'Registro total' },
      { v: 'bautizados', t: 'Bautizados', i: 'drop', a: 'ecl', c: '#3f6f8f', d: 'Control de bautizos' },
      { v: 'santacena', t: 'Santa Cena', i: 'heart', a: 'ecl', c: '#d64545', d: 'Asistencia' },
      { v: 'sccount', t: 'Conteo Santa Cena', i: 'list', a: 'ecl', c: '#16a06b', d: 'Veces por miembro' }]
  },
  { g: 'Administración', items: [
    { v: 'users', t: 'Usuarios y roles', i: 'shield', u: 1, c: '#6b7a90', d: 'Accesos' },
    { v: 'backup', t: 'Copia de seguridad', i: 'dl', u: 1, c: '#16a06b', d: 'Exportar y restaurar datos' }
  ] }
];
const navAllowed = it => it.u ? canManageUsers() : canView(it.a);
function navActive(v) { return S.view === v || (S.view === 'sc' && v === 'santacena'); }

function shell(inner) {
  const v = getDailyVerse();
  const nav = `<button class="${S.view === 'home' ? 'on' : ''}" data-go="home" aria-label="Ir a Inicio">${I('home')} Inicio</button>` +
    NAV.map(g => { const its = g.items.filter(navAllowed); if (!its.length) return ''; return `<h6>${g.g}</h6>` + its.map(it => `<button class="${navActive(it.v) ? 'on' : ''}" data-go="${it.v}" aria-label="${it.t}">${I(it.i)} ${it.t}${it.tag ? `<span class="tag">${it.tag}</span>` : ''}</button>`).join(''); }).join('');
  return `<aside class="side" id="side" role="navigation" aria-label="Menú principal"><div class="brand"><div class="lg-b"><img src="logo.jpg" alt="Logo oficial de la iglesia"></div>
    <div><b>Casa de Oración para Todas las Naciones</b><small>VISIÓN · ${PLACE.toUpperCase()}</small></div></div>
    <nav class="nav">${nav}</nav>
    <div class="sfoot"><div class="av">${esc(me.name.slice(0, 1).toUpperCase())}</div><div><b>${esc(me.name)}</b><small>${esc((roleInfo() && roleInfo().label) || '')}</small></div>
    <button data-act="logout" title="Cerrar sesión" aria-label="Cerrar sesión">${I('logout')}</button></div></aside>
    <div class="scrim hidden" id="scrim" data-act="menu" aria-hidden="true"></div>
    <main class="main" role="main"><header class="topbar"><button class="burger" data-act="menu" aria-label="Abrir menú de navegación">${I('menu')}</button>
      <div class="grow"><h2>${esc(S.title || '')}</h2><small><span class="clk-d"></span> · <span class="clk-t"></span></small></div>
      <div class="topbar-verse" title="${esc(v.t)} — ${esc(v.r)}"><em>«${esc(v.t)}»</em><span>— ${esc(v.r)}</span></div>
      <button class="btn sm gray theme-btn" data-act="theme" aria-label="Cambiar tema">${currentTheme() === 'dark' ? 'Claro' : 'Oscuro'}</button>
      <button class="btn sm gold" data-act="install" aria-label="Instalar aplicación">Instalar</button>
      <span class="pill" aria-label="Estado de datos">${I('shield')} ${esc(cloudLabel())}</span></header>
    ${inner}</main>`;
}

/* ---------- render principal ---------- */
function render() {
  const app = $('#app');
  if (!me) {
    if (needsSetup() && !isCloudProductionHost()) {
      app.innerHTML = setupHtml();
      bindSetup();
    } else {
      app.innerHTML = loginHtml();
      bindLogin();
    }
    tickClock();
    paintInstallBanner();
    return;
  }
  const v = S.view;
  let html;
  if (v === 'home') html = homeHtml();
  else if (v.startsWith('mod:')) html = moduleHtml(v.slice(4));
  else if (v === 'miembros') html = membersHtml(false);
  else if (v === 'bautizados') html = membersHtml(true);
  else if (v === 'santacena') html = santaListHtml();
  else if (v === 'sc') html = santaDetailHtml();
  else if (v === 'sccount') html = santaCountHtml();
  else if (v === 'users') html = usersHtml();
  else if (v === 'backup') html = backupHtml();
  else if (v === 'd10') html = d10Html();
  else if (v === 'kpi') html = kpiHtml();
  else if (v === 'auditoria') html = auditoriaHtml();
  app.innerHTML = shell(html);
  if (me) refreshCurrent();
  tickClock();
  paintInstallBanner();
}

function header(title) { S.title = title; return ''; }
const footPhrase = () => `<div class="foot-phrase">${PHRASE}</div>`;

/* ---------- login ---------- */
function loginHtml() {
  const v = getDailyVerse();
  return `<div class="lg"><div class="lg-hero">
      <div class="lg-logo"><img src="logo.jpg" alt="Logo de la iglesia"></div>
      <h1>${CHURCH}</h1><h2>${PLACE}</h2>
      <div class="lg-phrase">“${PHRASE}”</div>
      <div class="lg-verse" role="note" aria-label="Versículo del día">
        <p>«${esc(v.t)}»</p>
        <small>— ${esc(v.r)}</small>
      </div>
      <div class="lg-clock"><div class="t clk-t"></div><div class="d clk-d"></div></div></div>
    <div class="lg-form"><div class="lg-card"><div class="bar" style="justify-content:flex-end;margin:0 0 8px"><button type="button" class="btn sm gray theme-btn" data-act="theme" aria-label="Cambiar tema">${currentTheme() === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button></div>
      <h3>Bienvenido</h3><p>Acceso exclusivo para miembros y líderes de la iglesia.</p>
      <form id="loginForm" autocomplete="username">
        <label for="lu">Usuario</label><div class="field">${I('user')}<input id="lu" name="username" autocapitalize="none" autocomplete="username" placeholder="Ingrese su usuario" required></div>
        <label for="lp">Contraseña</label><div class="field">${I('lock')}<input id="lp" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
        <div class="err" id="lerr" role="alert"></div>
        <button class="btn full" type="submit">Ingresar al sistema</button>
      </form>
      <p style="margin-top:14px;font-size:.82rem;color:var(--mu)">En el móvil: use <b>Instalar app</b> (banner inferior) o “Añadir a pantalla de inicio”.</p>
      ${isCloudProductionHost() ? '<p style="margin-top:8px;font-size:.8rem;color:var(--mu)">Entorno publicado: acceso solo con cuenta Supabase (rol desde la nube).</p>' : ''}
      <div class="lg-foot">Sistema de gestión financiera y eclesiástica<br>© ${new Date().getFullYear()} · ${PLACE}</div></div></div></div>`;
}
function setupHtml() {
  return `<div class="lg"><div class="lg-hero">
      <div class="lg-logo"><img src="logo.jpg" alt="Logo de la iglesia"></div>
      <h1>${CHURCH}</h1><h2>${PLACE}</h2>
      <div class="lg-phrase">“${PHRASE}”</div>
      <div class="lg-clock"><div class="t clk-t"></div><div class="d clk-d"></div></div></div>
    <div class="lg-form"><div class="lg-card setup-card">
      <div class="bar" style="justify-content:flex-end;margin:0 0 8px"><button type="button" class="btn sm gray theme-btn" data-act="theme" aria-label="Cambiar tema">${currentTheme() === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button></div>
      <h3>Configuración inicial</h3>
      <p>Cree la cuenta del líder. No hay contraseñas por defecto en el sistema.</p>
      <form id="setupForm" autocomplete="off">
        <label for="su">Usuario administrador</label><div class="field">${I('user')}<input id="su" required autocapitalize="none" placeholder="ej. pastor"></div>
        <label for="sn">Nombre visible</label><div class="field">${I('users')}<input id="sn" required placeholder="Pastor"></div>
        <label for="sp">Contraseña (mín. 8)</label><div class="field">${I('lock')}<input id="sp" type="password" minlength="8" required autocomplete="new-password"></div>
        <label for="sp2">Confirmar contraseña</label><div class="field">${I('lock')}<input id="sp2" type="password" minlength="8" required autocomplete="new-password"></div>
        <div class="err" id="serr" role="alert"></div>
        <button class="btn full" type="submit">Crear acceso e ingresar</button>
      </form>
      <div class="lg-foot">Los datos quedan en este dispositivo · puede instalar la PWA</div>
    </div></div></div>`;
}
function bindSetup() {
  const form = $('#setupForm');
  if (!form) return;
  form.onsubmit = async e => {
    e.preventDefault();
    const user = $('#su').value.trim().toLowerCase();
    const name = $('#sn').value.trim();
    const pass = $('#sp').value;
    const pass2 = $('#sp2').value;
    const err = $('#serr');
    err.textContent = '';
    if (pass.length < 8) { err.textContent = 'La contraseña debe tener al menos 8 caracteres'; return; }
    if (pass !== pass2) { err.textContent = 'Las contraseñas no coinciden'; return; }
    if (!user || !name) { err.textContent = 'Complete usuario y nombre'; return; }
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }
    try {
      const hp = await hashPassword(pass);
      const row = { id: uid(), user, name, role: 'lider', pass: hp.pass, salt: hp.salt };
      db.users = [row];
      save('users');
      await enterSession({ id: row.id, user: row.user, name: row.name, role: row.role, cloud: false }, {});
      toast('Cuenta creada. Ya puede instalar la app en su móvil.');
    } catch (ex) {
      err.textContent = 'No se pudo crear la cuenta';
      console.error(ex);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Crear acceso e ingresar'; }
    }
  };
}
function isCloudProductionHost() {
  const h = (location.hostname || '').toLowerCase();
  if (!h || h === 'localhost' || h === '127.0.0.1') return false;
  return (
    /\.pages\.dev$/i.test(h)
    || /\.apps\.grok\.bot$/i.test(h)
    || /\.cursor\.apps$/i.test(h)
    || /\.github\.io$/i.test(h)
    || h === 'casa-oracion-challhuahuacho.pages.dev'
    || h === 'casa-oracion.apps.grok.bot'
  );
}
function isLocalDevHost() {
  const h = (location.hostname || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '';
}
function needsSetup() {
  return !me && Array.isArray(db.users) && db.users.length === 0;
}
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('iglesia_theme_v1', t); } catch (e) { }
  const meta = document.getElementById('metaTheme');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#12100e' : '#1a140f');
}
function toggleTheme() {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  render();
}
function bindLogin() {
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const user = $('#lu').value.trim().toLowerCase();
    const pass = $('#lp').value;
    const btn = e.target.querySelector('button[type="submit"]');
    const err = $('#lerr');
    err.textContent = '';
    if (!user || !pass) { err.textContent = 'Ingrese usuario y contraseña'; return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Ingresando…'; }
    try {
      const cloudReady = window.Cloud && Cloud.enabled();
      const prod = isCloudProductionHost();
      if (cloudReady && (prod || navigator.onLine !== false)) {
        if (window.Cloud.refreshIfNeeded) await Cloud.refreshIfNeeded();
        const cloud = await Cloud.login(user, pass);
        if (cloud.ok) {
          await enterSession(cloud.me, {});
          return;
        }
        if (prod) {
          err.textContent = cloud.reason && cloud.reason !== 'auth'
            ? String(cloud.reason)
            : 'Credenciales inválidas o sin perfil en la nube';
          return;
        }
      }
      if (prod) {
        err.textContent = cloudReady
          ? 'No se pudo conectar con la nube'
          : 'Esta publicación solo acepta acceso en la nube';
        return;
      }
      const u = db.users.find(x => x.user === user);
      if (!u || !(await verifyPassword(u, pass))) {
        err.textContent = db.users.length ? 'Usuario o contraseña incorrectos' : 'No hay usuarios. Recargue para configurar el acceso inicial.';
        return;
      }
      const legacy = !u.salt;
      if (legacy) {
        const hp = await hashPassword(pass);
        u.pass = hp.pass; u.salt = hp.salt; save('users');
      }
      await enterSession({ id: u.id, user: u.user, name: u.name, role: u.role, cloud: false }, { warnPass: legacy });
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Ingresar al sistema'; }
    }
  };
}

/* ---------- cálculos financieros ---------- */
function rng(p) {
  const t = todayStr();
  if (p === 'month') return d => (d || '').startsWith(monthNow());
  if (p === '30') { const c = new Date(Date.now() - 30 * 864e5).toLocaleDateString('en-CA', { timeZone: TZ }); return d => (d || '') >= c && (d || '') <= t; }
  if (/^\d{4}-\d\d$/.test(p)) return d => (d || '').startsWith(p);
  return () => true;
}
function plabel(p) { return p === 'month' ? 'Este mes' : p === '30' ? 'Últimos 30 días' : /^\d{4}-\d\d$/.test(p) ? monthLabel(p) : 'Acumulado total'; }
function totals(pred) {
  const sm = (k, f, fl) => db[k].filter(r => pred(r.fecha) && (!fl || fl(r))).reduce((s, r) => s + (+r[f] || 0), 0);
  const diez = sm('diezmos', 'precio'), ingV = sm('ingresos', 'total'), serv = sm('servicios', 'total');
  const rem = {}; MODS.remuneraciones.etapas.forEach(e => rem[e] = sm('remuneraciones', 'ofrenda', r => r.etapa === e));
  const remT = Object.values(rem).reduce((a, b) => a + b, 0);
  const ccI = sm('cajachica', 'total', r => r.tipo === 'Ingreso'), ccE = sm('cajachica', 'total', r => r.tipo === 'Egreso');
  const d10 = diez * 0.1, ingresos = diez + ingV + ccI, egresos = serv + remT + ccE + d10;
  return { diez, ingV, serv, rem, remT, ccI, ccE, d10, ingresos, egresos, saldo: ingresos - egresos };
}
const monthsBack = n => { const [y, m] = monthNow().split('-').map(Number); const a = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); a.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); } return a; };
const shortMonth = m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''); };

/* ---------- gráficos SVG ---------- */
const niceStep = x => { const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
function barChart(labels, series, pre = 'S/ ') {
  const W = 560, H = 250, L = 62, B = 30, T = 12, R = 10, pw = W - L - R, ph = H - T - B;
  let max = Math.max(0, ...series.flatMap(s => s.data)); const empty = max === 0; if (empty) max = pre ? 1 : 4;
  const step = pre ? niceStep(max / 4) : Math.max(1, niceStep(max / 4)), top = step * 4; let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = T + ph - ph * i / 4, v = step * i;
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#e5eaf1"/><text x="${L - 8}" y="${y + 4}" font-size="11" fill="#6b7a90" text-anchor="end">${pre}${v < 1 && v > 0 ? v.toFixed(2) : v.toLocaleString('es-PE')}</text>`;
  }
  const n = labels.length, gw = pw / n, bw = Math.min(34, gw / (series.length + 1));
  labels.forEach((lb, i) => {
    const cx = L + gw * i + gw / 2;
    series.forEach((s, j) => {
      const h = ph * s.data[i] / top, x = cx - (series.length * bw) / 2 + j * bw;
      if (h > 0) g += `<rect x="${x + 1}" y="${T + ph - h}" width="${bw - 2}" height="${h}" rx="4" fill="${s.color}"><title>${s.name}: ${pre ? money(s.data[i]) : s.data[i]}</title></rect>`;
    });
    g += `<text x="${cx}" y="${H - 10}" font-size="11" fill="#6b7a90" text-anchor="middle">${esc(lb)}</text>`;
  });
  if (empty) g += `<text x="${L + pw / 2}" y="${T + ph / 2}" font-size="13" fill="#8a97aa" text-anchor="middle">Sin datos en el periodo</text>`;
  const lg = series.length > 1 || series[0].name ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>${lg}`;
}
function donut(items, centerTxt, isMoney = true) {
  const tot = items.reduce((s, x) => s + x.v, 0), R = 70, C = 2 * Math.PI * R; let off = 0, arcs = '';
  if (tot === 0) arcs = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="#dfe6ef" stroke-width="30"/>`;
  else items.forEach(x => { const len = C * x.v / tot; if (len > 0) arcs += `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${x.c}" stroke-width="30" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"><title>${esc(x.l)}</title></circle>`; off += len; });
  const fm = v => isMoney ? money(v) : v;
  return `<div class="donut"><svg viewBox="0 0 200 200" width="170" height="170">${arcs}
    <text x="100" y="97" text-anchor="middle" font-size="11" fill="#6b7a90">${esc(centerTxt)}</text><text x="100" y="116" text-anchor="middle" font-size="15" font-weight="700" fill="#14213a">${tot === 0 ? 'Sin datos' : fm(tot)}</text></svg>
    <div class="legend" style="flex-direction:column">${items.map(x => `<span><i style="background:${x.c}"></i>${esc(x.l)}: <b>${fm(x.v)}</b>${tot ? ' (' + Math.round(100 * x.v / tot) + '%)' : ''}</span>`).join('')}</div></div>`;
}
const kpiCard = (lab, val, sub, ico, c) => `<div class="kpi" style="--c:${c}"><div class="ki">${I(ico)}</div><small>${lab}</small><b>${val}</b><span>${sub}</span></div>`;

/* ---------- inicio ---------- */
function homeHtml() {
  header('Panel de inicio');
  const fin = canView('fin'), T = totals(rng('month'));
  const tile = it => `<button class="tile" style="--c:${it.c}" data-go="${it.v}"><span class="ti">${I(it.i)}</span><b>${it.t}</b><small>${it.d}</small></button>`;
  return `<div class="content">
    <div class="hero"><div><div class="q">“${PHRASE}”</div><small>Bienvenido(a), <b>${esc(me.name)}</b> · ${esc((roleInfo() && roleInfo().label) || '')}</small></div>
      <div class="hb">${fin ? `<button class="btn gold" data-go="kpi">${I('chart')} Ver KPIs ejecutivos</button>` : ''}</div></div>
    ${fin ? `<div class="sec">Resumen de ${esc(monthLabel(monthNow()))}</div><div class="kpis">
      ${kpiCard('Diezmos del mes', money(T.diez), '10% a remitir: ' + money(T.d10), 'cash', '#6e3b2e')}
      ${kpiCard('Ingresos totales', money(T.ingresos), 'Diezmos + varios + caja', 'trend', '#16a06b')}
      ${kpiCard('Egresos totales', money(T.egresos), 'Incluye diezmo de diezmos', 'wallet', '#e8833a')}
      ${kpiCard('Saldo neto', money(T.saldo), T.saldo >= 0 ? 'Superávit' : 'Déficit', 'chart', T.saldo >= 0 ? '#16a06b' : '#d64545')}</div>` : ''}
    ${NAV.map(g => { const its = g.items.filter(navAllowed); return its.length ? `<div class="sec">${g.g}</div><div class="tiles">${its.map(tile).join('')}</div>` : ''; }).join('')}
    ${footPhrase()}</div>`;
}

/* ---------- Diezmo de diezmos (10%) y resumen general ---------- */
function d10Data() {
  const T = totals(rng(S.month || 'all'));
  const L = [
    { g: 'Ingresos', c: 'Diezmos recaudados', m: T.diez }, { g: 'Ingresos', c: 'Ingresos varios', m: T.ingV }, { g: 'Ingresos', c: 'Caja chica - ingresos', m: T.ccI },
    { g: 'Egresos', c: 'Servicios (egresos)', m: T.serv },
    ...MODS.remuneraciones.etapas.map(e => ({ g: 'Egresos', c: 'Remuneraciones - ' + e, m: T.rem[e] })),
    { g: 'Egresos', c: 'Caja chica - egresos', m: T.ccE },
    { g: 'Diezmo de diezmos', c: '10% sobre diezmos recaudados (a remitir)', m: T.d10 }];
  return { T, L };
}
function d10Html() {
  if (!canView('fin')) return header('Acceso') + '<div class="content empty">Sin acceso</div>';
  header('Diezmo de Diezmos (10%)'); currentSpec = () => d10Spec();
  return `<div class="content"><div class="bar"><input type="month" id="fm" value="${S.month}"><button class="btn sm gray" data-act="allmonths">Ver todo</button>
    <span style="flex:1"></span><button class="btn sm" data-act="pdf">${I('dl')} PDF</button><button class="btn sm alt" data-act="xls">${I('xls')} Excel</button></div>
    <div id="d10"></div>${footPhrase()}</div>`;
}
function refreshD10() {
  const { T, L } = d10Data(); let h = '';
  ['Ingresos', 'Egresos', 'Diezmo de diezmos'].forEach(g => {
    const rows = L.filter(x => x.g === g), sub = rows.reduce((s, x) => s + x.m, 0);
    h += `<tr class="sec"><td colspan="2">${g === 'Ingresos' ? 'Resumen de ingresos (diezmos, ingresos varios y caja chica)' : g === 'Egresos' ? 'Resumen de egresos (servicios, remuneraciones y caja chica)' : 'Diezmo de diezmos - 10% automático'}</td></tr>` +
      rows.map(x => `<tr><td>${esc(x.c)}</td><td class="n">${money(x.m)}</td></tr>`).join('') + `<tr><td><b>Subtotal</b></td><td class="n"><b>${money(sub)}</b></td></tr>`;
  });
  h += `<tr class="tot"><td>SALDO NETO (ingresos − egresos − 10%)</td><td class="n">${money(T.saldo)}</td></tr>`;
  $('#d10').innerHTML = `<div class="kpis">${kpiCard('Diezmos recaudados', money(T.diez), esc(monthLabel(S.month)), 'cash', '#6e3b2e')}
    ${kpiCard('10% a remitir', money(T.d10), 'Cálculo automático', 'percent', '#8c5a3c')}
    ${kpiCard('Total ingresos', money(T.ingresos), 'Diezmos + varios + caja', 'trend', '#16a06b')}
    ${kpiCard('Total egresos', money(T.egresos), 'Incluye el 10%', 'wallet', '#e8833a')}
    ${kpiCard('Saldo neto', money(T.saldo), T.saldo >= 0 ? 'Superávit' : 'Déficit', 'chart', T.saldo >= 0 ? '#16a06b' : '#d64545')}</div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Concepto</th><th class="n">Monto</th></tr></thead><tbody>${h}</tbody></table></div>`;
}
function d10Spec() {
  const { T, L } = d10Data();
  return {
    name: 'DiezmoDeDiezmos', title: 'Diezmo de Diezmos (10%) y Resumen General', subtitle: monthLabel(S.month),
    cols: [{ h: 'Rubro', k: 'g' }, { h: 'Concepto', k: 'c' }, { h: 'Monto', k: 'm', num: true }], rows: L,
    total: { label: 'SALDO NETO', value: T.saldo, col: 2 },
    summary: [['Total ingresos', T.ingresos], ['Total egresos (incluye 10%)', T.egresos], ['10% de diezmos a remitir', T.d10]]
  };
}

/* ---------- KPIs Power BI & Procesos ---------- */
const CIERRE = ['Diezmos registrados y conciliados', 'Servicios y comprobantes verificados', 'Remuneraciones pagadas (Pastor y EPAMI 1, 2 y 3)', 'Caja chica arqueada', 'Diezmo de diezmos remitido', 'Informe mensual entregado'];
function cierreDone() { const c = (db.cierres || {})[monthNow()] || {}; return CIERRE.filter((_, i) => c[i]).length; }
function procesos(pred) {
  const st = (n, w = 3) => n === 0 ? 'ok' : n <= w ? 'warn' : 'bad';
  const sv = db.servicios.filter(r => pred(r.fecha) && (!r.comprobante || !r.ruc)).length;
  const cc = db.cajachica.filter(r => pred(r.fecha) && r.tipo === 'Egreso' && (!r.comprobante || r.comprobante === 'Sin comprobante')).length;
  const rm = db.remuneraciones.filter(r => pred(r.fecha) && !r.recibo).length;
  const mb = db.members.filter(m => !m.dni || !m.telefono).length;
  const last = db.santacena.map(s => s.fecha).sort().pop();
  const days = last ? Math.floor((new Date(todayStr()) - new Date(last)) / 864e5) : null;
  const pc = Math.round(100 * cierreDone() / CIERRE.length);
  return [
    { t: 'Servicios sin comprobante o RUC', s: 'Control documentario', val: sv, st: st(sv) },
    { t: 'Egresos de caja chica sin comprobante', s: 'Sustento de gastos', val: cc, st: st(cc) },
    { t: 'Remuneraciones sin recibo', s: 'Respaldo de pagos', val: rm, st: st(rm) },
    { t: 'Miembros con datos incompletos', s: 'Sin DNI o teléfono', val: mb, st: st(mb, 5) },
    { t: 'Días desde la última Santa Cena', s: last ? 'Última: ' + fmtDate(last) : 'Sin registros', val: days === null ? 'N/D' : days, st: days === null ? 'bad' : days <= 35 ? 'ok' : days <= 60 ? 'warn' : 'bad' },
    { t: 'Cierre mensual (' + monthLabel(monthNow()) + ')', s: cierreDone() + ' de ' + CIERRE.length + ' pasos', val: pc + '%', st: pc >= 100 ? 'ok' : pc >= 50 ? 'warn' : 'bad' }];
}
function kpiData() {
  const P = S.period || 'all', pred = rng(P), T = totals(pred), pr = procesos(pred);
  const act = db.members.filter(m => m.estado === 'Activo').length, bap = db.members.filter(m => m.bautizado === 'Sí').length;
  const att = db.santacena.map(s => s.asistentes.length), avg = att.length ? Math.round(att.reduce((a, b) => a + b, 0) / att.length) : 0;
  return { P, T, pr, act, bap, avg };
}
function kpiHtml() {
  if (!canView('fin')) return header('Acceso') + '<div class="content empty">Sin acceso</div>';
  header('Tablero de Control Ejecutivo · KPIs Power BI & Procesos'); currentSpec = () => kpiSpec();
  const { P, T, pr, act, bap, avg } = kpiData(), ok = pr.filter(x => x.st === 'ok').length;
  const months = monthsBack(6), mt = months.map(m => totals(rng(m)));
  const sc = db.santacena.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-8);
  const cc = (db.cierres || {})[monthNow()] || {}, ed = canEdit('fin');
  const pct = Math.round(100 * cierreDone() / CIERRE.length);
  return `<div class="content">
    <div class="hero"><div><div class="q">“${PHRASE}”</div><small>Tablero de control operativo y KPIs · ${PLACE} · ${esc(plabel(P))}</small></div>
      <div class="hb"><button class="btn gold" data-act="pdf">${I('dl')} Informe KPIs PDF</button><button class="btn ghost" data-act="xls">${I('xls')} Excel</button></div></div>
    <div class="filters"><span class="lb">${I('filter')} Período de análisis</span><div class="chips">
      ${[['all', 'Acumulado total'], ['month', 'Este mes'], ['30', 'Últimos 30 días']].map(([v, l]) => `<button class="chip ${P === v ? 'on' : ''}" data-period="${v}">${l}</button>`).join('')}</div>
      <span class="lb">${I('cal')} Mes</span><input type="month" id="kpm" style="width:auto" value="${/^\d{4}-\d\d$/.test(P) ? P : ''}"></div>
    <div class="kpis">
      ${kpiCard('Saldo neto', money(T.saldo), T.saldo >= 0 ? 'Superávit del período' : 'Déficit del período', 'wallet', T.saldo >= 0 ? '#16a06b' : '#d64545')}
      ${kpiCard('Diezmos recaudados', money(T.diez), '10% a remitir: ' + money(T.d10), 'cash', '#6e3b2e')}
      ${kpiCard('Ingresos totales', money(T.ingresos), 'Diezmos + varios + caja', 'trend', '#16a06b')}
      ${kpiCard('Egresos totales', money(T.egresos), 'Servicios, remun., caja, 10%', 'zap', '#e8833a')}
      ${kpiCard('Miembros activos', act, `${bap} bautizados (${db.members.length ? Math.round(100 * bap / db.members.length) : 0}%)`, 'users', '#8c5a3c')}
      ${kpiCard('Asistencia Santa Cena', avg, 'Promedio · ' + db.santacena.length + ' celebraciones', 'heart', '#d64545')}</div>
    <div class="grid2">
      <div class="panel"><span class="tg">FLUJO</span><h3>Ingresos vs egresos mensuales</h3><div class="sb">Últimos 6 meses</div>
        ${barChart(months.map(shortMonth), [{ name: 'Ingresos', color: '#16a06b', data: mt.map(x => x.ingresos) }, { name: 'Egresos', color: '#e8833a', data: mt.map(x => x.egresos) }])}</div>
      <div class="panel"><span class="tg">INGRESOS</span><h3>Distribución de ingresos</h3><div class="sb">${esc(plabel(P))}</div>
        ${donut([{ l: 'Diezmos', v: T.diez, c: '#6e3b2e' }, { l: 'Ingresos varios', v: T.ingV, c: '#16a06b' }, { l: 'Caja chica', v: T.ccI, c: '#d9a233' }], 'Ingresos')}</div>
      <div class="panel"><span class="tg">EGRESOS</span><h3>Distribución de egresos</h3><div class="sb">${esc(plabel(P))}</div>
        ${donut([{ l: 'Servicios', v: T.serv, c: '#e8833a' }, { l: 'Remuneraciones', v: T.remT, c: '#8d5a3c' }, { l: 'Caja chica', v: T.ccE, c: '#d64545' }, { l: 'Diezmo 10%', v: T.d10, c: '#8c5a3c' }], 'Egresos')}</div>
      <div class="panel"><span class="tg">REMUNERACIONES</span><h3>Remuneraciones por etapa</h3><div class="sb">Pastor y EPAMI 1, 2 y 3</div>
        ${barChart(MODS.remuneraciones.etapas, [{ name: '', color: '#8d5a3c', data: MODS.remuneraciones.etapas.map(e => T.rem[e]) }])}</div>
      <div class="panel"><span class="tg">ECLESIÁSTICO</span><h3>Bautizados vs no bautizados</h3><div class="sb">Total de miembros: ${db.members.length}</div>
        ${donut([{ l: 'Bautizados', v: bap, c: '#3f6f8f' }, { l: 'No bautizados', v: db.members.length - bap, c: '#d9a233' }], 'Miembros', false)}</div>
      <div class="panel"><span class="tg">SANTA CENA</span><h3>Asistencia a Santa Cena</h3><div class="sb">Últimas ${sc.length || 8} celebraciones</div>
        ${barChart(sc.map(s => fmtDate(s.fecha).slice(0, 5)), [{ name: '', color: '#d64545', data: sc.map(s => s.asistentes.length) }], '')}</div>
    </div>
    <div class="sec">Control de procesos</div>
    <div class="grid2">
      <div class="panel"><span class="tg">${ok}/${pr.length} OK</span><h3>Semáforo de procesos</h3><div class="sb">Cumplimiento y calidad de la información</div>
        ${pr.map(x => `<div class="proc"><span class="dot ${x.st}"></span><div>${esc(x.t)}<small>${esc(x.s)}</small></div><b>${x.val}</b></div>`).join('')}</div>
      <div class="panel"><span class="tg">${pct}%</span><h3>Cierre mensual · ${esc(monthLabel(monthNow()))}</h3><div class="sb">Lista de verificación del proceso</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        ${CIERRE.map((c, i) => `<label class="check"><input type="checkbox" data-cierre="${i}" ${cc[i] ? 'checked' : ''} ${ed ? '' : 'disabled'}>${esc(c)}</label>`).join('')}</div>
    </div>${footPhrase()}</div>`;
}
function kpiSpec() {
  const { P, T, pr, act, bap, avg } = kpiData(), m = money;
  const row = (i, v, e) => ({ i, v, e: e || '' });
  const stl = { ok: 'Conforme', warn: 'Atención', bad: 'Crítico' };
  return {
    name: 'KPIs_Ejecutivo', title: 'Informe Ejecutivo de KPIs y Procesos', subtitle: plabel(P),
    cols: [{ h: 'Indicador', k: 'i' }, { h: 'Valor', k: 'v' }, { h: 'Estado / detalle', k: 'e' }],
    rows: [row('Diezmos recaudados', m(T.diez)), row('Diezmo de diezmos (10%) a remitir', m(T.d10)), row('Ingresos varios', m(T.ingV)),
    row('Egresos por servicios', m(T.serv)), row('Remuneraciones (Pastor y EPAMI 1-3)', m(T.remT)), row('Caja chica - ingresos', m(T.ccI)), row('Caja chica - egresos', m(T.ccE)),
    row('TOTAL INGRESOS', m(T.ingresos)), row('TOTAL EGRESOS (incluye 10%)', m(T.egresos)), row('SALDO NETO', m(T.saldo), T.saldo >= 0 ? 'Superávit' : 'Déficit'),
    row('Miembros activos', act), row('Miembros bautizados', bap), row('Promedio de asistencia Santa Cena', avg),
    ...pr.map(x => row('Proceso: ' + x.t, x.val, stl[x.st] + ' · ' + x.s))],
    summary: []
  };
}



/* ---------- módulo financiero genérico ---------- */
/* ---------- componentes de interfaz por apartado ---------- */
Object.assign(ICONS, {
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'
});
const sumBy = (rows, f) => rows.reduce((s, r) => s + (+r[f] || 0), 0);
const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '0%';
const exportBtns = () => `<button class="btn sm red" data-act="pdf">${I('dl')} Exportar PDF</button><button class="btn sm alt" data-act="xls">${I('xls')} Exportar Excel</button>`;
const banner = (ic, title, quote, ref, exp = true) => `<div class="mhero"><div class="mi">${I(ic)}</div>
  <div class="mt"><b>${esc(title)}</b><small>«${esc(quote)}» — ${esc(ref)}</small></div>${exp ? `<div class="hb">${exportBtns()}</div>` : ''}</div>`;
const strip = a => `<div class="strip">${a.map(x => `<div><small>${x.l}</small><b style="color:${x.c}">${x.v}</b></div>`).join('')}</div>`;
const kcards = a => `<div class="kc4">${a.map(x => `<div class="kc" style="--c:${x.c}"><div class="kh"><span>${x.l}</span><i>${I(x.ic)}</i></div><b>${x.v}</b><small>${I('info')} ${x.s}</small></div>`).join('')}</div>`;
const dbar = (l, v, chips = []) => `<div class="dbar"><span>${l}:</span><b>${v}</b>${chips.map(c => `<em>${c}</em>`).join('')}</div>`;
const sel = (k, label, opts) => `<select data-flt="${k}"><option value="">${label}</option>${opts.map(o => `<option ${S.flt[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
const searchBox = ph => `<div class="sbox">${I('search')}<input id="fq" placeholder="${ph}" value="${esc(S.q)}"></div>`;
const noAccess = () => header('Acceso') + '<div class="content empty">Sin acceso</div>';
const rowBtns = (ed, del) => `<td class="acc"><button class="ib" data-${ed} title="Editar">${I('edit')}</button><button class="ib d" data-${del} title="Eliminar">${I('trash')}</button></td>`;
const OPC = { 'Efectivo': ['cash', '#6e3b2e'], 'Transferencia': ['trend', '#16a06b'], 'Depósito': ['brief', '#d9a233'], 'Yape/Plin': ['zap', '#8c5a3c'], 'Boleta': ['file', '#6e3b2e'], 'Factura': ['brief', '#16a06b'], 'Recibo': ['list', '#d9a233'], 'Otro': ['info', '#8c5a3c'], 'Sin comprobante': ['shield', '#d64545'] };
const groupCards = (rows, field, tf, opts, what) => opts.map(o => { const rs = rows.filter(r => r[field] === o), [ic, c] = OPC[o] || ['info', '#6b7a90']; return { l: o.toUpperCase(), v: money(sumBy(rs, tf)), s: rs.length + ' ' + what, ic, c }; });
const ETAPA_C = ['#6e3b2e', '#16a06b', '#d9a233', '#8c5a3c'];

const MCFG = {
  diezmos: {
    ic: 'cash', q: ['Traed todos los diezmos al alfolí, y haya alimento en mi casa', 'Malaquías 3:10'], filters: ['tipoOp'], bar: 'TOTAL DE DIEZMOS',
    strip: (r, t) => [{ l: 'TOTAL DIEZMOS', v: money(t), c: '#6e3b2e' }, { l: 'DIEZMO DE DIEZMOS (10%)', v: money(t * 0.1), c: '#8c5a3c' }, { l: 'APORTES REGISTRADOS', v: r.length + ' registros', c: '#14213a' }, { l: 'APORTANTES', v: new Set(r.map(x => (x.nombre || '').toLowerCase())).size + ' personas', c: '#16a06b' }],
    cards: r => groupCards(r, 'tipoOp', 'precio', OPS, 'aportes')
  },
  servicios: {
    ic: 'zap', q: ['Todo lo que hagáis, hacedlo de buena gana, como para el Señor', 'Colosenses 3:23'], filters: ['operacion', 'comprobante'], bar: 'TOTAL EGRESOS POR SERVICIOS',
    strip: (r, t) => [{ l: 'TOTAL EGRESOS', v: '-' + money(t), c: '#d64545' }, { l: 'SERVICIOS REGISTRADOS', v: r.length + ' registros', c: '#14213a' }, { l: 'CON COMPROBANTE Y RUC', v: r.filter(x => x.comprobante && x.ruc).length, c: '#16a06b' }, { l: 'SIN COMPROBANTE / RUC', v: r.filter(x => !x.comprobante || !x.ruc).length, c: '#d9a233' }],
    cards: r => groupCards(r, 'comprobante', 'total', ['Boleta', 'Factura', 'Recibo', 'Otro'], 'comprobantes')
  },
  ingresos: {
    ic: 'trend', q: ['Honra a Jehová con tus bienes y con las primicias de todos tus frutos', 'Proverbios 3:9'], filters: ['tipoOp'], bar: 'TOTAL DE INGRESOS VARIOS',
    strip: (r, t) => [{ l: 'TOTAL INGRESOS', v: '+' + money(t), c: '#16a06b' }, { l: 'REGISTROS', v: r.length + ' registros', c: '#14213a' }, { l: 'PROMEDIO POR INGRESO', v: money(r.length ? t / r.length : 0), c: '#6e3b2e' }, { l: 'MAYOR INGRESO', v: money(Math.max(0, ...r.map(x => +x.total || 0))), c: '#d9a233' }],
    cards: r => groupCards(r, 'tipoOp', 'total', OPS, 'ingresos')
  },
  remuneraciones: {
    ic: 'file', q: ['Los ancianos que gobiernan bien sean tenidos por dignos de doble honor', '1 Timoteo 5:17'], filters: [], bar: 'TOTAL DE OFRENDAS',
    strip: (r, t) => [{ l: 'TOTAL OFRENDAS', v: money(t), c: '#6e3b2e' }, { l: 'REGISTROS', v: r.length + ' registros', c: '#14213a' }, { l: 'PERSONAS', v: new Set(r.map(x => (x.nombre || '').toLowerCase())).size, c: '#16a06b' }, { l: 'PROMEDIO', v: money(r.length ? t / r.length : 0), c: '#d9a233' }],
    cards: r => MODS.remuneraciones.etapas.map((e, i) => { const rs = r.filter(x => x.etapa === e); return { l: e.toUpperCase(), v: money(sumBy(rs, 'ofrenda')), s: rs.length + ' registros', ic: i === 0 ? 'shield' : 'users', c: ETAPA_C[i] }; })
  },
  cajachica: {
    ic: 'brief', q: ['Hágase todo decentemente y con orden', '1 Corintios 14:40'], filters: ['tipo', 'comprobante'], bar: 'SALDO DE CAJA CHICA',
    strip: r => { const i = sumBy(r.filter(x => x.tipo === 'Ingreso'), 'total'), e = sumBy(r.filter(x => x.tipo === 'Egreso'), 'total'); return [{ l: 'SALDO DE CAJA', v: money(i - e), c: i - e >= 0 ? '#16a06b' : '#d64545' }, { l: 'TOTAL INGRESOS', v: '+' + money(i), c: '#16a06b' }, { l: 'TOTAL EGRESOS', v: '-' + money(e), c: '#d64545' }, { l: 'MOVIMIENTOS REGISTRADOS', v: r.length + ' registros', c: '#14213a' }]; },
    cards: r => groupCards(r.filter(x => x.tipo === 'Egreso'), 'comprobante', 'total', ['Boleta', 'Factura', 'Recibo', 'Sin comprobante'], 'egresos')
  },
  agendas: {
    ic: 'cal', q: ['Enseñándonos a vivir en este siglo sobria, justa y piadosamente', 'Tito 2:12'], filters: ['tipo', 'estado'], bar: 'ACTIVIDADES EN AGENDA',
    strip: r => [{ l: 'EN LA LISTA', v: r.length, c: '#8c5a3c' }, { l: 'PROGRAMADAS', v: r.filter(x => x.estado === 'Programada' || x.estado === 'Confirmada').length, c: '#6e3b2e' }, { l: 'REALIZADAS', v: r.filter(x => x.estado === 'Realizada').length, c: '#2f6f4e' }, { l: 'CANCELADAS', v: r.filter(x => x.estado === 'Cancelada').length, c: '#9b3a3a' }],
    cards: r => ['Culto', 'Reunión', 'Ensayo', 'Actividad'].map((o, i) => ({ l: o.toUpperCase(), v: r.filter(x => x.tipo === o).length, s: 'actividades', ic: 'cal', c: ['#8c5a3c', '#6e3b2e', '#b08948', '#2f6f4e'][i] }))
  },
  presupuestos: {
    ic: 'wallet', q: ['Porque ¿quién de vosotros, queriendo edificar una torre, no se sienta primero y calcula los gastos?', 'Lucas 14:28'], filters: ['categoria', 'estado'], bar: 'PRESUPUESTO ASIGNADO',
    strip: r => {
      const a = sumBy(r, 'asignado'), e = sumBy(r, 'ejecutado');
      return [{ l: 'ASIGNADO', v: money(a), c: '#6e3b2e' }, { l: 'EJECUTADO', v: money(e), c: '#8c5a3c' }, { l: 'DISPONIBLE', v: money(a - e), c: a - e >= 0 ? '#2f6f4e' : '#9b3a3a' }, { l: 'VALIDADOS', v: r.filter(x => x.estado === 'Validado' || x.estado === 'Cerrado').length + ' de ' + r.length, c: '#b08948' }];
    },
    cards: r => ['Borrador', 'Asignado', 'Validado', 'Cerrado'].map((o, i) => { const rs = r.filter(x => x.estado === o); return { l: o.toUpperCase(), v: money(sumBy(rs, 'asignado')), s: rs.length + ' partidas', ic: 'wallet', c: ['#6e655b', '#8c5a3c', '#2f6f4e', '#6e3b2e'][i] }; })
  }
};

/* ---------- módulo financiero genérico (vista tabla) ---------- */
function filteredRows(key) {
  const m = MODS[key], q = S.q.toLowerCase();
  return db[key]
    .filter(r => (!S.month || (r[m.date] || '').startsWith(S.month)))
    .filter(r => !S.etapa || r.etapa === S.etapa)
    .filter(r => Object.entries(S.flt).every(([k, v]) => !v || r[k] === v))
    .filter(r => !q || m.fields.some(f => String(r[f.k] ?? '').toLowerCase().includes(q)))
    .sort((a, b) => (b[m.date] || '').localeCompare(a[m.date] || ''));
}
function moduleHtml(key) {
  const m = MODS[key], c = MCFG[key];
  if (!canView(m.area)) return noAccess();
  header(m.title); currentSpec = () => moduleSpec(key);
  return `<div class="content">${banner(c.ic, m.title, c.q[0], c.q[1])}
    <div id="strip"></div><div id="kc"></div>
    ${m.etapas ? `<div class="chips">${['', ...m.etapas].map(e => `<button class="chip ${S.etapa === e ? 'on' : ''}" data-etapa="${e}">${e || 'Todas las etapas'}</button>`).join('')}</div>` : ''}
    <div class="tool">${searchBox('Buscar por concepto, nombre, comprobante...')}
      ${c.filters.map(k => { const f = m.fields.find(x => x.k === k); return sel(k, 'Todos: ' + f.l, f.o); }).join('')}
      <input type="month" id="fm" value="${S.month}"><button class="btn sm gray" data-act="allmonths">Todo</button>
      ${canEdit(m.area) ? `<button class="btn navy" data-act="add">${I('plus')} Nuevo registro</button>` : ''}</div>
    <div id="list"></div><div id="dbar"></div>${footPhrase()}</div>`;
}
function refreshModule(key) {
  const m = MODS[key], c = MCFG[key], rows = filteredRows(key), ed = canEdit(m.area);
  const total = m.total ? (m.totalOf ? m.totalOf(rows) : sumBy(rows, m.total)) : rows.length;
  const totalTxt = key === 'agendas' ? (rows.length + ' actividades') : money(total);
  $('#strip').innerHTML = strip(c.strip(rows, total));
  $('#kc').innerHTML = kcards(c.cards(rows, total));
  $('#dbar').innerHTML = dbar(c.bar, totalTxt, [rows.length + ' registros', esc(monthLabel(S.month)) + ' · ' + PLACE]);
  const th = m.fields.map(f => `<th class="${f.t === 'money' ? 'n' : ''}">${f.l.replace(' (S/)', '')}</th>`).join('') + (ed ? '<th>Acciones</th>' : '');
  const td = r => m.fields.map(f => {
    const v = r[f.k];
    if (f.t === 'money') { const eg = key === 'cajachica' && r.tipo === 'Egreso'; const over = key === 'presupuestos' && f.k === 'ejecutado' && (+r.ejecutado || 0) > (+r.asignado || 0); return `<td class="n ${eg || over ? 'neg' : 'pos'}"><b>${eg ? '-' : ''}${money(v)}</b></td>`; }
    if (key === 'cajachica' && f.k === 'tipo') return `<td><span class="badge" style="background:${v === 'Ingreso' ? 'var(--g)' : 'var(--rd)'}">${esc(v)}</span></td>`;
    if (f.k === 'estado') { const col = { Programada: '#8c5a3c', Confirmada: '#6e3b2e', Realizada: '#2f6f4e', Cancelada: '#9b3a3a', Borrador: '#6e655b', Asignado: '#8c5a3c', Validado: '#2f6f4e', Cerrado: '#6e3b2e' }[v] || '#6e655b'; return `<td><span class="badge" style="background:${col}">${esc(v || '-')}</span></td>`; }
    const shown = f.t === 'date' ? fmtDate(v) : f.t === 'month' ? monthLabel(v) : v;
    return `<td class="${f.t === 'textarea' ? 'w' : ''}">${esc(shown || '-')}</td>`;
  }).join('') + (ed ? rowBtns('edit="' + r.id + '"', 'del="' + r.id + '"') : '');
  $('#list').innerHTML = `<div class="tblw"><table class="tbl"><thead><tr>${th}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${td(r)}</tr>`).join('') : `<tr><td colspan="${m.fields.length + 1}" class="emp">No hay registros para este filtro</td></tr>`}</tbody></table></div>`;
}

/* ---------- eclesiástico: miembros / bautizados ---------- */
const scCount = id => db.santacena.filter(s => s.asistentes.includes(id)).length;
function membersFiltered(onlyBap) {
  const q = S.q.toLowerCase();
  return db.members.filter(m => !onlyBap || m.bautizado === 'Sí')
    .filter(m => Object.entries(S.flt).every(([k, v]) => !v || m[k] === v))
    .filter(m => !q || [m.nombre, m.dni, m.cargo, m.telefono].some(x => String(x || '').toLowerCase().includes(q)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
function membersHtml(onlyBap) {
  if (!canView('ecl')) return noAccess();
  header(onlyBap ? 'Control de bautizados' : 'Registro de miembros'); currentSpec = () => membersSpec(onlyBap);
  const cargos = MEMBER_FIELDS.find(f => f.k === 'cargo').o;
  return `<div class="content">${onlyBap ? banner('drop', 'Control de Bautizados', 'El que creyere y fuere bautizado, será salvo', 'Marcos 16:16') : banner('users', 'Registro de Miembros', 'Así nosotros, siendo muchos, somos un cuerpo en Cristo', 'Romanos 12:5')}
    <div id="strip"></div><div id="kc"></div>
    <div class="tool">${searchBox('Buscar por nombre, DNI, teléfono...')}${sel('cargo', 'Todos los cargos', cargos)}${sel('estado', 'Todos los estados', ['Activo', 'Inactivo'])}
      ${onlyBap ? '' : sel('bautizado', 'Bautizados: todos', ['Sí', 'No'])}
      ${canEdit('ecl') ? `<button class="btn navy" data-act="addm">${I('plus')} Nuevo miembro</button>` : ''}</div>
    <div id="list"></div><div id="dbar"></div>${footPhrase()}</div>`;
}
function refreshMembers(onlyBap) {
  const all = db.members, rows = membersFiltered(onlyBap), bapL = all.filter(m => m.bautizado === 'Sí'), bap = bapL.length, ed = canEdit('ecl');
  const yr = todayStr().slice(0, 4), inc = all.filter(m => !m.dni || !m.telefono).length, last = bapL.map(m => m.fechaBautizo).filter(Boolean).sort().pop();
  const totSC = all.reduce((s, m) => s + scCount(m.id), 0);
  $('#strip').innerHTML = onlyBap
    ? strip([{ l: 'TOTAL BAUTIZADOS', v: bap, c: '#3f6f8f' }, { l: 'COBERTURA DE BAUTISMO', v: pc(bap, all.length), c: '#16a06b' }, { l: 'BAUTIZADOS ESTE AÑO', v: bapL.filter(m => (m.fechaBautizo || '').startsWith(yr)).length, c: '#6e3b2e' }, { l: 'PENDIENTES DE BAUTIZO', v: all.length - bap, c: '#d9a233' }])
    : strip([{ l: 'TOTAL MIEMBROS', v: all.length, c: '#6e3b2e' }, { l: 'MIEMBROS ACTIVOS', v: all.filter(m => m.estado === 'Activo').length, c: '#16a06b' }, { l: 'BAUTIZADOS', v: bap, c: '#3f6f8f' }, { l: 'NO BAUTIZADOS', v: all.length - bap, c: '#d9a233' }]);
  $('#kc').innerHTML = kcards(onlyBap
    ? [{ l: 'ÚLTIMO BAUTIZO', v: last ? fmtDate(last) : 'N/D', s: 'Fecha más reciente', ic: 'cal', c: '#3f6f8f' }, { l: 'BAUTIZADOS ACTIVOS', v: bapL.filter(m => m.estado === 'Activo').length, s: 'Con estado activo', ic: 'check', c: '#16a06b' }, { l: 'LÍDERES BAUTIZADOS', v: bapL.filter(m => m.cargo && m.cargo !== 'Miembro').length, s: 'Líderes, EPAMI, diáconos, pastor', ic: 'shield', c: '#d9a233' }, { l: 'SIN FECHA DE BAUTIZO', v: bapL.filter(m => !m.fechaBautizo).length, s: 'Completar el registro', ic: 'info', c: '#d64545' }]
    : [{ l: 'LÍDERES Y SERVIDORES', v: all.filter(m => m.cargo && m.cargo !== 'Miembro').length, s: 'Líder, EPAMI, diácono, pastor', ic: 'shield', c: '#6e3b2e' }, { l: 'COBERTURA DE BAUTISMO', v: pc(bap, all.length), s: bap + ' de ' + all.length + ' miembros', ic: 'drop', c: '#3f6f8f' }, { l: 'DATOS INCOMPLETOS', v: inc, s: 'Sin DNI o teléfono', ic: 'info', c: '#d9a233' }, { l: 'SANTA CENA PROMEDIO', v: all.length ? (totSC / all.length).toFixed(1) : '0', s: 'Veces por miembro', ic: 'heart', c: '#d64545' }]);
  const th = ['Nombre', 'DNI', 'Teléfono', 'Cargo', 'Estado', 'Bautizado', 'Fecha de bautizo', 'Santa Cena'].map(h => `<th>${h}</th>`).join('') + (ed ? '<th>Acciones</th>' : '');
  const td = m => `<td><b>${esc(m.nombre)}</b></td><td>${esc(m.dni || '-')}</td><td>${esc(m.telefono || '-')}</td><td>${esc(m.cargo || '-')}</td>
    <td><span class="badge" style="background:${m.estado === 'Activo' ? 'var(--g)' : 'var(--mu)'}">${esc(m.estado || '-')}</span></td>
    <td><span class="badge" style="background:${m.bautizado === 'Sí' ? '#3f6f8f' : 'var(--gold)'}">${m.bautizado === 'Sí' ? 'Bautizado' : 'No bautizado'}</span></td>
    <td>${fmtDate(m.fechaBautizo) || '-'}</td><td>${scCount(m.id)} veces</td>` + (ed ? rowBtns('editm="' + m.id + '"', 'delm="' + m.id + '"') : '');
  $('#list').innerHTML = `<div class="tblw"><table class="tbl"><thead><tr>${th}</tr></thead><tbody>${rows.length ? rows.map(m => `<tr>${td(m)}</tr>`).join('') : `<tr><td colspan="9" class="emp">Sin registros</td></tr>`}</tbody></table></div>`;
  $('#dbar').innerHTML = dbar(onlyBap ? 'BAUTIZADOS EN LA LISTA' : 'MIEMBROS EN LA LISTA', rows.length, ['Total registrado: ' + all.length, PLACE]);
}

/* ---------- eclesiástico: Santa Cena (lista de celebraciones) ---------- */
function santaListHtml() {
  if (!canView('ecl')) return noAccess();
  header('Santa Cena');
  const ev = db.santacena.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)), n = db.members.length, ed = canEdit('ecl');
  const att = ev.map(s => s.asistentes.length), tot = att.reduce((a, b) => a + b, 0);
  const never = db.members.filter(m => scCount(m.id) === 0).length;
  currentSpec = () => ({
    name: 'SantaCena_Celebraciones', title: 'Registro de Celebraciones de Santa Cena', subtitle: 'Total de celebraciones: ' + ev.length,
    cols: [{ h: 'Fecha', k: 'fecha', date: true }, { h: 'Asistentes', k: 'n', int: true }, { h: '% de miembros', k: 'p' }],
    rows: ev.map(s => ({ fecha: s.fecha, n: s.asistentes.length, p: pc(s.asistentes.length, n) })), summary: [['Promedio de asistencia', ev.length ? Math.round(tot / ev.length) : 0, true]]
  });
  return `<div class="content">${banner('heart', 'Santa Cena', 'Haced esto en memoria de mí', '1 Corintios 11:24')}
    ${strip([{ l: 'CELEBRACIONES', v: ev.length, c: '#d64545' }, { l: 'ASISTENCIA PROMEDIO', v: ev.length ? Math.round(tot / ev.length) : 0, c: '#6e3b2e' }, { l: 'ÚLTIMA CELEBRACIÓN', v: ev.length ? fmtDate(ev[0].fecha) : 'N/D', c: '#14213a' }, { l: 'MIEMBROS REGISTRADOS', v: n, c: '#16a06b' }])}
    ${kcards([{ l: 'MÁXIMA ASISTENCIA', v: Math.max(0, ...att), s: 'Mayor número de asistentes', ic: 'trend', c: '#16a06b' }, { l: 'MÍNIMA ASISTENCIA', v: att.length ? Math.min(...att) : 0, s: 'Menor número de asistentes', ic: 'info', c: '#d9a233' }, { l: 'NUNCA LA HAN RECIBIDO', v: never, s: 'Miembros sin participación', ic: 'users', c: '#d64545' }, { l: 'PARTICIPACIONES', v: tot, s: 'Total acumulado', ic: 'heart', c: '#8c5a3c' }])}
    <div class="tool"><span class="grow"></span>${ed ? `<button class="btn navy" data-act="addsc">${I('plus')} Nueva Santa Cena</button>` : ''}</div>
    <div class="tblw"><table class="tbl"><thead><tr><th>#</th><th>Fecha</th><th>Asistentes</th><th>Participación</th><th>Acciones</th></tr></thead><tbody>
    ${ev.length ? ev.map((s, i) => `<tr><td>${ev.length - i}</td><td><b>${fmtDate(s.fecha)}</b></td><td>${s.asistentes.length}</td>
      <td style="min-width:160px"><div class="progress" style="margin:0"><i style="width:${pc(s.asistentes.length, n)}"></i></div><small>${pc(s.asistentes.length, n)} de los miembros</small></td>
      <td class="acc"><button class="btn sm" data-sc="${s.id}">${ed ? 'Tomar asistencia' : 'Ver asistentes'}</button>${ed ? `<button class="ib d" data-delsc="${s.id}">${I('trash')}</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="emp">Aún no hay Santa Cena registrada</td></tr>'}
    </tbody></table></div>${dbar('TOTAL DE CELEBRACIONES', ev.length, [tot + ' participaciones', PLACE])}${footPhrase()}</div>`;
}
function santaCountHtml() {
  if (!canView('ecl')) return noAccess();
  header('Conteo de Santa Cena'); currentSpec = () => countSpec();
  return `<div class="content">${banner('list', 'Conteo de Santa Cena por Miembro', 'Todas las veces que comáis este pan, la muerte del Señor anunciáis', '1 Corintios 11:26')}
    <div id="strip"></div><div class="tool">${searchBox('Buscar miembro...')}</div><div id="list"></div><div id="dbar"></div>${footPhrase()}</div>`;
}
function countRows() {
  const q = S.q.toLowerCase();
  return db.members.filter(m => !q || m.nombre.toLowerCase().includes(q))
    .map(m => ({ nombre: m.nombre, cargo: m.cargo, veces: scCount(m.id) })).sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, 'es'));
}
function refreshCount() {
  const rows = countRows(), N = db.santacena.length, regular = rows.filter(r => r.veces > 0).length, top = rows[0];
  $('#strip').innerHTML = strip([{ l: 'CELEBRACIONES', v: N, c: '#d64545' }, { l: 'HAN PARTICIPADO', v: regular, c: '#16a06b' }, { l: 'NUNCA HAN PARTICIPADO', v: rows.length - regular, c: '#d9a233' }, { l: 'MAYOR PARTICIPACIÓN', v: top && top.veces ? top.veces + ' veces' : 'N/D', c: '#6e3b2e' }]);
  $('#list').innerHTML = `<div class="tblw"><table class="tbl"><thead><tr><th>#</th><th>Nombre</th><th>Cargo</th><th class="n">Veces que recibió</th><th>Asistencia</th></tr></thead><tbody>
    ${rows.length ? rows.map((r, i) => `<tr><td>${i + 1}</td><td><b>${esc(r.nombre)}</b></td><td>${esc(r.cargo || '-')}</td><td class="n"><b>${r.veces}</b></td>
    <td style="min-width:150px"><div class="progress" style="margin:0"><i style="width:${pc(r.veces, N)}"></i></div><small>${pc(r.veces, N)}</small></td></tr>`).join('') : '<tr><td colspan="5" class="emp">Sin miembros</td></tr>'}</tbody></table></div>`;
  $('#dbar').innerHTML = dbar('MIEMBROS EN EL CONTEO', rows.length, [N + ' celebraciones', PLACE]);
}

/* ---------- auditoría ---------- */
function auditLog(modulo, accion, antes, despues) {
  const ref = despues || antes || {};
  db.auditoria.push({
    id: uid(),
    fecha: new Date().toISOString(),
    usuario: me ? me.user : '',
    nombre: me ? me.name : '',
    rol: me ? (activeRole() || '') : '',
    modulo, accion,
    detalle: ref.descripcion || ref.titulo || ref.concepto || ref.id || '',
    monto: ref.total ?? ref.asignado ?? null
  });
  if (db.auditoria.length > 2200) db.auditoria = db.auditoria.slice(-2000);
}
function validateRecord(key, o) {
  const m = MODS[key];
  if (!m) return 'Módulo desconocido';
  if (!canEdit(m.area)) return 'Sin permiso para modificar este módulo';
  if (key === 'cajachica' && !['Ingreso', 'Egreso'].includes(o.tipo)) return 'El movimiento debe ser ingreso o egreso';
  if (key === 'agendas' && !String(o.titulo || '').trim()) return 'La agenda necesita un título';
  if (key === 'presupuestos') {
    const asignado = +o.asignado || 0, ejecutado = +o.ejecutado || 0;
    if (asignado < 0 || ejecutado < 0) return 'Los montos no pueden ser negativos';
    if (!/^\d{4}-\d{2}$/.test(o.periodo || '')) return 'Indique el periodo del presupuesto';
    if (o.estado === 'Validado' && ejecutado > asignado) return 'No se puede validar: lo ejecutado supera lo asignado';
    if (o.estado === 'Validado' && !['lider', 'tesorero'].includes(activeRole())) return 'Solo el líder o el tesorero pueden validar un presupuesto';
  }
  return '';
}
function commitRecord(key, o, id) {
  if (!activeRole()) return 'Sesión sin rol válido';
  const err = validateRecord(key, o);
  if (err) return err;
  const cur = id ? db[key].find(r => r.id === id) : null;
  if (id && !cur) return 'Registro no encontrado';
  const antes = cur ? { ...cur } : null;
  let despues;
  if (cur) { Object.assign(cur, o); despues = cur; }
  else { despues = { id: uid(), ...o }; db[key].push(despues); }
  if (AUDIT_MODS.includes(key)) auditLog(key, antes ? 'modificar' : 'crear', antes, despues);
  save(key);
  afterCloudWrite(key, despues);
  return '';
}
function removeRecord(key, id) {
  if (!activeRole()) return 'Sesión sin rol válido';
  const m = MODS[key];
  if (!m || !canEdit(m.area)) return 'Sin permiso para eliminar este registro';
  const prev = db[key].find(r => r.id === id);
  if (!prev) return 'Registro no encontrado';
  db[key] = db[key].filter(r => r.id !== id);
  if (AUDIT_MODS.includes(key)) auditLog(key, 'eliminar', prev, null);
  save(key);
  afterCloudDelete(key, id);
  if (AUDIT_MODS.includes(key) && db.auditoria.length) afterCloudWrite('auditoria', db.auditoria[db.auditoria.length - 1]);
  return '';
}
function auditoriaRows() {
  const q = S.q.toLowerCase();
  return db.auditoria.slice().reverse().filter(r => !q || [r.modulo, r.accion, r.detalle, r.nombre, r.usuario].some(x => String(x || '').toLowerCase().includes(q)));
}
function auditoriaHtml() {
  if (!canView('fin')) return noAccess();
  header('Auditoría');
  currentSpec = () => ({
    name: 'Auditoria', title: 'Auditoría de movimientos', subtitle: auditoriaRows().length + ' eventos',
    cols: [{ h: 'Fecha', k: 'cuando' }, { h: 'Usuario', k: 'nombre' }, { h: 'Rol', k: 'rol' }, { h: 'Módulo', k: 'modulo' }, { h: 'Acción', k: 'accion' }, { h: 'Detalle', k: 'detalle' }, { h: 'Monto', k: 'monto', num: true }],
    rows: auditoriaRows().map(r => ({ ...r, cuando: new Date(r.fecha).toLocaleString('es-PE', { timeZone: TZ }) })),
    summary: []
  });
  return `<div class="content">${banner('shield', 'Auditoría de caja, agendas y presupuestos', 'Hágase todo decentemente y con orden', '1 Corintios 14:40')}
    ${strip([{ l: 'EVENTOS', v: db.auditoria.length, c: '#9b3a3a' }, { l: 'CAJA CHICA', v: db.auditoria.filter(r => r.modulo === 'cajachica').length, c: '#8c5a3c' }, { l: 'PRESUPUESTOS', v: db.auditoria.filter(r => r.modulo === 'presupuestos').length, c: '#b08948' }, { l: 'AGENDAS', v: db.auditoria.filter(r => r.modulo === 'agendas').length, c: '#6e3b2e' }])}
    <div class="tool">${searchBox('Buscar por usuario, módulo o detalle...')}</div>
    <div id="list"></div>${footPhrase()}</div>`;
}
function refreshAuditoria() {
  const rows = auditoriaRows();
  const el = $('#list');
  if (!el) return;
  el.innerHTML = `<div class="tblw"><table class="tbl"><thead><tr><th>Cuándo</th><th>Quién</th><th>Módulo</th><th>Acción</th><th>Detalle</th><th class="n">Monto</th></tr></thead><tbody>
    ${rows.length ? rows.slice(0, 300).map(r => `<tr><td>${esc(new Date(r.fecha).toLocaleString('es-PE', { timeZone: TZ }))}</td><td><b>${esc(r.nombre || r.usuario)}</b><br><small>${esc(r.rol || '')}</small></td><td>${esc(r.modulo)}</td><td><span class="badge" style="background:${r.accion === 'eliminar' ? 'var(--rd)' : r.accion === 'modificar' ? 'var(--gold)' : 'var(--g)'}">${esc(r.accion)}</span></td><td class="w">${esc(r.detalle || '-')}</td><td class="n">${r.monto == null ? '-' : money(r.monto)}</td></tr>`).join('') : '<tr><td colspan="6" class="emp">Aún no hay movimientos auditados</td></tr>'}
    </tbody></table></div>`;
}

/* ---------- usuarios ---------- */
function usersHtml() {
  if (!canManageUsers()) return noAccess();
  header('Usuarios y roles');
  return `<div class="content">${banner('shield', 'Usuarios y Roles', 'Todo lo hacéis, hacedlo con orden y responsabilidad', 'Administración', false)}
    ${strip([{ l: 'USUARIOS', v: db.users.length, c: '#6e3b2e' }, ...Object.keys(ROLES).slice(0, 3).map((r, i) => ({ l: ROLES[r].label.toUpperCase(), v: db.users.filter(u => u.role === r).length, c: ['#d9a233', '#16a06b', '#8c5a3c'][i] }))])}
    <div class="tool"><span class="grow"></span><button class="btn navy" data-act="addu">${I('plus')} Nuevo usuario</button></div>
    <div class="tblw"><table class="tbl"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>
    ${db.users.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.user)}</td><td><span class="badge" style="background:var(--p)">${esc((ROLES[u.role] && ROLES[u.role].label) || u.role)}</span></td>
      <td class="acc"><button class="ib" data-editu="${u.id}">${I('edit')}</button>${u.id !== me.id ? `<button class="ib d" data-delu="${u.id}">${I('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>${footPhrase()}</div>`;
}

function moduleSpec(key) {
  const m = MODS[key], rows = filteredRows(key).slice().reverse();
  const cols = m.fields.map(f => ({ h: f.l.replace(' (S/)', ''), k: f.k, num: f.t === 'money', date: f.t === 'date' }));
  const hasMoney = !!m.total;
  const total = hasMoney ? (m.totalOf ? m.totalOf(rows) : rows.reduce((s, r) => s + (+r[m.total] || 0), 0)) : null;
  const label = key === 'cajachica' ? 'SALDO' : key === 'presupuestos' ? 'ASIGNADO' : 'TOTAL';
  return {
    name: m.title, title: 'Reporte de ' + m.title, subtitle: monthLabel(S.month) + (S.etapa ? ' · ' + S.etapa : ''),
    cols, rows, total: hasMoney ? { label, value: total, col: m.fields.findIndex(f => f.k === m.total) } : null,
    summary: m.summary ? m.summary(rows) : []
  };
}

/* ---------- formulario modal ---------- */
function openForm(title, fields, vals, onSave, onDel) {
  const input = f => {
    const v = vals[f.k] ?? (f.t === 'date' && f.k === 'fecha' ? todayStr() : '');
    if (f.t === 'select') return `<select name="${f.k}">${f.o.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (f.t === 'textarea') return `<textarea name="${f.k}" rows="2" ${f.req ? 'required' : ''}>${esc(v)}</textarea>`;
    if (f.t === 'money') return `<input name="${f.k}" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(v)}" ${f.req ? 'required' : ''}>`;
    if (f.t === 'month') return `<input name="${f.k}" type="month" value="${esc(v || monthNow())}" ${f.req ? 'required' : ''}>`;
    const type = f.t === 'date' ? 'date' : f.t === 'time' ? 'time' : f.t === 'password' ? 'password' : 'text';
    return `<input name="${f.k}" type="${type}" value="${esc(v)}" ${f.req ? 'required' : ''}>`;
  };
  const md = $('#modal');
  md.innerHTML = `<form class="sheet"><h3>${esc(title)}</h3>${fields.map(f => `<label>${f.l}${f.req ? ' *' : ''}</label>${input(f)}`).join('')}
    <div class="row2"><button type="button" class="btn gray" id="mc">Cancelar</button><button class="btn" type="submit">Guardar</button></div></form>`;
  md.classList.remove('hidden');
  const close = () => { md.classList.add('hidden'); md.innerHTML = ''; };
  $('#mc').onclick = close;
  md.onclick = e => { if (e.target === md) close(); };
  md.querySelector('form').onsubmit = e => {
    e.preventDefault();
    const o = {}; new FormData(e.target).forEach((v, k) => o[k] = typeof v === 'string' ? v.trim() : v);
    fields.filter(f => f.t === 'money').forEach(f => o[f.k] = parseFloat(o[f.k]) || 0);
    if (onSave(o) !== false) { close(); }
  };
}
function confirmDlg(msg, yes) {
  const md = $('#modal');
  md.innerHTML = `<div class="sheet"><h3>Confirmar</h3><p>${esc(msg)}</p><div class="row2"><button class="btn gray" id="n">No</button><button class="btn red" id="y">Confirmar</button></div></div>`;
  md.classList.remove('hidden');
  $('#n').onclick = () => { md.classList.add('hidden'); md.innerHTML = ''; };
  $('#y').onclick = () => { md.classList.add('hidden'); md.innerHTML = ''; yes(); };
}

/* ---------- eclesiástico: miembros / bautizados ---------- */
function membersSpec(onlyBap) {
  const rows = membersFiltered(onlyBap).map(m => ({ ...m, scena: scCount(m.id) }));
  const cols = onlyBap
    ? [{ h: 'Nombre', k: 'nombre' }, { h: 'DNI', k: 'dni' }, { h: 'Teléfono', k: 'telefono' }, { h: 'Cargo', k: 'cargo' }, { h: 'Fecha de bautizo', k: 'fechaBautizo', date: true }]
    : [{ h: 'Nombre', k: 'nombre' }, { h: 'DNI', k: 'dni' }, { h: 'Teléfono', k: 'telefono' }, { h: 'Cargo', k: 'cargo' }, { h: 'Estado', k: 'estado' }, { h: 'Bautizado', k: 'bautizado' }, { h: 'Fecha de bautizo', k: 'fechaBautizo', date: true }, { h: 'Santa Cena (veces)', k: 'scena', int: true }];
  const bap = db.members.filter(m => m.bautizado === 'Sí').length;
  return {
    name: onlyBap ? 'Bautizados' : 'Miembros', title: onlyBap ? 'Control de Bautizados' : 'Registro de Miembros', subtitle: 'Total en la lista: ' + rows.length, cols, rows,
    summary: [['Total de miembros', db.members.length, true], ['Bautizados', bap, true], ['No bautizados', db.members.length - bap, true]]
  };
}
function editMember(id) {
  const cur = db.members.find(m => m.id === id) || {};
  openForm(id ? 'Editar miembro' : 'Nuevo miembro', MEMBER_FIELDS, id ? cur : { cargo: 'Miembro', estado: 'Activo', bautizado: 'No' }, o => {
    if (o.bautizado !== 'Sí') o.fechaBautizo = '';
    let row;
    if (id) { Object.assign(cur, o); row = cur; }
    else { row = { id: uid(), ...o }; db.members.push(row); }
    save('members');
    afterCloudWrite('members', row);
    render(); refreshCurrent(); toast('Guardado');
  });
}

/* ---------- eclesiástico: Santa Cena ---------- */
function santaDetailHtml() {
  const s = db.santacena.find(x => x.id === S.param);
  if (!s) return santaListHtml();
  const q = S.q.toLowerCase(), edit = canEdit('ecl');
  currentSpec = () => ({
    name: 'SantaCena_' + s.fecha, title: 'Asistencia a Santa Cena', subtitle: 'Fecha: ' + fmtDate(s.fecha),
    cols: [{ h: 'Nombre', k: 'nombre' }, { h: 'DNI', k: 'dni' }, { h: 'Cargo', k: 'cargo' }],
    rows: db.members.filter(m => s.asistentes.includes(m.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    summary: [['Total de asistentes', s.asistentes.length, true]]
  });
  const list = db.members.filter(m => !q || m.nombre.toLowerCase().includes(q)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return header('Santa Cena ' + fmtDate(s.fecha), 'santacena') + `<div class="content">
    <div class="sum"><div><small>Asistentes</small><b id="scn">${s.asistentes.length}</b></div><div><small>Miembros</small><b>${db.members.length}</b></div></div>
    <div class="bar"><input id="fq" placeholder="Buscar miembro..." value="${esc(S.q)}"></div>
    <div class="bar"><button class="btn sm" data-act="pdf">${I('dl')} PDF</button><button class="btn sm alt" data-act="xls">${I('xls')} Excel</button></div>
    <div id="list">${list.map(m => `<label class="check"><input type="checkbox" data-att="${m.id}" ${s.asistentes.includes(m.id) ? 'checked' : ''} ${edit ? '' : 'disabled'}>
      <span><b>${esc(m.nombre)}</b><br><small style="color:var(--mu)">Recibió ${scCount(m.id)} vez/veces</small></span></label>`).join('') || '<div class="empty">Registre miembros primero</div>'}</div>
    ${footPhrase()}</div>`;
}
function refreshSantaDetail() {
  const s = db.santacena.find(x => x.id === S.param);
  if (!s) return;
  const q = S.q.toLowerCase(), edit = canEdit('ecl');
  const list = db.members.filter(m => !q || m.nombre.toLowerCase().includes(q)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const el = $('#list');
  if (el) {
    el.innerHTML = list.map(m => `<label class="check"><input type="checkbox" data-att="${m.id}" ${s.asistentes.includes(m.id) ? 'checked' : ''} ${edit ? '' : 'disabled'}>
      <span><b>${esc(m.nombre)}</b><br><small style="color:var(--mu)">Recibió ${scCount(m.id)} vez/veces</small></span></label>`).join('') || '<div class="empty">No se encontraron miembros</div>';
  }
}
function countSpec() {
  return {
    name: 'ConteoSantaCena', title: 'Conteo de Santa Cena por Miembro', subtitle: 'Total de celebraciones: ' + db.santacena.length,
    cols: [{ h: 'Nombre', k: 'nombre' }, { h: 'Cargo', k: 'cargo' }, { h: 'Veces que recibió', k: 'veces', int: true }], rows: countRows(), summary: []
  };
}

/* ---------- usuarios ---------- */
function editUser(id) {
  const cur = db.users.find(u => u.id === id);
  const f = [{ k: 'name', l: 'Nombre', t: 'text', req: 1 }, { k: 'user', l: 'Usuario', t: 'text', req: 1 },
  { k: 'role', l: 'Rol', t: 'select', o: Object.keys(ROLES) }, { k: 'pass', l: id ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña', t: 'password', req: !id }];
  openForm(id ? 'Editar usuario' : 'Nuevo usuario', f, cur ? { ...cur, pass: '' } : { role: 'miembro' }, o => {
    o.user = o.user.toLowerCase();
    if (db.users.some(u => u.user === o.user && u.id !== id)) { toast('Ese usuario ya existe'); return false; }
    (async () => {
      if (!(await revalidateAuthz()) || !canManageUsers()) { toast('Sin permiso'); return; }
      if (me && me.cloud) {
        toast('En nube, cree usuarios desde Supabase Auth + perfiles (RLS)');
        return;
      }
      if (isCloudProductionHost()) {
        toast('Este entorno solo admite usuarios de la nube');
        return;
      }
      if (id) {
        Object.assign(cur, { name: o.name, user: o.user, role: o.role });
        if (o.pass) {
          if (o.pass.length < 8) { toast('Mínimo 8 caracteres'); return; }
          const hp = await hashPassword(o.pass);
          cur.pass = hp.pass; cur.salt = hp.salt;
        }
      } else {
        if (!o.pass || o.pass.length < 8) { toast('Mínimo 8 caracteres'); return; }
        const hp = await hashPassword(o.pass);
        db.users.push({ id: uid(), name: o.name, user: o.user, role: o.role, pass: hp.pass, salt: hp.salt });
      }
      save('users'); render(); toast('Guardado');
    })();
  });
}

/* ---------- copia de seguridad y restauración ---------- */
function backupHtml() {
  if (!canManageUsers()) return noAccess();
  header('Copia de seguridad y restauración'); currentSpec = null;
  const totM = db.members.length, totD = db.diezmos.length, totS = db.servicios.length;
  const totI = db.ingresos.length, totR = db.remuneraciones.length, totC = db.cajachica.length, totSC = db.santacena.length;
  const totTotal = totM + totD + totS + totI + totR + totC + totSC;
  const sizeKB = (new Blob([JSON.stringify(db)]).size / 1024).toFixed(1);

  return `<div class="content">
    ${banner('dl', 'Copia de Seguridad y Restauración', 'El prudente ve el peligro y lo evita', 'Proverbios 22:3', false)}
    <div class="kpis">
      ${kpiCard('Registros totales', totTotal, 'Todos los módulos', 'list', '#6e3b2e')}
      ${kpiCard('Diezmos y aportes', totD, 'Registros contables', 'cash', '#16a06b')}
      ${kpiCard('Miembros y bautizos', totM, 'Padrón eclesiástico', 'users', '#8c5a3c')}
      ${kpiCard('Espacio utilizado', sizeKB + ' KB', 'Base local actual', 'file', '#d9a233')}
    </div>
    <div class="grid2">
      <div class="panel">
        <span class="tg">DESCARGAR</span>
        <h3>Exportar Respaldo Completo</h3>
        <div class="sb">Genera un archivo JSON con todos los datos contables y eclesiásticos.</div>
        <p style="font-size:0.88rem;color:var(--mu);margin-bottom:18px">
          Descargue periódicamente una copia y guárdela en Google Drive, memoria USB o envíela por correo para asegurar los datos ante cualquier fallo del dispositivo.
        </p>
        <button class="btn gold full" data-act="export-backup">${I('dl')} Descargar archivo de respaldo (.json)</button>
      </div>
      <div class="panel">
        <span class="tg">RESTAURAR</span>
        <h3>Restaurar Respaldo</h3>
        <div class="sb">Carga los datos desde un archivo JSON previamente exportado.</div>
        <p style="font-size:0.88rem;color:var(--mu);margin-bottom:18px">
          Permite recuperar la contabilidad al cambiar de celular o tras restablecer el navegador web.
        </p>
        <input type="file" id="backupFile" accept=".json" style="display:none">
        <button class="btn alt full" data-act="trigger-restore">${I('shield')} Seleccionar archivo para restaurar</button>
      </div>
    </div>
    ${footPhrase()}</div>`;
}

function exportBackup() {
  if (!canManageUsers()) return toast('Sin permiso');
  const safeDb = JSON.parse(JSON.stringify(db));
  if (Array.isArray(safeDb.users)) {
    safeDb.users = safeDb.users.map(u => {
      const { pass, salt, ...rest } = u;
      return Object.assign({}, rest, { pass: undefined, salt: undefined, passRedacted: true });
    });
  }
  const backup = {
    app: 'CasaDeOracionApp',
    version: 2,
    exportDate: new Date().toISOString(),
    church: CHURCH,
    place: PLACE,
    author: me.name,
    data: safeDb
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo_iglesia_${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Respaldo descargado');
}

function importBackup(file) {
  if (!file) return;
  if (!canManageUsers() || (me && me.cloud)) {
    toast(me && me.cloud ? 'Restaurar desde archivo no está permitido en modo nube' : 'Sin permiso');
    return;
  }
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      const incoming = parsed.data || parsed;
      if (!incoming || !Array.isArray(incoming.users) || !incoming.users.length) {
        toast('Archivo de respaldo no válido');
        return;
      }
      confirmDlg('¿Desea restaurar esta copia de seguridad? Se reemplazarán los datos actuales del dispositivo.', () => {
        for (const k of TABLES) {
          if (!Array.isArray(incoming[k])) continue;
          if (k === 'users') {
            const cleaned = incoming.users.filter(u => u && !u.passRedacted && u.pass);
            if (cleaned.length) db.users = cleaned;
            continue;
          }
          db[k] = incoming[k];
        }
        TABLES.forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
        if (incoming.cierres) db.cierres = incoming.cierres;
        save();
        render();
        toast('Copia de seguridad restaurada');
      });
    } catch (err) {
      console.error(err);
      toast('Error al leer el archivo');
    }
  };
  reader.readAsText(file);
}

/* ---------- refrescos de listas ---------- */
function refreshCurrent() {
  const v = S.view;
  if (v.startsWith('mod:')) refreshModule(v.slice(4));
  else if (v === 'miembros') refreshMembers(false);
  else if (v === 'bautizados') refreshMembers(true);
  else if (v === 'sccount') refreshCount();
  else if (v === 'd10') refreshD10();
  else if (v === 'sc') refreshSantaDetail();
  else if (v === 'auditoria') refreshAuditoria();
}

/* ---------- exportación PDF / Excel ---------- */
function slug(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_'); }
function cellVal(c, r) {
  const v = r[c.k];
  if (c.num) return money(v);
  if (c.date) return fmtDate(v);
  return v ?? '';
}
async function logoDataUrl() {
  if (window.LOGO_DATA) return window.LOGO_DATA;
  const res = await fetch('logo.jpg');
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => { window.LOGO_DATA = fr.result; resolve(fr.result); };
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
async function exportPDF(spec) {
  const { jsPDF } = window.jspdf;
  const land = spec.cols.length > 6;
  const doc = new jsPDF({ orientation: land ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  // encabezado
  try { doc.addImage(await logoDataUrl(), 'JPEG', 14, 8, 19, 24); } catch (e) { console.warn('Logo PDF', e); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 76, 129);
  doc.text(CHURCH, W / 2 + 8, 14, { align: 'center', maxWidth: W - 60 });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(90);
  doc.text(PLACE + ' · Apurímac, Perú', W / 2 + 8, 22, { align: 'center' });
  doc.setDrawColor(232, 131, 58); doc.setLineWidth(0.8); doc.line(14, 35, W - 14, 35);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30);
  doc.text(spec.title, 14, 44);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(spec.subtitle || '', 14, 50);
  doc.text('Generado: ' + new Date().toLocaleString('es-PE', { timeZone: TZ }) + ' · Por: ' + me.name, W - 14, 50, { align: 'right' });
  const body = spec.rows.map(r => spec.cols.map(c => cellVal(c, r)));
  const foot = [];
  if (spec.total) {
    const col = Math.max(spec.total.col, 0), row = spec.cols.map(() => '');
    row[Math.max(col - 1, 0)] = spec.total.label; row[col] = money(spec.total.value); foot.push(row);
  }
  const numCols = {}; spec.cols.forEach((c, i) => { if (c.num || c.int) numCols[i] = { halign: 'right' }; });
  doc.autoTable({
    startY: 55, head: [spec.cols.map(c => c.h)], body, foot, columnStyles: numCols,
    styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [15, 76, 129], textColor: 255 },
    footStyles: { fillColor: [232, 131, 58], textColor: 255, halign: 'right' }, alternateRowStyles: { fillColor: [241, 246, 251] },
    showFoot: 'lastPage', margin: { left: 14, right: 14, bottom: 22 }
  });
  if (spec.summary && spec.summary.length) {
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8, head: [['Resumen', 'Valor']],
      body: spec.summary.map(([l, v, int]) => [l, int ? String(v) : money(v)]), tableWidth: 90, margin: { left: 14, bottom: 22 },
      styles: { fontSize: 9 }, headStyles: { fillColor: [111, 168, 58] }, columnStyles: { 1: { halign: 'right' } }
    });
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(232, 131, 58); doc.setLineWidth(0.4); doc.line(14, H - 16, W - 14, H - 16);
    doc.setFont('times', 'bolditalic'); doc.setFontSize(12); doc.setTextColor(232, 131, 58);
    doc.text(PHRASE, W / 2, H - 9, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Página ${i} de ${n}`, W - 14, H - 9, { align: 'right' });
  }
  doc.save(`${slug(spec.name)}_${todayStr()}.pdf`);
}
function exportXLS(spec) {
  const x = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const n = spec.cols.length, span = Math.max(n - 1, 1);
  const cell = (v, st, num) => `<Cell ss:StyleID="${st}"><Data ss:Type="${num ? 'Number' : 'String'}">${num ? (+v || 0) : x(v)}</Data></Cell>`;
  const merged = (v, st, h) => `<Row${h ? ` ss:Height="${h}"` : ''}><Cell ss:StyleID="${st}" ss:MergeAcross="${span}"><Data ss:Type="String">${x(v)}</Data></Cell></Row>`;
  let rows = merged(CHURCH, 'church', 24) + merged(PLACE, 'sub') + merged(spec.title, 'title', 22) + merged(spec.subtitle || '', 'sub') + '<Row/>';
  rows += '<Row>' + spec.cols.map(c => cell(c.h, 'head')).join('') + '</Row>';
  spec.rows.forEach(r => {
    rows += '<Row>' + spec.cols.map(c => c.num ? cell(r[c.k], 'money', true) : c.int ? cell(r[c.k], 'int', true) : cell(c.date ? fmtDate(r[c.k]) : r[c.k], 'cell')).join('') + '</Row>';
  });
  if (spec.total) {
    const col = Math.max(spec.total.col, 0);
    rows += '<Row>' + spec.cols.map((c, i) => i === col ? cell(spec.total.value, 'totmoney', true) : i === col - 1 ? cell(spec.total.label, 'tot') : cell('', 'tot')).join('') + '</Row>';
  }
  if (spec.summary && spec.summary.length) {
    rows += '<Row/>' + spec.summary.map(([l, v, int]) => `<Row>${cell(l, 'cell')}${cell(v, int ? 'int' : 'money', true)}</Row>`).join('');
  }
  rows += '<Row/>' + merged(PHRASE, 'phrase', 24) + merged('Generado: ' + new Date().toLocaleString('es-PE', { timeZone: TZ }) + ' · Por: ' + me.name, 'sub');
  const cols = spec.cols.map(() => '<Column ss:Width="105"/>').join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
<Style ss:ID="church"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="14" ss:Color="#0F4C81"/></Style>
<Style ss:ID="title"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="13"/></Style>
<Style ss:ID="sub"><Alignment ss:Horizontal="Center"/><Font ss:Size="10" ss:Color="#666666"/></Style>
<Style ss:ID="head"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F4C81" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous"/></Borders></Style>
<Style ss:ID="cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="int"><Alignment ss:Horizontal="Right"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="money"><NumberFormat ss:Format="&quot;S/ &quot;#,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="tot"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#E8833A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right"/></Style>
<Style ss:ID="totmoney"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#E8833A" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;S/ &quot;#,##0.00"/></Style>
<Style ss:ID="phrase"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Times New Roman" ss:Bold="1" ss:Italic="1" ss:Size="14" ss:Color="#E8833A"/></Style>
</Styles>
<Worksheet ss:Name="${x(spec.name).slice(0, 30)}"><Table>${cols}${rows}</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Landscape" xmlns:x="urn:schemas-microsoft-com:office:excel"/></PageSetup></WorksheetOptions></Worksheet></Workbook>`;
  const blob = new Blob(['\ufeff' + xml], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${slug(spec.name)}_${todayStr()}.xls`; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- eventos (delegación) ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button,[data-go]'); if (!t) return;
  if (t.closest('form') && (t.getAttribute('type') === 'submit' || t.type === 'submit') && !t.dataset.act && !t.dataset.go) return;
  const d = t.dataset, key = S.view.startsWith('mod:') ? S.view.slice(4) : null;
  if (d.go) return go(d.go);
  if (d.period) { S.period = d.period; return render(); }
  if (d.act === 'menu') { $('#side').classList.toggle('open'); $('#scrim').classList.toggle('hidden'); return; }
  if (d.act === 'theme') { toggleTheme(); return; }
  if (d.act === 'install') { promptInstall(); return; }
  if (d.act === 'dismiss-install') { dismissInstall(); return; }
  if (d.etapa !== undefined) { S.etapa = d.etapa; return render(); }
  if (d.sc) return go('sc', d.sc);
  if (d.act === 'logout') {
    if (window.Cloud) Cloud.logout();
    me = null; persistSessionStub(); return go('home');
  }
  if (d.act === 'allmonths') { S.month = ''; return render(); }
  if (d.act === 'pdf' || d.act === 'xls') {
    if (!currentSpec) return;
    const ld = document.createElement('div'); ld.className = 'loader'; ld.innerHTML = '<div class="spin"></div><div>Generando ' + (d.act === 'pdf' ? 'PDF' : 'Excel') + '...</div>'; document.body.appendChild(ld);
    
    if (d.act === 'xls' && typeof Worker !== 'undefined') {
      try {
        const worker = new Worker('export-worker.js');
        worker.onmessage = function(ev) {
          ld.remove();
          worker.terminate();
          if (ev.data.success) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(ev.data.blob);
            a.download = ev.data.filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
            toast('Reporte Excel generado');
          } else {
            toast('Error al exportar');
          }
        };
        worker.onerror = function() {
          ld.remove();
          worker.terminate();
          exportXLS(currentSpec());
        };
        worker.postMessage({
          action: 'exportXLS',
          spec: currentSpec(),
          church: CHURCH,
          place: PLACE,
          phrase: PHRASE,
          timeZone: TZ,
          author: me.name,
          today: todayStr()
        });
        return;
      } catch (err) {
        console.warn('Worker fallback:', err);
      }
    }
    
    setTimeout(async () => { try { const sp = currentSpec(); if (d.act === 'pdf') await exportPDF(sp); else exportXLS(sp); toast('Reporte generado'); } catch (err) { console.error(err); toast('Error al exportar'); } setTimeout(() => ld.remove(), 400); }, 80);
    return;
  }
  if (d.act === 'export-backup') return exportBackup();
  if (d.act === 'trigger-restore') return $('#backupFile')?.click();
  if (d.act === 'add' && key) return editRecord(key);
  if (d.edit && key) return editRecord(key, d.edit);
  if (d.del && key) return confirmDlg('¿Eliminar este registro?', () => { const err = removeRecord(key, d.del); if (err) return toast(err); render(); toast('Eliminado'); });
  if (d.act === 'addm') return editMember();
  if (d.editm) return editMember(d.editm);
  if (d.delm) {
    if (!canEdit('ecl')) return toast('Sin permiso');
    return confirmDlg('¿Eliminar este miembro?', () => {
    db.members = db.members.filter(m => m.id !== d.delm);
    db.santacena.forEach(s => { s.asistentes = s.asistentes.filter(i => i !== d.delm); afterCloudWrite('santacena', s); });
    save('members'); afterCloudDelete('members', d.delm); render();
  });
  }
  if (d.act === 'addsc') return openForm('Nueva Santa Cena', [{ k: 'fecha', l: 'Fecha', t: 'date', req: 1 }], {}, o => {
    const s = { id: uid(), fecha: o.fecha, asistentes: [] }; db.santacena.push(s); save('santacena'); afterCloudWrite('santacena', s); go('sc', s.id);
  });
  if (d.delsc) return confirmDlg('¿Eliminar esta Santa Cena y su asistencia?', () => {
    db.santacena = db.santacena.filter(s => s.id !== d.delsc); save('santacena'); afterCloudDelete('santacena', d.delsc); render();
  });
  if (d.act === 'addu') return editUser();
  if (d.editu) return editUser(d.editu);
  if (d.delu) return confirmDlg('¿Eliminar este usuario?', () => { db.users = db.users.filter(u => u.id !== d.delu); save(); render(); });
});
document.addEventListener('input', e => {
  if (e.target.id === 'fq') { S.q = e.target.value; if (S.view === 'sc') refreshSantaDetail(); else refreshCurrent(); }
  if (e.target.id === 'kpm') { S.period = e.target.value || 'all'; return render(); }
  if (e.target.id === 'fm') { S.month = e.target.value; refreshCurrent(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'backupFile' && e.target.files && e.target.files[0]) {
    importBackup(e.target.files[0]);
    e.target.value = '';
    return;
  }
  if (e.target.dataset.flt !== undefined) { S.flt[e.target.dataset.flt] = e.target.value; return refreshCurrent(); }
  if (e.target.dataset.cierre !== undefined) {
    if (!canEdit('fin')) return;
    const m = monthNow(); db.cierres[m] = db.cierres[m] || {}; db.cierres[m][e.target.dataset.cierre] = e.target.checked; save(); return render();
  }
  const id = e.target.dataset.att; if (!id) return;
  const s = db.santacena.find(x => x.id === S.param); if (!s) return;
  s.asistentes = e.target.checked ? [...new Set([...s.asistentes, id])] : s.asistentes.filter(i => i !== id);
  save('santacena'); afterCloudWrite('santacena', s); $('#scn').textContent = s.asistentes.length;
  e.target.closest('.check').querySelector('small').textContent = `Recibió ${scCount(id)} vez/veces`;
});
function editRecord(key, id) {
  const m = MODS[key], cur = db[key].find(r => r.id === id);
  const base = cur || { etapa: S.etapa || undefined, estado: key === 'presupuestos' ? 'Borrador' : key === 'agendas' ? 'Programada' : undefined, periodo: key === 'presupuestos' ? (S.month || monthNow()) : undefined };
  openForm((id ? 'Editar ' : 'Nuevo registro · ') + m.title, m.fields, base, o => {
    const err = commitRecord(key, o, id);
    if (err) { toast(err); return false; }
    render(); toast('Guardado');
  });
}


/* ---------- instalación PWA (Android/iOS/Desktop) ---------- */
let deferredInstall = null;
let installDismissed = false;
try { installDismissed = localStorage.getItem('iglesia_install_dismiss_v1') === '1'; } catch (e) { }
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  paintInstallBanner();
});
window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  dismissInstall(true);
  toast('Aplicación instalada en este dispositivo');
});
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function dismissInstall(permanent) {
  const b = document.getElementById('installBanner');
  if (b) b.classList.add('hidden');
  if (permanent) {
    installDismissed = true;
    try { localStorage.setItem('iglesia_install_dismiss_v1', '1'); } catch (e) { }
  }
}
function paintInstallBanner() {
  const el = document.getElementById('installBanner');
  if (!el) return;
  if (isStandalone() || installDismissed) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  const ios = isIos();
  const canNative = !!deferredInstall;
  if (!canNative && !ios) {
    // Chrome/Edge desktop/android may fire later; still show guidance
  }
  el.classList.remove('hidden');
  el.innerHTML = `<div><b>Instale Casa de Oración</b><small>${ios
    ? 'En iPhone/iPad: toque Compartir → “Añadir a pantalla de inicio”.'
    : 'Descárguela como app en este móvil o computadora para usarla sin el navegador.'}</small></div>
    <div class="ib-actions">
      ${canNative ? '<button class="btn sm gold" data-act="install" type="button">Instalar</button>' : (ios ? '' : '<button class="btn sm gold" data-act="install" type="button">Cómo instalar</button>')}
      <button class="btn sm gray" data-act="dismiss-install" type="button">Ahora no</button>
    </div>`;
}
async function promptInstall() {
  if (deferredInstall) {
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) { }
    deferredInstall = null;
    paintInstallBanner();
    return;
  }
  if (isIos()) {
    toast('Compartir → Añadir a pantalla de inicio');
    return;
  }
  toast('Use el menú del navegador → Instalar aplicación / Añadir a inicio');
}

function showUpdateBanner(apply, notas) {
  if (document.getElementById('upd')) return;
  const b = document.createElement('div');
  b.id = 'upd';
  b.className = 'update-banner';
  b.innerHTML = `<div><b>Hay una actualización lista</b><small>${esc(notas || 'Se aplicará al confirmar. Los datos de este dispositivo se conservan.')}</small></div><button class="btn sm gold" type="button">Actualizar ahora</button>`;
  b.querySelector('button').onclick = () => { if (apply) apply(); else location.reload(); };
  document.body.appendChild(b);
}
function mountUpdater() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const offer = worker => { if (worker) showUpdateBanner(() => worker.postMessage({ type: 'SKIP_WAITING' })); };
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) offer(reg.waiting);
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
  }).catch(() => { });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  fetch('version.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(v => {
    if (v && v.version && v.version !== APP_VERSION) showUpdateBanner(null, v.notas);
  }).catch(() => { });
}
if (window.__IGLESIA_TEST) {
  window.APP = {
    get db() { return db; }, get me() { return me; }, set me(v) { me = v; },
    go, hash, ROLES, canView, canEdit, validateRecord, commitRecord, removeRecord, auditLog, save, render, S, TABLES, esc
  };
}
mountUpdater();
paintInstallBanner();
(async () => {
  // Descartar sesiones v1 que guardaban rol manipulable
  try {
    if (sessionStorage.getItem('iglesia_session_v1')) sessionStorage.removeItem('iglesia_session_v1');
  } catch (e) { }

  if (me && me.cloud) {
    if (!window.Cloud || !Cloud.enabled()) { me = null; persistSessionStub(); }
    else {
      const checked = await Cloud.sessionFromServer();
      if (!checked.ok) { me = null; persistSessionStub(); }
      else { me = checked.me; persistSessionStub(); }
    }
  } else if (me && !me.cloud) {
    if (isCloudProductionHost()) {
      me = null; persistSessionStub();
    } else if (!activeRole()) {
      me = null; persistSessionStub();
    }
  }

  if (isCloudProductionHost() && me && !me.cloud) {
    me = null; persistSessionStub();
  }

  render();
  if (me && me.cloud && window.Cloud && Cloud.enabled()) {
    try {
      await Cloud.pullAll(db);
      save();
      render();
    } catch (e) { }
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && me && me.cloud) {
      revalidateAuthz().then(ok => { if (!ok) { render(); toast('Sesión de nube expirada'); } });
    }
  });
})();



