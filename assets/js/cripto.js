// Cifrado AES-GCM con clave derivada por PBKDF2 (Web Crypto). Funciona en navegador y en Node 18+.
const ITERACIONES = 120000;
const te = new TextEncoder();
const td = new TextDecoder();

export function normalizar(texto) {
  return String(texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function aB64(bytes) {
  const u = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}

function deB64(b64) {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

async function derivar(secreto, sal) {
  const base = await crypto.subtle.importKey('raw', te.encode(secreto), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function cifrar(objeto, secreto) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clave = await derivar(secreto, sal);
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, te.encode(JSON.stringify(objeto)));
  return { s: aB64(sal), i: aB64(iv), c: aB64(c) };
}

// Lanza un error si el secreto no es el correcto.
export async function descifrar(caja, secreto) {
  const clave = await derivar(secreto, deB64(caja.s));
  const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(caja.i) }, clave, deB64(caja.c));
  return JSON.parse(td.decode(p));
}
