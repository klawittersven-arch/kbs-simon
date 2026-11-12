# KBS Simon says: Organe!

Ein Merkspiel mit den Fachbegriffen der Organe für die ganze Klasse. Die Organe leuchten nacheinander auf, die SuS tippen die Reihenfolge auf dem Handy nach, und jede Runde kommt ein Organ dazu. Erst spielen alle allein (Qualifying), dann spielen die Besten im Finale am Beamer gegeneinander, bis nur noch eine Person übrig ist.

| Seite | Adresse | Für wen |
|---|---|---|
| Üben | `/` | alle, auch zu Hause (ohne Klasse, ohne Anmeldung) |
| Klassenmodus | `/lehrer` | Lehrkraft am Laptop mit Beamer |
| Mitspielen | `/mitspielen` | SuS, wird über den QR-Code geöffnet |

**Link für den Beamer (nach der Einrichtung):** `https://kbs-simon.klawittersven.workers.dev/lehrer`

Spiel, Organ-Grafiken und Töne: © 2026 Sven Klawitter. Alle Bilder sind eigene Zeichnungen.

---

## Einmalige Einrichtung bei Cloudflare (etwa 10 Minuten)

Genauso wie bei KBS-Kart, Tetris und der Spielewahl:

1. Bei Cloudflare anmelden: <https://dash.cloudflare.com>
2. Links im Menü **Workers & Pages** öffnen (je nach Ansicht unter **Compute (Workers)**).
3. **Create application** (Anwendung erstellen) wählen, dann **GitHub** bzw. **Import a repository**.
4. Das Repository **kbs-simon** auswählen. Falls es nicht in der Liste steht: in den GitHub-Einstellungen der Cloudflare-App den Zugriff auf `kbs-simon` erlauben.
5. Einstellungen prüfen:
   - **Project name / Worker name:** `kbs-simon` (muss genau so heißen, sonst schlägt der Build fehl)
   - **Build command:** leer lassen
   - **Deploy command:** `npx wrangler deploy` (ist voreingestellt)
   - **Root directory:** leer lassen
6. **Save and Deploy** klicken. Nach ein bis zwei Minuten ist das Spiel online unter `https://kbs-simon.klawittersven.workers.dev`.

**Updates:** Jede Änderung, die im Branch `main` dieses GitHub-Repositorys landet, veröffentlicht Cloudflare automatisch.

---

## Ablauf im Unterricht

1. **Lehrer-Link am Laptop öffnen**, Beamer und Lautsprecher an, **F** für Vollbild. Oben rechts steht der Code der Sitzung.
2. **Anmeldung:** Die SuS scannen den QR-Code und geben Vornamen und den ersten Buchstaben des Nachnamens ein (z. B. „Lena K.“). Die Namen erscheinen am Beamer. Mit **×** entfernst du unpassende Namen.
3. **Einstellungen** (unter den Namen, bleiben gespeichert):
   - **Organe:** 4, 6 oder 8. Die Organe werden für jede Runde (Qualifying, Finale, Revanche) **automatisch neu ausgelost**.
   - **Schwierigkeit:** siehe Tabelle unten.
   - **Zeitlimit** (fürs Finale): *Mit Zeitlimit* (sehr großzügig, siehe unten) oder *Ohne Zeitlimit*: Dann zählt nur das Gedächtnis.
   - **Begriffe:** **Fachbegriff** (Hepar, Ren, Pulmo …, jeweils der in der Medizin übliche, lateinisch oder griechisch) oder **Deutsch** (Leber, Niere, Lunge …). In der Auflösung steht jeweils das andere Wort dabei.
   - **Qualifying:** dauert 90 Sekunden (voreingestellt), 2 oder 3 Minuten.
   - **Finale:** mit 2, 3 oder 4 Personen.
4. **Qualifying starten** (Enter). Nach einem Countdown spielen alle **gleichzeitig auf dem eigenen Handy**, für alle gleich lang (**90 Sekunden**, einstellbar). Alle bekommen dieselben Organe. Am Beamer laufen die Restzeit und eine Live-Rangliste.
5. Nach einem Fehler zeigt das Handy kurz die **Auflösung** (was richtig gewesen wäre, z. B. „Hepar = Leber“, und was getippt wurde). Dann startet sofort ein **neuer Versuch mit einer neuen Folge**. Es zählt der **beste Versuch**: die längste richtig nachgetippte Folge, bei Gleichstand die schnellere Eingabe in diesem Versuch. Im Qualifying gibt es kein Zeitlimit pro Runde, wer trödelt, verschenkt nur die eigene Spielzeit. Nachzügler können über den kleinen QR-Code noch einsteigen, haben dann aber nur die restliche Zeit.
6. Ist die Zeit um, zeigt der Beamer den **Endstand**, die Handys zeigen das eigene Ergebnis und den Platz. **Weiter zum Finale** (Enter). Mit „Qualifying beenden“ lässt es sich auch vorzeitig beenden, dann zählt der beste Versuch bis dahin.
7. **Finale einrichten:** Die Besten sind vorausgewählt, über die Auswahllisten lässt sich jemand austauschen. Schwierigkeit und Anzahl der Organe können fürs Finale geändert werden. **Finale starten** (Enter), sobald alle Finalisten-Handys verbunden sind.
8. **Finale:** Die Folge leuchtet **am Beamer** auf (mit Ton), die Finalisten tippen sie gleichzeitig auf dem Handy nach. Am Beamer sieht man live, wie weit alle sind. **Wer einen Fehler macht oder zu langsam ist, fliegt raus**, der Beamer zeigt dazu die Auflösung. Wer zuletzt übrig ist, gewinnt. Scheiden die letzten Verbliebenen in derselben Runde aus, steht vorn, wer mehr Organe richtig hatte, bei Gleichstand, wer länger durchgehalten hat.
9. **Siegerehrung** mit Pokal, Platzierungen und der ganzen Folge zum Nachlesen (z. B. Hepar = Leber). Danach **Revanche** (Enter, gleiche Finalisten, neue Organe), **Andere Finalisten** oder **Neues Spiel** (Esc, zurück zur Anmeldung, alle bleiben angemeldet).

### Schwierigkeitsstufen

| Stufe | Was wird gezeigt? | Knöpfe auf dem Handy |
|---|---|---|
| **Einfach** | Die ganze Folge leuchtet jede Runde auf (Bild und Begriff). | Bild und Begriff, an festen Plätzen wie am Beamer |
| **Mittel** | Die ganze Folge, aber nur als Wort (Fachbegriff oder deutsch, je nach Einstellung) | nur Bilder, jede Runde neu gemischt |
| **Schwer** | Nur das **neue** Organ als Wort, z. B. „NEU: Hepar“ | nur Bilder an festen Plätzen. Die ganze Folge wird aus dem Kopf getippt. |

### Regeln im Detail

- Qualifying: feste Gesamtzeit (90 Sekunden, 2 oder 3 Minuten) für alle, kein Zeitlimit pro Runde.
- Finale, Zeit für die Eingabe (mit Zeitlimit): 20 Sekunden plus 6 Sekunden pro Organ der Folge (Zeitbalken oben), z. B. 50 Sekunden bei 5 Organen und 80 Sekunden bei 10 Organen. Getestet werden soll das Gedächtnis, nicht das Tipptempo.
- Ohne Zeitlimit gibt es keinen Zeitbalken. Tippt im Finale jemand nicht weiter (z. B. Handy weggelegt), beendest du die Runde am Beamer mit **Runde beenden**: Wer die Folge bis dahin nicht fertig getippt hat, scheidet aus. Der Knopf funktioniert auch mit Zeitlimit, etwa wenn ein Handy ausgefallen ist.
- Ab Runde 6, 10 und 14 leuchten die Organe schneller auf. Bei „Mittel“ etwas langsamer, damit man lesen kann. Bei „Schwer“ bleibt das neue Wort 1,6 Sekunden stehen.
- Dasselbe Organ kommt höchstens zweimal direkt hintereinander.

### Tasten am Beamer

| Taste | Funktion |
|---|---|
| Enter | Qualifying starten / beenden, Finale starten, Revanche |
| Esc | Neues Spiel (zurück zur Anmeldung) |
| F | Vollbild |
| M | Ton an/aus |

**Tipps**
- Die Handys sind immer stumm, auch auf der Übungsseite. Ton gibt es nur im Finale über den Beamer-Laptop (mit **M** oder dem Knopf oben rechts ausschaltbar).
- Der Bildschirm der Handys bleibt während des Spiels an (sofern der Browser das unterstützt).
- Wer die Seite versehentlich schließt, scannt den QR-Code noch einmal. Das Handy wird wiedererkannt, solange derselbe Browser benutzt wird. Im Qualifying geht es dann mit einem neuen Versuch weiter, der beste bisherige Versuch bleibt gespeichert.
- **Mehrere Klassen gleichzeitig:** Jede Lehrkraft öffnet `/lehrer` und bekommt einen eigenen Code. **Sitzung → Neue Sitzung** erzeugt einen neuen Code.

---

## Organe und Begriffe ändern

Alle Organe stehen in **`public/js/organe.js`**: Fachbegriff und deutsches Wort. Auf GitHub die Datei öffnen, auf den Stift klicken, nur den Text zwischen den Hochkommas `' … '` ändern, „Commit changes“. Die Kennung (`id`) nicht ändern, an ihr hängt das Bild.

Enthalten sind 20 Organe: Cor, Hepar, Gaster, Ren, Nephron, Pulmo, Cerebrum, Splen, Pancreas, Vesica urinaria, Vesica biliaris, Oesophagus, Intestinum tenue, Colon, Trachea, Larynx, Glandula thyreoidea, Uterus, Oculus, Lingua. Die Bilder sind in `public/js/bilder.js` als SVG gezeichnet.

---

## Datenschutz

- **Gespeichert wird nur:** Vorname mit Anfangsbuchstabe des Nachnamens und die Spielergebnisse. Keine Konten, keine E-Mail-Adressen, keine Cookies, keine Werbung, kein Tracking.
- Die Daten liegen im Klassenraum-Speicher bei Cloudflare und werden **6 Stunden nach der letzten Änderung automatisch gelöscht**. Sofort löschen: **Sitzung → Sitzung beenden und Daten jetzt löschen**.
- Im Browser der Handys speichert die Seite eine zufällige Geräte-Kennung und den zuletzt eingegebenen Namen. Die Übungsseite speichert nur die eigenen Rekorde im Browser.
- Schriften und Programmbibliotheken liegen im Projekt selbst. Die Seiten laden nichts von Google oder anderen Drittanbietern nach.
- Cloudflare ist ein US-Anbieter. Stimme den Einsatz am besten kurz mit der Schulleitung oder dem Datenschutzbeauftragten ab.

## Kosten

Der kostenlose Cloudflare-Tarif reicht aus (100.000 Anfragen pro Tag). Im Qualifying schickt jedes Handy pro geschaffter Runde eine kurze Nachricht, im Finale eine pro Tipp. Eine Unterrichtsstunde mit 30 SuS braucht grob 1.000 bis 2.000 Anfragen.

---

## Notlösung ohne Cloudflare: Laptop als Server

1. [Node.js](https://nodejs.org) installieren (Version 18 oder neuer).
2. Das Repository herunterladen (bei GitHub: **Code → Download ZIP**) und entpacken.
3. Im Projektordner ein Terminal öffnen und `node server/local.mjs` eingeben.
4. Die angezeigte Adresse „Im Netz: http://192.168.…:8787/lehrer“ am Laptop öffnen (nicht `localhost`), damit der QR-Code die Netzwerkadresse enthält.

Voraussetzung: Handys und Laptop sind im selben WLAN, und das WLAN erlaubt Verbindungen zwischen den Geräten.

---

## Technik

| Datei | Inhalt |
|---|---|
| `public/js/organe.js` | ← die Organe (Begriffe, deutsche Wörter) |
| `public/js/bilder.js` | Organ-Grafiken (SVG) |
| `public/js/regeln.js` | Regeln, Tempo, Zeitlimit, Zufall (gilt für Handys, Beamer und Server) |
| `public/js/brett.js` | Spielbrett mit den Organ-Knöpfen |
| `public/js/spiel.js` | Einzelspiel auf dem Handy (Qualifying und Üben) |
| `public/js/lehrer.js` | Beamer-Seite: Anmeldung, Rangliste, Finale, Siegerehrung |
| `public/js/mitspielen.js` | Handy-Seite: Anmeldung, Qualifying, Finale |
| `public/js/ueben.js` | Übungsseite |
| `public/js/ton.js` | Töne (Web Audio, ohne Dateien) |
| `public/js/net.js` | WebSocket-Verbindung mit Wiederverbinden und Uhrabgleich |
| `src/room.js` | Raum-Logik einer Klasse (unabhängig vom Server) |
| `src/worker.js` | Cloudflare Worker und Durable Object (ein Raum je Code) |
| `server/local.mjs` | Lokaler Server ohne Zusatzpakete |

Im Finale entscheidet der Server, wann eine Runde beginnt. Beamer und Handys gleichen ihre Uhren mit dem Server ab, damit alle gleichzeitig mit der Eingabe beginnen. Die Handys der Finalisten kennen nur die Folge bis zur aktuellen Runde, Zuschauer-Handys gar nichts.

### Tests

```
node --test tests/room.test.mjs     # Regeln und Raum-Logik
node tests/e2e.mjs                  # Browser-Durchlauf: Beamer + 5 Handys (Playwright), Bildschirmfotos in tests/ergebnisse/
```

Der Browser-Durchlauf prüft Anmeldung, Qualifying mit Fehlern und abgelaufener Zeit, die Rangliste, ein Finale mit 4 Personen in der Stufe „Schwer“ mit 6 Organen (Ausscheiden, Platzierungen), ein zweites Finale mit 2 Personen und 8 Organen und die Übungsseite.

**Lizenzen:** Schriften Bungee und Rubik unter SIL Open Font License (siehe `public/fonts/`). QR-Code-Generator von Kazuhiko Arase unter MIT-Lizenz (`public/js/qrcode.js`). Das Schullogo gehört der Karoline-Breitinger-Schule.

---

© 2026 Sven Klawitter
