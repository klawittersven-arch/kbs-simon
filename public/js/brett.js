// Das Spielbrett: 4, 6 oder 8 Organ-Knöpfe, die aufleuchten und angetippt werden
import { bild } from './bilder.js';
import { partner } from './organe.js';
import { nurBilder } from './regeln.js';

// Farben der Knöpfe bei „Einfach“ (bei „Mittel“ und „Schwer“ sind alle gleich)
export const FARBEN = ['#ff5d73', '#4da3ff', '#ffc23d', '#3ddc97', '#b57bff', '#ff9447', '#2fd4e0', '#ff7ad9'];
const NEUTRAL = '#8f97e6';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function hex(c) { return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); }
export function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join('');
}

// Zufällige Reihenfolge der Plätze, möglichst anders als vorher
export function mischen(n, alt) {
  for (let tries = 0; tries < 8; tries++) {
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    const same = alt ? p.filter((x, k) => x === alt[k]).length : 0;
    if (same <= Math.floor(n / 4)) return p;
  }
  return Array.from({ length: n }, (_, i) => (i + 1) % n);
}

// „Hepar = Leber“
export function aufloesung(o) {
  return `<b>${esc(o.term)}</b> = ${esc(partner(o))}`;
}

/**
 * el: leeres Element. opts: { set: [{id, term}], modus, ansicht: 'handy' | 'beamer', onTap(i) }
 */
export function erstelleBrett(el, opts) {
  const { set, modus, ansicht } = opts;
  const n = set.length;
  const nurBild = nurBilder(modus) && ansicht !== 'beamer';
  el.innerHTML = '';
  el.className = `brett n${n} ${ansicht} modus-${modus}`;
  const grid = document.createElement('div');
  grid.className = 'kacheln';
  el.appendChild(grid);
  let enabled = false;
  const timers = new Map();

  const tiles = set.map((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kachel';
    b.dataset.i = i;
    const col = modus === 'fest' ? FARBEN[i] : NEUTRAL;
    b.style.setProperty('--c', col);
    b.style.setProperty('--c-bg', mix(col, '#151a44', 0.74));
    b.style.setProperty('--c-rand', mix(col, '#151a44', 0.35));
    b.innerHTML = `<span class="bild">${bild(o.id)}</span>` + (nurBild ? '' : `<span class="term">${esc(o.term)}</span>`);
    b.setAttribute('aria-label', nurBild ? 'Organbild' : o.term);
    b.disabled = true;
    const tap = e => {
      if (!enabled) return;
      e.preventDefault();
      opts.onTap && opts.onTap(i);
    };
    b.addEventListener('pointerdown', tap);
    // Tastatur (Enter/Leertaste) – pointerdown fehlt dann
    b.addEventListener('click', e => { if (e.detail === 0) tap(e); });
    grid.appendChild(b);
    return b;
  });

  // Begriffskarte für den Profi-Modus: zeigt beim Abspielen nur den Fachbegriff
  const karte = document.createElement('div');
  karte.className = 'begriffkarte';
  karte.hidden = true;
  el.appendChild(karte);

  let perm = set.map((_, i) => i);
  function layout(p) {
    perm = p.slice();
    p.forEach((i, pos) => { tiles[i].style.order = pos; });
  }
  layout(perm);

  function cls(i, c, ms) {
    const t = tiles[i];
    const key = i + c;
    clearTimeout(timers.get(key));
    t.classList.remove(c); void t.offsetWidth; t.classList.add(c);
    if (ms) timers.set(key, setTimeout(() => t.classList.remove(c), ms));
  }

  return {
    el, tiles, n, set,
    layout,
    get perm() { return perm; },
    // Organ i aufleuchten lassen (beim Vorspielen). „Schwer“: nur das neue Organ als Wort
    leuchte(i, ms) {
      if (window.__simonLog) window.__simonLog.push(i); // nur für automatische Tests
      if (nurBilder(modus)) {
        karte.innerHTML = (modus === 'schwer' ? '<small>NEU:</small>' : '') + `<span>${esc(set[i].term)}</span>`;
        karte.hidden = false;
        karte.classList.remove('an'); void karte.offsetWidth; karte.classList.add('an');
        clearTimeout(timers.get('karte'));
        timers.set('karte', setTimeout(() => { karte.classList.remove('an'); karte.innerHTML = '<span>?</span>'; }, ms));
      } else cls(i, 'an', ms);
    },
    karteZeigen(on) {
      karte.hidden = !on;
      if (!on) karte.classList.remove('an');
      if (on && !karte.classList.contains('an')) karte.innerHTML = '<span>?</span>';
      el.classList.toggle('mit-karte', !!on);
    },
    // Rückmeldung beim Tippen
    blitz(i, art, ms = 260) { cls(i, art, ms); },
    aus() {
      for (const [, t] of timers) clearTimeout(t);
      timers.clear();
      tiles.forEach(t => t.classList.remove('an', 'ok', 'falsch', 'soll', 'tipp'));
      karte.classList.remove('an');
      karte.innerHTML = '<span>?</span>';
    },
    eingabe(on) {
      enabled = !!on;
      el.classList.toggle('aktiv', enabled);
      tiles.forEach(t => { t.disabled = !enabled; });
    },
    gedimmt(on) { el.classList.toggle('gedimmt', !!on); },
  };
}
