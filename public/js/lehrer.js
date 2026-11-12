// Beamer-Seite der Lehrkraft: Lobby mit QR-Code, Live-Rangliste im Qualifying, Finale mit Ton, Siegerehrung
import { KNet, randomCode, randomId, store } from './net.js';
import { erstelleBrett, esc } from './brett.js';
import { takt, zeitLimit, vorspiel, nurBilder, MODI, MODUS_TEXT, BEGRIFFE, BEGRIFFE_TEXT, GROESSEN, FINAL_GROESSEN, GNADE } from './regeln.js';
import { bild } from './bilder.js';
import { partner } from './organe.js';
import { Ton } from './ton.js';

const $ = s => document.querySelector(s);
const view = $('#view'), netdot = $('#netdot'), codeChip = $('#codeChip'), toastEl = $('#toast');

let sess = store('simon.lehrer');
let net = null, room = null, screen = '';
let cfg = Object.assign({ n: 4, modus: 'fest', begriffe: 'fach', finalN: 4 }, store('simon.lehrer.cfg') || {});
if (!MODI.includes(cfg.modus)) cfg.modus = 'fest'; // z. B. alte Einstellung „Gemischt“
if (!BEGRIFFE.includes(cfg.begriffe)) cfg.begriffe = 'fach'; // alte Einstellungen „Standard/Griechisch/Gemischt“
let quitArmed = 0;
const bekannt = new Set(); // Namen in der Lobby, die schon angezeigt wurden
const serverNow = () => net ? net.serverNow() : Date.now();
const organeText = n => n === 1 ? '1 Organ' : n + ' Organe';
const fmtMs = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';

// ---------------------------------------------------------------- Ton & Werkzeuge
Ton.an = store('simon.ton.beamer') !== false;
const btnTon = $('#btnTon');
function tonText() { btnTon.textContent = Ton.an ? 'Ton: an' : 'Ton: aus'; btnTon.setAttribute('aria-pressed', String(Ton.an)); }
tonText();
btnTon.onclick = () => { Ton.init(); Ton.an = !Ton.an; store('simon.ton.beamer', Ton.an); tonText(); };
document.addEventListener('pointerdown', () => Ton.init(), { capture: true });
document.addEventListener('keydown', () => Ton.init(), { capture: true });
$('#btnFull').onclick = vollbild;
function vollbild() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}
$('#btnSess').onclick = () => { $('#dlgCode').textContent = sess.code; $('#dlg').hidden = false; };
$('#btnDlgClose').onclick = () => { $('#dlg').hidden = true; };
$('#btnNewSess').onclick = () => { $('#dlg').hidden = true; newSession(); };
$('#btnWipe').onclick = () => { $('#dlg').hidden = true; send({ t: 'wipe' }); setTimeout(newSession, 600); };

let toastT = 0;
function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 4500); }

// ---------------------------------------------------------------- Verbindung
function newSession() {
  sess = { code: randomCode(5), key: randomId(24) };
  store('simon.lehrer', sess);
  room = null; screen = '';
  connect();
}
function connect() {
  if (net) net.close();
  codeChip.hidden = false; codeChip.textContent = 'Code ' + sess.code;
  net = KNet({
    code: sess.code, params: { role: 'teacher', key: sess.key },
    onMessage,
    onStatus: s => { netdot.dataset.s = s; if (s === 'offline' && net.stopped === 'code-taken') newSession(); },
  });
  net.open();
}
function onMessage(m) {
  if (typeof m.now === 'number' && net.rtt > 5000) net.offset = m.now - Date.now();
  switch (m.t) {
    case 'room': room = m; render(); break;
    case 'fp': fortschritt(m); break;
    case 'error':
      if (m.why === 'code-taken') newSession();
      else if (m.why === 'final-offline') toast('Alle Finalisten-Handys müssen verbunden sein. Wer nicht verbunden ist, öffnet die Seite neu oder scannt den QR-Code noch einmal.');
      else if (m.why === 'final-players') toast('Bitte mindestens zwei verschiedene Personen für das Finale auswählen.');
      else if (m.why === 'no-players') toast('Es hat sich noch niemand angemeldet.');
      else if (m.why === 'kick-finalist') toast('Finalisten können während des Finales nicht entfernt werden.');
      break;
    case 'ended': room = null; screen = ''; break;
  }
}
function send(obj) { if (net && !net.send(obj, true)) toast('Keine Verbindung zum Server. Der Befehl wird gesendet, sobald die Verbindung wieder steht.'); }

function joinUrl() { return location.origin + '/mitspielen?c=' + sess.code; }
function drawQR(canvas, text) {
  const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 2, s = Math.max(4, Math.floor(512 / (n + 2 * q)));
  canvas.width = canvas.height = (n + 2 * q) * s;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#0d1030';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + q) * s, (r + q) * s, s, s);
}

// ---------------------------------------------------------------- Bausteine
function seg(name, options, value, onPick) {
  const w = document.createElement('div');
  w.className = 'seg'; w.setAttribute('role', 'radiogroup'); w.setAttribute('aria-label', name);
  for (const [val, label] of options) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(val === value)); b.textContent = label;
    b.onclick = () => { w.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); onPick(val); };
    w.appendChild(b);
  }
  return w;
}
function setCfg(part) {
  Object.assign(cfg, part);
  store('simon.lehrer.cfg', cfg);
  send({ t: 'cfg', cfg });
}
function optionen(el, mitFinale) {
  el.innerHTML = '';
  const add = (lbl, node, desc) => {
    const l = document.createElement('div'); l.className = 'lbl'; l.textContent = lbl;
    el.append(l, node);
    if (desc) { const d = document.createElement('div'); d.className = 'desc'; d.id = 'desc-' + lbl; d.textContent = desc; el.appendChild(d); }
  };
  add('Organe', seg('Anzahl Organe', GROESSEN.map(n => [n, n + ' Organe']), cfg.n, n => setCfg({ n })), 'Werden für jede Runde neu ausgelost.');
  add('Schwierigkeit', seg('Schwierigkeit', Object.entries(MODUS_TEXT).map(([k, v]) => [k, v.name]), cfg.modus, modus => { setCfg({ modus }); const d = document.getElementById('desc-Schwierigkeit'); if (d) d.textContent = MODUS_TEXT[modus].kurz; }), MODUS_TEXT[cfg.modus].kurz);
  add('Begriffe', seg('Begriffe', Object.entries(BEGRIFFE_TEXT).map(([k, v]) => [k, v.split(' (')[0]]), cfg.begriffe, begriffe => { setCfg({ begriffe }); const d = document.getElementById('desc-Begriffe'); if (d) d.textContent = BEGRIFFE_TEXT[begriffe]; }), BEGRIFFE_TEXT[cfg.begriffe]);
  if (mitFinale) add('Finale', seg('Größe des Finales', FINAL_GROESSEN.map(n => [n, n + ' Personen']), cfg.finalN, finalN => setCfg({ finalN })));
}
function setRow(set) {
  return `<div class="setrow">${set.map(o => `<div class="so"><span class="mini">${bild(o.id)}</span>${esc(o.term)}</div>`).join('')}</div>`;
}
function bigCount(num, text) {
  let el = $('#bigcount');
  if (num == null) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'bigcount'; el.className = 'bigcount'; document.body.appendChild(el); }
  el.innerHTML = `<div><b>${num}</b><span>${esc(text || '')}</span></div>`;
}

// ---------------------------------------------------------------- Bildschirme
function render() {
  if (!room) return;
  // Alte Finale-Timer stoppen, wenn das Finale vorbei ist
  if (room.phase !== 'final' && room.phase !== 'podium') stopFinal();
  switch (room.phase) {
    case 'lobby': return lobby();
    case 'quali': return quali();
    case 'final-setup': return setup();
    case 'final': return final();
    case 'podium': return podium();
  }
}

function lobby() {
  if (screen !== 'lobby') {
    screen = 'lobby';
    view.innerHTML = `<div class="tpage"><div class="lobby">
      <div class="tcard joinbox">
        <h2>Mitspielen!</h2>
        <canvas id="qr" class="qr" role="img" aria-label="QR-Code zum Mitspielen"></canvas>
        <div class="joinurl">${esc(location.host)}/mitspielen</div>
        <div>Code: <span class="joincode">${esc(sess.code)}</span></div>
      </div>
      <div class="lobbyright">
        <div class="tcard" style="flex:1;min-height:0">
          <div class="thead"><h2 id="nameCount">Angemeldet</h2></div>
          <div class="names" id="names"></div>
        </div>
        <div class="tcard"><div class="optgrid" id="opts"></div></div>
        <div class="tactions">
          <p class="hint grow">Erst spielen alle allein auf dem Handy (ein Versuch). Die Besten kommen ins Finale am Beamer.</p>
          <button class="big-btn" id="btnStart">Qualifying starten <span class="kbd">Enter</span></button>
        </div>
      </div>
    </div></div>`;
    drawQR($('#qr'), joinUrl());
    optionen($('#opts'), true);
    $('#btnStart').onclick = startQuali;
  }
  const ps = room.players;
  $('#nameCount').textContent = ps.length ? `Angemeldet: ${ps.length}` : 'Angemeldet';
  $('#names').innerHTML = ps.length ? ps.map(p => `<span class="name ${p.online ? '' : 'off'} ${bekannt.has(p.pid) ? '' : 'neu'}">${esc(p.name)}<button class="x" data-pid="${esc(p.pid)}" title="${esc(p.name)} entfernen" aria-label="${esc(p.name)} entfernen">×</button></span>`).join('')
    : '<p class="empty">Noch niemand da. Scannt den QR-Code und gebt euren Namen ein.</p>';
  ps.forEach(p => bekannt.add(p.pid));
  $('#names').querySelectorAll('.x').forEach(b => { b.onclick = () => send({ t: 'kick', pid: b.dataset.pid }); });
  $('#btnStart').disabled = !ps.length;
}
function startQuali() {
  Ton.init();
  if (!room || !room.players.length) return toast('Es hat sich noch niemand angemeldet.');
  send({ t: 'quali-start', cfg });
}

let qualiCdT = 0;
function quali() {
  const Q = room.quali;
  if (screen !== 'quali:' + Q.nr) {
    screen = 'quali:' + Q.nr;
    view.innerHTML = `<div class="tpage">
      <div class="qhead">
        <div class="tcard"><div class="thead"><div><h2>Qualifying</h2><p>Alle spielen allein auf dem Handy · ein Versuch · ${esc((MODUS_TEXT[Q.modus] || MODUS_TEXT.fest).name)}</p></div></div>${setRow(Q.set)}</div>
        <div class="tcard qside"><div class="counter" id="qCount"></div><canvas id="qrSmall" class="qr small" role="img" aria-label="QR-Code für Nachzügler"></canvas></div>
      </div>
      <div class="ranks" id="ranks"></div>
      <div class="tactions"><p class="hint grow" id="qHint"></p>
        <button class="ghost-btn" id="btnBack">Zurück zur Anmeldung</button>
        <button class="big-btn" id="btnEnd">Qualifying beenden <span class="kbd">Enter</span></button></div>
    </div>`;
    drawQR($('#qrSmall'), joinUrl());
    $('#btnEnd').onclick = endQuali;
    $('#btnBack').onclick = () => { if (confirm('Zurück zur Anmeldung? Die Ergebnisse dieses Qualifyings werden gelöscht.')) send({ t: 'to-lobby' }); };
    // Countdown am Beamer
    clearTimeout(qualiCdT);
    const cd = () => {
      const rest = Q.startAt - serverNow();
      if (rest <= 0 || screen !== 'quali:' + Q.nr) { bigCount(null); return; }
      const s = Math.ceil(rest / 1000);
      bigCount(s <= 3 ? s : '…', 'Alle schauen aufs eigene Handy!');
      if (s <= 3 && cd.last !== s) { cd.last = s; Ton.piep(false); }
      qualiCdT = setTimeout(cd, 100);
    };
    cd();
  }
  const ps = room.players;
  const ranked = ps.filter(p => p.q).sort((a, b) => a.rank - b.rank);
  const rest = ps.filter(p => !p.q);
  const done = ps.filter(p => p.q && p.q.done).length;
  $('#qCount').innerHTML = `${done}/${ps.length}<small>fertig</small>`;
  const N = cfg.finalN;
  const row = (p, place) => {
    const st = !p.q ? '<span class="stt live">spielt …</span>' : p.q.done ? `<span class="stt out">${p.q.fail && p.q.fail.why === 'zeit' ? 'Zeit um' : p.q.fail && p.q.fail.why === 'ende' ? 'beendet' : 'Fehler'}</span>` : '<span class="stt live">spielt …</span>';
    return `<div class="rk ${place && place <= N ? 'fin' : ''} ${p.online ? '' : 'off'}"><span class="p">${place ? place + '.' : ''}</span><span class="nm">${esc(p.name)}</span>${st}<span class="tm">${p.q && p.q.lvl ? fmtMs(p.q.ms) : ''}</span><span class="lv">${p.q ? p.q.lvl : 0}</span></div>`;
  };
  $('#ranks').innerHTML = ranked.map(p => row(p, p.rank)).join('') + rest.map(p => row(p, 0)).join('');
  const all = done === ps.length && ps.length > 0;
  $('#btnEnd').classList.toggle('pulse', all);
  $('#qHint').textContent = all ? 'Alle sind fertig! Weiter zum Finale.' : `Die Zahl rechts zeigt, wie viele Organe in Folge geschafft wurden. Bei Gleichstand zählt die schnellere Eingabe. Die ersten ${N} kommen ins Finale.`;
  quitArmed = 0;
}
function endQuali() {
  const ps = room.players, open = ps.filter(p => !(p.q && p.q.done)).length;
  if (open && Date.now() - quitArmed > 4000) {
    quitArmed = Date.now();
    return toast(`${open} ${open === 1 ? 'spielt' : 'spielen'} noch. Nochmal drücken, um trotzdem zu beenden (ihr bisheriger Stand zählt).`);
  }
  send({ t: 'quali-end' });
}

function setup() {
  const f = room.final || { p: [] };
  const ranked = room.players.filter(p => p.rank > 0).sort((a, b) => a.rank - b.rank);
  const others = room.players.filter(p => !(p.rank > 0));
  const all = ranked.concat(others);
  const key = 'setup';
  if (screen !== key) {
    screen = key;
    view.innerHTML = `<div class="tpage">
      <div class="thead"><div><h2>Finale</h2><p>Die Besten aus dem Qualifying sind ausgewählt. Die Folge erscheint am Beamer, getippt wird auf dem Handy. Wer einen Fehler macht, fliegt raus.</p></div></div>
      <div class="tcard"><div class="slots" id="slots"></div></div>
      <div class="tcard"><div class="optgrid" id="opts"></div></div>
      <div class="ranks" id="ranks"></div>
      <div class="tactions"><button class="ghost-btn" id="btnLobby">Neues Spiel <span class="kbd">Esc</span></button><span class="grow"></span>
        <button class="big-btn" id="btnFinal">Finale starten <span class="kbd">Enter</span></button></div>
    </div>`;
    optionen($('#opts'), true);
    // Größe des Finales geändert → Auswahl anpassen
    $('#opts').addEventListener('click', () => setTimeout(() => {
      const cur = (room.final && room.final.p) || [];
      if (cur.length !== cfg.finalN) {
        const r = room.players.filter(p => p.rank > 0).sort((a, b) => a.rank - b.rank).map(p => p.pid);
        const next = cur.slice(0, cfg.finalN);
        for (const pid of r) if (next.length < cfg.finalN && !next.includes(pid)) next.push(pid);
        send({ t: 'final-pick', p: next });
      }
    }, 0));
    $('#btnLobby').onclick = toLobby;
    $('#btnFinal').onclick = startFinal;
  }
  const slots = $('#slots');
  const n = Math.min(cfg.finalN, Math.max(2, all.length));
  slots.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const pid = f.p[i] || '';
    const pl = room.players.find(p => p.pid === pid);
    const d = document.createElement('div'); d.className = 'slot';
    d.innerHTML = `<h3>Finalist/in ${i + 1}</h3>`;
    const sel = document.createElement('select');
    sel.innerHTML = '<option value="">– niemand –</option>' + all.map(p => `<option value="${esc(p.pid)}" ${p.pid === pid ? 'selected' : ''}>${p.rank ? p.rank + '. ' : ''}${esc(p.name)}${p.q ? ' · ' + organeText(p.q.lvl) : ''}</option>`).join('');
    sel.onchange = () => {
      const next = [];
      slots.querySelectorAll('select').forEach(s => { if (s.value && !next.includes(s.value)) next.push(s.value); });
      send({ t: 'final-pick', p: next });
    };
    d.appendChild(sel);
    const on = document.createElement('div');
    on.className = 'online ' + (pl ? (pl.online ? 'ja' : 'nein') : '');
    on.textContent = pl ? (pl.online ? '● Handy verbunden' : '● Handy nicht verbunden: Seite neu öffnen') : '';
    d.appendChild(on);
    slots.appendChild(d);
  }
  $('#ranks').innerHTML = ranked.map(p => `<div class="rk ${f.p.includes(p.pid) ? 'fin' : ''}"><span class="p">${p.rank}.</span><span class="nm">${esc(p.name)}</span><span></span><span class="tm">${p.q && p.q.lvl ? fmtMs(p.q.ms) : ''}</span><span class="lv">${p.q ? p.q.lvl : 0}</span></div>`).join('');
  const ok = f.p.length >= 2;
  $('#btnFinal').disabled = !ok;
}
function startFinal() {
  Ton.init();
  const f = room.final || { p: [] };
  if (f.p.length < 2) return toast('Bitte mindestens zwei Personen für das Finale auswählen.');
  send({ t: 'final-start', p: f.p, cfg });
}
function toLobby() {
  if (!confirm('Neues Spiel starten? Alle bleiben angemeldet, die Ergebnisse werden gelöscht.')) return;
  send({ t: 'to-lobby' });
}

// ---------------------------------------------------------------- Finale
let FB = null; // { nr, brett, round, timers, raf, lastShown, prog: [] }
function stopFinal() {
  if (!FB) return;
  FB.timers.forEach(clearTimeout);
  cancelAnimationFrame(FB.raf);
  bigCount(null);
  FB = null;
}

function final() {
  const f = room.final;
  if (!FB || FB.nr !== f.nr || screen !== 'final:' + f.nr) {
    stopFinal();
    screen = 'final:' + f.nr;
    view.innerHTML = `<div class="tpage"><div class="final">
      <div class="fmain">
        <div class="fbar"><div class="runde" id="fRunde"></div><div class="hinweis" id="fText"></div></div>
        <div class="zeitbalken" id="fBarBox"><i id="fBar"></i></div>
        <div class="brett" id="fBrett"></div>
      </div>
      <div class="fside"><div id="fCards" class="fside"></div>
        <div class="tactions" style="margin-top:auto"><button class="ghost-btn" id="btnAbort">Finale abbrechen</button></div></div>
    </div></div>`;
    const brett = erstelleBrett($('#fBrett'), { set: f.set, modus: f.modus, ansicht: 'beamer' });
    if (nurBilder(f.modus)) brett.karteZeigen(true);
    FB = { nr: f.nr, brett, round: 0, timers: [], raf: 0, lastShown: '', prog: f.p.map(() => 0) };
    $('#btnAbort').onclick = () => { if (confirm('Finale abbrechen? Es geht zurück zur Auswahl der Finalisten.')) send({ t: 'final-abort' }); };
  }
  if (f.last && FB.lastShown !== f.nr + ':' + f.last.round) {
    FB.lastShown = f.nr + ':' + f.last.round;
    rundenBanner(f);
  }
  if (FB.round !== f.round && f.state === 'run') planeRunde(f);
  karten(f);
}

function status(runde, text, cls) {
  $('#fRunde').innerHTML = runde;
  const t = $('#fText'); t.textContent = text; t.className = 'hinweis ' + (cls || '');
}

function planeRunde(f) {
  FB.timers.forEach(clearTimeout); FB.timers = [];
  cancelAnimationFrame(FB.raf);
  FB.round = f.round;
  FB.prog = f.p.map(() => 0);
  const brett = FB.brett;
  brett.aus();
  const t = takt(f.round, f.modus);
  const seq = f.seq;
  const r = `Runde ${f.round}<small>${organeText(f.round)} merken</small>`;
  const at = (fn, when) => FB.timers.push(setTimeout(fn, Math.max(0, when - serverNow())));
  zeit(null);
  status(r, f.first ? 'Gleich geht’s los!' : 'Nächste Runde …', 'beamer');
  if (f.first) {
    for (let s = 3; s >= 1; s--) at(() => { bigCount(s, 'Gut aufpassen!'); Ton.piep(false); }, f.startAt - s * 1000);
  }
  at(() => { bigCount(null); status(r, f.modus === 'schwer' ? 'Neues Organ:' : 'Gut aufpassen!', 'merken'); }, f.startAt);
  vorspiel(f.round, f.modus).forEach((pos, j) => {
    at(() => { brett.leuchte(seq[pos], t.an); Ton.organ(seq[pos], f.n, t.an); }, f.startAt + j * t.schritt);
  });
  at(() => {
    brett.aus();
    if (nurBilder(f.modus)) brett.karteZeigen(true);
    status(`Runde ${f.round}<small>${organeText(f.round)}</small>`, f.modus === 'schwer' ? 'Jetzt die ganze Folge tippen!' : 'Jetzt tippen!', 'tippen');
    Ton.piep(true);
    if (room && room.final) karten(room.final);
    const limit = zeitLimit(f.round);
    const tick = () => {
      if (!FB || FB.round !== f.round) return;
      const rest = f.deadline - serverNow();
      zeit(Math.max(0, rest), limit);
      if (rest > 0) FB.raf = requestAnimationFrame(tick);
    };
    FB.raf = requestAnimationFrame(tick);
  }, f.openAt);
  // Zeit abgelaufen: dem Server Bescheid geben (er wertet dann aus)
  at(() => send({ t: 'tick', nr: f.nr, r: f.round }), f.deadline + GNADE + 200);
  at(() => send({ t: 'tick', nr: f.nr, r: f.round }), f.deadline + GNADE + 2500);
}
function zeit(rest, gesamt) {
  const box = $('#fBarBox'), bar = $('#fBar'); if (!box) return;
  if (rest == null) { bar.style.transform = 'scaleX(0)'; box.classList.remove('knapp'); return; }
  bar.style.transform = `scaleX(${Math.max(0, Math.min(1, rest / gesamt))})`;
  box.classList.toggle('knapp', rest < 3000);
}

function karten(f) {
  const el = $('#fCards'); if (!el) return;
  const st = f.st, now = serverNow();
  const neuOut = f.last ? f.last.out.map(o => o.slot) : [];
  el.innerHTML = f.p.map((pid, i) => {
    const x = st[i], len = f.round;
    let cls = '', txt = '';
    if (!x.alive) {
      cls = 'out' + (f.last && x.out === f.last.round && neuOut.includes(i) && !FB['flash' + i + ':' + x.out] ? ' neu-out' : '');
      FB['flash' + i + ':' + x.out] = true;
      txt = room.phase === 'podium' && x.place === 1 ? '🏆 Sieg' : `raus · Platz ${x.place} (Runde ${x.out})`;
    } else if (room.phase === 'podium' && x.place === 1) { cls = 'ok'; txt = '🏆 Sieg'; }
    else if (x.res === 'ok') { cls = 'ok'; txt = '✓ geschafft'; }
    else if (x.res === 'fail') { cls = 'out'; txt = x.why === 'zeit' ? '✗ Zeit um' : '✗ Fehler'; }
    else if (now < f.openAt) txt = 'merkt sich die Folge …';
    else txt = `tippt … ${Math.max(x.k, FB.prog[i] || 0)}/${len}`;
    const k = x.res === 'ok' ? len : Math.max(x.k, FB.prog[i] || 0);
    const dots = x.alive ? `<div class="dots">${Array.from({ length: len }, (_, j) => `<i class="${j < k ? 'on' : ''}"></i>`).join('')}</div>` : '';
    const off = f.online && !f.online[i] && room.phase === 'final' ? '<div class="warn">Handy nicht verbunden!</div>' : '';
    return `<div class="fcard ${cls}" data-slot="${i}"><div class="fn"><b>${esc(f.names[i])}</b></div><div class="fs">${txt}</div>${dots}${off}</div>`;
  }).join('');
}
// Live-Fortschritt eines Finalisten (Punkte füllen sich beim Tippen)
function fortschritt(m) {
  if (!FB || !room || !room.final || m.nr !== FB.nr || m.r !== FB.round) return;
  FB.prog[m.slot] = Math.max(FB.prog[m.slot] || 0, m.k);
  karten(room.final);
}
// Zwischenstand bis zur nächsten Runde (alle Statusanzeigen aktualisieren)
setInterval(() => { if (FB && room && room.phase === 'final') karten(room.final); }, 500);

function rundenBanner(f) {
  const L = f.last;
  const old = $('#banner'); if (old) old.remove();
  const b = document.createElement('div');
  b.id = 'banner';
  if (!L.out.length) {
    b.className = 'banner good';
    b.innerHTML = `<h2>Alle richtig! ✓</h2><p>Runde ${L.round + 1}: ein Organ mehr</p>`;
    Ton.richtig();
  } else {
    b.className = 'banner';
    const parts = L.out.map(o => {
      const want = f.set[o.want], got = o.got >= 0 ? f.set[o.got] : null;
      return `<div><b style="font-size:1.4em">${esc(f.names[o.slot])}</b> ${o.why === 'zeit' ? '· Zeit abgelaufen' : got ? `· tippte ${esc(got.term)}` : ''}</div>` +
        (want ? `<div class="richtig ok"><span class="mini">${bild(want.id)}</span><div><span>Richtig wäre gewesen:</span><b>${esc(want.term)}</b><span>= ${esc(partner(want))}</span></div></div>` : '');
    }).join('');
    b.innerHTML = `<h2>${L.out.length === 1 ? 'Raus!' : 'Raus!'}</h2>${parts}`;
    Ton.raus();
  }
  document.body.appendChild(b);
  setTimeout(() => { if (b.isConnected) b.remove(); }, L.out.length ? 3200 : 1800);
}

// ---------------------------------------------------------------- Siegerehrung
let podiumT = 0;
function podium() {
  const f = room.final;
  if (screen === 'podium:' + f.nr) return;
  // Erst das Ergebnis der letzten Runde am Finale-Bildschirm zeigen
  if (screen === 'final:' + f.nr && FB) {
    if (FB.lastShown !== f.nr + ':' + f.last.round) { FB.lastShown = f.nr + ':' + f.last.round; rundenBanner(f); }
    karten(f);
    FB.timers.forEach(clearTimeout); cancelAnimationFrame(FB.raf); zeit(null);
    status(`Runde ${f.round}`, 'Finale vorbei!', 'tippen');
    clearTimeout(podiumT);
    podiumT = setTimeout(() => { screen = 'pre-podium'; podiumZeigen(); }, 3300);
    screen = 'final-end:' + f.nr;
    return;
  }
  if (screen === 'final-end:' + f.nr) return;
  podiumZeigen();
}
function podiumZeigen() {
  const f = room && room.final; if (!f || room.phase !== 'podium') return;
  stopFinal();
  const b = $('#banner'); if (b) b.remove();
  screen = 'podium:' + f.nr;
  const order = f.p.map((pid, i) => ({ name: f.names[i], place: f.st[i].place, x: f.st[i] })).sort((a, b) => a.place - b.place);
  const w = order[0];
  view.innerHTML = `<div class="tpage"><div class="podium">
      <div class="tcard winner">
        <div class="pokal">🏆</div>
        <h2>${esc(w.name)} gewinnt!</h2>
        <p>${w.x.res === 'ok' || w.x.alive ? `${organeText(f.round)} in der richtigen Reihenfolge` : `${organeText(w.x.k)} in Runde ${f.round}`}</p>
        <ol class="places">${order.map(o => `<li>${o.place}. ${esc(o.name)} <span>${o.place === 1 ? 'Sieg' : 'raus in Runde ' + o.x.out}</span></li>`).join('')}</ol>
      </div>
      <div class="tcard seqcard"><h2 style="font-size:1.3em">Die Folge zum Nachlesen</h2>
        <ul class="olist">${f.seq.map((i, j) => { const o = f.set[i]; return `<li><span class="nr">${j + 1}.</span><span class="mini">${bild(o.id)}</span><span><b>${esc(o.term)}</b> = ${esc(partner(o))}</span></li>`; }).join('')}</ul>
      </div>
    </div>
    <div class="tactions"><button class="ghost-btn" id="btnLobby">Neues Spiel <span class="kbd">Esc</span></button>
      <button class="ghost-btn" id="btnOther">Andere Finalisten</button><span class="grow"></span>
      <button class="big-btn" id="btnRev">Revanche <span class="kbd">Enter</span></button></div>
  </div>`;
  $('#btnLobby').onclick = toLobby;
  $('#btnOther').onclick = () => send({ t: 'to-setup' });
  $('#btnRev').onclick = () => { Ton.init(); send({ t: 'revanche', cfg }); };
  Ton.fanfare();
  konfetti();
}
function konfetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#ffb238', '#ff5d73', '#4da3ff', '#3ddc97', '#b57bff', '#fff'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cols[i % cols.length];
    p.style.animationDuration = 2.4 + Math.random() * 2.6 + 's';
    p.style.animationDelay = Math.random() * 1.2 + 's';
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 6500);
}

// ---------------------------------------------------------------- Tasten
document.addEventListener('keydown', e => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (!$('#dlg').hidden) { if (e.key === 'Escape') $('#dlg').hidden = true; return; }
  if (!room) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    if (room.phase === 'lobby') startQuali();
    else if (room.phase === 'quali') endQuali();
    else if (room.phase === 'final-setup') startFinal();
    else if (room.phase === 'podium' && screen.startsWith('podium')) { Ton.init(); send({ t: 'revanche', cfg }); }
  } else if (e.key === 'Escape') {
    if (room.phase === 'final-setup' || (room.phase === 'podium' && screen.startsWith('podium'))) toLobby();
  } else if (e.key === 'f' || e.key === 'F') vollbild();
  else if (e.key === 'm' || e.key === 'M') btnTon.click();
});

// ---------------------------------------------------------------- Start
if (!sess || !sess.code || !sess.key) newSession(); else connect();
