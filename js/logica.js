// =====================================================================
//  LÓGICA — regras e roteiro das fases.
//  Só o ANFITRIÃO executa isto; o outro jogador recebe o estado pronto.
// =====================================================================
(function () {
  const G = (window.G = window.G || {});
  const C = window.CONFIG;
  const L = (G.L = {});

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const uid = () => Math.random().toString(36).slice(2, 8);
  G.util = { clamp, rnd, pick, lerp };

  // ---------------------------------------------------------------
  //  POSIÇÕES DO QUARTO (mundo de 1920 x 1080)
  // ---------------------------------------------------------------
  const LAY = (G.LAY = {
    W: 1920, H: 1080, parede: 790,
    janela: { x: 150, y: 110, w: 310, h: 300 },
    cortina: { x0: 104, x1: 506, y0: 96, y1: 470, meio: 305 },
    mesa: { x: 60, y: 628, w: 560 },
    monitor: { x: 214, y: 438, w: 272, h: 170, botao: { x: 470, y: 598 } },
    gaveta: { x: 452, y: 656, w: 148, h: 58 },
    poster: { x: 540, y: 178, w: 104, h: 150 },
    espelho: { x: 664, y: 226, w: 176, h: 578 },
    porta: { x: 1062, y: 268, w: 178, h: 522 },
    interruptor: { x: 1264, y: 520 },
    relogio: { x: 1151, y: 172, r: 42 },
    criado: { x: 1282, y: 668, w: 128, h: 140 },
    abajur: { x: 1346, base: 668, corrente: { x: 1392, y: 590 } },
    tomada: { x: 1252, y: 742 },
    cama: { x: 1418, y: 570, fim: 1930 },
    travesseiroCama: { x: 1552, y: 704 },
    quadro: { x: 1682, y: 318, w: 196, h: 146 },
    prateleira: { x: 1784, y: 438, w: 140 },
    cesto: { x: 488, y: 838, w: 150, h: 128 },
    guima: { x: 985, topo: 286, escala: 1.02 },   // Guima em pé (busto)
    guimaCama: { x: 1556, y: 700 },               // cabeça no travesseiro
    zonaCama: { x: 1440, y: 640, w: 480, h: 250 },
    zonaMesa: { x: 60, y: 520, w: 560, h: 150 },
    // pontos onde as coisas aparecem na fase 4
    ameacas: {
      porta:    { x: 1150, y: 520, r: 95,  hp: 2 },
      janela:   { x: 305,  y: 270, r: 70,  hp: 1 },
      cama:     { x: 1700, y: 890, r: 110, hp: 2 },
      espelho:  { x: 752,  y: 470, r: 85,  hp: 2 },
      canto:    { x: 38,   y: 420, r: 90,  hp: 3 },
      teto:     { x: 820,  y: 70,  r: 80,  hp: 1 },
      monitor:  { x: 350,  y: 520, r: 90,  hp: 1 },
      criado:   { x: 1346, y: 760, r: 70,  hp: 2 },
    },
    coisaFinal: { x: 1452, y: 700, r: 70 },
  });

  // ---------------------------------------------------------------
  //  ITENS DA FASE 1
  // ---------------------------------------------------------------
  const BONS = ['cupcake', 'maca', 'pizza', 'cafe', 'pente', 'ursinho', 'flor', 'presente', 'carta', 'celular', 'fone', 'sorvete', 'estrela', 'brigadeiro'];
  const RUINS = ['faca', 'tesoura', 'vidro', 'macaPodre', 'cartaRasgada', 'celularOdio', 'boneca', 'fosforo', 'aranha'];
  G.BONS = BONS; G.RUINS = RUINS;
  G.NOME_ITEM = {
    faca: 'UMA FACA', tesoura: 'UMA TESOURA', vidro: 'UM CACO DE VIDRO', macaPodre: 'UMA MAÇÃ PODRE',
    cartaRasgada: 'UMA CARTA RASGADA', celularOdio: 'COMENTÁRIOS DE ÓDIO', boneca: 'UMA BONECA QUEBRADA',
    fosforo: 'UM FÓSFORO ACESO', aranha: 'UMA ARANHA',
  };
  const FALAS_BOAS = {
    cupcake: ['hmm, cupcake!', 'que delícia :)', 'docinho!!'],
    maca: ['uma maçã :)', 'saudável hehe'],
    pizza: ['PIZZA!!', 'eu amo pizza'],
    cafe: ['cafezinho <3', 'acordei!!'],
    pente: ['meu cabelo agradece', 'tava todo embaraçado'],
    ursinho: ['que fofo!!', 'vou dar um nome pra ele'],
    flor: ['pra mim? :)', 'que cheirosa'],
    presente: ['um presente!!', 'o que será?'],
    carta: ['own :)', 'vou guardar pra sempre'],
    celular: ['as views subindo!!', 'mil likes!!'],
    fone: ['música boa :)', 'aumenta aí!'],
    sorvete: ['sorvete!!', 'de morango <3'],
    estrela: ['brilha!!', 'hehe :)'],
    brigadeiro: ['BRIGADEIRO', 'só mais um...'],
  };
  const FALAS_RUINS = ['...por que isso?', 'não gostei disso', 'ai...', 'isso não é pra mim', '...'];
  const FALAS_ESPERA = ['...tem mais alguma coisa pra mim?', 'cadê meus presentes?', '...', 'vocês não vão me dar mais nada?', 'pode ser qualquer coisa...'];

  // caminho de um item flutuando: curva de Bézier + balanço
  G.itemPos = function (it, t) {
    const u = clamp((t - it.born) / it.life, 0, 1);
    const a = 1 - u;
    let x = a * a * it.p[0] + 2 * a * u * it.p[2] + u * u * it.p[4];
    let y = a * a * it.p[1] + 2 * a * u * it.p[3] + u * u * it.p[5];
    y += Math.sin((t - it.born) / 620 + it.s * 6) * 26;
    x += Math.sin((t - it.born) / 900 + it.s * 3) * 22;
    const r = Math.sin((t - it.born) / 1000 + it.s * 9) * 0.22;
    return { x, y, r, u };
  };

  function novoQuarto() {
    return {
      decay: 0, sky: 'tarde', ceil: 1, lamp: 'on', monitor: 'live', fairy: 'on',
      curtain: { L: 0.05, R: 0.05 },
      frame: { rot: -1.5 },
      mirror: { cloth: 0, reflect: 0, fog: 0.15, cracked: 0, ready: 0 },
      clothes: [], books: [], papers: [],
      pillow: { x: LAY.travesseiroCama.x, y: LAY.travesseiroCama.y, bed: 1 },
      drawer: 0, plug: 1, blanket: 0, fluff: 0, chain: 0, door: 0, teddy: 0,
    };
  }

  L.novo = function (now, duo) {
    return {
      v: 0, now, stage: 'intro', at: now, cut: null, duo: duo ? 1 : 0,
      happy: C.fase1.felicidadeInicial,
      ev: [], evSeq: 0,
      g: { pose: 'stand', mood: 'feliz', x: LAY.guima.x, y: 0, tx: null, ty: null, wake: 0, eyes: 0, sad: 0, drag: null },
      room: novoQuarto(),
      p1: { items: [], next: 0, last: now, dec: now, onlyBad: 0, euforia: 0, knifeIn: 0, waitTalk: 0, spawns: 0, ruinsVistos: 0 },
      p2: { done: {}, strokes: [], sBase: 0, rub: 0, level: 0 },
      p3: { done: {}, hold: null, bedReady: 0, nextScare: 0, used: [], windowScare: 0 },
      p4: { threats: [], nextThreat: 0, nextWake: 0, waking: 0, startAt: 0, final: null, fails: 0, chefes: 0, hora: 0 },
      drags: {},
    };
  };

  // ---------- eventos (sons, números, falas...) ----------
  function ev(S, t, d) {
    S.ev.push({ i: ++S.evSeq, t, d: d || {}, at: S.now });
    if (S.ev.length > 40) S.ev.splice(0, S.ev.length - 40);
  }
  L.ev = ev;
  function fala(S, txt, dur) { ev(S, 'fala', { txt, dur: dur || 2200 }); }
  function happy(S, n, x, y) {
    const antes = S.happy;
    if (n > 0) { S.p2.ultima = S.now; S.p3.ultima = S.now; }
    S.happy = clamp(S.happy + n, 0, 100);
    if (x !== undefined) ev(S, 'num', { n, x, y });
    return S.happy - antes;
  }

  // ---------------------------------------------------------------
  //  TROCA DE ESTÁGIO
  // ---------------------------------------------------------------
  function entrar(S, stage) {
    S.stage = stage; S.at = S.now; S.cut = null; S.drags = {};
    const R = S.room;
    if (stage === 'p1') {
      S.p1.next = S.now + 4200; S.p1.last = S.now; S.p1.dec = S.now;
    }
    if (stage === 'p2') {
      Object.assign(R, novoQuarto(), {
        decay: 1, sky: 'noitinha', lamp: 'flicker', monitor: 'glitch', fairy: 'flicker', plug: 0,
        curtain: { L: 0.34, R: 0.08 }, frame: { rot: 17 }, drawer: 1,
        mirror: { cloth: 1, reflect: 0, fog: 0.55, cracked: 0, ready: 0 },
        pillow: { x: 1600, y: 988, bed: 0 },
        clothes: [
          { id: 'camiseta', x: 262, y: 936 }, { id: 'meia', x: 716, y: 1012 }, { id: 'calca', x: 1338, y: 992 },
        ],
        books: [
          { id: 'l1', x: 150, y: 1004, c: '#6f86c9', r: -0.5 }, { id: 'l2', x: 418, y: 1036, c: '#c96f7d', r: 0.35 }, { id: 'l3', x: 1234, y: 884, c: '#7fb08a', r: 1.2 },
        ],
        papers: [
          { id: 'a', x: 86, y: 842 }, { id: 'b', x: 648, y: 872 }, { id: 'c', x: 1212, y: 1046 },
          { id: 'd', x: 1732, y: 918 }, { id: 'e', x: 1886, y: 1052 },
        ],
      });
      S.g = Object.assign(S.g, { pose: 'stand', mood: 'estranha', x: LAY.guima.x, y: 0 });
      S.happy = 9;
      S.p2 = { done: {}, strokes: [], sBase: 0, rub: 0, level: 0 };
    }
    if (stage === 'p3') {
      Object.assign(R, {
        decay: 2, sky: 'noite', ceil: 1, lamp: 'on', monitor: 'live', fairy: 'off', plug: 1,
        curtain: { L: 0.05, R: 0.05 }, frame: { rot: 0 }, drawer: 0,
        mirror: { cloth: 0, reflect: 0, fog: 0, cracked: 1, ready: 0 },
        pillow: { x: LAY.travesseiroCama.x, y: LAY.travesseiroCama.y, bed: 1 },
        clothes: [], books: [], papers: [], blanket: 0, fluff: 0, chain: 0, door: 0, teddy: 0,
      });
      S.g = Object.assign(S.g, { pose: 'stand', mood: 'cansada', x: LAY.guima.x, y: 0, tx: null, ty: null });
      S.happy = 12;
      S.p3 = { done: {}, hold: null, bedReady: 0, nextScare: S.now + 9000, used: [], windowScare: 0 };
    }
    if (stage === 'p4') {
      Object.assign(R, {
        decay: 3, sky: 'escuro', ceil: 0, lamp: 'off', monitor: 'off', fairy: 'off',
        curtain: { L: 0.93, R: 0.93 }, mirror: { cloth: 0, reflect: 0, fog: 0, cracked: 1, ready: 0 },
        blanket: 1, fluff: 3, door: 0, chain: 0,
      });
      S.g = Object.assign(S.g, { pose: 'bed', mood: 'dormindo', wake: 0, eyes: 0, drag: null });
      S.happy = 10;
      const p4 = S.p4;
      p4.threats = []; p4.waking = 0; p4.final = null;
      p4.startAt = S.now + 6000; p4.nextThreat = p4.startAt + 5000; p4.nextWake = p4.startAt + 9000;
    }
    if (stage === 'fim') {
      S.g.pose = 'none';
    }
    ev(S, 'estagio', { s: stage });
  }
  L.entrar = entrar;

  function cortar(S, n, d) { S.cut = Object.assign({ n, at: S.now }, d || {}); S.drags = {}; }

  // ---------------------------------------------------------------
  //  TICK (≈30x por segundo no anfitrião)
  // ---------------------------------------------------------------
  L.tick = function (S, now) {
    const dt = Math.min(0.2, (now - S.now) / 1000);
    S.now = now;
    const since = now - S.at;
    if (S.stage === 'intro') { if (since > 800) entrar(S, 'p1'); return; }
    if (S.cut) return tickCut(S, now - S.cut.at);
    if (S.stage === 'p1') return tick1(S, now);
    if (S.stage === 'p2') return tick2(S, now);
    if (S.stage === 'p3') return tick3(S, now, dt);
    if (S.stage === 'p4') return tick4(S, now, dt);
  };

  // ---------------- FASE 1 ----------------
  function propRuim(h) {
    let r = 0;
    for (const [lim, v] of C.fase1.ruins) if (h >= lim) r = v;
    return r;
  }
  function spawnItem(S, now) {
    const p = S.p1;
    p.spawns++;
    let bad = p.onlyBad || Math.random() < (p.euforia ? C.fase1.ruinsNaEuforia : propRuim(S.happy));
    if (!p.ruinsVistos && p.spawns === 4) bad = true; // logo no começo aparece um exemplo de coisa ruim
    if (bad) p.ruinsVistos++;
    let kind;
    if (bad) {
      const ativos = p.items.filter((i) => !i.taken).map((i) => i.kind);
      if (p.onlyBad && !ativos.includes('faca') && (p.knifeIn === 0 || Math.random() < 0.5)) kind = 'faca';
      else kind = pick(RUINS.filter((k) => k !== 'faca' && !ativos.includes(k)));
      if (kind === 'faca') p.knifeIn++;
    } else {
      const ativos = p.items.map((i) => i.kind);
      kind = pick(BONS.filter((k) => !ativos.includes(k)));
    }
    // caminho: entra por um lado, atravessa devagar, sai pelo outro
    const lado = pick(['e', 'd', 'e', 'd', 'c']);
    let x0, y0, x2, y2;
    if (lado === 'e') { x0 = -90; y0 = rnd(160, 760); x2 = 2010; y2 = rnd(160, 760); }
    else if (lado === 'd') { x0 = 2010; y0 = rnd(160, 760); x2 = -90; y2 = rnd(160, 760); }
    else { x0 = rnd(200, 1720); y0 = -90; x2 = rnd(200, 1720); y2 = 1170; }
    const x1 = rnd(420, 1500), y1 = rnd(180, 700);
    const [a, b] = C.fase1.duracaoItem;
    const life = p.onlyBad ? rnd(b + 3000, b + 8000) : rnd(a, b);
    p.items.push({ id: uid(), kind, bad: bad ? 1 : 0, born: now, life, p: [x0, y0, x1, y1, x2, y2], s: Math.random(), taken: 0 });
  }

  function tick1(S, now) {
    const p = S.p1, c = C.fase1;
    const duo = S.duo;
    p.items = p.items.filter((it) => (it.taken ? now - it.takenAt < 1400 : now - it.born < it.life));
    const livres = p.items.filter((i) => !i.taken).length;
    const max = p.onlyBad ? (duo ? 4 : 3) : duo ? c.maxItensDupla : c.maxItensNaTela;
    if (now >= p.next && livres < max) {
      spawnItem(S, now);
      const [a, b] = c.intervaloItens;
      p.next = now + rnd(a, b) * (duo ? c.ritmoDupla : 1) * (p.onlyBad ? 1.7 : p.euforia ? 0.8 : 1);
    }
    // sem cliques, a felicidade cai devagar (menos na euforia)
    if (!p.euforia && now - p.last > 5000 && now - p.dec > c.decaiCada) {
      p.dec = now;
      if (S.happy > 6) happy(S, -1);
    }
    if (p.onlyBad && now - p.dec > 3500) { p.dec = now; if (S.happy > 55) happy(S, -1); }
    // chegou em 100%: "feliz demais" — aviso de que vai mudar
    if (!p.euforia && !p.onlyBad && S.happy >= 100) {
      p.euforia = now; S.happy = 100;
      ev(S, 'euforia');
      fala(S, 'EU TÔ TÃO FELIZ!!!', 2600);
    }
    if (p.euforia && !p.onlyBad && now - p.euforia > c.duracaoEuforia) {
      p.onlyBad = now; p.next = now + 2500; p.waitTalk = now + 9000;
      ev(S, 'soRuins');
    }
    if (p.onlyBad && now > p.waitTalk) {
      p.waitTalk = now + rnd(9000, 14000);
      fala(S, pick(FALAS_ESPERA), 2600);
    }
    if (S.g.sad && now > S.g.sad) S.g.sad = 0;
  }

  // ---------------- FASE 2 ----------------
  const TAREFAS2 = ['pano', 'quadro', 'roupas', 'livros', 'travesseiro', 'gaveta', 'tomada', 'papeis'];
  const DICAS2 = {
    pano: '...tira esse pano do espelho?', quadro: 'o quadro tá torto...', roupas: 'minhas roupas tão no chão...',
    livros: 'meus livros... põe na mesa?', travesseiro: 'cadê meu travesseiro?', gaveta: 'fecha a gaveta?',
    tomada: 'a luz não para de piscar... o fio tá solto?', papeis: 'tem uns papéis rasgados pelo quarto...',
  };
  const DICAS3 = {
    cortinas: 'fecha a cortina... tem alguém olhando.', pc: 'desliga o computador...', luz: 'apaga a luz?',
    abajur: 'o abajur tem uma cordinha...', cobertor: 'arruma o cobertor pra mim?', travesseiro: 'afofa meu travesseiro?',
  };
  function dica(S, done, lista, dicas, p) {
    const falta = lista.filter((k) => !done[k]);
    if (!falta.length) return;
    fala(S, dicas[pick(falta)], 3200);
    p.proxDica = S.now + C.dicas.intervalo;
  }
  function feita2(S, t, ganho, x, y) {
    S.p2.ultima = S.now;
    if (S.p2.done[t]) return;
    S.p2.done[t] = 1;
    if (ganho) happy(S, ganho, x, y);
    atualizaEspelho(S);
  }
  function atualizaEspelho(S) {
    const d = S.p2.done, R = S.room;
    const total = TAREFAS2.filter((t) => d[t]).length;
    const k = total - (d.pano ? 1 : 0);
    let lvl = !d.pano ? 0 : k >= 6 ? 3 : k >= 4 ? 2 : k >= 2 ? 1 : 0;
    if (lvl > R.mirror.reflect) {
      R.mirror.reflect = lvl;
      ev(S, 'reflexo', { l: lvl });
      if (lvl === 2) setTimeout(() => {}, 0);
    }
    if (!R.mirror.ready && d.pano && total >= C.fase2.tarefasParaEspelho) {
      R.mirror.ready = 1; R.mirror.fog = 1;
      S.p2.readyAt = S.now;
      ev(S, 'espelhoChama');
    }
  }
  function tick2(S, now) {
    const R = S.room, p = S.p2;
    if (R.mirror.ready) {
      if (!p.talk1 && now - p.readyAt > 1800) { p.talk1 = 1; fala(S, '...tem alguma coisa no espelho.', 3600); }
      if (p.talk1 && now - Math.max(p.readyAt + 4000, p.ultRub || 0) > C.dicas.intervalo && now > (p.proxDica || 0)) { p.proxDica = now + C.dicas.intervalo; fala(S, pick(['...limpa o espelho pra mim?', 'esfrega o espelho...', 'eu preciso ver o que tem no espelho.']), 3000); }
    } else if (!p.talk0 && now - S.at > 9000) {
      p.talk0 = 1; fala(S, '...tá tudo bagunçado.', 2800);
    } else if (now - Math.max(p.ultima || S.at, S.at + 10000) > C.dicas.intervalo && now > (p.proxDica || 0)) {
      dica(S, p.done, TAREFAS2, DICAS2, p);
    }
  }

  // ---------------- FASE 3 ----------------
  const TAREFAS3 = ['cortinas', 'pc', 'luz', 'abajur', 'cobertor', 'travesseiro'];
  const SUSTOS3 = ['portaSombra', 'espelhoRosto', 'ursinho', 'relogio', 'sussurro', 'guimaOlha', 'passos', 'monitorRosto', 'janelaMao', 'luzPisca', 'porta'];
  function feita3(S, t, on) {
    const d = S.p3.done;
    S.p3.ultima = S.now;
    if (on === false) { delete d[t]; return; }
    if (d[t]) return;
    d[t] = 1;
    happy(S, 2, LAY.guima.x + 120, 300);
    if (!S.p3.bedReady && TAREFAS3.every((k) => d[k])) {
      S.p3.bedReady = S.now;
      ev(S, 'camaPronta');
      fala(S, '...boa noite?', 3000);
    }
  }
  function tick3(S, now, dt) {
    const p = S.p3, R = S.room;
    // segurar o botão do PC
    if (p.hold && R.monitor !== 'off' && now - p.hold.at > 1800) {
      R.monitor = 'off'; p.hold = null; p.pcOff = now;
      ev(S, 'som', { k: 'pcDesliga' });
      feita3(S, 'pc');
      agendaSusto(S, 'monitorReflexo', 1400);
    }
    // sustinhos aleatórios (paranoia)
    if (now > p.nextScare && now - S.at > 7000) {
      p.nextScare = now + rnd(8500, 15000);
      const ok = SUSTOS3.filter((k) => !p.used.slice(-4).includes(k) &&
        !(k === 'monitorRosto' && R.monitor === 'off') &&
        !(k === 'janelaMao' && R.curtain.L + R.curtain.R > 1.6));
      const k = pick(ok);
      p.used.push(k);
      susto(S, k);
    }
    for (const a of p.agenda || []) if (!a.feito && now >= a.t) { a.feito = 1; susto(S, a.k); }
    if (p.agenda) p.agenda = p.agenda.filter((a) => !a.feito);
    // Guima sendo levada até a cama
    const g = S.g;
    if (g.tx !== null && g.tx !== undefined) {
      const vx = g.tx - g.x, vy = g.ty - g.y;
      const sp = 260 * dt;
      const d = Math.hypot(vx, vy);
      if (d > 1) { const k = Math.min(1, sp / d); g.x += vx * k; g.y += vy * k; }
    }
    if (!p.bedReady && now - Math.max(p.ultima || S.at, S.at + 8000) > C.dicas.intervalo && now > (p.proxDica || 0)) dica(S, p.done, TAREFAS3, DICAS3, p);
    if (p.bedReady && !p.levaFala && now - p.bedReady > 12000) { p.levaFala = 1; fala(S, '...me leva até a cama?', 3200); }
    // barra de felicidade "falha" de vez em quando
    if (Math.random() < 0.01) S.happy = clamp(S.happy + (Math.random() < 0.5 ? -1 : 1), 6, 30);
  }
  function susto(S, k) {
    const dur = { portaSombra: 1400, espelhoRosto: 420, ursinho: 5200, relogio: 2600, sussurro: 2500, guimaOlha: 2400, passos: 2600, monitorRosto: 380, janelaMao: 900, luzPisca: 1600, porta: 3200, monitorReflexo: 700, janelaRosto: 520, portaPes: 1600 }[k] || 1000;
    ev(S, 'susto', { k, dur });
  }
  function agendaSusto(S, k, emMs) {
    (S.p3.agenda = S.p3.agenda || []).push({ k, t: S.now + emMs });
  }

  // ---------------- FASE 4 ----------------
  // ameaças que se movem: posição calculada pelo tempo (igual pros dois jogadores)
  G.posAmeaca = function (th, now) {
    const idade = now - th.born;
    if (th.k === 'rastejante') {
      const u = clamp(idade / th.dur, 0, 1);
      return { x: lerp(-80, 1440, u), y: 975 + Math.sin(idade / 180) * 6, r: 70, u };
    }
    if (th.k === 'pendurada') {
      const u = clamp(idade / th.dur, 0, 1);
      return { x: 1600, y: lerp(-160, 560, u), r: 85, u };
    }
    if (th.k === 'chefe') {
      const u = clamp(idade / th.dur, 0, 1);
      const ease = u; // rasteja em ritmo constante, com trancos
      return { x: lerp(-260, 1420, ease) + Math.sin(idade / 420) * 14, y: 930, r: 170, u };
    }
    if (th.k === 'final') return { x: LAY.coisaFinal.x, y: LAY.coisaFinal.y, r: LAY.coisaFinal.r, u: 0 };
    const b = LAY.ameacas[th.k];
    return { x: b.x, y: b.y, r: b.r, u: 0 };
  };
  const TIPOS_FIXOS = Object.keys(LAY.ameacas);
  function hpAmeaca(S, kk, k) {
    const base = { rastejante: 2, pendurada: 3 }[kk] || LAY.ameacas[kk].hp;
    if (S.duo) return base * 2 + Math.floor(k * 3);
    return base + (k > 0.55 ? 1 : 0);
  }
  function tick4(S, now, dt) {
    const p = S.p4, g = S.g, c = C.fase4;
    const e = now - p.startAt;
    if (e < 0) return;
    const k = clamp(e / c.duracao, 0, 1);
    // relógio do computador: 00:30 → 04:00
    const hora = Math.floor(0.5 + k * 3.5);
    if (hora > (p.hora || 0) && !p.final) { p.hora = hora; ev(S, 'hora', { h: hora }); }
    if (!p.final) {
      const chefe = p.threats.find((t) => t.k === 'chefe');
      // o inimigo difícil aparece 3 vezes, cada vez mais forte
      const marcas = c.chefeEm;
      if (!chefe && p.chefes < marcas.length && k >= marcas[p.chefes]) {
        const n = p.chefes++;
        const hp = (S.duo ? c.chefeVidaDupla : c.chefeVidaSolo)[n];
        p.threats.push({ id: uid(), k: 'chefe', born: now, hp, max: hp, dur: c.chefeDuracao[n], n });
        ev(S, 'chefe', { n });
        fala(S, pick(['...tem alguma coisa no chão.', 'ele tá vindo...', 'não deixa ele chegar em mim.']), 3000);
      }
      // novas sombras
      if (now >= p.nextThreat) {
        const ativos = p.threats.map((t) => t.k);
        const maxA = Math.round(lerp(2, 6, k)) - (chefe ? 1 : 0);
        let opcoes = TIPOS_FIXOS.filter((t) => !ativos.includes(t));
        if (k > 0.15 && !ativos.includes('rastejante')) opcoes.push('rastejante', 'rastejante');
        if (k > 0.35 && !ativos.includes('pendurada')) opcoes.push('pendurada', 'pendurada');
        if (p.threats.length < maxA && opcoes.length) {
          const kk = pick(opcoes);
          const th = { id: uid(), k: kk, born: now, hp: hpAmeaca(S, kk, k) };
          if (kk === 'rastejante') th.dur = lerp(15000, 9000, k);
          if (kk === 'pendurada') th.dur = lerp(12000, 8000, k);
          th.max = th.hp;
          p.threats.push(th);
          ev(S, 'ameaca', { k: kk });
        }
        p.nextThreat = now + lerp(c.ameacaIntervalo[0], c.ameacaIntervalo[1], k) * rnd(0.75, 1.2) * (chefe ? 1.8 : 1);
      }
      // ameaças que chegam na Guima
      for (const th of p.threats.slice()) {
        if (!['rastejante', 'pendurada', 'chefe'].includes(th.k)) continue;
        const pos = G.posAmeaca(th, now);
        if (pos.u >= 1) {
          p.threats = p.threats.filter((x) => x !== th);
          const dano = th.k === 'chefe' ? 45 : th.k === 'pendurada' ? 25 : 18;
          g.wake = clamp(g.wake + dano, 0, 100);
          p.waking = p.waking || now;
          ev(S, 'chegou', { k: th.k, x: pos.x, y: pos.y });
        }
      }
      // ela começa a acordar
      if (!p.waking && now >= p.nextWake) {
        p.waking = now;
        ev(S, 'olhos');
      }
      let dw = -4 * dt;
      if (p.waking) dw = lerp(8, 20, k) * dt;
      for (const t of p.threats) if (now - t.born > 2500) dw += (now - t.born > 7000 ? 2.4 : 1.1) * (1 + k) * (t.k === 'chefe' ? 1.5 : 1) * dt;
      g.wake = clamp(g.wake + dw, 0, 100);
      g.eyes = p.waking ? 1 : 0;
      if (Math.random() < 0.02) S.happy = clamp(S.happy + pick([-2, -1, 1, 2]), 0, 20);
      if (g.wake >= 100) {
        if (c.falhaReinicia) { cortar(S, 'acordou'); ev(S, 'acordou'); }
        else g.wake = 99;
      }
      if (e >= c.duracao && !chefe) {
        p.final = { at: now, st: 'calma' };
        p.threats = []; p.waking = 0; g.eyes = 0;
        g.wake = Math.min(g.wake, 10);
        p.hora = 4;
        ev(S, 'silencio');
        ev(S, 'hora', { h: 4 });
      }
    } else {
      const f = p.final, fe = now - f.at;
      g.wake = Math.max(0, g.wake - 6 * dt);
      if (f.st === 'calma' && fe > 7000) {
        f.st = 'coisa'; f.coisaAt = now;
        p.threats = [{ id: 'final', k: 'final', born: now, hp: 1 }];
        ev(S, 'ameaca', { k: 'final' });
      }
      if (f.st === 'coisa' && now - f.coisaAt > 16000) transformar(S);
    }
  }
  function transformar(S) {
    S.p4.threats = [];
    cortar(S, 'transforma');
    ev(S, 'transforma');
  }

  // ---------------- CENAS (cutscenes com tempo) ----------------
  function tickCut(S, e) {
    const c = S.cut;
    if (c.n === 'quebra') {
      if (!c.a && e > 1500) { c.a = 1; ev(S, 'quebra'); }
      if (e > 7200) entrar(S, 'p2');
    } else if (c.n === 'espelho') {
      if (e > 4200) entrar(S, 'p3');
    } else if (c.n === 'boaNoite') {
      if (e > 5200) entrar(S, 'p4');
    } else if (c.n === 'acordou') {
      if (e > 3800) {
        const p = S.p4;
        p.fails++; p.threats = []; p.waking = 0; S.g.wake = 0; S.g.eyes = 0; p.chefes = 0; p.hora = 0;
        p.startAt = S.now + 1500; p.nextThreat = p.startAt + 4000; p.nextWake = p.startAt + 8000;
        S.cut = null;
        ev(S, 'rebobina');
      }
    } else if (c.n === 'transforma') {
      if (!c.j && e > 10400) { c.j = 1; ev(S, 'grito'); }
      if (e > 14500) { entrar(S, 'fim'); }
    }
  }

  // ---------------------------------------------------------------
  //  AÇÕES DOS JOGADORES
  //  a = { t:'click'|'drag'|'rub'|'hold', o:objeto, st:'s'|'m'|'e', x, y }
  // ---------------------------------------------------------------
  L.acao = function (S, pid, a) {
    if (!a || !a.t) return;
    if (S.cut) return;
    const since = S.now - S.at;
    if (since < 1500 && S.stage !== 'fim') return;
    const R = S.room, now = S.now;

    // ---------- FASE 1 ----------
    if (S.stage === 'p1' && a.t === 'click') {
      const it = S.p1.items.find((i) => i.id === a.o && !i.taken);
      if (!it) return;
      const pos = G.itemPos(it, now);
      it.taken = 1; it.takenAt = now; it.tx = pos.x; it.ty = pos.y;
      S.p1.last = now;
      if (it.bad && S.p1.onlyBad) {
        it.fate = 'lento';
        cortar(S, 'quebra', { item: it.kind });
        ev(S, 'silencio');
        return;
      }
      if (it.bad) {
        it.fate = 'poof';
        const n = -C.fase1.perdaItemRuim;
        happy(S, n);
        ev(S, 'ruim', { kind: it.kind, x: pos.x, y: pos.y, n });
        S.g.sad = now + 2600;
        fala(S, pick(FALAS_RUINS), 1800);
        return;
      }
      it.fate = 'guima';
      const n = Math.round(rnd(C.fase1.ganhoMin, C.fase1.ganhoMax + 0.99));
      happy(S, n);
      ev(S, 'bom', { kind: it.kind, x: pos.x, y: pos.y, n });
      if (Math.random() < 0.55) fala(S, pick(FALAS_BOAS[it.kind] || ['obrigada :)']), 1900);
      return;
    }

    // ---------- arrastar (fases 2, 3) ----------
    if (a.t === 'drag') return arrastar(S, pid, a);
    if (a.t === 'rub' && S.stage === 'p2' && R.mirror.ready) {
      const pts = (a.pts || []).slice(0, 80).map((n) => Math.round(n));
      let dist = 0;
      for (let i = 0; i + 3 < pts.length; i += 2) dist += Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
      S.p2.strokes.push(pts);
      if (S.p2.strokes.length > 160) { S.p2.strokes.shift(); S.p2.sBase++; }
      S.p2.rub += Math.min(dist, 400);
      S.p2.ultRub = now;
      if (S.p2.rub >= C.fase2.esfregarNecessario) {
        cortar(S, 'espelho');
        ev(S, 'revela');
        S.happy = 3;
      }
      return;
    }
    if (a.t === 'hold' && S.stage === 'p3' && a.o === 'pc') {
      if (a.on && R.monitor !== 'off') { S.p3.hold = { pid, at: now }; ev(S, 'pcSegura'); }
      else if (!a.on && S.p3.hold && S.p3.hold.pid === pid) S.p3.hold = null;
      return;
    }
    if (a.t !== 'click') return;

    // ---------- cliques fase 2 ----------
    if (S.stage === 'p2') {
      if (a.o === 'tomada' && !R.plug) {
        R.plug = 1; R.lamp = 'on';
        ev(S, 'som', { k: 'tomada' });
        feita2(S, 'tomada', 5, LAY.abajur.x, 520);
        return;
      }
      if (a.o && a.o.startsWith('papel:')) {
        const p = R.papers.find((x) => 'papel:' + x.id === a.o && !x.got);
        if (!p) return;
        p.got = 1;
        ev(S, 'som', { k: 'papel' });
        happy(S, 1, p.x, p.y - 30);
        if (R.papers.every((x) => x.got)) { ev(S, 'desenho'); feita2(S, 'papeis', 0); }
        return;
      }
      if (a.o === 'espelho' && !R.mirror.ready && R.mirror.cloth === 0) {
        ev(S, 'espelhoToque');
      }
      if (a.o === 'guima') ev(S, 'toqueGuima');
      return;
    }

    // ---------- cliques fase 3 ----------
    if (S.stage === 'p3') {
      if (a.o === 'interruptor') {
        R.ceil = R.ceil ? 0 : 1;
        ev(S, 'som', { k: 'interruptor' });
        if (!R.ceil) { feita3(S, 'luz'); if (!S.p3.pes) { S.p3.pes = 1; agendaSusto(S, 'portaPes', 1300); } }
        else feita3(S, 'luz', false);
        return;
      }
      if (a.o === 'travesseiroCama' && R.fluff < 3) {
        R.fluff++;
        ev(S, 'fofar', {});
        if (R.fluff >= 3) feita3(S, 'travesseiro');
        return;
      }
      if (a.o === 'monitor' && R.monitor !== 'off') { ev(S, 'dicaPc'); return; }
      if (a.o === 'guima' && !S.p3.bedReady) { ev(S, 'toqueGuima'); return; }
      return;
    }

    // ---------- cliques fase 4 ----------
    if (S.stage === 'p4') {
      const p4 = S.p4;
      if (a.o === 'guima') {
        if (p4.waking || S.g.wake > 20) {
          S.g.wake = Math.max(0, S.g.wake - (S.duo ? 12 : 22));
          if (S.g.wake < 30) {
            p4.waking = 0;
            const k = clamp((now - p4.startAt) / C.fase4.duracao, 0, 1);
            p4.nextWake = now + lerp(C.fase4.acordarIntervalo[0], C.fase4.acordarIntervalo[1], k) * rnd(0.8, 1.2);
          }
          ev(S, 'shh', { x: LAY.guimaCama.x, y: LAY.guimaCama.y });
        }
        return;
      }
      if (a.o && a.o.startsWith('ameaca:')) {
        const id = a.o.slice(7);
        const t = p4.threats.find((x) => x.id === id);
        if (!t) return;
        if (t.k === 'final') { transformar(S); return; }
        t.hp--;
        const pos = G.posAmeaca(t, now);
        if (t.hp <= 0) {
          p4.threats = p4.threats.filter((x) => x !== t);
          ev(S, t.k === 'chefe' ? 'chefeMorre' : 'afastar', { k: t.k, x: pos.x, y: pos.y });
        } else ev(S, t.k === 'chefe' ? 'chefeAcerto' : 'acerto', { k: t.k, x: pos.x, y: pos.y, id: t.id });
      }
    }
  };

  // ---------- arrastar ----------
  const ARRASTAVEIS = {
    p2: ['pano', 'quadro', 'gaveta', 'travesseiro', 'roupa', 'livro'],
    p3: ['cortinaE', 'cortinaD', 'cobertor', 'corrente', 'guima'],
  };
  function arrastar(S, pid, a) {
    const R = S.room, now = S.now;
    const lista = ARRASTAVEIS[S.stage];
    if (!lista) return;
    const base = String(a.o || '').split(':')[0];
    if (!lista.includes(base)) return;
    const x = +a.x || 0, y = +a.y || 0;
    let d = S.drags[pid];
    if (a.st === 's') {
      // alguém já está arrastando isso?
      for (const k in S.drags) if (k !== pid && S.drags[k].o === a.o) return;
      if (base === 'guima' && !S.p3.bedReady) return;
      d = S.drags[pid] = { o: a.o, sx: x, sy: y };
      if (base === 'pano') d.v0 = R.mirror.cloth;
      if (base === 'quadro') d.v0 = R.frame.rot;
      if (base === 'gaveta') d.v0 = R.drawer;
      if (base === 'cortinaE') d.v0 = R.curtain.L;
      if (base === 'cortinaD') d.v0 = R.curtain.R;
      if (base === 'cobertor') d.v0 = R.blanket;
      if (base === 'travesseiro') { d.ox = R.pillow.x - x; d.oy = R.pillow.y - y; }
      if (base === 'roupa') { const o = R.clothes.find((c) => 'roupa:' + c.id === a.o); if (!o || o.done) { delete S.drags[pid]; return; } d.ox = o.x - x; d.oy = o.y - y; }
      if (base === 'livro') { const o = R.books.find((c) => 'livro:' + c.id === a.o); if (!o || o.done) { delete S.drags[pid]; return; } d.ox = o.x - x; d.oy = o.y - y; }
      if (base === 'guima') { d.ox = S.g.x - x; d.oy = S.g.y - y; }
      ev(S, 'pega', { o: a.o });
      return;
    }
    if (!d || d.o !== a.o) return;
    const dx = x - d.sx, dy = y - d.sy;
    const fim = a.st === 'e';

    if (base === 'pano') {
      R.mirror.cloth = clamp(Math.min(d.v0, d.v0 - dy / 380), 0, 1);
      if (fim) {
        if (R.mirror.cloth < 0.4) { R.mirror.cloth = 0; ev(S, 'som', { k: 'pano' }); feita2(S, 'pano', 4, 752, 420); }
      }
    } else if (base === 'quadro') {
      R.frame.rot = clamp(d.v0 + dx * 0.09 + dy * 0.02, -40, 40);
      if (fim) {
        if (Math.abs(R.frame.rot) < 1.6) { R.frame.rot = 0; ev(S, 'som', { k: 'quadro' }); feita2(S, 'quadro', 5, LAY.quadro.x, LAY.quadro.y); }
        else if (S.p2.done.quadro) { delete S.p2.done.quadro; }
      }
    } else if (base === 'gaveta') {
      R.drawer = clamp(d.v0 + dy / 90, 0, 1);
      if (fim && R.drawer < 0.18) { R.drawer = 0; ev(S, 'som', { k: 'gaveta' }); feita2(S, 'gaveta', 3, 526, 640); }
    } else if (base === 'travesseiro') {
      R.pillow.x = clamp(x + d.ox, 40, 1880); R.pillow.y = clamp(y + d.oy, 560, 1050);
      if (fim) {
        const z = LAY.zonaCama;
        if (R.pillow.x > z.x && R.pillow.x < z.x + z.w && R.pillow.y > z.y && R.pillow.y < z.y + z.h) {
          Object.assign(R.pillow, { x: LAY.travesseiroCama.x, y: LAY.travesseiroCama.y, bed: 1 });
          ev(S, 'som', { k: 'travesseiro' });
          feita2(S, 'travesseiro', 4, LAY.travesseiroCama.x, 640);
        } else { R.pillow.y = Math.max(R.pillow.y, 900); ev(S, 'som', { k: 'soltar' }); }
      }
    } else if (base === 'roupa' || base === 'livro') {
      const arr = base === 'roupa' ? R.clothes : R.books;
      const o = arr.find((c) => base + ':' + c.id === a.o);
      if (!o || o.done) return;
      o.x = clamp(x + d.ox, 30, 1890); o.y = clamp(y + d.oy, 420, 1060);
      if (fim) {
        const z = base === 'roupa' ? { x: LAY.cesto.x - 20, y: LAY.cesto.y - 70, w: LAY.cesto.w + 40, h: LAY.cesto.h + 70 } : LAY.zonaMesa;
        if (o.x > z.x && o.x < z.x + z.w && o.y > z.y && o.y < z.y + z.h) {
          o.done = 1;
          ev(S, 'som', { k: base === 'roupa' ? 'pano' : 'soltar' });
          happy(S, 2, o.x, o.y - 40);
          if (arr.every((c) => c.done)) feita2(S, base === 'roupa' ? 'roupas' : 'livros', 0);
        } else { o.y = Math.max(o.y, 830); ev(S, 'som', { k: 'soltar' }); }
      }
    } else if (base === 'cortinaE' || base === 'cortinaD') {
      const lado = base === 'cortinaE' ? 'L' : 'R';
      const antes = R.curtain[lado];
      R.curtain[lado] = clamp(d.v0 + (lado === 'L' ? dx : -dx) / 200, 0.05, 1);
      if (Math.abs(R.curtain[lado] - antes) > 0.02 && Math.random() < 0.3) ev(S, 'som', { k: 'cortina' });
      const tot = R.curtain.L + R.curtain.R;
      if (!S.p3.windowScare && tot > 1.25 && tot < 1.7) { S.p3.windowScare = 1; susto(S, 'janelaRosto'); }
      if (fim) {
        if (R.curtain.L > 0.94 && R.curtain.R > 0.94) { R.curtain.L = R.curtain.R = 1; feita3(S, 'cortinas'); }
        else feita3(S, 'cortinas', false);
      }
    } else if (base === 'cobertor') {
      R.blanket = clamp(d.v0 + dx / 230, 0, 1);
      if (fim) { if (R.blanket > 0.8) { R.blanket = 1; ev(S, 'som', { k: 'pano' }); feita3(S, 'cobertor'); } }
    } else if (base === 'corrente') {
      R.chain = clamp(dy / 46, 0, 1);
      if (fim) {
        if (R.chain >= 1) {
          R.lamp = R.lamp === 'off' ? 'on' : 'off';
          ev(S, 'som', { k: 'interruptor' });
          feita3(S, 'abajur', R.lamp === 'off' ? undefined : false);
        }
        R.chain = 0;
      }
    } else if (base === 'guima') {
      S.g.tx = clamp(x + d.ox, 700, 1800);
      S.g.ty = clamp(y + d.oy, -120, 260);
      if (fim) {
        const noLeito = S.g.x > 1330 && S.g.tx > 1330;
        if (noLeito) { S.g.tx = null; cortar(S, 'boaNoite'); ev(S, 'boaNoite'); }
        else { ev(S, 'toqueGuima'); }
      }
    }
    if (fim) delete S.drags[pid];
  }

  // ---------------------------------------------------------------
  //  PAINEL F2 (gravação)
  // ---------------------------------------------------------------
  L.debug = function (S, cmd, val) {
    const R = S.room;
    if (cmd === 'reset') { const n = L.novo(S.now, S.duo); Object.assign(S, n, { evSeq: S.evSeq, ev: [] }); return; }
    if (cmd === 'fase') {
      const seq = S.evSeq;
      Object.assign(S, L.novo(S.now, S.duo), { evSeq: seq, ev: [] });
      entrar(S, val);
      if (val === 'p1') {}
      return;
    }
    if (cmd === 'felicidade') { S.happy = clamp(+val, 0, 100); return; }
    if (cmd === 'soRuins' && S.stage === 'p1') { S.happy = 100; S.p1.euforia = S.now - C.fase1.duracaoEuforia - 10; return; }
    if (cmd === 'euforia' && S.stage === 'p1') { S.happy = 100; return; }
    if (cmd === 'chefe' && S.stage === 'p4') { const p = S.p4, hp = (S.duo ? C.fase4.chefeVidaDupla : C.fase4.chefeVidaSolo)[0]; p.threats.push({ id: uid(), k: 'chefe', born: S.now, hp, max: hp, dur: C.fase4.chefeDuracao[0], n: 0 }); ev(S, 'chefe', { n: 0 }); return; }
    if (cmd === 'espelhoPronto' && S.stage === 'p2') {
      R.mirror.cloth = 0; R.frame.rot = 0; R.drawer = 0; R.plug = 1; R.lamp = 'on';
      R.clothes.forEach((c) => (c.done = 1)); R.books.forEach((c) => (c.done = 1)); R.papers.forEach((c) => (c.got = 1));
      Object.assign(R.pillow, { x: LAY.travesseiroCama.x, y: LAY.travesseiroCama.y, bed: 1 });
      TAREFAS2.forEach((t) => (S.p2.done[t] = 1));
      atualizaEspelho(S);
      return;
    }
    if (cmd === 'revelar' && S.stage === 'p2') { cortar(S, 'espelho'); ev(S, 'revela'); return; }
    if (cmd === 'camaPronta' && S.stage === 'p3') {
      R.curtain.L = R.curtain.R = 1; R.monitor = 'off'; R.ceil = 0; R.lamp = 'off'; R.blanket = 1; R.fluff = 3;
      TAREFAS3.forEach((t) => feita3(S, t));
      return;
    }
    if (cmd === 'dormir' && S.stage === 'p3') { cortar(S, 'boaNoite'); ev(S, 'boaNoite'); return; }
    if (cmd === 'susto') { if (S.stage === 'p3') susto(S, val || pick(SUSTOS3)); return; }
    if (cmd === 'coisaFinal' && S.stage === 'p4') {
      S.p4.startAt = S.now - C.fase4.duracao - 10; S.p4.final = { at: S.now - 7100, st: 'calma' }; S.p4.threats = []; return;
    }
    if (cmd === 'transformar') { if (S.stage !== 'p4') entrar(S, 'p4'); transformar(S); return; }
    if (cmd === 'jumpscare') { if (S.stage !== 'p4') entrar(S, 'p4'); cortar(S, 'transforma'); S.cut.at = S.now - 9600; return; }
    if (cmd === 'quebra' && S.stage === 'p1') { cortar(S, 'quebra', { item: 'faca' }); ev(S, 'silencio'); return; }
  };
})();
