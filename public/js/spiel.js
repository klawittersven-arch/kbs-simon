// Ein Spiel allein auf dem Handy (Qualifying und Üben):
// Folge vorspielen → nachtippen → eine mehr → … bis zum ersten Fehler oder bis die Zeit um ist.
import { takt, zeitLimit, vorspiel, nurBilder, mischt } from './regeln.js';
import { mischen } from './brett.js';
import { Ton } from './ton.js';

export class SoloSpiel {
  /**
   * o: { brett, seq, modus, n, startLvl,
   *      onPhase(phase, len)   'merken' | 'tippen' | 'geschafft'
   *      onZeit(rest, gesamt)  Restzeit der Eingabe in ms (oder null)
   *      onLevel(lvl, ms)      Folge der Länge lvl richtig, ms = Eingabezeit gesamt
   *      onEnde({lvl, ms, why, want, got, pos, len}) }
   */
  constructor(o) {
    this.o = o;
    this.lvl = o.startLvl || 0;
    this.ms = o.startMs || 0;
    this.timers = [];
    this.raf = 0;
    this.aktiv = false;
    this.pos = 0;
    this.len = 0;
  }
  later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); return t; }
  stop() {
    this.aktiv = false;
    this.timers.forEach(clearTimeout); this.timers = [];
    cancelAnimationFrame(this.raf);
    this.o.brett.eingabe(false);
    this.o.brett.aus();
    this.o.onZeit && this.o.onZeit(null);
  }
  start(warte = 0) {
    this.aktiv = true;
    this.later(() => this.runde(this.lvl + 1), warte);
  }
  runde(len) {
    if (!this.aktiv) return;
    const { brett, seq, modus, n } = this.o;
    this.len = len; this.pos = 0;
    brett.eingabe(false);
    brett.aus();
    // Vorgespielt wird immer in der Grundordnung (wie am Beamer)
    if (mischt(modus)) brett.layout(Array.from({ length: n }, (_, i) => i));
    if (nurBilder(modus)) { brett.gedimmt(true); brett.karteZeigen(true); }
    this.o.onPhase && this.o.onPhase('merken', len);
    this.o.onZeit && this.o.onZeit(null);
    const t = takt(len, modus);
    const vor = 900;
    const stellen = vorspiel(len, modus);
    stellen.forEach((pos, j) => {
      this.later(() => {
        brett.leuchte(seq[pos], t.an);
        Ton.organ(seq[pos], n, t.an);
      }, vor + j * t.schritt);
    });
    this.later(() => this.eingabe(), vor + stellen.length * t.schritt + 250);
  }
  eingabe() {
    if (!this.aktiv) return;
    const { brett, modus, n } = this.o;
    if (nurBilder(modus)) { brett.karteZeigen(false); brett.gedimmt(false); }
    if (mischt(modus)) brett.layout(mischen(n, brett.perm));
    brett.aus();
    brett.eingabe(true);
    this.o.onPhase && this.o.onPhase('tippen', this.len);
    const limit = zeitLimit(this.len);
    this.offen = performance.now();
    this.ende = this.offen + limit;
    const tick = () => {
      if (!this.aktiv || !this.offenFuer) return;
      const rest = Math.max(0, this.ende - performance.now());
      this.o.onZeit && this.o.onZeit(rest, limit);
      if (rest > 0) this.raf = requestAnimationFrame(tick);
    };
    this.offenFuer = this.len;
    this.raf = requestAnimationFrame(tick);
    this.later(() => { if (this.offenFuer === this.len) this.fehler(-1, 'zeit'); }, limit);
  }
  tap(i) {
    if (!this.aktiv || this.offenFuer !== this.len) return;
    const { brett, seq, n } = this.o;
    const want = seq[this.pos];
    if (i !== want) return this.fehler(i, 'falsch');
    brett.blitz(i, 'tipp', 220);
    Ton.organ(i, n, 220);
    this.pos++;
    if (this.pos < this.len) return;
    // Folge geschafft
    this.offenFuer = 0;
    brett.eingabe(false);
    cancelAnimationFrame(this.raf);
    this.ms += Math.round(performance.now() - this.offen);
    this.lvl = this.len;
    this.o.onZeit && this.o.onZeit(null);
    this.o.onPhase && this.o.onPhase('geschafft', this.len);
    this.o.onLevel && this.o.onLevel(this.lvl, this.ms);
    this.later(() => Ton.richtig(), 120);
    this.later(() => this.runde(this.len + 1), 1100);
  }
  fehler(got, why) {
    if (!this.aktiv) return;
    const { brett, seq } = this.o;
    const want = seq[this.pos];
    this.offenFuer = 0;
    this.aktiv = false;
    this.timers.forEach(clearTimeout); this.timers = [];
    cancelAnimationFrame(this.raf);
    brett.eingabe(false);
    if (got >= 0) brett.blitz(got, 'falsch', 1600);
    brett.blitz(want, 'soll', 2400);
    Ton.fehler();
    if (navigator.vibrate) try { navigator.vibrate([90, 60, 160]); } catch (e) {}
    this.o.onZeit && this.o.onZeit(null);
    this.o.onEnde && this.o.onEnde({ lvl: this.lvl, ms: this.ms, why, want, got, pos: this.pos, len: this.len });
  }
}
