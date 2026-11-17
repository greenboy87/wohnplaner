/* Wohnplaner – Editor. Einheit intern: Zentimeter. */
(function () {
  'use strict';
  const V = window.Vorlagen;
  const $ = s => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtM = cm => (cm / 100).toFixed(2).replace('.', ',');
  const fmtCm = cm => (Math.round(cm * 10) / 10).toString().replace('.', ',');
  const rad = d => d * Math.PI / 180;

  // ---------- Grundriss in cm ----------
  const G0 = window.GRUNDRISS;
  const m2cm = p => [p[0] * 100, p[1] * 100];
  const G = {
    outline: G0.outline.map(m2cm),
    rooms: G0.rooms.map(r => ({ name: r.name, poly: r.poly.map(m2cm) })),
    doors: G0.doors.map(d => ({ typ: d.typ, r: d.r.map(v => v * 100), swing: d.swing && { hinge: m2cm(d.swing.hinge), closed: m2cm(d.swing.closed), open: m2cm(d.swing.open) } })),
    windows: G0.windows.map(w => ({ typ: w.typ, r: w.r.map(v => v * 100) })),
    extra: G0.extra.map(e => ({ ...e, poly: e.poly.map(m2cm) })),
  };
  G.rooms.forEach(r => {
    let a = 0; const p = r.poly;
    for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; }
    r.flaeche = Math.abs(a) / 2 / 10000; r.orient = Math.sign(a);
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    r.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  const KANTEN = [];
  G.rooms.forEach(r => r.poly.forEach((p, i) => KANTEN.push([p, r.poly[(i + 1) % r.poly.length], r])));

  function inPoly(x, y, p) {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const raumBei = (x, y) => G.rooms.find(r => inPoly(x, y, r.poly));

  // ---------- Zustand ----------
  const LS = 'wohnplaner-v1', LS_ANSICHT = 'wohnplaner-ansicht';
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  let daten = ls.get(LS) || { setups: {}, aktuell: null, eigene: [], eigeneStand: 0, hochgeladen: {} };
  daten.eigene = daten.eigene || []; daten.hochgeladen = daten.hochgeladen || {};
  const ANSICHT_STD = { masse: 1, namen: true, moebelmasse: true, abstaende: true, zonen: true, tueren: true, raster: false, magnet: true, warnungen: true };
  let ansicht = Object.assign({}, ANSICHT_STD, ls.get(LS_ANSICHT) || {});

  function neuesSetup(name) {
    return { id: uid(), name, stand: Date.now(), items: [], raeume: {} };
  }
  function vorlageItem(v, x, y) {
    const [name, zeichnung, w, h, farbe, zone, extra] = v;
    return Object.assign({ id: uid(), name, zeichnung, w, h, farbe, zone: zone || 0, x, y, rot: 0, deckkraft: 1, ebene: 'moebel' }, JSON.parse(JSON.stringify(extra || {})));
  }
  function startSetup() {
    const s = neuesSetup('Variante 1');
    const mein = V.K['Meine Möbel'];
    s.items.push(Object.assign(vorlageItem(mein[0], 640, 1050), {}));
    const platte = vorlageItem(mein.find(v => v[1] === 'holzplatte'), 1020, 522.8 + 31.75 + 1);
    s.items.push(platte);
    const korg = vorlageItem(mein.find(v => v[1] === 'korg'), 1000, 838.7 - 19 - 1);
    korg.rot = 180;
    s.items.push(korg);
    return s;
  }
  if (!daten.aktuell || !daten.setups[daten.aktuell]) {
    const ids = Object.keys(daten.setups);
    if (ids.length) daten.aktuell = ids[0];
    else { const s = startSetup(); daten.setups[s.id] = s; daten.aktuell = s.id; }
  }
  const akt = () => daten.setups[daten.aktuell];

  let auswahl = null;      // Item-ID
  let raumAuswahl = null;  // Raumname
  let werkzeug = null;     // 'mass'
  let zoom = 1, tx = 0, ty = 0;

  // ---------- Speichern & Verlauf ----------
  let verlauf = [], zukunft = [];
  const schnapp = () => JSON.stringify({ items: akt().items, raeume: akt().raeume });
  let letzterStand = schnapp();
  function aenderung(ohneVerlauf) {
    const jetzt = schnapp();
    if (jetzt === letzterStand) return;
    if (!ohneVerlauf) { verlauf.push(letzterStand); if (verlauf.length > 150) verlauf.shift(); zukunft = []; }
    letzterStand = jetzt;
    akt().stand = Date.now();
    speichernLokal();
    cloudSpaeter(akt().id);
    knoepfeVerlauf();
  }
  function rueckgaengig() {
    if (!verlauf.length) return;
    zukunft.push(letzterStand); letzterStand = verlauf.pop();
    Object.assign(akt(), JSON.parse(letzterStand)); akt().stand = Date.now();
    speichernLokal(); cloudSpaeter(akt().id);
    if (auswahl && !finde(auswahl)) auswahl = null;
    alles(); knoepfeVerlauf();
  }
  function wiederholen() {
    if (!zukunft.length) return;
    verlauf.push(letzterStand); letzterStand = zukunft.pop();
    Object.assign(akt(), JSON.parse(letzterStand)); akt().stand = Date.now();
    speichernLokal(); cloudSpaeter(akt().id);
    alles(); knoepfeVerlauf();
  }
  function verlaufZuruecksetzen() { verlauf = []; zukunft = []; letzterStand = schnapp(); knoepfeVerlauf(); }
  function knoepfeVerlauf() { $('#b-undo').disabled = !verlauf.length; $('#b-redo').disabled = !zukunft.length; }
  function speichernLokal() {
    if (!ls.set(LS, daten)) meldung('Lokaler Speicher ist voll.', true);
  }

  // ---------- Bilder (IndexedDB + Blob-URLs) ----------
  const bildURL = new Map(), bildDaten = new Map();
  const IDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((ok, err) => {
        const q = indexedDB.open('wohnplaner', 1);
        q.onupgradeneeded = () => q.result.createObjectStore('bilder');
        q.onsuccess = () => { this.db = q.result; ok(this.db); };
        q.onerror = () => err(q.error);
      });
    },
    async get(id) {
      try { const db = await this.open(); return await new Promise(ok => { const q = db.transaction('bilder').objectStore('bilder').get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); }
      catch (e) { return null; }
    },
    async put(id, v) {
      try { const db = await this.open(); await new Promise(ok => { const t = db.transaction('bilder', 'readwrite'); t.objectStore('bilder').put(v, id); t.oncomplete = ok; t.onerror = ok; }); }
      catch (e) { /* ohne IndexedDB nur für diese Sitzung */ }
    },
  };
  function bildRegistrieren(id, dataUrl) {
    bildDaten.set(id, dataUrl);
    try {
      const [kopf, b64] = dataUrl.split(','); const mime = kopf.match(/data:([^;]+)/)[1];
      const bin = atob(b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      bildURL.set(id, URL.createObjectURL(new Blob([arr], { type: mime })));
    } catch (e) { bildURL.set(id, dataUrl); }
  }
  async function bilderLaden() {
    const fehlend = [...new Set(akt().items.filter(i => i.bild && !bildURL.has(i.bild)).map(i => i.bild))];
    let neu = false;
    for (const id of fehlend) {
      let d = await IDB.get(id);
      if (!d && cloudAktiv()) {
        try { d = await window.Cloud.bild(id); if (d) await IDB.put(id, d); } catch (e) { /* später erneut */ }
      }
      if (d) { bildRegistrieren(id, d); neu = true; }
    }
    if (neu) zeichneItems();
  }
  function bildVerkleinern(datei) {
    return new Promise((ok, err) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1400, f = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
          const ctx = c.getContext('2d');
          const png = /png|gif|webp/.test(datei.type);
          let url;
          if (png) { ctx.drawImage(img, 0, 0, c.width, c.height); url = c.toDataURL('image/png'); if (url.length > 900000) url = null; }
          if (!url) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height); url = c.toDataURL('image/jpeg', .82); }
          ok({ url, w: c.width, h: c.height });
        };
        img.onerror = () => err(new Error('Bild konnte nicht gelesen werden'));
        img.src = fr.result;
      };
      fr.onerror = () => err(fr.error);
      fr.readAsDataURL(datei);
    });
  }
  async function bildEinfuegen(datei, x, y) {
    try {
      const b = await bildVerkleinern(datei);
      const id = uid();
      bildRegistrieren(id, b.url);
      await IDB.put(id, b.url);
      const breite = 100, it = {
        id: uid(), name: (datei.name || 'Bild').replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'Bild',
        zeichnung: 'bild', bild: id, w: breite, h: Math.round(breite * b.h / b.w * 10) / 10,
        x: x ?? mitte()[0], y: y ?? mitte()[1], rot: 0, farbe: '#ffffff', deckkraft: 1, zone: 0, ebene: 'oben', seitenLock: true,
      };
      akt().items.push(it); auswahl = it.id; raumAuswahl = null;
      aenderung(); alles();
      bildHochladen(id);
      meldung('Bild eingefügt – trage rechts die echte Breite in cm ein.');
      setTimeout(() => { const f = $('#i-w'); if (f) { f.focus(); f.select(); } }, 50);
    } catch (e) { meldung('Bild konnte nicht eingefügt werden.', true); }
  }
  async function bildHochladen(id) {
    if (!cloudAktiv() || daten.hochgeladen[id]) return;
    const d = bildDaten.get(id) || await IDB.get(id);
    if (!d) return;
    if (d.length > 2900000) { meldung('Bild ist zu groß für die Cloud.', true); return; }
    try { await window.Cloud.bildSpeichern(id, d); daten.hochgeladen[id] = 1; speichernLokal(); }
    catch (e) { console.warn(e); }
  }

  // ---------- Geometrie für Items ----------
  function ecken(it, rect) {
    const [rx, ry, rw, rh] = rect, c = Math.cos(rad(it.rot)), s = Math.sin(rad(it.rot));
    const sp = it.spiegel ? -1 : 1;
    return [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]].map(([px, py]) => {
      px *= sp; return [it.x + px * c - py * s, it.y + px * s + py * c];
    });
  }
  const itemPolys = it => (it.zeichnung === 'mass' ? [] : V.formen(it).map(r => ecken(it, r)));
  function zonePoly(it) {
    if (!it.zone) return null;
    if (it.zeichnung === 'sofaL' || it.zeichnung === 'maleron') {
      const t = it.tiefe || 90, c = it.chaise || 95;
      return ecken(it, [-it.w / 2 + c, -it.h / 2 + t, it.w - c, it.zone]);
    }
    return ecken(it, [-it.w / 2, it.h / 2, it.w, it.zone]);
  }
  function aabb(polys) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    polys.flat().forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    return [x0, y0, x1, y1];
  }
  function satUeberlappt(a, b) {
    for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      const nx = y2 - y1, ny = x1 - x2;
      const pa = a.map(([x, y]) => x * nx + y * ny), pb = b.map(([x, y]) => x * nx + y * ny);
      if (Math.max(...pa) <= Math.min(...pb) + .5 || Math.max(...pb) <= Math.min(...pa) + .5) return false;
    }
    return true;
  }
  function schneidet(p1, p2, p3, p4) {
    const d = (a, b, c) => (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
    const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
    return ((d1 > .5 && d2 < -.5) || (d1 < -.5 && d2 > .5)) && ((d3 > .5 && d4 < -.5) || (d3 < -.5 && d4 > .5));
  }
  function wandKonflikt(poly) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      for (const [p, q] of KANTEN) if (schneidet(a, b, p, q)) return true;
    }
    return poly.some(([x, y]) => !raumBei(x, y) && !G.extra.some(e => e.art === 'terrasse' && inPoly(x, y, e.poly)));
  }
  let konflikte = { items: new Set(), zonen: new Set() };
  function pruefen() {
    konflikte = { items: new Set(), zonen: new Set() };
    if (!ansicht.warnungen) return;
    const m = akt().items.filter(i => (i.ebene || 'moebel') === 'moebel' && i.zeichnung !== 'mass');
    const polys = new Map(m.map(i => [i.id, itemPolys(i)]));
    m.forEach(i => { if (polys.get(i.id).some(wandKonflikt)) konflikte.items.add(i.id); });
    for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) {
      if (polys.get(m[a].id).some(p => polys.get(m[b].id).some(q => satUeberlappt(p, q)))) {
        konflikte.items.add(m[a].id); konflikte.items.add(m[b].id);
      }
    }
    if (ansicht.zonen) m.forEach(i => {
      const z = zonePoly(i); if (!z) return;
      if (wandKonflikt(z) || m.some(o => o.id !== i.id && polys.get(o.id).some(q => satUeberlappt(z, q)))) konflikte.zonen.add(i.id);
    });
  }

  // ---------- SVG-Grundgerüst ----------
  const svg = $('#plan');
  const welt = $('#welt');
  const L = {};
  ['bau', 'raster', 'tuer', 'boden', 'zonen', 'moebel', 'oben', 'beschr', 'mass', 'raum', 'auswahl'].forEach(n => {
    const g = document.createElementNS(NS, 'g'); g.id = 'l-' + n; welt.appendChild(g); L[n] = g;
  });
  const px = n => n / zoom; // Bildschirmpixel in cm

  function setzeTransform() { welt.setAttribute('transform', `matrix(${zoom} 0 0 ${zoom} ${tx} ${ty})`); }

  function zeichneBau() {
    const rf = akt().raeume || {};
    let s = `<defs>`;
    G.rooms.forEach((r, i) => s += `<clipPath id="cp${i}"><polygon points="${r.poly.join(' ')}"/></clipPath>`);
    s += `<pattern id="terr" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#eef1e6"/><path d="M0 15H30M15 0V30" stroke="#dfe4d2" stroke-width="1"/></pattern>`;
    s += `<pattern id="fremd" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="20" fill="#e4e4e4"/><line x1="0" y1="0" x2="0" y2="20" stroke="#d2d2d2" stroke-width="6"/></pattern></defs>`;
    G.extra.forEach(e => {
      if (e.art === 'terrasse') s += `<polygon points="${e.poly.join(' ')}" fill="url(#terr)" stroke="#8a8f80" stroke-dasharray="8 6" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
    });
    s += `<polygon points="${G.outline.join(' ')}" fill="#6f6f6f" stroke="#3b3b3b" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
    G.extra.forEach(e => { if (e.art === 'fremd') s += `<polygon points="${e.poly.join(' ')}" fill="url(#fremd)"/>`; });
    G.rooms.forEach((r, i) => {
      const f = rf[r.name] || {};
      const sel = raumAuswahl === r.name;
      s += `<polygon class="raum" data-raum="${esc(r.name)}" points="${r.poly.join(' ')}" fill="${f.boden || '#f7f4ee'}"/>`;
      if (f.wand) s += `<polygon points="${r.poly.join(' ')}" fill="none" stroke="${f.wand}" stroke-width="14" clip-path="url(#cp${i})" pointer-events="none"/>`;
      if (sel) s += `<polygon points="${r.poly.join(' ')}" fill="none" stroke="#2f6fde" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    });
    G.doors.forEach(d => {
      const [x, y, w, h] = d.r;
      const fill = d.typ === 'Ö' ? '#d9cdea' : '#ece8df';
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" pointer-events="none"/>`;
    });
    G.windows.forEach(f => {
      const [x, y, w, h] = f.r;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d6ecfb" stroke="#2f7fd0" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
      if (w > h) s += `<line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="#2f7fd0" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
      else s += `<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="#2f7fd0" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    });
    L.bau.innerHTML = s;
  }

  function zeichneTueren() {
    if (!ansicht.tueren) { L.tuer.innerHTML = ''; return; }
    let s = '';
    G.doors.forEach(d => {
      if (!d.swing) return;
      const { hinge: h, closed: c, open: o } = d.swing;
      const r = Math.hypot(o[0] - h[0], o[1] - h[1]);
      const cr = (o[0] - h[0]) * (c[1] - h[1]) - (o[1] - h[1]) * (c[0] - h[0]);
      s += `<path d="M${h[0]} ${h[1]} L${o[0]} ${o[1]} A${r} ${r} 0 0 ${cr > 0 ? 1 : 0} ${c[0]} ${c[1]} Z" fill="rgba(200,120,40,.07)" stroke="none"/>`;
      s += `<path d="M${o[0]} ${o[1]} A${r} ${r} 0 0 ${cr > 0 ? 1 : 0} ${c[0]} ${c[1]}" fill="none" stroke="#b9772f" stroke-width="1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`;
      s += `<line x1="${h[0]}" y1="${h[1]}" x2="${o[0]}" y2="${o[1]}" stroke="#8c5a24" stroke-width="2.2" vector-effect="non-scaling-stroke"/>`;
    });
    L.tuer.innerHTML = s;
  }

  function zeichneRaster() {
    if (!ansicht.raster) { L.raster.innerHTML = ''; return; }
    let s = '';
    const [x0, y0, x1, y1] = [-100, -100, 1400, 1500];
    for (let x = x0; x <= x1; x += 50) s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${x % 100 ? '#9bb3d6' : '#6c8fc4'}" stroke-opacity="${x % 100 ? .25 : .45}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    for (let y = y0; y <= y1; y += 50) s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${y % 100 ? '#9bb3d6' : '#6c8fc4'}" stroke-opacity="${y % 100 ? .25 : .45}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    L.raster.innerHTML = s;
  }

  // Öffnungen (Türen/Fenster) entlang einer Raumkante
  function oeffnungenAnKante(p, q) {
    const hor = Math.abs(p[1] - q[1]) < .5;
    const c = hor ? p[1] : p[0], a = Math.min(hor ? p[0] : p[1], hor ? q[0] : q[1]), b = Math.max(hor ? p[0] : p[1], hor ? q[0] : q[1]);
    const res = [];
    [...G.doors.map(d => ({ ...d, art: 'T' })), ...G.windows.map(w => ({ ...w, art: 'F' }))].forEach(o => {
      const [x, y, w, h] = o.r;
      const lo = hor ? y : x, hi = hor ? y + h : x + w, s0 = hor ? x : y, s1 = hor ? x + w : y + h;
      if ((Math.abs(lo - c) < 4 || Math.abs(hi - c) < 4) && s1 > a + 2 && s0 < b - 2)
        res.push({ von: Math.max(a, s0), bis: Math.min(b, s1), typ: o.typ });
    });
    return { hor, c, a, b, oeff: res.sort((u, v) => u.von - v.von) };
  }

  function zeichneMasse() {
    let s = '';
    const fs = px(11);
    if (ansicht.masse) {
      G.rooms.forEach(r => {
        const p = r.poly;
        for (let i = 0; i < p.length; i++) {
          const a = p[i], b = p[(i + 1) % p.length];
          const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
          if (len < 15) continue;
          const nx = -dy / len * r.orient, ny = dx / len * r.orient; // nach innen
          const k = oeffnungenAnKante(a, b);
          const off = px(13);
          if (ansicht.masse === 2 && k.oeff.length) {
            let pos = k.a; const teile = [];
            k.oeff.forEach(o => { if (o.von - pos > 3) teile.push({ von: pos, bis: o.von }); teile.push({ ...o }); pos = o.bis; });
            if (k.b - pos > 3) teile.push({ von: pos, bis: k.b });
            teile.forEach(t => {
              const m = (t.von + t.bis) / 2, l = t.bis - t.von;
              const x = k.hor ? m : k.c + nx * off, y = k.hor ? k.c + ny * off : m;
              const farbe = t.typ ? (/F|TT/.test(t.typ) ? '#1f6fc0' : t.typ === 'Ö' || t.typ === 'D' ? '#7a3d9a' : '#b4661c') : '#222';
              const txt = (t.typ ? t.typ + ' ' : '') + fmtM(l);
              s += textLabel(x, y, txt, fs * .92, farbe, k.hor ? 0 : -90);
              if (t.typ == null) {
                // kleine Begrenzungsstriche
              }
            });
            const mg = (k.a + k.b) / 2, off2 = px(28);
            s += textLabel(k.hor ? mg : k.c + nx * off2, k.hor ? k.c + ny * off2 : mg, 'gesamt ' + fmtM(len), fs * .85, '#555', k.hor ? 0 : -90);
          } else {
            const m = [(a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off];
            s += textLabel(m[0], m[1], fmtM(len), fs, '#222', Math.abs(dy) > Math.abs(dx) ? -90 : 0);
          }
        }
      });
    }
    // Maßband-Items
    akt().items.filter(i => i.zeichnung === 'mass').forEach(i => {
      const len = Math.hypot(i.x2 - i.x1, i.y2 - i.y1);
      const ang = Math.atan2(i.y2 - i.y1, i.x2 - i.x1) * 180 / Math.PI;
      const sel = auswahl === i.id;
      const tick = px(7), nx = -(i.y2 - i.y1) / (len || 1), ny = (i.x2 - i.x1) / (len || 1);
      s += `<g data-id="${i.id}" class="massband">`;
      s += `<line x1="${i.x1}" y1="${i.y1}" x2="${i.x2}" y2="${i.y2}" stroke="transparent" stroke-width="${px(14)}"/>`;
      s += `<line x1="${i.x1}" y1="${i.y1}" x2="${i.x2}" y2="${i.y2}" stroke="${sel ? '#2f6fde' : '#d0342c'}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
      [[i.x1, i.y1], [i.x2, i.y2]].forEach(([x, y]) => s += `<line x1="${x - nx * tick}" y1="${y - ny * tick}" x2="${x + nx * tick}" y2="${y + ny * tick}" stroke="${sel ? '#2f6fde' : '#d0342c'}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`);
      let a = ang; if (a > 90) a -= 180; if (a < -90) a += 180;
      s += textLabel((i.x1 + i.x2) / 2 - nx * px(10), (i.y1 + i.y2) / 2 - ny * px(10), fmtCm(len) + ' cm', fs, sel ? '#2f6fde' : '#d0342c', a, true);
      s += `</g>`;
    });
    L.mass.innerHTML = s;
  }

  function textLabel(x, y, txt, fs, farbe, rot = 0, box = false) {
    const t = `<text x="${x}" y="${y}" font-size="${fs}" fill="${farbe}" text-anchor="middle" dominant-baseline="central" ${rot ? `transform="rotate(${rot} ${x} ${y})"` : ''} class="lbl">${esc(txt)}</text>`;
    if (!box) return t;
    return `<text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" ${rot ? `transform="rotate(${rot} ${x} ${y})"` : ''} class="lbl halo">${esc(txt)}</text>` + t;
  }

  function zeichneRaumNamen() {
    if (!ansicht.namen) { L.raum.innerHTML = ''; return; }
    let s = '';
    G.rooms.forEach(r => {
      const [x0, y0, x1, y1] = r.box;
      let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (!inPoly(cx, cy, r.poly)) { cx = r.poly[0][0] + 60; cy = r.poly[0][1] + 60; }
      const klein = (x1 - x0) * zoom < 90;
      s += textLabel(cx, cy - px(klein ? 6 : 9), r.name, px(klein ? 11 : 15), '#3a3a3a', 0, true).replace(/class="lbl/g, 'class="lbl fett');
      s += textLabel(cx, cy + px(klein ? 7 : 10), r.flaeche.toFixed(2).replace('.', ',') + ' m²', px(klein ? 9.5 : 11.5), '#6a6a6a', 0, true);
    });
    G.extra.forEach(e => {
      const xs = e.poly.map(p => p[0]), ys = e.poly.map(p => p[1]);
      s += textLabel((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, e.name, px(13), '#7a7a7a', 0, true);
    });
    L.raum.innerHTML = s;
  }

  function itemSVG(it) {
    const w = it.w, h = it.h, f = it.farbe || '#999';
    let inner;
    if (it.zeichnung === 'bild') {
      const u = bildURL.get(it.bild);
      inner = u ? `<image href="${u}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" preserveAspectRatio="none"/>` :
        `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#eee" stroke="#aaa" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/><text x="0" y="0" font-size="${Math.min(w, h) / 6}" text-anchor="middle" dominant-baseline="central" fill="#888">Bild lädt…</text>`;
    } else if (it.zeichnung === 'text') {
      inner = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="transparent"/><text x="0" y="0" font-size="${h * .7}" text-anchor="middle" dominant-baseline="central" fill="${f}" class="fett">${esc(it.name)}</text>`;
    } else {
      const fn = V.Z[it.zeichnung] || V.Z.rechteck;
      inner = fn(w, h, f, it);
      if (it.zeichnung === 'notiz') {
        const fs = Math.max(5, Math.min(10, w / 10));
        const zeilen = umbrechen((it.link ? '🔗 ' : '') + it.name, Math.floor(w / (fs * .55))).slice(0, Math.floor(h / (fs * 1.25)));
        inner += zeilen.map((z, k) => `<text x="${-w / 2 + 5}" y="${-h / 2 + fs * 1.3 * (k + 1)}" font-size="${fs}" fill="#4a4320" ${k === 0 ? 'class="fett"' : ''}>${esc(z)}</text>`).join('');
      }
    }
    const spiegel = it.spiegel ? ' scale(-1 1)' : '';
    const warn = konflikte.items.has(it.id);
    let s = `<g data-id="${it.id}" class="item${it.gesperrt ? ' gesperrt' : ''}" transform="translate(${it.x} ${it.y}) rotate(${it.rot || 0})" opacity="${it.deckkraft ?? 1}">`;
    s += `<g${spiegel ? ` transform="${spiegel.trim()}"` : ''}>${inner}</g>`;
    if (warn) V.formen(it).forEach(([x, y, w2, h2]) => {
      s += `<rect x="${it.spiegel ? -x - w2 : x}" y="${y}" width="${w2}" height="${h2}" fill="rgba(220,40,40,.12)" stroke="#d0342c" stroke-width="2" stroke-dasharray="6 3" vector-effect="non-scaling-stroke"/>`;
    });
    s += `</g>`;
    return s;
  }
  function umbrechen(t, n) {
    const out = []; let z = '';
    String(t).split(/\s+/).forEach(w => { if ((z + ' ' + w).trim().length > n && z) { out.push(z); z = w; } else z = (z + ' ' + w).trim(); });
    if (z) out.push(z); return out;
  }

  function zeichneItems() {
    pruefen();
    const items = akt().items.filter(i => i.zeichnung !== 'mass');
    L.boden.innerHTML = items.filter(i => i.ebene === 'boden').map(itemSVG).join('');
    L.moebel.innerHTML = items.filter(i => (i.ebene || 'moebel') === 'moebel').map(itemSVG).join('');
    L.oben.innerHTML = items.filter(i => i.ebene === 'oben').map(itemSVG).join('');
    // Bewegungsflächen
    let z = '';
    if (ansicht.zonen) items.forEach(i => {
      const p = zonePoly(i); if (!p) return;
      const w = konflikte.zonen.has(i.id);
      z += `<polygon points="${p.join(' ')}" fill="${w ? 'rgba(240,150,30,.18)' : 'rgba(80,160,90,.10)'}" stroke="${w ? '#e08a1e' : '#5aa06a'}" stroke-dasharray="5 4" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    });
    L.zonen.innerHTML = z; z = '';
    // Möbelmaße (aufrecht)
    if (ansicht.moebelmasse) items.forEach(i => {
      if (i.zeichnung === 'text' || i.zeichnung === 'notiz') return;
      const bild = Math.min(i.w, i.h) * zoom;
      if (bild < 26) return;
      const fs = px(Math.min(11, Math.max(8.5, bild / 5)));
      const zeile2 = `${fmtCm(i.w)} × ${fmtCm(i.h)}`;
      const name = i.name.length > 28 ? i.name.slice(0, 26) + '…' : i.name;
      const passtName = i.w * zoom > name.length * 6.2 || i.h * zoom > name.length * 6.2;
      if (passtName && bild > 40) z += textLabel(i.x, i.y - fs * .65, name, fs, '#1d1d1d', 0, true) + textLabel(i.x, i.y + fs * .65, zeile2, fs * .92, '#1d1d1d', 0, true);
      else z += textLabel(i.x, i.y, zeile2, fs * .92, '#1d1d1d', 0, true);
    });
    L.beschr.innerHTML = z;
    zeichneMasse();
    zeichneAuswahl();
    statusWarnungen();
  }

  function zeichneAuswahl() {
    const it = finde(auswahl);
    let s = '';
    if (it && it.zeichnung === 'mass') {
      [[it.x1, it.y1, 'p1'], [it.x2, it.y2, 'p2']].forEach(([x, y, h]) => s += `<circle data-handle="${h}" cx="${x}" cy="${y}" r="${px(7)}" fill="#fff" stroke="#2f6fde" stroke-width="2" vector-effect="non-scaling-stroke" class="griff"/>`);
    } else if (it) {
      const polys = itemPolys(it);
      const [x0, y0, x1, y1] = aabb(polys);
      if (ansicht.abstaende) s += abstaende(it, [x0, y0, x1, y1]);
      const e = ecken(it, [-it.w / 2, -it.h / 2, it.w, it.h]);
      s += `<polygon points="${e.join(' ')}" fill="none" stroke="#2f6fde" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
      if (!it.gesperrt) {
        const c = Math.cos(rad(it.rot)), sn = Math.sin(rad(it.rot));
        const loc = (lx, ly) => [it.x + lx * c - ly * sn, it.y + lx * sn + ly * c];
        const top = loc(0, -it.h / 2), dreh = loc(0, -it.h / 2 - px(30));
        s += `<line x1="${top[0]}" y1="${top[1]}" x2="${dreh[0]}" y2="${dreh[1]}" stroke="#2f6fde" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
        s += `<circle data-handle="dreh" cx="${dreh[0]}" cy="${dreh[1]}" r="${px(9)}" fill="#2f6fde" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" class="griff"/>`;
        s += `<path d="M${dreh[0] - px(4)} ${dreh[1] - px(1)} a${px(4)} ${px(4)} 0 1 1 ${px(1.5)} ${px(4)}" fill="none" stroke="#fff" stroke-width="1.6" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
        const g = loc(it.w / 2, it.h / 2), gs = px(9);
        s += `<rect data-handle="groesse" x="${g[0] - gs / 2}" y="${g[1] - gs / 2}" width="${gs}" height="${gs}" fill="#fff" stroke="#2f6fde" stroke-width="2" vector-effect="non-scaling-stroke" class="griff" transform="rotate(${it.rot} ${g[0]} ${g[1]})"/>`;
        // Vorderseite markieren
        const vorne = loc(0, it.h / 2 + px(6));
        if (it.zone || /sofa|maleron|sessel|bett|schrank|piano|korg|klavier|kueche|schreibtisch|holzplatte/.test(it.zeichnung))
          s += `<path d="M${vorne[0]} ${vorne[1]} l${px(5) * Math.cos(rad(it.rot + 90)) - px(4) * Math.cos(rad(it.rot))} ${px(5) * Math.sin(rad(it.rot + 90)) - px(4) * Math.sin(rad(it.rot))} m${px(8) * Math.cos(rad(it.rot))} ${px(8) * Math.sin(rad(it.rot))} L${vorne[0]} ${vorne[1]}" stroke="#2f6fde" stroke-width="1.5" fill="none" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
      }
    }
    if (massVorschau) {
      const m = massVorschau, len = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
      s += `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="#d0342c" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
      s += textLabel((m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2 - px(12), fmtCm(len) + ' cm', px(12), '#d0342c', 0, true);
    }
    L.auswahl.innerHTML = s;
  }

  // Abstände des ausgewählten Möbels zu den Wänden (in alle vier Richtungen)
  function abstaende(it, [x0, y0, x1, y1]) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const best = { l: null, r: null, o: null, u: null };
    KANTEN.forEach(([p, q]) => {
      if (Math.abs(p[0] - q[0]) < .5) { // senkrechte Wand
        const ya = Math.min(p[1], q[1]), yb = Math.max(p[1], q[1]);
        if (cy < ya || cy > yb) return;
        if (p[0] <= x0 + .5 && (best.l == null || p[0] > best.l)) best.l = p[0];
        if (p[0] >= x1 - .5 && (best.r == null || p[0] < best.r)) best.r = p[0];
      } else if (Math.abs(p[1] - q[1]) < .5) {
        const xa = Math.min(p[0], q[0]), xb = Math.max(p[0], q[0]);
        if (cx < xa || cx > xb) return;
        if (p[1] <= y0 + .5 && (best.o == null || p[1] > best.o)) best.o = p[1];
        if (p[1] >= y1 - .5 && (best.u == null || p[1] < best.u)) best.u = p[1];
      }
    });
    let s = '';
    const linie = (xa, ya, xb, yb, d) => {
      if (d == null || d > 800) return;
      const farbe = d < 1 ? '#2f6fde' : '#2f6fde';
      s += `<line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}" stroke="${farbe}" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
      if (d >= 1) s += textLabel((xa + xb) / 2, (ya + yb) / 2, fmtCm(d), px(10.5), '#1f4fae', 0, true);
    };
    if (best.l != null) linie(best.l, cy, x0, cy, x0 - best.l);
    if (best.r != null) linie(x1, cy, best.r, cy, best.r - x1);
    if (best.o != null) linie(cx, best.o, cx, y0, y0 - best.o);
    if (best.u != null) linie(cx, y1, cx, best.u, best.u - y1);
    return s;
  }

  function statusWarnungen() {
    const n = konflikte.items.size, z = konflikte.zonen.size;
    const el = $('#warnung');
    if (!ansicht.warnungen || (!n && !z)) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = [n ? `${n} Möbel stoßen an` : '', z ? `${z} Bewegungsfläche${z > 1 ? 'n' : ''} zugestellt` : ''].filter(Boolean).join(' · ');
  }

  function alles() {
    setzeTransform();
    zeichneBau(); zeichneRaster(); zeichneTueren(); zeichneRaumNamen(); zeichneItems();
    inspektor(); setupListe(); ansichtKnoepfe();
  }
  let rafPlan = 0;
  function neuZeichnenBald(nurItems) {
    if (rafPlan) return;
    rafPlan = requestAnimationFrame(() => {
      rafPlan = 0;
      setzeTransform();
      if (!nurItems) { zeichneRaumNamen(); }
      zeichneItems();
    });
  }

  // ---------- Ansicht ----------
  function weltPunkt(e) {
    const r = svg.getBoundingClientRect();
    return [(e.clientX - r.left - tx) / zoom, (e.clientY - r.top - ty) / zoom];
  }
  function mitte() {
    const r = svg.getBoundingClientRect();
    return [(r.width / 2 - tx) / zoom, (r.height / 2 - ty) / zoom];
  }
  function einpassen() {
    const r = svg.getBoundingClientRect();
    const pts = [...G.outline, ...G.extra.flatMap(e => e.poly)];
    akt().items.forEach(i => { if (i.zeichnung !== 'mass') itemPolys(i).forEach(p => pts.push(...p)); });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs) - 30, x1 = Math.max(...xs) + 30, y0 = Math.min(...ys) - 30, y1 = Math.max(...ys) + 30;
    zoom = Math.min(r.width / (x1 - x0), r.height / (y1 - y0));
    tx = (r.width - (x1 - x0) * zoom) / 2 - x0 * zoom;
    ty = (r.height - (y1 - y0) * zoom) / 2 - y0 * zoom;
    alles();
  }
  function zoomUm(f, sx, sy) {
    const nz = Math.min(12, Math.max(.12, zoom * f));
    tx = sx - (sx - tx) * nz / zoom; ty = sy - (sy - ty) * nz / zoom; zoom = nz;
    neuZeichnenBald();
    clearTimeout(zoomUm.t); zoomUm.t = setTimeout(() => { zeichneMasse(); zeichneAuswahl(); }, 60);
  }

  // ---------- Zeiger-Interaktion ----------
  const zeiger = new Map();
  let ziehen = null, massVorschau = null;
  const finde = id => akt().items.find(i => i.id === id);

  function magnet(it, nx, ny) {
    if (!ansicht.magnet) return [Math.round(nx * 2) / 2, Math.round(ny * 2) / 2];
    const tmp = { ...it, x: nx, y: ny };
    const [x0, y0, x1, y1] = aabb(itemPolys(tmp));
    const tol = px(9);
    let bx = null, by = null;
    KANTEN.forEach(([p, q]) => {
      if (Math.abs(p[0] - q[0]) < .5) {
        const ya = Math.min(p[1], q[1]), yb = Math.max(p[1], q[1]);
        if (y1 < ya || y0 > yb) return;
        [[x0, p[0] - x0], [x1, p[0] - x1]].forEach(([, d]) => { if (Math.abs(d) < tol && (bx == null || Math.abs(d) < Math.abs(bx))) bx = d; });
      } else {
        const xa = Math.min(p[0], q[0]), xb = Math.max(p[0], q[0]);
        if (x1 < xa || x0 > xb) return;
        [[y0, p[1] - y0], [y1, p[1] - y1]].forEach(([, d]) => { if (Math.abs(d) < tol && (by == null || Math.abs(d) < Math.abs(by))) by = d; });
      }
    });
    // auch an andere Möbel andocken
    akt().items.forEach(o => {
      if (o.id === it.id || o.zeichnung === 'mass' || (o.ebene || 'moebel') !== (it.ebene || 'moebel')) return;
      const [a0, b0, a1, b1] = aabb(itemPolys(o));
      if (!(y1 < b0 || y0 > b1)) [[a0 - x1], [a1 - x0], [a0 - x0], [a1 - x1]].forEach(([d]) => { if (Math.abs(d) < tol * .7 && (bx == null || Math.abs(d) < Math.abs(bx))) bx = d; });
      if (!(x1 < a0 || x0 > a1)) [[b0 - y1], [b1 - y0], [b0 - y0], [b1 - y1]].forEach(([d]) => { if (Math.abs(d) < tol * .7 && (by == null || Math.abs(d) < Math.abs(by))) by = d; });
    });
    return [Math.round((nx + (bx || 0)) * 2) / 2, Math.round((ny + (by || 0)) * 2) / 2];
  }
  function eckenFang(x, y) {
    const tol = px(10); let best = null, bd = tol;
    KANTEN.forEach(([p]) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = p; } });
    return best ? [best[0], best[1]] : [x, y];
  }

  svg.addEventListener('pointerdown', e => {
    if (e.button === 2) return;
    try { svg.setPointerCapture(e.pointerId); } catch (er) { /* z. B. Stift ohne Capture */ }
    zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (zeiger.size === 2) { // Pinch
      ziehen = { art: 'pinch', start: [...zeiger.values()], zoom, tx, ty };
      return;
    }
    const p = weltPunkt(e);
    const griff = e.target.closest('[data-handle]');
    const itemEl = e.target.closest('[data-id]');
    if (werkzeug === 'mass') {
      const s = eckenFang(...p);
      massVorschau = { x1: s[0], y1: s[1], x2: s[0], y2: s[1] };
      ziehen = { art: 'massNeu' };
      return;
    }
    if (griff) {
      const it = finde(auswahl);
      ziehen = { art: griff.dataset.handle, it, start: p, orig: { ...it } };
      return;
    }
    if (itemEl) {
      const it = finde(itemEl.dataset.id);
      const neuGewaehlt = auswahl !== it.id;
      auswahl = it.id; raumAuswahl = null;
      if (neuGewaehlt) { zeichneBau(); zeichneItems(); inspektor(); }
      if (!it.gesperrt) ziehen = { art: 'item', it, start: p, orig: { ...it }, bewegt: false };
      else ziehen = { art: 'pan', sx: e.clientX, sy: e.clientY, tx, ty, klick: true, p };
      return;
    }
    ziehen = { art: 'pan', sx: e.clientX, sy: e.clientY, tx, ty, klick: true, p };
  });

  svg.addEventListener('pointermove', e => {
    if (zeiger.has(e.pointerId)) zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!ziehen) return;
    const p = weltPunkt(e);
    const z = ziehen;
    if (z.art === 'pinch' && zeiger.size === 2) {
      const [a, b] = [...zeiger.values()], [a0, b0] = z.start;
      const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y), d1 = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svg.getBoundingClientRect();
      const m0 = [(a0.x + b0.x) / 2 - r.left, (a0.y + b0.y) / 2 - r.top], m1 = [(a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top];
      const nz = Math.min(12, Math.max(.12, z.zoom * d1 / d0));
      zoom = nz; tx = m1[0] - (m0[0] - z.tx) * nz / z.zoom; ty = m1[1] - (m0[1] - z.ty) * nz / z.zoom;
      neuZeichnenBald();
      return;
    }
    if (z.art === 'pan') {
      if (Math.hypot(e.clientX - z.sx, e.clientY - z.sy) > 4) z.klick = false;
      tx = z.tx + e.clientX - z.sx; ty = z.ty + e.clientY - z.sy; setzeTransform();
      return;
    }
    if (z.art === 'massNeu') {
      let [x, y] = eckenFang(...p);
      if (!e.altKey) { // gerade halten, wenn fast waagrecht/senkrecht
        const m = massVorschau;
        if (Math.abs(y - m.y1) < px(8)) y = m.y1; else if (Math.abs(x - m.x1) < px(8)) x = m.x1;
      }
      massVorschau.x2 = x; massVorschau.y2 = y; zeichneAuswahl();
      return;
    }
    const it = z.it; if (!it) return;
    if (z.art === 'item') {
      const dx = p[0] - z.start[0], dy = p[1] - z.start[1];
      if (!z.bewegt && Math.hypot(dx, dy) * zoom < 3) return;
      z.bewegt = true;
      if (it.zeichnung === 'mass') {
        it.x1 = z.orig.x1 + dx; it.y1 = z.orig.y1 + dy; it.x2 = z.orig.x2 + dx; it.y2 = z.orig.y2 + dy;
      } else {
        [it.x, it.y] = e.altKey ? [z.orig.x + dx, z.orig.y + dy] : magnet(it, z.orig.x + dx, z.orig.y + dy);
      }
      neuZeichnenBald(true); inspektorWerte();
    } else if (z.art === 'dreh') {
      let a = Math.atan2(p[1] - it.y, p[0] - it.x) * 180 / Math.PI + 90;
      if (!e.shiftKey) a = Math.round(a / 15) * 15; else a = Math.round(a);
      it.rot = ((a % 360) + 360) % 360;
      neuZeichnenBald(true); inspektorWerte();
    } else if (z.art === 'groesse') {
      const o = z.orig, c = Math.cos(rad(o.rot)), s = Math.sin(rad(o.rot));
      const fx = o.x + (-o.w / 2) * c - (-o.h / 2) * s, fy = o.y + (-o.w / 2) * s + (-o.h / 2) * c; // feste Ecke
      const vx = p[0] - fx, vy = p[1] - fy;
      let w = Math.max(5, vx * c + vy * s), h = Math.max(5, -vx * s + vy * c);
      if (it.seitenLock && !e.shiftKey) h = w * o.h / o.w;
      w = Math.round(w); h = Math.round(h * 10) / 10;
      groesseSetzen(it, w, h);
      it.x = fx + (w / 2) * c - (h / 2) * s; it.y = fy + (w / 2) * s + (h / 2) * c;
      neuZeichnenBald(true); inspektorWerte();
    } else if (z.art === 'p1' || z.art === 'p2') {
      const [x, y] = eckenFang(...p);
      it['x' + z.art[1]] = x; it['y' + z.art[1]] = y;
      zeichneMasse(); zeichneAuswahl(); inspektorWerte();
    }
  });

  function ende(e) {
    zeiger.delete(e.pointerId);
    const z = ziehen;
    if (!z) return;
    if (z.art === 'pinch') { if (zeiger.size < 2) { ziehen = null; zeichneMasse(); zeichneAuswahl(); } return; }
    ziehen = null;
    if (z.art === 'pan') {
      if (z.klick) {
        const r = raumBei(...z.p);
        const vorher = auswahl || raumAuswahl;
        auswahl = null; raumAuswahl = r ? r.name : null;
        if (vorher || raumAuswahl) { zeichneBau(); zeichneItems(); inspektor(); }
      }
      return;
    }
    if (z.art === 'massNeu') {
      const m = massVorschau; massVorschau = null;
      if (Math.hypot(m.x2 - m.x1, m.y2 - m.y1) > 3) {
        const it = { id: uid(), name: 'Maßband', zeichnung: 'mass', ...m, ebene: 'oben' };
        akt().items.push(it); auswahl = it.id; aenderung();
      }
      werkzeugSetzen(null);
      zeichneItems(); inspektor();
      return;
    }
    aenderung(); zeichneItems(); inspektor();
  }
  svg.addEventListener('pointerup', ende);
  svg.addEventListener('pointercancel', ende);

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const mausrad = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
    if (e.ctrlKey || e.metaKey || mausrad) {
      zoomUm(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)), e.clientX - r.left, e.clientY - r.top);
    } else { tx -= e.deltaX; ty -= e.deltaY; setzeTransform(); }
  }, { passive: false });

  // Dateien per Drag & Drop
  svg.addEventListener('dragover', e => { e.preventDefault(); });
  svg.addEventListener('drop', e => {
    e.preventDefault();
    const p = weltPunkt(e);
    [...(e.dataTransfer.files || [])].filter(f => f.type.startsWith('image/')).forEach((f, i) => bildEinfuegen(f, p[0] + i * 20, p[1] + i * 20));
  });

  // ---------- Item-Aktionen ----------
  function groesseSetzen(it, w, h) {
    it.w = w; it.h = h;
    if (it.zeichnung === 'esstisch') { it.tw = w; it.th = Math.max(40, h - 100); }
    if (it.zeichnung === 'esstischRund') { it.tw = Math.max(40, w - 80); it.h = it.w; }
  }
  function hinzufuegen(v) {
    const [mx, my] = mitte();
    const r = raumBei(mx, my) || G.rooms.find(q => q.name === 'Wohnen');
    let x = mx, y = my;
    if (!raumBei(mx, my) && r) { x = (r.box[0] + r.box[2]) / 2; y = (r.box[1] + r.box[3]) / 2; }
    const it = Array.isArray(v) ? vorlageItem(v, x, y) : Object.assign(JSON.parse(JSON.stringify(v)), { id: uid(), x, y });
    akt().items.push(it); auswahl = it.id; raumAuswahl = null;
    aenderung(); zeichneBau(); zeichneItems(); inspektor();
    if (window.innerWidth < 900) document.body.classList.remove('bib-offen');
  }
  function duplizieren() {
    const it = finde(auswahl); if (!it) return;
    const k = JSON.parse(JSON.stringify(it)); k.id = uid();
    if (k.zeichnung === 'mass') { k.x1 += 20; k.x2 += 20; k.y1 += 20; k.y2 += 20; } else { k.x += 20; k.y += 20; }
    akt().items.push(k); auswahl = k.id; aenderung(); zeichneItems(); inspektor();
  }
  function loeschen() {
    const it = finde(auswahl); if (!it) return;
    akt().items = akt().items.filter(i => i.id !== it.id); auswahl = null;
    aenderung(); zeichneItems(); inspektor();
  }
  function drehen(d) {
    const it = finde(auswahl); if (!it || it.zeichnung === 'mass' || it.gesperrt) return;
    it.rot = (((it.rot || 0) + d) % 360 + 360) % 360; aenderung(); zeichneItems(); inspektorWerte();
  }
  function reihenfolge(nachVorne) {
    const it = finde(auswahl); if (!it) return;
    const a = akt().items; a.splice(a.indexOf(it), 1);
    nachVorne ? a.push(it) : a.unshift(it); aenderung(); zeichneItems();
  }

  // ---------- Tastatur & Zwischenablage ----------
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    const cmd = e.metaKey || e.ctrlKey;
    if (cmd && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? wiederholen() : rueckgaengig(); return; }
    if (cmd && e.key.toLowerCase() === 'y') { e.preventDefault(); wiederholen(); return; }
    if (cmd && e.key.toLowerCase() === 'd') { e.preventDefault(); duplizieren(); return; }
    if (e.key === 'Escape') { auswahl = null; raumAuswahl = null; werkzeugSetzen(null); massVorschau = null; zeichneBau(); zeichneItems(); inspektor(); dialogZu(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (auswahl) { e.preventDefault(); loeschen(); } return; }
    if (e.key.toLowerCase() === 'r' && !cmd) { drehen(e.shiftKey ? -90 : 90); return; }
    if (e.key.toLowerCase() === 'm' && !cmd) { werkzeugSetzen(werkzeug === 'mass' ? null : 'mass'); return; }
    if (e.key === '0' && !cmd) { einpassen(); return; }
    const pfeile = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (pfeile[e.key] && auswahl) {
      const it = finde(auswahl); if (!it || it.gesperrt) return;
      e.preventDefault();
      const f = e.shiftKey ? 10 : 1, [dx, dy] = pfeile[e.key];
      if (it.zeichnung === 'mass') { it.x1 += dx * f; it.x2 += dx * f; it.y1 += dy * f; it.y2 += dy * f; }
      else { it.x += dx * f; it.y += dy * f; }
      zeichneItems(); inspektorWerte();
      clearTimeout(document.pfeilT); document.pfeilT = setTimeout(aenderung, 400);
    }
  });
  document.addEventListener('paste', e => {
    if (e.target.closest('input, textarea')) return;
    const dt = e.clipboardData; if (!dt) return;
    const bild = [...dt.items].find(i => i.type.startsWith('image/'));
    if (bild) { e.preventDefault(); bildEinfuegen(bild.getAsFile()); return; }
    const t = dt.getData('text').trim();
    if (/^https?:\/\/\S+$/.test(t)) {
      e.preventDefault();
      let host = t; try { host = new URL(t).hostname.replace(/^www\./, ''); } catch (er) { /* egal */ }
      hinzufuegen(['Link: ' + host, 'notiz', 90, 60, '#fff3a3', 0, { ebene: 'oben', link: t }]);
      meldung('Link als Notiz eingefügt. Tipp: Screenshot der Seite mit ⌘V einfügen, um Bild + Maße zu sehen.');
    }
  });

  // ---------- Inspektor ----------
  const FARBEN = ['#26398f', '#3d4450', '#8a8f98', '#d9cbb5', '#c8a77e', '#7a4e2d', '#2b1f1a', '#ece8e1', '#ffffff', '#1d1d1f', '#b07a55', '#8b1e2d', '#e07a5f', '#e8c66a', '#6a9f58', '#5f8f4e', '#a7c7e7', '#9db4c0', '#c0a9bd', '#fff3a3'];
  const BODEN = [['Parkett Eiche', '#e3c9a0'], ['Parkett hell', '#efdcbc'], ['Parkett dunkel', '#b88a5a'], ['Fliesen hell', '#e9e9e6'], ['Fliesen grau', '#c9cbcc'], ['Neutral', '#f7f4ee']];
  const WAND = [['Weiß', ''], ['Salbei', '#a9bfa1'], ['Taubenblau', '#8fa6bf'], ['Nachtblau', '#2d3e63'], ['Terrakotta', '#c97b5b'], ['Sand', '#dcc9a8'], ['Altrosa', '#d6a8a6'], ['Anthrazit', '#4a4d52'], ['Ocker', '#d9a441']];
  const insp = $('#inspektor');

  function feld(lbl, html) { return `<label class="feld"><span>${lbl}</span>${html}</label>`; }
  function farbFeld(id, wert, liste) {
    return `<div class="farben">${liste.map(c => `<button class="farbe${c.toLowerCase() === String(wert).toLowerCase() ? ' an' : ''}" data-farbe="${c}" style="background:${c}" title="${c}"></button>`).join('')}<input type="color" id="${id}" value="${wert && /^#[0-9a-f]{6}$/i.test(wert) ? wert : '#888888'}"></div>`;
  }

  function inspektor() {
    const it = finde(auswahl);
    document.body.classList.toggle('insp-offen', !!(it || raumAuswahl));
    if (raumAuswahl && !it) return raumInspektor();
    if (!it) {
      insp.innerHTML = `<div class="leer"><h3>Nichts ausgewählt</h3><p>Tippe ein Möbel an, um es zu bearbeiten, oder einen Raum, um Boden- und Wandfarbe zu wählen.</p>
        <ul class="tipps"><li><b>Verschieben:</b> ziehen · Pfeiltasten (mit ⇧ 10 cm)</li><li><b>Drehen:</b> blauer Kreis oben · Taste R</li><li><b>Größe:</b> Quadrat an der Ecke</li><li><b>Maßband:</b> Taste M, dann ziehen</li><li><b>Bild/Screenshot:</b> ⌘V oder in den Plan ziehen</li><li><b>Zoomen:</b> Pinch / ⌘ + Scrollen · Taste 0 = alles zeigen</li></ul></div>`;
      return;
    }
    if (it.zeichnung === 'mass') {
      const len = Math.hypot(it.x2 - it.x1, it.y2 - it.y1);
      insp.innerHTML = `<div class="kopf"><h3>Maßband</h3><button class="x" data-a="zu">✕</button></div>
        <p class="gross" id="i-len">${fmtCm(len)} cm</p><p class="hinweis">Endpunkte ziehen, um nachzumessen. Sie rasten an Raumecken ein.</p>
        <div class="knoepfe"><button data-a="dup">Duplizieren</button><button data-a="del" class="gefahr">Löschen</button></div>`;
      return;
    }
    const L_ = it.zeichnung === 'sofaL' || it.zeichnung === 'maleron';
    insp.innerHTML = `
      <div class="kopf"><h3>${esc(it.zeichnung === 'bild' ? 'Bild' : 'Möbel')}</h3><button class="x" data-a="zu">✕</button></div>
      ${feld('Name', `<input id="i-name" value="${esc(it.name)}">`)}
      <div class="reihe">
        ${feld('Breite (cm)', `<input id="i-w" type="number" step="0.5" min="1" value="${it.w}">`)}
        ${feld('Tiefe (cm)', `<input id="i-h" type="number" step="0.5" min="1" value="${it.h}">`)}
      </div>
      ${it.zeichnung === 'bild' ? `<label class="check"><input type="checkbox" id="i-lock" ${it.seitenLock ? 'checked' : ''}> Seitenverhältnis beibehalten</label>` : ''}
      ${L_ ? `<div class="reihe">${feld('Tiefe Rücken (cm)', `<input id="i-tiefe" type="number" step="0.5" value="${it.tiefe || 90}">`)}${feld('Breite Liegeteil', `<input id="i-chaise" type="number" step="0.5" value="${it.chaise || 95}">`)}</div>` : ''}
      <div class="reihe">
        ${feld('Drehung (°)', `<input id="i-rot" type="number" step="1" value="${Math.round(it.rot || 0)}">`)}
        ${feld('Freifläche vorne', `<input id="i-zone" type="number" step="5" min="0" value="${it.zone || 0}">`)}
      </div>
      <div class="knoepfe klein"><button data-a="r-90">⟲ 90°</button><button data-a="r90">⟳ 90°</button><button data-a="spiegel">⇋ Spiegeln</button></div>
      ${it.zeichnung !== 'bild' ? feld('Farbe', farbFeld('i-farbe', it.farbe, FARBEN)) : ''}
      ${feld('Deckkraft', `<input id="i-deck" type="range" min="0.15" max="1" step="0.05" value="${it.deckkraft ?? 1}">`)}
      ${feld('Ebene', `<select id="i-ebene"><option value="boden"${it.ebene === 'boden' ? ' selected' : ''}>Boden (Teppich – darf überlappen)</option><option value="moebel"${(it.ebene || 'moebel') === 'moebel' ? ' selected' : ''}>Möbel</option><option value="oben"${it.ebene === 'oben' ? ' selected' : ''}>Obenauf (Notiz/Bild)</option></select>`)}
      ${feld('Link (Shop, Datenblatt)', `<div class="mit-knopf"><input id="i-link" type="url" placeholder="https://…" value="${esc(it.link || '')}"><button data-a="link" title="Link öffnen" ${it.link ? '' : 'disabled'}>↗</button></div>`)}
      <div class="reihe">${feld('Preis (€)', `<input id="i-preis" type="number" step="1" min="0" value="${it.preis ?? ''}">`)}${feld('Status', `<select id="i-status">${['', 'vorhanden', 'Idee', 'gekauft', 'bestellt'].map(s => `<option${(it.status || '') === s ? ' selected' : ''}>${s}</option>`).join('')}</select>`)}</div>
      ${feld('Notiz', `<textarea id="i-notiz" rows="3">${esc(it.notiz || '')}</textarea>`)}
      <label class="check"><input type="checkbox" id="i-gesperrt" ${it.gesperrt ? 'checked' : ''}> Festhalten (nicht verschiebbar)</label>
      <div class="knoepfe">
        <button data-a="dup">Duplizieren</button><button data-a="vorne">Nach vorne</button><button data-a="hinten">Nach hinten</button>
        <button data-a="vorlage">Als Vorlage merken</button><button data-a="del" class="gefahr">Löschen</button>
      </div>`;
  }
  function inspektorWerte() {
    const it = finde(auswahl); if (!it) return;
    if (it.zeichnung === 'mass') { const l = $('#i-len'); if (l) l.textContent = fmtCm(Math.hypot(it.x2 - it.x1, it.y2 - it.y1)) + ' cm'; return; }
    const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; };
    set('#i-w', it.w); set('#i-h', it.h); set('#i-rot', Math.round(it.rot || 0));
  }
  function raumInspektor() {
    const r = G.rooms.find(q => q.name === raumAuswahl);
    const f = (akt().raeume || {})[r.name] || {};
    insp.innerHTML = `<div class="kopf"><h3>${esc(r.name)}</h3><button class="x" data-a="zu">✕</button></div>
      <p class="gross">${r.flaeche.toFixed(2).replace('.', ',')} m²</p>
      <p class="hinweis">${fmtM(r.box[2] - r.box[0])} × ${fmtM(r.box[3] - r.box[1])} m (größte Ausdehnung)</p>
      ${feld('Bodenfarbe', `<div class="farben">${BODEN.map(([n, c]) => `<button class="farbe${(f.boden || '#f7f4ee') === c ? ' an' : ''}" data-boden="${c}" style="background:${c}" title="${n}"></button>`).join('')}<input type="color" id="r-boden" value="${f.boden || '#f7f4ee'}"></div>`)}
      ${feld('Wandfarbe', `<div class="farben">${WAND.map(([n, c]) => `<button class="farbe${(f.wand || '') === c ? ' an' : ''}" data-wand="${c}" style="background:${c || '#fff'}" title="${n}"></button>`).join('')}<input type="color" id="r-wand" value="${f.wand || '#ffffff'}"></div>`)}
      <p class="hinweis">Die Wandfarbe erscheint als farbiger Rand innen an den Wänden.</p>
      <div class="knoepfe"><button data-a="farben-weg">Farben zurücksetzen</button></div>`;
  }
  function raumFarbe(art, wert) {
    const rf = akt().raeume = akt().raeume || {};
    rf[raumAuswahl] = rf[raumAuswahl] || {};
    if (wert) rf[raumAuswahl][art] = wert; else delete rf[raumAuswahl][art];
    aenderung(); zeichneBau(); raumInspektor();
  }

  insp.addEventListener('input', e => {
    const it = finde(auswahl);
    if (raumAuswahl && !it) {
      if (e.target.id === 'r-boden') { const rf = akt().raeume = akt().raeume || {}; (rf[raumAuswahl] = rf[raumAuswahl] || {}).boden = e.target.value; zeichneBau(); }
      if (e.target.id === 'r-wand') { const rf = akt().raeume = akt().raeume || {}; (rf[raumAuswahl] = rf[raumAuswahl] || {}).wand = e.target.value; zeichneBau(); }
      return;
    }
    if (!it) return;
    const v = e.target.value, n = parseFloat(String(v).replace(',', '.'));
    switch (e.target.id) {
      case 'i-name': it.name = v; break;
      case 'i-w': if (n > 0) { const h = it.seitenLock ? Math.round(n * it.h / it.w * 10) / 10 : it.h; groesseSetzen(it, n, h); if (it.seitenLock) $('#i-h').value = it.h; } break;
      case 'i-h': if (n > 0) { const w = it.seitenLock ? Math.round(n * it.w / it.h * 10) / 10 : it.w; groesseSetzen(it, w, n); if (it.seitenLock) $('#i-w').value = it.w; } break;
      case 'i-tiefe': if (n > 0) it.tiefe = n; break;
      case 'i-chaise': if (n > 0) it.chaise = n; break;
      case 'i-rot': if (!isNaN(n)) it.rot = ((n % 360) + 360) % 360; break;
      case 'i-zone': it.zone = Math.max(0, n || 0); break;
      case 'i-farbe': it.farbe = v; break;
      case 'i-deck': it.deckkraft = n; break;
      case 'i-link': it.link = v.trim(); { const b = insp.querySelector('[data-a="link"]'); if (b) b.disabled = !it.link; } break;
      case 'i-preis': it.preis = isNaN(n) ? undefined : n; break;
      case 'i-notiz': it.notiz = v; break;
      default: return;
    }
    neuZeichnenBald(true);
    clearTimeout(insp.t); insp.t = setTimeout(aenderung, 500);
  });
  insp.addEventListener('change', e => {
    const it = finde(auswahl);
    if (raumAuswahl && !it) { aenderung(); return; }
    if (!it) return;
    if (e.target.id === 'i-ebene') it.ebene = e.target.value;
    if (e.target.id === 'i-gesperrt') it.gesperrt = e.target.checked;
    if (e.target.id === 'i-lock') it.seitenLock = e.target.checked;
    if (e.target.id === 'i-status') it.status = e.target.value;
    aenderung(); zeichneItems(); if (e.target.id === 'i-farbe') inspektor();
  });
  insp.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const it = finde(auswahl);
    if (b.dataset.farbe && it) { it.farbe = b.dataset.farbe; aenderung(); zeichneItems(); inspektor(); return; }
    if (b.dataset.boden !== undefined) return raumFarbe('boden', b.dataset.boden);
    if (b.dataset.wand !== undefined) return raumFarbe('wand', b.dataset.wand);
    switch (b.dataset.a) {
      case 'zu': auswahl = null; raumAuswahl = null; zeichneBau(); zeichneItems(); inspektor(); break;
      case 'dup': duplizieren(); break;
      case 'del': loeschen(); break;
      case 'r90': drehen(90); break;
      case 'r-90': drehen(-90); break;
      case 'spiegel': if (it) { it.spiegel = !it.spiegel; aenderung(); zeichneItems(); } break;
      case 'vorne': reihenfolge(true); break;
      case 'hinten': reihenfolge(false); break;
      case 'link': if (it && it.link) window.open(it.link, '_blank', 'noopener'); break;
      case 'vorlage': if (it) vorlageMerken(it); break;
      case 'farben-weg': { const rf = akt().raeume || {}; delete rf[raumAuswahl]; aenderung(); zeichneBau(); raumInspektor(); } break;
    }
  });

  // ---------- Bibliothek ----------
  function vorschau(v) {
    const [, z, w, h, f, , extra] = v;
    const it = Object.assign({ w, h, farbe: f, zeichnung: z, name: v[0] }, extra || {});
    if (z === 'bild') return '';
    const m = Math.max(w, h) * 1.08;
    const inner = z === 'text' ? `<text x="0" y="0" font-size="${h * .7}" text-anchor="middle" dominant-baseline="central" fill="${f}">Aa</text>` : (V.Z[z] || V.Z.rechteck)(w, h, f, it);
    return `<svg viewBox="${-m / 2} ${-m / 2} ${m} ${m}" class="vs">${inner}</svg>`;
  }
  function eintragHTML(v, key) {
    const [name, , w, h] = v;
    return `<button class="vorlage" data-key="${key}" title="${esc(name)}">${vorschau(v)}<span class="vn">${esc(name)}</span><span class="vm">${fmtCm(w)} × ${fmtCm(h)}</span></button>`;
  }
  let bibIndex = {};
  function bibliothek() {
    const q = ($('#suche').value || '').trim().toLowerCase();
    bibIndex = {};
    let s = '';
    const kats = Object.entries(V.K);
    const eigene = daten.eigene.map(e => [e.name, e.zeichnung, e.w, e.h, e.farbe, e.zone, e]);
    const alleKats = [['Meine Möbel', [...kats[0][1], ...eigene]], ...kats.slice(1)];
    alleKats.forEach(([kat, liste], ki) => {
      const treffer = liste.map((v, i) => [v, `${ki}-${i}`]).filter(([v]) => !q || v[0].toLowerCase().includes(q) || kat.toLowerCase().includes(q));
      if (!treffer.length) return;
      treffer.forEach(([v, k]) => bibIndex[k] = v);
      const offen = q || ki < 2;
      s += `<details ${offen ? 'open' : ''}><summary>${esc(kat)} <small>${treffer.length}</small></summary><div class="raster">${treffer.map(([v, k]) => eintragHTML(v, k)).join('')}</div></details>`;
    });
    $('#bib-liste').innerHTML = s || '<p class="hinweis">Nichts gefunden.</p>';
  }
  $('#bib-liste').addEventListener('click', e => {
    const b = e.target.closest('.vorlage'); if (!b) return;
    const v = bibIndex[b.dataset.key];
    if (v && v[6] && v[6].eigen) hinzufuegen(Object.assign({}, v[6], { eigen: undefined, vorlageId: undefined }));
    else if (v) hinzufuegen(v);
  });
  $('#bib-liste').addEventListener('contextmenu', e => {
    const b = e.target.closest('.vorlage'); if (!b) return;
    const v = bibIndex[b.dataset.key];
    if (v && v[6] && v[6].eigen) {
      e.preventDefault();
      if (confirm(`Eigene Vorlage „${v[0]}“ entfernen?`)) {
        daten.eigene = daten.eigene.filter(x => x.vorlageId !== v[6].vorlageId); daten.eigeneStand = Date.now();
        speichernLokal(); eigeneHochladen(); bibliothek();
      }
    }
  });
  $('#suche').addEventListener('input', bibliothek);
  function vorlageMerken(it) {
    const k = JSON.parse(JSON.stringify(it));
    ['id', 'x', 'y', 'rot', 'gesperrt'].forEach(f => delete k[f]);
    k.eigen = true; k.vorlageId = uid();
    daten.eigene.push(k); daten.eigeneStand = Date.now();
    speichernLokal(); eigeneHochladen(); bibliothek();
    meldung(`„${it.name}“ steht jetzt unter „Meine Möbel“. (Rechtsklick dort = entfernen)`);
  }
  $('#b-eigenes').addEventListener('click', () => {
    dialog(`<h3>Eigenes Möbel</h3>
      <label class="feld"><span>Name</span><input id="e-name" value="Mein Möbel"></label>
      <div class="reihe"><label class="feld"><span>Breite (cm)</span><input id="e-w" type="number" value="100"></label><label class="feld"><span>Tiefe (cm)</span><input id="e-h" type="number" value="50"></label></div>
      <label class="feld"><span>Form</span><select id="e-z"><option value="rechteck">Rechteck</option><option value="kreis">Rund / oval</option><option value="tisch">Tisch</option><option value="tischOval">Tisch oval</option><option value="schrank">Schrank</option><option value="kommode">Kommode</option><option value="regal">Regal</option><option value="sofa">Sofa</option><option value="bett">Bett</option><option value="holzplatte">Holzplatte</option><option value="piano">Tasteninstrument</option></select></label>
      <label class="feld"><span>Freifläche vorne (cm)</span><input id="e-zone" type="number" value="0"></label>
      <label class="feld"><span>Farbe</span><input id="e-f" type="color" value="#9db4c0"></label>
      <div class="knoepfe"><button id="e-ok" class="primaer">Einfügen</button><button data-zu>Abbrechen</button></div>`);
    $('#e-ok').onclick = () => {
      const w = parseFloat($('#e-w').value) || 100, h = parseFloat($('#e-h').value) || 50;
      hinzufuegen([$('#e-name').value || 'Möbel', $('#e-z').value, w, h, $('#e-f').value, parseFloat($('#e-zone').value) || 0]);
      dialogZu();
    };
  });
  $('#datei').addEventListener('change', e => { [...e.target.files].forEach((f, i) => { const [x, y] = mitte(); bildEinfuegen(f, x + i * 20, y + i * 20); }); e.target.value = ''; });
  $('#b-bild').addEventListener('click', () => $('#datei').click());

  // ---------- Werkzeuge & Ansicht ----------
  function werkzeugSetzen(w) {
    werkzeug = w; document.body.classList.toggle('werkzeug-mass', w === 'mass');
    $('#b-mass').classList.toggle('an', w === 'mass');
    if (w === 'mass') meldung('Maßband: Von Punkt zu Punkt ziehen. Rastet an Raumecken ein.');
  }
  $('#b-mass').addEventListener('click', () => werkzeugSetzen(werkzeug === 'mass' ? null : 'mass'));
  $('#b-fit').addEventListener('click', einpassen);
  $('#b-plus').addEventListener('click', () => { const r = svg.getBoundingClientRect(); zoomUm(1.25, r.width / 2, r.height / 2); });
  $('#b-minus').addEventListener('click', () => { const r = svg.getBoundingClientRect(); zoomUm(.8, r.width / 2, r.height / 2); });
  $('#b-undo').addEventListener('click', rueckgaengig);
  $('#b-redo').addEventListener('click', wiederholen);
  $('#b-bib').addEventListener('click', () => document.body.classList.toggle('bib-offen'));

  const MASS_TXT = ['Maße aus', 'Raummaße', 'Detailmaße'];
  function ansichtKnoepfe() {
    document.querySelectorAll('[data-ansicht]').forEach(b => {
      const k = b.dataset.ansicht;
      b.classList.toggle('an', !!ansicht[k]);
      if (k === 'masse') b.textContent = MASS_TXT[ansicht.masse];
    });
  }
  document.querySelectorAll('[data-ansicht]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.ansicht;
    ansicht[k] = k === 'masse' ? (ansicht.masse + 1) % 3 : !ansicht[k];
    ls.set(LS_ANSICHT, ansicht);
    ansichtKnoepfe(); zeichneRaster(); zeichneTueren(); zeichneRaumNamen(); zeichneItems();
  }));

  // ---------- Varianten (Setups) ----------
  function setupListe() {
    const sel = $('#setup');
    const liste = Object.values(daten.setups).sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
    sel.innerHTML = liste.map(s => `<option value="${s.id}"${s.id === daten.aktuell ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
  }
  function wechsle(id) {
    daten.aktuell = id; auswahl = null; raumAuswahl = null; speichernLokal();
    verlaufZuruecksetzen(); alles(); bilderLaden();
  }
  $('#setup').addEventListener('change', e => wechsle(e.target.value));
  $('#b-setup').addEventListener('click', () => {
    dialog(`<h3>Varianten</h3><p class="hinweis">Jede Variante ist eine eigene Einrichtung desselben Grundrisses – z. B. „Musikzimmer im Wohnzimmer“ gegen „Musik im Büro“.</p>
      <div class="knoepfe senkrecht">
        <button data-s="neu">＋ Neue leere Variante</button>
        <button data-s="kopie">⧉ Aktuelle Variante kopieren</button>
        <button data-s="name">✎ Umbenennen</button>
        <button data-s="weg" class="gefahr">🗑 Aktuelle Variante löschen</button>
      </div><div class="knoepfe"><button data-zu>Schließen</button></div>`);
    $('#dlg').querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
      const a = b.dataset.s;
      if (a === 'neu') { const n = prompt('Name der neuen Variante:', `Variante ${Object.keys(daten.setups).length + 1}`); if (!n) return; const s = neuesSetup(n); daten.setups[s.id] = s; wechsle(s.id); cloudSpaeter(s.id); }
      if (a === 'kopie') { const n = prompt('Name der Kopie:', akt().name + ' (Kopie)'); if (!n) return; const s = JSON.parse(JSON.stringify(akt())); s.id = uid(); s.name = n; s.stand = Date.now(); s.items.forEach(i => i.id = uid()); daten.setups[s.id] = s; wechsle(s.id); cloudSpaeter(s.id); }
      if (a === 'name') { const n = prompt('Neuer Name:', akt().name); if (!n) return; akt().name = n; akt().stand = Date.now(); speichernLokal(); cloudSpaeter(akt().id); setupListe(); }
      if (a === 'weg') {
        if (Object.keys(daten.setups).length < 2) { alert('Die letzte Variante kann nicht gelöscht werden.'); return; }
        if (!confirm(`Variante „${akt().name}“ wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
        const id = akt().id; delete daten.setups[id];
        if (cloudAktiv()) window.Cloud.setupLoeschen(id).catch(() => {});
        wechsle(Object.keys(daten.setups)[0]);
      }
      dialogZu();
    });
  });

  // ---------- Übersicht / Einkaufsliste ----------
  $('#b-liste').addEventListener('click', () => {
    const items = akt().items.filter(i => !['mass', 'text'].includes(i.zeichnung));
    let summe = 0;
    const zeilen = items.map(i => {
      const r = raumBei(i.x, i.y); if (i.preis) summe += i.preis;
      return `<tr><td>${esc(i.name)}${i.notiz ? `<div class="klein">${esc(i.notiz)}</div>` : ''}</td><td>${fmtCm(i.w)} × ${fmtCm(i.h)}</td><td>${r ? esc(r.name) : '–'}</td><td>${esc(i.status || '')}</td><td class="r">${i.preis ? i.preis.toLocaleString('de-DE') + ' €' : ''}</td><td>${i.link ? `<a href="${esc(i.link)}" target="_blank" rel="noopener">Link</a>` : ''}</td></tr>`;
    }).join('');
    dialog(`<h3>Übersicht „${esc(akt().name)}“</h3><div class="tabelle"><table><thead><tr><th>Möbel</th><th>Maße (cm)</th><th>Raum</th><th>Status</th><th class="r">Preis</th><th></th></tr></thead><tbody>${zeilen || '<tr><td colspan="6">Noch keine Möbel.</td></tr>'}</tbody><tfoot><tr><td colspan="4">Summe</td><td class="r">${summe.toLocaleString('de-DE')} €</td><td></td></tr></tfoot></table></div><div class="knoepfe"><button data-zu>Schließen</button></div>`, true);
  });

  // ---------- Export als Bild ----------
  $('#b-export').addEventListener('click', async () => {
    const vorher = auswahl; auswahl = null; zeichneItems();
    const pts = [...G.outline, ...G.extra.flatMap(e => e.poly)];
    akt().items.forEach(i => { if (i.zeichnung !== 'mass') itemPolys(i).forEach(p => pts.push(...p)); });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs) - 40, y0 = Math.min(...ys) - 70, w = Math.max(...xs) - x0 + 40, h = Math.max(...ys) - y0 + 40;
    const k = svg.cloneNode(true);
    k.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`);
    const sk = 2400 / w; k.setAttribute('width', 2400); k.setAttribute('height', Math.round(h * sk));
    const wk = k.querySelector('#welt'); wk.setAttribute('transform', '');
    // Textgrößen für den Export neu: Zoom so setzen, dass Beschriftungen passen
    k.querySelectorAll('image').forEach(img => {
      const href = img.getAttribute('href');
      for (const [id, u] of bildURL) if (u === href) img.setAttribute('href', bildDaten.get(id));
    });
    const titel = document.createElementNS(NS, 'text');
    titel.setAttribute('x', x0 + 20); titel.setAttribute('y', y0 + 40); titel.setAttribute('font-size', 28); titel.setAttribute('font-weight', '700'); titel.setAttribute('font-family', 'system-ui, sans-serif');
    titel.textContent = akt().name; k.insertBefore(titel, k.firstChild);
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', x0); bg.setAttribute('y', y0); bg.setAttribute('width', w); bg.setAttribute('height', h); bg.setAttribute('fill', '#fff');
    k.insertBefore(bg, k.firstChild);
    const style = document.createElementNS(NS, 'style'); style.textContent = document.getElementById('svg-stil').textContent; k.insertBefore(style, k.firstChild);
    const xml = new XMLSerializer().serializeToString(k);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 2400; c.height = Math.round(h * sk);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      const a = document.createElement('a'); a.download = `Wohnplan – ${akt().name}.png`; a.href = c.toDataURL('image/png'); a.click();
    };
    img.onerror = () => meldung('Export fehlgeschlagen.', true);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    auswahl = vorher; zeichneItems();
  });

  // ---------- Dialog & Meldungen ----------
  function dialog(html, breit) {
    const d = $('#dlg'); d.innerHTML = `<div class="dlg-box${breit ? ' breit' : ''}">${html}</div>`; d.hidden = false;
    d.querySelectorAll('[data-zu]').forEach(b => b.onclick = dialogZu);
    const f = d.querySelector('input'); if (f) setTimeout(() => f.focus(), 30);
  }
  function dialogZu() { $('#dlg').hidden = true; $('#dlg').innerHTML = ''; }
  $('#dlg').addEventListener('pointerdown', e => { if (e.target.id === 'dlg') dialogZu(); });
  function meldung(t, fehler) {
    const m = $('#meldung'); m.textContent = t; m.className = fehler ? 'fehler' : ''; m.hidden = false;
    clearTimeout(meldung.t); meldung.t = setTimeout(() => m.hidden = true, 4200);
  }
  $('#b-hilfe').addEventListener('click', () => dialog($('#hilfe-vorlage').innerHTML, true));

  // ---------- Cloud-Sync ----------
  const cloudAktiv = () => !!(window.Cloud && window.Cloud.erlaubt);
  const wartend = new Set(); let cloudT = 0;
  function cloudSpaeter(id) {
    if (!cloudAktiv()) { cloudStatus(); return; }
    wartend.add(id); cloudStatus('speichert');
    clearTimeout(cloudT); cloudT = setTimeout(cloudJetzt, 1500);
  }
  async function cloudJetzt() {
    if (!cloudAktiv()) return;
    const ids = [...wartend]; wartend.clear();
    try {
      for (const id of ids) {
        const s = daten.setups[id]; if (!s) continue;
        await window.Cloud.setupSpeichern(s);
        s.items.filter(i => i.bild).forEach(i => bildHochladen(i.bild));
      }
      cloudStatus('ok');
    } catch (e) { console.warn(e); ids.forEach(i => wartend.add(i)); cloudStatus('fehler'); }
  }
  async function eigeneHochladen() {
    if (!cloudAktiv()) return;
    try { await window.Cloud.eigeneSpeichern(daten.eigene, daten.eigeneStand); } catch (e) { console.warn(e); }
  }
  let syncLaeuft = false;
  async function abgleich() {
    if (!cloudAktiv() || syncLaeuft) return;
    syncLaeuft = true; cloudStatus('speichert');
    try {
      const idx = await window.Cloud.index();
      let aktGeaendert = false;
      for (const [id, e] of Object.entries(idx)) {
        const lokal = daten.setups[id];
        if (e.geloescht) { if (lokal && lokal.stand <= e.stand) { delete daten.setups[id]; if (id === daten.aktuell) aktGeaendert = true; } continue; }
        if (!lokal || e.stand > lokal.stand) {
          if (ziehen && id === daten.aktuell) continue;
          const s = await window.Cloud.setup(id);
          if (s) { daten.setups[id] = s; if (id === daten.aktuell) aktGeaendert = true; }
        }
      }
      for (const [id, s] of Object.entries(daten.setups)) {
        const e = idx[id];
        if (!e || (!e.geloescht && s.stand > e.stand)) await window.Cloud.setupSpeichern(s);
      }
      // Startvariante eines frischen Geräts nicht doppelt hochladen
      // eigene Vorlagen
      const st = await window.Cloud.eigeneStand();
      if (st > (daten.eigeneStand || 0)) { const l = await window.Cloud.eigene(); if (l) { daten.eigene = l; daten.eigeneStand = st; bibliothek(); } }
      else if ((daten.eigeneStand || 0) > st) await eigeneHochladen();
      if (!daten.setups[daten.aktuell]) daten.aktuell = Object.keys(daten.setups)[0];
      if (!daten.aktuell) { const s = startSetup(); daten.setups[s.id] = s; daten.aktuell = s.id; }
      speichernLokal();
      if (aktGeaendert) { auswahl = finde(auswahl) ? auswahl : null; verlaufZuruecksetzen(); alles(); }
      else setupListe();
      bilderLaden();
      Object.values(daten.setups).forEach(s => s.items.filter(i => i.bild).forEach(i => bildHochladen(i.bild)));
      cloudStatus('ok');
    } catch (e) {
      console.warn(e);
      cloudStatus(/permission/i.test(String(e && (e.code || e.message))) ? 'regeln' : 'fehler');
    }
    syncLaeuft = false;
  }
  function cloudStatus(z) {
    const b = $('#b-cloud');
    const C = window.Cloud;
    if (!C) { b.textContent = '☁︎ …'; b.title = 'Verbindung wird geladen'; return; }
    if (!C.user) { b.textContent = '☁︎ Anmelden'; b.className = 'cloud aus'; b.title = 'Mit Google anmelden, um auf allen Geräten weiterzuarbeiten'; return; }
    if (!C.erlaubt) { b.textContent = '☁︎ falsches Konto'; b.className = 'cloud fehler'; b.title = 'Dieses Google-Konto hat keinen Zugriff'; return; }
    const t = { speichert: ['☁︎ speichert…', 'cloud'], ok: ['☁︎ synchron', 'cloud ok'], fehler: ['☁︎ offline', 'cloud fehler'], regeln: ['☁︎ Regeln fehlen', 'cloud fehler'] }[z || 'ok'];
    b.textContent = t[0]; b.className = t[1];
    b.title = z === 'regeln' ? 'Die Datenbank-Regeln für wohnplaner/ sind noch nicht eingetragen (siehe firebase-regeln.md)' : 'Angemeldet als ' + (C.user.email || '');
  }
  $('#b-cloud').addEventListener('click', async () => {
    const C = window.Cloud; if (!C) return;
    if (!C.user) { try { await C.anmelden(); } catch (e) { meldung('Anmeldung abgebrochen.', true); } return; }
    dialog(`<h3>Cloud-Speicher</h3><p>Angemeldet als <b>${esc(C.user.email || '')}</b>.</p><p class="hinweis">${C.erlaubt ? 'Alle Varianten, eigenen Vorlagen und Bilder werden automatisch gespeichert und auf deinen anderen Geräten geladen.' : 'Dieses Konto hat keinen Zugriff. Melde dich mit deinem eigenen Google-Konto an.'}</p>
      <p class="hinweis">Kennung (UID) dieses Kontos: <code id="c-uid">${esc(C.user.uid)}</code></p>
      <div class="knoepfe"><button id="c-kopie">Kennung kopieren</button><button id="c-sync">Jetzt abgleichen</button><button id="c-ab" class="gefahr">Abmelden</button><button data-zu>Schließen</button></div>`);
    $('#c-sync').onclick = () => { dialogZu(); abgleich(); };
    $('#c-kopie').onclick = () => { navigator.clipboard.writeText(C.user.uid).then(() => meldung('Kennung kopiert.'), () => meldung('Kopieren nicht möglich – bitte markieren.', true)); };
    $('#c-ab').onclick = () => { C.abmelden(); dialogZu(); };
  });
  function cloudStart() {
    window.Cloud.init((u, ok) => { cloudStatus(); if (ok) abgleich(); });
    cloudStatus();
  }
  if (window.Cloud) cloudStart(); else window.addEventListener('cloud-bereit', cloudStart, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') abgleich(); });

  // ---------- Start ----------
  window.addEventListener('resize', () => neuZeichnenBald());
  bibliothek();
  knoepfeVerlauf();
  requestAnimationFrame(() => { einpassen(); bilderLaden(); });
  if (!ls.get('wohnplaner-hilfe-gesehen')) { ls.set('wohnplaner-hilfe-gesehen', 1); setTimeout(() => dialog($('#hilfe-vorlage').innerHTML, true), 400); }
})();
