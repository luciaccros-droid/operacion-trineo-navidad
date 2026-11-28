import { descifrar, normalizar } from './cripto.js';
import * as W from './widgets.js';

const { el } = W;
const CLAVE_LS = 'archivo-trineo-v1';
const app = document.getElementById('app');

/* ---------- Estado ---------- */
const vacio = () => ({ visto: false, hechos: {}, secretos: {}, premios: {}, inv: [], claves: [], pistas: {}, regTitulo: null, maestra: null, final: null });
function cargar() {
  try { return Object.assign(vacio(), JSON.parse(localStorage.getItem(CLAVE_LS)) || {}); } catch { return vacio(); }
}
let P = cargar();
const guardar = () => { try { localStorage.setItem(CLAVE_LS, JSON.stringify(P)); } catch { /* sin almacenamiento */ } };

function reiniciar() {
  try { localStorage.removeItem(CLAVE_LS); } catch { /* sin almacenamiento */ }
  P = vacio();
  for (const k in cache) delete cache[k];
}

const params = new URLSearchParams(location.search);
if (params.has('prueba')) sessionStorage.setItem('modo-prueba', '1');
if (params.has('reiniciar')) { reiniciar(); history.replaceState(null, '', location.pathname + (prueba() ? '?prueba' : '')); }
const prueba = () => sessionStorage.getItem('modo-prueba') === '1';

/* ---------- Fechas ---------- */
let D = null;
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: D.zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function fechaDia(n) {
  const [a, m, d] = D.inicio.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n - 1)).toISOString().slice(0, 10);
}
const fechaOk = (n) => prueba() || hoy() >= fechaDia(n);
const tieneLlave = (n) => n === 1 || Boolean(P.secretos[n]);
const numHechos = () => Object.keys(P.hechos).filter((n) => Number(n) <= 23).length;
const diaTexto = (n) => Number(fechaDia(n).slice(8)) + ' dic';

/* ---------- Contenido ---------- */
const cache = {};
async function cuerpo(n) {
  if (cache[n]) return cache[n];
  const d = D.dias[n - 1];
  cache[n] = n === 1 ? d.c : await descifrar(d.e, P.secretos[n]);
  return cache[n];
}

function aplicarPremio(n, premio) {
  P.hechos[n] = true;
  if (premio.siguiente) P.secretos[n + 1] = premio.siguiente;
  const { siguiente, ...resto } = premio;
  P.premios[n] = resto;
  for (const it of premio.inventario || []) if (!P.inv.some((x) => x.id === it.id)) P.inv.push(it);
  for (const c of premio.claves || []) if (!P.claves.includes(c)) P.claves.push(c);
  if (premio.registroTitulo) P.regTitulo = premio.registroTitulo;
  guardar();
}

/* ---------- Estructura ---------- */
function barraPrueba() {
  if (!prueba()) return null;
  return el('div', { class: 'barra-prueba' },
    el('strong', {}, 'MODO PRUEBA · fechas ignoradas'),
    el('button', { type: 'button', class: 'btn btn-mini', onclick: (e) => {
      const b = e.currentTarget;
      if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { b.dataset.seguro = ''; b.textContent = 'Reiniciar progreso'; }, 4000); return; }
      reiniciar(); panel();
    } }, 'Reiniciar progreso'),
    el('button', { type: 'button', class: 'btn btn-mini', onclick: () => { sessionStorage.removeItem('modo-prueba'); location.href = location.pathname; } }, 'Salir'));
}

function marco(contenido, pestana) {
  app.replaceChildren();
  const b = barraPrueba();
  if (b) app.append(b);
  const nav = el('nav', { class: 'nav', 'aria-label': 'Secciones' });
  [['expedientes', 'Expedientes', panel], ['objetos', 'Objetos', objetos], ['claves', 'Claves', claves], ['registro', 'Registro de campo', registro]]
    .forEach(([id, txt, fn]) => nav.append(el('button', { type: 'button', class: 'nav-btn' + (pestana === id ? ' activo' : ''), 'aria-current': pestana === id ? 'page' : 'false', onclick: () => fn() }, txt)));
  app.append(
    el('header', { class: 'cabecera' },
      el('div', { class: 'logo' }, el('span', { class: 'logo-sub' }, 'ARCHIVO CENTRAL'), el('h1', {}, 'OPERACIÓN TRINEO')),
      el('div', { class: 'progreso' }, el('span', {}, 'Expedientes'), el('strong', {}, `${numHechos()}/23`))),
    nav, el('main', { class: 'contenido' }, contenido));
  window.scrollTo(0, 0);
}

/* ---------- Bienvenida ---------- */
function bienvenida() {
  app.replaceChildren(el('section', { class: 'bienvenida' },
    el('div', { class: 'sello' }, 'CONFIDENCIAL'),
    el('p', { class: 'logo-sub' }, 'Archivo confidencial de fin de año'),
    el('h1', {}, 'OPERACIÓN TRINEO'),
    el('p', {}, 'Se ha detectado actividad inusual en el archivo de fin de año. La información está fragmentada y protegida por varios niveles de seguridad.'),
    el('p', {}, 'Tu misión: recuperar los expedientes, conectar las pruebas y reconstruir el archivo final. Hay una cita importante antes de que termine el año. El objetivo exacto permanece clasificado.'),
    el('p', {}, 'Cada día se desbloquea un expediente nuevo. Resuélvelo para poder abrir el siguiente.'),
    el('button', { type: 'button', class: 'btn btn-grande', onclick: () => { P.visto = true; guardar(); panel(); } }, 'Acceder al archivo')));
}

/* ---------- Panel ---------- */
function panel() {
  const rejilla = el('div', { class: 'casillas' });
  for (let n = 1; n <= 24; n++) {
    let estado, etiqueta;
    if (n === 24) {
      estado = P.final ? 'hecho' : (fechaOk(24) && P.hechos[23] ? 'abierto' : 'sellado');
      etiqueta = P.final ? 'DESCLASIFICADO' : (estado === 'abierto' ? 'LISTO' : 'ARCHIVO FINAL');
    } else if (P.hechos[n]) { estado = 'hecho'; etiqueta = 'RECUPERADO'; }
    else if (!fechaOk(n)) { estado = 'sellado'; etiqueta = 'Sellado · ' + diaTexto(n); }
    else if (!tieneLlave(n)) { estado = 'cadena'; etiqueta = 'Falta el anterior'; }
    else { estado = 'abierto'; etiqueta = 'DISPONIBLE'; }
    const abrible = estado === 'hecho' || estado === 'abierto';
    rejilla.append(el('button', {
      type: 'button', class: `casilla ${estado}${n === 24 ? ' final' : ''}`, 'aria-disabled': abrible ? 'false' : 'true',
      'aria-label': `Expediente ${n}: ${etiqueta}`,
      onclick: () => { if (abrible) (n === 24 ? archivoFinal() : expediente(n)); else avisar(estado, n); }
    }, el('span', { class: 'casilla-num' }, String(n).padStart(2, '0')), el('span', { class: 'casilla-estado' }, (estado === 'hecho' ? '✓ ' : estado === 'abierto' ? '' : '🔒 ') + etiqueta)));
  }
  const aviso = el('p', { class: 'aviso', 'aria-live': 'polite' });
  function avisar(estado, n) {
    aviso.textContent = estado === 'cadena' ? 'Antes tienes que recuperar el expediente anterior.' : (n === 24 ? 'El archivo todavía no está listo para abrirse.' : `Expediente sellado hasta el ${diaTexto(n)}.`);
  }
  marco(el('div', {}, el('h2', {}, 'Expedientes'), rejilla, aviso), 'expedientes');
}

/* ---------- Expediente ---------- */
async function expediente(n) {
  marco(el('p', { class: 'cargando' }, 'Descifrando expediente…'), 'expedientes');
  let c;
  try { c = await cuerpo(n); } catch { marco(el('p', {}, 'No se ha podido abrir este expediente.'), 'expedientes'); return; }
  const hecho = Boolean(P.hechos[n]);
  const nivel = () => P.pistas[n] || 0;
  const zona = el('article', { class: 'expediente' });
  zona.append(
    el('button', { type: 'button', class: 'btn btn-mini volver', onclick: panel }, '← Volver a expedientes'),
    el('p', { class: 'exp-id' }, `EXP-${String(n).padStart(2, '0')} · ${diaTexto(n)}`),
    el('h2', {}, c.titulo),
    ...(hecho ? [el('div', { class: 'sello sello-ok' }, 'EXPEDIENTE RECUPERADO')] : []),
    el('p', { class: 'narrativa' }, c.texto));

  let widget = null, ranuras = null;
  if (c.widget) {
    const t = c.widget.tipo;
    if (t === 'rueda') widget = W.rueda();
    else if (t === 'linterna') widget = W.linterna(c.widget);
    else if (t === 'luces') widget = W.luces(c.widget);
    else if (t === 'zoom') widget = W.zoom(c.widget, hecho ? 99 : nivel());
    else if (t === 'audio') widget = W.audio(c.widget);
    else if (t === 'simon') widget = W.simon(c.widget, hecho);
    else if (t === 'ranuras') ranuras = W.ranuras(c.widget);
    else if (t === 'rejilla') widget = W.rejillaWidget(c.widget);
    else if (t === 'voltear') widget = W.voltear();
    else if (t === 'espejo') widget = W.espejo(c.widget);
    if (widget) zona.append(widget);
  }
  if (c.enunciado) zona.append(el('div', { class: 'enunciado' }, c.enunciado));

  const resultado = el('div', { class: 'resultado', 'aria-live': 'polite' });
  const mostrarPremio = (premio) => {
    resultado.replaceChildren(el('p', { class: 'exito' }, premio.texto || 'Expediente recuperado.'));
    if (premio.widget?.tipo === 'linterna') resultado.append(W.linterna(premio.widget));
    if (n < 23) resultado.append(el('p', { class: 'nota' }, 'Este dato volverá a ser útil.'));
  };

  if (hecho) {
    if (P.premios[n]) mostrarPremio(P.premios[n]);
  } else if (c.tipo === 'archivo') {
    zona.append(el('button', { type: 'button', class: 'btn btn-grande', onclick: () => { aplicarPremio(n, c.premio); expediente(n); } }, 'Archivar expediente'));
  } else {
    const campo = el('input', { type: 'text', class: 'campo', id: 'respuesta', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
    const boton = el('button', { type: 'submit', class: 'btn btn-grande' }, 'Validar');
    const form = el('form', { class: 'formulario' });
    if (ranuras) form.append(el('p', { class: 'etiqueta' }, 'Respuesta'), ranuras);
    else form.append(el('label', { for: 'respuesta', class: 'etiqueta' }, 'Respuesta'), campo);
    form.append(boton);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const intento = normalizar(ranuras ? ranuras.valor() : campo.value);
      if (!intento) return;
      boton.disabled = true; boton.textContent = 'Verificando…';
      let premio = null;
      for (const caja of D.dias[n - 1].cajas) {
        try { premio = await descifrar(caja, intento); break; } catch { /* no coincide */ }
      }
      boton.disabled = false; boton.textContent = 'Validar';
      if (!premio) { resultado.replaceChildren(el('p', { class: 'error' }, 'Código no reconocido. El archivo sigue cerrado. Puedes intentarlo las veces que quieras.')); return; }
      aplicarPremio(n, premio);
      expediente(n);
    });
    zona.append(form);
  }

  if (c.pistas?.length && !hecho) {
    const caja = el('div', { class: 'pistas' });
    const pintar = () => {
      caja.replaceChildren(el('h3', {}, 'Ayuda'));
      c.pistas.slice(0, nivel()).forEach((p, i) => caja.append(el('p', { class: 'pista' }, el('strong', {}, `Pista ${i + 1}: `), p)));
      if (nivel() < c.pistas.length) caja.append(el('button', { type: 'button', class: 'btn btn-mini', onclick: () => { P.pistas[n] = nivel() + 1; guardar(); pintar(); widget?.fijar?.(nivel()); } }, `Solicitar pista ${nivel() + 1}`));
    };
    pintar();
    zona.append(caja);
  }
  zona.append(resultado);
  marco(zona, 'expedientes');
}

/* ---------- Archivo final ---------- */
function vistaFinal(f) {
  return el('article', { class: 'expediente revelacion' },
    el('button', { type: 'button', class: 'btn btn-mini volver', onclick: panel }, '← Volver a expedientes'),
    el('div', { class: 'sello sello-ok' }, 'ACCESO CONCEDIDO'),
    el('h2', {}, 'ARCHIVO FINAL'),
    el('blockquote', { class: 'mensaje-final' }, f.mensaje),
    el('p', { class: 'cierre' }, f.cierre),
    el('button', { type: 'button', class: 'btn btn-grande', onclick: registro }, 'Abrir el registro de campo'));
}

function archivoFinal() {
  if (P.final) { marco(vistaFinal(P.final), 'expedientes'); return; }
  const campo = el('input', { type: 'text', class: 'campo', id: 'maestra', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
  const resultado = el('div', { class: 'resultado', 'aria-live': 'polite' });
  const boton = el('button', { type: 'submit', class: 'btn btn-grande' }, 'Abrir archivo');
  const form = el('form', { class: 'formulario' }, el('label', { for: 'maestra', class: 'etiqueta' }, 'Clave maestra'), campo, boton);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const intento = normalizar(campo.value);
    if (!intento) return;
    boton.disabled = true; boton.textContent = 'Verificando…';
    try {
      const f = await descifrar(D.dias[23].final, intento);
      P.final = f; P.maestra = intento; guardar();
      marco(vistaFinal(f), 'expedientes');
    } catch {
      boton.disabled = false; boton.textContent = 'Abrir archivo';
      resultado.replaceChildren(el('p', { class: 'error' }, 'Clave no reconocida. Revisa el orden de las palabras y la firma.'));
    }
  });
  marco(el('article', { class: 'expediente' },
    el('button', { type: 'button', class: 'btn btn-mini volver', onclick: panel }, '← Volver a expedientes'),
    el('p', { class: 'exp-id' }, 'ARCHIVO FINAL · 24 dic'),
    el('h2', {}, 'Ha llegado el momento'),
    el('p', { class: 'narrativa' }, 'Introduce la clave maestra: las cuatro palabras de capítulo en orden y la firma.'),
    form, resultado), 'expedientes');
}

/* ---------- Objetos y claves ---------- */
function objetos() {
  const lista = el('div', { class: 'objetos' });
  if (!P.inv.length) lista.append(el('p', { class: 'nota' }, 'Todavía no has recuperado ningún objeto.'));
  for (const it of P.inv) {
    const tarjeta = el('section', { class: 'objeto' }, el('h3', {}, it.nombre));
    if (it.tipo === 'rueda') tarjeta.append(W.rueda());
    if (it.tipo === 'rejilla') tarjeta.append(W.rejilla(it));
    if (it.texto) tarjeta.append(el('p', { class: 'objeto-texto' }, it.texto));
    lista.append(tarjeta);
  }
  marco(el('div', {}, el('h2', {}, 'Objetos recuperados'), el('p', { class: 'nota' }, 'No todos los objetos del inventario son lo que parecen.'), lista), 'objetos');
}

function claves() {
  const lista = el('ul', { class: 'claves' });
  if (!P.claves.length) lista.append(el('li', { class: 'nota' }, 'Aún no hay claves.'));
  for (const c of P.claves) lista.append(el('li', {}, c));
  marco(el('div', {}, el('h2', {}, 'Claves encontradas'), lista), 'claves');
}

/* ---------- Registro de campo ---------- */
async function registro() {
  const titulo = P.final ? P.final.registroTitulo : (P.regTitulo || 'REGISTRO DE CAMPO — OPERATIVO DESCONOCIDO');
  const zona = el('div', {}, el('h2', {}, titulo));
  marco(zona, 'registro');
  let R = { entradas: [] };
  try { const r = await fetch('data/registro.json', { cache: 'no-store' }); if (r.ok) R = await r.json(); } catch { /* sin registro */ }
  const entradas = [...R.entradas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!entradas.length) { zona.append(el('p', { class: 'nota' }, 'Sin registros archivados por ahora.')); return; }
  if (!P.final) zona.append(el('p', { class: 'nota' }, 'Nuevo registro archivado. La preparación continúa. Conserva las fechas: quizá este documento tenga más importancia de la que parece.'));
  for (const e of entradas) {
    const fecha = new Date(e.fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const tarjeta = el('section', { class: 'registro-entrada' }, el('p', { class: 'exp-id' }, 'REGISTRO · ' + fecha));
    zona.append(tarjeta);
    if (!P.final) { tarjeta.append(el('p', { class: 'clasificado' }, 'CLASIFICADO')); continue; }
    try {
      const d = await descifrar(e.d, P.maestra);
      if (d.foto) tarjeta.append(el('img', { src: d.foto, alt: 'Fotografía del registro del ' + fecha, class: 'registro-foto' }));
      const dl = el('dl', { class: 'registro-datos' });
      for (const [k, v] of d.filas || []) if (v) dl.append(el('dt', {}, k), el('dd', {}, v));
      tarjeta.append(dl);
      if (d.nota) tarjeta.append(el('p', {}, d.nota));
    } catch { tarjeta.append(el('p', { class: 'nota' }, 'No se ha podido abrir este registro.')); }
  }
}

/* ---------- Arranque ---------- */
(async function iniciar() {
  try {
    D = await (await fetch('data/expedientes.json', { cache: 'no-store' })).json();
  } catch {
    app.replaceChildren(el('p', { class: 'error' }, 'No se ha podido cargar el archivo. Comprueba la conexión.'));
    return;
  }
  if (P.visto) panel(); else bienvenida();
})();
