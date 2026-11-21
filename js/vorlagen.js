/* Möbel-Vorlagen und ihre Draufsicht-Zeichnungen.
   Einheit: Zentimeter. Lokales Koordinatensystem: Mitte = (0,0),
   Breite w entlang x, Tiefe h entlang y. Vorderseite (Sitz-/Bedienseite) = unten (+y).
   zone = empfohlene freie Bewegungsfläche vor der Vorderseite in cm
   (Richtwerte: Durchgang mind. 60–70 cm, vor Schränken 70–90 cm, neben Betten 60 cm). */

(function () {
  // ---------- Farb-Helfer ----------
  function hex(c) {
    c = (c || '#888888').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16));
  }
  function mix(c, ziel, t) {
    const a = hex(c), b = hex(ziel);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const hell = (c, t) => mix(c, '#ffffff', t);
  const dunkel = (c, t) => mix(c, '#000000', t);
  const S = 'stroke-width="1.2" vector-effect="non-scaling-stroke"';

  function rr(x, y, w, h, r, fill, extra = '') {
    return `<rect x="${x}" y="${y}" width="${Math.max(w, 0.1)}" height="${Math.max(h, 0.1)}" rx="${r}" fill="${fill}" stroke="${dunkel(fill, .35)}" ${S} ${extra}/>`;
  }
  function kreis(cx, cy, r, fill, extra = '') {
    return `<circle cx="${cx}" cy="${cy}" r="${Math.max(r, .1)}" fill="${fill}" stroke="${dunkel(fill, .35)}" ${S} ${extra}/>`;
  }
  function linie(x1, y1, x2, y2, farbe, breite = 1) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="${breite}" vector-effect="non-scaling-stroke"/>`;
  }

  // ---------- Zeichnungen ----------
  const Z = {};

  Z.rechteck = (w, h, f) => rr(-w / 2, -h / 2, w, h, 2, f);
  Z.kreis = (w, h, f) => `<ellipse cx="0" cy="0" rx="${w / 2}" ry="${h / 2}" fill="${f}" stroke="${dunkel(f, .35)}" ${S}/>`;

  Z.sofa = (w, h, f) => {
    const arm = Math.min(22, w * .12), lehne = Math.min(24, h * .26);
    const sitzB = w - 2 * arm, n = Math.max(1, Math.round(sitzB / 65));
    let s = rr(-w / 2, -h / 2, w, h, 8, dunkel(f, .08));
    s += rr(-w / 2, -h / 2, w, lehne, 8, f);
    s += rr(-w / 2, -h / 2, arm, h, 8, f) + rr(w / 2 - arm, -h / 2, arm, h, 8, f);
    for (let i = 0; i < n; i++) {
      const bx = -w / 2 + arm + i * sitzB / n;
      s += rr(bx + 2, -h / 2 + lehne + 2, sitzB / n - 4, h - lehne - 6, 6, hell(f, .12));
    }
    return s;
  };

  Z.sessel = (w, h, f) => Z.sofa(w, h, f);

  // Schlafsofa mit Fischgrät-Steppung im Rücken (Samt), schmale Armlehnen, 2 Sitzkissen
  Z.sofaChevron = (w, h, f) => {
    const arm = Math.min(16, w * .08), lehne = Math.min(22, h * .28);
    let s = rr(-w / 2, -h / 2, w, h, 6, dunkel(f, .1));
    s += `<rect x="${-w / 2 + arm}" y="${-h / 2}" width="${w - 2 * arm}" height="${lehne}" rx="4" fill="${f}" stroke="${dunkel(f, .35)}" ${S}/>`;
    const y0 = -h / 2 + 2, y1 = -h / 2 + lehne - 2, n = 9, half = (w - 2 * arm) / 2;
    for (let i = 1; i < n; i++) {
      const d = i * half / n;
      s += linie(-d, y0, -d - (y1 - y0) * .9, y1, dunkel(f, .25), .7);
      s += linie(d, y0, d + (y1 - y0) * .9, y1, dunkel(f, .25), .7);
    }
    s += linie(0, -h / 2, 0, -h / 2 + lehne, dunkel(f, .35), 1);
    s += rr(-w / 2, -h / 2 + 6, arm, h - 10, 6, f) + rr(w / 2 - arm, -h / 2 + 6, arm, h - 10, 6, f);
    const sb = (w - 2 * arm) / 2;
    for (let i = 0; i < 2; i++) s += rr(-w / 2 + arm + i * sb + 1.5, -h / 2 + lehne + 1, sb - 3, h - lehne - 4, 5, hell(f, .1));
    return s;
  };

  // L-Sofa: Rückenteil über die volle Breite (Tiefe t), Liegeteil links (Breite c).
  Z.sofaL = (w, h, f, it) => {
    const t = it.tiefe || 90, c = it.chaise || 95, lehne = 24, arm = 22;
    let s = `<path d="M${-w / 2} ${-h / 2} H${w / 2} V${-h / 2 + t} H${-w / 2 + c} V${h / 2} H${-w / 2} Z" fill="${dunkel(f, .08)}" stroke="${dunkel(f, .35)}" ${S} stroke-linejoin="round"/>`;
    s += rr(-w / 2, -h / 2, w, lehne, 8, f);
    s += rr(-w / 2, -h / 2, lehne, h, 8, f);
    s += rr(w / 2 - arm, -h / 2, arm, t, 8, f);
    const sitzX = -w / 2 + c, sitzB = w / 2 - arm - sitzX, n = Math.max(1, Math.round(sitzB / 65));
    for (let i = 0; i < n; i++)
      s += rr(sitzX + i * sitzB / n + 2, -h / 2 + lehne + 2, sitzB / n - 4, t - lehne - 6, 6, hell(f, .12));
    s += rr(-w / 2 + lehne + 2, -h / 2 + lehne + 2, c - lehne - 4, h - lehne - 6, 6, hell(f, .12));
    return s;
  };

  // Maleron: Blasen-/Wulst-Optik, Rücken über volle Breite, Liegeteil links.
  Z.maleron = (w, h, f, it) => {
    const t = it.tiefe || 93, c = it.chaise || 95, lehne = 28, arm = 26;
    const glanz = hell(f, .22), tief = dunkel(f, .18);
    let s = `<path d="M${-w / 2 + 20} ${-h / 2} H${w / 2 - 30} Q${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + 30} V${-h / 2 + t - 25} Q${w / 2} ${-h / 2 + t} ${w / 2 - 25} ${-h / 2 + t} H${-w / 2 + c} V${h / 2 - 22} Q${-w / 2 + c} ${h / 2} ${-w / 2 + c - 22} ${h / 2} H${-w / 2 + 22} Q${-w / 2} ${h / 2} ${-w / 2} ${h / 2 - 22} V${-h / 2 + 20} Q${-w / 2} ${-h / 2} ${-w / 2 + 20} ${-h / 2} Z" fill="${tief}" stroke="${dunkel(f, .45)}" ${S}/>`;
    // Rückenwülste entlang der Rückseite
    const nR = Math.max(3, Math.round(w / 38));
    for (let i = 0; i < nR; i++) {
      const x = -w / 2 + (i + .5) * w / nR;
      s += `<ellipse cx="${x}" cy="${-h / 2 + lehne / 2 + 1}" rx="${w / nR / 2 + 1}" ry="${lehne / 2}" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/>`;
    }
    // Rückenwülste am Liegeteil (linke Seite)
    const nL = Math.max(2, Math.round((h - lehne) / 40));
    for (let i = 0; i < nL; i++) {
      const y = -h / 2 + lehne + (i + .5) * (h - lehne - 10) / nL;
      s += `<ellipse cx="${-w / 2 + lehne / 2 + 1}" cy="${y}" rx="${lehne / 2}" ry="${(h - lehne - 10) / nL / 2 + 1}" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/>`;
    }
    // Armlehne rechts
    s += `<rect x="${w / 2 - arm}" y="${-h / 2 + 4}" width="${arm - 2}" height="${t - 8}" rx="${arm / 2}" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/>`;
    // Sitzpolster als Kissenraster
    const sx0 = -w / 2 + lehne, sx1 = w / 2 - arm, sy0 = -h / 2 + lehne, sy1 = -h / 2 + t - 3;
    const nS = Math.max(2, Math.round((sx1 - sx0) / 32)), rows = 2;
    for (let i = 0; i < nS; i++) for (let j = 0; j < rows; j++) {
      const bw = (sx1 - sx0) / nS, bh = (sy1 - sy0) / rows;
      s += `<rect x="${sx0 + i * bw + 1.5}" y="${sy0 + j * bh + 1.5}" width="${bw - 3}" height="${bh - 3}" rx="${Math.min(bw, bh) / 2.4}" fill="${hell(f, .08)}" stroke="${dunkel(f, .3)}" ${S}/>`;
    }
    // Liegeteil-Kissen
    const lx0 = -w / 2 + lehne, lx1 = -w / 2 + c - 3, ly0 = sy1, ly1 = h / 2 - 3;
    const nc = 2, nr = Math.max(1, Math.round((ly1 - ly0) / 32));
    for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) {
      const bw = (lx1 - lx0) / nc, bh = (ly1 - ly0) / nr;
      s += `<rect x="${lx0 + i * bw + 1.5}" y="${ly0 + j * bh + 1.5}" width="${bw - 3}" height="${bh - 3}" rx="${Math.min(bw, bh) / 2.4}" fill="${hell(f, .08)}" stroke="${dunkel(f, .3)}" ${S}/>`;
    }
    // zwei Zierkissen
    s += `<rect x="${-w / 2 + c + 6}" y="${-h / 2 + lehne - 6}" width="34" height="14" rx="5" fill="${glanz}" stroke="${dunkel(f, .3)}" ${S} transform="rotate(-8 ${-w / 2 + c + 23} ${-h / 2 + lehne + 1})"/>`;
    s += `<rect x="${w / 2 - arm - 42}" y="${-h / 2 + lehne - 6}" width="34" height="14" rx="5" fill="${glanz}" stroke="${dunkel(f, .3)}" ${S} transform="rotate(8 ${w / 2 - arm - 25} ${-h / 2 + lehne + 1})"/>`;
    return s;
  };

  Z.bett = (w, h, f) => {
    const kopf = 8, n = w >= 130 ? 2 : 1;
    let s = rr(-w / 2, -h / 2, w, h, 3, dunkel(f, .15));
    s += rr(-w / 2, -h / 2, w, kopf, 2, dunkel(f, .3));
    s += rr(-w / 2 + 3, -h / 2 + kopf + 1, w - 6, h - kopf - 4, 4, '#f7f6f2');
    for (let i = 0; i < n; i++) {
      const kw = (w - 6) / n - 8;
      s += rr(-w / 2 + 3 + 4 + i * (w - 6) / n, -h / 2 + kopf + 5, kw, 32, 8, '#ffffff');
    }
    // Bettdecke
    s += rr(-w / 2 + 3, -h / 2 + kopf + 45, w - 6, h - kopf - 48, 5, hell(f, .55));
    s += linie(-w / 2 + 3, -h / 2 + kopf + 60, w / 2 - 3, -h / 2 + kopf + 60, dunkel(hell(f, .55), .15));
    return s;
  };

  Z.hochbett = (w, h, f) => {
    let s = Z.bett(w, h, f);
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none" stroke="${dunkel(f, .5)}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-dasharray="6 4"/>`;
    s += rr(w / 2 - 12, h / 2 - 50, 12, 45, 1, dunkel(f, .2));
    for (let y = h / 2 - 45; y < h / 2 - 5; y += 9) s += linie(w / 2 - 12, y, w / 2, y, dunkel(f, .5));
    return s;
  };

  Z.schrank = (w, h, f) => {
    const n = Math.max(1, Math.round(w / 50));
    let s = rr(-w / 2, -h / 2, w, h, 1, f);
    for (let i = 1; i < n; i++) s += linie(-w / 2 + i * w / n, -h / 2, -w / 2 + i * w / n, h / 2, dunkel(f, .3));
    s += linie(-w / 2 + 3, -h / 2 + 4, w / 2 - 3, -h / 2 + 4, dunkel(f, .2));
    s += `<line x1="${-w / 2}" y1="${-h / 2}" x2="${w / 2}" y2="${h / 2}" stroke="${dunkel(f, .15)}" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
    s += `<line x1="${w / 2}" y1="${-h / 2}" x2="${-w / 2}" y2="${h / 2}" stroke="${dunkel(f, .15)}" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
    return s;
  };

  Z.kommode = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 2, f);
    s += rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 2, hell(f, .1));
    for (let x = -w / 2 + 20; x < w / 2 - 10; x += 40) s += rr(x, h / 2 - 7, 14, 3, 1, dunkel(f, .35));
    return s;
  };

  Z.regal = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 1, f);
    const n = Math.max(1, Math.round(w / 40));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + i * w / n + 3;
      // Bücherrücken
      let bx = x;
      while (bx < x + w / n - 8) {
        const b = 3 + Math.abs(Math.round(bx * 7) % 4);
        const farben = ['#b55d4c', '#4c78a8', '#e0b04c', '#6a9f58', '#8a6db1', '#d8d0c0'];
        s += `<rect x="${bx}" y="${-h / 2 + 3}" width="${b}" height="${h - 9 - ((bx * 3) % 6)}" fill="${farben[Math.abs(Math.round(bx)) % farben.length]}" opacity=".85"/>`;
        bx += b + .6;
      }
      if (i) s += linie(-w / 2 + i * w / n, -h / 2, -w / 2 + i * w / n, h / 2, dunkel(f, .4), 1.5);
    }
    return s;
  };

  Z.tisch = (w, h, f) => rr(-w / 2, -h / 2, w, h, 4, f) + rr(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 3, hell(f, .12), 'stroke-opacity=".3"');
  // Ovaler Tisch (Stadionform) mit Holzmaserung längs; zwei Säulenfüße gestrichelt darunter.
  // Passt sich jeder Breite/Tiefe an (ausziehbar: einfach Breite ändern).
  Z.tischOval = (w, h, f) => {
    const r = Math.min(w, h) / 2, id = 'ov' + Math.round(w * 10) + 'x' + Math.round(h * 10) + f.slice(1);
    const pfad = w >= h
      ? `M${-w / 2 + r} ${-h / 2} H${w / 2 - r} A${r} ${r} 0 0 1 ${w / 2 - r} ${h / 2} H${-w / 2 + r} A${r} ${r} 0 0 1 ${-w / 2 + r} ${-h / 2} Z`
      : `M${-w / 2} ${-h / 2 + r} A${r} ${r} 0 0 1 ${w / 2} ${-h / 2 + r} V${h / 2 - r} A${r} ${r} 0 0 1 ${-w / 2} ${h / 2 - r} Z`;
    let s = `<defs><clipPath id="${id}"><path d="${pfad}"/></clipPath></defs>`;
    s += `<path d="${pfad}" fill="${f}"/>`;
    s += `<g clip-path="url(#${id})">`;
    const lang = w >= h, n = Math.max(5, Math.round((lang ? h : w) / 9));
    for (let i = 0; i < n; i++) {
      const t = ((i * 37) % 7) / 7, c = t < .4 ? dunkel(f, .06 + t * .15) : hell(f, (t - .4) * .18);
      if (lang) s += `<rect x="${-w / 2}" y="${-h / 2 + i * h / n}" width="${w}" height="${h / n + .2}" fill="${c}"/>`;
      else s += `<rect x="${-w / 2 + i * w / n}" y="${-h / 2}" width="${w / n + .2}" height="${h}" fill="${c}"/>`;
    }
    for (let i = 0; i < n * 2; i++) {
      const p = -0.5 + (i + .5) / (n * 2), a = ((i * 53) % 11) / 11;
      if (lang) s += `<path d="M${-w / 2} ${p * h} C${-w / 6} ${p * h + 1.2 - a * 2} ${w / 6} ${p * h - 1 + a * 2} ${w / 2} ${p * h + .5}" fill="none" stroke="${dunkel(f, .2)}" stroke-width=".35"/>`;
      else s += `<path d="M${p * w} ${-h / 2} C${p * w + 1.2 - a * 2} ${-h / 6} ${p * w - 1 + a * 2} ${h / 6} ${p * w + .5} ${h / 2}" fill="none" stroke="${dunkel(f, .2)}" stroke-width=".35"/>`;
    }
    s += `</g>`;
    // Säulenfüße (Ø ca. 45 % der Tiefe), Abstand ca. 50 % der Länge
    const d = Math.min(w, h) * .45, ab = Math.max(w, h) * .25;
    [-1, 1].forEach(k => {
      const cx = lang ? k * ab : 0, cy = lang ? 0 : k * ab;
      s += `<circle cx="${cx}" cy="${cy}" r="${d / 2}" fill="none" stroke="${dunkel(f, .45)}" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`;
    });
    s += `<path d="${pfad}" fill="none" stroke="${dunkel(f, .45)}" ${S}/>`;
    return s;
  };

  // Kleiner Tisch aus gebürstetem Metall: feine Schleifspuren, dünne Kante
  Z.metallTisch = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 1, f);
    for (let i = 0, y = -h / 2 + 1.2; y < h / 2 - .8; i++, y += .9) {
      const t = ((i * 7919) % 13) / 13;
      s += `<line x1="${-w / 2 + .8}" y1="${y}" x2="${w / 2 - .8}" y2="${y + (t - .5) * .4}" stroke="${t > .5 ? hell(f, .18) : dunkel(f, .25)}" stroke-width=".25"/>`;
    }
    s += `<rect x="${-w / 2 + 1.5}" y="${-h / 2 + 1.5}" width="${w - 3}" height="${h - 3}" fill="none" stroke="${hell(f, .22)}" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
    return s;
  };

  Z.tischRund = (w, h, f) => Z.kreis(w, h, f) + `<ellipse cx="0" cy="0" rx="${w / 2 - 5}" ry="${h / 2 - 5}" fill="${hell(f, .12)}" stroke="none"/>`;

  function stuhl(x, y, rot, f) {
    return `<g transform="translate(${x} ${y}) rotate(${rot})">${rr(-21, -20, 42, 40, 6, f)}${rr(-21, 14, 42, 7, 3, dunkel(f, .2))}</g>`;
  }
  Z.stuhl = (w, h, f) => `<g transform="scale(${w / 45} ${h / 48})">${rr(-22, -22, 44, 44, 6, f)}${rr(-22, -24, 44, 8, 3, dunkel(f, .25))}</g>`;

  // Esstisch mit Stühlen: Tischplatte innen, Stühle rundum. it.platz = Plattenmaß.
  Z.esstisch = (w, h, f, it) => {
    const tw = it.tw || w - 0, th = it.th || h - 100;
    let s = '';
    const holz = it.stuhlfarbe || dunkel(f, .1);
    const nLang = Math.max(1, Math.floor(tw / 60));
    for (let i = 0; i < nLang; i++) {
      const x = -tw / 2 + (i + .5) * tw / nLang;
      s += stuhl(x, -th / 2 - 22, 180, holz) + stuhl(x, th / 2 + 22, 0, holz);
    }
    if (it.kopf) s += stuhl(-tw / 2 - 22, 0, 90, holz) + stuhl(tw / 2 + 22, 0, -90, holz);
    s += Z.tisch(tw, th, f);
    return s;
  };
  Z.esstischRund = (w, h, f, it) => {
    const d = it.tw || w - 100, n = it.stuehle || 4;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      s += stuhl(Math.sin(a) * (d / 2 + 20), -Math.cos(a) * (d / 2 + 20), 180 + i * 360 / n, dunkel(f, .1));
    }
    return s + Z.tischRund(d, d, f);
  };

  // Massivholzplatte mit Stabmuster (Keilzinken-Lamellen)
  Z.holzplatte = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 1.5, f);
    const reihen = Math.max(3, Math.round(h / 4.2)), rh = h / reihen;
    for (let j = 0; j < reihen; j++) {
      let x = -w / 2, k = j * 37;
      while (x < w / 2) {
        const len = 35 + ((k * 53) % 70);
        const t = ((k * 29) % 7) / 7;
        const c = t < .33 ? dunkel(f, .12 + t * .2) : hell(f, (t - .33) * .25);
        s += `<rect x="${x}" y="${-h / 2 + j * rh}" width="${Math.min(len, w / 2 - x)}" height="${rh}" fill="${c}"/>`;
        x += len; k++;
      }
    }
    return s + `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" fill="none" stroke="${dunkel(f, .45)}" ${S}/>`;
  };

  // Sideboard weiß mit Holzplatte: von oben die Eichenplatte, vorne ein Streifen weiße Front
  Z.sideboardHolz = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 1, '#f4f4f2');
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h - 2}" fill="${f}"/>`;
    for (let i = 0; i < 9; i++) {
      const y = -h / 2 + 2 + i * (h - 5) / 9, b = 6 + (i * 37) % 18;
      s += `<path d="M${-w / 2} ${y} C${-w / 4} ${y + b * .08} ${w / 6} ${y - b * .1} ${w / 2} ${y + .6}" fill="none" stroke="${dunkel(f, .14 + (i % 3) * .04)}" stroke-width=".7"/>`;
    }
    s += `<ellipse cx="${-w * .18}" cy="${-h * .1}" rx="2.2" ry="1" fill="${dunkel(f, .3)}"/><ellipse cx="${w * .27}" cy="${h * .08}" rx="1.6" ry=".8" fill="${dunkel(f, .3)}"/>`;
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1" fill="none" stroke="${dunkel(f, .4)}" ${S}/>`;
    return s;
  };

  // Freischwinger-artiger Polsterstuhl (Matilda): Chromkufen seitlich, Sitzkissen, Rückenkissen hinten
  Z.matilda = (w, h, f) => {
    const chrom = '#b9bec4';
    let s = '';
    [-1, 1].forEach(sx => s += `<rect x="${sx * w / 2 - (sx > 0 ? 3 : 0)}" y="${-h / 2 + 4}" width="3" height="${h - 6}" rx="1.5" fill="${chrom}" stroke="#7d848c" ${S}/>`);
    s += rr(-w / 2 + 1, -h / 2 + 2, w - 2, 14, 6, dunkel(f, .06));          // Rückenkissen
    s += rr(-w / 2 + 2, -h / 2 + 14, w - 4, h * .62, 9, f);               // Sitzkissen
    s += `<circle cx="${-w * .12}" cy="${-h / 2 + 9}" r="1.3" fill="${dunkel(f, .25)}"/><circle cx="${w * .12}" cy="${-h / 2 + 9}" r="1.3" fill="${dunkel(f, .25)}"/>`;
    s += `<circle cx="0" cy="${-h / 2 + 14 + h * .31}" r="1.3" fill="${dunkel(f, .2)}"/>`;
    return s;
  };

  // Drahtstuhl (Roma): Schale aus Drahtgitter, hinten breiter und gerundet, Kufen seitlich
  Z.drahtstuhl = (w, h, f) => {
    const id = 'dr' + Math.round(w) + 'x' + Math.round(h) + f.slice(1);
    const hw = w / 2, top = -h / 2 + 1, unten = h / 2 - 2;
    const schale = `M${-hw * .92} ${top + h * .18} Q${-hw * .95} ${top} 0 ${top} Q${hw * .95} ${top} ${hw * .92} ${top + h * .18} L${hw * .8} ${unten - h * .1} Q${hw * .78} ${unten} 0 ${unten} Q${-hw * .78} ${unten} ${-hw * .8} ${unten - h * .1} Z`;
    let s = '';
    // Kufen (Sled-Gestell)
    [-1, 1].forEach(k => s += `<line x1="${k * hw * .82}" y1="${-h / 2 + 3}" x2="${k * hw * .9}" y2="${h / 2 - 1}" stroke="${dunkel(f, .25)}" stroke-width="1.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
    s += `<defs><clipPath id="${id}"><path d="${schale}"/></clipPath></defs>`;
    s += `<path d="${schale}" fill="${hell(f, .55)}" fill-opacity=".35"/>`;
    s += `<g clip-path="url(#${id})" stroke="${f}" stroke-width=".9" vector-effect="non-scaling-stroke">`;
    for (let x = -hw + 4; x < hw; x += 4.2) s += `<line x1="${x}" y1="${top}" x2="${x * .9}" y2="${unten}"/>`;
    for (let y = top + 4; y < unten; y += 4.2) s += `<line x1="${-hw}" y1="${y}" x2="${hw}" y2="${y}"/>`;
    s += `</g>`;
    s += `<path d="${schale}" fill="none" stroke="${dunkel(f, .3)}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    return s;
  };

  // Regal Industrial (FJÄLLBO): Holzplatte oben, schwarzer Metallrahmen mit Eckpfosten und Mittelpfosten
  Z.regalIndustrie = (w, h, f, it) => {
    const metall = it.rahmen || '#1f1f21', pf = Math.min(3, w * .04);
    let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1" fill="${metall}"/>`;
    s += `<rect x="${-w / 2 + .6}" y="${-h / 2 + .6}" width="${w - 1.2}" height="${h - 1.2}" fill="${f}"/>`;
    const n = Math.max(4, Math.round(h / 5));
    for (let i = 0; i < n; i++) {
      const t = ((i * 37) % 7) / 7, y = -h / 2 + .6 + i * (h - 1.2) / n;
      s += `<rect x="${-w / 2 + .6}" y="${y}" width="${w - 1.2}" height="${(h - 1.2) / n + .1}" fill="${t < .4 ? dunkel(f, .05 + t * .12) : hell(f, (t - .4) * .2)}"/>`;
      s += `<line x1="${-w / 2 + 1}" y1="${y + 1.3}" x2="${w / 2 - 1}" y2="${y + 1.1 + t}" stroke="${dunkel(f, .18)}" stroke-width=".25"/>`;
    }
    [[-1, -1], [1, -1], [-1, 1], [1, 1], ...(it.mitte === false ? [] : [[0, -1], [0, 1]])].forEach(([kx, ky]) =>
      s += `<rect x="${kx * (w / 2 - pf / 2) - pf / 2}" y="${ky * (h / 2 - pf / 2) - pf / 2}" width="${pf}" height="${pf}" fill="${metall}"/>`);
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1" fill="none" stroke="${metall}" ${S}/>`;
    return s;
  };

  Z.schreibtisch = (w, h, f) => {
    let s = Z.tisch(w, h, f);
    s += rr(-28, -h / 2 + 6, 56, 6, 1, '#2b2b2b'); // Bildschirm
    s += rr(-22, -h / 2 + 22, 44, 14, 2, '#e8e8e8'); // Tastatur
    return s;
  };
  // Drehstuhl mit 4-Stern-Fuß (KRYLBO): Fuß Ø = Breite, Sitz rund, Rückenschale hinten
  Z.drehstuhl4 = (w, h, f) => {
    let s = '';
    const fuss = dunkel(f, .1), rS = Math.min(w, h) / 2;
    [45, 135, 225, 315].forEach(a => {
      const x = Math.cos(rad(a)) * rS, y = Math.sin(rad(a)) * rS;
      s += `<line x1="0" y1="0" x2="${x}" y2="${y}" stroke="${fuss}" stroke-width="3.2" stroke-linecap="round"/>`;
      s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${dunkel(f, .3)}"/>`;
    });
    const sw = w * .87 / 2, sh = h * .4;
    s += `<ellipse cx="0" cy="${h * .06}" rx="${sw * .93}" ry="${sh * .95}" fill="${f}" stroke="${dunkel(f, .35)}" ${S}/>`;
    s += `<ellipse cx="0" cy="${h * .08}" rx="${sw * .7}" ry="${sh * .7}" fill="${hell(f, .08)}"/>`;
    s += `<path d="M${-sw} ${-h * .1} Q${-sw} ${-h * .44} 0 ${-h * .44} Q${sw} ${-h * .44} ${sw} ${-h * .1} Q${sw * .6} ${-h * .27} 0 ${-h * .28} Q${-sw * .6} ${-h * .27} ${-sw} ${-h * .1} Z" fill="${dunkel(f, .12)}" stroke="${dunkel(f, .4)}" ${S}/>`;
    return s;
  };
  const rad = d => d * Math.PI / 180;

  Z.buerostuhl = (w, h, f) => {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      s += linie(0, 0, Math.sin(a) * w / 2, Math.cos(a) * h / 2, '#444', 2.5);
    }
    s += `<ellipse cx="0" cy="${h * .05}" rx="${w * .33}" ry="${h * .33}" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/>`;
    s += rr(-w * .3, -h * .42, w * .6, h * .16, 5, dunkel(f, .15));
    return s;
  };

  Z.board = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 2, f);
    const n = Math.max(1, Math.round(w / 60));
    for (let i = 1; i < n; i++) s += linie(-w / 2 + i * w / n, -h / 2 + 3, -w / 2 + i * w / n, h / 2 - 3, dunkel(f, .25));
    return s;
  };
  Z.tv = (w, h, f) => rr(-w / 2, -h / 2, w, h, 1, '#1d1d1f') + rr(-w * .12, -h / 2 - 1, w * .24, h + 2, 1, '#3a3a3c');

  Z.teppich = (w, h, f) => {
    let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="3" fill="${f}" stroke="${dunkel(f, .2)}" ${S}/>`;
    s += `<rect x="${-w / 2 + 10}" y="${-h / 2 + 10}" width="${w - 20}" height="${h - 20}" rx="2" fill="none" stroke="${dunkel(f, .12)}" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`;
    return s;
  };
  // Teppich mit Tiger-/Fleckenmuster: helle Wolle, gezackte dunkle Streifen,
  // die von einer Mittelachse fischgrätartig nach außen laufen. f = Fleckenfarbe.
  Z.teppichTiger = (w, h, f, it) => {
    const grund = it.grund || '#ece6da';
    let seed = 7;
    const zufall = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const id = 'tg' + Math.round(w) + 'x' + Math.round(h);
    let s = `<defs><clipPath id="${id}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="2"/></clipPath></defs>`;
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="2" fill="${grund}"/>`;
    s += `<g clip-path="url(#${id})" fill="${f}">`;
    const lang = h >= w, L = lang ? h : w, B = lang ? w : h;
    const abstand = 8, steigM = .2, start = -L / 2 - 4, ende = L / 2 + B / 2 * (steigM + .08) + 6;
    for (let a = start; a < ende; a += abstand * (.8 + zufall() * .45)) {
      [-1, 1].forEach(seite => {
        let q = zufall() * 3;
        while (q < B / 2 + 4) {
          const len = 6 + zufall() * 18, dick = 3 + zufall() * 4, steig = steigM + (zufall() - .5) * .1;
          const q1 = q + len, n = 6, pts = [];
          for (let i = 0; i <= n; i++) {
            const t = q + len * i / n, prof = Math.sin(Math.PI * (.12 + .76 * i / n));
            pts.push([t, a - t * steig - dick * prof / 2 + (zufall() - .5) * 1.4]);
          }
          for (let i = n; i >= 0; i--) {
            const t = q + len * i / n, prof = Math.sin(Math.PI * (.12 + .76 * i / n));
            pts.push([t, a - t * steig + dick * prof / 2 + (zufall() - .5) * 1.4]);
          }
          const d = pts.map(([qq, aa], i) => { const x = lang ? seite * qq : aa, y = lang ? aa : seite * qq; return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join('') + 'Z';
          s += `<path d="${d}"/>`;
          q = q1 + 1.2 + zufall() * 4.5;
        }
      });
    }
    s += `</g><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="2" fill="none" stroke="${dunkel(grund, .25)}" ${S}/>`;
    return s;
  };

  Z.teppichRund = (w, h, f) => `<ellipse rx="${w / 2}" ry="${h / 2}" fill="${f}" stroke="${dunkel(f, .2)}" ${S}/><ellipse rx="${w / 2 - 10}" ry="${h / 2 - 10}" fill="none" stroke="${dunkel(f, .12)}" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`;

  Z.pflanze = (w, h, f) => {
    let s = kreis(0, 0, w * .3, '#9a6b4a');
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      s += `<ellipse cx="${Math.sin(a) * w * .25}" cy="${Math.cos(a) * h * .25}" rx="${w * .22}" ry="${h * .12}" transform="rotate(${-i * 360 / 7 + 90} ${Math.sin(a) * w * .25} ${Math.cos(a) * h * .25})" fill="${i % 2 ? f : dunkel(f, .15)}" stroke="${dunkel(f, .4)}" ${S}/>`;
    }
    return s;
  };
  Z.lampe = (w, h, f) => kreis(0, 0, w / 2, hell(f, .5)) + kreis(0, 0, w / 5, f) + kreis(0, 0, w / 12, '#fff7c0');

  // Musik
  Z.piano = (w, h, f) => {
    const tastT = Math.min(h * .55, 16);
    let s = rr(-w / 2, -h / 2, w, h, 2, f);
    const y0 = h / 2 - tastT - 2;
    s += `<rect x="${-w / 2 + 4}" y="${y0}" width="${w - 8}" height="${tastT}" fill="#fbfbf8" stroke="#555" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
    const n = Math.round((w - 8) / 2.35); // ca. Tastenbreite 2,35 cm
    const tb = (w - 8) / n;
    for (let i = 1; i < n; i++) s += linie(-w / 2 + 4 + i * tb, y0, -w / 2 + 4 + i * tb, y0 + tastT, '#bbb', .5);
    const muster = [1, 1, 0, 1, 1, 1, 0];
    for (let i = 0; i < n - 1; i++) if (muster[i % 7]) s += `<rect x="${-w / 2 + 4 + (i + 1) * tb - tb * .3}" y="${y0}" width="${tb * .6}" height="${tastT * .6}" fill="#222"/>`;
    return s;
  };
  // Korg SP-250: Lautsprecherblende oben, Holzleisten, Bedienfeld, 88 Tasten
  Z.korg = (w, h, f) => {
    const kt = h * .40, ky = h / 2 - kt - h * .04;
    let s = rr(-w / 2, -h / 2, w, h, 3, '#1c1a1a');
    s += `<rect x="${-w / 2 + w * .025}" y="${-h / 2 + h * .07}" width="${w * .95}" height="${h * .22}" rx="2" fill="#9a9a98"/>`;
    for (let x = -w / 2 + w * .03; x < w / 2 - w * .03; x += 1.1) s += `<line x1="${x}" y1="${-h / 2 + h * .08}" x2="${x}" y2="${-h / 2 + h * .28}" stroke="#7f7f7d" stroke-width=".25"/>`;
    s += `<rect x="${-w / 2 + w * .025}" y="${-h / 2 + h * .32}" width="${w * .2}" height="${h * .14}" fill="#6b2f1e"/>`;
    s += `<rect x="${w / 2 - w * .025 - w * .2}" y="${-h / 2 + h * .32}" width="${w * .2}" height="${h * .14}" fill="#6b2f1e"/>`;
    s += `<path d="M${-w * .29} ${-h / 2 + h * .32} H${w * .29} L${w * .26} ${-h / 2 + h * .46} H${-w * .26} Z" fill="#c9ccd1" stroke="#888" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
    for (let i = 0; i < 14; i++) s += `<circle cx="${-w * .2 + i * w * .03}" cy="${-h / 2 + h * .39}" r="${h * .02}" fill="#334"/>`;
    const n = 52, x0 = -w / 2 + w * .03, tb = (w * .94) / n;
    s += `<rect x="${x0}" y="${ky}" width="${w * .94}" height="${kt}" fill="#fbfbf8"/>`;
    for (let i = 1; i < n; i++) s += linie(x0 + i * tb, ky, x0 + i * tb, ky + kt, '#aaa', .4);
    // 88 Tasten: beginnt mit A0 (A, Bb, H, dann C-Oktaven)
        const folge = [1, 0]; // A0→Bb, H0→kein
    const okt = [1, 1, 0, 1, 1, 1, 0]; // C D E F G A H
    for (let i = 0; i < n - 1; i++) {
      const hat = i < 2 ? folge[i] : okt[(i - 2) % 7];
      if (hat) s += `<rect x="${x0 + (i + 1) * tb - tb * .3}" y="${ky}" width="${tb * .6}" height="${kt * .62}" fill="#111"/>`;
    }
    return s;
  };

  Z.klavier = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h * .62, 2, f);
    s += Z.piano(w - 6, h * .38, f).replace(/^/, `<g transform="translate(0 ${h * .31 - 1})">`) + '</g>';
    return s;
  };
  Z.fluegel = (w, h, f) => {
    const p = `M${-w / 2} ${-h / 2 + 10} H${w / 2} V${-h / 2 + h * .35} C${w / 2} ${h * .15} ${w * .05} ${h * .1} ${w * .05} ${h * .3} C${w * .05} ${h * .45} ${-w * .1} ${h / 2} ${-w * .3} ${h / 2} C${-w * .45} ${h / 2} ${-w / 2} ${h * .35} ${-w / 2} ${h * .2} Z`;
    let s = `<path d="${p}" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/>`;
    s += `<g transform="translate(0 ${-h / 2 + 5}) rotate(180)">${Z.piano(w, 12, f)}</g>`;
    s += `<path d="${p}" fill="none" stroke="${hell(f, .3)}" stroke-width="1" vector-effect="non-scaling-stroke" transform="scale(.85) translate(0 6)"/>`;
    return s;
  };
  Z.bank = (w, h, f) => rr(-w / 2, -h / 2, w, h, 4, f) + rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 4, hell(f, .2));
  Z.drums = (w, h, f) => {
    const k = (x, y, r, c) => kreis(x * w / 180, y * h / 150, r * Math.min(w / 180, h / 150), c);
    const fell = '#f2f0e8', becken = '#d6b356';
    let s = '';
    s += k(-62, -40, 21, becken) + k(64, -48, 25, becken) + k(78, 10, 22, becken); // Becken
    s += k(0, -32, 28, f) + k(0, -32, 24, fell);            // Bass Drum
    s += k(-22, -2, 14, f) + k(-22, -2, 11, fell);          // Tom 1
    s += k(22, -2, 14, f) + k(22, -2, 11, fell);            // Tom 2
    s += k(-48, 12, 17, '#b9b9b9') + k(-48, 12, 14, fell);  // Snare
    s += k(-70, 30, 17, becken);                            // HiHat
    s += k(55, 34, 21, f) + k(55, 34, 18, fell);            // Floor Tom
    s += k(0, 50, 17, '#333');                              // Hocker
    return s;
  };
  // Roland V-Drums (nach Draufsicht-Foto): Werte in Bildpixeln 1200×560 → auf w×h skaliert
  Z.roland = (w, h, f) => {
    const sx = w / 1200, sy = h / 560, X = x => -w / 2 + x * sx, Y = y => -h / 2 + y * sy;
    const el = (x, y, r, fill, st = '#111') => `<ellipse cx="${X(x)}" cy="${Y(y)}" rx="${r * sx}" ry="${r * sy}" fill="${fill}" stroke="${st}" ${S}/>`;
    const becken = (x, y, r) => el(x, y, r, '#2b2b2b', '#111') + el(x, y, r * .82, 'none', '#3a3a3a') + el(x, y, r * .62, 'none', '#3a3a3a') + el(x, y, r * .12, '#555', '#222');
    const pad = (x, y, r) => el(x, y, r, '#1c1c1c') + el(x, y, r * .86, '#e9e9e7', '#9a9a9a');
    let s = '';
    s += `<rect x="${X(560)}" y="${Y(70)}" width="${170 * sx}" height="${70 * sy}" rx="2" fill="#333"/>`; // Rack
    s += `<rect x="${X(615)}" y="${Y(150)}" width="${80 * sx}" height="${290 * sy}" rx="2" fill="#9a9a9a" stroke="#444" ${S}/>`; // Kick-Turm + Pedal
    s += `<rect x="${X(628)}" y="${Y(300)}" width="${54 * sx}" height="${130 * sy}" rx="2" fill="#cfcfcf" stroke="#555" ${S}/>`;
    s += pad(530, 250, 98) + pad(780, 250, 98) + pad(925, 335, 95) + pad(500, 420, 118);
    s += becken(355, 140, 118) + becken(905, 130, 128) + becken(1075, 250, 108) + becken(270, 370, 118);
    s += `<rect x="${X(10)}" y="${Y(330)}" width="${170 * sx}" height="${190 * sy}" rx="3" fill="#1a1a1a" stroke="#000" ${S}/>`; // Modul
    s += `<ellipse cx="${X(110)}" cy="${Y(440)}" rx="${28 * sx}" ry="${28 * sy}" fill="#444"/><rect x="${X(30)}" y="${Y(470)}" width="${50 * sx}" height="${30 * sy}" fill="#4b6fb0"/>`;
    return s;
  };

  Z.gitarre = (w, h, f) => {
    const sx = w / 40, sy = h / 110;
    return `<g transform="scale(${sx} ${sy})"><ellipse cx="0" cy="28" rx="18" ry="22" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/><ellipse cx="0" cy="2" rx="14" ry="15" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/><circle cx="0" cy="12" r="5" fill="#222"/><rect x="-2.5" y="-50" width="5" height="50" fill="${dunkel(f, .45)}"/><rect x="-4" y="-55" width="8" height="10" rx="2" fill="${dunkel(f, .55)}"/></g>`;
  };
  Z.gitarrenstaender = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 3, '#3a3a3a', 'fill-opacity=".25"');
    const n = Math.max(1, Math.round(w / 22));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + .5) * w / n;
      s += `<ellipse cx="${x}" cy="0" rx="${w / n / 2 - 1}" ry="${h / 2 - 3}" fill="${['#a0522d', '#1f1f1f', '#c0392b', '#d4a35a'][i % 4]}" stroke="#222" ${S}/>`;
    }
    return s;
  };
  Z.amp = (w, h, f) => rr(-w / 2, -h / 2, w, h, 2, '#2a2a2a') + rr(-w / 2 + 3, h / 2 - 6, w - 6, 4, 1, '#c9a96e') + kreis(-w / 2 + 8, -h / 2 + 8, 2.5, '#ddd');
  Z.box = (w, h, f) => rr(-w / 2, -h / 2, w, h, 2, '#222') + kreis(0, h * .1, Math.min(w, h) * .32, '#444');
  Z.noten = (w, h, f) => rr(-w / 2, -h / 2, w, h * .3, 1, '#333') + linie(0, -h / 2 + h * .3, 0, h / 2 - 4, '#333', 2) + linie(-w * .35, h / 2, w * .35, h / 2, '#333', 2) + rr(-w / 2 + 3, -h / 2 + 1, w - 6, h * .3 - 2, 0, '#fff');
  Z.mikro = (w, h, f) => linie(-w / 2, h / 2, 0, 0, '#333', 2) + linie(w / 2, h / 2, 0, 0, '#333', 2) + linie(0, -h / 2, 0, 0, '#333', 2) + kreis(0, -h / 2 + 4, 4, '#555');
  Z.studiotisch = (w, h, f) => {
    let s = Z.tisch(w, h, f);
    s += rr(-w * .3, -h / 2 + 6, w * .6, 8, 1, '#222');
    s += rr(-w * .32, -h / 2 + 20, w * .64, h * .4, 2, '#444');
    for (let i = 0; i < 8; i++) s += linie(-w * .3 + i * w * .085 + 3, -h / 2 + 24, -w * .3 + i * w * .085 + 3, -h / 2 + 20 + h * .4 - 4, '#888', 1);
    return s;
  };

  // Küche & Bad
  Z.kueche = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 1, f);
    s += rr(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 1, hell(f, .4));
    // Spüle
    s += rr(-w * .3, -h / 2 + 8, 45, h - 18, 4, '#cfd6db') + kreis(-w * .3 + 22, -h / 2 + 12, 2.5, '#888');
    // Kochfeld
    const kx = w * .12;
    s += rr(kx, -h / 2 + 6, 58, h - 14, 2, '#1e1e1e');
    [[14, 14], [42, 14], [14, 36], [42, 36]].forEach(([x, y]) => s += `<circle cx="${kx + x}" cy="${-h / 2 + 6 + y * (h - 14) / 52}" r="9" fill="none" stroke="#666" stroke-width="1" vector-effect="non-scaling-stroke"/>`);
    return s;
  };
  // Badewanne von oben: Rand/Fliesenverkleidung, innen die Wanne, Armatur + Ablauf am linken Ende
  Z.badewanne = (w, h, f) => {
    const rand = Math.min(8, Math.min(w, h) * .12), iw = w - 2 * rand, ih = h - 2 * rand;
    let s = rr(-w / 2, -h / 2, w, h, 3, f);
    s += rr(-iw / 2, -ih / 2, iw, ih, Math.min(ih / 2.2, 22), hell(f, .35));
    s += rr(-iw / 2 + 4, -ih / 2 + 4, iw - 8, ih - 8, Math.min(ih / 2.6, 18), hell(f, .6));
    s += kreis(-iw / 2 + Math.min(14, iw * .1), 0, 2.2, '#b9bec4');
    s += rr(-w / 2 + 1, -2.5, rand + 3, 5, 1.5, '#b9bec4');
    return s;
  };

  Z.geraet = (w, h, f) => rr(-w / 2, -h / 2, w, h, 2, f) + rr(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 2, hell(f, .2)) + linie(-w / 2 + 4, h / 2 - 3, w / 2 - 4, h / 2 - 3, dunkel(f, .4), 2);
  Z.herd = (w, h, f) => {
    let s = rr(-w / 2, -h / 2, w, h, 2, '#2a2a2a');
    [[-.25, -.25], [.25, -.25], [-.25, .2], [.25, .2]].forEach(([x, y]) => s += `<circle cx="${x * w}" cy="${y * h}" r="${w * .15}" fill="none" stroke="#777" stroke-width="1" vector-effect="non-scaling-stroke"/>`);
    return s;
  };
  Z.wama = (w, h, f) => rr(-w / 2, -h / 2, w, h, 3, f) + kreis(0, h * .08, Math.min(w, h) * .3, hell(f, .4)) + kreis(0, h * .08, Math.min(w, h) * .2, '#9fb6c8') + rr(-w / 2 + 4, -h / 2 + 3, w - 8, 6, 1, dunkel(f, .15));
  Z.waeschestaender = (w, h, f) => {
    let s = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="2" fill="rgba(0,0,0,.03)" stroke="#888" ${S}/>`;
    for (let y = -h / 2 + 6; y < h / 2; y += 7) s += linie(-w / 2, y, w / 2, y, '#888', 1);
    return s;
  };
  Z.sitzsack = (w, h, f) => `<path d="M0 ${-h / 2} C${w * .45} ${-h / 2} ${w / 2} ${-h * .1} ${w * .45} ${h * .2} C${w * .35} ${h / 2} ${-w * .35} ${h / 2} ${-w * .45} ${h * .2} C${-w / 2} ${-h * .1} ${-w * .45} ${-h / 2} 0 ${-h / 2}Z" fill="${f}" stroke="${dunkel(f, .4)}" ${S}/><ellipse cx="0" cy="${h * .08}" rx="${w * .25}" ry="${h * .2}" fill="${hell(f, .15)}"/>`;

  // Papagei (Ara) von oben: Kopf vorne/oben, Flügel blau-gelb, langer Schwanz. f = Körperfarbe.
  Z.papagei = (w, h, f) => {
    const sx = w / 36, sy = h / 90;
    const g = (inner) => `<g transform="scale(${sx} ${sy})">${inner}</g>`;
    const st = `stroke="${dunkel(f, .45)}" stroke-width=".8" vector-effect="non-scaling-stroke"`;
    let t = '';
    // Schwanzfedern
    t += `<path d="M-5 8 L-7 44 L-2 45 L0 10 Z" fill="${f}" ${st}/>`;
    t += `<path d="M5 8 L7 44 L2 45 L0 10 Z" fill="#2b62c9" ${st}/>`;
    t += `<path d="M-2 10 L-1.5 45 L1.5 45 L2 10 Z" fill="${dunkel(f, .1)}" ${st}/>`;
    // Flügel
    t += `<path d="M-8 -14 Q-19 -2 -14 24 Q-9 18 -5 6 Z" fill="#2b62c9" ${st}/>`;
    t += `<path d="M8 -14 Q19 -2 14 24 Q9 18 5 6 Z" fill="#2b62c9" ${st}/>`;
    t += `<path d="M-8 -14 Q-15 -8 -14 2 Q-10 -2 -7 -6 Z" fill="#f2c230" ${st}/>`;
    t += `<path d="M8 -14 Q15 -8 14 2 Q10 -2 7 -6 Z" fill="#f2c230" ${st}/>`;
    for (let i = 0; i < 4; i++) {
      t += `<path d="M${-12 + i * .6} ${4 + i * 5} q-3 2 -2.5 5" fill="none" stroke="#1a3f8a" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
      t += `<path d="M${12 - i * .6} ${4 + i * 5} q3 2 2.5 5" fill="none" stroke="#1a3f8a" stroke-width=".6" vector-effect="non-scaling-stroke"/>`;
    }
    // Körper
    t += `<ellipse cx="0" cy="-4" rx="8.5" ry="15" fill="${f}" ${st}/>`;
    // Kopf
    t += `<circle cx="0" cy="-23" r="7" fill="${f}" ${st}/>`;
    t += `<ellipse cx="-4.2" cy="-25" rx="2.3" ry="3" fill="#fff"/><ellipse cx="4.2" cy="-25" rx="2.3" ry="3" fill="#fff"/>`;
    t += `<circle cx="-4.4" cy="-25.4" r="1" fill="#111"/><circle cx="4.4" cy="-25.4" r="1" fill="#111"/>`;
    // Schnabel
    t += `<path d="M-4 -27.5 Q0 -41 4 -27.5 Q0 -30 -4 -27.5 Z" fill="#d9c9a8" stroke="#3a3a3a" stroke-width=".7" vector-effect="non-scaling-stroke"/>`;
    t += `<path d="M-1.4 -31 Q0 -35 1.4 -31" fill="none" stroke="#3a3a3a" stroke-width=".5" vector-effect="non-scaling-stroke"/>`;
    return g(t);
  };

  Z.notiz = (w, h, f, it) => {
    const txt = (it.notiz || it.name || '').slice(0, 120);
    return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${f}" stroke="${dunkel(f, .25)}" ${S}/><path d="M${w / 2 - 12} ${h / 2} L${w / 2} ${h / 2 - 12} L${w / 2} ${h / 2}Z" fill="${dunkel(f, .15)}"/>`;
  };
  Z.text = () => '';
  Z.bild = () => ''; // wird im Editor als <image> gezeichnet

  // ---------- Formen für Kollisionsprüfung (konvexe Teilrechtecke) ----------
  function formen(it) {
    const w = it.w, h = it.h;
    if (it.zeichnung === 'sofaL' || it.zeichnung === 'maleron') {
      const t = it.tiefe || 90, c = it.chaise || 95;
      return [
        [-w / 2, -h / 2, w, t],
        [-w / 2, -h / 2 + t, c, h - t],
      ];
    }
    return [[-w / 2, -h / 2, w, h]];
  }

  // ---------- Katalog ----------
  // [Name, Zeichnung, Breite, Tiefe, Farbe, Bewegungsfläche vorne, Extras]
  const K = {
    'Meine Möbel': [
      ['Couch Maleron L-Form (Samt Dunkelblau, links)', 'maleron', 265, 160, '#26398f', 50, { tiefe: 93, chaise: 95, link: 'https://www.sofa-dreams.com/products/ecksofa-maleron-l-form-kurz', palette: [['Schwarz', '#1f1f21'], ['Hellgrau', '#bdbebf'], ['Greige', '#b9b0a7'], ['Taupe', '#9b8669'], ['Dunkelblau', '#26398f'], ['Grau', '#7d7e81'], ['Beige', '#e3cbb0']], notiz: 'Maleron Kurz, L-Form, Samtstoff Dunkelblau, Liegeteil links. Höhe 70 cm, Sitzhöhe 42 cm, Sitztiefe 65 cm. Breite des Liegeteils geschätzt (95 cm) – bitte nachmessen.' }],
      ['Korg E-Piano SP-250', 'korg', 129.5, 38, '#1c1a1a', 80, { notiz: 'Korg SP-250: 1.295 × 380 × 140 mm (B × T × H).' }],
      ['Roland E-Drums', 'roland', 160, 100, '#222222', 60, { notiz: 'Roland V-Drums, ca. 160 × 100 cm. Freifläche vorne = Platz für Hocker und Spieler.' }],
      ['Sideboard weiß / Holzplatte', 'sideboardHolz', 180, 35, '#b98a5c', 70, { notiz: 'Sideboard 180 × 35 cm, weiße Fronten (3 Klappen), Holzplatte oben.' }],
      ['Stuhl Matilda (Sklum, gepolstert)', 'matilda', 54, 68, '#dcd8d0', 0, { link: 'https://www.sklum.com/de/kaufen-pack-4-stuhle/220618-pack-mit-4-gepolsterten-matilda-esszimmerstuhlen.html#measures', notiz: 'Matilda Esszimmerstuhl (4er-Pack): 54 B × 68 T × 87 H cm, Sitzhöhe 50 cm, Sitzfläche 54 × 46 cm.' }],
      ['Kommode schwarz (altes Wohnzimmer)', 'kommode', 72, 34, '#232323', 70, { notiz: 'Kommode schwarz, 4 Schubladen, 72 × 34 cm.' }],
      ['Schlafsofa grau (altes Musikzimmer)', 'sofaChevron', 210, 80, '#5d5e66', 50, { notiz: 'Schlafsofa Samt grau mit Fischgrät-Steppung, 210 × 80 cm. Ausgeklappt als Bett deutlich tiefer – vor Ort nachmessen.' }],
      ['Tisch Oval (Säulenfüße)', 'tischOval', 160, 90, '#6b4a2f', 75, { notiz: 'Ovaler Esstisch mit zwei geriffelten Säulenfüßen, 160–200 × 90 cm, Höhe 75 cm. Breite, Tiefe und Farbe rechts frei einstellbar. Freifläche = Platz zum Stuhl-Zurückschieben (auf beiden Langseiten nötig).' }],
      ['Couchtisch schwarz gebürstet 40×40', 'metallTisch', 40, 40, '#2a2a2c', 0, { notiz: 'Kleiner quadratischer Couchtisch, gebürstetes Schwarz, 40 × 40 cm.' }],
      ['Couchtisch schwarz gebürstet 34×34', 'metallTisch', 34, 34, '#2a2a2c', 0, { notiz: 'Kleiner quadratischer Couchtisch, gebürstetes Schwarz, 34 × 34 cm.' }],
      ['Drehstuhl IKEA KRYLBO (Tonerud blau)', 'drehstuhl4', 63, 63, '#2f5aa8', 0, { preis: 59.99, link: 'https://www.ikea.com/de/de/p/krylbo-drehstuhl-tonerud-blau-50573591/', notiz: 'KRYLBO Drehstuhl: Fuß Ø 63 cm, Sitz 55 B × 58 T, Höhe 77–88 cm, Sitzhöhe 46–58 cm. Zweite-Chance-Angebot 59,99 € (statt 79,99 €).' }],
      ['Teppich Tiger schwarz-weiß', 'teppichTiger', 160, 230, '#232326', 0, { ebene: 'boden', grund: '#ece6da', notiz: 'Schwarz-weiß gefleckter Teppich (Tigermuster). Größe angenommen 160 × 230 cm – rechts anpassen.' }],
      ['Stuhl Roma (Draht, Chrom)', 'drahtstuhl', 44, 47, '#a9afb6', 0, { link: 'https://northdeco.com/de-de/products/silla-de-metal-roma?variant=56341861433730', notiz: 'Metallstuhl Roma (North Deco), Drahtgitter verchromt: 44 B × 47 T × 83,5 H cm, Sitzhöhe 48,5 cm.' }],
      ['Regal IKEA FJÄLLBO (schwarz)', 'regalIndustrie', 100, 36, '#b48a5c', 60, { rahmen: '#1f1f21', link: 'https://www.ikea.com/de/de/p/fjaellbo-regal-schwarz-50339292/', notiz: 'FJÄLLBO Regal schwarz: 100 B × 36 T × 95 H cm. Oben offen mit 2 Holzböden, unten 2 Gittertüren (Freifläche zum Öffnen).' }],
      ['IKEA BROR Arbeitstisch mit Schubladen', 'regalIndustrie', 85, 40, '#e2cfa6', 60, { rahmen: '#1f1f21', mitte: false, link: 'https://www.ikea.com/de/de/p/bror-arbeitstisch-mit-schubladen-schwarz-kiefersperrholz-70494300/', notiz: 'BROR Arbeitstisch schwarz/Kiefernsperrholz: 85 B × 40 T × 89 H cm, 4 Metallschubladen (innen ca. 74 × 37 cm, 16 cm hoch). Freifläche vorne = Platz zum Herausziehen der Schubladen.' }],
      ['Schreibtischplatte Büro Tom (Nussbaum)', 'holzplatte', 186, 63.5, '#7a4e2d', 100, { notiz: 'Massivholz-Arbeitsplatte Nussbaum, 186 × 63,5 cm, Stärke 3,8 cm.' }],
    ],
    'Wohnen': [
      ['Sofa 3-Sitzer', 'sofa', 220, 95, '#8a8f98', 50],
      ['Sofa 2-Sitzer', 'sofa', 170, 90, '#8a8f98', 50],
      ['Ecksofa L', 'sofaL', 260, 180, '#9a948a', 50, { tiefe: 95, chaise: 95 }],
      ['Sessel', 'sessel', 85, 85, '#b07a55', 40],
      ['Couchtisch', 'tisch', 110, 60, '#c8a77e', 0],
      ['Couchtisch rund', 'tischRund', 80, 80, '#c8a77e', 0],
      ['TV-Board', 'board', 180, 40, '#e9e4dc', 0],
      ['Fernseher 65″', 'tv', 146, 8, '#1d1d1f', 0],
      ['Sideboard', 'board', 160, 45, '#c8a77e', 70],
      ['Bücherregal', 'regal', 80, 35, '#e9e4dc', 70],
      ['Regal Metall/Holz', 'regalIndustrie', 100, 36, '#b48a5c', 60, { rahmen: '#1f1f21' }],
      ['Teppich 200×300', 'teppich', 300, 200, '#d9cbb5', 0, { ebene: 'boden' }],
      ['Teppich Tigermuster', 'teppichTiger', 160, 230, '#232326', 0, { ebene: 'boden', grund: '#ece6da' }],
      ['Teppich rund Ø200', 'teppichRund', 200, 200, '#c9b9a6', 0, { ebene: 'boden' }],
      ['Stehlampe', 'lampe', 40, 40, '#e8c66a', 0],
      ['Pflanze', 'pflanze', 55, 55, '#5f8f4e', 0],
    ],
    'Schlafen': [
      ['Doppelbett 180×200', 'bett', 180, 210, '#9aa7b5', 60],
      ['Doppelbett 160×200', 'bett', 160, 210, '#9aa7b5', 60],
      ['Bett 140×200', 'bett', 140, 210, '#9aa7b5', 60],
      ['Einzelbett 90×200', 'bett', 90, 205, '#a6b98f', 60],
      ['Hochbett 90×200', 'hochbett', 100, 210, '#c9a87a', 60],
      ['Kleiderschrank 200 cm', 'schrank', 200, 60, '#ece8e1', 90],
      ['Kleiderschrank 150 cm', 'schrank', 150, 60, '#ece8e1', 90],
      ['Schiebetürenschrank 250', 'schrank', 250, 65, '#ece8e1', 70],
      ['Kommode', 'kommode', 100, 50, '#e6dccd', 70],
      ['Nachttisch', 'kommode', 45, 40, '#e6dccd', 0],
    ],
    'Essen & Küche': [
      ['Esstisch 160×90 + 6 Stühle', 'esstisch', 160, 190, '#c8a77e', 0, { tw: 160, th: 90 }],
      ['Esstisch 140×80 + 4 Stühle', 'esstisch', 140, 180, '#c8a77e', 0, { tw: 140, th: 80 }],
      ['Tisch Oval (Säulenfüße)', 'tischOval', 160, 90, '#6b4a2f', 75],
      ['Esstisch rund Ø110 + 4', 'esstischRund', 190, 190, '#c8a77e', 0, { tw: 110, stuehle: 4 }],
      ['Stuhl', 'stuhl', 45, 48, '#b38b63', 0],
      ['Drahtstuhl', 'drahtstuhl', 44, 47, '#a9afb6', 0],
      ['Küchenzeile 270', 'kueche', 270, 60, '#f1f1ef', 120],
      ['Kühlschrank', 'geraet', 60, 65, '#e3e5e8', 90],
      ['Herd', 'herd', 60, 60, '#2a2a2a', 90],
      ['Spülmaschine', 'geraet', 60, 60, '#d9dcdf', 90],
      ['Kücheninsel', 'tisch', 120, 80, '#e7e3dc', 90],
    ],
    'Arbeiten': [
      ['Schreibtisch 160×80', 'schreibtisch', 160, 80, '#d7c3a5', 100],
      ['Schreibtisch 120×60', 'schreibtisch', 120, 60, '#d7c3a5', 100],
      ['Bürostuhl', 'buerostuhl', 65, 65, '#3d4450', 0],
      ['Drehstuhl 4-Fuß', 'drehstuhl4', 63, 63, '#2f5aa8', 0],
      ['Regal 80×40', 'regal', 80, 40, '#e9e4dc', 70],
      ['Aktenschrank', 'kommode', 80, 40, '#e9e4dc', 70],
    ],
    'Musik': [
      ['Korg E-Piano SP-250', 'korg', 129.5, 38, '#1c1a1a', 80, { notiz: 'Korg SP-250: 1.295 × 380 × 140 mm (B × T × H).' }],
      ['E-Piano / Stage-Piano', 'piano', 140, 40, '#222222', 80],
      ['Klavier', 'klavier', 150, 60, '#2b1f1a', 80],
      ['Stutzflügel', 'fluegel', 150, 160, '#1a1a1a', 80],
      ['Klavierbank', 'bank', 60, 35, '#2b2b2b', 0],
      ['Schlagzeug (akustisch)', 'drums', 180, 150, '#8b1e2d', 40],
      ['E-Drum-Set', 'drums', 140, 120, '#333333', 40],
      ['Gitarre auf Ständer', 'gitarre', 40, 110, '#a0522d', 30],
      ['Gitarrenständer 3-fach', 'gitarrenstaender', 70, 45, '#333333', 30],
      ['Gitarrenverstärker', 'amp', 60, 30, '#2a2a2a', 30],
      ['Bassverstärker', 'amp', 60, 45, '#2a2a2a', 30],
      ['Studiotisch', 'studiotisch', 160, 80, '#3a3a3a', 100],
      ['Studiomonitor', 'box', 20, 25, '#222222', 0],
      ['Notenständer', 'noten', 50, 35, '#333333', 50],
      ['Mikrofonständer', 'mikro', 60, 60, '#333333', 0],
    ],
    'Kinder': [
      ['Kinderschreibtisch', 'schreibtisch', 100, 60, '#f0d9a8', 90],
      ['Spielzeugregal', 'regal', 110, 35, '#f2efe9', 60],
      ['Spielteppich', 'teppich', 200, 140, '#a7c7e7', 0, { ebene: 'boden' }],
      ['Sitzsack', 'sitzsack', 80, 80, '#e07a5f', 0],
    ],
    'Bad & Technik': [
      ['Badewanne 170 × 75', 'badewanne', 170, 75, '#f4f4f2', 70, { notiz: 'Rechteckige Wanne, Standardmaß 170 × 75 cm (Bad: geschätzt aus dem Exposé-Foto, evtl. 160 × 70 – vor Ort nachmessen). Größe rechts frei änderbar. Armatur und Ablauf am linken Ende.' }],
      ['Waschtrockner', 'wama', 60, 60, '#f2f2f2', 90, { notiz: 'Waschtrockner (ein Gerät): ca. 60 B × 55–65 T × 85 H cm.' }],
      ['Waschmaschine', 'wama', 60, 60, '#f2f2f2', 90],
      ['Trockner', 'wama', 60, 60, '#f2f2f2', 90],
      ['Wäscheständer', 'waeschestaender', 180, 60, '#cccccc', 0],
    ],
    'Tiere & Spaß': [
      ['Papagei (Ara)', 'papagei', 36, 90, '#d7262e', 0, { ebene: 'oben', notiz: 'Nur zum Spaß 🦜 – ein Ara ist mit Schwanz etwa 85–90 cm lang.' }],
    ],
    'Formen & Notizen': [
      ['Rechteck', 'rechteck', 100, 60, '#9db4c0', 0],
      ['Kreis', 'kreis', 80, 80, '#c0a9bd', 0],
      ['Notiz / Link', 'notiz', 90, 60, '#fff3a3', 0, { ebene: 'oben' }],
      ['Beschriftung', 'text', 120, 30, '#333333', 0, { ebene: 'oben' }],
    ],
  };

  window.Vorlagen = { Z, K, formen, hell, dunkel, mix };
})();
