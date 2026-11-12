// Browser-Durchlauf: Beamer + 5 Handys durch Qualifying, Finale („Schwer“, 6 Organe) und Revanche (8 Organe).
// Start:  node tests/e2e.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PW = process.env.PLAYWRIGHT || 'playwright';
const { chromium } = await import(PW);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'ergebnisse');
fs.mkdirSync(OUT, { recursive: true });
// Mit Adresse (z. B. node tests/e2e.mjs http://127.0.0.1:8787 bei laufendem „npx wrangler dev“) wird kein eigener Server gestartet
const PORT = 8790, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
let srv = null;
if (!process.argv[2]) {
  srv = spawn(process.execPath, [path.join(ROOT, 'server', 'local.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  await new Promise(r => srv.stdout.once('data', r));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Zählt, ob eine Seite eine Tonausgabe (AudioContext) startet – Handys müssen stumm bleiben
const audioZaehler = () => {
  window.__audio = 0;
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  const Z = function (...a) { window.__audio++; return new A(...a); };
  Z.prototype = A.prototype;
  window.AudioContext = window.webkitAudioContext = Z;
};
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
const errors = [];
const browser = await chromium.launch();
let ok = false;
try {
  const tctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const T = await tctx.newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  log('Code', code);
  await T.evaluate(() => { window.__simonLog = []; });

  const names = [['Lena', 'K'], ['Tom', 'B'], ['Aylin', 'S'], ['Max', 'M'], ['Sara', 'P']];
  const phones = [];
  for (const [i, [first, ini]] of names.entries()) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await ctx.addInitScript(audioZaehler);
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(first + ': ' + e.message));
    await p.goto(`${BASE}/mitspielen?c=${code}`);
    await p.fill('#fFirst', first); await p.fill('#fInit', ini);
    await p.click('button[type=submit]');
    await p.waitForSelector('.waitdots');
    await p.evaluate(() => { window.__simonLog = []; });
    phones.push({ p, name: first });
  }
  await T.waitForFunction(() => document.querySelectorAll('.name').length === 5);
  await T.screenshot({ path: path.join(OUT, '01-beamer-lobby.png') });
  await phones[0].p.screenshot({ path: path.join(OUT, '02-handy-warten.png') });

  // ---------------- Qualifying (Einfach, 4 Organe, deutsche Wörter)
  await T.click('.seg[aria-label="Begriffe"] button:has-text("Deutsch")');
  await sleep(300);
  await T.keyboard.press('Enter');
  await phones[0].p.waitForSelector('.kachel .term');
  const { ORGANE } = await import('../public/js/organe.js');
  const woerter = await phones[0].p.$$eval('.kachel .term', els => els.map(e => e.textContent));
  if (!woerter.every(w => ORGANE.some(o => o.de === w))) throw new Error('Deutsch erwartet, gezeigt: ' + woerter.join(', '));
  log('Knöpfe auf Deutsch:', woerter.join(', '));
  const tap = (p, i) => p.locator(`.kachel[data-i="${i}"]`).click({ force: true });
  // Qualifying: 90 Sekunden, nach einem Fehler startet automatisch ein neuer Versuch.
  // plan = je Versuch, wie viele Runden richtig sind (danach ein Fehler). Danach tippt das Handy nichts mehr.
  async function qualiSpielen(ph, plan, langsam) {
    const p = ph.p;
    for (const [vi, ziel] of plan.entries()) {
      for (let lvl = 1; ; lvl++) {
        await p.waitForFunction(() => document.querySelector('.brett.aktiv'), null, { timeout: 30000 });
        const seq = await p.evaluate(() => window.__simonLog.slice());
        await p.evaluate(() => { window.__simonLog = []; });
        if (seq.length !== lvl) throw new Error(`${ph.name}: Versuch ${vi + 1}, Runde ${lvl}, aber ${seq.length} Organe vorgespielt`);
        if (lvl === 2 && vi === 0 && ph.name === 'Lena') await p.screenshot({ path: path.join(OUT, '03-handy-quali-tippen.png') });
        if (lvl > ziel) {
          await tap(p, (seq[seq.length - 1] + 1) % 4);
          if (vi === 0 && ph.name === 'Lena') { await p.waitForSelector('#zwischen:not([hidden])'); await p.screenshot({ path: path.join(OUT, '03b-handy-quali-neuer-versuch.png') }); }
          break;
        }
        for (const i of seq) { await tap(p, i); await sleep(langsam ? 500 : 120); }
      }
    }
  }
  const t0 = Date.now();
  await Promise.all([
    qualiSpielen(phones[0], [4, 2], false),
    qualiSpielen(phones[1], [3], false),
    qualiSpielen(phones[2], [2], false),
    qualiSpielen(phones[3], [1, 3], true),
    qualiSpielen(phones[4], [0], false),
  ]);
  log('Qualifying gespielt nach', Math.round((Date.now() - t0) / 1000), 's – warte auf das Ende der Spielzeit');
  if (!(await T.textContent('#qTimer')).includes(':')) throw new Error('Beamer zeigt keine Restzeit');
  await T.screenshot({ path: path.join(OUT, '05a-beamer-quali-laeuft.png') });
  await phones[0].p.waitForSelector('.card h2:has-text("Zeit um")', { timeout: 120000 });
  await T.waitForFunction(() => document.querySelector('#qTimer') && document.querySelector('#qTimer').textContent.includes('Endstand'), null, { timeout: 20000 });
  await phones[0].p.waitForSelector('.placebox', { timeout: 10000 });
  await sleep(800);
  await phones[0].p.screenshot({ path: path.join(OUT, '04-handy-quali-ergebnis.png'), fullPage: true });
  await T.screenshot({ path: path.join(OUT, '05-beamer-quali-rangliste.png') });
  const order = await T.$$eval('.rk .nm', els => els.map(e => e.textContent));
  log('Rangliste', order.join(', '));
  const lv = await T.$$eval('.rk .lv', els => els.map(e => e.textContent));
  if (lv.slice(0, 4).join() !== '4,3,3,2') throw new Error('Bestwerte falsch: ' + lv.join());
  if (order.slice(0, 4).join() !== 'Lena K.,Tom B.,Max M.,Aylin S.') throw new Error('Rangliste falsch: ' + order.join());

  // ---------------- Finale einrichten: „Schwer“, 6 Organe
  await T.keyboard.press('Enter');
  await T.waitForSelector('#slots select');
  await T.click('.seg[aria-label="Anzahl Organe"] button:has-text("6 Organe")');
  await T.click('.seg[aria-label="Schwierigkeit"] button:has-text("Schwer")');
  await T.click('.seg[aria-label="Begriffe"] button:has-text("Fachbegriff")');
  await T.click('.seg[aria-label="Zeitlimit"] button:has-text("Ohne Zeitlimit")');
  await sleep(300);
  await T.screenshot({ path: path.join(OUT, '06-beamer-finale-auswahl.png') });
  await T.evaluate(() => { window.__simonLog = []; });
  await T.keyboard.press('Enter');
  await T.waitForSelector('#fBrett');
  const fin = { Lena: phones[0], Tom: phones[1], Max: phones[3], Aylin: phones[2] };
  // Plan je Runde: wer was tut ('ok', 'falsch', 'zeit')
  const plan = {
    1: { Lena: 'ok', Tom: 'ok', Max: 'ok', Aylin: 'ok' },
    2: { Lena: 'ok', Tom: 'ok', Max: 'ok', Aylin: 'falsch' },
    3: { Lena: 'ok', Tom: 'ok', Max: 'stopp' },
    4: { Lena: 'ok', Tom: 'falsch' },
  };
  let seqAll = [];
  for (let r = 1; r <= 4; r++) {
    await phones[0].p.waitForFunction(() => document.querySelector('.brett.aktiv'), null, { timeout: 40000 });
    const neu = await T.evaluate(() => { const l = window.__simonLog.slice(); window.__simonLog = []; return l; });
    if (neu.length !== 1) throw new Error('Schwer: Es sollte genau ein neues Organ gezeigt werden, gezeigt: ' + neu.length);
    seqAll = seqAll.concat(neu);
    log('Finale Runde', r, 'Folge', seqAll.join(''));
    if (r === 2) {
      await T.screenshot({ path: path.join(OUT, '07-beamer-finale-schwer-tippen.png') });
      await phones[0].p.screenshot({ path: path.join(OUT, '08-handy-finale-schwer.png') });
    }
    await Promise.all(Object.entries(plan[r]).map(async ([name, what]) => {
      const p = fin[name].p;
      if (what === 'stopp') return; // tippt nicht weiter, die Lehrkraft beendet die Runde
      const n = what === 'falsch' ? seqAll.length - 1 : seqAll.length;
      for (let k = 0; k < n; k++) { await tap(p, seqAll[k]); await sleep(150); }
      if (what === 'falsch') await tap(p, (seqAll[n] + 1) % 6);
    }));
    if (r === 1 && !(await phones[0].p.isHidden('#sBarBox'))) throw new Error('Ohne Zeitlimit darf kein Zeitbalken erscheinen');
    if (r === 3) {
      await T.waitForFunction(() => [...document.querySelectorAll('.fcard.ok')].length === 2, null, { timeout: 10000 });
      await sleep(1500); // ohne Zeitlimit läuft nichts ab
      if (await T.$('.fcard.out .fs:has-text("raus · Platz 3")')) throw new Error('Runde endete ohne „Runde beenden“');
      await T.click('#btnStop');
    }
    if (r === 2) { await sleep(900); await T.screenshot({ path: path.join(OUT, '09-beamer-finale-raus.png') }); }
  }
  await T.waitForSelector('.winner', { timeout: 40000 });
  await sleep(1200);
  await T.screenshot({ path: path.join(OUT, '10-beamer-siegerehrung.png') });
  const places = await T.$$eval('.places li', els => els.map(e => e.textContent.trim()));
  log('Plätze', places.join(' | '));
  if (!places[0].startsWith('1. Lena') || !places[1].startsWith('2. Tom') || !places[2].startsWith('3. Max') || !places[3].startsWith('4. Aylin')) throw new Error('Plätze falsch');
  await phones[0].p.waitForSelector('.card.good');
  await phones[0].p.screenshot({ path: path.join(OUT, '11-handy-sieg.png'), fullPage: true });
  await phones[2].p.screenshot({ path: path.join(OUT, '12-handy-ausgeschieden.png'), fullPage: true });
  await phones[4].p.screenshot({ path: path.join(OUT, '13-handy-zuschauer.png') });

  // ---------------- Andere Finalisten: 2 Personen, Einfach, 8 Organe
  await T.click('#btnOther');
  await T.waitForSelector('#slots select');
  await T.click('.seg[aria-label="Anzahl Organe"] button:has-text("8 Organe")');
  await T.click('.seg[aria-label="Schwierigkeit"] button:has-text("Einfach")');
  await T.click('.seg[aria-label="Größe des Finales"] button:has-text("2 Personen")');
  await sleep(600);
  await T.evaluate(() => { window.__simonLog = []; });
  await T.keyboard.press('Enter');
  seqAll = [];
  for (let r = 1; r <= 2; r++) {
    await phones[0].p.waitForFunction(() => document.querySelector('.brett.aktiv'), null, { timeout: 40000 });
    const l = await T.evaluate(() => { const l = window.__simonLog.slice(); window.__simonLog = []; return l; });
    if (l.length !== r) throw new Error('Einfach: ganze Folge erwartet');
    seqAll = l;
    if (r === 2) await phones[1].p.screenshot({ path: path.join(OUT, '14-handy-finale-8.png') });
    // Runde 2: beide falsch, Lena bei Organ 2, Tom bei Organ 1 → Lena gewinnt
    await Promise.all([[phones[0].p, r === 2 ? 1 : 9], [phones[1].p, r === 2 ? 0 : 9]].map(async ([p, falschBei]) => {
      for (let k = 0; k < seqAll.length; k++) {
        if (k === falschBei) { await tap(p, (seqAll[k] + 1) % 8); return; }
        await tap(p, seqAll[k]); await sleep(150);
      }
    }));
    if (r === 1) {
      await T.waitForFunction(() => window.__simonLog.length > 0, null, { timeout: 15000 });
      await sleep(250);
      await T.screenshot({ path: path.join(OUT, '15-beamer-finale-8-leuchtet.png') });
    }
  }
  await T.waitForSelector('.winner', { timeout: 40000 });
  const places2 = await T.$$eval('.places li', els => els.map(e => e.textContent.trim()));
  log('Plätze', places2.join(' | '));
  if (!places2[0].startsWith('1. Lena')) throw new Error('Plätze (8) falsch');

  // ---------------- Finale gegen den Computer: 1 Person + CPU (leicht)
  await T.click('#btnOther');
  await T.waitForSelector('#slots select');
  await T.evaluate(() => {
    const s = document.querySelectorAll('#slots select');
    const o = [...s[0].options].find(x => x.textContent.includes('Lena K.'));
    s[0].value = o.value; s[0].dispatchEvent(new Event('change'));
  });
  await sleep(500);
  await T.selectOption('#slots .slot:nth-of-type(2) select', 'cpu-leicht');
  await T.waitForFunction(() => document.querySelectorAll('#slots .online')[1].textContent.includes('Computergegner'));
  await T.screenshot({ path: path.join(OUT, '19-beamer-finale-cpu-auswahl.png') });
  await T.evaluate(() => { window.__simonLog = []; });
  await T.keyboard.press('Enter');
  for (let r = 1; r < 20; r++) {
    const sieg = await Promise.race([
      phones[0].p.waitForFunction(() => document.querySelector('.brett.aktiv'), null, { timeout: 90000 }).then(() => false).catch(() => false),
      T.waitForSelector('.winner', { timeout: 90000 }).then(() => true).catch(() => false),
    ]);
    if (sieg) break;
    const l = await T.evaluate(() => { const l = window.__simonLog.slice(); window.__simonLog = []; return l; });
    if (l.length !== r) throw new Error(`CPU-Finale Runde ${r}: ${l.length} Organe vorgespielt`);
    for (const i of l) { await tap(phones[0].p, i); await sleep(150); }
    if (r === 2) { await sleep(400); await T.screenshot({ path: path.join(OUT, '20-beamer-finale-cpu.png') }); }
    await phones[0].p.waitForFunction(() => !document.querySelector('.brett.aktiv'));
  }
  await T.waitForSelector('.winner', { timeout: 30000 });
  const places3 = await T.$$eval('.places li', els => els.map(e => e.textContent.trim()));
  log('Plätze gegen CPU', places3.join(' | '));
  if (!places3[0].startsWith('1. Lena') || !places3[1].includes('CPU')) throw new Error('CPU-Finale falsch');

  // ---------------- Übungsseite
  const uctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await uctx.addInitScript(audioZaehler);
  const U = await uctx.newPage();
  U.on('pageerror', e => errors.push('Üben: ' + e.message));
  await U.goto(BASE + '/');
  await U.screenshot({ path: path.join(OUT, '16-ueben-menue.png') });
  await U.click('.seg[data-name="n"] button[data-v="8"]');
  await U.click('.seg[data-name="modus"] button[data-v="schwer"]');
  await U.evaluate(() => { window.__simonLog = []; });
  await U.click('#btnGo');
  await U.waitForFunction(() => document.querySelector('.begriffkarte.an'), null, { timeout: 10000 });
  await sleep(300);
  await U.screenshot({ path: path.join(OUT, '17-ueben-schwer-neu.png') });
  await U.waitForFunction(() => document.querySelector('.brett.aktiv'), null, { timeout: 10000 });
  await U.screenshot({ path: path.join(OUT, '18-ueben-schwer-tippen.png') });

  for (const ph of phones) if (await ph.p.evaluate(() => window.__audio)) throw new Error(ph.name + ': Handy hat Ton gestartet');
  if (await U.evaluate(() => window.__audio)) throw new Error('Übungsseite hat Ton gestartet');
  log('Handys und Übungsseite stumm ✓');
  if (errors.length) throw new Error('JavaScript-Fehler:\n' + errors.join('\n'));
  ok = true;
  log('ALLES OK');
} catch (e) {
  console.error('FEHLER:', e.message);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await browser.close();
  if (srv) srv.kill();
  process.exit(ok ? 0 : 1);
}
