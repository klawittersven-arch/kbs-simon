/*
 * Organ-Bilder als SVG (eigene Zeichnungen, © 2026 Sven Klawitter).
 * Jedes Bild liegt in einem Feld von 100 × 100. bild(id) liefert das fertige <svg>.
 */

// Röhre (Gefäß, Darm, Gang): dunkler Rand + farbige Füllung entlang desselben Pfads
function tube(d, w, fill, line, extra = '') {
  return `<path d="${d}" fill="none" stroke="${line}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}
// Querstreifen auf einer Röhre (Knorpelringe, Haustren)
function rings(d, w, color, dash, cap = 'butt') {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-dasharray="${dash}" stroke-linecap="${cap}"/>`;
}
const shape = (d, fill, line, w = 2.4) => `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="${w}" stroke-linejoin="round"/>`;
const line = (d, color, w = 1.8, op = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
const glanz = d => `<path d="${d}" fill="#fff" opacity=".28"/>`;

const BILDER = {
  // Herz: Herzkörper mit Aortenbogen (rot), oberer Hohlvene und Lungenarterie (blau)
  cor: (() => {
    const L = '#5a1220';
    return tube('M58 44 C56 26 62 14 72 14 C82 14 86 24 86 36', 10, '#e2475b', L) +
      tube('M66 15 L64 5', 4, '#e2475b', L) + tube('M73 13 L74 4', 4, '#e2475b', L) + tube('M80 16 L84 7', 4, '#e2475b', L) +
      tube('M34 8 L35 46', 10, '#4f6fd0', L) +
      shape('M30 44 C20 52 20 70 34 82 C44 90 56 95 66 96 C74 86 86 72 88 56 C90 44 82 38 72 38 C64 38 58 42 52 44 C44 40 36 39 30 44 Z', '#d93a4e', L) +
      tube('M54 50 C52 38 58 30 70 30 L84 27', 9, '#5b7fe0', L) +
      line('M48 52 C54 62 60 76 64 92', '#8f1d30', 2.2) +
      line('M56 60 C62 62 66 60 70 56', '#8f1d30', 1.6) +
      glanz('M30 54 C30 48 36 46 40 48 C36 52 34 58 34 64 C31 62 30 58 30 54 Z');
  })(),

  // Leber: großer rechter Lappen (im Bild links), schmaler linker Lappen, Sichelband
  hepar: (() => {
    const L = '#4f1a10';
    return shape('M6 42 C8 26 28 18 52 20 C72 22 88 24 95 33 C98 38 94 43 87 45 C75 51 63 57 51 64 C39 72 26 78 17 76 C7 72 4 56 6 42 Z', '#a8432f', L) +
      line('M57 21 C58 34 56 48 51 63', '#6e2516', 2) +
      line('M30 72 C34 66 40 64 44 66', '#6e2516', 1.4, .7) +
      glanz('M14 36 C18 28 30 24 42 25 C30 30 22 36 18 46 C15 44 13 40 14 36 Z');
  })(),

  // Magen: J-Form mit Speiseröhren-Ansatz oben und Zwölffingerdarm-Ansatz links
  gaster: (() => {
    const L = '#6b2232';
    return tube('M47 22 L45 3', 9, '#e98a8a', L) +
      tube('M22 70 C14 70 10 74 9 82', 8, '#f0a4ad', L) +
      shape('M42 22 C46 8 72 4 82 22 C92 40 88 70 64 82 C48 89 30 85 22 75 C18 72 18 66 22 64 C32 70 44 68 49 56 C53 46 52 33 50 27 C48 23 45 21 42 22 Z', '#ee8f9e', L) +
      line('M60 26 C68 40 70 56 62 70', '#c25a6c', 1.6, .8) +
      line('M70 28 C78 42 78 60 70 74', '#c25a6c', 1.6, .8) +
      line('M50 64 C46 72 38 76 30 76', '#c25a6c', 1.6, .8) +
      glanz('M58 14 C66 10 76 14 80 22 C72 18 64 18 58 22 Z');
  })(),

  // Niere: Bohnenform mit Nierenarterie (rot), Nierenvene (blau) und Harnleiter (gelb)
  ren: (() => {
    const L = '#4e1512';
    return tube('M40 44 L6 40', 6, '#e2475b', L) +
      tube('M40 53 L6 56', 7, '#4f6fd0', L) +
      tube('M40 61 C30 70 30 84 32 98', 5, '#efc75a', L) +
      shape('M52 7 C72 5 86 24 86 48 C86 74 72 93 52 93 C36 93 30 80 36 68 C40 61 43 56 43 50 C43 44 39 39 35 32 C29 20 36 8 52 7 Z', '#b4473f', L) +
      shape('M48 36 C54 34 58 40 54 46 C58 50 58 56 54 60 C58 66 52 72 46 66', '#e7a19a', '#7a2a24', 1.6) +
      line('M62 22 L52 38 M74 40 L58 46 M74 60 L58 56 M62 78 L52 64', '#7a2a24', 1.6, .7) +
      glanz('M60 12 C72 14 80 26 82 38 C74 28 66 20 56 16 Z');
  })(),

  // Nephron: Glomerulus in der Bowman-Kapsel, gewundene Kanälchen, Henle-Schleife, Sammelrohr
  nephron: (() => {
    const L = '#7a5a0e', Y = '#f2c14e';
    return tube('M90 4 L90 97', 7, '#e3a42f', L) +
      tube('M30 24 C40 14 48 26 56 18 C64 10 72 22 64 30 C56 38 68 42 60 50 L58 88 C58 96 70 96 70 88 L72 52 C72 44 80 46 80 40 C80 32 86 34 90 30', 4.5, Y, L) +
      tube('M4 18 L13 20', 4, '#e2475b', '#5a1220') + tube('M13 30 L4 34', 3.5, '#e2475b', '#5a1220') +
      shape('M22 10 C34 8 40 18 38 28 C36 38 26 42 18 38 C10 34 8 24 12 16 C14 13 18 11 22 10 Z', '#fbe7a6', L, 2) +
      shape('M24 16 C31 16 34 22 32 28 C30 33 22 35 18 31 C14 27 15 20 19 17 C20 16 22 16 24 16 Z', '#d93a4e', '#5a1220', 1.6) +
      line('M19 22 C22 19 26 23 23 26 C20 29 25 31 28 28 M24 20 C28 18 30 23 27 25', '#ffb3bd', 1.3);
  })(),

  // Lunge: zwei Lungenflügel, Luftröhre mit Knorpelringen und Hauptbronchien
  pulmo: (() => {
    const L = '#6b2232';
    return shape('M44 28 C35 22 21 28 15 42 C9 58 9 78 13 92 C25 95 37 93 45 88 C47 70 47 48 44 28 Z', '#f28b9e', L) +
      shape('M56 28 C65 22 79 28 85 42 C91 58 91 78 87 92 C75 95 63 93 58 90 C62 82 66 76 60 70 C56 64 56 48 56 28 Z', '#f28b9e', L) +
      line('M44 52 C34 54 24 60 14 66 M45 72 C36 72 26 74 16 80', '#b94a5e', 1.6, .9) +
      line('M57 56 C66 58 76 62 86 70', '#b94a5e', 1.6, .9) +
      tube('M50 3 L50 34', 9, '#d5e4ef', '#4a6478') + rings('M50 4 L50 33', 9, '#94b2c8', '2 3.2') +
      tube('M50 34 C46 38 42 42 38 48', 6, '#d5e4ef', '#4a6478') + tube('M50 34 C54 38 58 42 62 48', 6, '#d5e4ef', '#4a6478') +
      glanz('M20 44 C24 34 32 30 38 32 C30 38 24 46 22 56 C19 54 19 48 20 44 Z');
  })(),

  // Gehirn: Großhirn mit Windungen, Kleinhirn und Hirnstamm (Seitenansicht)
  cerebrum: (() => {
    const L = '#6b3245';
    return tube('M58 64 C58 76 56 86 54 96', 9, '#e598a9', L) +
      shape('M58 72 C60 64 70 60 80 62 C90 64 92 74 86 80 C80 86 66 86 60 80 C58 78 57 75 58 72 Z', '#e08aa0', L, 2.2) +
      line('M62 70 C70 67 80 67 88 72 M61 76 C70 74 80 75 87 78', '#9e4a62', 1.4, .9) +
      shape('M10 54 C6 34 24 12 50 11 C74 10 92 26 92 46 C92 58 86 64 77 64 C70 66 63 66 57 64 C49 68 36 69 28 65 C19 63 12 60 10 54 Z', '#f3b0bf', L) +
      line('M48 12 C46 22 52 30 48 40 C46 48 50 54 46 62', '#b96a80', 1.8) +
      line('M22 26 C28 30 26 38 32 40 C38 42 40 34 44 38 M16 44 C22 42 26 48 32 50 C38 52 40 46 46 48', '#b96a80', 1.6, .9) +
      line('M60 18 C58 26 64 30 62 36 M70 20 C70 28 76 32 74 40 C72 46 80 48 82 44 M56 46 C62 50 68 46 72 52 C76 56 84 54 88 50', '#b96a80', 1.6, .9) +
      line('M20 56 C26 52 32 58 40 56', '#b96a80', 1.6, .9) +
      glanz('M22 20 C30 14 40 12 46 14 C36 18 28 24 22 32 C20 28 20 24 22 20 Z');
  })(),

  // Milz: kaffeebohnenförmig mit Einkerbungen und Gefäßen am Milzhilus
  lien: (() => {
    const L = '#3e1427';
    return tube('M48 56 L18 64', 6, '#e2475b', '#5a1220') + tube('M50 63 L22 74', 6, '#4f6fd0', '#1c2a5e') +
      shape('M30 14 C52 4 78 14 86 36 C94 58 84 82 62 90 C52 94 44 90 46 82 C48 76 56 72 56 62 C56 50 44 46 36 44 C26 42 18 36 20 28 C21 22 25 17 30 14 Z', '#8e3b60', L) +
      line('M40 10 L44 18 M56 8 L58 16 M70 14 L68 21', L, 2) +
      line('M52 60 C54 54 50 50 44 48', '#5c2340', 1.4, .7) +
      glanz('M36 16 C48 10 64 12 74 20 C62 18 50 18 40 24 C36 22 34 19 36 16 Z');
  })(),

  // Bauchspeicheldrüse: Kopf in der C-Schlinge des Zwölffingerdarms, Körper und Schwanz
  pancreas: (() => {
    const L = '#6e4316';
    return tube('M30 30 C14 28 6 40 8 58 C10 74 20 82 34 80', 10, '#f0a4ad', '#6b2232') +
      shape('M16 56 C14 44 22 40 32 44 C46 46 60 40 74 34 C84 30 93 30 95 36 C97 42 89 46 81 48 C67 52 55 58 43 62 C39 70 31 75 23 72 C17 70 16 64 16 56 Z', '#f2b98a', L) +
      line('M24 60 C40 56 60 48 88 38', '#d38a3e', 2.2) +
      `<g fill="#fde3c8" opacity=".75"><circle cx="30" cy="52" r="2.4"/><circle cx="38" cy="58" r="2"/><circle cx="50" cy="50" r="2.2"/><circle cx="62" cy="46" r="2"/><circle cx="74" cy="40" r="2.2"/><circle cx="84" cy="36" r="1.8"/><circle cx="26" cy="66" r="2"/><circle cx="58" cy="54" r="1.8"/></g>`;
  })(),

  // Harnblase: mit beiden Harnleitern (oben) und Harnröhre (unten)
  'vesica-urinaria': (() => {
    const L = '#7a5a0e';
    return tube('M10 4 C14 20 20 32 30 42', 5, '#e9b949', L) + tube('M90 4 C86 20 80 32 70 42', 5, '#e9b949', L) +
      shape('M50 26 C72 26 86 42 84 60 C82 76 68 86 56 88 L54 96 L46 96 L44 88 C32 86 18 76 16 60 C14 42 28 26 50 26 Z', '#f2cf5b', L) +
      line('M30 50 C40 46 60 46 70 50 M26 64 C40 60 60 60 74 64 M34 76 C44 74 56 74 66 76', '#c9a234', 1.6, .8) +
      glanz('M28 40 C34 32 44 30 52 31 C42 34 34 40 30 50 C27 48 26 44 28 40 Z');
  })(),

  // Gallenblase: birnenförmig mit Gallenblasengang und Hauptgallengang
  'vesica-biliaris': (() => {
    const L = '#244a17';
    return tube('M24 4 L28 40 L24 97', 6, '#7cbf62', L) +
      tube('M46 34 C40 34 34 38 28 40', 5, '#7cbf62', L) +
      shape('M84 88 C96 80 96 62 86 50 C76 38 62 28 52 27 C45 26 41 31 43 37 C45 43 51 45 55 51 C61 61 59 75 63 83 C67 91 76 93 84 88 Z', '#5aa646', L) +
      line('M58 40 C66 46 74 54 80 66', '#3d7a2c', 1.6, .8) +
      glanz('M70 52 C78 56 86 64 88 72 C82 68 76 64 70 60 Z');
  })(),

  // Speiseröhre: Muskelschlauch, der unten in den Magen mündet
  oesophagus: (() => {
    const L = '#6b2232';
    return shape('M40 74 C42 62 60 60 72 66 C86 74 94 88 92 100 L36 100 C36 90 38 82 40 74 Z', '#f3b0b9', L) +
      tube('M44 1 C42 20 46 34 46 46 C46 58 48 66 50 74', 14, '#e98a8a', L) +
      line('M41 4 C39 22 43 36 43 48 C43 58 45 66 47 72 M47 4 C45 22 49 36 49 48 C49 58 51 66 53 72', '#c4606a', 1.2, .8) +
      line('M60 72 C70 76 78 84 82 96', '#d9858f', 1.4, .8);
  })(),

  // Dünndarm: viele eng liegende Schlingen
  'intestinum-tenue': (() => {
    const L = '#6b2232';
    const d = 'M8 18 C26 8 72 8 86 18 C96 26 88 36 72 34 C56 32 40 32 28 36 C12 40 12 52 26 53 C42 54 58 50 74 52 C90 54 94 66 78 69 C62 72 42 68 28 71 C12 74 14 87 30 88 C46 89 66 86 92 88';
    return tube(d, 11, '#f4a1a9', L) + line(d, '#fbd0d5', 2.5, .55);
  })(),

  // Dickdarm: Rahmen aus auf- und absteigendem Teil mit Haustren, Blinddarm mit Wurmfortsatz
  colon: (() => {
    const L = '#5a2e14';
    const d = 'M20 82 L20 24 C20 14 28 12 36 15 C46 19 56 19 66 15 C74 12 81 15 81 24 L81 66 C81 80 68 76 62 84 C57 90 53 92 51 98';
    return tube('M15 90 C12 94 12 97 15 99', 3.5, '#d99a6c', L) +
      shape('M10 80 C10 72 30 72 30 80 C30 90 22 94 18 94 C12 94 10 88 10 80 Z', '#d99a6c', L, 2.2) +
      tube(d, 15, '#d99a6c', L) + rings(d, 15, '#a8643c', '1.6 6.4');
  })(),

  // Luftröhre: Knorpelringe und Gabelung in die beiden Hauptbronchien
  trachea: (() => {
    const L = '#3a5568';
    return tube('M50 62 C44 70 36 80 26 94', 13, '#d5e4ef', L) + rings('M50 62 C44 70 36 80 26 94', 13, '#9cb8cc', '2.6 3.4') +
      tube('M50 62 C56 70 64 80 74 94', 13, '#d5e4ef', L) + rings('M50 62 C56 70 64 80 74 94', 13, '#9cb8cc', '2.6 3.4') +
      tube('M50 4 L50 64', 22, '#d5e4ef', L) + rings('M50 5 L50 62', 22, '#9cb8cc', '3.2 3.8') +
      `<path d="M41 5 L41 62" stroke="#fff" stroke-width="2.4" opacity=".45"/>`;
  })(),

  // Kehlkopf: Zungenbein, Schildknorpel mit Kehlkopf-Vorsprung, Ringknorpel, Kehldeckel
  larynx: (() => {
    const L = '#3a5568';
    return shape('M44 22 C42 10 46 4 50 4 C54 4 58 10 56 22 Z', '#eab3bc', '#7a3442', 2) +
      `<path d="M14 18 C24 30 76 30 86 18" fill="none" stroke="${L}" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M14 18 C24 30 76 30 86 18" fill="none" stroke="#f1e7cf" stroke-width="5" stroke-linecap="round"/>` +
      shape('M22 32 L44 32 L50 42 L56 32 L78 32 C80 48 72 62 50 70 C28 62 20 48 22 32 Z', '#bcd8e8', L) +
      line('M50 42 L50 68', '#7f9fb5', 1.6, .9) +
      shape('M34 72 C40 70 60 70 66 72 L66 80 C60 82 40 82 34 80 Z', '#a9cadc', L, 2.2) +
      tube('M50 84 L50 99', 22, '#d5e4ef', L) + rings('M50 85 L50 99', 22, '#9cb8cc', '3 3.5') +
      glanz('M28 36 L42 36 L44 40 C38 44 32 50 30 56 C27 50 26 42 28 36 Z');
  })(),

  // Schilddrüse: Schmetterlingsform vor der Luftröhre, darüber der Schildknorpel
  thyreoidea: (() => {
    const L = '#5a1a22';
    return tube('M50 2 L50 99', 20, '#d5e4ef', '#3a5568') + rings('M50 3 L50 99', 20, '#9cb8cc', '3 3.6') +
      shape('M32 4 L46 4 L50 10 L54 4 L68 4 C68 14 62 20 50 24 C38 20 32 14 32 4 Z', '#bcd8e8', '#3a5568', 2) +
      `<g transform="rotate(-14 31 58)">` + shape('M31 32 C42 32 45 48 45 60 C45 74 39 84 31 84 C23 84 17 74 17 60 C17 46 21 32 31 32 Z', '#c4505a', L) + `</g>` +
      `<g transform="rotate(14 69 58)">` + shape('M69 32 C80 32 83 46 83 60 C83 74 77 84 69 84 C61 84 55 74 55 60 C55 48 58 32 69 32 Z', '#c4505a', L) + `</g>` +
      shape('M38 62 C44 60 56 60 62 62 L62 72 C56 74 44 74 38 72 Z', '#c4505a', L, 2.2) +
      `<path d="M40 63 L60 63 L60 71 L40 71 Z" fill="#c4505a"/>` +
      glanz('M22 50 C22 42 26 38 30 38 C28 44 26 52 26 60 C23 58 22 54 22 50 Z') +
      glanz('M62 44 C64 40 68 38 72 40 C68 42 66 48 64 54 C62 52 61 48 62 44 Z');
  })(),

  // Gebärmutter: mit Eileitern und Eierstöcken (Vorderansicht)
  uterus: (() => {
    const L = '#6b2246';
    return tube('M38 32 C30 22 20 20 12 26', 4.5, '#f0a3bf', L) + tube('M62 32 C70 22 80 20 88 26', 4.5, '#f0a3bf', L) +
      line('M12 26 L5 22 M12 26 L4 28 M12 26 L7 33 M88 26 L95 22 M88 26 L96 28 M88 26 L93 33', L, 2) +
      `<ellipse cx="18" cy="42" rx="8" ry="5.5" fill="#f7cad9" stroke="${L}" stroke-width="2.2" transform="rotate(-20 18 42)"/>` +
      `<ellipse cx="82" cy="42" rx="8" ry="5.5" fill="#f7cad9" stroke="${L}" stroke-width="2.2" transform="rotate(20 82 42)"/>` +
      line('M25 39 L38 40 M75 39 L62 40', L, 1.6, .8) +
      shape('M45 76 L55 76 L57 98 L43 98 Z', '#f3b6cb', L, 2.2) +
      shape('M34 30 C34 20 66 20 66 30 C66 48 59 60 55 68 L55 78 C55 82 45 82 45 78 L45 68 C41 60 34 48 34 30 Z', '#ec8fae', L) +
      shape('M44 32 C44 28 56 28 56 32 C56 42 52 50 50 56 C48 50 44 42 44 32 Z', '#f8c5d6', '#b05478', 1.4) +
      glanz('M38 30 C38 26 42 24 46 24 C42 28 40 34 40 42 C38 38 38 34 38 30 Z');
  })(),

  // Auge: Vorderansicht mit Lidern, Iris und Pupille
  oculus: (() => {
    const L = '#2a2340';
    return line('M10 36 C28 14 72 14 90 36', '#7a5a68', 2, .8) +
      shape('M6 52 C24 26 76 26 94 52 C76 78 24 78 6 52 Z', '#fbfaf6', L, 2.8) +
      `<clipPath id="augeclip"><path d="M6 52 C24 26 76 26 94 52 C76 78 24 78 6 52 Z"/></clipPath>` +
      `<g clip-path="url(#augeclip)"><circle cx="50" cy="52" r="18" fill="#3d8bd0" stroke="#1d4f80" stroke-width="2.4"/>` +
      `<circle cx="50" cy="52" r="12" fill="#5fa8e0" opacity=".5"/>` +
      line('M50 36 L50 42 M58 38 L55 44 M42 38 L45 44 M64 46 L58 48 M36 46 L42 48 M64 58 L58 56 M36 58 L42 56', '#1d4f80', 1.2, .7) +
      `<circle cx="50" cy="52" r="7.5" fill="#111"/><circle cx="55" cy="46" r="3.6" fill="#fff"/></g>` +
      line('M24 33 L20 26 M34 28 L32 20 M46 26 L46 18 M58 26 L60 18 M70 29 L74 22 M79 34 L84 28', L, 2.2) +
      line('M8 52 C26 74 74 74 92 52', '#e7a7a7', 1.4, .6);
  })(),

  // Zunge: Draufsicht mit Mittelfurche und Papillen
  lingua: (() => {
    const L = '#6b1a30';
    return shape('M50 96 C30 96 17 82 17 60 C17 38 22 10 50 8 C78 10 83 38 83 60 C83 82 70 96 50 96 Z', '#ee7d93', L) +
      line('M50 14 C49 36 51 60 50 84', '#b8455c', 2.2) +
      `<g fill="#c95069"><circle cx="34" cy="22" r="3"/><circle cx="44" cy="28" r="3"/><circle cx="50" cy="31" r="3.2"/><circle cx="56" cy="28" r="3"/><circle cx="66" cy="22" r="3"/></g>` +
      `<g fill="#f7b3c0" opacity=".9"><circle cx="30" cy="44" r="1.6"/><circle cx="38" cy="52" r="1.6"/><circle cx="30" cy="62" r="1.6"/><circle cx="40" cy="70" r="1.6"/><circle cx="34" cy="80" r="1.6"/><circle cx="42" cy="40" r="1.6"/><circle cx="70" cy="44" r="1.6"/><circle cx="62" cy="52" r="1.6"/><circle cx="70" cy="62" r="1.6"/><circle cx="60" cy="70" r="1.6"/><circle cx="66" cy="80" r="1.6"/><circle cx="58" cy="40" r="1.6"/><circle cx="44" cy="86" r="1.6"/><circle cx="56" cy="86" r="1.6"/></g>` +
      glanz('M24 50 C24 36 30 24 38 20 C34 30 30 42 30 56 C27 56 24 54 24 50 Z');
  })(),
};

let uid = 0;
export function bild(id, cls = '') {
  // eindeutige IDs, falls dasselbe Bild mehrmals auf der Seite steht
  const inner = (BILDER[id] || '').replace(/augeclip/g, 'augeclip' + (++uid));
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;
}
export const BILD_IDS = Object.keys(BILDER);
