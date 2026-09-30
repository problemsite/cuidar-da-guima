// =====================================================================
//  ARTE — A GUIMA (rosto real + corpo desenhado + versões distorcidas)
// =====================================================================
(function () {
  const G = (window.G = window.G || {});
  const A = (G.Arte = G.Arte || {});
  const { clamp, lerp } = G.util;
  const RR = (...a) => A.rr(...a);

  // ------------------------------------------------------------------
  //  ROSTOS — cada foto tem as posições de olhos, boca, queixo e mechas.
  //  Coordenadas em "unidades": a foto é sempre desenhada com 286 de largura.
  //  pescoco = ponto onde a gola da blusa encaixa.
  //  mechaE/mechaD = onde o cabelo da frente começa (esquerda/direita); mechaY = altura.
  // ------------------------------------------------------------------
  const ROSTOS = (A.ROSTOS = {
    feliz: {
      arq: 'rosto.webp', olhoE: { x: 100, y: 152, rx: 18, ry: 8 }, olhoD: { x: 182, y: 148, rx: 19, ry: 8 },
      boca: { x: 142, y: 232, rx: 40 }, queixo: 290, pescoco: { x: 143, y: 306 }, mechaE: 114, mechaD: 186, mechaY: 255, esc: 1.1,
    },
    serio: {
      arq: 'rosto_normal_serio.webp', olhoE: { x: 90, y: 149, rx: 18, ry: 8 }, olhoD: { x: 178, y: 145, rx: 19, ry: 8 },
      boca: { x: 138, y: 233, rx: 36 }, queixo: 290, pescoco: { x: 140, y: 318 }, mechaE: 100, mechaD: 190, mechaY: 262, esc: 1.1,
    },
    desgosto: {
      arq: 'rosto_meio_triste_e_desgostoso.webp', olhoE: { x: 101, y: 133, rx: 17, ry: 8 }, olhoD: { x: 178, y: 129, rx: 18, ry: 8 },
      boca: { x: 143, y: 210, rx: 32 }, queixo: 262, pescoco: { x: 143, y: 316 }, mechaE: 116, mechaD: 182, mechaY: 250, esc: 1.1,
    },
    medo: {
      arq: 'rosto_meio_triste_meio_assustado.webp', olhoE: { x: 100, y: 133, rx: 18, ry: 9 }, olhoD: { x: 178, y: 130, rx: 18, ry: 9 },
      boca: { x: 142, y: 213, rx: 33 }, queixo: 266, pescoco: { x: 142, y: 305 }, mechaE: 114, mechaD: 182, mechaY: 250, esc: 1.1,
    },
    panico: {
      arq: 'rosto_muito_assustado.webp', olhoE: { x: 100, y: 133, rx: 19, ry: 10 }, olhoD: { x: 180, y: 129, rx: 19, ry: 10 },
      boca: { x: 142, y: 220, rx: 38 }, queixo: 278, pescoco: { x: 142, y: 305 }, mechaE: 114, mechaD: 184, mechaY: 255, esc: 1.1,
    },
    dormindo: {
      arq: 'rosto_dormindo.webp', olhoE: { x: 90, y: 153, rx: 18, ry: 8 }, olhoD: { x: 178, y: 150, rx: 19, ry: 8 },
      boca: { x: 138, y: 235, rx: 36 }, queixo: 292, pescoco: { x: 140, y: 322 }, mechaE: 104, mechaD: 188, mechaY: 265, esc: 1.1,
    },
  });
  A.ROSTO = ROSTOS.feliz; // compatibilidade

  const OX = 57, OY = 80; // posição da foto dentro do canvas da cabeça (unidades)
  const K = 2;            // resolução do canvas da cabeça (2x)
  const CW = 400, CH = 660;
  let cab = null, carregadas = 0;
  const px = (f) => f; // (legibilidade)

  A.carregarGuima = function (pronto) {
    // A cópia embutida (pesada) só é baixada quando o jogo é aberto direto do arquivo.
    if (location.protocol === 'file:' && !window.GUIMA_ROSTOS) {
      const sc = document.createElement('script');
      sc.src = 'js/guima-embutida.js';
      sc.onload = sc.onerror = () => carregar(pronto);
      document.head.appendChild(sc);
    } else carregar(pronto);
  };
  function carregar(pronto) {
    const nomes = Object.keys(ROSTOS);
    let faltam = nomes.length;
    const fim = () => { if (--faltam === 0) { A.imgGuima = ROSTOS.feliz.img; pronto && pronto(); } };
    nomes.forEach((k) => {
      const f = ROSTOS[k];
      const i = new Image();
      const embutida = window.GUIMA_ROSTOS && window.GUIMA_ROSTOS[f.arq];
      i.onload = () => { f.img = i; f.w = 286; f.h = (286 * i.height) / i.width; amostrarPele(f); fim(); };
      i.onerror = () => {
        if (embutida && i.src !== embutida) { i.src = embutida; return; }
        console.warn('Rosto não carregou:', f.arq); fim();
      };
      i.decoding = 'async';
      i.src = location.protocol === 'file:' && embutida ? embutida : 'assets/rostos/' + f.arq + '?v=' + (window.VERSAO || 1);
    });
  }
  const rostoDe = (o) => {
    const f = ROSTOS[(o && o.rosto) || 'feliz'];
    return f && f.img ? f : ROSTOS.feliz.img ? ROSTOS.feliz : null;
  };

  // cor da pele perto dos olhos e do pescoço (para pálpebras/pescoço combinarem com a foto)
  function amostrarPele(f) {
    const media = (d) => { let r = 0, g = 0, b = 0, n = 0; for (let k = 0; k < d.length; k += 4) if (d[k + 3] > 200) { r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; } return n ? [r / n, g / n, b / n] : null; };
    try {
      const W = Math.round(f.w), H = Math.round(f.h);
      const cv = A.novoCanvas(W, H), cc = cv.getContext('2d', { willReadFrequently: true });
      cc.drawImage(f.img, 0, 0, W, H);
      [f.olhoE, f.olhoD].forEach((e) => {
        const cima = media(cc.getImageData(e.x - e.rx + 4, e.y - e.ry - 9, e.rx * 2 - 8, 5).data);
        const meio = media(cc.getImageData(e.x - e.rx + 4, e.y - e.ry - 4, e.rx * 2 - 8, 3).data);
        if (cima) e.c1 = `rgb(${cima.map(Math.round).join(',')})`;
        if (meio) e.c2 = `rgb(${meio.map((v) => Math.round(v * 0.93)).join(',')})`;
      });
      const pele = media(cc.getImageData(f.pescoco.x - 18, f.queixo - 30, 36, 10).data);
      if (pele) f.pele = pele.map(Math.round);
    } catch (err) { /* sem permissão de leitura: cores padrão */ }
  }

  // ------------------------------------------------------------------
  //  Renderiza a cabeça num canvas separado com os efeitos.
  //  o = { lids, olhosPretos, olhosFundos, cansada, distorce, t, palida, lagrimas }
  //  Retorna { cv, ax, ay } (âncora = pescoço)
  // ------------------------------------------------------------------
  // cache: se a cabeça for pedida com as mesmas opções, reaproveita (mais leve pro PC)
  const cacheCab = [];
  function chaveCab(o) {
    const d = o.distorce || 0;
    if (d > 0.01 || (o.olhosPretos > 0 && o.olhosPretos < 1)) return null;
    const r = (v) => Math.round((v || 0) * 20);
    return [o.rosto || 'feliz', r(o.lids), r(o.olhosPretos), r(o.olhosFundos), r(o.cansada), r(o.palida), r(o.veias), o.filtro || '', o.lagrimas ? 1 : 0].join('|');
  }
  A.cabeca = function (o) {
    const chave = chaveCab(o);
    if (chave) {
      const achou = cacheCab.find((e) => e.chave === chave);
      if (achou) return achou.h;
      let slot = cacheCab.length < 6 ? null : cacheCab.shift();
      const cvNovo = slot ? slot.h.cv : A.novoCanvas(CW * K, CH * K);
      const antes = cab; cab = cvNovo;
      const h = renderCabeca(o);
      cab = antes;
      const ent = { chave, h };
      cacheCab.push(ent);
      return h;
    }
    if (!cab) cab = A.novoCanvas(CW * K, CH * K);
    return renderCabeca(o);
  };
  function renderCabeca(o) {
    const c = cab.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, cab.width, cab.height);
    const f = rostoDe(o);
    if (!f) return { cv: cab, ax: 200, ay: 440, k: K, f: ROSTOS.feliz };
    c.setTransform(K, 0, 0, K, 0, 0);
    const img = f.img, FH = f.h, cxF = (f.olhoE.x + f.olhoD.x) / 2;
    const esY = img.height / FH;
    const d = o.distorce || 0, t = o.t || 0;
    const corte = f.olhoE.y + 40, bocaY = f.boca.y, olhoY = (f.olhoE.y + f.olhoD.y) / 2;
    // mapa vertical (esticar do meio do rosto pra baixo)
    const esticaY = (sy) => sy + (sy > corte ? (sy - corte) * 0.5 * d : 0);
    const escalaX = (sy) => {
      let s = 1;
      if (sy > bocaY - 28 && sy < bocaY + 40) s += 0.28 * d * Math.sin(((sy - bocaY + 28) / 68) * Math.PI);
      if (sy > olhoY - 22 && sy < olhoY + 24) s += 0.08 * d * Math.sin(((sy - olhoY + 22) / 46) * Math.PI);
      return s;
    };
    if (d > 0.01) {
      const passo = 3;
      for (let sy = 0; sy < FH; sy += passo) {
        const sx = escalaX(sy);
        const dx = Math.sin(sy * 0.03 + t * 5) * d * 6 + (Math.random() < d * 0.01 ? (Math.random() - 0.5) * 26 * d : 0);
        const y0 = esticaY(sy), y1 = esticaY(sy + passo);
        c.drawImage(img, 0, sy * esY, img.width, passo * esY, OX + dx - (sx - 1) * cxF, OY + y0, 286 * sx, y1 - y0 + 0.6);
      }
    } else {
      c.drawImage(img, OX, OY, 286, FH);
    }
    const olhos = [f.olhoE, f.olhoD].map((e) => ({
      x: OX + cxF + (e.x - cxF) * escalaX(e.y), y: OY + esticaY(e.y), rx: e.rx * escalaX(e.y), ry: e.ry, c1: e.c1, c2: e.c2,
    }));
    // pálpebras (antes dos efeitos de cor, para receber o mesmo tom)
    const lids = f === ROSTOS.dormindo ? 0 : clamp(o.lids || 0, 0, 1);
    if (lids > 0.02 && !(o.olhosPretos > 0.5)) {
      olhos.forEach((e) => {
        c.save();
        c.beginPath(); c.ellipse(e.x, e.y + 1, e.rx + 3, e.ry + 3.5, 0, 0, 7); c.clip();
        const topo = e.y - e.ry - 4, alt = (e.ry + 4) * 2 * lids + 1;
        const g = c.createLinearGradient(0, topo, 0, topo + alt);
        g.addColorStop(0, e.c1 || '#f3ab78'); g.addColorStop(1, e.c2 || '#e9a071');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(e.x - e.rx - 4, topo - 2);
        c.lineTo(e.x + e.rx + 4, topo - 2);
        c.lineTo(e.x + e.rx + 4, topo + alt * 0.8);
        c.quadraticCurveTo(e.x, topo + alt * 1.15, e.x - e.rx - 4, topo + alt * 0.8);
        c.fill();
        c.strokeStyle = 'rgba(55,22,12,0.8)'; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(e.x - e.rx, topo + alt * 0.78);
        c.quadraticCurveTo(e.x, topo + alt * 1.1, e.x + e.rx, topo + alt * 0.78);
        c.stroke();
        c.restore();
      });
    }
    c.globalCompositeOperation = 'source-atop';
    // olhos fundos (sombra ao redor)
    if (o.olhosFundos > 0) {
      olhos.forEach((e) => {
        const g = c.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.rx * 2.1);
        g.addColorStop(0, `rgba(30,10,25,${0.75 * o.olhosFundos})`);
        g.addColorStop(1, 'rgba(30,10,25,0)');
        c.fillStyle = g; c.beginPath(); c.arc(e.x, e.y, e.rx * 2.1, 0, 7); c.fill();
      });
    }
    // olheiras
    if (o.cansada > 0) {
      olhos.forEach((e) => {
        c.save(); c.translate(e.x, e.y + e.ry + 6); c.scale(1, 0.45);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, e.rx * 1.3);
        g.addColorStop(0, `rgba(80,30,80,${0.45 * o.cansada})`); g.addColorStop(1, 'rgba(80,30,80,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, e.rx * 1.3, 0, 7); c.fill();
        c.restore();
      });
    }
    // veias escuras (estágios finais)
    if (o.veias > 0) {
      c.strokeStyle = `rgba(60,20,50,${0.35 * o.veias})`; c.lineWidth = 1;
      const r = A.semente(5);
      for (let i = 0; i < 14; i++) {
        let x = OX + cxF + (r() - 0.5) * 150, y = OY + olhoY + (r() - 0.2) * 120;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 14; c.lineTo(x, y); }
        c.stroke();
      }
    }
    // pálida / morta
    const pal = Math.max(o.palida || 0, d * 0.8);
    if (pal > 0) {
      c.fillStyle = `rgba(150,175,170,${0.4 * pal})`; c.fillRect(0, 0, CW, CH);
      c.fillStyle = `rgba(10,0,10,${0.22 * pal})`; c.fillRect(0, 0, CW, CH);
    }
    c.globalCompositeOperation = 'source-over';
    // olhos pretos (fundos, com borda suave e escorrendo)
    if (o.olhosPretos > 0) {
      const a = o.olhosPretos;
      olhos.forEach((e, i) => {
        const sc = 1 + d * 0.5;
        const rx = e.rx * sc + 3, ry = e.ry * sc * (1 + d * 0.7) + 3;
        c.save(); c.translate(e.x, e.y); c.scale(1, ry / rx);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, rx * 1.45);
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(2,0,2,${a})`);
        g.addColorStop(0.8, `rgba(20,5,12,${0.55 * a})`); g.addColorStop(1, 'rgba(20,5,12,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx * 1.45, 0, 7); c.fill();
        c.restore();
        c.fillStyle = `rgba(255,255,255,${0.75 * a})`;
        c.beginPath(); c.arc(e.x + Math.sin(t * 0.7 + i) * 2, e.y - 1, 1.3 + d * 0.8, 0, 7); c.fill();
        if (o.lagrimas || d > 0.2) {
          // escorrido irregular
          c.globalCompositeOperation = 'source-atop';
          const n = Math.floor(16 + d * 24);
          c.strokeStyle = `rgba(0,0,0,${0.85 * a})`; c.lineCap = 'round';
          let px = e.x - 4 + i * 5, py = e.y + ry * 0.6;
          for (let k = 1; k < n; k++) {
            const nx = e.x - 4 + i * 5 + Math.sin(k * 0.35 + i * 2 + t * 0.3) * 3, ny = e.y + ry * 0.6 + k * 5;
            c.lineWidth = Math.max(1, 7 - k * (6 / n));
            c.globalAlpha = Math.max(0, 1 - (k / n) * 0.9);
            c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
            px = nx; py = ny;
          }
          c.globalAlpha = 1;
          c.globalCompositeOperation = 'source-over';
        }
      });
    }
    // boca escancarada (borda suave)
    if (d > 0.05) {
      const by = OY + esticaY(f.boca.y) + 8 + d * 10;
      const sx = escalaX(f.boca.y);
      const rx = f.boca.rx * sx * 0.62, ry = 6 + 46 * d;
      c.save(); c.translate(OX + f.boca.x, by); c.scale(1, ry / rx);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, rx * 1.3);
      g.addColorStop(0, `rgba(2,0,1,${Math.min(1, d * 1.3)})`); g.addColorStop(0.6, `rgba(8,0,3,${Math.min(1, d * 1.2)})`);
      g.addColorStop(0.85, `rgba(60,5,15,${0.5 * d})`); g.addColorStop(1, 'rgba(60,5,15,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx * 1.3, 0, 7); c.fill();
      c.restore();
    }
    aplicarFiltro(c, o.filtro);
    c.setTransform(1, 0, 0, 1, 0, 0);
    return { cv: cab, ax: OX + f.pescoco.x, ay: OY + esticaY(f.pescoco.y), k: K, f, cx: OX + cxF, cy: OY + esticaY((olhoY + f.boca.y) / 2) };
  }

  // Filtros de cor feitos "na mão" (ctx.filter é lento em muitos PCs)
  const cacheFiltro = {};
  function lerFiltro(txt) {
    if (!txt) return null;
    if (cacheFiltro[txt]) return cacheFiltro[txt];
    const f = { dessat: 0, escuro: 0, claro: 0, contraste: 0, blur: 0 };
    txt.replace(/(\w+)\(([\d.]+)(px)?\)/g, (_, nome, v) => {
      v = parseFloat(v);
      if (nome === 'saturate') f.dessat = Math.max(f.dessat, 1 - v);
      if (nome === 'grayscale') f.dessat = Math.max(f.dessat, v);
      if (nome === 'brightness') { if (v < 1) f.escuro = 1 - v; else f.claro = v - 1; }
      if (nome === 'contrast') f.contraste = Math.max(0, v - 1);
      if (nome === 'blur') f.blur = v;
    });
    const n = Object.keys(cacheFiltro).length;
    if (n < 400) cacheFiltro[txt] = f;
    return f;
  }
  A.lerFiltro = lerFiltro;
  let mascara = null;
  function aplicarFiltro(c, txt) {
    const f = lerFiltro(txt);
    if (!f || !(f.dessat || f.escuro || f.claro || f.contraste)) return;
    if (!mascara) mascara = A.novoCanvas(cab.width, cab.height);
    const m = mascara.getContext('2d');
    m.globalCompositeOperation = 'copy'; m.drawImage(cab, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const W = cab.width, H = cab.height;
    if (f.contraste > 0) {
      c.globalAlpha = Math.min(1, f.contraste); c.globalCompositeOperation = 'overlay';
      c.drawImage(mascara, 0, 0); c.globalAlpha = 1;
    }
    if (f.dessat > 0) {
      c.globalCompositeOperation = 'saturation';
      c.fillStyle = `rgba(128,128,128,${Math.min(1, f.dessat)})`; c.fillRect(0, 0, W, H);
    }
    c.globalCompositeOperation = 'destination-in'; c.drawImage(mascara, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    if (f.escuro > 0) { c.fillStyle = `rgba(0,0,0,${Math.min(0.9, f.escuro)})`; c.fillRect(0, 0, W, H); }
    if (f.claro > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(0.5, f.claro * 0.35)})`; c.fillRect(0, 0, W, H); }
    c.globalCompositeOperation = 'source-over';
  }
  let peq = null;
  function borrado(cv, px) {
    const k = 1 / (1 + px * 0.9);
    if (!peq) peq = A.novoCanvas(cv.width, cv.height);
    const p = peq.getContext('2d');
    const w = Math.max(8, Math.round(cv.width * k)), h = Math.max(8, Math.round(cv.height * k));
    p.clearRect(0, 0, peq.width, peq.height);
    p.imageSmoothingEnabled = true;
    p.drawImage(cv, 0, 0, w, h);
    return { cv: peq, w, h };
  }

  // piscar natural
  A.piscada = function (t, semente) {
    const per = 3.6 + (semente || 0);
    const f = t % per;
    if (f < 0.13) return Math.sin((f / 0.13) * Math.PI);
    // piscada dupla às vezes
    if (Math.floor(t / per) % 4 === 1 && f > 0.25 && f < 0.36) return Math.sin(((f - 0.25) / 0.11) * Math.PI);
    return 0;
  };

  // ------------------------------------------------------------------
  //  Mechas da frente: a parte de baixo do cabelo, recortada da cabeça
  //  já renderizada, para desenhar POR CIMA da blusa.
  // ------------------------------------------------------------------
  const mascMechas = {};
  let mechCv = null;
  function mechas(h) {
    const f = h.f;
    let m = mascMechas[f.arq];
    if (!m) {
      m = mascMechas[f.arq] = A.novoCanvas(CW * K, CH * K);
      const c = m.getContext('2d');
      c.setTransform(K, 0, 0, K, 0, 0);
      const xe = OX + f.mechaE, xd = OX + f.mechaD, y0 = OY + f.mechaY;
      let g = c.createLinearGradient(xe - 16, 0, xe + 6, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, y0, xe + 6, CH);
      g = c.createLinearGradient(xd - 6, 0, xd + 16, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      c.fillStyle = g; c.fillRect(xd - 6, y0, CW, CH);
      c.globalCompositeOperation = 'destination-in';
      g = c.createLinearGradient(0, y0, 0, y0 + 34);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    }
    if (h.mech && h.mechVer === h.ver) return h.mech;
    if (!mechCv) mechCv = A.novoCanvas(CW * K, CH * K);
    const c = mechCv.getContext('2d');
    c.globalCompositeOperation = 'copy'; c.drawImage(h.cv, 0, 0);
    c.globalCompositeOperation = 'destination-in'; c.drawImage(m, 0, 0);
    c.globalCompositeOperation = 'source-over';
    return mechCv;
  }

  // pescoço desenhado (só para fotos que não têm pescoço)
  function pescoco(c, h, E) {
    const f = h.f;
    if (!f.semPescoco) return;
    const p = f.pele || [240, 170, 125];
    const cor = (k) => `rgb(${p.map((v) => Math.round(v * k)).join(',')})`;
    const topo = (f.queixo - f.pescoco.y - 16) * E;
    c.fillStyle = A.grad(c, -38 * E, 0, 38 * E, 0, [[0, cor(0.7)], [0.25, cor(0.88)], [0.6, cor(0.92)], [1, cor(0.68)]]);
    c.beginPath();
    c.moveTo(-36 * E, topo); c.lineTo(36 * E, topo);
    c.quadraticCurveTo(30 * E, -topo * 0.3, 42 * E, 40); c.lineTo(-42 * E, 40);
    c.quadraticCurveTo(-30 * E, -topo * 0.3, -36 * E, topo);
    c.fill();
    // sombra do queixo
    const g = c.createLinearGradient(0, topo, 0, topo + 26 * E);
    g.addColorStop(0, 'rgba(90,35,25,0.45)'); g.addColorStop(1, 'rgba(90,35,25,0)');
    c.fillStyle = g; c.fillRect(-38 * E, topo, 76 * E, 26 * E);
  }

  // blusa (o pescoço fica em (0,0))
  function blusa(c, o) {
    c.save(); c.translate(0, -26); c.scale(0.86, 0.94);
    const cor1 = o.corpoEscuro ? '#9e6b80' : '#eea3bd', cor2 = o.corpoEscuro ? '#7c4f63' : '#d27f9f';
    c.fillStyle = A.grad(c, 0, 20, 0, 460, [[0, cor1], [1, cor2]]);
    c.beginPath();
    c.moveTo(-60, 30);
    c.quadraticCurveTo(-150, 44, -200, 92);
    c.quadraticCurveTo(-236, 130, -240, 200);
    c.lineTo(-250, 520); c.lineTo(250, 520);
    c.lineTo(240, 200);
    c.quadraticCurveTo(236, 130, 200, 92);
    c.quadraticCurveTo(150, 44, 60, 30);
    c.quadraticCurveTo(0, 90, -60, 30);
    c.fill();
    // gola
    c.fillStyle = o.corpoEscuro ? '#d9cdd2' : '#fff6f8';
    c.beginPath(); c.moveTo(-64, 28); c.quadraticCurveTo(0, 100, 64, 28); c.quadraticCurveTo(70, 44, 40, 70); c.quadraticCurveTo(0, 96, -40, 70); c.quadraticCurveTo(-70, 44, -64, 28); c.fill();
    c.strokeStyle = 'rgba(200,120,150,0.5)'; c.lineWidth = 2; c.stroke();
    // costura dos braços e textura de tricô
    c.strokeStyle = 'rgba(120,40,70,0.22)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-178, 150); c.quadraticCurveTo(-170, 300, -180, 520); c.moveTo(178, 150); c.quadraticCurveTo(170, 300, 180, 520); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 2;
    for (let x = -150; x <= 150; x += 14) { c.beginPath(); c.moveTo(x, 110); c.lineTo(x, 520); c.stroke(); }
    // broche de coração
    c.save(); c.translate(-92, 170); c.rotate(-0.2);
    c.fillStyle = o.corpoEscuro ? '#6d2b3f' : '#ff5c8a';
    c.beginPath(); c.arc(-7, 0, 9, 0, 7); c.arc(7, 0, 9, 0, 7); c.moveTo(-15, 4); c.lineTo(0, 20); c.lineTo(15, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(-9, -3, 3, 0, 7); c.fill();
    c.restore();
    c.restore();
  }

  // desenha a cabeça já renderizada com o pescoço em (0,0) e escala E
  function desenharCabeca(c, h, E, cv) {
    c.drawImage(cv || h.cv, (-h.ax) * E, (-h.ay) * E, (h.cv.width / h.k) * E, (h.cv.height / h.k) * E);
  }

  // ------------------------------------------------------------------
  //  Guima em pé (busto grande na frente do quarto)
  //  Camadas: pescoço → cabeça → blusa → mechas da frente
  // ------------------------------------------------------------------
  A.guimaEmPe = function (c, x, pescocoY, o) {
    const esc = o.esc || 1;
    const t = o.t || 0;
    const resp = Math.sin(t * 1.7) * 0.008;
    c.save();
    c.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
    c.translate(x, pescocoY + (o.pulo || 0));
    c.scale(esc * (1 - resp * 0.5 + (o.estica || 0) * -0.5), esc * (1 + resp + (o.estica || 0)));
    const h = A.cabeca(o);
    const E = 1.14 * (h.f.esc || 1);
    const rot = ((o.inclina || 0) * Math.PI) / 180;
    pescoco(c, h, E);
    c.save(); c.rotate(rot); desenharCabeca(c, h, E); c.restore();
    blusa(c, o);
    c.save(); c.rotate(rot); desenharCabeca(c, h, E, mechas(h)); c.restore();
    c.restore();
  };

  // ------------------------------------------------------------------
  //  Guima deitada / sentando na cama. s = 0 deitada .. 1 sentada
  // ------------------------------------------------------------------
  A.guimaNaCama = function (c, s, o) {
    const quadril = { x: 1810, y: 752 };
    const a0 = Math.atan2(-50, -188), a1 = Math.atan2(-236, -26);
    const ang = a0 + (a1 - a0) * s;
    const dist = lerp(194, 238, s);
    const px = quadril.x + Math.cos(ang) * dist;
    const py = quadril.y + Math.sin(ang) * dist;
    const rot = lerp(-Math.PI / 2, (o.inclina || 0) * Math.PI / 180, s);
    const h = A.cabeca(o);
    const E = lerp(0.5, 0.62, s) * (h.f.esc || 1);
    c.save();
    c.translate(px, py);
    c.rotate(rot);
    pescoco(c, h, E);
    desenharCabeca(c, h, E);
    if (s > 0.05) {
      c.save();
      c.globalAlpha = Math.min(1, s * 3);
      c.scale(E / 1.14 * 1.04, E / 1.14 * 1.04);
      blusa(c, { corpoEscuro: 1 });
      c.restore();
      c.globalAlpha = Math.min(1, s * 3);
      desenharCabeca(c, h, E, mechas(h));
    }
    c.restore();
    return { x: px, y: py };
  };

  // ------------------------------------------------------------------
  //  Rosto grande (reflexo, susto do espelho, jumpscare)
  // ------------------------------------------------------------------
  A.rostoGrande = function (c, x, y, esc, o) {
    const h = A.cabeca(o);
    c.save();
    c.translate(x, y);
    c.rotate(((o.inclina || 0) * Math.PI) / 180);
    c.globalAlpha *= o.alpha !== undefined ? o.alpha : 1;
    const cx = h.cx || 203, cy = h.cy || 280;
    const f = lerFiltro(o.filtro);
    const sx = esc * (o.sx || 1), sy = esc * (o.sy || 1);
    const W = (h.cv.width / h.k) * sx, H = (h.cv.height / h.k) * sy;
    if (f && f.blur > 0) { const b = borrado(h.cv, f.blur); c.drawImage(b.cv, 0, 0, b.w, b.h, -cx * sx, -cy * sy, W, H); }
    else c.drawImage(h.cv, -cx * sx, -cy * sy, W, H);
    c.restore();
  };

  // silhueta escura de gente (espelho, porta)
  A.silhueta = function (c, x, y, esc, cor, olhos, t) {
    c.save(); c.translate(x, y); c.scale(esc, esc);
    c.fillStyle = cor || '#050308';
    c.beginPath();
    c.ellipse(0, -150, 42, 54, 0, 0, 7);
    c.moveTo(-30, -100);
    c.quadraticCurveTo(-110, -80, -100, 60); c.lineTo(-90, 260); c.lineTo(90, 260); c.lineTo(100, 60);
    c.quadraticCurveTo(110, -80, 30, -100);
    c.fill();
    // cabelo comprido
    c.beginPath(); c.moveTo(-44, -170); c.quadraticCurveTo(-70, -60, -60, 10); c.lineTo(-30, -60); c.lineTo(30, -60); c.lineTo(60, 10); c.quadraticCurveTo(70, -60, 44, -170); c.fill();
    if (olhos) {
      c.fillStyle = olhos;
      c.beginPath(); c.ellipse(-15, -152, 5, 3.4, 0, 0, 7); c.ellipse(15, -152, 5, 3.4, 0, 0, 7); c.fill();
    }
    c.restore();
  };
})();
