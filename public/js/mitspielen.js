// Handy-Seite der SuS: anmelden, Qualifying allein spielen, im Finale die Folge vom Beamer nachtippen
import { KNet, randomId, store } from './net.js';
import { erstelleBrett, esc, mischen } from './brett.js';
import { SoloSpiel } from './spiel.js';
import { folge, zeitLimit, mischt, merkText, tippText } from './regeln.js';
import { Ton } from './ton.js';
import { spielfeldZeigen, status, zeitbalken, countdown, organZeile, setListe, fehlerAufloesung, organeText, toast, wachHalten } from './ui.js';

const $ = s => document.querySelector(s);
const panel = $('#panel'), netdot = $('#netdot'), btnTon = $('#btnTon');

const params = new URLSearchParams(location.search);
let code = (params.get('c') || params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
let pid = store('simon.pid');
if (!pid || !/^[a-z0-9]{8,24}$/.test(pid)) { pid = randomId(16); store('simon.pid', pid); }

let net = null, you = null, shown = '';
let Q = null;   // laufendes Qualifying-Spiel { nr, spiel, brett, ende }
let F = null;   // Finale { nr, brett, round, k, res, timers }

// ---------------------------------------------------------------- Ton
Ton.an = store('simon.ton.handy') === true;
function tonText() { btnTon.textContent = Ton.an ? 'Ton: an' : 'Ton: aus'; btnTon.setAttribute('aria-pressed', String(Ton.an)); }
tonText();
btnTon.onclick = () => { Ton.init(); Ton.an = !Ton.an; store('simon.ton.handy', Ton.an); tonText(); };
document.addEventListener('pointerdown', () => Ton.init(), { capture: true });

// ---------------------------------------------------------------- Verbindung
const serverNow = () => net ? net.serverNow() : Date.now();
function connect() {
  net = KNet({
    code, params: { role: 'player', pid },
    onMessage,
    onStatus: s => {
      netdot.dataset.s = s;
      if (s === 'offline' && net.stopped) {
        if (net.stopped === 'no-room') show('noroom', `<div class="card"><h2>Raum nicht gefunden</h2><p>Zum Code <b>${esc(code)}</b> gibt es gerade kein Spiel. Ist die Lehrer-Seite am Beamer geöffnet? Scanne den QR-Code noch einmal.</p><button class="big-btn" id="btnRetry">Nochmal versuchen</button></div>`, () => { $('#btnRetry').onclick = () => location.reload(); });
        else if (net.stopped === 'ended') show('ended', '<div class="card"><h2>Das Spiel ist beendet</h2><p>Die Lehrkraft hat die Sitzung geschlossen. Danke fürs Mitspielen!</p></div>');
      }
    },
  });
  net.open();
}
function send(obj) { if (net) net.send(obj, true); }

function onMessage(m) {
  // Uhrabgleich, falls die genaue Messung noch fehlt
  if (typeof m.now === 'number' && net.rtt > 5000) net.offset = m.now - Date.now();
  switch (m.t) {
    case 'you': you = m; update(); break;
    case 'q-ok': break;
    case 'kicked': you = null; stopQuali(); stopFinal(); store('simon.name', null); show('kicked', '<div class="card"><h2>Abgemeldet</h2><p>Die Lehrkraft hat deinen Namen entfernt. Du kannst dich mit einem anderen Namen neu anmelden.</p><button class="big-btn" id="btnAgain">Neu anmelden</button></div>', () => { $('#btnAgain').onclick = () => location.reload(); }); break;
    case 'error':
      if (m.why === 'bad-name') { const e = $('#joinErr'); if (e) { e.textContent = 'Bitte einen Vornamen (nur Buchstaben) und den ersten Buchstaben des Nachnamens eingeben.'; e.hidden = false; } }
      else if (m.why === 'full') toast('Das Spiel ist voll (60 Personen).');
      break;
  }
}

// ---------------------------------------------------------------- Anzeige
function show(key, html, after) {
  spielfeldZeigen(false);
  if (shown === key) return;
  shown = key;
  panel.innerHTML = html;
  after && after();
}

function update() {
  if (!you) return;
  const me = you.me;
  if (!me) {
    stopQuali(); stopFinal();
    return joinForm();
  }
  switch (you.phase) {
    case 'lobby': stopQuali(); stopFinal(); wachHalten(false); return show('lobby:' + me.name, waitCard(me.name, 'Gleich geht’s los', 'Warte, bis die Lehrkraft das Qualifying startet. Du spielst es allein auf deinem Handy.'), wireLeave);
    case 'quali': stopFinal(); return quali();
    case 'final-setup': stopQuali(); stopFinal(); wachHalten(false); return afterQuali();
    case 'final': case 'podium': stopQuali(); return final();
  }
}

function waitCard(name, title, text) {
  return `<div class="card"><p class="eyebrow">Hallo ${esc(name)}!</p><h2>${esc(title)}</h2><p>${text}</p><div class="waitdots"><i></i><i></i><i></i></div>
    <p class="hint">Die Organe leuchten nacheinander auf. Merke dir die Reihenfolge und tippe sie nach. Jede Runde kommt ein Organ dazu.</p>
    <button class="ghost-btn" id="btnLeave">Nicht ${esc(name)}? Namen ändern</button></div>`;
}
function wireLeave() { const b = $('#btnLeave'); if (b) b.onclick = () => { store('simon.name', null); send({ t: 'leave' }); shown = ''; }; }

function joinForm() {
  if (shown === 'join') return;
  const last = store('simon.name') || {};
  show('join', `<div class="card">
    <h2>Mitspielen</h2>
    <p>Gib deinen Vornamen und den ersten Buchstaben deines Nachnamens ein. Der Name erscheint am Beamer.</p>
    <form id="joinForm" class="settings" autocomplete="off">
      <div class="row">
        <div class="field grow"><label for="fFirst">Vorname</label><input id="fFirst" maxlength="16" required value="${esc(last.first || '')}" autocapitalize="words" enterkeyhint="next"></div>
        <div class="field initial"><label for="fInit">Nachname</label><input id="fInit" maxlength="1" required value="${esc(last.initial || '')}" autocapitalize="characters" enterkeyhint="go" aria-label="Erster Buchstabe des Nachnamens"></div>
      </div>
      <p class="err" id="joinErr" hidden></p>
      <button class="big-btn" type="submit">Mitspielen</button>
    </form></div>`, () => {
    const f = $('#fFirst'), i = $('#fInit');
    f.addEventListener('input', () => { if (/\s/.test(f.value)) { f.value = f.value.trim(); i.focus(); } });
    $('#joinForm').onsubmit = e => {
      e.preventDefault();
      Ton.init();
      const first = f.value.trim(), initial = i.value.trim();
      store('simon.name', { first, initial });
      send({ t: 'join', first, initial });
    };
  });
}

// ---------------------------------------------------------------- Qualifying
function quali() {
  const me = you.me, qi = you.quali;
  if (!qi) return;
  if (me.q && me.q.done && !(Q && Q.nr === qi.nr && !Q.ende)) return qualiErgebnis();
  if (Q && Q.nr === qi.nr) {
    // Nach einem Fehler bleibt das Brett mit der Markierung kurz stehen
    if (Q.ende && performance.now() - Q.endeAt > 2100) return qualiErgebnis();
    return; // läuft bereits
  }
  // Neues Spiel aufbauen (auch nach Neuladen: weiter mit der nächsten Folge)
  stopQuali();
  const seq = folge(qi.seed, qi.n);
  const brettEl = $('#brett');
  let spiel = null;
  const brett = erstelleBrett(brettEl, { set: qi.set, modus: qi.modus, ansicht: 'handy', onTap: i => spiel && spiel.tap(i) });
  const startLvl = me.q ? me.q.lvl : 0;
  Q = { nr: qi.nr, brett, ende: null, set: qi.set, lvl: startLvl };
  spiel = Q.spiel = new SoloSpiel({
    brett, seq, modus: qi.modus, n: qi.n, startLvl, startMs: me.q ? me.q.ms : 0,
    onPhase: (ph, len) => {
      const r = `Runde ${len}<small>${organeText(len)} merken</small>`;
      if (ph === 'merken') status(r, merkText(qi.modus), 'merken');
      else if (ph === 'tippen') status(r, tippText(qi.modus), 'tippen');
      else status(r, 'Richtig! ✓', 'tippen');
    },
    onZeit: (rest, ges) => zeitbalken(rest, ges),
    onLevel: (lvl, ms) => { Q.lvl = lvl; send({ t: 'q', nr: qi.nr, lvl, ms }); },
    onEnde: r => {
      Q.ende = r; Q.endeAt = performance.now();
      send({ t: 'q-end', nr: qi.nr, lvl: r.lvl, ms: r.ms, why: r.why, want: r.want, got: r.got });
      setTimeout(() => { if (Q && Q.ende === r) { shown = ''; qualiErgebnis(); } }, 2200);
    },
  });
  spielfeldZeigen(true);
  shown = 'quali-play';
  status('Qualifying', 'Gleich geht’s los', 'merken');
  zeitbalken(null);
  wachHalten(true);
  // Gemeinsamer Start: Countdown bis zur Startzeit, Nachzügler bekommen 3 Sekunden
  const bis = Math.max(qi.startAt - serverNow(), startLvl > 0 ? 1500 : 3000);
  const ende = performance.now() + bis;
  const cd = () => {
    if (!Q || Q.spiel !== spiel) { countdown(null); return; }
    const rest = ende - performance.now();
    if (rest <= 0) { countdown(null); return; }
    const sec = Math.ceil(rest / 1000);
    countdown(sec <= 3 ? sec : '…', sec <= 3 ? 'Merk dir die Reihenfolge!' : 'Gleich geht’s los');
    Q.cdT = setTimeout(cd, Math.min(250, rest));
  };
  cd();
  spiel.start(bis - 900 > 0 ? bis - 900 : 0);
}

function stopQuali() {
  if (!Q) return;
  clearTimeout(Q.cdT);
  countdown(null);
  if (Q.spiel) Q.spiel.stop();
  Q = null;
}

function qualiErgebnis() {
  const me = you.me, qi = you.quali;
  const lokal = Q && Q.ende;
  const q = me.q && me.q.done ? me.q : null;
  const lvl = lokal ? lokal.lvl : q ? q.lvl : 0;
  const fail = lokal ? lokal : q && q.fail ? q.fail : null;
  const set = qi ? qi.set : (Q && Q.set);
  const key = 'qres:' + lvl + ':' + me.rank + ':' + me.of;
  wachHalten(false);
  const offen = you.quali && you.quali.open;
  const rank = me.rank > 0 ? `<div class="placebox">Platz ${me.rank} von ${me.of}${offen ? '<br><small>vorläufig – andere spielen vielleicht noch</small>' : ''}</div>` : '';
  show(key, `<div class="card bad">
      <p class="eyebrow">Qualifying</p>
      <h2>${fail && fail.why === 'zeit' ? 'Zeit abgelaufen!' : 'Fehler!'}</h2>
      <div class="bigstat"><b>${lvl}</b><span>${lvl === 1 ? 'Organ' : 'Organe'} in der richtigen Reihenfolge</span></div>
      ${rank}
      ${fehlerAufloesung(set, fail)}
    </div>
    <div class="card"><h3>Die Organe dieser Runde</h3>${set ? setListe(set) : ''}</div>
    <div class="card"><p>Die Besten kommen ins Finale am Beamer. Lass diese Seite offen.</p></div>`);
}

function afterQuali() {
  const me = you.me, qi = you.quali, chosen = you.final && you.final.chosen;
  const lvl = me.q ? me.q.lvl : 0;
  show('after:' + lvl + ':' + me.rank + ':' + chosen, `<div class="card ${chosen ? 'good' : ''}">
      <p class="eyebrow">Qualifying beendet</p>
      <h2>${chosen ? 'Du bist im Finale! 🎉' : 'Gleich kommt das Finale'}</h2>
      <div class="bigstat"><b>${lvl}</b><span>${lvl === 1 ? 'Organ' : 'Organe'} · Platz ${me.rank || '–'} von ${me.of}</span></div>
      <p>${chosen ? 'Lass diese Seite offen. Im Finale schaust du zum Beamer und tippst die Folge hier nach.' : 'Das Finale läuft am Beamer. Schau zu und merk dir mit!'}</p>
    </div>
    ${qi ? `<div class="card"><h3>Die Organe dieser Runde</h3>${setListe(qi.set)}</div>` : ''}`);
}

// ---------------------------------------------------------------- Finale
function stopFinal() {
  if (!F) return;
  F.timers.forEach(clearTimeout);
  cancelAnimationFrame(F.raf);
  countdown(null);
  if (F.brett) { F.brett.eingabe(false); F.brett.aus(); }
  F = null;
}

function final() {
  const f = you.final;
  if (!f) return;
  if (f.slot < 0) {
    stopFinal(); wachHalten(false);
    if (you.phase === 'podium') {
      const names = f.places ? f.names.map((n, i) => ({ n, p: f.places[i] })).sort((a, b) => a.p - b.p) : [];
      return show('spec-podium:' + f.nr, `<div class="card good"><p class="eyebrow">Finale</p><h2>🏆 ${esc(names[0] ? names[0].n : '')} gewinnt!</h2>
        <ol class="olist">${names.map(x => `<li><span class="nr">${x.p}.</span><b>${esc(x.n)}</b></li>`).join('')}</ol></div>`);
    }
    return show('spec:' + f.nr, `<div class="card"><p class="eyebrow">Finale</p><h2>Schau zum Beamer! 👀</h2><p>Gerade spielen <b>${f.names.map(esc).join(', ')}</b> das Finale. Merk dir die Folge mit, nur so zum Spaß.</p></div>`);
  }
  // Finalist/in
  wachHalten(you.phase === 'final');
  if (!F || F.nr !== f.nr) {
    stopFinal();
    const brett = erstelleBrett($('#brett'), { set: f.set, modus: f.modus, ansicht: 'handy', onTap: i => finalTap(i) });
    F = { nr: f.nr, brett, round: 0, k: 0, res: null, timers: [], raf: 0, offen: false };
  }
  const me = f.me;
  if (you.phase === 'podium' || !me.alive) return finalAus(f);
  if (F.round !== f.round) neueRunde(f);
  if (me.res === 'ok' || F.res === 'ok') finalWarten(f);
  else if (me.res === 'fail' && !F.res) {
    // z. B. nach dem Neuladen: Fehler ist schon gemeldet, Auswertung abwarten
    F.res = 'fail'; F.offen = false; F.brett.eingabe(false);
    spielfeldZeigen(true); shown = 'final-play';
    status(`Runde ${f.round}<small>${organeText(f.round)}</small>`, 'Fehler! Warte auf die anderen', 'beamer');
  }
}

function finalWarten(f) {
  spielfeldZeigen(true); shown = 'final-play';
  status(`Runde ${f.round}<small>${organeText(f.round)}</small>`, 'Geschafft ✓ Warte auf die anderen', 'tippen');
  zeitbalken(null);
}

function neueRunde(f) {
  F.timers.forEach(clearTimeout); F.timers = [];
  cancelAnimationFrame(F.raf);
  F.round = f.round; F.k = 0; F.res = null; F.offen = false;
  F.seq = f.seq.slice(0, f.round);
  F.plan = { startAt: f.startAt, openAt: f.openAt, deadline: f.deadline };
  F.modus = f.modus; F.n = f.n;
  const brett = F.brett;
  brett.eingabe(false); brett.aus();
  brett.gedimmt(true);
  if (mischt(f.modus)) brett.layout(Array.from({ length: f.n }, (_, i) => i));
  spielfeldZeigen(true); shown = 'final-play';
  zeitbalken(null);
  const r = `Runde ${f.round}<small>${organeText(f.round)} merken</small>`;
  const later = (fn, at) => F.timers.push(setTimeout(fn, Math.max(0, at - serverNow())));
  // Vor dem Start: Countdown (erste Runde) bzw. kurze Pause
  if (serverNow() < f.startAt) {
    status(r, f.first ? 'Gleich geht’s los!' : 'Nächste Runde …', 'beamer');
    if (f.first) {
      for (let s = 3; s >= 1; s--) later(() => countdown(s, 'Schau zum Beamer!'), f.startAt - s * 1000);
    }
  }
  later(() => { countdown(null); status(r, '👀 Schau zum Beamer!', 'beamer'); }, f.startAt);
  later(() => eingabeAuf(), f.openAt);
  later(() => { if (F && F.offen) finalFehler(-1, 'zeit'); }, f.deadline);
}

function eingabeAuf() {
  if (!F || F.res) return;
  const brett = F.brett;
  brett.gedimmt(false);
  if (mischt(F.modus)) brett.layout(mischen(F.n, brett.perm));
  brett.eingabe(true);
  F.offen = true;
  status(`Runde ${F.round}<small>${organeText(F.round)}</small>`, tippText(F.modus), 'tippen');
  if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {}
  const limit = zeitLimit(F.round);
  const tick = () => {
    if (!F || !F.offen) return;
    const rest = F.plan.deadline - serverNow();
    zeitbalken(Math.max(0, rest), limit);
    if (rest > 0) F.raf = requestAnimationFrame(tick);
  };
  F.raf = requestAnimationFrame(tick);
}

function finalTap(i) {
  if (!F || !F.offen) return;
  const want = F.seq[F.k];
  if (i !== want) return finalFehler(i, 'falsch');
  F.brett.blitz(i, 'tipp', 220);
  Ton.organ(i, F.n, 220);
  F.k++;
  if (F.k < F.seq.length) { send({ t: 'f', nr: F.nr, r: F.round, k: F.k }); return; }
  F.offen = false; F.res = 'ok';
  cancelAnimationFrame(F.raf);
  F.brett.eingabe(false);
  send({ t: 'f-ok', nr: F.nr, r: F.round, ms: Math.max(0, Math.round(serverNow() - F.plan.openAt)) });
  setTimeout(() => Ton.richtig(), 100);
  status(`Runde ${F.round}<small>${organeText(F.round)}</small>`, 'Geschafft ✓ Warte auf die anderen', 'tippen');
  zeitbalken(null);
}

function finalFehler(got, why) {
  if (!F || !F.offen) return;
  F.offen = false; F.res = 'fail';
  cancelAnimationFrame(F.raf);
  const want = F.seq[F.k];
  F.brett.eingabe(false);
  if (got >= 0) F.brett.blitz(got, 'falsch', 1600);
  F.brett.blitz(want, 'soll', 2400);
  Ton.fehler();
  if (navigator.vibrate) try { navigator.vibrate([90, 60, 160]); } catch (e) {}
  send({ t: 'f-fail', nr: F.nr, r: F.round, k: F.k, got, why, ms: Math.max(0, Math.round(serverNow() - F.plan.openAt)) });
  status(`Runde ${F.round}<small>${organeText(F.round)}</small>`, why === 'zeit' ? 'Zeit um!' : 'Fehler!', 'beamer');
  zeitbalken(null);
  F.lokalFehler = { why, want, got };
}

function finalAus(f) {
  const me = f.me;
  const podium = you.phase === 'podium';
  const place = me.place;
  const fail = me.why ? { why: me.why, want: me.want, got: me.got } : null;
  // Nach einem Fehler kurz das Brett mit der Markierung stehen lassen
  const delay = F && F.lokalFehler && !F.zeigte ? 1800 : 0;
  if (F) F.zeigte = true;
  const html = () => {
    const win = podium && place === 1;
    return `<div class="card ${win ? 'good' : podium ? '' : 'bad'}">
      <p class="eyebrow">Finale${f.revanche ? ' · Revanche' : ''}</p>
      <h2>${win ? '🏆 Du hast gewonnen!' : podium ? `Platz ${place} 🎉` : 'Ausgeschieden'}</h2>
      ${!podium ? `<div class="placebox">Platz ${place} <small>· in Runde ${me.out || f.round}</small></div><p>Schau zum Beamer, wer gewinnt!</p>` : `<p>${win ? 'Herzlichen Glückwunsch!' : 'Stark gespielt!'} Sieg: <b>${esc(f.names[f.places.indexOf(1)] || '')}</b></p>`}
      ${me.why ? fehlerAufloesung(f.set, fail) : ''}
    </div>
    <div class="card"><h3>Die Organe im Finale</h3>${setListe(f.set)}</div>`;
  };
  const key = 'fout:' + f.nr + ':' + place + ':' + you.phase;
  if (shown === key) return;
  const go = () => { if (you && you.final && you.final.nr === f.nr && (you.phase === 'podium' || !you.final.me.alive)) { stopFinal(); wachHalten(false); show(key, html()); } };
  if (delay) { shown = key + ':wait'; setTimeout(go, delay); } else go();
}

// ---------------------------------------------------------------- Start
if (!code) {
  show('nocode', `<div class="card"><h2>Code eingeben</h2><p>Scanne den QR-Code am Beamer oder gib den Code ein, der dort oben rechts steht.</p>
    <form id="codeForm" class="settings"><div class="field"><label for="fCode">Code</label><input id="fCode" maxlength="5" autocapitalize="characters" required></div><button class="big-btn">Weiter</button></form></div>`, () => {
    $('#codeForm').onsubmit = e => { e.preventDefault(); const c = $('#fCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length === 5) location.search = '?c=' + c; };
  });
} else {
  connect();
}
