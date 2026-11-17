# Datenbank-Regeln für den Wohnplaner

Der Wohnplaner speichert im eigenen Firebase-Projekt **wohnplaner-394d5** (Spark-Tarif, kostenlos) unter dem Knoten
`wohnplaner/`. Lesen und schreiben darf nur Toms Google-Konto.

## Einmalig einrichten

1. Firebase Console → Projekt **wohnplaner** → Realtime Database → **Regeln**.
2. Das gesamte Regelwerk ersetzen durch `{ "rules": { <Block unten> } }`.
3. **Veröffentlichen**.

Google-Anmeldung und Domain `greenboy87.github.io` sind eingerichtet (17.11.2026).
Die Kennung (UID) gilt nur in diesem Projekt; sie steht auch in `js/cloud.js` (`TOM`).

```json
"wohnplaner": {
  ".read":  "auth != null && auth.uid === 'egkFnuTDNYRdV25HVFwumS02Qp23'",
  ".write": "auth != null && auth.uid === 'egkFnuTDNYRdV25HVFwumS02Qp23'",
  "index": {
    "$id": {
      ".validate": "$id.matches(/^[a-z0-9]{6,24}$/) && newData.hasChildren(['name', 'stand'])",
      "name":      { ".validate": "newData.isString() && newData.val().length <= 200" },
      "stand":     { ".validate": "newData.isNumber()" },
      "geloescht": { ".validate": "newData.isBoolean()" },
      "$andere":   { ".validate": false }
    }
  },
  "setups": {
    "$id": {
      ".validate": "$id.matches(/^[a-z0-9]{6,24}$/) && newData.hasChildren(['name', 'stand', 'daten'])",
      "name":    { ".validate": "newData.isString() && newData.val().length <= 200" },
      "stand":   { ".validate": "newData.isNumber()" },
      "daten":   { ".validate": "newData.isString() && newData.val().length <= 2000000" },
      "$andere": { ".validate": false }
    }
  },
  "bilder": {
    "$id": {
      ".validate": "$id.matches(/^[a-z0-9]{6,24}$/) && newData.hasChildren(['daten', 'stand'])",
      "daten":   { ".validate": "newData.isString() && newData.val().beginsWith('data:image/') && newData.val().length <= 3000000" },
      "stand":   { ".validate": "newData.isNumber()" },
      "$andere": { ".validate": false }
    }
  },
  "eigene": {
    "daten":   { ".validate": "newData.isString() && newData.val().length <= 500000" },
    "stand":   { ".validate": "newData.isNumber()" },
    "$andere": { ".validate": false }
  },
  "$andere": { ".validate": false }
}
```

## Verbrauch (Download)

- Seitenaufruf: Liste der Varianten (wenige hundert Byte) + nur Varianten, die auf
  einem anderen Gerät neuer sind (je ca. 5–30 KB).
- Speichern: eine Variante wird geschrieben (Schreiben zählt nicht als Download).
- Bilder (je ca. 100–400 KB) werden pro Gerät **einmal** geholt und danach aus dem
  Gerätespeicher (IndexedDB) genommen.
- Grob: weit unter 1 MB pro Tag. Freigrenze im Blaze-Tarif: 360 MB pro Tag.
