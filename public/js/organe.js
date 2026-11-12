/*
 * Die Organe im Spiel.
 *
 * Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst. Nach dem Hochladen gilt sie überall.
 *
 *   id    kurze Kennung (nicht ändern, die Bilder in bilder.js hängen daran)
 *   term  Fachbegriff, der normalerweise angezeigt wird
 *   gr    griechische Variante (für die Einstellung „griechisch“; leer = term)
 *   de    deutsches Wort: erscheint nur in der Auflösung nach einem Fehler und am Ende
 *
 * Für jede Spielrunde werden 4, 6 oder 8 Organe zufällig gezogen.
 */
export const ORGANE = [
  { id: 'cor', term: 'Cor', gr: 'Kardia', de: 'Herz' },
  { id: 'hepar', term: 'Hepar', gr: '', de: 'Leber' },
  { id: 'gaster', term: 'Gaster', gr: '', de: 'Magen' },
  { id: 'ren', term: 'Ren', gr: 'Nephros', de: 'Niere' },
  { id: 'nephron', term: 'Nephron', gr: '', de: 'Nephron (Funktionseinheit der Niere)' },
  { id: 'pulmo', term: 'Pulmo', gr: 'Pneumon', de: 'Lunge' },
  { id: 'cerebrum', term: 'Cerebrum', gr: 'Encephalon', de: 'Gehirn' },
  { id: 'lien', term: 'Lien', gr: 'Splen', de: 'Milz' },
  { id: 'pancreas', term: 'Pancreas', gr: '', de: 'Bauchspeicheldrüse' },
  { id: 'vesica-urinaria', term: 'Vesica urinaria', gr: 'Cystis', de: 'Harnblase' },
  { id: 'vesica-biliaris', term: 'Vesica biliaris', gr: 'Cholecystis', de: 'Gallenblase' },
  { id: 'oesophagus', term: 'Oesophagus', gr: '', de: 'Speiseröhre' },
  { id: 'intestinum-tenue', term: 'Intestinum tenue', gr: 'Enteron', de: 'Dünndarm' },
  { id: 'colon', term: 'Colon', gr: '', de: 'Dickdarm' },
  { id: 'trachea', term: 'Trachea', gr: '', de: 'Luftröhre' },
  { id: 'larynx', term: 'Larynx', gr: '', de: 'Kehlkopf' },
  { id: 'thyreoidea', term: 'Glandula thyreoidea', gr: 'Thyreoidea', de: 'Schilddrüse' },
  { id: 'uterus', term: 'Uterus', gr: 'Hystera', de: 'Gebärmutter' },
  { id: 'oculus', term: 'Oculus', gr: 'Ophthalmos', de: 'Auge' },
  { id: 'lingua', term: 'Lingua', gr: 'Glossa', de: 'Zunge' },
];

const BY_ID = new Map(ORGANE.map(o => [o.id, o]));
export function organ(id) { return BY_ID.get(id) || null; }
