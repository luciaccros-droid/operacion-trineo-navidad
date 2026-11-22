// Herramientas interactivas de los expedientes.
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const h of hijos) if (h != null) e.append(h);
  return e;
}
export { el };

/* ---------- Rueda de cifrado ---------- */
export function rueda() {
  let giro = 0;
  const caja = el('div', { class: 'widget rueda' });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 300');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Rueda de cifrado de dos anillos');
  const paso = 360 / 26;
  const anillo = (radio, clase) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', clase);
    [...ABC].forEach((l, i) => {
      const t = document.createElementNS(NS, 'text');
      t.textContent = l;
      t.setAttribute('x', 150);
      t.setAttribute('y', 150 - radio);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('transform', `rotate(${i * paso} 150 150)`);
      g.append(t);
    });
    return g;
  };
  const fondo = document.createElementNS(NS, 'circle');
  Object.entries({ cx: 150, cy: 150, r: 142, class: 'rueda-fondo' }).forEach(([k, v]) => fondo.setAttribute(k, v));
  const interior = document.createElementNS(NS, 'circle');
  Object.entries({ cx: 150, cy: 150, r: 104, class: 'rueda-interior' }).forEach(([k, v]) => interior.setAttribute(k, v));
  const marca = document.createElementNS(NS, 'path');
  marca.setAttribute('d', 'M150 2 l-7 -0 l7 12 l7 -12 z');
  marca.setAttribute('class', 'rueda-marca');
  const exterior = anillo(124, 'anillo-ext');
  const movil = anillo(86, 'anillo-int');
  svg.append(fondo, interior, exterior, movil, marca);
  const etiqueta = el('p', { class: 'rueda-etiqueta', 'aria-live': 'polite' });
  const pintar = () => {
    movil.style.transform = `rotate(${-giro * paso}deg)`;
    etiqueta.textContent = `La A mira a la ${ABC[(giro % 26 + 26) % 26]}`;
  };
  const botones = el('div', { class: 'fila-botones' },
    el('button', { type: 'button', class: 'btn', onclick: () => { giro--; pintar(); }, 'aria-label': 'Girar anillo interior a la izquierda' }, '◀ Girar'),
    el('button', { type: 'button', class: 'btn', onclick: () => { giro++; pintar(); }, 'aria-label': 'Girar anillo interior a la derecha' }, 'Girar ▶'));
  caja.append(svg, etiqueta, botones);
  pintar();
  return caja;
}

/* ---------- Linterna ---------- */
export function linterna(cfg) {
  const caja = el('div', { class: 'widget' });
  const panel = el('div', { class: 'linterna', role: 'img', 'aria-label': (cfg.etiqueta || 'Documento') + '. Pasa la linterna para leerlo.' });
  const tinta = el('div', { class: 'linterna-tinta' });
  const bloque = el('div', { class: 'linterna-texto' });
  bloque.style.left = (cfg.x ?? 50) + '%';
  bloque.style.top = (cfg.y ?? 50) + '%';
  for (const l of cfg.lineas) bloque.append(el('div', {}, l));
  tinta.append(bloque);
  panel.append(el('span', { class: 'linterna-etiqueta' }, cfg.etiqueta || ''), tinta);
  const mover = (x, y) => {
    const r = panel.getBoundingClientRect();
    tinta.style.setProperty('--x', (x - r.left) + 'px');
    tinta.style.setProperty('--y', (y - r.top) + 'px');
    panel.classList.add('encendida');
  };
  panel.addEventListener('pointermove', (e) => mover(e.clientX, e.clientY));
  panel.addEventListener('pointerdown', (e) => { panel.setPointerCapture?.(e.pointerId); mover(e.clientX, e.clientY); });
  panel.addEventListener('pointerleave', () => panel.classList.remove('encendida'));
  caja.append(panel, el('p', { class: 'nota' }, 'Arrastra el dedo o el ratón por el recuadro.'));
  return caja;
}

/* ---------- Luces del árbol ---------- */
export function luces(cfg) {
  const caja = el('div', { class: 'widget luces' });
  cfg.tiras.forEach((tira, i) => {
    const fila = el('div', { class: 'tira', role: 'img', 'aria-label': `Tira ${i + 1}: ` + [...tira].map((b) => (b === '1' ? 'encendida' : 'apagada')).join(', ') });
    fila.append(el('span', { class: 'tira-num' }, String(i + 1)));
    for (const b of tira) fila.append(el('span', { class: 'bombilla ' + (b === '1' ? 'on' : 'off') }));
    caja.append(fila);
  });
  return caja;
}

/* ---------- Foto ampliada ---------- */
export function zoom(cfg, nivelInicial) {
  const caja = el('div', { class: 'widget' });
  const marco = el('div', { class: 'zoom' });
  const img = el('img', { src: cfg.src, alt: 'Imagen de la cámara de seguridad' });
  img.style.transformOrigin = cfg.origen || '50% 50%';
  marco.append(img, el('span', { class: 'zoom-rec' }, '● REC'));
  caja.append(marco);
  caja.fijar = (nivel) => {
    const z = nivel >= cfg.niveles.length ? 1 : cfg.niveles[nivel];
    img.style.transform = `scale(${z})`;
  };
  caja.fijar(nivelInicial);
  return caja;
}

/* ---------- Audio (caja de música y reloj) ---------- */
const MELODIA = [[67,1.5],[69,.5],[67,1],[64,3],[67,1.5],[69,.5],[67,1],[64,3],[74,2],[74,1],[71,3],[72,2],[72,1],[67,3],
  [69,2],[69,1],[72,1.5],[71,.5],[69,1],[67,1.5],[69,.5],[67,1],[64,3],[69,2],[69,1],[72,1.5],[71,.5],[69,1],
  [67,1.5],[69,.5],[67,1],[64,3],[74,2],[74,1],[77,1.5],[74,.5],[71,1],[72,3],[76,3],
  [72,1.5],[67,.5],[64,1],[67,1.5],[65,.5],[62,1],[60,6]];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let ctxAudio = null;

function nota(ctx, destino, f, t, dur, vol) {
  [1, 2, 4.2].forEach((mult, k) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f * mult;
    const v = vol / (k * 2.5 + 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, 0.9));
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + Math.max(dur, 0.9) + 0.05);
  });
}

function campana(ctx, destino, t) {
  [[1, .5], [2.0, .25], [2.76, .18], [5.4, .08]].forEach(([mult, v]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 110 * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + 1.7);
  });
}

export function audio(cfg) {
  const caja = el('div', { class: 'widget audio' });
  const estado = el('p', { class: 'nota', 'aria-live': 'polite' }, 'Transmisión lista.');
  let fin = 0;
  const btn = el('button', { type: 'button', class: 'btn btn-grande', onclick: () => {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (ctxAudio.currentTime < fin) return;
    const ctx = ctxAudio;
    const salida = ctx.createGain();
    salida.gain.value = 0.6;
    salida.connect(ctx.destination);
    const pulso = 0.45;
    let t = ctx.currentTime + 0.2;
    const inicio = t;
    const volMel = cfg.campanadas ? 0.12 : 0.25;
    for (const [m, b] of MELODIA) { nota(ctx, salida, hz(m), t, b * pulso, volMel); t += b * pulso; }
    const total = t - inicio;
    if (cfg.campanadas) {
      const hueco = (total - 2) / cfg.campanadas;
      for (let i = 0; i < cfg.campanadas; i++) campana(ctx, salida, inicio + 1 + i * hueco);
    }
    fin = t + 1;
    estado.textContent = 'Reproduciendo…';
    setTimeout(() => { estado.textContent = 'Fin de la transmisión. Puedes volver a escucharla.'; }, (total + 1) * 1000);
  } }, '▶ Reproducir transmisión');
  caja.append(btn, estado);
  return caja;
}

/* ---------- Bolas del árbol (memoria) ---------- */
export function simon(cfg, yaHecho) {
  const caja = el('div', { class: 'widget simon' });
  const bolas = [['★', 1, 72], ['●', 2, 76], ['◆', 3, 79], ['▲', 4, 84]];
  const estado = el('p', { class: 'nota', 'aria-live': 'polite' });
  const revelado = el('p', { class: 'revelado' });
  const tablero = el('div', { class: 'simon-tablero' });
  let ronda = 0, secuencia = [], pos = 0, escuchando = false;
  const sonar = (i) => {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    nota(ctxAudio, ctxAudio.destination, hz(bolas[i][2]), ctxAudio.currentTime + 0.01, 0.4, 0.25);
  };
  const botones = bolas.map(([sim, num], i) => {
    const b = el('button', { type: 'button', class: `bola bola-${i}`, 'aria-label': `Bola ${num}, ${sim}` }, el('span', {}, sim), el('small', {}, String(num)));
    b.addEventListener('click', () => pulsar(i));
    tablero.append(b);
    return b;
  });
  const iluminar = (i) => new Promise((ok) => {
    botones[i].classList.add('luz'); sonar(i);
    setTimeout(() => { botones[i].classList.remove('luz'); setTimeout(ok, 180); }, 480);
  });
  async function mostrar() {
    escuchando = false;
    estado.textContent = `Ronda ${ronda + 1} de ${cfg.rondas.length}: observa.`;
    await new Promise((r) => setTimeout(r, 600));
    for (const i of secuencia) await iluminar(i);
    pos = 0; escuchando = true;
    estado.textContent = `Ronda ${ronda + 1} de ${cfg.rondas.length}: tu turno.`;
  }
  function nuevaRonda() {
    secuencia = Array.from({ length: cfg.rondas[ronda] }, () => Math.floor(Math.random() * 4));
    mostrar();
  }
  function pulsar(i) {
    if (!escuchando) return;
    iluminar(i);
    if (i !== secuencia[pos]) { estado.textContent = 'Secuencia incorrecta. Vuelve a verla.'; escuchando = false; setTimeout(mostrar, 900); return; }
    pos++;
    if (pos === secuencia.length) {
      escuchando = false;
      ronda++;
      if (ronda === cfg.rondas.length) { estado.textContent = 'Acceso de memoria concedido.'; revelado.textContent = cfg.revelar; return; }
      setTimeout(nuevaRonda, 700);
    }
  }
  const empezar = el('button', { type: 'button', class: 'btn btn-grande', onclick: () => { ronda = 0; revelado.textContent = ''; nuevaRonda(); } }, 'Empezar secuencia');
  if (yaHecho) revelado.textContent = cfg.revelar;
  caja.append(tablero, empezar, estado, revelado);
  return caja;
}

/* ---------- Rejilla ---------- */
export function rejilla(item) {
  const tabla = el('table', { class: 'rejilla' });
  const cab = el('tr', {}, el('th', {}, ''));
  for (let c = 1; c <= 6; c++) cab.append(el('th', { scope: 'col' }, String(c)));
  tabla.append(cab);
  for (const [sim, letras] of item.filas) {
    const tr = el('tr', {}, el('th', { scope: 'row' }, sim));
    for (const l of letras) tr.append(el('td', {}, l));
    tabla.append(tr);
  }
  return tabla;
}

/* ---------- Ranuras ---------- */
export function ranuras(cfg) {
  const caja = el('div', { class: 'ranuras' });
  const campos = [];
  for (let i = 0; i < cfg.cantidad; i++) {
    const c = el('input', { type: 'text', class: 'campo', 'aria-label': `Ranura ${i + 1}`, autocomplete: 'off', autocapitalize: 'characters', placeholder: String(i + 1) });
    campos.push(c);
    caja.append(c);
  }
  caja.valor = () => campos.map((c) => c.value).join(' ');
  return caja;
}
