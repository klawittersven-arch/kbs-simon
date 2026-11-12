// Tests der Raum-Logik ohne Server:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomLogic, werteRunde, cleanName } from '../src/room.js';
import { folge, rundenPlan, zeitLimit, GNADE, VORLAUF_RUNDE, SCHLUSS_GNADE, vorspiel, zieheSet } from '../public/js/regeln.js';
import { ORGANE, partner } from '../public/js/organe.js';

function makeRoom() {
  let t = 1_000_000, saved = null;
  const conns = [];
  const logic = new RoomLogic({
    load: async () => saved, save: async s => { saved = structuredClone(s); }, wipe: async () => { saved = null; },
    conns: () => conns, setMeta: (c, m) => { c.meta = m; }, now: () => t,
  });
  const conn = () => { const c = { meta: {}, ws: {}, inbox: [], send(o) { this.inbox.push(o); }, sendRaw(s) { this.inbox.push(JSON.parse(s)); }, close() {} }; conns.push(c); return c; };
  const last = (c, type) => [...c.inbox].reverse().find(m => m.t === type);
  return { logic, conn, last, tick: ms => { t += ms; }, now: () => t, msg: (c, o) => logic.message(c, JSON.stringify(o)) };
}

test('Namen werden geprüft und vereinheitlicht', () => {
  assert.equal(cleanName('lena', 'k'), 'Lena K.');
  assert.equal(cleanName('', 'k'), null);
  assert.equal(cleanName('Lena', ''), null);
  assert.equal(cleanName('<b>', 'k'), null);
});

test('Folge ist für alle gleich und hat nie drei gleiche Organe hintereinander', () => {
  const a = folge(42, 4), b = folge(42, 4);
  assert.deepEqual(a, b);
  for (let i = 2; i < a.length; i++) assert.ok(!(a[i] === a[i - 1] && a[i] === a[i - 2]));
  assert.ok(folge(7, 8).every(x => x >= 0 && x < 8));
});

test('Begriffe: Fachbegriff oder Deutsch, Auflösung jeweils mit dem anderen Wort', () => {
  const fach = zieheSet(5, 8, 'fach', ORGANE), de = zieheSet(5, 8, 'de', ORGANE);
  assert.deepEqual(fach.map(o => o.id), de.map(o => o.id));
  const hepar = ORGANE.find(o => o.id === 'hepar');
  assert.equal(partner({ id: 'hepar', term: 'Hepar' }), 'Leber');
  assert.equal(partner({ id: 'hepar', term: 'Leber' }), 'Hepar');
  assert.equal(partner({ id: 'nephron', term: 'Nephron' }), 'Funktionseinheit der Niere');
  const all = zieheSet(1, ORGANE.length, 'de', ORGANE);
  assert.ok(all.every(o => o.alt && o.alt !== o.term), 'jedes Organ hat eine Auflösung');
  assert.ok(hepar);
  // alte Einstellung (z. B. „gr“) → Fachbegriff
  assert.equal(zieheSet(5, 4, 'gr', ORGANE)[0].term, fach[0].term);
});

test('Zeitlimit: sehr großzügig oder ganz aus', () => {
  assert.equal(zeitLimit(5), 50000);
  assert.equal(zeitLimit(10, 'an'), 80000);
  assert.equal(zeitLimit(5, 'aus'), 0);
  assert.equal(rundenPlan(0, 3, 'fest', 'aus').deadline, 0);
  assert.ok(rundenPlan(0, 3, 'fest', 'an').deadline > 0);
});

test('Ohne Zeitlimit: Runde läuft, bis alle fertig sind oder die Lehrkraft sie beendet', async () => {
  const R = makeRoom();
  const T = R.conn();
  await R.logic.open(T, { code: 'ABCDE', role: 'teacher', key: 'k'.repeat(20) });
  const P = ['aaaaaaaa1', 'bbbbbbbb2', 'cccccccc3'].map(pid => { const c = R.conn(); c.pid = pid; return c; });
  for (const c of P) { await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid }); await R.msg(c, { t: 'join', first: 'Ida', initial: 'z' }); }
  await R.msg(T, { t: 'quali-start', cfg: { zeit: 'aus' } });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid), cfg: { zeit: 'aus' } });
  let f = R.last(T, 'room').final;
  assert.equal(f.deadline, 0);
  R.tick(f.openAt - R.now() + 100);
  await R.msg(P[0], { t: 'f-ok', nr: f.nr, r: 1, ms: 700 });
  await R.msg(P[1], { t: 'f-ok', nr: f.nr, r: 1, ms: 900 });
  R.tick(10 * 60 * 1000); // 10 Minuten später: nichts läuft ab
  await R.msg(T, { t: 'tick', nr: f.nr, r: 1 });
  assert.equal(R.last(T, 'room').final.round, 1);
  await R.msg(P[2], { t: 'f-ok', nr: f.nr, r: 1, ms: 600000 }); // spätes Richtig zählt
  f = R.last(T, 'room').final;
  assert.equal(f.round, 2);
  // Runde 2: einer tippt nicht weiter → Lehrkraft beendet die Runde
  R.tick(f.openAt - R.now() + 100);
  await R.msg(P[0], { t: 'f-ok', nr: f.nr, r: 2, ms: 1500 });
  await R.msg(P[1], { t: 'f', nr: f.nr, r: 2, k: 1 });
  await R.msg(P[2], { t: 'f-ok', nr: f.nr, r: 2, ms: 2500 });
  await R.msg(T, { t: 'runde-stopp', nr: f.nr, r: 2 });
  f = R.last(T, 'room').final;
  assert.equal(f.round, 3);
  assert.equal(f.st[1].alive, false);
  assert.equal(f.st[1].why, 'stopp');
  assert.equal(f.st[1].place, 3);
  assert.equal(f.st[1].want, f.seq[1]);
});

test('Schwer spielt nur das neue Organ vor', () => {
  assert.deepEqual(vorspiel(5, 'schwer'), [4]);
  assert.deepEqual(vorspiel(3, 'fest'), [0, 1, 2]);
  const p = rundenPlan(0, 10, 'schwer'), q = rundenPlan(0, 10, 'fest');
  assert.ok(p.openAt < q.openAt);
});

test('Runde auswerten: Fehler scheiden aus, bester Ausgeschiedener vorn', () => {
  const st = [
    { alive: true, res: 'ok', k: 5, ms: 3000 },
    { alive: true, res: 'fail', k: 2, ms: 1500 },
    { alive: true, res: 'fail', k: 4, ms: 2000 },
    { alive: true, res: 'ok', k: 5, ms: 2500 },
  ];
  const r = werteRunde(st);
  assert.deepEqual(r.ok, [0, 3]);
  assert.deepEqual(r.out, [2, 1]);
  assert.equal(st[2].place, 3); assert.equal(st[1].place, 4);
  assert.equal(r.done, false);
});

test('Runde auswerten: alle raus → wer weiter kam, gewinnt', () => {
  const st = [
    { alive: true, res: 'fail', k: 3, ms: 2000 },
    { alive: true, res: 'fail', k: 3, ms: 4000 },
    { alive: false, place: 3 },
  ];
  const r = werteRunde(st);
  assert.equal(r.done, true);
  assert.equal(st[1].place, 1); assert.equal(st[0].place, 2);
});

test('Ganzer Ablauf: Anmeldung, Qualifying, Finale, Siegerehrung', async () => {
  const R = makeRoom();
  const T = R.conn();
  await R.logic.open(T, { code: 'ABCDE', role: 'teacher', key: 'k'.repeat(20) });
  const P = ['aaaaaaaa1', 'bbbbbbbb2', 'cccccccc3'].map(pid => { const c = R.conn(); c.pid = pid; return c; });
  for (const [i, c] of P.entries()) {
    await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
    await R.msg(c, { t: 'join', first: ['Mia', 'Mia', 'Tom'][i], initial: 'k' });
  }
  let room = R.last(T, 'room');
  assert.deepEqual(room.players.map(p => p.name), ['Mia K.', 'Mia K. 2', 'Tom K.']);

  await R.msg(T, { t: 'quali-start', cfg: { n: 6, modus: 'schwer', begriffe: 'de', finalN: 2, qmin: 1 } });
  const you = R.last(P[0], 'you');
  assert.equal(you.phase, 'quali');
  assert.equal(you.quali.set.length, 6);
  // Einstellung „Deutsch“: im Spiel das deutsche Wort, in der Auflösung der Fachbegriff
  for (const o of you.quali.set) { const g = ORGANE.find(x => x.id === o.id); assert.equal(o.term, g.de); }
  const nr = you.quali.nr;
  assert.equal(you.quali.endAt - you.quali.startAt, 60000); // eine Minute für alle
  R.tick(you.quali.startAt - R.now() + 1000);
  // Mia: Versuch 1 mit Fehler nach 2, Versuch 2 schafft 4
  await R.msg(P[0], { t: 'q', nr, v: 1, lvl: 1, ms: 900 });
  await R.msg(P[0], { t: 'q', nr, v: 1, lvl: 2, ms: 2000 });
  await R.msg(P[0], { t: 'q-fehler', nr, v: 1, lvl: 2, want: 2, got: 1 });
  await R.msg(P[0], { t: 'q', nr, v: 2, lvl: 4, ms: 9000 });
  // Mia 2: schafft 4 schneller; ein späterer schlechterer Versuch ändert nichts
  await R.msg(P[1], { t: 'q', nr, v: 1, lvl: 4, ms: 7000 });
  await R.msg(P[1], { t: 'q-fehler', nr, v: 1, lvl: 4, want: 0, got: 3 });
  await R.msg(P[1], { t: 'q', nr, v: 2, lvl: 3, ms: 100 });
  await R.msg(P[2], { t: 'q', nr, v: 1, lvl: 2, ms: 3000 });
  room = R.last(T, 'room');
  const mia2 = room.players.find(p => p.pid === P[1].pid);
  assert.equal(mia2.rank, 1); // gleich weit, aber schneller
  assert.deepEqual([mia2.q.lvl, mia2.q.ms, mia2.q.v], [4, 7000, 2]);
  assert.equal(room.players.find(p => p.pid === P[0].pid).q.v, 2);
  // Schluss erst, wenn die Minute um ist
  await R.msg(T, { t: 'quali-schluss', nr });
  assert.equal(R.last(T, 'room').quali.open, true);
  R.tick(60000 + SCHLUSS_GNADE + 500);
  await R.msg(P[2], { t: 'q', nr, v: 1, lvl: 9, ms: 1 }); // zu spät: zählt nicht
  await R.msg(T, { t: 'quali-schluss', nr });
  room = R.last(T, 'room');
  assert.equal(room.quali.open, false);
  assert.equal(room.players.find(p => p.pid === P[2].pid).q.lvl, 2);
  assert.equal(R.last(P[0], 'you').me.rank, 2);
  await R.msg(T, { t: 'quali-end' });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'final-setup');
  assert.deepEqual(room.final.p, [P[1].pid, P[0].pid]);

  await R.msg(T, { t: 'final-start', p: room.final.p, cfg: { n: 4, modus: 'fest' } });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'final');
  let f = room.final;
  assert.equal(f.seq.length, 1); // nichts verraten
  // Runde 1: beide richtig
  R.tick(f.openAt - R.now() + 500);
  await R.msg(P[1], { t: 'f-ok', nr: f.nr, r: 1, ms: 600 });
  await R.msg(P[0], { t: 'f-ok', nr: f.nr, r: 1, ms: 800 });
  f = R.last(T, 'room').final;
  assert.equal(f.round, 2);
  assert.equal(f.seq.length, 2);
  // Runde 2: einer tippt falsch → der andere gewinnt
  R.tick(f.openAt - R.now() + 500);
  await R.msg(P[0], { t: 'f-fail', nr: f.nr, r: 2, k: 1, got: 3, why: 'falsch', ms: 1200 });
  await R.msg(P[1], { t: 'f-ok', nr: f.nr, r: 2, ms: 1500 });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'podium');
  assert.deepEqual(room.final.st.map(x => x.place), [1, 2]);
  const yp = R.last(P[0], 'you');
  assert.equal(yp.final.me.place, 2);
  assert.equal(yp.final.me.want, room.final.seq[1]);
  // Zuschauer bekommt keine Folge
  const ys = R.last(P[2], 'you');
  assert.equal(ys.final.slot, -1);
  assert.equal(ys.final.seq, undefined);
});

test('Zeit abgelaufen: Beamer meldet tick, Server wertet aus', async () => {
  const R = makeRoom();
  const T = R.conn();
  await R.logic.open(T, { code: 'ABCDE', role: 'teacher', key: 'k'.repeat(20) });
  const P = ['aaaaaaaa1', 'bbbbbbbb2'].map(pid => { const c = R.conn(); c.pid = pid; return c; });
  for (const c of P) { await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid }); await R.msg(c, { t: 'join', first: 'Ali', initial: 'b' }); }
  await R.msg(T, { t: 'quali-start' });
  await R.msg(T, { t: 'quali-end' });
  await R.msg(T, { t: 'final-start', p: P.map(c => c.pid) });
  let f = R.last(T, 'room').final;
  R.tick(f.openAt - R.now() + 100);
  await R.msg(P[0], { t: 'f-ok', nr: f.nr, r: 1, ms: 700 });
  await R.msg(P[1], { t: 'f', nr: f.nr, r: 1, k: 0 });
  await R.msg(T, { t: 'tick', nr: f.nr, r: 1 }); // zu früh: nichts passiert
  assert.equal(R.last(T, 'room').phase, 'final');
  R.tick(zeitLimit(1) + GNADE + 100);
  await R.msg(T, { t: 'tick', nr: f.nr, r: 1 });
  const room = R.last(T, 'room');
  assert.equal(room.phase, 'podium');
  assert.equal(room.final.st[1].why, 'zeit');
  assert.equal(room.final.st[0].place, 1);
});
