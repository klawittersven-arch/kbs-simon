// Gemeinsame Anzeige-Bausteine für Handy und Übungsseite
import { bild } from './bilder.js';
import { organ } from './organe.js';
import { esc } from './brett.js';

const $ = s => document.querySelector(s);

export function spielfeldZeigen(on) {
  document.body.classList.toggle('spielt', !!on);
  $('#spielfeld').hidden = !on;
  $('#panel').hidden = !!on;
}

export function status(runde, text, art) {
  $('#sRunde').innerHTML = runde;
  const t = $('#sText');
  t.textContent = text;
  t.className = 'hinweis ' + (art || '');
}

export function zeitbalken(rest, gesamt) {
  const box = $('#sBarBox'), bar = $('#sBar');
  if (rest == null) { bar.style.transform = 'scaleX(0)'; box.classList.remove('knapp'); return; }
  const f = Math.max(0, Math.min(1, rest / gesamt));
  bar.style.transform = `scaleX(${f})`;
  box.classList.toggle('knapp', rest < 3000);
}

export function countdown(num, text) {
  const el = $('#countdown');
  if (num == null) { el.hidden = true; return; }
  el.hidden = false;
  const b = $('#cdNum');
  if (b.textContent !== String(num)) { b.textContent = num; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
  $('#cdText').textContent = text || '';
}

// Ein Organ mit Bild, Fachbegriff und deutschem Wort
export function organZeile(o, label, cls = '') {
  if (!o) return '';
  const g = organ(o.id);
  return `<div class="richtig ${cls}"><span class="mini">${bild(o.id)}</span><div>${label ? `<span>${esc(label)}</span>` : ''}<b>${esc(o.term)}</b><span>= ${esc(g ? g.de : '')}</span></div></div>`;
}

// Liste der Organe einer Runde mit Auflösung
export function setListe(set) {
  return `<ul class="olist">${set.map(o => {
    const g = organ(o.id);
    return `<li><span class="mini">${bild(o.id)}</span><span><b>${esc(o.term)}</b> = ${esc(g ? g.de : '')}</span></li>`;
  }).join('')}</ul>`;
}

// Auflösung nach einem Fehler: was richtig gewesen wäre (und was getippt wurde)
export function fehlerAufloesung(set, f) {
  if (!f || !set) return '';
  let h = '';
  if (f.want >= 0 && set[f.want]) h += organZeile(set[f.want], f.why === 'zeit' ? 'Als Nächstes wäre dran gewesen:' : 'Richtig wäre gewesen:', 'ok');
  if (f.why !== 'zeit' && f.got >= 0 && set[f.got]) h += organZeile(set[f.got], 'Du hast getippt:', 'bad');
  return h;
}

export const organeText = n => n === 1 ? '1 Organ' : n + ' Organe';

let toastT = 0;
export function toast(t) {
  const el = $('#toast'); if (!el) return;
  el.textContent = t; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200);
}

// Bildschirm nicht ausgehen lassen, solange gespielt wird
let lock = null, lockWanted = false;
export async function wachHalten(on) {
  lockWanted = !!on;
  try {
    if (on && !lock && navigator.wakeLock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { lock = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && lockWanted) wachHalten(true); });
