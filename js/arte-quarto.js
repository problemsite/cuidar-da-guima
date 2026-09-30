// =====================================================================
//  ARTE — O QUARTO (cenário, móveis e iluminação)
// =====================================================================
(function () {
  const G = (window.G = window.G || {});
  const A = (G.Arte = G.Arte || {});
  const LAY = G.LAY;
  const { clamp, lerp } = G.util;

  // aleatório com semente (manchas sempre no mesmo lugar)
  A.semente = function (s) {
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rr = (x, y, w, h, r) => (c) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  A.rr = function (c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
  const RR = A.rr;
  function grad(c, x0, y0, x1, y1, stops) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  function rad(c, x, y, r0, r1, stops) {
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  A.grad = grad; A.rad = rad;

  function novoCanvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  A.novoCanvas = novoCanvas;

  // ------------------------------------------------------------------
  //  FUNDO ESTÁTICO (guardado em cache e refeito só quando muda)
  // ------------------------------------------------------------------
  let cache = null, cacheChave = '';
  A.fundo = function (R, stage) {
    const chave = R.decay + '|' + R.sky;
    if (cache && chave === cacheChave) return cache;
    cacheChave = chave;
    cache = cache || novoCanvas(1920, 1080);
    const c = cache.getContext('2d');
    c.clearRect(0, 0, 1920, 1080);
    desenharFundo(c, R);
    return cache;
  };

  function desenharFundo(c, R) {
    const rnd = A.semente(7);
    const P = LAY.parede;
    // parede
    c.fillStyle = grad(c, 0, 0, 0, P, [[0, '#cfa9b9'], [0.5, '#dcbac7'], [1, '#d3afbe']]);
    c.fillRect(0, 0, 1920, P);
    // listras do papel de parede
    for (let x = 0; x < 1920; x += 64) {
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(x, 0, 26, 560);
      c.fillStyle = 'rgba(120,70,95,0.05)'; c.fillRect(x + 30, 0, 3, 560);
    }
    // florzinhas
    for (let y = 36; y < 560; y += 74) for (let x = (y / 74) % 2 ? 16 : 48; x < 1920; x += 64) {
      c.fillStyle = 'rgba(255,240,246,0.35)';
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(214,150,170,0.5)'; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill();
    }
    // moldura superior (sanca)
    c.fillStyle = '#ecd8e0'; c.fillRect(0, 0, 1920, 26);
    c.fillStyle = 'rgba(90,50,70,0.18)'; c.fillRect(0, 26, 1920, 6);
    // lambri
    c.fillStyle = grad(c, 0, 560, 0, P, [[0, '#c298aa'], [1, '#b38699']]);
    c.fillRect(0, 560, 1920, P - 560);
    c.fillStyle = '#efdde4'; c.fillRect(0, 552, 1920, 14);
    c.fillStyle = 'rgba(80,40,60,0.2)'; c.fillRect(0, 566, 1920, 4);
    for (let x = 20; x < 1920; x += 150) {
      c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 3; c.strokeRect(x, 596, 118, 160);
      c.strokeStyle = 'rgba(80,40,60,0.12)'; c.lineWidth = 2; c.strokeRect(x + 3, 599, 118, 160);
    }
    // rodapé
    c.fillStyle = '#7f566a'; c.fillRect(0, P - 22, 1920, 26);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, P - 22, 1920, 3);

    // chão de madeira em perspectiva
    const fy = P + 4;
    c.fillStyle = grad(c, 0, fy, 0, 1080, [[0, '#7c5647'], [1, '#95695a']]);
    c.fillRect(0, fy, 1920, 1080 - fy);
    const vx = 960, vy = 120;
    c.strokeStyle = 'rgba(50,28,24,0.35)'; c.lineWidth = 2;
    for (let i = -18; i <= 18; i++) {
      const xb = 960 + i * 118;
      const t0 = (fy - vy) / (1080 - vy);
      c.beginPath(); c.moveTo(vx + (xb - vx) * t0, fy); c.lineTo(xb, 1080); c.stroke();
    }
    let yy = fy, gap = 20;
    c.strokeStyle = 'rgba(50,28,24,0.22)';
    let lin = 0;
    while (yy < 1080) {
      c.beginPath(); c.moveTo(0, yy); c.lineTo(1920, yy); c.stroke();
      // emendas das tábuas
      for (let i = -18; i <= 18; i += 2) {
        const xb = 960 + (i + (lin % 2)) * 118 + 50;
        const t0 = (yy - vy) / (1080 - vy);
        const x = vx + (xb - vx) * t0;
        c.beginPath(); c.moveTo(x, yy); c.lineTo(x, yy + gap); c.stroke();
      }
      yy += gap; gap *= 1.16; lin++;
    }
    // brilho do chão
    c.fillStyle = rad(c, 960, 900, 10, 700, [[0, 'rgba(255,220,200,0.10)'], [1, 'rgba(255,220,200,0)']]);
    c.fillRect(0, fy, 1920, 1080 - fy);
    // sombra encostada na parede
    c.fillStyle = grad(c, 0, fy, 0, fy + 40, [[0, 'rgba(30,10,20,0.35)'], [1, 'rgba(30,10,20,0)']]);
    c.fillRect(0, fy, 1920, 40);

    // tapete
    c.save();
    c.translate(990, 968); c.scale(1, 0.2);
    c.fillStyle = 'rgba(40,20,30,0.25)'; c.beginPath(); c.arc(8, 30, 450, 0, 7); c.fill();
    c.fillStyle = '#e2b9c8'; c.beginPath(); c.arc(0, 0, 440, 0, 7); c.fill();
    c.strokeStyle = '#c4889f'; c.lineWidth = 22; c.beginPath(); c.arc(0, 0, 395, 0, 7); c.stroke();
    c.strokeStyle = '#f1d6df'; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 340, 0, 7); c.stroke();
    c.fillStyle = '#d7a6b8'; c.beginPath(); c.arc(0, 0, 140, 0, 7); c.fill();
    c.restore();

    desenharJanelaFundo(c, R);
    desenharPoster(c, R);
    desenharMesa(c, R);
    desenharCriado(c, R);
    desenharCamaBase(c, R);
    desenharPrateleira(c);
    desenharCesto(c);
    desenharDecadencia(c, R, rnd);
  }

  // ------------- janela: céu + moldura -------------
  function desenharJanelaFundo(c, R) {
    const J = LAY.janela;
    const ceus = {
      tarde: [[0, '#f5a37f'], [0.45, '#f6c29a'], [0.75, '#f2a7b3'], [1, '#c98fb7']],
      noitinha: [[0, '#2f2656'], [0.55, '#6a4679'], [1, '#b0697f']],
      noite: [[0, '#0d1230'], [0.7, '#1e2550'], [1, '#2d2f5c']],
      escuro: [[0, '#04050d'], [1, '#0b0d1c']],
    };
    c.save();
    RR(c, J.x, J.y, J.w, J.h, 6); c.clip();
    c.fillStyle = grad(c, 0, J.y, 0, J.y + J.h, ceus[R.sky] || ceus.tarde);
    c.fillRect(J.x, J.y, J.w, J.h);
    const rnd = A.semente(3);
    if (R.sky !== 'tarde') {
      for (let i = 0; i < 40; i++) {
        c.fillStyle = `rgba(255,255,240,${0.2 + rnd() * 0.6})`;
        c.fillRect(J.x + rnd() * J.w, J.y + rnd() * J.h * 0.7, 2, 2);
      }
    }
    // lua ou sol
    if (R.sky === 'tarde') {
      c.fillStyle = rad(c, J.x + 210, J.y + 215, 10, 120, [[0, 'rgba(255,240,200,0.95)'], [0.3, 'rgba(255,210,160,0.6)'], [1, 'rgba(255,190,150,0)']]);
      c.fillRect(J.x, J.y, J.w, J.h);
      c.fillStyle = '#fff1cf'; c.beginPath(); c.arc(J.x + 210, J.y + 215, 34, 0, 7); c.fill();
    } else {
      const lx = J.x + 230, ly = J.y + 80;
      c.fillStyle = rad(c, lx, ly, 10, 110, [[0, 'rgba(230,235,255,0.5)'], [1, 'rgba(200,210,255,0)']]);
      c.fillRect(J.x, J.y, J.w, J.h);
      c.fillStyle = R.sky === 'escuro' ? '#9aa0b8' : '#eef0fb';
      c.beginPath(); c.arc(lx, ly, 30, 0, 7); c.fill();
      if (R.sky === 'escuro') { c.fillStyle = '#0b0d1c'; c.beginPath(); c.arc(lx + 12, ly - 6, 28, 0, 7); c.fill(); }
    }
    // prédios / árvores
    c.fillStyle = R.sky === 'tarde' ? '#b77a8f' : R.sky === 'noitinha' ? '#2a2040' : '#070914';
    const b = [[0, 60], [40, 110], [70, 80], [120, 140], [170, 90], [205, 120], [250, 70], [280, 100]];
    b.forEach(([x, h]) => c.fillRect(J.x + x, J.y + J.h - h, 38, h));
    if (R.sky !== 'tarde') {
      c.fillStyle = R.sky === 'escuro' ? 'rgba(255,200,120,0.25)' : 'rgba(255,220,140,0.7)';
      for (let i = 0; i < 14; i++) c.fillRect(J.x + 8 + ((i * 53) % 290), J.y + J.h - 20 - ((i * 37) % 80), 6, 8);
    }
    c.restore();
    // moldura
    c.lineWidth = 16; c.strokeStyle = '#f3e7eb';
    RR(c, J.x - 8, J.y - 8, J.w + 16, J.h + 16, 10); c.stroke();
    c.lineWidth = 10;
    c.beginPath(); c.moveTo(J.x + J.w / 2, J.y); c.lineTo(J.x + J.w / 2, J.y + J.h); c.moveTo(J.x, J.y + J.h * 0.48); c.lineTo(J.x + J.w, J.y + J.h * 0.48); c.stroke();
    c.lineWidth = 3; c.strokeStyle = 'rgba(90,50,70,0.25)';
    RR(c, J.x - 1, J.y - 1, J.w + 2, J.h + 2, 6); c.stroke();
    // reflexo no vidro
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.beginPath(); c.moveTo(J.x + 20, J.y + J.h); c.lineTo(J.x + 90, J.y); c.lineTo(J.x + 130, J.y); c.lineTo(J.x + 60, J.y + J.h); c.fill();
    // parapeito
    c.fillStyle = '#f6ecef'; RR(c, J.x - 28, J.y + J.h + 6, J.w + 56, 18, 4); c.fill();
    c.fillStyle = 'rgba(80,40,60,0.25)'; c.fillRect(J.x - 24, J.y + J.h + 24, J.w + 48, 6);
    // varão
    c.fillStyle = '#6d4a5c'; RR(c, LAY.cortina.x0 - 20, LAY.cortina.y0 - 12, LAY.cortina.x1 - LAY.cortina.x0 + 40, 9, 4); c.fill();
    c.fillStyle = '#8b667a'; c.beginPath(); c.arc(LAY.cortina.x0 - 22, LAY.cortina.y0 - 8, 9, 0, 7); c.arc(LAY.cortina.x1 + 22, LAY.cortina.y0 - 8, 9, 0, 7); c.fill();
  }

  function desenharPoster(c, R) {
    const p = LAY.poster;
    c.save();
    c.translate(p.x + p.w / 2, p.y + p.h / 2); c.rotate(-0.02);
    c.fillStyle = 'rgba(40,20,30,0.25)'; c.fillRect(-p.w / 2 + 5, -p.h / 2 + 6, p.w, p.h);
    c.fillStyle = '#5fd3e6'; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    // hexágono branco com contorno preto
    c.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; c.lineTo(Math.cos(a) * 30, Math.sin(a) * 30 - 16); }
    c.closePath(); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#111'; c.stroke();
    c.fillStyle = '#111'; c.beginPath(); c.arc(-9, -18, 3, 0, 7); c.arc(9, -18, 3, 0, 7); c.fill();
    c.fillStyle = '#2f6fe0'; c.font = '900 17px "Baloo 2", "Arial Black", sans-serif'; c.textAlign = 'center';
    c.fillText('PROBLEMS', 0, 44);
    c.fillStyle = '#e44'; c.beginPath(); c.arc(0, -p.h / 2 + 8, 4, 0, 7); c.fill();
    if (R.decay >= 2) {
      // rasgado
      c.fillStyle = '#b38699';
      c.beginPath(); c.moveTo(p.w / 2, p.h / 2); c.lineTo(p.w / 2 - 50, p.h / 2); c.lineTo(p.w / 2 - 30, p.h / 2 - 30); c.lineTo(p.w / 2 - 44, p.h / 2 - 60); c.lineTo(p.w / 2, p.h / 2 - 72); c.fill();
      c.fillStyle = '#111'; c.fillRect(-12, -22, 7, 3); c.fillRect(5, -22, 7, 3);
    }
    c.restore();
  }

  function desenharMesa(c, R) {
    const m = LAY.mesa;
    // pernas
    c.fillStyle = '#d9c6b6';
    c.fillRect(m.x + 14, m.y + 18, 18, 186);
    c.fillRect(m.x + m.w - 170, m.y + 18, 12, 186);
    // gaveteiro (corpo)
    c.fillStyle = '#e8d8ca'; c.fillRect(m.x + m.w - 170, m.y + 18, 170, 186);
    c.fillStyle = 'rgba(60,30,30,0.15)'; c.fillRect(m.x + m.w - 170, m.y + 18, 6, 186);
    // gaveta de baixo (fixa)
    c.fillStyle = '#f1e4d9'; RR(c, m.x + m.w - 160, m.y + 110, 150, 80, 5); c.fill();
    c.fillStyle = '#b79a88'; RR(c, m.x + m.w - 105, m.y + 146, 40, 8, 4); c.fill();
    // tampo
    c.fillStyle = '#f4e9df'; RR(c, m.x - 6, m.y, m.w + 12, 20, 5); c.fill();
    c.fillStyle = 'rgba(80,50,40,0.22)'; c.fillRect(m.x - 6, m.y + 18, m.w + 12, 5);
    // sombra no chão
    c.fillStyle = 'rgba(30,10,20,0.25)'; c.fillRect(m.x, LAY.parede + 2, m.w, 20);
    // teclado, caneca, vaso
    c.fillStyle = '#2f2a38'; RR(c, 250, 606, 190, 18, 4); c.fill();
    c.fillStyle = '#4a4458'; for (let i = 0; i < 14; i++) c.fillRect(256 + i * 13, 610, 9, 4);
    c.fillStyle = '#e7a2b6'; RR(c, 498, 584, 34, 42, 6); c.fill();
    c.strokeStyle = '#e7a2b6'; c.lineWidth = 6; c.beginPath(); c.arc(534, 604, 10, -1.3, 1.3); c.stroke();
    // vaso com planta
    c.fillStyle = '#c47a5a'; c.beginPath(); c.moveTo(92, 592); c.lineTo(148, 592); c.lineTo(140, 628); c.lineTo(100, 628); c.fill();
    const murcha = R.decay >= 2;
    c.strokeStyle = murcha ? '#6d6a3e' : '#4f9a5c'; c.lineWidth = 5; c.lineCap = 'round';
    [[-1.2, 1], [-0.5, 1.2], [0.3, 1.1], [1, 0.9]].forEach(([a, l]) => {
      c.beginPath(); c.moveTo(120, 594);
      if (murcha) c.quadraticCurveTo(120 + a * 20, 560, 120 + a * 34, 590 - l * 10);
      else c.quadraticCurveTo(120 + a * 16, 560, 120 + a * 30, 540 - l * 20);
      c.stroke();
    });
    c.lineCap = 'butt';
    // livros fixos em pé na mesa
    [['#8d6fc9', 20], ['#e0a95a', 16], ['#5aa0a0', 22]].forEach(([col, w], i) => {
      c.fillStyle = col; c.fillRect(160 + i * 24, 548 - (i % 2) * 8, w, 80 + (i % 2) * 8);
      c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(160 + i * 24, 570, w, 3);
    });
    // monitor (corpo)
    const mo = LAY.monitor;
    c.fillStyle = '#3a3346'; RR(c, mo.x + mo.w / 2 - 18, mo.y + mo.h, 36, 22, 2); c.fill();
    c.fillStyle = '#2a2433'; RR(c, mo.x + mo.w / 2 - 60, mo.y + mo.h + 18, 120, 8, 4); c.fill();
    c.fillStyle = '#211c29'; RR(c, mo.x, mo.y, mo.w, mo.h, 10); c.fill();
    c.fillStyle = '#2d2737'; RR(c, mo.x + 2, mo.y + 2, mo.w - 4, 8, 6); c.fill();
    c.fillStyle = '#3c354a'; c.beginPath(); c.arc(mo.botao.x, mo.botao.y, 5, 0, 7); c.fill();
  }

  function desenharCriado(c, R) {
    const k = LAY.criado;
    c.fillStyle = 'rgba(30,10,20,0.3)'; c.fillRect(k.x + 4, LAY.parede, k.w, 22);
    c.fillStyle = '#e6d2c9'; RR(c, k.x, k.y, k.w, k.h, 6); c.fill();
    c.fillStyle = '#f3e6de'; RR(c, k.x - 6, k.y - 6, k.w + 12, 14, 4); c.fill();
    c.fillStyle = '#d8c1b6'; RR(c, k.x + 10, k.y + 22, k.w - 20, 48, 4); c.fill();
    c.fillStyle = '#d8c1b6'; RR(c, k.x + 10, k.y + 78, k.w - 20, 48, 4); c.fill();
    c.fillStyle = '#9a7b6c'; c.beginPath(); c.arc(k.x + k.w / 2, k.y + 46, 5, 0, 7); c.arc(k.x + k.w / 2, k.y + 102, 5, 0, 7); c.fill();
    // tomada na parede
    const t = LAY.tomada;
    c.fillStyle = '#f5ecef'; RR(c, t.x - 14, t.y - 20, 28, 40, 4); c.fill();
    c.strokeStyle = 'rgba(80,40,60,0.3)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#6a5a60'; c.beginPath(); c.arc(t.x - 5, t.y - 4, 2.5, 0, 7); c.arc(t.x + 5, t.y - 4, 2.5, 0, 7); c.fill();
  }

  function desenharCamaBase(c, R) {
    const x = LAY.cama.x;
    // sombra
    c.fillStyle = 'rgba(30,10,20,0.35)';
    c.beginPath(); c.ellipse(1690, 896, 300, 26, 0, 0, 7); c.fill();
    // cabeceira
    c.fillStyle = grad(c, x, 0, x + 50, 0, [[0, '#8f5d75'], [1, '#a96f8a']]);
    RR(c, x, 560, 50, 330, 16); c.fill();
    c.fillStyle = '#bb829c'; RR(c, x + 6, 572, 38, 12, 6); c.fill();
    // estrutura
    c.fillStyle = '#86566d'; c.fillRect(x + 40, 790, 1930 - x, 80);
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x + 40, 790, 1930 - x, 6);
    c.fillStyle = '#6e455a'; c.fillRect(x + 50, 866, 22, 24); c.fillRect(1880, 866, 22, 24);
    // colchão e lençol
    c.fillStyle = '#f6ecef'; RR(c, x + 44, 716, 1930 - x, 80, 14); c.fill();
    c.fillStyle = 'rgba(160,110,130,0.2)'; c.fillRect(x + 44, 780, 1930 - x, 14);
  }

  function desenharPrateleira(c) {
    const p = LAY.prateleira;
    c.fillStyle = '#e8d6cc'; RR(c, p.x, p.y, p.w, 12, 3); c.fill();
    c.fillStyle = 'rgba(40,20,30,0.25)'; c.fillRect(p.x + 4, p.y + 12, p.w - 8, 6);
    c.fillStyle = '#a57f8f'; c.fillRect(p.x + 20, p.y + 12, 8, 20); c.fillRect(p.x + p.w - 28, p.y + 12, 8, 20);
    // livrinhos
    c.fillStyle = '#7da4c9'; c.fillRect(p.x + 92, p.y - 50, 14, 50);
    c.fillStyle = '#c9a57d'; c.fillRect(p.x + 108, p.y - 44, 12, 44);
  }

  function desenharCesto(c) {
    const b = LAY.cesto;
    c.fillStyle = 'rgba(30,10,20,0.3)'; c.beginPath(); c.ellipse(b.x + b.w / 2, b.y + b.h, b.w / 2 + 8, 12, 0, 0, 7); c.fill();
    c.fillStyle = '#d7b98f';
    c.beginPath(); c.moveTo(b.x, b.y + 10); c.lineTo(b.x + b.w, b.y + 10); c.lineTo(b.x + b.w - 14, b.y + b.h); c.lineTo(b.x + 14, b.y + b.h); c.fill();
    c.strokeStyle = 'rgba(120,80,40,0.45)'; c.lineWidth = 3;
    for (let i = 1; i < 6; i++) { const y = b.y + 10 + i * 20; c.beginPath(); c.moveTo(b.x + 3 + i * 2.5, y); c.lineTo(b.x + b.w - 3 - i * 2.5, y); c.stroke(); }
    for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(b.x + (i * b.w) / 8, b.y + 10); c.lineTo(b.x + 14 + (i * (b.w - 28)) / 8, b.y + b.h); c.stroke(); }
    c.fillStyle = '#c9a879'; RR(c, b.x - 6, b.y, b.w + 12, 16, 6); c.fill();
  }

  function desenharDecadencia(c, R, rnd) {
    if (R.decay < 1) return;
    // manchas
    const n = R.decay * 7;
    for (let i = 0; i < n; i++) {
      const x = rnd() * 1920, y = 40 + rnd() * 700, r = 30 + rnd() * 90;
      c.fillStyle = rad(c, x, y, 0, r, [[0, `rgba(70,40,30,${0.08 + R.decay * 0.03})`], [1, 'rgba(70,40,30,0)']]);
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    // arranhões
    c.strokeStyle = 'rgba(60,30,40,0.25)'; c.lineWidth = 1.5;
    for (let i = 0; i < R.decay * 5; i++) {
      const x = rnd() * 1900, y = 100 + rnd() * 600;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) c.lineTo(x + k * 5 + rnd() * 6, y + k * 22 + rnd() * 6);
      c.stroke();
    }
    if (R.decay >= 2) {
      // rachaduras na parede
      c.strokeStyle = 'rgba(50,25,35,0.45)'; c.lineWidth = 2;
      [[1500, 90], [640, 420], [1300, 150], [90, 500]].forEach(([x0, y0]) => {
        const galhos = [[x0, y0, 1.2, 7]];
        while (galhos.length) {
          let [x, y, a, n] = galhos.pop();
          c.beginPath(); c.moveTo(x, y);
          for (let k = 0; k < n; k++) {
            a += (rnd() - 0.5) * 0.9; x += Math.cos(a) * (12 + rnd() * 14); y += Math.sin(a) * (12 + rnd() * 14);
            c.lineTo(x, y);
            if (rnd() < 0.18 && n > 3) galhos.push([x, y, a + (rnd() < 0.5 ? -0.9 : 0.9), n - 3]);
          }
          c.stroke();
        }
      });
      // mancha de umidade
      [[1720, 120, 110], [260, 40, 90]].forEach(([x, y, r]) => {
        c.fillStyle = rad(c, x, y, 0, r, [[0, 'rgba(80,60,40,0.28)'], [0.8, 'rgba(80,60,40,0.12)'], [1, 'rgba(80,60,40,0)']]);
        c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      });
      // escuridão nos cantos da parede
      c.fillStyle = grad(c, 0, 0, 0, 300, [[0, 'rgba(20,10,20,0.3)'], [1, 'rgba(20,10,20,0)']]);
      c.fillRect(0, 0, 1920, 300);
    }
    if (R.decay >= 3) {
      // marcas de mão e escrita
      c.fillStyle = 'rgba(40,15,20,0.3)';
      [[600, 640], [1860, 520], [1000, 150]].forEach(([x, y]) => mao(c, x, y, 0.9));
      c.save(); c.translate(1560, 520); c.rotate(-0.08);
      c.font = '700 44px "Caveat", "Comic Sans MS", cursive'; c.fillStyle = 'rgba(50,15,25,0.35)';
      c.fillText('dorme dorme dorme', 0, 0); c.restore();
    }
  }
  function mao(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.ellipse(0, 0, 22, 26, 0, 0, 7); c.fill();
    [[-18, -34, -0.3], [-6, -44, -0.1], [6, -46, 0.05], [18, -38, 0.25], [28, -8, 0.9]].forEach(([dx, dy, a]) => {
      c.save(); c.translate(dx, dy); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 5.5, 16, 0, 0, 7); c.fill(); c.restore();
    });
    c.restore();
  }
  A.mao = mao;

  // ------------------------------------------------------------------
  //  OBJETOS DINÂMICOS
  // ------------------------------------------------------------------
  A.cortinas = function (c, R, t, extra) {
    const K = LAY.cortina;
    const larg = K.meio - K.x0;
    const desenha = (lado, v) => {
      // v: 0 aberta (encolhida no canto) .. 1 fechada
      const w = lerp(96, larg + 16, v);
      const x0 = lado === 'L' ? K.x0 : K.x1 - w;
      const dobras = 7;
      c.save();
      const balanco = Math.sin(t * 0.8 + (lado === 'L' ? 0 : 2)) * 3 * (extra.vento || 0.3);
      for (let i = 0; i < dobras; i++) {
        const fx = x0 + (w / dobras) * i;
        const fw = w / dobras + 1;
        const g = c.createLinearGradient(fx, 0, fx + fw, 0);
        g.addColorStop(0, '#b56a8a'); g.addColorStop(0.45, '#d58fac'); g.addColorStop(1, '#a45d7c');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(fx, K.y0);
        c.lineTo(fx + fw, K.y0);
        c.lineTo(fx + fw + balanco * (i / dobras), K.y1 + (i % 2) * 6);
        c.lineTo(fx + balanco * (i / dobras), K.y1 + ((i + 1) % 2) * 6);
        c.fill();
      }
      // argolas
      c.fillStyle = '#8b667a';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x0 + 8 + (i * (w - 16)) / 4, K.y0 - 4, 5, 0, 7); c.fill(); }
      // barra
      c.fillStyle = 'rgba(255,230,240,0.35)'; c.fillRect(x0, K.y1 - 18, w, 6);
      c.restore();
    };
    desenha('L', R.curtain.L);
    desenha('R', R.curtain.R);
  };

  A.luzesVaral = function (c, R, t, V) {
    const pts = [];
    const n = 44;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = 60 + u * 1800;
      const onda = Math.abs(Math.sin(u * Math.PI * 3));
      pts.push([x, 44 + onda * 46]);
    }
    c.strokeStyle = 'rgba(60,40,50,0.7)'; c.lineWidth = 2;
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    const cores = ['#ffd27a', '#ff9fb8', '#9fe3ff', '#c6a8ff'];
    for (let i = 1; i < n; i += 2) {
      const [x, y] = pts[i];
      let on = R.fairy === 'on' ? 1 : R.fairy === 'flicker' ? (Math.sin(t * 9 + i * 1.7) > 0.2 || Math.random() < 0.3 ? 1 : 0.15) : 0;
      if (V.luzPisca) on = Math.random() < 0.5 ? 0 : 1;
      const col = cores[(i >> 1) % 4];
      if (on > 0.5) {
        c.fillStyle = rad(c, x, y + 8, 0, 26, [[0, col + 'aa'], [1, col + '00']]);
        c.beginPath(); c.arc(x, y + 8, 26, 0, 7); c.fill();
      }
      c.fillStyle = on > 0.5 ? col : '#5b4e57';
      c.beginPath(); c.ellipse(x, y + 8, 5, 8, 0, 0, 7); c.fill();
    }
  };

  A.relogio = function (c, R, t, V) {
    const k = LAY.relogio;
    c.save(); c.translate(k.x, k.y);
    c.fillStyle = 'rgba(40,20,30,0.25)'; c.beginPath(); c.arc(4, 5, k.r + 6, 0, 7); c.fill();
    c.fillStyle = '#f0c4d2'; c.beginPath(); c.arc(0, 0, k.r + 6, 0, 7); c.fill();
    c.fillStyle = '#fff8f4'; c.beginPath(); c.arc(0, 0, k.r - 2, 0, 7); c.fill();
    c.fillStyle = '#6c4b5c';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillRect(Math.cos(a) * (k.r - 10) - 2, Math.sin(a) * (k.r - 10) - 2, 4, 4); }
    let hh, mm;
    if (V.relogioGira) { hh = t * 9; mm = -t * 26; }
    else {
      const base = { p1: 18.5, p2: 20.2, p3: 23.4, p4: 3.1 }[V.stage] || 18.5;
      const hr = base + V.el / 3600000 * 20;
      hh = (hr / 12) * Math.PI * 2; mm = ((hr % 1)) * Math.PI * 2;
      if (V.stage === 'p4') mm = Math.floor(t) * 0.1047;
    }
    c.strokeStyle = '#3d2a35'; c.lineCap = 'round';
    c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(hh) * 20, -Math.cos(hh) * 20); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(mm) * 31, -Math.cos(mm) * 31); c.stroke();
    c.fillStyle = '#e46b8d'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    c.lineCap = 'butt';
    c.restore();
  };

  A.quadro = function (c, R, rot, t, V) {
    const q = LAY.quadro;
    c.save();
    c.translate(q.x, q.y - q.h / 2 - 20);
    // prego e fio
    c.fillStyle = '#555'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    c.rotate((rot * Math.PI) / 180);
    c.strokeStyle = '#6b5a60'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-q.w * 0.35, 30); c.lineTo(0, 0); c.lineTo(q.w * 0.35, 30); c.stroke();
    c.translate(0, 20 + q.h / 2);
    c.fillStyle = 'rgba(40,20,30,0.3)'; c.fillRect(-q.w / 2 + 6, -q.h / 2 + 8, q.w, q.h);
    c.fillStyle = '#9c6d4f'; c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
    c.fillStyle = '#c28e68'; c.fillRect(-q.w / 2 + 5, -q.h / 2 + 5, q.w - 10, q.h - 10);
    const ix = -q.w / 2 + 16, iy = -q.h / 2 + 16, iw = q.w - 32, ih = q.h - 32;
    // pintura: céu, sol, colina, casinha — muda com a decadência
    c.fillStyle = R.decay >= 2 ? '#4a3a52' : '#bfe2f2'; c.fillRect(ix, iy, iw, ih);
    c.fillStyle = R.decay >= 2 ? '#3a4a3c' : '#8fcf8a'; c.beginPath(); c.ellipse(0, iy + ih + 10, iw * 0.7, 44, 0, Math.PI, 0); c.fill();
    if (R.decay >= 3) {
      c.fillStyle = '#e8e2d0'; c.beginPath(); c.arc(40, iy + 28, 16, 0, 7); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(40, iy + 28, 7, 0, 7); c.fill();
    } else {
      c.fillStyle = R.decay >= 2 ? '#c9c4a0' : '#ffd766'; c.beginPath(); c.arc(40, iy + 28, 14, 0, 7); c.fill();
    }
    c.fillStyle = '#fff'; c.fillRect(-36, iy + ih - 44, 34, 26);
    c.fillStyle = '#e46b8d'; c.beginPath(); c.moveTo(-40, iy + ih - 44); c.lineTo(-19, iy + ih - 62); c.lineTo(2, iy + ih - 44); c.fill();
    // figurinha na janela da casinha
    if (R.decay >= 2) { c.fillStyle = '#111'; c.fillRect(-24, iy + ih - 38, 8, 10); }
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(ix, iy); c.lineTo(ix + 40, iy); c.lineTo(ix, iy + 50); c.fill();
    c.restore();
  };

  A.porta = function (c, R, abertura, t, V) {
    const p = LAY.porta;
    // batente
    c.fillStyle = '#efdde4'; c.fillRect(p.x - 16, p.y - 16, p.w + 32, p.h + 16);
    c.fillStyle = 'rgba(80,40,60,0.2)'; c.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 3);
    // vão escuro
    c.fillStyle = grad(c, 0, p.y, 0, p.y + p.h, [[0, '#15112a'], [0.6, '#0e0b1c'], [1, '#08060f']]); c.fillRect(p.x, p.y, p.w, p.h);
    if (V.portaFigura) V.portaFigura(c);
    // folha da porta (abrindo pra dentro, fica mais estreita)
    const w = p.w * (1 - abertura * 0.82);
    c.fillStyle = grad(c, p.x, 0, p.x + w, 0, [[0, '#b27e95'], [1, '#c291a7']]);
    c.fillRect(p.x, p.y, w, p.h);
    if (w > 40) {
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 3;
      c.strokeRect(p.x + w * 0.14, p.y + 34, w * 0.72, 190);
      c.strokeRect(p.x + w * 0.14, p.y + 270, w * 0.72, 210);
      c.strokeStyle = 'rgba(60,30,40,0.2)';
      c.strokeRect(p.x + w * 0.14 + 3, p.y + 37, w * 0.72, 190);
      c.strokeRect(p.x + w * 0.14 + 3, p.y + 273, w * 0.72, 210);
    }
    // maçaneta
    c.fillStyle = '#e8c56d'; c.beginPath(); c.arc(p.x + w - 22, p.y + 290, 9, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(p.x + w - 25, p.y + 287, 3, 0, 7); c.fill();
    // fresta de baixo
    c.fillStyle = V.frestaLuz ? 'rgba(255,220,170,0.7)' : 'rgba(0,0,0,0.6)';
    c.fillRect(p.x, p.y + p.h - 5, p.w, 5);
    if (V.pesSombra) {
      c.fillStyle = 'rgba(0,0,0,0.95)';
      c.fillRect(p.x + 44, p.y + p.h - 5, 30, 5); c.fillRect(p.x + 100, p.y + p.h - 5, 30, 5);
    }
    // interruptor
    const s = LAY.interruptor;
    c.fillStyle = '#f7eef1'; RR(c, s.x - 11, s.y - 17, 22, 34, 3); c.fill();
    c.strokeStyle = 'rgba(80,40,60,0.3)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#d9c9cf'; RR(c, s.x - 4, s.y + (R.ceil ? -9 : 1), 8, 8, 2); c.fill();
  };

  // tela do computador
  A.monitorTela = function (c, R, t, V) {
    const m = LAY.monitor;
    const x = m.x + 10, y = m.y + 12, w = m.w - 20, h = m.h - 24;
    c.save();
    c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (R.monitor === 'off' && !V.monitorLiga) {
      c.fillStyle = '#0c0b10'; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,0.04)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 70, y); c.lineTo(x, y + 90); c.fill();
      if (V.relogioPC) {
        // stand-by: só o reloginho
        const pisca = V.relogioPC === '04:00' && Math.sin(t * 8) > 0;
        c.textAlign = 'center';
        c.font = '800 44px "Courier New", monospace';
        c.fillStyle = pisca ? 'rgba(255,90,110,0.9)' : 'rgba(140,175,255,0.55)';
        c.shadowColor = pisca ? 'rgba(255,60,80,0.8)' : 'rgba(120,160,255,0.7)'; c.shadowBlur = 14;
        c.fillText(V.relogioPC, x + w / 2, y + h / 2 + 15);
        c.shadowBlur = 0; c.textAlign = 'left';
      }
      if (V.monitorReflexo) V.monitorReflexo(c, x, y, w, h);
    } else if (V.monitorLiga) {
      V.monitorLiga(c, x, y, w, h);
    } else {
      const glitch = R.monitor === 'glitch' || V.pcSegurando;
      c.fillStyle = '#1a1530'; c.fillRect(x, y, w, h);
      // "live" da Guima: miniatura + chat + views
      c.fillStyle = '#f07fa0'; A.rr(c, x + 8, y + 7, 62, 16, 4); c.fill();
      c.fillStyle = '#fff'; c.font = '800 10px "Nunito", sans-serif'; c.fillText('● AO VIVO', x + 13, y + 19);
      c.fillStyle = '#e8d9ff'; c.font = '700 12px "Nunito", sans-serif';
      const views = V.views || 0;
      c.fillText(views.toLocaleString('pt-BR') + ' assistindo', x + 78, y + 20);
      // vídeo
      c.fillStyle = '#2d2548'; c.fillRect(x + 8, y + 28, w * 0.58, h - 36);
      if (V.imgGuima) {
        c.globalAlpha = 0.9;
        c.drawImage(V.imgGuima, x + 8 + w * 0.29 - 26, y + 34, 52, 80);
        c.globalAlpha = 1;
      }
      // chat
      const msgs = V.chat || [];
      c.font = '600 10px "Nunito", sans-serif';
      msgs.slice(-6).forEach((m2, i) => {
        c.fillStyle = m2.c; c.fillText(m2.n + ':', x + w * 0.62, y + 40 + i * 17);
        c.fillStyle = m2.ruim ? '#ff5c7a' : '#ddd'; c.fillText(m2.m, x + w * 0.62 + c.measureText(m2.n + ': ').width, y + 40 + i * 17);
      });
      if (glitch) {
        for (let i = 0; i < 6; i++) {
          if (Math.random() < 0.5) continue;
          const gy = y + Math.random() * h;
          c.fillStyle = pickCor(); c.globalAlpha = 0.5;
          c.fillRect(x + (Math.random() - 0.5) * 30, gy, w * (0.3 + Math.random() * 0.7), 2 + Math.random() * 8);
          c.globalAlpha = 1;
        }
        if (V.pcSegurando) {
          c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x, y, w, h);
          c.fillStyle = '#ff4466'; const curto = Math.random() < 0.5; c.font = `900 ${curto ? 40 : 24}px "Nunito", sans-serif`; c.textAlign = 'center';
          c.fillText(curto ? 'NÃO' : 'NÃO ME DESLIGA', x + w / 2 + (Math.random() - 0.5) * 8, y + h / 2 + 12);
          c.textAlign = 'left';
          c.fillStyle = '#fff'; c.fillRect(x, y + h - 6, w * V.pcSegurando, 6);
        }
      }
      if (V.dicaPc) {
        c.fillStyle = 'rgba(10,8,20,0.8)'; c.fillRect(x, y + h - 26, w, 26);
        c.fillStyle = '#fff'; c.font = '700 12px "Nunito", sans-serif'; c.textAlign = 'center';
        c.fillText('segure o botão ⏻ para desligar', x + w / 2, y + h - 9); c.textAlign = 'left';
      }
      // linhas de tela
      c.fillStyle = 'rgba(0,0,0,0.12)';
      for (let yy = y; yy < y + h; yy += 3) c.fillRect(x, yy, w, 1);
    }
    c.restore();
    // botão de ligar/desligar (ícone ⏻)
    const b = m.botao, on = R.monitor !== 'off';
    c.save(); c.translate(b.x, b.y);
    c.fillStyle = on ? 'rgba(110,255,160,0.18)' : 'rgba(0,0,0,0.3)';
    c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill();
    c.strokeStyle = on ? '#8dffb5' : '#4a4358'; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 1, 5.5, -Math.PI / 2 + 0.7, Math.PI * 1.5 - 0.7); c.stroke();
    c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 0); c.stroke();
    c.lineCap = 'butt'; c.restore();
  };

  const CORES_G = ['#ff4d8a', '#4dffe1', '#ffffff', '#2a1a40', '#8a7dff'];
  const pickCor = () => CORES_G[Math.floor(Math.random() * CORES_G.length)];

  A.gaveta = function (c, R) {
    const g = LAY.gaveta;
    const o = R.drawer;
    const dy = o * 34, esc = 1 + o * 0.12;
    c.save();
    c.translate(g.x + g.w / 2, g.y + g.h / 2 + dy);
    c.scale(esc, esc);
    if (o > 0.05) {
      // interior + bagunça
      c.fillStyle = '#b89c89'; c.fillRect(-g.w / 2 + 4, -g.h / 2 - 26 * o, g.w - 8, 30 * o);
      c.fillStyle = '#f7f1e8'; c.fillRect(-g.w / 2 + 16, -g.h / 2 - 22 * o, 40, 16 * o);
      c.fillStyle = '#e46b8d'; c.fillRect(-g.w / 2 + 70, -g.h / 2 - 18 * o, 30, 12 * o);
    }
    c.fillStyle = '#f1e4d9'; RR(c, -g.w / 2, -g.h / 2, g.w, g.h, 5); c.fill();
    c.fillStyle = 'rgba(60,30,30,0.12)'; c.fillRect(-g.w / 2, g.h / 2 - 5, g.w, 5);
    c.fillStyle = '#b79a88'; RR(c, -20, -4, 40, 8, 4); c.fill();
    c.restore();
  };

  A.abajur = function (c, R, t, V, brilho) {
    const a = LAY.abajur;
    const x = a.x, base = a.base;
    // fio até a tomada
    const tp = LAY.tomada;
    c.strokeStyle = '#3b3036'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 20, base - 4);
    c.bezierCurveTo(x - 60, base + 20, tp.x + 30, tp.y + 60, tp.x + (R.plug ? 0 : 8), tp.y + (R.plug ? 10 : 34)); c.stroke();
    // plugue
    c.save(); c.translate(tp.x + (R.plug ? 0 : 8), tp.y + (R.plug ? 4 : 30)); c.rotate(R.plug ? 0 : 0.5);
    c.fillStyle = '#e9e4e6'; RR(c, -7, -8, 14, 16, 3); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.stroke();
    if (!R.plug) { c.fillStyle = '#b8a55a'; c.fillRect(-5, -14, 3, 7); c.fillRect(2, -14, 3, 7); }
    c.restore();
    // base e haste
    c.fillStyle = '#d7b4c2'; c.beginPath(); c.ellipse(x, base - 6, 32, 10, 0, 0, 7); c.fill();
    c.fillStyle = '#c59fb0'; c.fillRect(x - 4, base - 110, 8, 104);
    // cúpula
    const on = brilho > 0.05;
    c.fillStyle = on ? grad(c, 0, base - 170, 0, base - 100, [[0, '#ffe9b8'], [1, '#ffd490']]) : '#cdb3a0';
    c.beginPath(); c.moveTo(x - 40, base - 168); c.lineTo(x + 40, base - 168); c.lineTo(x + 62, base - 100); c.lineTo(x - 62, base - 100); c.fill();
    c.fillStyle = on ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.1)'; c.fillRect(x - 58, base - 106, 116, 6);
    // correntinha
    const ch = LAY.abajur.corrente;
    const puxa = (V.correnteLocal !== undefined ? V.correnteLocal : R.chain) * 46;
    c.strokeStyle = '#b8a26a'; c.lineWidth = 2; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(ch.x - 10, base - 100); c.lineTo(ch.x - 6, ch.y + puxa); c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#d9c079'; c.beginPath(); c.arc(ch.x - 6, ch.y + 4 + puxa, 4.5, 0, 7); c.fill();
  };

  A.ursinho = function (c, R, t, V) {
    const p = LAY.prateleira;
    const x = p.x + 44, y = p.y - 36;
    c.save(); c.translate(x, y);
    c.fillStyle = '#b98a68';
    c.beginPath(); c.ellipse(0, 18, 26, 22, 0, 0, 7); c.fill();
    const giro = V.ursoGiro || 0;
    c.save(); c.translate(0, -8); c.rotate(giro);
    c.beginPath(); c.arc(-15, -18, 9, 0, 7); c.arc(15, -18, 9, 0, 7); c.fill();
    c.beginPath(); c.arc(0, 0, 21, 0, 7); c.fill();
    c.fillStyle = '#e3c3a5'; c.beginPath(); c.ellipse(0, 6, 10, 8, 0, 0, 7); c.fill();
    c.fillStyle = '#2a1a14';
    if (giro > 0.5) { c.fillStyle = '#000'; c.beginPath(); c.arc(-7, -4, 5, 0, 7); c.arc(7, -4, 5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(-8, -5, 2, 2); c.fillRect(6, -5, 2, 2); }
    else { c.beginPath(); c.arc(-7, -4, 3, 0, 7); c.arc(7, -4, 3, 0, 7); c.fill(); }
    c.fillStyle = '#2a1a14'; c.beginPath(); c.arc(0, 3, 3, 0, 7); c.fill();
    c.restore();
    c.fillStyle = '#e46b8d'; c.beginPath(); c.moveTo(-10, 10); c.lineTo(10, 18); c.lineTo(10, 8); c.lineTo(-10, 18); c.fill();
    c.restore();
  };

  // travesseiro / cobertor
  A.travesseiro = function (c, x, y, fofo, noChao) {
    c.save(); c.translate(x, y);
    if (noChao) c.rotate(0.12);
    const sq = 1 + (fofo || 0) * 0.06;
    c.scale(sq, 1 / sq);
    c.fillStyle = 'rgba(40,20,30,0.25)'; c.beginPath(); c.ellipse(4, 26, 70, 12, 0, 0, 7); c.fill();
    c.fillStyle = grad(c, 0, -30, 0, 30, [[0, '#fff9fb'], [1, '#f0d9e1']]);
    c.beginPath();
    c.moveTo(-72, -18); c.quadraticCurveTo(0, -36, 72, -18); c.quadraticCurveTo(84, 0, 72, 22);
    c.quadraticCurveTo(0, 36, -72, 22); c.quadraticCurveTo(-84, 0, -72, -18); c.fill();
    c.strokeStyle = 'rgba(200,150,170,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-50, 2); c.quadraticCurveTo(0, 10, 50, 2); c.stroke();
    c.restore();
  };

  A.cobertor = function (c, R, puxado, cobrindo, t, respira) {
    const x0 = LAY.cama.x + 44, x1 = 1935;
    c.save();
    if (cobrindo) {
      // cobrindo a Guima (lombada do corpo)
      const r = respira || 0;
      c.fillStyle = grad(c, 0, 680, 0, 800, [[0, '#d9809f'], [1, '#b25f80']]);
      c.beginPath();
      c.moveTo(1612, 800); c.lineTo(1612, 736);
      c.quadraticCurveTo(1640, 700 - r * 4, 1700, 700 - r * 5);
      c.quadraticCurveTo(1790, 694 - r * 3, 1840, 716);
      c.quadraticCurveTo(1880, 704, x1, 712); c.lineTo(x1, 800); c.fill();
      c.fillStyle = '#fbeef2';
      c.beginPath(); c.moveTo(1606, 736); c.quadraticCurveTo(1640, 700 - r * 4, 1700, 700 - r * 5); c.lineTo(1702, 716 - r * 5); c.quadraticCurveTo(1644, 718 - r * 4, 1612, 752); c.fill();
      coracoes(c, 1650, 720, 1920, 800);
    } else {
      const inicio = lerp(1600, 1790, puxado);
      c.fillStyle = grad(c, 0, 700, 0, 800, [[0, '#d9809f'], [1, '#b25f80']]);
      RR(c, inicio, 706, x1 - inicio, 94, 10); c.fill();
      coracoes(c, inicio + 10, 720, x1, 800);
      // dobra branca
      c.fillStyle = '#fbeef2'; RR(c, inicio - 10, 700, 48 + puxado * 40, 100, 10); c.fill();
      c.fillStyle = 'rgba(180,120,140,0.3)'; c.fillRect(inicio + 30 + puxado * 40, 704, 5, 92);
    }
    c.restore();
  };
  function coracoes(c, x0, y0, x1, y1) {
    c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
    c.fillStyle = 'rgba(255,230,240,0.35)';
    for (let x = x0 + 16; x < x1; x += 46) for (let y = y0 + 14; y < y1; y += 34) {
      const xx = x + ((y / 34) % 2) * 23;
      c.beginPath(); c.arc(xx - 4, y, 5, 0, 7); c.arc(xx + 4, y, 5, 0, 7); c.moveTo(xx - 9, y + 2); c.lineTo(xx, y + 11); c.lineTo(xx + 9, y + 2); c.fill();
    }
    c.restore();
  }

  // roupas, livros e papéis no chão
  A.roupa = function (c, o, t) {
    c.save(); c.translate(o.x, o.y);
    c.fillStyle = 'rgba(30,10,20,0.3)'; c.beginPath(); c.ellipse(0, 18, 58, 10, 0, 0, 7); c.fill();
    if (o.id === 'camiseta') {
      c.rotate(-0.2);
      c.fillStyle = '#7fc1e0';
      c.beginPath(); c.moveTo(-30, -26); c.lineTo(-56, -10); c.lineTo(-44, 6); c.lineTo(-30, -2); c.lineTo(-30, 26); c.lineTo(30, 26); c.lineTo(30, -2); c.lineTo(44, 6); c.lineTo(56, -10); c.lineTo(30, -26); c.quadraticCurveTo(0, -12, -30, -26); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 4, 8, 0, 7); c.fill();
    } else if (o.id === 'meia') {
      c.rotate(0.5);
      c.fillStyle = '#f4f0f2'; RR(c, -10, -30, 22, 40, 6); c.fill();
      c.beginPath(); c.ellipse(10, 12, 20, 12, 0, 0, 7); c.fill();
      c.fillStyle = '#e46b8d'; c.fillRect(-10, -30, 22, 7); c.fillRect(-10, -18, 22, 4);
    } else {
      c.rotate(0.12);
      c.fillStyle = '#4f5d8f';
      c.beginPath(); c.moveTo(-40, -20); c.lineTo(40, -20); c.lineTo(50, 22); c.lineTo(6, 22); c.lineTo(0, 0); c.lineTo(-6, 22); c.lineTo(-50, 22); c.fill();
      c.fillStyle = '#3d4876'; c.fillRect(-40, -20, 80, 8);
    }
    c.restore();
  };
  A.livro = function (c, o) {
    c.save(); c.translate(o.x, o.y); c.rotate(o.r || 0);
    c.fillStyle = 'rgba(30,10,20,0.3)'; c.fillRect(-30, 8, 66, 10);
    c.fillStyle = o.c || '#6f86c9'; RR(c, -32, -20, 64, 30, 3); c.fill();
    c.fillStyle = '#f7f1e8'; c.fillRect(-30, 2, 60, 6);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-28, -14, 30, 4);
    c.restore();
  };
  A.papel = function (c, o) {
    c.save(); c.translate(o.x, o.y); c.rotate((o.x % 7) * 0.4);
    c.fillStyle = 'rgba(30,10,20,0.25)'; c.fillRect(-14, 4, 30, 6);
    c.fillStyle = '#ece6da';
    c.beginPath(); c.moveTo(-16, -10); c.lineTo(8, -14); c.lineTo(16, -2); c.lineTo(10, 12); c.lineTo(-8, 10); c.lineTo(-18, 2); c.fill();
    c.strokeStyle = 'rgba(40,20,30,0.5)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-8, -4); c.lineTo(6, -6); c.moveTo(-10, 2); c.quadraticCurveTo(0, 6, 8, 1); c.stroke();
    c.restore();
  };

  // ------------------------------------------------------------------
  //  ILUMINAÇÃO: escuridão com "furos" de luz
  // ------------------------------------------------------------------
  let luzCv = null;
  A.luz = function (c, V) {
    if (V.escuro <= 0.01) return;
    if (!luzCv) luzCv = novoCanvas(480, 270);
    const l = luzCv.getContext('2d');
    const k = 0.25;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, 480, 270);
    l.fillStyle = `rgba(${V.corEscuro || '8,6,22'},${V.escuro})`;
    l.fillRect(0, 0, 480, 270);
    l.globalCompositeOperation = 'destination-out';
    for (const f of V.luzes) {
      if (f.i <= 0.01) continue;
      l.fillStyle = rad(l, f.x * k, f.y * k, 0, f.r * k, [[0, `rgba(0,0,0,${f.i})`], [0.5, `rgba(0,0,0,${f.i * 0.5})`], [1, 'rgba(0,0,0,0)']]);
      l.beginPath(); l.arc(f.x * k, f.y * k, f.r * k, 0, 7); l.fill();
    }
    c.save();
    c.imageSmoothingEnabled = true;
    c.drawImage(luzCv, 0, 0, 1920, 1080);
    c.restore();
    // brilho colorido por cima (aditivo)
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const f of V.luzes) {
      if (!f.cor || f.i <= 0.01) continue;
      c.fillStyle = rad(c, f.x, f.y, 0, f.r * 0.7, [[0, `rgba(${f.cor},${0.18 * f.i})`], [1, `rgba(${f.cor},0)`]]);
      c.beginPath(); c.arc(f.x, f.y, f.r * 0.7, 0, 7); c.fill();
    }
    c.restore();
  };
})();
