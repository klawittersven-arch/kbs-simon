// Raum-Logik für eine Klasse: Anmeldung, Qualifying (jede/r allein auf dem Handy) und Finale am Beamer.
// Diese Datei kennt weder Cloudflare noch Node. Der Server-Adapter
// (src/worker.js für Cloudflare, server/local.mjs für den Laptop) reicht Verbindungen und Speicher herein.
import { ORGANE } from '../public/js/organe.js';
import {
  GROESSEN, MODI, BEGRIFFE, FINAL_GROESSEN, MAX_LEN, VORLAUF_START, VORLAUF_RUNDE, GNADE,
  folge, zieheSet, rundenPlan, zeitLimit, vergleichQuali, zufallsSeed,
} from '../public/js/regeln.js';

export const MAX_PLAYERS = 60;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{0,15}$/;

export function cleanName(first, initial) {
  first = String(first || '').trim().replace(/\s+/g, ' ');
  initial = String(initial || '').trim();
  if (!NAME_RE.test(first)) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(initial)) return null;
  const cap = s => s.charAt(0).toLocaleUpperCase('de-DE') + s.slice(1);
  return cap(first) + ' ' + initial.toLocaleUpperCase('de-DE') + '.';
}
const int = (v, lo, hi, def) => {
  v = Number(v);
  return Number.isInteger(v) && v >= lo && v <= hi ? v : def;
};
const ms = v => { v = Math.round(Number(v)); return Number.isFinite(v) && v >= 0 && v < 3600000 ? v : 0; };

export function cleanCfg(c, old) {
  c = c || {}; old = old || {};
  const pick = (v, list, def) => list.includes(v) ? v : def;
  return {
    n: pick(Number(c.n), GROESSEN, pick(Number(old.n), GROESSEN, 4)),
    modus: pick(c.modus, MODI, pick(old.modus, MODI, 'fest')),
    begriffe: pick(c.begriffe, BEGRIFFE, pick(old.begriffe, BEGRIFFE, 'fach')),
    finalN: pick(Number(c.finalN), FINAL_GROESSEN, pick(Number(old.finalN), FINAL_GROESSEN, 4)),
  };
}

export function freshState(code) {
  return {
    v: 1, code, teacherKey: null, created: 0, updated: 0,
    phase: 'lobby', // lobby | quali | final-setup | final | podium
    cfg: cleanCfg({}),
    players: {},
    order: [], // pids in Anmelde-Reihenfolge
    quali: null,
    final: null,
    nr: 0, // zählt Qualifying- und Finalrunden, damit alte Nachrichten nicht zählen
  };
}

/*
 * Eine Finalrunde auswerten. st: Zustand je Finalist ({alive, res, k, ms, ...}).
 * Wer einen Fehler macht, scheidet aus. Scheiden in einer Runde mehrere aus, steht vorn,
 * wer mehr Organe richtig hatte, bei Gleichstand, wer länger durchgehalten hat.
 * Rückgabe: { ok: [Slots], out: [Slots, bester zuerst], done: bool }
 */
export function werteRunde(st) {
  const alive = st.map((x, i) => i).filter(i => st[i].alive);
  const ok = alive.filter(i => st[i].res === 'ok');
  const out = alive.filter(i => st[i].res !== 'ok');
  out.sort((a, b) => (st[b].k - st[a].k) || (st[b].ms - st[a].ms) || (a - b));
  let place = ok.length + 1;
  for (const i of out) { st[i].alive = false; st[i].place = place++; }
  let done = false;
  if (ok.length === 0) done = true;              // alle raus: der Beste dieser Runde gewinnt
  else if (ok.length === 1 && out.length) { st[ok[0]].place = 1; done = true; } // nur noch eine/r übrig
  return { ok, out, done };
}

export class RoomLogic {
  /**
   * @param {object} io  Adapter:
   *   io.load() -> Promise<state|null>
   *   io.save(state) -> Promise
   *   io.wipe() -> Promise
   *   io.conns() -> Array<{meta, ws, send(obj), sendRaw(str), close(code, reason)}>
   *   io.setMeta(conn, meta)
   *   io.now() -> ms
   */
  constructor(io) { this.io = io; this.s = null; }

  async state(code) {
    if (!this.s) this.s = (await this.io.load()) || freshState(code);
    return this.s;
  }
  async persist() { this.s.updated = this.io.now(); await this.io.save(this.s); }

  // ---------- Verbindungen
  async open(conn, q) {
    const s = await this.state(q.code);
    const role = q.role === 'teacher' ? 'teacher' : 'player';
    if (role === 'teacher') {
      const key = String(q.key || '');
      if (key.length < 12 || key.length > 64) return this.reject(conn, 'bad-key');
      if (!s.teacherKey) { s.teacherKey = key; s.created = this.io.now(); await this.persist(); }
      else if (s.teacherKey !== key) return this.reject(conn, 'code-taken');
      this.io.setMeta(conn, { role: 'teacher' });
      conn.send(this.roomMsg());
    } else {
      const pid = String(q.pid || '');
      if (!/^[a-z0-9]{8,24}$/.test(pid)) return this.reject(conn, 'bad-pid');
      if (!s.teacherKey) return this.reject(conn, 'no-room');
      this.io.setMeta(conn, { role: 'player', pid });
      conn.send(this.youMsg(pid));
      this.pushTeachers();
    }
  }
  reject(conn, why) {
    try { conn.send({ t: 'error', why }); conn.close(4001, why); } catch (e) {}
  }
  async close(conn) {
    const m = conn.meta || {};
    if (m.role !== 'player') return;
    await this.state();
    this.closing = conn.ws;
    try { this.pushTeachers(); } finally { this.closing = null; }
  }

  // ---------- Nachrichten
  async message(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 4096) return;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    const m = conn.meta || {};
    const s = await this.state();
    if (msg.t === 'sync') { conn.send({ t: 'sync', c: msg.c, s: this.io.now() }); return; }
    if (m.role === 'teacher') return this.teacherMsg(conn, msg, s);
    if (m.role === 'player') return this.playerMsg(conn, msg, s, m.pid);
  }

  async teacherMsg(conn, msg, s) {
    const now = this.io.now();
    switch (msg.t) {
      case 'cfg': {
        s.cfg = cleanCfg(msg.cfg, s.cfg);
        await this.persist(); this.pushTeachers(); return;
      }
      case 'kick': {
        const pid = String(msg.pid || ''); if (!s.players[pid]) return;
        if (s.final && s.final.p.includes(pid) && (s.phase === 'final' || s.phase === 'podium')) return conn.send({ t: 'error', why: 'kick-finalist' });
        delete s.players[pid]; s.order = s.order.filter(p => p !== pid);
        if (s.final && s.phase === 'final-setup') s.final.p = s.final.p.filter(p => p !== pid);
        for (const c of this.io.conns()) if ((c.meta || {}).pid === pid) c.send({ t: 'kicked' });
        await this.persist(); this.pushTeachers(); return;
      }
      case 'quali-start': {
        if (s.phase !== 'lobby') return;
        if (!s.order.length) return conn.send({ t: 'error', why: 'no-players' });
        s.cfg = cleanCfg(msg.cfg, s.cfg);
        const seed = zufallsSeed();
        s.nr++;
        s.quali = {
          nr: s.nr, seed, n: s.cfg.n, modus: s.cfg.modus,
          set: zieheSet(seed, s.cfg.n, s.cfg.begriffe, ORGANE),
          startAt: now + VORLAUF_START, open: true,
        };
        for (const pid of s.order) s.players[pid].q = null;
        s.final = null; s.phase = 'quali';
        await this.persist(); this.pushAll(); return;
      }
      case 'quali-end': {
        if (s.phase !== 'quali' || !s.quali) return;
        s.quali.open = false;
        for (const pid of s.order) {
          const p = s.players[pid];
          if (!p.q) p.q = { lvl: 0, ms: 0, done: true, fail: { why: 'ende' } };
          else if (!p.q.done) { p.q.done = true; p.q.fail = { why: 'ende' }; }
        }
        s.phase = 'final-setup';
        s.final = { p: this.ranking().slice(0, s.cfg.finalN), state: 'setup' };
        await this.persist(); this.pushAll(); return;
      }
      case 'final-pick': {
        if (s.phase !== 'final-setup') return;
        const p = this.cleanFinalists(msg.p, s);
        if (!p) return;
        s.final = { p, state: 'setup' };
        await this.persist(); this.pushTeachers(); return;
      }
      case 'final-start': case 'revanche': {
        if (msg.t === 'final-start' && s.phase !== 'final-setup') return;
        if (msg.t === 'revanche' && s.phase !== 'podium') return;
        const p = msg.t === 'revanche' && s.final ? s.final.p.slice() : this.cleanFinalists(msg.p, s);
        if (!p || p.length < 2 || !p.every(pid => s.players[pid])) return conn.send({ t: 'error', why: 'final-players' });
        const on = this.online();
        if (!p.every(pid => on.has(pid))) return conn.send({ t: 'error', why: 'final-offline' });
        if (msg.cfg) s.cfg = cleanCfg(msg.cfg, s.cfg);
        const seed = zufallsSeed();
        s.nr++;
        const f = s.final = {
          nr: s.nr, p, names: p.map(pid => s.players[pid].name), seed,
          n: s.cfg.n, modus: s.cfg.modus, set: zieheSet(seed, s.cfg.n, s.cfg.begriffe, ORGANE),
          seq: folge(seed, s.cfg.n), round: 1, state: 'run', last: null,
          st: p.map(() => ({ alive: true, res: null, k: 0, ms: 0, why: '', got: -1, want: -1, place: 0, out: 0 })),
          ...rundenPlan(now + VORLAUF_START, 1, s.cfg.modus),
          revanche: msg.t === 'revanche' ? ((s.final && s.final.revanche) || 0) + 1 : 0,
        };
        f.first = true;
        s.phase = 'final';
        await this.persist(); this.pushAll(); return;
      }
      case 'tick': {
        // Der Beamer meldet: Die Eingabezeit ist abgelaufen
        const f = s.final;
        if (s.phase !== 'final' || !f || f.state !== 'run' || msg.nr !== f.nr || msg.r !== f.round) return;
        if (now < f.deadline + GNADE) return;
        f.st.forEach(x => { if (x.alive && !x.res) { x.res = 'fail'; x.why = 'zeit'; x.ms = zeitLimit(f.round); } });
        return this.maybeResolve(s);
      }
      case 'final-abort': {
        if (s.phase !== 'final' && s.phase !== 'podium') return;
        s.final = { p: s.final ? s.final.p : [], state: 'setup' };
        s.phase = 'final-setup';
        await this.persist(); this.pushAll(); return;
      }
      case 'to-setup': {
        if (s.phase !== 'podium') return;
        s.final = { p: s.final ? s.final.p : [], state: 'setup' };
        s.phase = 'final-setup';
        await this.persist(); this.pushAll(); return;
      }
      case 'to-lobby': {
        s.phase = 'lobby'; s.quali = null; s.final = null;
        for (const pid of s.order) s.players[pid].q = null;
        await this.persist(); this.pushAll(); return;
      }
      case 'wipe': {
        for (const c of this.io.conns()) { try { c.send({ t: 'ended' }); c.close(4000, 'ended'); } catch (e) {} }
        this.s = null; await this.io.wipe(); return;
      }
    }
  }

  cleanFinalists(list, s) {
    const p = Array.isArray(list) ? list.map(String).filter(pid => s.players[pid]) : [];
    if (new Set(p).size !== p.length || p.length > 4) return null;
    return p;
  }

  async playerMsg(conn, msg, s, pid) {
    const now = this.io.now();
    switch (msg.t) {
      case 'join': {
        const name = cleanName(msg.first, msg.initial);
        if (!name) return conn.send({ t: 'error', why: 'bad-name' });
        let p = s.players[pid];
        if (!p) {
          if (s.order.length >= MAX_PLAYERS) return conn.send({ t: 'error', why: 'full' });
          let shown = name, n = 2;
          const taken = new Set(Object.values(s.players).map(x => x.name));
          while (taken.has(shown)) shown = name + ' ' + (n++);
          p = s.players[pid] = { name: shown, at: now, q: null };
          s.order.push(pid);
        }
        await this.persist();
        conn.send(this.youMsg(pid)); this.pushTeachers(); return;
      }
      case 'leave': {
        // „Nicht ich?“: Name freigeben, solange kein Spiel mit diesem Namen läuft
        const p = s.players[pid]; if (!p) return;
        if (s.final && s.final.p.includes(pid) && s.phase !== 'lobby') return;
        delete s.players[pid]; s.order = s.order.filter(x => x !== pid);
        await this.persist(); conn.send(this.youMsg(pid)); this.pushTeachers(); return;
      }
      case 'q': case 'q-end': {
        // Fortschritt im Qualifying: lvl = Länge der zuletzt richtig wiederholten Folge
        const p = s.players[pid], Q = s.quali;
        if (!p || !Q || s.phase !== 'quali' || msg.nr !== Q.nr) return;
        if (p.q && p.q.done) return conn.send(this.youMsg(pid));
        const lvl = int(msg.lvl, 0, MAX_LEN, -1);
        if (lvl < 0 || (p.q && lvl < p.q.lvl)) return;
        p.q = { lvl, ms: ms(msg.ms), done: msg.t === 'q-end', fail: null };
        if (msg.t === 'q-end') {
          p.q.fail = { why: msg.why === 'zeit' ? 'zeit' : 'falsch', want: int(msg.want, 0, 7, -1), got: int(msg.got, -1, 7, -1) };
        }
        await this.persist();
        this.pushTeachers();
        if (msg.t === 'q-end') this.pushDonePlayers(); else conn.send({ t: 'q-ok', lvl });
        return;
      }
      case 'f': case 'f-ok': case 'f-fail': {
        const f = s.final;
        if (s.phase !== 'final' || !f || f.state !== 'run' || msg.nr !== f.nr || msg.r !== f.round) return;
        const slot = f.p.indexOf(pid); if (slot < 0) return;
        const x = f.st[slot]; if (!x.alive || x.res) return;
        if (now < f.openAt - 1000) return;
        const k = int(msg.k, 0, f.round, 0);
        if (msg.t === 'f') { // nur Fortschritt für die Anzeige am Beamer
          x.k = Math.max(x.k, Math.min(k, f.round - 1));
          const out = JSON.stringify({ t: 'fp', nr: f.nr, r: f.round, slot, k: x.k });
          for (const c of this.io.conns()) if ((c.meta || {}).role === 'teacher') c.sendRaw(out);
          return;
        }
        if (msg.t === 'f-ok' && now > f.deadline + GNADE) return;
        x.res = msg.t === 'f-ok' ? 'ok' : 'fail';
        x.ms = Math.min(ms(msg.ms), zeitLimit(f.round));
        x.k = msg.t === 'f-ok' ? f.round : Math.min(k, f.round - 1);
        x.why = msg.t === 'f-ok' ? '' : (msg.why === 'zeit' ? 'zeit' : 'falsch');
        x.got = msg.t === 'f-ok' ? -1 : int(msg.got, -1, 7, -1);
        return this.maybeResolve(s);
      }
    }
  }

  // Alle Verbliebenen haben geantwortet (oder die Zeit ist um): Runde auswerten
  async maybeResolve(s) {
    const f = s.final;
    if (f.st.some(x => x.alive && !x.res)) {
      await this.persist(); this.pushAll(); return;
    }
    const r = werteRunde(f.st);
    f.last = {
      round: f.round, ok: r.ok,
      out: r.out.map(i => ({ slot: i, k: f.st[i].k, why: f.st[i].why, got: f.st[i].got, want: f.seq[f.st[i].k] })),
    };
    for (const i of r.out) { f.st[i].out = f.round; f.st[i].want = f.seq[f.st[i].k]; }
    if (!r.done && f.round >= MAX_LEN) {
      // Unwahrscheinlich: alle schaffen 60 Organe. Dann entscheidet die Zeit der letzten Runde
      const alive = f.st.map((x, i) => i).filter(i => f.st[i].alive).sort((a, b) => f.st[a].ms - f.st[b].ms);
      alive.forEach((i, j) => { f.st[i].alive = false; f.st[i].place = j + 1; });
      r.done = true;
    }
    if (r.done) {
      f.state = 'done'; f.endAt = this.io.now();
      s.phase = 'podium';
    } else {
      f.round++;
      Object.assign(f, rundenPlan(this.io.now() + VORLAUF_RUNDE, f.round, f.modus));
      f.first = false;
      for (const x of f.st) if (x.alive) { x.res = null; x.k = 0; x.ms = 0; x.why = ''; x.got = -1; }
    }
    await this.persist(); this.pushAll();
  }

  // ---------- Sicht auf den Raum
  online() {
    const set = new Set();
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player' && c.ws !== this.closing) set.add(m.pid); }
    return set;
  }
  ranking() {
    const s = this.s;
    const list = s.order.filter(p => s.players[p] && s.players[p].q);
    list.sort((a, b) => vergleichQuali(s.players[a].q, s.players[b].q) || s.players[a].at - s.players[b].at);
    return list;
  }
  // Finale für Beamer und Finalisten: nur die Folge bis zur aktuellen Runde (nichts verraten)
  finalView(f, full) {
    if (!f) return null;
    if (f.state === 'setup') return { state: 'setup', p: f.p };
    const len = f.state === 'done' ? f.round : f.round;
    return {
      nr: f.nr, state: f.state, p: f.p, names: f.names, n: f.n, modus: f.modus, set: f.set,
      round: f.round, seq: f.seq.slice(0, len), startAt: f.startAt, openAt: f.openAt, deadline: f.deadline,
      first: f.first, last: f.last, revanche: f.revanche,
      st: full ? f.st : undefined,
    };
  }
  roomMsg() {
    const s = this.s, on = this.online(), rank = this.ranking();
    const players = s.order.filter(p => s.players[p]).map(pid => {
      const p = s.players[pid];
      return { pid, name: p.name, q: p.q, online: on.has(pid), rank: rank.indexOf(pid) + 1 };
    });
    const f = this.finalView(s.final, true);
    if (f) f.online = f.p.map(pid => on.has(pid));
    return { t: 'room', code: s.code, phase: s.phase, cfg: s.cfg, quali: s.quali, players, now: this.io.now(), final: f };
  }
  youMsg(pid) {
    const s = this.s, p = s.players[pid] || null, f = s.final;
    const rank = this.ranking(), r = rank.indexOf(pid);
    let final = null;
    if (f && f.state !== 'setup' && (s.phase === 'final' || s.phase === 'podium')) {
      const slot = f.p.indexOf(pid);
      final = this.finalView(f, false);
      final.slot = slot;
      final.me = slot >= 0 ? f.st[slot] : null;
      final.places = f.state === 'done' ? f.st.map(x => x.place) : null;
      if (slot < 0) { delete final.seq; delete final.set; }
    } else if (f && s.phase === 'final-setup') {
      final = { state: 'setup', chosen: f.p.includes(pid) };
    }
    const Q = s.quali;
    return {
      t: 'you', phase: s.phase, now: this.io.now(),
      me: p ? { name: p.name, q: p.q, rank: r + 1, of: rank.length } : null,
      quali: Q ? { nr: Q.nr, seed: Q.seed, n: Q.n, modus: Q.modus, set: Q.set, startAt: Q.startAt, open: Q.open } : null,
      final,
    };
  }
  pushTeachers() {
    if (!this.s) return;
    let msg = null;
    for (const c of this.io.conns()) if ((c.meta || {}).role === 'teacher') { msg = msg || JSON.stringify(this.roomMsg()); c.sendRaw(msg); }
  }
  pushPlayers() {
    if (!this.s) return;
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player') c.send(this.youMsg(m.pid)); }
  }
  // Nur an Handys, die im Qualifying schon fertig sind (sie sehen ihren Platz live)
  pushDonePlayers() {
    if (!this.s) return;
    for (const c of this.io.conns()) {
      const m = c.meta || {};
      if (m.role !== 'player') continue;
      const p = this.s.players[m.pid];
      if (p && p.q && p.q.done) c.send(this.youMsg(m.pid));
    }
  }
  pushAll() { this.pushTeachers(); this.pushPlayers(); }
}
