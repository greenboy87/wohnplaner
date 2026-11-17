# Hinweise für Claude Code

- Nach jeder Änderung an CSS/JS die Versionsnummer `?v=` in `index.html` bei **allen**
  Einträgen hochzählen, sonst liefern Browser die alte Fassung.
- Keine Adressen, Namen oder Dokumente (Mietvertrag, Exposé) ins Repository – die
  Seite ist öffentlich erreichbar. Daten gehören in Firebase unter `wohnplaner/`.
- Neue Möbel: Eintrag in `K` (`js/vorlagen.js`) + bei Bedarf eine Zeichenfunktion in `Z`.
  Vorderseite = unten (+y), Maße in cm. L-Formen brauchen einen Eintrag in `formen()`.
- Firebase: eigenes Projekt `wohnplaner-394d5` (Spark). Nicht mit school-tool verwechseln.
- Firebase sparsam lesen (siehe globale CLAUDE.md): nur `index` beim Start,
  Varianten nur bei neuerem Stand, Bilder einmal pro Gerät.
- Lokal testen: `python3 -m http.server` im Repo-Ordner (ES-Module brauchen http).
