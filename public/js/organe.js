/*
 * Die Organe im Spiel.
 *
 * Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst. Nach dem Hochladen gilt sie überall.
 *
 *   id    kurze Kennung (nicht ändern, die Bilder in bilder.js hängen daran)
 *   term  der in der Medizin übliche Fachbegriff (lateinisch oder griechisch)
 *   de    deutsches Wort
 *   info  (wahlweise) Erklärung für die Auflösung, wenn Fachbegriff und deutsches Wort gleich sind
 *
 * Am Beamer wird eingestellt, ob im Spiel der Fachbegriff oder das deutsche Wort erscheint.
 * In der Auflösung nach einem Fehler steht dann jeweils das andere dabei („Hepar = Leber“).
 * Für jede Spielrunde werden 4, 6 oder 8 Organe zufällig gezogen.
 */
export const ORGANE = [
  { id: 'cor', term: 'Cor', de: 'Herz' },
  { id: 'hepar', term: 'Hepar', de: 'Leber' },
  { id: 'gaster', term: 'Gaster', de: 'Magen' },
  { id: 'ren', term: 'Ren', de: 'Niere' },
  { id: 'nephron', term: 'Nephron', de: 'Nephron', info: 'Funktionseinheit der Niere' },
  { id: 'pulmo', term: 'Pulmo', de: 'Lunge' },
  { id: 'cerebrum', term: 'Cerebrum', de: 'Gehirn' },
  { id: 'lien', term: 'Splen', de: 'Milz' },
  { id: 'pancreas', term: 'Pancreas', de: 'Bauchspeicheldrüse' },
  { id: 'vesica-urinaria', term: 'Vesica urinaria', de: 'Harnblase' },
  { id: 'vesica-biliaris', term: 'Vesica biliaris', de: 'Gallenblase' },
  { id: 'oesophagus', term: 'Oesophagus', de: 'Speiseröhre' },
  { id: 'intestinum-tenue', term: 'Intestinum tenue', de: 'Dünndarm' },
  { id: 'colon', term: 'Colon', de: 'Dickdarm' },
  { id: 'trachea', term: 'Trachea', de: 'Luftröhre' },
  { id: 'larynx', term: 'Larynx', de: 'Kehlkopf' },
  { id: 'thyreoidea', term: 'Glandula thyreoidea', de: 'Schilddrüse' },
  { id: 'uterus', term: 'Uterus', de: 'Gebärmutter' },
  { id: 'oculus', term: 'Oculus', de: 'Auge' },
  { id: 'lingua', term: 'Lingua', de: 'Zunge' },
];

const BY_ID = new Map(ORGANE.map(o => [o.id, o]));
export function organ(id) { return BY_ID.get(id) || null; }

// Für die Auflösung: das, was zum angezeigten Wort dazugehört („Hepar“ → „Leber“, „Leber“ → „Hepar“)
export function partner(o) {
  if (o && o.alt) return o.alt;
  const g = o && organ(o.id);
  if (!g) return '';
  const other = o.term === g.de ? g.term : g.de;
  return other === o.term ? (g.info || '') : other;
}
