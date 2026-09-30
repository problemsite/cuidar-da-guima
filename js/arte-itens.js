// =====================================================================
//  ARTE — ITENS FLUTUANTES (fase 1), AMEAÇAS (fase 4), HUD e partículas
// =====================================================================
(function () {
  const G = (window.G = window.G || {});
  const A = (G.Arte = G.Arte || {});
  const { clamp, lerp } = G.util;
  const RR = (...a) => A.rr(...a);
  const P = Math.PI;

  function circ(c, x, y, r, cor) { c.fillStyle = cor; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  function brilho(c, x, y, r) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(x, y, r, r * 0.6, -0.6, 0, 7); c.fill(); }

  // cada item é desenhado centrado em (0,0), ~100px
  const ITENS = {
    cupcake(c, t) {
      c.fillStyle = '#f6a5c0';
      c.beginPath(); c.moveTo(-30, 0); c.lineTo(30, 0); c.lineTo(22, 40); c.lineTo(-22, 40); c.fill();
      c.strokeStyle = '#e07fa0'; c.lineWidth = 3;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 11, 2); c.lineTo(i * 8, 38); c.stroke(); }
      circ(c, -18, -6, 16, '#fff3f7'); circ(c, 18, -6, 16, '#fff3f7'); circ(c, 0, -14, 20, '#fff3f7'); circ(c, 0, -30, 13, '#fff3f7');
      circ(c, 0, -46, 9, '#e8334f'); brilho(c, -3, -49, 3);
      c.strokeStyle = '#4b8a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -54); c.quadraticCurveTo(6, -64, 12, -62); c.stroke();
      ['#7ad', '#fd6', '#f7a', '#8d8', '#c9f'].forEach((col, i) => { c.fillStyle = col; c.save(); c.translate(-18 + i * 9, -18 + (i % 2) * 10); c.rotate(i); c.fillRect(-3, -1, 6, 2.5); c.restore(); });
    },
    maca(c) {
      c.fillStyle = '#e8333f';
      c.beginPath(); c.arc(-12, 4, 24, 0, 7); c.arc(12, 4, 24, 0, 7); c.fill();
      c.beginPath(); c.arc(0, 18, 20, 0, 7); c.fill();
      brilho(c, -16, -6, 8);
      c.strokeStyle = '#6b4226'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(2, -30, 6, -34); c.stroke();
      c.fillStyle = '#5bb04a'; c.beginPath(); c.ellipse(14, -28, 12, 6, -0.5, 0, 7); c.fill();
    },
    pizza(c) {
      c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(0, 42); c.lineTo(-36, -30); c.quadraticCurveTo(0, -44, 36, -30); c.fill();
      c.fillStyle = '#d68a3a'; c.beginPath(); c.moveTo(-38, -30); c.quadraticCurveTo(0, -48, 38, -30); c.quadraticCurveTo(0, -36, -38, -30); c.fill();
      RR(c, -40, -40, 80, 12, 6); c.fill();
      [[-10, -14], [12, -6], [0, 14], [-16, -28]].forEach(([x, y]) => { circ(c, x, y, 7, '#c9362f'); circ(c, x - 2, y - 2, 2, 'rgba(255,255,255,0.4)'); });
    },
    cafe(c, t) {
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { c.beginPath(); const x = -12 + i * 12; c.moveTo(x, -26); c.bezierCurveTo(x + Math.sin(t * 3 + i) * 8, -38, x - 6, -46, x + Math.sin(t * 2 + i) * 6, -58); c.stroke(); }
      c.fillStyle = '#fbe9ef'; RR(c, -26, -20, 52, 50, 10); c.fill();
      c.strokeStyle = '#fbe9ef'; c.lineWidth = 7; c.beginPath(); c.arc(28, 4, 12, -1.3, 1.3); c.stroke();
      c.fillStyle = '#6b3d26'; c.beginPath(); c.ellipse(0, -18, 24, 6, 0, 0, 7); c.fill();
      c.fillStyle = '#f07fa0'; c.beginPath(); c.arc(-4, 6, 6, 0, 7); c.arc(4, 6, 6, 0, 7); c.moveTo(-10, 8); c.lineTo(0, 18); c.lineTo(10, 8); c.fill();
    },
    pente(c) {
      c.rotate(-0.3);
      c.fillStyle = '#b48cf0'; RR(c, -44, -18, 88, 18, 8); c.fill();
      c.fillStyle = '#a078e0';
      for (let i = 0; i < 13; i++) RR(c, -40 + i * 6.4, -2, 3.6, 30, 1.5), c.fill();
      brilho(c, -20, -12, 10);
    },
    ursinho(c) {
      circ(c, -22, -24, 11, '#c28b61'); circ(c, 22, -24, 11, '#c28b61');
      circ(c, -22, -24, 6, '#e8c3a0'); circ(c, 22, -24, 6, '#e8c3a0');
      circ(c, 0, 0, 32, '#c28b61');
      c.fillStyle = '#e8c3a0'; c.beginPath(); c.ellipse(0, 10, 14, 11, 0, 0, 7); c.fill();
      circ(c, -11, -6, 4, '#2a1a14'); circ(c, 11, -6, 4, '#2a1a14'); circ(c, 0, 5, 4, '#2a1a14');
      circ(c, -20, 8, 5, 'rgba(255,120,150,0.4)'); circ(c, 20, 8, 5, 'rgba(255,120,150,0.4)');
      c.fillStyle = '#f07fa0'; c.beginPath(); c.moveTo(-12, 30); c.lineTo(12, 40); c.lineTo(12, 26); c.lineTo(-12, 40); c.fill();
    },
    flor(c, t) {
      c.strokeStyle = '#4f9a4a'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 44); c.quadraticCurveTo(-6, 10, 0, -10); c.stroke();
      c.fillStyle = '#5bb04a'; c.beginPath(); c.ellipse(-12, 24, 12, 5, -0.6, 0, 7); c.fill();
      c.fillStyle = '#ff7aa0';
      for (let i = 0; i < 6; i++) { c.save(); c.translate(0, -24); c.rotate((i / 6) * P * 2 + t * 0.3); c.beginPath(); c.ellipse(0, -14, 9, 15, 0, 0, 7); c.fill(); c.restore(); }
      circ(c, 0, -24, 9, '#ffd84a');
    },
    presente(c) {
      c.fillStyle = '#6fc6e8'; RR(c, -32, -14, 64, 50, 5); c.fill();
      c.fillStyle = '#8fd8f4'; RR(c, -36, -24, 72, 16, 4); c.fill();
      c.fillStyle = '#f07fa0'; c.fillRect(-6, -24, 12, 60);
      c.beginPath(); c.ellipse(-12, -32, 13, 8, -0.4, 0, 7); c.ellipse(12, -32, 13, 8, 0.4, 0, 7); c.fill();
      circ(c, 0, -28, 6, '#e0507a');
    },
    carta(c) {
      c.fillStyle = '#fff6ef'; RR(c, -38, -24, 76, 50, 4); c.fill();
      c.strokeStyle = '#e8cfc2'; c.lineWidth = 2; c.beginPath(); c.moveTo(-38, -24); c.lineTo(0, 6); c.lineTo(38, -24); c.stroke();
      c.fillStyle = '#e8334f'; c.beginPath(); c.arc(-5, 2, 7, 0, 7); c.arc(5, 2, 7, 0, 7); c.moveTo(-12, 4); c.lineTo(0, 16); c.lineTo(12, 4); c.fill();
    },
    celular(c, t) {
      c.fillStyle = '#2a2433'; RR(c, -24, -42, 48, 84, 9); c.fill();
      c.fillStyle = '#ff6f91'; RR(c, -19, -34, 38, 66, 4); c.fill();
      c.fillStyle = '#fff'; c.font = '900 13px Nunito, sans-serif'; c.textAlign = 'center';
      c.fillText('+' + (1 + Math.floor(t * 3) % 9) + 'K', 0, -12);
      c.beginPath(); c.arc(-5, 6, 6, 0, 7); c.arc(5, 6, 6, 0, 7); c.moveTo(-11, 8); c.lineTo(0, 20); c.lineTo(11, 8); c.fill();
      c.textAlign = 'left';
    },
    fone(c) {
      c.strokeStyle = '#7a5ce0'; c.lineWidth = 8; c.beginPath(); c.arc(0, 4, 32, P * 1.05, P * 1.95); c.stroke();
      c.fillStyle = '#9b80f0'; RR(c, -44, -2, 20, 36, 8); c.fill(); RR(c, 24, -2, 20, 36, 8); c.fill();
      c.fillStyle = '#ffd84a'; RR(c, -40, 4, 10, 24, 4); c.fill(); RR(c, 30, 4, 10, 24, 4); c.fill();
    },
    sorvete(c) {
      c.fillStyle = '#e3a55a'; c.beginPath(); c.moveTo(-20, 0); c.lineTo(20, 0); c.lineTo(0, 48); c.fill();
      c.strokeStyle = '#c4843a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, 8); c.lineTo(8, 30); c.moveTo(14, 8); c.lineTo(-8, 30); c.stroke();
      circ(c, 0, -8, 20, '#ffb3c9'); circ(c, 0, -30, 16, '#fff0c8');
      circ(c, 0, -46, 6, '#e8334f'); brilho(c, -8, -14, 5);
    },
    estrela(c, t) {
      c.fillStyle = '#ffd84a'; c.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 40; const a = -P / 2 + (i * P) / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.fill();
      circ(c, -8, -2, 3, '#5a3a14'); circ(c, 8, -2, 3, '#5a3a14');
      c.strokeStyle = '#5a3a14'; c.lineWidth = 2; c.beginPath(); c.arc(0, 4, 6, 0.2, P - 0.2); c.stroke();
    },
    brigadeiro(c) {
      c.fillStyle = '#c9a0d8'; c.beginPath(); c.moveTo(-26, 4); c.lineTo(26, 4); c.lineTo(20, 30); c.lineTo(-20, 30); c.fill();
      c.strokeStyle = '#b088c4'; c.lineWidth = 2; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 7, 5); c.lineTo(i * 5.5, 29); c.stroke(); }
      circ(c, 0, -8, 24, '#5b3322');
      ['#f7c', '#7df', '#fd6', '#fff', '#f96'].forEach((col, i) => { c.fillStyle = col; for (let k = 0; k < 3; k++) c.fillRect(-16 + ((i * 7 + k * 13) % 32), -24 + ((i * 11 + k * 5) % 28), 4, 2); });
      brilho(c, -9, -18, 6);
    },
    // ---------------- RUINS ----------------
    faca(c) {
      c.rotate(-0.7);
      c.fillStyle = A.grad(c, 0, -10, 0, 10, [[0, '#f2f4f8'], [0.5, '#b9c0cc'], [1, '#8b93a0']]);
      c.beginPath(); c.moveTo(-8, -9); c.lineTo(58, -9); c.quadraticCurveTo(70, -4, 72, 8); c.lineTo(-8, 8); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(0, -7, 60, 2);
      c.fillStyle = '#231c1c'; RR(c, -52, -10, 46, 20, 5); c.fill();
      circ(c, -40, 0, 2.5, '#aaa'); circ(c, -26, 0, 2.5, '#aaa'); circ(c, -12, 0, 2.5, '#aaa');
      c.fillStyle = '#5d5656'; c.fillRect(-10, -12, 6, 24);
    },
    tesoura(c) {
      c.rotate(0.4);
      c.fillStyle = '#cfd4dc';
      c.save(); c.rotate(0.18); c.beginPath(); c.moveTo(0, -4); c.lineTo(58, -2); c.lineTo(0, 5); c.fill(); c.restore();
      c.save(); c.rotate(-0.18); c.beginPath(); c.moveTo(0, -5); c.lineTo(58, 2); c.lineTo(0, 4); c.fill(); c.restore();
      circ(c, 0, 0, 4, '#777');
      c.strokeStyle = '#d63a4a'; c.lineWidth = 7;
      c.beginPath(); c.ellipse(-24, -14, 13, 9, 0.4, 0, 7); c.stroke();
      c.beginPath(); c.ellipse(-24, 14, 13, 9, -0.4, 0, 7); c.stroke();
    },
    vidro(c, t) {
      c.fillStyle = 'rgba(190,230,245,0.55)'; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-10, -48); c.lineTo(24, -20); c.lineTo(16, 30); c.lineTo(-4, 46); c.lineTo(-22, 8); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.moveTo(-6, -36); c.lineTo(8, 10); c.stroke();
      c.fillStyle = 'rgba(160,0,20,0.5)'; c.beginPath(); c.arc(-3, 40, 4, 0, 7); c.fill();
    },
    macaPodre(c, t) {
      c.fillStyle = '#7a6a2e';
      c.beginPath(); c.arc(-12, 4, 24, 0, 7); c.arc(12, 4, 24, 0, 7); c.arc(0, 18, 20, 0, 7); c.fill();
      [[-14, -2, 8], [10, 12, 10], [-4, 20, 6], [16, -6, 5]].forEach(([x, y, r]) => circ(c, x, y, r, '#3e3212'));
      c.strokeStyle = '#3b2a1a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -18); c.lineTo(-4, -32); c.stroke();
      // verme
      c.strokeStyle = '#e8a0a8'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(10, 12); c.quadraticCurveTo(24 + Math.sin(t * 5) * 4, 4, 30, 14 + Math.cos(t * 5) * 4); c.stroke(); c.lineCap = 'butt';
      for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2; circ(c, Math.cos(a) * 40, -30 + Math.sin(a * 1.3) * 16, 2.5, '#111'); }
    },
    cartaRasgada(c) {
      c.fillStyle = '#2b2530';
      c.beginPath(); c.moveTo(-38, -24); c.lineTo(-2, -24); c.lineTo(-8, -8); c.lineTo(2, 4); c.lineTo(-6, 26); c.lineTo(-38, 26); c.fill();
      c.save(); c.translate(8, 6); c.rotate(0.25);
      c.beginPath(); c.moveTo(0, -30); c.lineTo(36, -30); c.lineTo(36, 20); c.lineTo(2, 20); c.lineTo(8, 0); c.lineTo(-2, -12); c.fill(); c.restore();
      c.fillStyle = '#8a1a2a'; c.beginPath(); c.arc(-18, 0, 6, 0, 7); c.fill();
      c.strokeStyle = '#6b1a28'; c.lineWidth = 2; c.beginPath(); c.moveTo(-30, -14); c.lineTo(-10, -12); c.stroke();
    },
    celularOdio(c, t) {
      c.fillStyle = '#2a2433'; RR(c, -24, -42, 48, 84, 9); c.fill();
      c.fillStyle = '#300a12'; RR(c, -19, -34, 38, 66, 4); c.fill();
      for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#ff3355' : '#aa2233'; c.fillRect(-15, -28 + i * 12, 20 + ((i * 7) % 10), 5); }
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-10, -34); c.lineTo(0, -10); c.lineTo(-8, 8); c.lineTo(6, 30); c.moveTo(0, -10); c.lineTo(16, -2); c.stroke();
      c.fillStyle = '#ff2244'; c.font = '900 16px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('✕', 10, -16); c.textAlign = 'left';
    },
    boneca(c, t) {
      c.fillStyle = '#3a2a22';
      c.beginPath(); c.arc(0, -4, 34, P, 0); c.lineTo(38, 30); c.lineTo(-38, 30); c.fill();
      circ(c, 0, 0, 28, '#efe6de');
      c.strokeStyle = '#6a5a52'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-6, -28); c.lineTo(-2, -12); c.lineTo(-10, -2); c.lineTo(-4, 8); c.moveTo(-2, -12); c.lineTo(10, -6); c.stroke();
      circ(c, -10, -2, 7, '#111'); circ(c, -10, -2, 2, '#fff');
      c.fillStyle = '#6a3a3a'; c.beginPath(); c.arc(11, -2, 6, 0, 7); c.fill();
      c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(6, -6); c.lineTo(16, 2); c.moveTo(16, -6); c.lineTo(6, 2); c.stroke();
      c.fillStyle = '#b33'; c.beginPath(); c.arc(0, 14, 4, 0, P); c.fill();
    },
    fosforo(c, t) {
      c.rotate(0.3);
      c.fillStyle = '#e7c998'; c.fillRect(-4, -18, 8, 70);
      circ(c, 0, -22, 8, '#b8232f');
      const f = 1 + Math.sin(t * 20) * 0.1 + Math.sin(t * 13) * 0.08;
      c.fillStyle = A.rad(c, 0, -34, 0, 30 * f, [[0, 'rgba(255,240,180,1)'], [0.4, 'rgba(255,150,40,0.9)'], [1, 'rgba(255,60,0,0)']]);
      c.beginPath(); c.moveTo(-10 * f, -26); c.quadraticCurveTo(-12, -50 * f, 0, -64 * f); c.quadraticCurveTo(12, -50 * f, 10 * f, -26); c.fill();
    },
    aranha(c, t) {
      c.strokeStyle = '#111'; c.lineWidth = 3.5;
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
        const w = Math.sin(t * 12 + i + (s > 0 ? 1 : 0)) * 0.2;
        c.beginPath(); c.moveTo(0, 0);
        c.quadraticCurveTo(s * 26, -14 + i * 9 + w * 20, s * 40, 4 + i * 11 + w * 12); c.stroke();
      }
      circ(c, 0, 8, 17, '#141014'); circ(c, 0, -10, 11, '#1c161c');
      circ(c, -4, -12, 2.5, '#d22'); circ(c, 4, -12, 2.5, '#d22'); circ(c, -2, -7, 1.5, '#d22'); circ(c, 2, -7, 1.5, '#d22');
      c.fillStyle = '#b22'; c.beginPath(); c.moveTo(0, 2); c.lineTo(5, 9); c.lineTo(0, 16); c.lineTo(-5, 9); c.fill();
    },
  };
  A.ITENS = ITENS;

  A.item = function (c, kind, x, y, rot, esc, t, halo) {
    c.save(); c.translate(x, y);
    if (halo > 0) {
      c.fillStyle = A.rad(c, 0, 0, 10, 80, [[0, `rgba(255,250,245,${0.55 * halo})`], [0.6, `rgba(255,235,245,${0.22 * halo})`], [1, 'rgba(255,235,245,0)']]);
      c.beginPath(); c.arc(0, 0, 80, 0, 7); c.fill();
    }
    c.rotate(rot); c.scale(esc * 1.25, esc * 1.25);
    (ITENS[kind] || ITENS.estrela)(c, t);
    c.restore();
  };

  // ------------------------------------------------------------------
  //  AMEAÇAS (fase 4). a = alpha de aparição, dano = 0..1 tremendo
  // ------------------------------------------------------------------
  A.ameaca = function (c, k, pos, a, t, idade, tremor, th) {
    c.save();
    c.globalAlpha *= a;
    const tx = tremor ? (Math.random() - 0.5) * 14 * tremor : 0;
    c.translate(tx, 0);
    const olho = (x, y, r, cor) => {
      c.fillStyle = A.rad(c, x, y, 0, r * 4, [[0, (cor || '255,240,220') .replace(/^/, 'rgba(') + ',0.35)'], [1, 'rgba(0,0,0,0)']]);
      c.beginPath(); c.arc(x, y, r * 4, 0, 7); c.fill();
      c.fillStyle = `rgb(${cor || '255,240,220'})`; c.beginPath(); c.ellipse(x, y, r, r * 0.7, 0, 0, 7); c.fill();
    };
    if (k === 'porta') {
      // figura alta no vão da porta
      A.silhueta(c, pos.x + 10, pos.y + 40, 1.25, '#000', null, t);
      olho(pos.x - 6, pos.y - 150, 6.5); olho(pos.x + 26, pos.y - 150, 6.5);
      c.fillStyle = '#d8d0c8';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(pos.x + 72, pos.y - 30 + i * 12, 16, 4, 0.1, 0, 7); c.fill(); }
    } else if (k === 'janela') {
      // o rosto dela, colado no vidro, no vão da cortina
      if (A.imgGuima) A.rostoGrande(c, pos.x, pos.y + 20, 0.42, { t, distorce: 0.85, olhosPretos: 1, inclina: 8 + Math.sin(t) * 3, filtro: 'grayscale(0.9) brightness(0.8) contrast(1.4)', alpha: 0.95 });
      c.fillStyle = 'rgba(215,210,200,0.85)';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(pos.x - 62 + i * 6, pos.y - 10 + i * 18, 5, 16, 0.4, 0, 7); c.fill(); }
    } else if (k === 'cama') {
      // braços saindo de baixo da cama, rastejando pelo chão
      const cres = clamp(idade / 7000, 0, 1);
      for (let m = 0; m < 3; m++) {
        const bx = pos.x - 120 + m * 150, by = 888 + m * 6;
        const l = 50 + cres * 150 + Math.sin(t * 2 + m) * 10;
        const hx = bx - l, hy = by + 26 + m * 10;
        c.fillStyle = '#050305';
        c.beginPath(); c.moveTo(bx + 10, by - 6); c.quadraticCurveTo(bx - l * 0.5, by + 2, hx + 10, hy - 8);
        c.lineTo(hx + 10, hy + 8); c.quadraticCurveTo(bx - l * 0.5, by + 16, bx + 10, by + 10); c.fill();
        c.beginPath(); c.ellipse(hx, hy, 18, 11, 0.1, 0, 7); c.fill();
        c.strokeStyle = '#050305'; c.lineWidth = 4.5; c.lineCap = 'round';
        for (let d = 0; d < 4; d++) {
          const a = -0.35 + d * 0.22, len = 30 + (d === 1 || d === 2 ? 8 : 0);
          const dobra = Math.sin(t * 4 + d + m) * 4;
          c.beginPath(); c.moveTo(hx - 8, hy - 6 + d * 4);
          c.quadraticCurveTo(hx - 8 - len * 0.6, hy - 8 + d * 5 + dobra, hx - 8 - len * Math.cos(a), hy + Math.sin(a) * len + 4);
          c.stroke();
        }
        c.beginPath(); c.moveTo(hx + 4, hy + 8); c.quadraticCurveTo(hx - 6, hy + 22, hx - 20, hy + 20); c.stroke();
        c.lineCap = 'butt';
      }
      olho(pos.x - 30, 874, 3.5, '255,40,40'); olho(pos.x - 12, 874, 3.5, '255,40,40');
    } else if (k === 'espelho') {
      c.save();
      const e = G.LAY.espelho;
      c.beginPath(); A.formaEspelho(c, e.x + 14, e.y + 14, e.w - 28, e.h - 28); c.clip();
      A.silhueta(c, pos.x, pos.y + 110, 0.95, '#000', null, t);
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(pos.x - 22, pos.y - 20); c.quadraticCurveTo(pos.x, pos.y - 2, pos.x + 22, pos.y - 20); c.quadraticCurveTo(pos.x, pos.y - 10, pos.x - 22, pos.y - 20); c.fill();
      olho(pos.x - 14, pos.y - 34, 4); olho(pos.x + 14, pos.y - 34, 4);
      c.restore();
    } else if (k === 'canto') {
      c.fillStyle = A.grad(c, 0, 100, 0, 800, [[0, 'rgba(0,0,0,0.95)'], [1, 'rgba(0,0,0,0.6)']]);
      c.beginPath(); c.moveTo(0, 90); c.quadraticCurveTo(70, 110, 76, 200); c.quadraticCurveTo(90, 300, 70, 420); c.lineTo(88, 800); c.lineTo(0, 800); c.fill();
      c.beginPath(); c.ellipse(52, 170, 34, 70, 0.1, 0, 7); c.fill();
      olho(46, 150, 4); olho(66, 154, 4);
      c.strokeStyle = '#000'; c.lineWidth = 5;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(70, 380); c.quadraticCurveTo(120 + i * 8, 400 + i * 20, 104 + i * 12, 470 + i * 12 + Math.sin(t * 2 + i) * 6); c.stroke(); }
    } else if (k === 'teto') {
      for (let i = 0; i < 7; i++) {
        const x = pos.x - 170 + i * 58 + Math.sin(i * 3) * 18, y = pos.y + Math.cos(i * 2) * 20;
        const ab = clamp((idade - i * 180) / 500, 0, 1) * (0.7 + 0.3 * Math.abs(Math.sin(t * 0.7 + i)));
        c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, 20, 12, 0, 0, 7); c.fill();
        c.fillStyle = '#efe6d6'; c.beginPath(); c.ellipse(x, y, 16, 9 * ab, 0, 0, 7); c.fill();
        c.fillStyle = '#300'; c.beginPath(); c.arc(x + Math.sin(t + i) * 4, y, 5 * ab, 0, 7); c.fill();
      }
    } else if (k === 'monitor') {
      const m = G.LAY.monitor;
      c.save(); c.beginPath(); c.rect(m.x + 10, m.y + 12, m.w - 20, m.h - 24); c.clip();
      c.fillStyle = '#111'; c.fillRect(m.x, m.y, m.w, m.h);
      for (let i = 0; i < 200; i++) { c.fillStyle = Math.random() < 0.5 ? '#ccc' : '#333'; c.fillRect(m.x + Math.random() * m.w, m.y + Math.random() * m.h, 3, 2); }
      if (A.imgGuima) A.rostoGrande(c, pos.x, pos.y + 10, 0.33, { t, distorce: 0.7, olhosPretos: 1, filtro: 'grayscale(1) contrast(1.6)' });
      c.restore();
    } else if (k === 'criado') {
      c.fillStyle = '#000';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(pos.x + 60, pos.y - 70 + i * 12, 14, 4, -0.2, 0, 7); c.fill(); }
      c.beginPath(); c.ellipse(pos.x + 78, pos.y - 30, 26, 40, 0, 0, 7); c.fill();
      olho(pos.x + 70, pos.y - 36, 3.5, '255,40,40'); olho(pos.x + 86, pos.y - 36, 3.5, '255,40,40');
    } else if (k === 'rastejante') {
      // coisinha de quatro, rastejando pelo chão até a cama
      c.save(); c.translate(pos.x, pos.y);
      const passo = Math.sin(idade / 110);
      c.fillStyle = '#040204'; c.strokeStyle = '#040204'; c.lineCap = 'round';
      c.beginPath(); c.ellipse(0, -14, 46, 18, 0.05, 0, 7); c.fill();
      c.beginPath(); c.ellipse(46, -24, 18, 20, 0, 0, 7); c.fill();
      c.lineWidth = 7;
      [[-30, 1], [-10, -1], [20, 1], [38, -1]].forEach(([bx, sgn]) => {
        const p = passo * sgn;
        c.beginPath(); c.moveTo(bx, -14); c.quadraticCurveTo(bx + 10 + p * 10, -44, bx + 22 + p * 14, 6); c.stroke();
      });
      c.lineWidth = 3;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(38 + i * 3, -40); c.lineTo(34 + i * 4, -8 + Math.sin(t * 3 + i) * 3); c.stroke(); }
      olho(40, -26, 3.5, '255,240,220'); olho(54, -26, 3.5, '255,240,220');
      c.lineCap = 'butt';
      c.restore();
    } else if (k === 'pendurada') {
      // alguém de cabeça pra baixo descendo do teto em cima da cama
      c.save(); c.translate(pos.x, pos.y);
      c.strokeStyle = '#040204'; c.fillStyle = '#040204'; c.lineCap = 'round';
      c.lineWidth = 2; c.beginPath(); c.moveTo(0, -pos.y); c.lineTo(0, -150); c.stroke();
      // pernas amarradas subindo
      c.lineWidth = 9;
      c.beginPath(); c.moveTo(-8, -60); c.lineTo(-4, -150); c.moveTo(8, -60); c.lineTo(4, -150); c.stroke();
      // tronco (quadril em cima, ombros embaixo)
      c.beginPath(); c.moveTo(-16, -64); c.lineTo(16, -64); c.quadraticCurveTo(30, -10, 26, 16); c.lineTo(-26, 16); c.quadraticCurveTo(-30, -10, -16, -64); c.fill();
      // braços pendurados balançando
      c.lineWidth = 6;
      const bal = Math.sin(t * 1.6) * 8;
      c.beginPath(); c.moveTo(-24, 8); c.quadraticCurveTo(-36 + bal, 50, -30 + bal * 1.5, 96); c.moveTo(24, 8); c.quadraticCurveTo(36 + bal, 50, 30 + bal * 1.5, 96); c.stroke();
      // cabeça embaixo, cabelo caindo
      c.beginPath(); c.ellipse(0, 40, 20, 24, 0, 0, 7); c.fill();
      for (let i = 0; i < 11; i++) { c.lineWidth = 2; c.beginPath(); c.moveTo(-16 + i * 3.2, 56); c.lineTo(-20 + i * 4 + Math.sin(t * 2 + i) * 4, 120 + (i % 4) * 14); c.stroke(); }
      olho(-8, 40, 3.5, '255,250,230'); olho(8, 40, 3.5, '255,250,230');
      c.lineCap = 'butt';
      c.restore();
    } else if (k === 'chefe') {
      // o inimigo difícil: uma sombra enorme se arrastando pelo chão, desfazendo a cada clique
      const vida = th && th.max ? clamp(th.hp / th.max, 0, 1) : 1;
      const n = th ? th.n || 0 : 0;
      const esc = 1.1 + n * 0.15;
      c.save(); c.translate(pos.x, pos.y); c.scale(esc, esc);
      const puxa = Math.sin(idade / 300), puxa2 = Math.sin(idade / 300 + 1.6);
      const L = 100 + vida * 90;
      // névoa escura em volta (várias camadas)
      for (let i = 0; i < 4; i++) {
        c.fillStyle = `rgba(0,0,0,${0.18 + vida * 0.1})`;
        c.beginPath(); c.ellipse(-L * 0.5 + Math.sin(t * 1.3 + i) * 12, 24 + i * 4, L * (1.15 + i * 0.12), 38 + i * 10, 0, 0, 7); c.fill();
      }
      c.fillStyle = '#020102'; c.strokeStyle = '#020102'; c.lineCap = 'round'; c.lineJoin = 'round';
      // corpo comprido e magro, colado no chão, com coluna saltada
      c.beginPath();
      c.moveTo(-L * 1.4, 36);
      c.quadraticCurveTo(-L * 0.9, -10 - puxa * 6, -L * 0.3, -20);
      c.quadraticCurveTo(0, -34, 30, -24);
      c.lineTo(34, 30); c.quadraticCurveTo(-L * 0.5, 48, -L * 1.4, 40); c.fill();
      for (let i = 0; i < 9; i++) { const x = -L * 1.1 + i * (L * 1.2 / 9); c.beginPath(); c.ellipse(x, -14 - Math.sin(i * 0.8) * 6, 7, 9, 0, 0, 7); c.fill(); }
      // pernas arrastando atrás
      c.lineWidth = 9 * (0.5 + vida * 0.5);
      c.beginPath(); c.moveTo(-L * 1.2, 30); c.quadraticCurveTo(-L * 1.5, 0 + puxa2 * 8, -L * 1.8, 38); c.stroke();
      c.beginPath(); c.moveTo(-L * 1.1, 34); c.quadraticCurveTo(-L * 1.35, 60, -L * 1.7, 44 + puxa * 6); c.stroke();
      // braços compridos demais, com cotovelos pra cima, puxando o corpo
      c.lineWidth = 11 * (0.5 + vida * 0.5);
      const alc = 130 + puxa * 36, alc2 = 120 + puxa2 * 36;
      c.beginPath(); c.moveTo(20, -14); c.lineTo(70, -110 - puxa * 10); c.lineTo(20 + alc, 34); c.stroke();
      c.beginPath(); c.moveTo(4, -6); c.lineTo(40, -90 - puxa2 * 10); c.lineTo(alc2 - 20, 42); c.stroke();
      c.lineWidth = 4;
      for (const [hx, hy] of [[20 + alc, 34], [alc2 - 20, 42]]) for (let d = 0; d < 5; d++) { c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + 18, hy - 12 + d * 5, hx + 34 + d * 2, hy - 2 + d * 6); c.stroke(); }
      // cabeça baixa, torta, com sorriso cheio de dentes
      c.save(); c.translate(52, -8); c.rotate(0.35 + Math.sin(t * 2.2) * 0.12);
      c.beginPath(); c.ellipse(0, 0, 34, 28, 0, 0, 7); c.fill();
      for (let i = 0; i < 10; i++) { c.lineWidth = 2.5; c.beginPath(); c.moveTo(-26 + i * 6, -20); c.lineTo(-30 + i * 7 + Math.sin(t * 3 + i) * 4, 40 + (i % 3) * 10); c.stroke(); }
      c.fillStyle = 'rgba(235,225,210,0.95)';
      c.beginPath(); c.moveTo(-18, 10); c.quadraticCurveTo(4, 26, 26, 6); c.quadraticCurveTo(4, 16, -18, 10); c.fill();
      c.strokeStyle = '#020102'; c.lineWidth = 1.5;
      for (let d = 0; d < 9; d++) { const x = -14 + d * 4.4; c.beginPath(); c.moveTo(x, 10); c.lineTo(x + 1, 18); c.stroke(); }
      c.restore();
      olho(40, -18, 5, '255,245,225'); olho(62, -16, 5, '255,245,225');
      // conforme apanha: rachaduras de luz vermelha e fumaça saindo
      const dano = 1 - vida;
      if (dano > 0) {
        const r = A.semente(21);
        c.strokeStyle = `rgba(255,50,40,${0.3 + dano * 0.6})`; c.lineWidth = 2;
        c.shadowColor = 'rgba(255,40,30,0.8)'; c.shadowBlur = 8;
        for (let i = 0; i < Math.floor(dano * 18); i++) {
          let x = -L * 1.1 + r() * L * 1.3, y = -10 + r() * 40;
          c.beginPath(); c.moveTo(x, y);
          for (let k2 = 0; k2 < 4; k2++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 18; c.lineTo(x, y); }
          c.stroke();
        }
        c.shadowBlur = 0;
        for (let i = 0; i < Math.floor(dano * 8); i++) {
          const fx2 = -L + r() * L * 1.2, sobe = ((t * 40 + i * 37) % 90);
          c.fillStyle = `rgba(0,0,0,${0.5 * (1 - sobe / 90)})`;
          c.beginPath(); c.arc(fx2, -20 - sobe, 8 + sobe * 0.15, 0, 7); c.fill();
        }
      }
      c.lineCap = 'butt'; c.lineJoin = 'miter';
      c.restore();
      // barra de vida discreta em cima dele
      c.save(); c.globalAlpha *= 0.85;
      c.fillStyle = 'rgba(0,0,0,0.6)'; A.rr(c, pos.x - 110, pos.y - 160 * esc, 220, 9, 4); c.fill();
      c.fillStyle = '#c21d3a'; A.rr(c, pos.x - 110, pos.y - 160 * esc, 220 * vida, 9, 4); c.fill();
      c.restore();
    } else if (k === 'final') {
      // algo espiando por trás da cabeceira, com dedos compridos no colchão
      const s = 1 + Math.sin(t * 2) * 0.02;
      c.save(); c.translate(pos.x, pos.y); c.scale(s, s);
      c.fillStyle = '#030204';
      c.beginPath(); c.ellipse(-6, 18, 30, 40, -0.15, 0, 7); c.fill();
      c.strokeStyle = '#030204'; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) { c.lineWidth = 3; c.beginPath(); c.moveTo(-26 + i * 9, -10); c.quadraticCurveTo(-34 + i * 10, 30, -30 + i * 11 + Math.sin(t + i) * 3, 70); c.stroke(); }
      c.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        const bx = 22 + i * 12, w = Math.sin(t * 1.5 + i) * 3;
        c.beginPath(); c.moveTo(18, 30); c.quadraticCurveTo(bx + 6, -6 + i * 3, bx + 18 + w, 14 + i * 4); c.stroke();
      }
      c.lineCap = 'butt';
      olho(-16, 10, 4.5, '255,250,230'); olho(6, 8, 4.5, '255,250,230');
      c.restore();
    }
    c.restore();
  };

  // forma do espelho (arco em cima)
  A.formaEspelho = function (c, x, y, w, h) {
    c.moveTo(x, y + w / 2);
    c.arc(x + w / 2, y + w / 2, w / 2, P, 0);
    c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
  };

  // ------------------------------------------------------------------
  //  HUD mínima
  // ------------------------------------------------------------------
  A.coracao = function (c, x, y, r, cor) {
    c.fillStyle = cor;
    c.beginPath(); c.arc(x - r * 0.5, y - r * 0.2, r * 0.55, 0, 7); c.arc(x + r * 0.5, y - r * 0.2, r * 0.55, 0, 7);
    c.moveTo(x - r * 1.02, y); c.lineTo(x, y + r); c.lineTo(x + r * 1.02, y); c.fill();
  };

  A.barra = function (c, V) {
    const v = V.felicidadeVisivel, glitch = V.barraGlitch || 0;
    const x = 64 + V.hudX, y = 58 + V.hudY;
    c.save();
    c.globalAlpha = V.hudAlpha;
    const jx = glitch > 0 && Math.random() < glitch ? (Math.random() - 0.5) * 16 : 0;
    c.translate(jx, 0);
    const pulso = 1 + Math.max(0, V.pulsoHud) * 0.25;
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 10;
    A.coracao(c, x, y, 15 * pulso, V.corHud || '#ff7aa2');
    c.shadowBlur = 0;
    const bx = x + 26, bw = 250;
    c.fillStyle = 'rgba(20,12,24,0.55)'; RR(c, bx, y - 6, bw, 12, 6); c.fill();
    c.fillStyle = V.corHud || '#ff7aa2';
    RR(c, bx + 2, y - 4, Math.max(0, (bw - 4) * v / 100), 8, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; RR(c, bx + 2, y - 4, Math.max(0, (bw - 4) * v / 100), 3, 2); c.fill();
    c.font = '800 15px Nunito, sans-serif'; c.fillStyle = 'rgba(255,240,245,0.9)';
    let txt = Math.round(v) + '%';
    if (glitch > 0.3 && Math.random() < glitch * 0.3) txt = ['??%', '0%', '-1%', ':)', '...'][Math.floor(Math.random() * 5)];
    c.fillText(txt, bx + bw + 12, y + 5);
    c.restore();
  };

  // objetivo da fase (canto superior direito)
  A.objetivo = function (c, txt, v, Vh) {
    if (!Vh.hudAlpha) return;
    const x = v.x + v.w - 64, y = v.y + 66;
    c.save();
    c.globalAlpha = Vh.hudAlpha;
    let t2 = txt;
    const gl = Vh.barraGlitch || 0;
    if (gl > 0.2 && Math.random() < gl * 0.04) t2 = txt.split('').map((ch) => (Math.random() < 0.3 ? '█' : ch)).join('');
    c.textAlign = 'right';
    c.font = '800 12px Nunito, sans-serif'; c.fillStyle = 'rgba(255,200,220,0.75)';
    c.letterSpacing = '4px'; c.fillText('OBJETIVO', x, y - 18); c.letterSpacing = '0px';
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 8;
    c.font = '900 24px "Baloo 2", Nunito, sans-serif'; c.fillStyle = '#fff2f6';
    c.fillText(t2, x + (gl > 0.3 && Math.random() < 0.05 ? (Math.random() - 0.5) * 10 : 0), y + 8);
    c.restore();
  };

  // título de estágio (aparece e some)
  A.cartao = function (c, num, titulo, a, sub) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = a;
    c.textAlign = 'center';
    const y0 = 800;
    const g = c.createLinearGradient(0, y0 - 30, 0, y0 + 190);
    g.addColorStop(0, 'rgba(10,6,16,0)'); g.addColorStop(0.3, 'rgba(10,6,16,0.45)'); g.addColorStop(0.7, 'rgba(10,6,16,0.45)'); g.addColorStop(1, 'rgba(10,6,16,0)');
    c.fillStyle = g; c.fillRect(0, y0 - 30, 1920, 220);
    c.font = '800 22px Nunito, sans-serif'; c.fillStyle = 'rgba(255,190,210,0.95)';
    c.letterSpacing = '8px';
    c.fillText(num, 960, y0 + 40);
    c.letterSpacing = '0px';
    c.font = '900 76px "Baloo 2", Nunito, sans-serif'; c.fillStyle = '#fff4f7';
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20;
    c.fillText(titulo, 960, y0 + 118);
    c.shadowBlur = 0;
    if (sub) { c.font = '700 22px Nunito, sans-serif'; c.fillStyle = 'rgba(255,230,240,0.8)'; c.fillText(sub, 960, y0 + 158); }
    c.restore();
  };

  // balão de fala
  A.balao = function (c, x, y, txt, a, estranho) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = a;
    c.font = (estranho ? 'italic ' : '') + '800 26px Nunito, sans-serif';
    const w = c.measureText(txt).width + 40, h = 50;
    const bx = x - w / 2, by = y - h;
    c.fillStyle = estranho ? 'rgba(20,10,20,0.82)' : 'rgba(255,250,252,0.94)';
    c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 14;
    RR(c, bx, by, w, h, 22); c.fill();
    c.beginPath(); c.moveTo(x - 12, by + h - 1); c.lineTo(x - 26, by + h + 20); c.lineTo(x + 6, by + h - 1); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = estranho ? '#f2dbe4' : '#5a2a44';
    c.textAlign = 'center'; c.fillText(txt, x, by + 34);
    c.restore();
  };

  // número flutuante (+3 verde / -6 vermelho)
  A.numero = function (c, x, y, n, a, esc) {
    c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(esc, esc);
    c.font = '900 52px "Baloo 2", Nunito, sans-serif'; c.textAlign = 'center';
    const txt = (n > 0 ? '+' : '') + n;
    c.lineWidth = 8; c.strokeStyle = n > 0 ? '#0b4a26' : '#4a0b16'; c.strokeText(txt, 0, 0);
    c.fillStyle = n > 0 ? '#5dff9a' : '#ff4a66'; c.fillText(txt, 0, 0);
    c.restore();
  };

  // desenho montado com os papéis (fase 2)
  A.desenhoPapeis = function (c, a, t) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(5,3,8,0.6)'; c.fillRect(0, 0, 1920, 1080);
    c.translate(960, 520); c.rotate(-0.04);
    c.fillStyle = '#ece6da'; c.fillRect(-300, -220, 600, 440);
    c.strokeStyle = 'rgba(120,100,90,0.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-300, -40); c.lineTo(-60, -60); c.lineTo(20, 100); c.lineTo(300, 60); c.moveTo(-60, -60); c.lineTo(-20, -220); c.moveTo(20, 100); c.lineTo(-40, 220); c.stroke();
    c.strokeStyle = '#2a2230'; c.lineWidth = 5; c.lineCap = 'round';
    // menina de palito com cabelo comprido
    c.beginPath(); c.arc(-120, -80, 46, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(-166, -90); c.lineTo(-180, 10); c.moveTo(-74, -90); c.lineTo(-60, 10); c.stroke();
    c.beginPath(); c.moveTo(-120, -34); c.lineTo(-120, 90); c.moveTo(-120, 0); c.lineTo(-170, 40); c.moveTo(-120, 0); c.lineTo(-70, 40); c.moveTo(-120, 90); c.lineTo(-150, 170); c.moveTo(-120, 90); c.lineTo(-90, 170); c.stroke();
    // rosto riscado
    c.strokeStyle = '#111'; c.lineWidth = 7;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-160 + Math.sin(i * 7) * 8, -110 + i * 7); c.lineTo(-80 + Math.cos(i * 5) * 8, -60 - i * 5); c.stroke(); }
    // outra figura atrás
    c.strokeStyle = '#111'; c.lineWidth = 6;
    c.beginPath(); c.arc(90, -110, 36, 0, 7); c.stroke();
    c.fillStyle = '#111'; c.beginPath(); c.arc(90, -110, 34, 0, 7); c.fill();
    c.beginPath(); c.moveTo(90, -74); c.lineTo(90, 110); c.moveTo(90, -30); c.lineTo(-60, -10); c.moveTo(90, -30); c.lineTo(160, 30); c.moveTo(90, 110); c.lineTo(60, 190); c.moveTo(90, 110); c.lineTo(120, 190); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(78, -114, 4, 0, 7); c.arc(102, -114, 4, 0, 7); c.fill();
    c.font = '700 44px "Caveat", "Comic Sans MS", cursive'; c.fillStyle = '#6b1422';
    c.fillText('ela tá aqui', 80, 170);
    c.lineCap = 'butt';
    c.restore();
  };

  // tela final
  A.fim = function (c, e, t) {
    c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
    const a = clamp((e - 1200) / 1500, 0, 1);
    c.save(); c.globalAlpha = a; c.textAlign = 'center';
    c.font = '900 64px "Baloo 2", Nunito, sans-serif'; c.fillStyle = '#ffe9f0';
    const jx = Math.random() < 0.05 ? (Math.random() - 0.5) * 20 : 0;
    c.fillText('OBRIGADA POR CUIDAR DA GUIMA :)', 960 + jx, 520);
    c.font = '600 24px Nunito, sans-serif'; c.fillStyle = 'rgba(255,220,230,0.6)';
    if (e > 4000) c.fillText('ela vai dormir bem agora.', 960, 580);
    c.restore();
  };
})();
