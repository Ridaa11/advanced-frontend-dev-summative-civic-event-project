const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// List endpoints may return a bare array or an object wrapping one.
const asList = (data) => (Array.isArray(data) ? data : Object.values(data || {}).find(Array.isArray) || []);

const truncate = (text, max = 140) => {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max).trimEnd()}...` : s;
};

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'To be announced';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '');

const fmtDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return '--:--';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const humanize = (key) => {
  const s = String(key).replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const initials = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

const fileUrl = (path) =>
  /^https?:/i.test(path) ? path : `${CONFIG.FILES_URL}${String(path).startsWith('/') ? '' : '/'}${path}`;

const queryParam = (name) => new URLSearchParams(window.location.search).get(name);

const isActiveRegistration = (r) => !['cancelled', 'canceled'].includes(String(r.status || '').toLowerCase());

// Postgres returns COUNT() values as strings, so numeric strings count as numbers too.
const isNumeric = (v) => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)));

const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const PageCache = {
  get(key, maxAgeMs = 60000) {
    try {
      const entry = JSON.parse(sessionStorage.getItem(`civic_cache_${key}`));
      return entry && Date.now() - entry.t < maxAgeMs ? entry.v : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(`civic_cache_${key}`, JSON.stringify({ t: Date.now(), v: value }));
    } catch { /* cache is optional */ }
  },
  clear(key) {
    try {
      sessionStorage.removeItem(`civic_cache_${key}`);
    } catch { /* cache is optional */ }
  },
};