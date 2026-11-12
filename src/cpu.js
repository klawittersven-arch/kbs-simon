// Computergegner („CPU“) fürs Finale.
// Die CPU „merkt“ sich Folgen bis zu einer zufälligen Grenze (je nach Stärke) und macht dann einen Fehler.
// Pro Runde wird vorab festgelegt, wann sie fertig ist (bzw. sich vertippt). Der Beamer zeigt das als
// Fortschritt an und meldet dem Server, wenn die Zeit der CPU erreicht ist.

export const CPU_STUFEN = {
  leicht: { name: 'leicht', grenze: [3, 6], schritt: 950 },
  mittel: { name: 'mittel', grenze: [6, 9], schritt: 780 },
  stark: { name: 'stark', grenze: [9, 13], schritt: 620 },
};

const RE = /^cpu-(leicht|mittel|stark)(?:-(\d+))?$/;
export const istCpu = id => RE.test(String(id || ''));
export const cpuStufe = id => (String(id).match(RE) || [])[1] || 'mittel';

// Anzeigename, bei mehreren CPUs durchnummeriert
export function cpuName(id, alle) {
  const cpus = alle.filter(istCpu);
  const nr = cpus.indexOf(id) + 1;
  return `🤖 CPU${cpus.length > 1 ? ' ' + nr : ''} (${CPU_STUFEN[cpuStufe(id)].name})`;
}

const zufall = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Bis zu welcher Folgenlänge die CPU in diesem Finale fehlerfrei bleibt
export function cpuGrenze(stufe) {
  const [a, b] = CPU_STUFEN[stufe].grenze;
  return zufall(a, b);
}

// Plan für eine Runde mit len Organen: Ergebnis, Fortschritt k, Zeit ab Eingabebeginn
export function cpuPlan(stufe, grenze, len, seq, n) {
  const S = CPU_STUFEN[stufe];
  const step = Math.round(S.schritt * (0.85 + Math.random() * 0.3));
  const react = zufall(700, 1400);
  if (len < grenze) return { res: 'ok', k: len, got: -1, ms: react + len * step, step, react };
  // Fehler: eher gegen Ende der Folge
  const k = Math.min(len - 1, Math.floor(len * (0.4 + Math.random() * 0.6)));
  const want = seq[k];
  let got = Math.floor(Math.random() * (n - 1));
  if (got >= want) got++;
  return { res: 'fail', k, got, ms: react + (k + 1) * step, step, react };
}
