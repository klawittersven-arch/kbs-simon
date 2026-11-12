// Übungsseite: allein spielen, ohne Klasse und ohne Server
import { store } from './net.js';
import { erstelleBrett, esc } from './brett.js';
import { SoloSpiel } from './spiel.js';
import { folge, zieheSet, zufallsSeed, GROESSEN, MODI, MODUS_TEXT, BEGRIFFE, BEGRIFFE_TEXT, ZEITEN, ZEIT_TEXT, merkText, tippText } from './regeln.js';
import { ORGANE } from './organe.js';
import { Ton } from './ton.js';
import { spielfeldZeigen, status, zeitbalken, zeitbalkenZeigen, countdown, setListe, fehlerAufloesung, organeText, wachHalten } from './ui.js';

const $ = s => document.querySelector(s);
const panel = $('#panel');
const opt = Object.assign({ n: 4, modus: 'fest', begriffe: 'fach', zeit: 'an' }, store('simon.ueben') || {});
if (!MODI.includes(opt.modus)) opt.modus = 'fest'; // z. B. alte Einstellung „Gemischt“
if (!BEGRIFFE.includes(opt.begriffe)) opt.begriffe = 'fach';
if (!ZEITEN.includes(opt.zeit)) opt.zeit = 'an';
let rekorde = store('simon.rekorde') || {};
let spiel = null;

// Auch beim Üben bleibt das Handy stumm
Ton.an = false;

// Rekorde getrennt nach Einstellungen (ohne Zeitlimit zählt extra)
const rkey = () => opt.n + ':' + opt.modus + (opt.zeit === 'aus' ? ':ohne-zeit' : '');

function seg(name, options, value, onPick) {
  return `<div class="seg c${options.length}" role="radiogroup" aria-label="${esc(name)}" data-name="${esc(name)}">${options.map(([v, l]) => `<button type="button" role="radio" data-v="${esc(v)}" aria-checked="${v === value}">${esc(l)}</button>`).join('')}</div>`;
}

function menu() {
  spielfeldZeigen(false);
  wachHalten(false);
  const rek = rekorde[rkey()];
  panel.innerHTML = `
    <div class="card">
      <h2>Merk dir die Organe!</h2>
      <p>Die Organe leuchten nacheinander auf. Tippe sie in derselben Reihenfolge nach. Jede Runde kommt ein Organ dazu. Wie weit kommst du?</p>
      <div class="settings">
        <div><div class="lbl">Organe</div>${seg('n', GROESSEN.map(n => [String(n), n + ' Organe']), String(opt.n))}</div>
        <div><div class="lbl">Schwierigkeit</div>${seg('modus', Object.entries(MODUS_TEXT).map(([k, v]) => [k, v.name]), opt.modus)}<p class="hint" id="mDesc" style="margin-top:6px">${esc(MODUS_TEXT[opt.modus].kurz)}</p></div>
        <div><div class="lbl">Zeitlimit</div>${seg('zeit', Object.entries(ZEIT_TEXT).map(([k, v]) => [k, v.name]), opt.zeit)}<p class="hint" id="zDesc" style="margin-top:6px">${esc(ZEIT_TEXT[opt.zeit].kurz.replace(/ Hängt.*$/, ''))}</p></div>
        <div><div class="lbl">Begriffe</div>${seg('begriffe', Object.entries(BEGRIFFE_TEXT).map(([k, v]) => [k, v.split(' (')[0]]), opt.begriffe)}</div>
      </div>
      <p class="hint" id="rek">${rek ? `Dein Rekord mit diesen Einstellungen: <b>${organeText(rek)}</b>` : 'Die Organe werden jedes Mal neu ausgelost.'}</p>
      <button class="big-btn" id="btnGo">Spielen</button>
    </div>
    <p class="foot">Klassenturnier mit Beamer: <a class="mehr" href="lehrer">Klassenmodus für Lehrkräfte</a><br>© 2026 Sven Klawitter · Karoline-Breitinger-Schule</p>`;
  panel.querySelectorAll('.seg').forEach(g => {
    g.querySelectorAll('button').forEach(b => b.onclick = () => {
      g.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      const name = g.dataset.name;
      opt[name] = name === 'n' ? Number(b.dataset.v) : b.dataset.v;
      store('simon.ueben', opt);
      if (name === 'modus') $('#mDesc').textContent = MODUS_TEXT[opt.modus].kurz;
      if (name === 'zeit') $('#zDesc').textContent = ZEIT_TEXT[opt.zeit].kurz.replace(/ Hängt.*$/, '');
      const r = rekorde[rkey()];
      $('#rek').innerHTML = r ? `Dein Rekord mit diesen Einstellungen: <b>${organeText(r)}</b>` : 'Die Organe werden jedes Mal neu ausgelost.';
    });
  });
  $('#btnGo').onclick = start;
}

function start() {
  const seed = zufallsSeed();
  const set = zieheSet(seed, opt.n, opt.begriffe, ORGANE);
  const seq = folge(seed, opt.n);
  const brett = erstelleBrett($('#brett'), { set, modus: opt.modus, ansicht: 'handy', onTap: i => spiel && spiel.tap(i) });
  spiel = new SoloSpiel({
    brett, seq, modus: opt.modus, n: opt.n, zeit: opt.zeit,
    onPhase: (ph, len) => {
      const r = `Runde ${len}<small>${organeText(len)} merken</small>`;
      if (ph === 'merken') status(r, merkText(opt.modus), 'merken');
      else if (ph === 'tippen') status(r, tippText(opt.modus), 'tippen');
      else status(r, 'Richtig! ✓', 'tippen');
    },
    onZeit: (rest, ges) => zeitbalken(rest, ges),
    onEnde: r => setTimeout(() => ende(r, set), 2100),
  });
  spielfeldZeigen(true);
  wachHalten(true);
  zeitbalkenZeigen(opt.zeit !== 'aus');
  zeitbalken(null);
  status('', '', '');
  let s = 3;
  const cd = () => { if (s === 0) { countdown(null); return; } countdown(s, 'Merk dir die Reihenfolge!'); s--; setTimeout(cd, 800); };
  cd();
  spiel.start(1500);
}

function ende(r, set) {
  spielfeldZeigen(false);
  wachHalten(false);
  const k = rkey(), alt = rekorde[k] || 0, neu = r.lvl > alt;
  if (neu) { rekorde[k] = r.lvl; store('simon.rekorde', rekorde); }
  panel.innerHTML = `
    <div class="card ${neu ? 'good' : 'bad'}">
      <h2>${neu && r.lvl > 0 ? 'Neuer Rekord! 🎉' : r.why === 'zeit' ? 'Zeit abgelaufen!' : 'Fehler!'}</h2>
      <div class="bigstat"><b>${r.lvl}</b><span>${r.lvl === 1 ? 'Organ' : 'Organe'} in der richtigen Reihenfolge${!neu && alt ? ` · Rekord: ${alt}` : ''}</span></div>
      ${fehlerAufloesung(set, r)}
      <button class="big-btn" id="btnAgain">Nochmal</button>
      <button class="ghost-btn" id="btnMenu">Einstellungen</button>
    </div>
    <div class="card"><h3>Die Organe dieser Runde</h3>${setListe(set)}</div>`;
  $('#btnAgain').onclick = start;
  $('#btnMenu').onclick = menu;
}

menu();
