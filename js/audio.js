// =====================================================================
//  SOM — efeitos gerados na hora (cada clique soa um pouquinho diferente),
//  músicas/ambientes em loop e troca opcional por arquivos (ver config.js).
// =====================================================================
(function () {
  const G = (window.G = window.G || {});
  const C = window.CONFIG;
  const S = (G.Som = { ok: false, mudo: false, tensao: 0 });

  let ctx, master, sfxBus, musBus, rev, revIn, ruido, ruidoRosa;
  const buffers = {};
  const r = (a, b) => a + Math.random() * (b - a);

  S.iniciar = function () {
    if (S.ok) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    S.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = C.volumeGeral;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.connect(master);
    // reverb de quarto pequeno (impulso gerado)
    rev = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    rev.buffer = ir;
    revIn = ctx.createGain(); revIn.gain.value = 0.35;
    revIn.connect(rev).connect(master);
    // ruídos
    ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ruidoRosa = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const p = ruidoRosa.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < p.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + w * 0.5362) * 0.11;
    }
    S.ok = true;
    carregarArquivos();
    if (S._pendente) { const k = S._pendente; S._pendente = null; S.musica(k); }
    setInterval(agendador, 90);
  };

  S.alternarMudo = function () {
    S.mudo = !S.mudo;
    if (master) master.gain.setTargetAtTime(S.mudo ? 0 : C.volumeGeral, ctx.currentTime, 0.05);
    return S.mudo;
  };

  async function carregarArquivos() {
    if (location.protocol === 'file:') return;
    for (const k in C.sons) {
      const lista = (C.sons[k].arquivos || []).filter(Boolean);
      if (!lista.length) continue;
      buffers[k] = [];
      for (const url of lista) {
        try {
          const resp = await fetch(url);
          const arr = await resp.arrayBuffer();
          buffers[k].push(await ctx.decodeAudioData(arr));
        } catch (e) { console.warn('Som não carregou:', url, e); }
      }
      if (!buffers[k].length) delete buffers[k];
      if (musicaAtual && musicaAtual.k === k) { const k2 = k; musicaAtual = null; S.musica(k2); }
    }
  }

  // ---------- blocos de construção ----------
  const T = () => ctx.currentTime;
  function saida(vol, pan, wet) {
    const g = ctx.createGain(); g.gain.value = vol;
    let n = g;
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); n = p; }
    n.connect(sfxBus);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; n.connect(w); w.connect(revIn); }
    return g;
  }
  function env(g, t, a, peak, dec, fim) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(fim || 0.0001, t + a + dec);
  }
  function osc(tipo, f, t, dur, destino, vol, f2, a) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, a || 0.005, vol, dur);
    o.connect(g).connect(destino);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function barulho(t, dur, destino, vol, filtro, f, q, f2, a, rosa) {
    const s = ctx.createBufferSource(); s.buffer = rosa ? ruidoRosa : ruido;
    s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = filtro || 'bandpass'; fl.frequency.setValueAtTime(f || 1000, t); fl.Q.value = q || 1;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain(); env(g, t, a || 0.005, vol, dur);
    s.connect(fl).connect(g).connect(destino);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return { s, fl, g };
  }
  function distorcao(q) {
    const ws = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = ((1 + q) * x) / (1 + q * Math.abs(x)); }
    ws.curve = c; return ws;
  }
  function sino(f, t, vol, dest, dec) {
    osc('sine', f, t, dec || 1.3, dest, vol);
    osc('sine', f * 3.99, t, (dec || 1.3) * 0.35, dest, vol * 0.25);
    osc('sine', f * 2.0, t, (dec || 1.3) * 0.6, dest, vol * 0.15);
  }
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ---------- efeitos ----------
  const FX = {
    item(v, o) {
      const t = T(), out = saida(1, o.pan, 0.25);
      osc('sine', 520 * v, t, 0.16, out, 0.5, 900 * v);
      osc('triangle', 1040 * v, t + 0.02, 0.1, out, 0.12);
      barulho(t, 0.05, out, 0.15, 'highpass', 4000);
    },
    brilho(v, o) {
      const t = T(), out = saida(1, o.pan, 0.5);
      const esc = [72, 74, 76, 79, 81, 84, 86, 88];
      const i0 = Math.floor(Math.random() * 4);
      for (let i = 0; i < 3; i++) sino(midi(esc[i0 + i]) * v, t + i * 0.07, 0.16, out, 0.7);
    },
    itemRuim(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      osc('square', 150 * v, t, 0.4, out, 0.12, 70 * v);
      osc('square', 159 * v, t, 0.4, out, 0.1, 74 * v);
      osc('sine', 90, t, 0.25, out, 0.5, 40);
    },
    risada(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      for (let i = 0; i < 2; i++) osc('sine', 700 * v, t + i * 0.13, 0.09, out, 0.18, 950 * v);
    },
    quebra(v) {
      const t = T(), out = saida(1, 0, 0.7);
      osc('sine', 140, t, 2.2, out, 0.9, 30);
      barulho(t, 0.5, out, 0.8, 'lowpass', 3000, 0.7, 200);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(out);
      [311, 330, 466, 494, 622].forEach((f, i) => osc('sawtooth', f * (1 + r(-0.01, 0.01)), t, 3.5, lp, 0.09, f * 0.93, 0.01));
    },
    pano(v, o) {
      const t = T(), out = saida(1, o.pan, 0.2);
      barulho(t, 0.45 * v, out, 0.45, 'bandpass', 700 * v, 0.8, 2600 * v, 0.06);
    },
    soltar(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      osc('sine', 150 * v, t, 0.16, out, 0.7, 55);
      barulho(t, 0.06, out, 0.25, 'lowpass', 1500 * v);
    },
    papel(v, o) {
      const t = T(), out = saida(1, o.pan, 0.2);
      for (let i = 0; i < 6; i++) barulho(t + r(0, 0.22), r(0.02, 0.05), out, r(0.1, 0.3), 'bandpass', r(2500, 6000) * v, 1.5);
    },
    quadro(v, o) {
      const t = T(), out = saida(1, o.pan, 0.35);
      osc('triangle', 820 * v, t, 0.07, out, 0.3);
      barulho(t, 0.03, out, 0.3, 'highpass', 2500);
      osc('sine', 1640 * v, t + 0.09, 0.05, out, 0.12);
    },
    gaveta(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      barulho(t, 0.28, out, 0.3, 'lowpass', 900 * v, 1, 500);
      osc('sine', 110 * v, t + 0.26, 0.15, out, 0.7, 50);
      barulho(t + 0.26, 0.05, out, 0.3, 'bandpass', 1800, 2);
    },
    tomada(v, o) {
      const t = T(), out = saida(1, o.pan, 0.2);
      barulho(t, 0.012, out, 0.8, 'highpass', 3000);
      osc('sawtooth', 60, t + 0.01, 0.35, out, 0.12);
      osc('sawtooth', 120, t + 0.01, 0.25, out, 0.06);
    },
    esfregar(v, o) {
      const t = T(), out = saida(1, o.pan, 0.15);
      barulho(t, 0.14, out, 0.25, 'bandpass', 1600 * v, 3);
      const s = osc('sine', 1300 * v, t, 0.12, out, 0.035, 1500 * v);
    },
    revelacao(v) {
      const t = T(), out = saida(1, 0, 0.6);
      const d = distorcao(30); d.connect(out);
      [520, 780, 1170, 1250].forEach((f) => {
        const s = osc('sawtooth', f, t, 1.8, d, 0.06, f * 1.5, 0.01);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 23; lg.gain.value = f * 0.03;
        lfo.connect(lg).connect(s.frequency); lfo.start(t); lfo.stop(t + 1.9);
      });
      barulho(t, 1.6, out, 0.5, 'bandpass', 1100, 1.2, 2600);
      osc('sine', 110, t, 1.8, out, 0.9, 28);
    },
    cortina(v, o) {
      const t = T(), out = saida(1, o.pan, 0.25);
      barulho(t, 0.5 * v, out, 0.3, 'bandpass', 1200 * v, 0.9, 2400, 0.08);
      osc('sine', 2600 * v, t + 0.05, 0.12, out, 0.035);
      osc('sine', 3300 * v, t + 0.18, 0.1, out, 0.03);
    },
    interruptor(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      barulho(t, 0.008, out, 1, 'highpass', 2500);
      osc('sine', 2100 * v, t, 0.02, out, 0.2);
      barulho(t + 0.035, 0.006, out, 0.5, 'highpass', 3500);
    },
    pcDesliga(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      osc('sine', 1400, t, 0.5, out, 0.1, 60);
      barulho(t, 0.03, out, 0.5, 'highpass', 3000);
      osc('sine', 50, t, 0.3, out, 0.4, 30);
    },
    travesseiro(v, o) {
      const t = T(), out = saida(1, o.pan, 0.2);
      barulho(t, 0.25 * v, out, 0.5, 'lowpass', 600 * v, 0.7, 250, 0.02, true);
    },
    sussurro(v, o) {
      const t = T();
      const dur = 2.4 * v;
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(o.pan !== undefined ? o.pan : r(-1, 1), t);
      pan.pan.linearRampToValueAtTime(r(-1, 1), t + dur);
      const g = ctx.createGain(); g.gain.value = 1; g.connect(pan); pan.connect(sfxBus);
      const w = ctx.createGain(); w.gain.value = 0.6; pan.connect(w); w.connect(revIn);
      // "sílabas" de ruído passando por formantes que mudam
      let tt = t;
      while (tt < t + dur) {
        const sil = r(0.08, 0.22);
        const f1 = r(500, 1100), f2 = r(1500, 2800);
        barulho(tt, sil, g, r(0.15, 0.35), 'bandpass', f1, 6, f1 * r(0.8, 1.3), 0.02);
        barulho(tt, sil, g, r(0.1, 0.25), 'bandpass', f2, 8, f2 * r(0.8, 1.2), 0.02);
        barulho(tt, sil * 0.6, g, 0.08, 'highpass', 5000, 1);
        tt += sil + r(0.02, 0.12);
      }
    },
    passos(v, o) {
      const t = T();
      const out = saida(1, o.pan !== undefined ? o.pan : r(-0.8, 0.8), 0.5);
      for (let i = 0; i < 4; i++) {
        const tt = t + i * 0.58 * v;
        osc('sine', 85 * r(0.9, 1.1), tt, 0.18, out, 0.25 + i * 0.08, 45);
        barulho(tt, 0.08, out, 0.08 + i * 0.03, 'lowpass', 500);
      }
    },
    rangido(v, o) {
      const t = T(), out = saida(1, o.pan, 0.45);
      const dur = r(0.9, 1.5);
      const s = ctx.createOscillator(); s.type = 'sawtooth';
      const n = 60, curva = new Float32Array(n);
      let f = r(90, 150) * v;
      for (let i = 0; i < n; i++) { f = Math.max(40, f + r(-18, 18)); curva[i] = f; }
      s.frequency.setValueCurveAtTime(curva, t, dur);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100 * v; bp.Q.value = 7;
      const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 2400 * v; bp2.Q.value = 9;
      const g = ctx.createGain(); env(g, t, 0.08, 0.6, dur);
      s.connect(bp).connect(g); s.connect(bp2).connect(g); g.connect(out);
      s.start(t); s.stop(t + dur + 0.1);
    },
    susto(v, o) {
      const t = T(), out = saida(1, o.pan, 0.5);
      [1180, 1245, 1390, 1480].forEach((f) => osc('sawtooth', f * v, t, 0.6, out, 0.05, f * v * 0.9, 0.01));
      osc('sine', 90, t, 0.4, out, 0.6, 35);
      barulho(t, 0.2, out, 0.35, 'lowpass', 2500);
    },
    shh(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      barulho(t, 0.7 * v, out, 0.3, 'bandpass', 3800 * v, 1.2, 3000, 0.12);
    },
    afastar(v, o) {
      const t = T(), out = saida(1, o.pan, 0.5);
      barulho(t, 0.4, out, 0.45, 'bandpass', 3000 * v, 1.5, 250, 0.01);
      osc('sine', 330 * v, t, 0.35, out, 0.25, 70);
    },
    coracao(v, o) {
      const t = T(), out = saida(1, 0, 0.1);
      const vol = (o.vol || 1) * 0.9;
      osc('sine', 58, t, 0.14, out, vol, 38, 0.01);
      osc('sine', 52, t + 0.22, 0.16, out, vol * 0.75, 34, 0.01);
    },
    glitch(v, o) {
      const t = T(), out = saida(1, o.pan, 0.1);
      let tt = t;
      const n = Math.floor(r(6, 14));
      for (let i = 0; i < n; i++) {
        const d = r(0.015, 0.05);
        if (Math.random() < 0.6) osc('square', r(80, 3500), tt, d, out, r(0.04, 0.12));
        else barulho(tt, d, out, r(0.1, 0.3), 'highpass', r(500, 5000));
        tt += d + (Math.random() < 0.2 ? r(0.02, 0.08) : 0);
      }
    },
    grito(v) {
      const t = T(), out = saida(1.2, 0, 0.5);
      const d = distorcao(60); d.connect(out);
      // voz: ruído em formantes de "A" + serras com vibrato rápido
      [[800, 8], [1150, 9], [2900, 10]].forEach(([f, q]) => barulho(t, 1.5, d, 0.9, 'bandpass', f, q, f * 1.25, 0.01));
      [620, 910, 1240].forEach((f) => {
        const s = osc('sawtooth', f, t, 1.5, d, 0.18, f * 1.35, 0.005);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 31; lg.gain.value = f * 0.05;
        lfo.connect(lg).connect(s.frequency); lfo.start(t); lfo.stop(t + 1.6);
      });
      osc('sine', 60, t, 1.2, out, 1, 25, 0.005);
      barulho(t, 0.25, out, 1, 'lowpass', 6000);
    },
    zumbido(v, o) {
      const t = T(), out = saida(1, 0, 0);
      osc('sine', 6800, t, o.dur || 3.5, out, 0.035, null, 0.8);
    },
    chefeEntra(v) {
      const t = T(), out = saida(1, 0, 0.7);
      const d = distorcao(20); d.connect(out);
      osc('sine', 70, t, 3.5, out, 0.9, 32, 0.02);
      [233, 247, 349, 370, 466].forEach((f, i) => osc('sawtooth', f, t + i * 0.04, 3.2, d, 0.05, f * 0.8, 0.3));
      barulho(t, 2.5, out, 0.4, 'bandpass', 300, 1, 2400, 0.8);
      barulho(t + 0.1, 0.3, out, 0.6, 'lowpass', 900);
    },
    chefeAcerto(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      barulho(t, 0.12, out, 0.6, 'bandpass', 700 * v, 1.2, 250);
      osc('square', 90 * v, t, 0.12, out, 0.15, 50);
      osc('sine', 180 * v, t, 0.18, out, 0.3, 60);
    },
    chefeMorre(v, o) {
      const t = T(), out = saida(1, o.pan, 0.8);
      const d = distorcao(40); d.connect(out);
      [400, 560, 800].forEach((f) => osc('sawtooth', f, t, 1.3, d, 0.08, f * 0.3, 0.01));
      barulho(t, 1.4, out, 0.7, 'bandpass', 2400, 1, 150, 0.01);
      osc('sine', 120, t, 1.2, out, 0.8, 30);
    },
    badalada(v, o) {
      const t = T(), out = saida(1, 0, 0.9);
      [0, 2.2].forEach((dt) => {
        osc('sine', 196, t + dt, 4, out, 0.35);
        osc('sine', 196 * 2.76, t + dt, 2.5, out, 0.1);
        osc('sine', 196 * 5.4, t + dt, 1.2, out, 0.05);
        osc('sine', 98, t + dt, 3, out, 0.2);
      });
    },
    euforia(v, o) {
      const t = T(), out = saida(1, 0, 0.5);
      [72, 76, 79, 84, 88, 91].forEach((n, i) => sino(midi(n), t + i * 0.08, 0.14, out, 0.9));
      [72, 76, 79, 84, 88, 91].forEach((n, i) => sino(midi(n) * 1.02, t + 0.5 + i * 0.08, 0.06, out, 0.9));
    },
    pega(v, o) {
      const t = T(), out = saida(1, o.pan, 0.2);
      osc('triangle', 600 * v, t, 0.05, out, 0.12);
    },
    relogio(v, o) {
      const t = T(), out = saida(1, o.pan, 0.3);
      osc('triangle', 1900 * v, t, 0.025, out, 0.1);
      barulho(t, 0.015, out, 0.12, 'bandpass', 3000, 3);
    },
    respiro(v, o) {
      const t = T(), out = saida(1, o.pan, 0.4);
      barulho(t, 1.4 * v, out, 0.12, 'bandpass', 900, 1.5, 700, 0.5, true);
    },
    trovao(v, o) {
      const t = T(), out = saida(1, 0, 0.7);
      barulho(t, 3, out, 0.5, 'lowpass', 300, 1, 80, 0.2, true);
    },
    rebobina(v) {
      const t = T(), out = saida(1, 0, 0.2);
      osc('sawtooth', 200, t, 1.2, out, 0.06, 1800);
      barulho(t, 1.2, out, 0.2, 'bandpass', 800, 2, 5000);
    },
  };

  S.tocar = function (k, o) {
    if (!S.ok || S.mudo) return;
    o = o || {};
    const cfg = C.sons[k] || {};
    const varia = cfg.variacao !== undefined ? cfg.variacao : 0.06;
    const v = 1 + (Math.random() * 2 - 1) * varia;
    const vol = (cfg.volume !== undefined ? cfg.volume : 0.7) * (o.vol || 1);
    if (o.x !== undefined) o.pan = ((o.x / 1920) * 2 - 1) * 0.7;
    if (buffers[k]) {
      const lista = buffers[k];
      const src = ctx.createBufferSource(); src.buffer = lista[Math.floor(Math.random() * lista.length)];
      src.playbackRate.value = v;
      const out = saida(vol, o.pan, 0.2);
      src.connect(out); src.start();
      return;
    }
    const f = FX[k];
    if (!f) return;
    // cada efeito tem seu próprio volume através de um "sub-bus"
    const antes = sfxBus;
    const g = ctx.createGain(); g.gain.value = vol * (0.9 + Math.random() * 0.2); g.connect(antes);
    sfxBus = g;
    try { f(v, o); } catch (e) { console.warn(e); }
    sfxBus = antes;
  };

  // ------------------------------------------------------------------
  //  MÚSICAS E AMBIENTES
  // ------------------------------------------------------------------
  let musicaAtual = null; // { k, g, nodes[], prox, passo }
  // melodia original de caixinha de música (3/4)
  const MEL = [
    [76, 1], [79, 1], [76, 1], [74, 1.5], [72, 0.5], [74, 1], [76, 1], [72, 1], [67, 1], [69, 3],
    [77, 1], [81, 1], [77, 1], [76, 1.5], [74, 0.5], [72, 1], [74, 1], [71, 1], [67, 1], [72, 3],
    [76, 1], [79, 1], [84, 1], [83, 1.5], [81, 0.5], [79, 1], [77, 1], [76, 1], [74, 1], [76, 3],
    [72, 1], [74, 1], [76, 1], [77, 1], [76, 1], [74, 1], [72, 1], [71, 1], [74, 1], [72, 3],
  ];
  const C_ = [48, 55, 64], Gm = [43, 55, 62], Am = [45, 57, 64], F_ = [41, 57, 65], Dm = [50, 57, 65];
  const ACORDES = [C_, Gm, C_, Am, F_, C_, Gm, C_, C_, Gm, Dm, C_, C_, F_, Gm, C_];

  S.musica = function (k) {
    if (!S.ok) { S._pendente = k; return; }
    if (musicaAtual && musicaAtual.k === k) return;
    if (musicaAtual) {
      const m = musicaAtual;
      m.g.gain.setTargetAtTime(0.0001, T(), 0.6);
      setTimeout(() => { m.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); m.g.disconnect(); }, 3000);
      m.parado = true;
    }
    musicaAtual = null;
    if (!k) return;
    const cfg = C.sons[k] || {};
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(musBus);
    g.gain.setTargetAtTime(cfg.volume !== undefined ? cfg.volume : 0.5, T(), 0.8);
    const m = { k, g, nodes: [], prox: T() + 0.1, passo: 0, compasso: 0 };
    musicaAtual = m;
    if (buffers[k]) {
      const src = ctx.createBufferSource(); src.buffer = buffers[k][0]; src.loop = true; src.connect(g); src.start();
      m.nodes.push(src); m.arquivo = true; return;
    }
    // camadas contínuas
    if (k === 'musica2') {
      const rt = barulhoContinuo(g, 'lowpass', 300, 0.05, true); m.nodes.push(rt);
    }
    if (k === 'ambiente3' || k === 'ambiente4') {
      const baixo = k === 'ambiente4' ? 41 : 55;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = k === 'ambiente4' ? 160 : 240; lp.Q.value = 3; lp.connect(g);
      m.lp = lp;
      [baixo, baixo * 1.008, baixo * 1.5 * 0.997].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const og = ctx.createGain(); og.gain.value = (i === 2 ? 0.08 : 0.16) * (k === 'ambiente4' ? 1.5 : 1); o.connect(og).connect(lp); o.start(); m.nodes.push(o);
      });
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 80;
      lfo.connect(lg).connect(lp.frequency); lfo.start(); m.nodes.push(lfo);
      const vento = barulhoContinuo(g, 'bandpass', 400, k === 'ambiente4' ? 0.05 : 0.08, true, 0.5);
      m.nodes.push(vento);
      if (k === 'ambiente4') {
        [1510, 1523].forEach((f) => { const o = ctx.createOscillator(); o.frequency.value = f; const og = ctx.createGain(); og.gain.value = 0.006; o.connect(og).connect(g); o.start(); m.nodes.push(o); });
      }
    }
  };
  function barulhoContinuo(dest, tipo, f, vol, rosa, q) {
    const s = ctx.createBufferSource(); s.buffer = rosa ? ruidoRosa : ruido; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q || 0.7;
    const g = ctx.createGain(); g.gain.value = vol;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.09 + Math.random() * 0.05; lg.gain.value = vol * 0.6;
    lfo.connect(lg).connect(g.gain); lfo.start();
    s.connect(fl).connect(g).connect(dest); s.start();
    s._lfo = lfo;
    const stop = s.stop.bind(s);
    s.stop = () => { stop(); lfo.stop(); };
    return s;
  }

  // agenda as notas da caixinha de música / tiques / batidas
  function agendador() {
    const m = musicaAtual;
    if (!m || m.parado || m.arquivo || !ctx) return;
    const ahead = T() + 0.35;
    if (m.k === 'musica1' || m.k === 'musica2') {
      const errada = m.k === 'musica2';
      const bpm = errada ? 70 : 92;
      const beat = 60 / bpm;
      while (m.prox < ahead) {
        const [nota, dur] = MEL[m.passo % MEL.length];
        const inicioCompasso = somaBeats(m.passo % MEL.length) % 3 === 0;
        let n = nota;
        if (errada && Math.random() < 0.16) n += Math.random() < 0.5 ? -1 : 1;
        let f = midi(n) * (errada ? 0.985 + Math.sin(m.prox * 0.7) * 0.01 : 1);
        if (!(errada && Math.random() < 0.08)) sino(f, m.prox, errada ? 0.09 : 0.11, m.g, errada ? 2.2 : 1.4);
        if (inicioCompasso) {
          const comp = Math.floor(somaBeats(m.passo % MEL.length) / 3);
          const ac = ACORDES[comp % ACORDES.length];
          ac.forEach((a, i) => {
            const t0 = m.prox + i * beat * (errada ? 0.7 : 0.33);
            const o = ctx.createOscillator(), og = ctx.createGain();
            o.type = 'triangle'; o.frequency.value = midi(a) * (errada ? 0.985 : 1);
            og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.035, t0 + 0.05);
            og.gain.exponentialRampToValueAtTime(0.0001, t0 + beat * 2.6);
            o.connect(og).connect(m.g); o.start(t0); o.stop(t0 + beat * 2.8);
          });
        }
        m.prox += dur * beat * (errada ? (1 + (Math.random() - 0.5) * 0.12) : 1);
        m.passo++;
        if (m.passo % MEL.length === 0) m.prox += beat * (errada ? 2 : 1);
      }
    } else if (m.k === 'ambiente3') {
      while (m.prox < ahead) {
        // tique do relógio + notinhas distantes
        const t = m.prox;
        osc('triangle', m.passo % 2 ? 1750 : 1900, t, 0.02, m.g, 0.05);
        if (Math.random() < 0.06) sino(midi(MEL[Math.floor(Math.random() * MEL.length)][0] - 12) * 0.98, t + 0.3, 0.05, m.g, 3);
        m.prox += 1; m.passo++;
      }
    } else if (m.k === 'ambiente4') {
      // aglomerados dissonantes que crescem e somem, batidas metálicas, sussurros graves
      if (!m.proxSwell) m.proxSwell = T() + 2;
      if (m.proxSwell < ahead) {
        const t = m.proxSwell, ten = S.tensao || 0;
        const dur = 4 + Math.random() * 3;
        const base = [55, 58.3, 61.7, 82.4, 87.3, 116.5, 123.5][Math.floor(Math.random() * 7)];
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500 + ten * 1500; lp.connect(m.g);
        [1, 1.06, 1.414, 2.02, 2.83].forEach((r) => {
          const o = ctx.createOscillator(), og = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.setValueAtTime(base * r * 2, t);
          o.frequency.linearRampToValueAtTime(base * r * 2 * (Math.random() < 0.5 ? 0.97 : 1.03), t + dur);
          og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.03 + ten * 0.03, t + dur * 0.7); og.gain.linearRampToValueAtTime(0.0001, t + dur);
          o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.1);
        });
        if (Math.random() < 0.5) {
          // batida metálica distante
          const tt = t + Math.random() * 2;
          [1, 2.4, 3.9, 5.3].forEach((r) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 180 * r; og.gain.setValueAtTime(0.06 / r, tt); og.gain.exponentialRampToValueAtTime(0.0001, tt + 2.5); o.connect(og).connect(m.g); o.start(tt); o.stop(tt + 2.6); });
        }
        m.proxSwell = t + dur * (0.6 + Math.random() * 0.5) * (1 - ten * 0.4);
      }
      // camada de tensão do inimigo difícil
      if (S.chefe) {
        if (!m.proxChefe || m.proxChefe < T()) m.proxChefe = T() + 0.05;
        while (m.proxChefe < ahead) {
          const t = m.proxChefe, beat = 60 / 150;
          const notas = [41.2, 41.2, 43.65, 41.2, 38.9, 41.2, 46.25, 43.65];
          const f = notas[(m.passoC = (m.passoC || 0) + 1) % notas.length];
          const o = ctx.createOscillator(), og = ctx.createGain(), lp = ctx.createBiquadFilter();
          o.type = 'sawtooth'; o.frequency.value = f * 2; lp.type = 'lowpass'; lp.frequency.value = 420;
          og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.22, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9);
          o.connect(lp).connect(og).connect(m.g); o.start(t); o.stop(t + beat);
          if (m.passoC % 2 === 0) {
            // cordas em trêmolo agudas
            const s2 = ctx.createOscillator(), sg = ctx.createGain();
            s2.type = 'sawtooth'; s2.frequency.value = [880, 932, 988][Math.floor(Math.random() * 3)];
            sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.018, t + 0.02); sg.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.8);
            s2.connect(sg).connect(m.g); s2.start(t); s2.stop(t + beat * 2);
          }
          m.proxChefe += beat / 2;
        }
      }
      while (m.prox < ahead) {
        const t = m.prox;
        const ten = S.tensao || 0;
        const vol = 0.5 + ten * 0.9;
        osc('sine', 58, t, 0.14, m.g, vol, 38, 0.01);
        osc('sine', 52, t + 0.22, 0.16, m.g, vol * 0.75, 34, 0.01);
        if (m.lp) m.lp.frequency.setTargetAtTime(160 + ten * 380, t, 0.5);
        m.prox += 1.25 - ten * 0.62;
        m.passo++;
      }
    }
  }
  const acum = [0];
  for (let i = 0; i < MEL.length; i++) acum.push(acum[i] + MEL[i][1]);
  function somaBeats(i) { return acum[i]; }

  S.pararMusica = () => S.musica(null);
})();
