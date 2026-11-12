/*
 * Spielregeln, Zeiten und Zufall. Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst.
 */

export const GROESSEN = [4, 6, 8];               // Anzahl Organe pro Runde
export const MODI = ['fest', 'profi', 'schwer']; // Schwierigkeit
export const BEGRIFFE = ['fach', 'de'];           // im Spiel angezeigt: Fachbegriff oder deutsches Wort
export const FINAL_GROESSEN = [2, 3, 4];
export const ZEITEN = ['an', 'aus'];                // mit oder ohne Zeitlimit (Finale und Üben)
export const QUALI_MINUTEN = [1, 2, 3];             // Dauer des Qualifyings
export const SCHLUSS_GNADE = 3000;                  // so lange nach Ende des Qualifyings zählen Ergebnisse noch (Netz)
export const MAX_LEN = 60;                         // längste mögliche Folge

export const MODUS_TEXT = {
  fest: { name: 'Einfach', kurz: 'Die ganze Folge leuchtet jede Runde auf (Bild und Begriff). Die Knöpfe liegen auf dem Handy wie am Beamer.' },
  profi: { name: 'Mittel', kurz: 'Die ganze Folge wird nur als Wort gezeigt. Getippt wird auf die passenden Bilder (neu gemischt).' },
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
export const BEGRIFFE_TEXT = { fach: 'Fachbegriff (Hepar, Ren, Pulmo …)', de: 'Deutsch (Leber, Niere, Lunge …)' };

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
    const term = begriffe === 'de' ? o.de : o.term;
    let alt = begriffe === 'de' ? o.term : o.de;   // für die Auflösung („Hepar = Leber“)
    if (alt === term) alt = o.info || '';
    return { id: o.id, term, alt };
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

// Zeit für die Eingabe einer Folge mit len Organen: sehr großzügig, getestet wird das Gedächtnis, nicht das Tempo.
// zeit = 'aus': kein Zeitlimit (Rückgabe 0)
export const zeitLimit = (len, zeit = 'an') => zeit === 'aus' ? 0 : 20000 + 6000 * len;
export const ZEIT_TEXT = {
  an: { name: 'Mit Zeitlimit', kurz: 'Im Finale: 20 Sekunden plus 6 Sekunden pro Organ der Folge (z. B. 50 Sekunden bei 5 Organen).' },
  aus: { name: 'Ohne Zeitlimit', kurz: 'Im Finale zählt nur das Gedächtnis. Hängt eine Runde, beendest du sie mit „Runde beenden“.' },
};
export const QUALI_TEXT = 'Alle spielen gleichzeitig. Nach einem Fehler geht es sofort mit einer neuen Folge weiter. Es zählt der beste Versuch.';

// Zeitplan einer Runde: Abspielen ab startAt, Eingabe ab openAt bis deadline
export function rundenPlan(startAt, len, modus, zeit) {
  const t = takt(len, modus);
  const openAt = startAt + vorspiel(len, modus).length * t.schritt + 250;
  const limit = zeitLimit(len, zeit);
  return { startAt, openAt, deadline: limit ? openAt + limit : 0 }; // deadline 0 = ohne Zeitlimit
}

// Rangfolge im Qualifying: längere Folge vorn, bei Gleichstand schnellere Eingabe
export function vergleichQuali(a, b) {
  return (b.lvl - a.lvl) || (a.ms - b.ms);
}

export function zufallsSeed() {
  if (globalThis.crypto && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296);
}
