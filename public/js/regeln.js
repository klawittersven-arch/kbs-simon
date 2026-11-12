/*
 * Spielregeln, Zeiten und Zufall. Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst.
 */

export const GROESSEN = [4, 6, 8];               // Anzahl Organe pro Runde
export const MODI = ['fest', 'profi', 'schwer']; // Schwierigkeit
export const BEGRIFFE = ['std', 'gr', 'mix'];      // Standard-Fachbegriff, griechisch, gemischt
export const FINAL_GROESSEN = [2, 3, 4];
export const MAX_LEN = 60;                         // längste mögliche Folge

export const MODUS_TEXT = {
  fest: { name: 'Einfach', kurz: 'Die ganze Folge leuchtet jede Runde auf (Bild und Begriff). Die Knöpfe liegen auf dem Handy wie am Beamer.' },
  profi: { name: 'Begriff → Bild', kurz: 'Die ganze Folge wird nur als Fachbegriff gezeigt. Getippt wird auf die passenden Bilder (neu gemischt).' },
  schwer: { name: 'Schwer', kurz: 'Gezeigt wird nur das neue Organ als Wort („NEU: Hepar“). Die ganze Folge wird aus dem Kopf auf den Bildern getippt.' },
};
// Knöpfe zeigen nur Bilder (kein Begriff)?
export const nurBilder = modus => modus === 'profi' || modus === 'schwer';
// Knöpfe vor jeder Eingabe neu mischen?
export const mischt = modus => modus === 'profi';
// Hinweis über dem Brett
export const merkText = modus => modus === 'schwer' ? 'Neues Organ …' : 'Gut aufpassen …';
export const tippText = modus => modus === 'schwer' ? 'Jetzt die ganze Folge!' : mischt(modus) ? 'Jetzt du! (neu gemischt)' : 'Jetzt du!';
// Welche Stellen der Folge werden vorgespielt? „Schwer“: nur die neue
export const vorspiel = (len, modus) => modus === 'schwer' ? [len - 1] : Array.from({ length: len }, (_, i) => i);
export const BEGRIFFE_TEXT = { std: 'Standard (Cor, Ren, Pulmo …)', gr: 'Griechisch (Kardia, Nephros, Pneumon …)', mix: 'Gemischt' };

// Zeiten im Finale (ms)
export const VORLAUF_START = 5000;  // Countdown vor der ersten Runde
export const VORLAUF_RUNDE = 3800;  // Pause zwischen zwei Runden (Ergebnis zeigen, „Runde X“)
export const GNADE = 1500;          // so lange nach Ablauf der Zeit werden Antworten noch angenommen (Netz)

// Pseudozufall mit Startwert: Alle bekommen dieselbe Folge
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Die Folge: Zahlen 0 … n-1, höchstens zweimal dasselbe Organ hintereinander
export function folge(seed, n, len = MAX_LEN) {
  const r = rng((seed ^ 0x9e3779b9) >>> 0);
  const out = [];
  while (out.length < len) {
    const x = Math.floor(r() * n);
    const l = out.length;
    if (l >= 2 && out[l - 1] === x && out[l - 2] === x) continue;
    out.push(x);
  }
  return out;
}

// n Organe zufällig ziehen und den angezeigten Begriff festlegen
export function zieheSet(seed, n, begriffe, organe) {
  const r = rng(seed);
  const pool = organe.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map(o => {
    const gr = o.gr || o.term;
    const term = begriffe === 'gr' ? gr : begriffe === 'mix' ? (r() < 0.5 ? gr : o.term) : o.term;
    return { id: o.id, term };
  });
}

// Tempo: Je länger die Folge, desto schneller leuchten die Organe auf
export function takt(len, modus) {
  let an, pause;
  if (len <= 5) { an = 650; pause = 250; }
  else if (len <= 9) { an = 540; pause = 210; }
  else if (len <= 13) { an = 450; pause = 180; }
  else { an = 380; pause = 150; }
  if (modus === 'profi') an += 200; // Begriff lesen braucht etwas länger
  if (modus === 'schwer') { an = 1600; pause = 250; } // nur ein Wort, dafür in Ruhe lesen
  return { an, pause, schritt: an + pause };
}

// Zeit für die Eingabe einer Folge mit len Organen: großzügig, getestet wird das Gedächtnis, nicht das Tempo
export const zeitLimit = len => 10000 + 3000 * len;

// Zeitplan einer Runde: Abspielen ab startAt, Eingabe ab openAt bis deadline
export function rundenPlan(startAt, len, modus) {
  const t = takt(len, modus);
  const openAt = startAt + vorspiel(len, modus).length * t.schritt + 250;
  return { startAt, openAt, deadline: openAt + zeitLimit(len) };
}

// Rangfolge im Qualifying: längere Folge vorn, bei Gleichstand schnellere Eingabe
export function vergleichQuali(a, b) {
  return (b.lvl - a.lvl) || (a.ms - b.ms);
}

export function zufallsSeed() {
  if (globalThis.crypto && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296);
}
