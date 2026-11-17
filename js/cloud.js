/* Sync über Firebase (eigenes Projekt wohnplaner-394d5, Spark-Tarif, Knoten wohnplaner/).
   Lesen und Schreiben darf nur Toms Google-Konto (siehe firebase-regeln.md).
   Sparsam: Die Liste der Varianten ist winzig (Name + Stand). Eine Variante wird nur
   geladen, wenn sie woanders neuer ist. Bilder werden pro Gerät genau einmal geholt
   und danach aus dem Gerätespeicher (IndexedDB) genommen. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getDatabase, ref, get, set, update, remove } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut,
  setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

const CONFIG = {
  apiKey: 'AIzaSyASanfBQn01J2eNEKXK0w5AU_liZ2ehE-w',
  authDomain: 'wohnplaner-394d5.firebaseapp.com',
  databaseURL: 'https://wohnplaner-394d5-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'wohnplaner-394d5',
  appId: '1:97897565666:web:38a2b51b40d7b941b3fdbb',
};
// Toms Kennung in DIESEM Projekt (UIDs gelten pro Projekt). Leer = noch nicht eingetragen;
// dann entscheiden allein die Datenbank-Regeln.
const TOM = 'egkFnuTDNYRdV25HVFwumS02Qp23';
const WURZEL = 'wohnplaner';

const app = initializeApp(CONFIG, 'wohnplaner');
const db = getDatabase(app);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
const r = p => ref(db, `${WURZEL}/${p}`);

const Cloud = {
  user: null,
  erlaubt: false,
  init(beiAenderung) {
    onAuthStateChanged(auth, u => {
      this.user = u;
      this.erlaubt = !!u && (!TOM || u.uid === TOM);
      beiAenderung(u, this.erlaubt);
    });
  },
  async anmelden() {
    const p = new GoogleAuthProvider();
    try { await signInWithPopup(auth, p); }
    catch (e) {
      if (e && /popup/i.test(e.code || '')) return signInWithRedirect(auth, p);
      throw e;
    }
  },
  abmelden() { return signOut(auth); },

  async index() { return (await get(r('index'))).val() || {}; },
  async setup(id) {
    const v = (await get(r(`setups/${id}`))).val();
    if (!v) return null;
    try { return JSON.parse(v.daten); } catch (e) { return null; }
  },
  async setupSpeichern(s) {
    const daten = JSON.stringify(s);
    await update(ref(db, WURZEL), {
      [`setups/${s.id}`]: { name: s.name, stand: s.stand, daten },
      [`index/${s.id}`]: { name: s.name, stand: s.stand },
    });
  },
  async setupLoeschen(id) {
    await update(ref(db, WURZEL), {
      [`setups/${id}`]: null,
      [`index/${id}`]: { name: '(gelöscht)', stand: Date.now(), geloescht: true },
    });
  },
  async bild(id) { const v = (await get(r(`bilder/${id}`))).val(); return v ? v.daten : null; },
  async bildSpeichern(id, daten) { await set(r(`bilder/${id}`), { daten, stand: Date.now() }); },
  async eigeneStand() { return (await get(r('eigene/stand'))).val() || 0; },
  async eigene() { const v = (await get(r('eigene'))).val(); try { return v ? JSON.parse(v.daten) : null; } catch (e) { return null; } },
  async eigeneSpeichern(liste, stand) { await set(r('eigene'), { daten: JSON.stringify(liste), stand }); },
};

window.Cloud = Cloud;
window.dispatchEvent(new Event('cloud-bereit'));
