# Wohnplaner

Draufsicht-Planer für die neue Wohnung: maßstabsgetreuer Grundriss, Möbel-Vorlagen
mit Zeichnungen, eigene Bilder/Screenshots, Maße, Abstände, Freiflächen, Raumfarben,
mehrere Varianten. Sync über Firebase (nur mit Toms Google-Konto).

- `js/grundriss.js` – Grundriss in Metern (aus dem Maß-PDF übernommen)
- `js/vorlagen.js` – Möbelkatalog und Draufsicht-Zeichnungen (Einheit cm)
- `js/app.js` – Editor
- `js/cloud.js` – Firebase-Sync (Projekt school-tool-cbbf9, Knoten `wohnplaner/`)
- `firebase-regeln.md` – Regeln, die in der Firebase Console eingetragen werden

Die Seite ist mit `noindex` markiert und nirgends verlinkt. Die Daten liegen nicht
im Repository, sondern geschützt in der Datenbank.
