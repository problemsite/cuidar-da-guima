// =====================================================================
//  JOGO — lobby, laço de desenho, entrada do mouse, efeitos e cenas.
// =====================================================================
(function () {
  const G = window.G, C = window.CONFIG, L = G.L, A = G.Arte, LAY = G.LAY, Rede = G.Rede, Som = G.Som;
  const { clamp, lerp, rnd, pick } = G.util;
  const $ = (id) => document.getElementById(id);

  // ---------------- canvas ----------------
  const palco = $('palco');
  let tela = $('tela');
  const cena = A.novoCanvas(1920, 1080);
  const c = cena.getContext('2d');
  let usaFX = false;
  let ctxSimples = null;
  function ajustarTela() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    tela.width = Math.round(innerWidth * dpr); tela.height = Math.round(innerHeight * dpr);
  }
  addEventListener('resize', ajustarTela);
  ajustarTela();
  const semFX = /[?&]semfx/.test(location.search) || C.efeitos === false;
  const fxForcado = /fxsempre/.test(location.search);
  usaFX = !semFX && G.FX.iniciar(tela);
  function modoSimples() {
    usaFX = false;
    $('tela').hidden = true;
    tela = $('tela2d'); tela.hidden = false;
    ajustarTela();
    ctxSimples = tela.getContext('2d');
  }
  if (!usaFX) modoSimples();
  // se o PC estiver sofrendo com os efeitos, desliga sozinho
  let fxMedidas = 0, fxTempo = 0;

  // ---------------- estado ----------------
  let S = null;              // estado do jogo (no anfitrião é o original)
  let ehHost = false, meuNome = '', sala = null;
  let offset = 0, offsets = [];
  let evVisto = -1;
  const agora = () => Date.now() + (ehHost ? 0 : offset);
  const lobbyS = L.novo(Date.now());
  lobbyS.stage = 'lobby';

  // efeitos locais
  const fx = { glitch: 0, flash: 0, flashC: [1, 1, 1], shake: 0, invert: 0, chroma: 0, zoom: 1, zx: 0.5, zy: 0.5 };
  const par = [];            // partículas
  const nums = [];           // números flutuantes
  let fala = null;           // balão
  let sustos = [];           // sustos ativos (fase 3)
  let reacao = 0, tremorGuima = 0, desenhoAt = -1e9, dicaPcAte = 0, fofarAt = 0;
  let felicidadeVisivel = C.fase1.felicidadeInicial, pulsoHud = 0;
  let olhosAbertos = 0;      // animação das pálpebras na fase 4
  const acertos = {};        // ameaças que tomaram clique (tremor)
  const ameacaSome = [];     // ameaças sumindo
  const vistas = {};         // quando cada ameaça apareceu (local)
  let mostrarAreas = false, esconderHud = false, horaAviso = null;
  let views = 1200, chat = [], chatProx = 0;

  // =================================================================
  //  LOBBY
  // =================================================================
  const lobby = $('lobby');
  $('modoRede').textContent = Rede.modo === 'firebase' ? 'online (Firebase)' : 'modo local — abra outra aba para o 2º jogador';
  try { $('nome').value = localStorage.getItem('guimaNome') || ''; } catch (e) {}
  const salaURL = new URLSearchParams(location.search).get('sala');
  if (salaURL) $('codigo').value = salaURL.toUpperCase();

  function erro(msg) { $('erro').textContent = msg || ''; }
  function pegarNome() {
    const n = $('nome').value.trim().replace(/[<>]/g, '').slice(0, 20);
    if (!n) { erro('Digite seu nome.'); $('nome').focus(); return null; }
    try { localStorage.setItem('guimaNome', n); } catch (e) {}
    return n;
  }
  function telaCheia() {
    if (!C.telaCheia || document.fullscreenElement) return;
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el).catch?.(() => {});
  }
  function ativarSom() { Som.iniciar(); }

  async function preparar() {
    try { await Rede.iniciar(); }
    catch (e) { erro('Não foi possível conectar ao Firebase: ' + e.message); throw e; }
  }
  let preparado = null;

  $('criar').onclick = async () => {
    ativarSom();
    const n = pegarNome(); if (!n) return;
    meuNome = n; erro('');
    try {
      preparado = preparado || preparar(); await preparado;
      const r = await Rede.criar(n, false);
      entrouNaSala(r.code);
    } catch (e) { erro(e.message); }
  };
  $('entrar').onclick = async () => {
    ativarSom();
    const n = pegarNome(); if (!n) return;
    const code = $('codigo').value.trim().toUpperCase();
    if (!code) { erro('Digite o código da sala.'); return; }
    meuNome = n; erro('');
    try {
      preparado = preparado || preparar(); await preparado;
      const r = await Rede.entrar(code, n);
      if (r.estado && Rede.host) { S = normalizar(r.estado); evVisto = S.evSeq; }
      entrouNaSala(r.code);
    } catch (e) { erro(e.message); }
  };
  $('solo').onclick = async () => {
    ativarSom();
    const n = pegarNome() || 'Jogador'; meuNome = n; erro('');
    telaCheia();
    try {
      preparado = preparado || preparar(); await preparado;
      const r = await Rede.criar(n, true);
      entrouNaSala(r.code);
      Rede.pronto(true);
      comecarPartida();
    } catch (e) { erro(e.message); }
  };
  $('pronto').onclick = () => {
    ativarSom(); telaCheia();
    const eu = sala && sala.jogadores[Rede.pid];
    Rede.pronto(!(eu && eu.pronto));
  };
  $('comecar').onclick = () => { ativarSom(); telaCheia(); comecarPartida(); };
  $('copiar').onclick = async () => {
    const url = location.origin + location.pathname + '?sala=' + Rede.code;
    try { await navigator.clipboard.writeText(location.protocol === 'file:' ? Rede.code : url); $('copiar').textContent = 'copiado!'; }
    catch (e) { $('copiar').textContent = Rede.code; }
    setTimeout(() => ($('copiar').textContent = 'copiar link'), 1600);
  };

  function entrouNaSala(code) {
    $('etapaEntrar').hidden = true;
    $('etapaSala').hidden = false;
    $('codigoSala').textContent = code;
    history.replaceState(null, '', '?sala=' + code);
  }

  Rede.onSala((s) => {
    sala = s;
    ehHost = Rede.host;
    const lista = $('jogadores');
    lista.innerHTML = '';
    Object.entries(s.jogadores || {}).forEach(([pid, j]) => {
      const li = document.createElement('li');
      const nome = document.createElement('span');
      nome.textContent = j.nome + (pid === s.host ? '  ✦' : '') + (pid === Rede.pid ? ' (você)' : '');
      const st = document.createElement('b');
      st.textContent = !j.on ? 'offline' : j.pronto ? 'pronto' : 'esperando';
      st.className = j.pronto ? 'ok' : '';
      li.append(nome, st); lista.append(li);
    });
    const eu = s.jogadores && s.jogadores[Rede.pid];
    $('pronto').textContent = eu && eu.pronto ? 'cancelar pronto' : 'estou pronto';
    const js = Object.values(s.jogadores || {});
    const todos = js.length === 2 && js.every((j) => j.pronto && j.on);
    $('comecar').hidden = !(ehHost && todos);
    $('aguarde').textContent = js.length < 2 ? 'Esperando o segundo jogador entrar…' : !todos ? 'Os dois precisam marcar "pronto".' : ehHost ? 'Tudo certo!' : 'Esperando o anfitrião começar…';
    if (s.comecou && ehHost && !S) { S = L.novo(Date.now(), ehDupla()); }
    if (!s.comecou && S && S.stage === 'fim') { /* voltou ao lobby */ }
  });

  function ehDupla() {
    const js = Object.values((sala && sala.jogadores) || {});
    return !(sala && sala.solo) && js.length >= 2;
  }
  function comecarPartida() {
    if (!ehHost) return;
    S = L.novo(Date.now(), ehDupla());
    evVisto = S.evSeq;
    Rede.comecar();
    publicar(true);
  }

  // estado recebido (convidado)
  function normalizar(s) {
    s.ev = s.ev || [];
    s.room = s.room || {};
    const R = s.room;
    R.curtain = R.curtain || { L: 0, R: 0 }; R.frame = R.frame || { rot: 0 }; R.mirror = R.mirror || {};
    R.clothes = R.clothes || []; R.books = R.books || []; R.papers = R.papers || []; R.pillow = R.pillow || { x: 1552, y: 704, bed: 1 };
    ['cloth', 'reflect', 'fog', 'cracked', 'ready'].forEach((k) => (R.mirror[k] = R.mirror[k] || 0));
    s.p1 = s.p1 || {}; s.p1.items = s.p1.items || [];
    s.p2 = s.p2 || {}; s.p2.done = s.p2.done || {}; s.p2.strokes = s.p2.strokes || []; s.p2.sBase = s.p2.sBase || 0;
    s.p3 = s.p3 || {}; s.p3.done = s.p3.done || {};
    s.p4 = s.p4 || {}; s.p4.threats = s.p4.threats || [];
    s.g = s.g || {}; s.drags = s.drags || {};
    return s;
  }
  let pendente = null; // arrasto local do convidado para previsão
  Rede.onEstado((s) => {
    if (ehHost) return;
    s = normalizar(s);
    const amostra = s.now - Date.now();
    offsets.push(amostra); if (offsets.length > 30) offsets.shift();
    offset = Math.max(...offsets);
    const primeira = !S;
    S = s;
    if (primeira) { evVisto = S.evSeq; iniciouPartida(); }
    if (pendente) preverArrasto();
  });

  let partidaVisivel = false;
  function iniciouPartida() {
    if (partidaVisivel) return;
    partidaVisivel = true;
    lobby.classList.add('some');
    setTimeout(() => (lobby.hidden = true), 900);
    document.body.classList.add('jogando');
  }

  // --------------- anfitrião: ações e publicação ---------------
  Rede.onAcao((pid, a) => {
    if (!ehHost || !S) return;
    if (a && a.t === 'debug') { L.debug(S, a.cmd, a.val); limparLocais(); publicar(true); return; }
    L.acao(S, pid, a);
  });
  let ultPub = 0;
  function publicar(forca) {
    if (!ehHost || !S) return;
    const t = performance.now();
    if (!forca && t - ultPub < 80) return;
    ultPub = t;
    Rede.publicar(JSON.parse(JSON.stringify(S)));
  }

  // =================================================================
  //  COORDENADAS / ENTRADA
  // =================================================================
  function mundo(px, py) {
    const W = innerWidth, H = innerHeight;
    const esc = Math.max(W / 1920, H / 1080);
    return { x: (1920 - W / esc) / 2 + px / esc, y: (1080 - H / esc) / 2 + py / esc };
  }
  function visivel() {
    const W = innerWidth, H = innerHeight;
    const esc = Math.max(W / 1920, H / 1080);
    return { x: (1920 - W / esc) / 2, y: (1080 - H / esc) / 2, w: W / esc, h: H / esc };
  }
  const dentro = (x, y, r) => x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3];
  const perto = (x, y, px, py, r) => (x - px) ** 2 + (y - py) ** 2 < r * r;

  // posição do busto da Guima em pé
  function posGuima() {
    const S = window.G._S || lobbyS;
    const g = S.g;
    const x = S.stage === 'p3' ? g.x : LAY.guima.x;
    const dy = S.stage === 'p3' ? g.y || 0 : 0;
    const esc = S.stage === 'p3' ? lerp(1, 0.7, clamp((x - 985) / 560, 0, 1)) : 1;
    return { x, y: 655 + dy + (1 - esc) * 120, esc };
  }

  function alvo(x, y) {
    if (!S || S.cut) return null;
    const now = agora(), el = now - S.at, R = S.room;
    if (el < 1500) return null;
    if (S.stage === 'p1') {
      let melhor = null, md = 1e9;
      for (const it of S.p1.items) {
        if (it.taken) continue;
        const p = G.itemPos(it, now);
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        const r = S.p1.onlyBad ? 70 : 52;
        if (d < r * r && d < md) { md = d; melhor = it; }
      }
      if (melhor) return { t: 'click', o: melhor.id, cursor: 'pointer' };
      return null;
    }
    if (S.stage === 'p2') {
      for (const p of R.papers) if (!p.got && perto(x, y, p.x, p.y, 30)) return { t: 'click', o: 'papel:' + p.id };
      if (!R.plug && perto(x, y, LAY.tomada.x + 8, LAY.tomada.y + 30, 18)) return { t: 'click', o: 'tomada' };
      for (const o of R.clothes) if (!o.done && perto(x, y, o.x, o.y, 58)) return { t: 'drag', o: 'roupa:' + o.id };
      for (const o of R.books) if (!o.done && perto(x, y, o.x, o.y, 42)) return { t: 'drag', o: 'livro:' + o.id };
      if (!R.pillow.bed && perto(x, y, R.pillow.x, R.pillow.y, 76)) return { t: 'drag', o: 'travesseiro' };
      const gv = LAY.gaveta;
      if (R.drawer > 0 && dentro(x, y, [gv.x - 10, gv.y - 10 + R.drawer * 34, gv.w + 20, gv.h + 30])) return { t: 'drag', o: 'gaveta' };
      const q = LAY.quadro;
      if (dentro(x, y, [q.x - 115, q.y - 110, 230, 200])) return { t: 'drag', o: 'quadro' };
      const e = LAY.espelho;
      if (dentro(x, y, [e.x, e.y, e.w, e.h])) {
        if (R.mirror.cloth > 0) return { t: 'drag', o: 'pano' };
        if (R.mirror.ready) return { t: 'rub', o: 'espelho' };
        return { t: 'click', o: 'espelho' };
      }
      const pg = posGuima();
      if (perto(x, y, pg.x, pg.y - 170, 150)) return { t: 'click', o: 'guima' };
      return null;
    }
    if (S.stage === 'p3') {
      const s = LAY.interruptor;
      if (dentro(x, y, [s.x - 18, s.y - 24, 36, 48])) return { t: 'click', o: 'interruptor' };
      const b = LAY.monitor.botao;
      if (R.monitor !== 'off' && perto(x, y, b.x, b.y, 36)) return { t: 'hold', o: 'pc' };
      const m = LAY.monitor;
      if (R.monitor !== 'off' && dentro(x, y, [m.x, m.y, m.w, m.h])) return { t: 'click', o: 'monitor' };
      const ch = LAY.abajur.corrente;
      if (dentro(x, y, [ch.x - 22, ch.y - 30, 32, 54])) return { t: 'drag', o: 'corrente' };
      const pg = posGuima();
      if (S.p3.bedReady && perto(x, y, pg.x, pg.y - 160 * pg.esc, 190 * pg.esc)) return { t: 'drag', o: 'guima' };
      const bx = lerp(1600, 1790, R.blanket);
      if (R.blanket < 1 && dentro(x, y, [bx + 16, 696, 170, 110])) return { t: 'drag', o: 'cobertor' };
      if (perto(x, y, R.pillow.x, R.pillow.y, 64)) return { t: 'click', o: 'travesseiroCama' };
      const K = LAY.cortina;
      const wL = lerp(96, K.meio - K.x0 + 16, R.curtain.L), wR = lerp(96, K.meio - K.x0 + 16, R.curtain.R);
      if (dentro(x, y, [K.x0 - 10, K.y0, wL + 10, K.y1 - K.y0 + 10])) return { t: 'drag', o: 'cortinaE' };
      if (dentro(x, y, [K.x1 - wR, K.y0, wR + 10, K.y1 - K.y0 + 10])) return { t: 'drag', o: 'cortinaD' };
      if (!S.p3.bedReady && perto(x, y, pg.x, pg.y - 170, 150)) return { t: 'click', o: 'guima' };
      return null;
    }
    if (S.stage === 'p4') {
      const now2 = agora();
      // o chefe primeiro (é grande e fica na frente)
      const lista = S.p4.threats.slice().sort((a, b) => (b.k === 'chefe') - (a.k === 'chefe'));
      for (const th of lista) {
        if (now2 - th.born < 350) continue;
        const pos = G.posAmeaca(th, now2);
        if (perto(x, y, pos.x, pos.y, pos.r * 1.15)) return { t: 'click', o: 'ameaca:' + th.id };
      }
      const hp = posCabecaCama();
      if (perto(x, y, hp.x, hp.y, 120)) return { t: 'click', o: 'guima' };
    }
    return null;
  }

  let ponteiro = { x: 960, y: 540, down: false, dentro: false };
  let arrasto = null, esfregando = null, segurando = null, ultEnvio = 0, ultEsfregarSom = 0;

  function enviar(a) {
    if (ehHost) { if (S) L.acao(S, Rede.pid, a); }
    else {
      Rede.enviar(a);
      if (a.t === 'drag' && S) {
        if (a.st === 's') pendente = { s: a, m: null };
        else if (a.st === 'm' && pendente) pendente.m = a;
        else if (a.st === 'e') pendente = null;
        preverAcao(a);
      }
    }
  }
  function preverAcao(a) {
    const seq = S.evSeq, n = S.ev.length;
    try { L.acao(S, Rede.pid, a); } catch (e) {}
    S.ev.length = n; S.evSeq = seq;
  }
  function preverArrasto() {
    if (!pendente || !S) return;
    if (!S.drags[Rede.pid]) preverAcao(pendente.s);
    if (pendente.m) preverAcao(pendente.m);
  }

  palco.addEventListener('pointermove', (e) => {
    const p = mundo(e.clientX, e.clientY);
    ponteiro.x = p.x; ponteiro.y = p.y; ponteiro.dentro = true;
    if (!S) return;
    const t = performance.now();
    if (arrasto && t - ultEnvio > 33) {
      ultEnvio = t;
      enviar({ t: 'drag', st: 'm', o: arrasto.o, x: Math.round(p.x), y: Math.round(p.y) });
    }
    if (esfregando) {
      esfregando.pts.push(Math.round(p.x), Math.round(p.y));
      apagarNevoaLocal(esfregando.px, esfregando.py, p.x, p.y);
      esfregando.px = p.x; esfregando.py = p.y;
      if (t - ultEsfregarSom > 140) { ultEsfregarSom = t; Som.tocar('esfregar', { x: p.x }); }
      if (esfregando.pts.length >= 16 || t - esfregando.t0 > 90) enviarEsfregar(p);
    }
    if (!arrasto && !esfregando) {
      const a = alvo(p.x, p.y);
      palco.style.cursor = a && a.cursor ? a.cursor : a && a.t === 'rub' ? 'grab' : '';
    }
  });
  function enviarEsfregar(p) {
    if (esfregando.pts.length >= 4) enviar({ t: 'rub', pts: esfregando.pts });
    esfregando.pts = [Math.round(p.x), Math.round(p.y)];
    esfregando.t0 = performance.now();
  }
  palco.addEventListener('pointerdown', (e) => {
    Som.iniciar();
    const p = mundo(e.clientX, e.clientY);
    ponteiro.down = true; ponteiro.x = p.x; ponteiro.y = p.y;
    if (!S || !partidaVisivel) return;
    palco.setPointerCapture(e.pointerId);
    const a = alvo(p.x, p.y);
    anelLocal(p.x, p.y);
    if (!a) return;
    if (a.t === 'click') enviar({ t: 'click', o: a.o });
    else if (a.t === 'drag') {
      arrasto = { o: a.o };
      palco.style.cursor = 'grabbing';
      enviar({ t: 'drag', st: 's', o: a.o, x: Math.round(p.x), y: Math.round(p.y) });
    } else if (a.t === 'rub') {
      esfregando = { pts: [Math.round(p.x), Math.round(p.y)], px: p.x, py: p.y, t0: performance.now() };
      palco.style.cursor = 'grabbing';
    } else if (a.t === 'hold') {
      segurando = a.o;
      enviar({ t: 'hold', o: a.o, on: true });
    }
  });
  function soltar(e) {
    ponteiro.down = false;
    const p = e ? mundo(e.clientX, e.clientY) : ponteiro;
    if (arrasto) { enviar({ t: 'drag', st: 'e', o: arrasto.o, x: Math.round(p.x), y: Math.round(p.y) }); arrasto = null; }
    if (esfregando) { enviarEsfregar(p); esfregando = null; }
    if (segurando) { enviar({ t: 'hold', o: segurando, on: false }); segurando = null; }
    palco.style.cursor = '';
  }
  palco.addEventListener('pointerup', soltar);
  palco.addEventListener('pointercancel', soltar);
  palco.addEventListener('pointerleave', () => { ponteiro.dentro = false; });
  palco.addEventListener('contextmenu', (e) => e.preventDefault());

  // cursores dos outros
  const cursores = {};
  let ultCursor = 0, ultCursorPos = '';
  Rede.onCursores((pid, cc) => {
    if (!cc) return;
    const ant = cursores[pid];
    if (cc.d && (!ant || !ant.d)) anelOutro(cc.x, cc.y);
    cursores[pid] = Object.assign(cc, { visto: performance.now() });
  });
  function enviarCursor() {
    const t = performance.now();
    if (t - ultCursor < 70) return;
    const k = Math.round(ponteiro.x) + ',' + Math.round(ponteiro.y) + ',' + ponteiro.down;
    if (k === ultCursorPos && t - ultCursor < 1500) return;
    ultCursor = t; ultCursorPos = k;
    Rede.cursor({ x: Math.round(ponteiro.x), y: Math.round(ponteiro.y), d: ponteiro.down ? 1 : 0, n: meuNome });
  }
  const aneis = [];
  function anelOutro(x, y) { aneis.push({ x, y, t: performance.now(), outro: 1 }); }
  function anelLocal(x, y) { aneis.push({ x, y, t: performance.now(), outro: 0 }); }

  // teclado
  addEventListener('keydown', (e) => {
    if (e.key === 'F2') { e.preventDefault(); $('painel').hidden = !$('painel').hidden; }
    if ((e.key === 'm' || e.key === 'M') && document.activeElement.tagName !== 'INPUT') {
      const mudo = Som.alternarMudo();
      aviso(mudo ? 'som desligado (M)' : 'som ligado (M)');
    }
    if (e.key === 'h' && document.activeElement.tagName !== 'INPUT' && !$('painel').hidden) { esconderHud = !esconderHud; }
  });
  let avisoTxt = '', avisoAte = 0;
  function aviso(t) { avisoTxt = t; avisoAte = performance.now() + 1600; }

  // ---------------- painel F2 ----------------
  $('painel').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cmd]');
    if (!b) return;
    debug(b.dataset.cmd, b.dataset.val);
  });
  $('fecharPainel').onclick = () => ($('painel').hidden = true);
  $('areas').onchange = (e) => (mostrarAreas = e.target.checked);
  $('semHud').onchange = (e) => (esconderHud = e.target.checked);
  $('felic').onchange = (e) => debug('felicidade', +e.target.value);
  function debug(cmd, val) {
    if (!S) return;
    if (ehHost) { L.debug(S, cmd, val); limparLocais(); publicar(true); }
    else Rede.enviar({ t: 'debug', cmd, val });
  }
  $('denovo').onclick = () => debug('reset');
  function limparLocais() {
    sustos = []; fala = null; nums.length = 0; par.length = 0; nevoaFeita = -1; olhosAbertos = 0;
    evVisto = S.evSeq;
  }

  // =================================================================
  //  EVENTOS
  // =================================================================
  function processarEventos() {
    if (!S || !S.ev) return;
    if (evVisto > S.evSeq) evVisto = S.evSeq; // reset
    for (const e of S.ev) {
      if (e.i <= evVisto) continue;
      evVisto = e.i;
      tratar(e);
    }
  }
  function tratar(e) {
    const d = e.d || {}, now = agora(), pg = posGuima();
    switch (e.t) {
      case 'fala': fala = { txt: d.txt, at: performance.now(), dur: d.dur || 2200 }; break;
      case 'bom':
        Som.tocar('item', { x: d.x }); setTimeout(() => Som.tocar('brilho', { x: 985 }), 360);
        if (Math.random() < 0.3) setTimeout(() => Som.tocar('risada', { x: 985 }), 520);
        reacao = performance.now() + 380;
        setTimeout(() => {
          numero(pg.x + rnd(-40, 40), 300, d.n);
          for (let i = 0; i < 9; i++) particula('coracao', pg.x + rnd(-60, 60), 330 + rnd(-40, 40), rnd(-90, 90), rnd(-260, -120), rnd(0.9, 1.6));
          for (let i = 0; i < 12; i++) particula('brilho', pg.x + rnd(-120, 120), 380 + rnd(-120, 80), rnd(-40, 40), rnd(-80, -20), rnd(0.5, 1.1));
          pulsoHud = 1;
        }, 520);
        views += Math.floor(rnd(200, 900));
        break;
      case 'ruim':
        Som.tocar('itemRuim', { x: d.x });
        numero(d.x, d.y - 40, d.n);
        for (let i = 0; i < 14; i++) particula('fumaca', d.x, d.y, rnd(-120, 120), rnd(-120, 40), rnd(0.6, 1.2));
        fx.shake = Math.max(fx.shake, 0.4); fx.glitch = Math.max(fx.glitch, 0.25); tremorGuima = performance.now() + 500;
        break;
      case 'num': numero(d.x, d.y, d.n); break;
      case 'som': Som.tocar(d.k, { x: d.x }); break;
      case 'soRuins': Som.tocar('glitch', { vol: 0.4 }); fx.glitch = 0.3; break;
      case 'quebra':
        Som.tocar('quebra'); fx.shake = 1.5; fx.glitch = 1.2; fx.flash = 1; fx.flashC = [0, 0, 0];
        setTimeout(() => Som.tocar('zumbido', { dur: 4 }), 400);
        break;
      case 'silencio': Som.pararMusica(); break;
      case 'estagio': limparTransicao(d.s); break;
      case 'reflexo':
        Som.tocar(d.l >= 2 ? 'sussurro' : 'glitch', { x: 752, vol: 0.5 }); fx.glitch = Math.max(fx.glitch, 0.15);
        break;
      case 'espelhoChama': Som.tocar('zumbido', { dur: 5 }); setTimeout(() => Som.tocar('sussurro', { x: 752 }), 1500); break;
      case 'espelhoToque': Som.tocar('quadro', { x: 752 }); break;
      case 'toqueGuima': tremorGuima = performance.now() + 250; break;
      case 'desenho': desenhoAt = performance.now(); Som.tocar('susto', { vol: 0.6 }); fx.glitch = 0.3; break;
      case 'revela':
        Som.tocar('revelacao'); Som.pararMusica();
        break;
      case 'pega': Som.tocar('pega', { x: ponteiro.x }); break;
      case 'susto': iniciarSusto(d.k, d.dur); break;
      case 'pcSegura': Som.tocar('glitch', { x: 350, vol: 0.5 }); break;
      case 'dicaPc': dicaPcAte = performance.now() + 2600; Som.tocar('pega', { x: 350 }); break;
      case 'fofar': fofarAt = performance.now(); Som.tocar('travesseiro', { x: 1552 }); break;
      case 'boaNoite': Som.pararMusica(); break;
      case 'ameaca': {
        vistas[e.i] = 1;
        const snd = { porta: 'rangido', janela: 'susto', cama: 'sussurro', espelho: 'glitch', canto: 'respiro', teto: 'sussurro', monitor: 'glitch', criado: 'rangido' }[d.k];
        const pos = LAY.ameacas[d.k] || LAY.coisaFinal;
        if (snd) Som.tocar(snd, { x: pos.x, vol: d.k === 'janela' ? 0.5 : 0.8 });
        if (d.k === 'final') Som.tocar('respiro', { x: pos.x, vol: 0.6 });
        break;
      }
      case 'olhos': Som.tocar('respiro', { x: 1556, vol: 0.8 }); break;
      case 'euforia':
        Som.tocar('euforia'); pulsoHud = 1.5; reacao = performance.now();
        for (let i = 0; i < 24; i++) particula('coracao', pg.x + rnd(-200, 200), 400 + rnd(-150, 100), rnd(-120, 120), rnd(-300, -100), rnd(1, 2));
        break;
      case 'chefe': Som.tocar('chefeEntra'); fx.glitch = 0.7; fx.shake = 0.8; fx.flash = 0.35; fx.flashC = [0.6, 0, 0.05]; break;
      case 'chefeAcerto':
        acertos[d.id] = performance.now(); Som.tocar('chefeAcerto', { x: d.x });
        for (let i = 0; i < 5; i++) particula('pedaco', d.x + rnd(-60, 60), d.y + rnd(-60, 20), rnd(-200, 200), rnd(-320, -80), rnd(0.8, 1.4));
        fx.shake = Math.max(fx.shake, 0.25);
        break;
      case 'chefeMorre':
        Som.tocar('chefeMorre', { x: d.x }); fx.glitch = 0.8; fx.shake = 1;
        for (let i = 0; i < 40; i++) particula('fumacaEscura', d.x + rnd(-120, 120), d.y + rnd(-60, 40), rnd(-260, 260), rnd(-260, 40), rnd(0.8, 1.8));
        for (let i = 0; i < 16; i++) particula('pedaco', d.x + rnd(-100, 100), d.y + rnd(-60, 20), rnd(-300, 300), rnd(-400, -100), rnd(1, 1.8));
        break;
      case 'chegou':
        Som.tocar('susto', { x: d.x }); fx.shake = Math.max(fx.shake, d.k === 'chefe' ? 1.4 : 0.6); fx.glitch = Math.max(fx.glitch, 0.5);
        if (d.k === 'chefe') setTimeout(() => Som.tocar('grito', { vol: 0.4 }), 200);
        break;
      case 'hora': Som.tocar('badalada'); horaAviso = { h: d.h, t: performance.now() }; break;
      case 'shh':
        Som.tocar('shh', { x: d.x });
        for (let i = 0; i < 3; i++) particula('z', d.x + 40 + i * 20, d.y - 40 - i * 20, rnd(10, 30), -40, 1.6 + i * 0.2);
        break;
      case 'afastar': {
        Som.tocar('afastar', { x: d.x });
        for (let i = 0; i < 22; i++) particula('fumacaEscura', d.x, d.y, rnd(-160, 160), rnd(-160, 60), rnd(0.6, 1.3));
        ameacaSome.push({ k: d.k, t: performance.now() });
        break;
      }
      case 'acerto': acertos[d.id] = performance.now(); Som.tocar('afastar', { x: d.x, vol: 0.5 }); break;
      case 'acordou': Som.tocar('susto'); fx.glitch = 1; fx.shake = 1; setTimeout(() => Som.tocar('grito', { vol: 0.35 }), 900); break;
      case 'rebobina': Som.tocar('rebobina'); break;
      case 'transforma': Som.tocar('glitch'); Som.tocar('susto', { vol: 0.7 }); Som.pararMusica(); break;
      case 'grito': Som.tocar('grito'); break;
      case 'camaPronta': break;
    }
  }
  function limparTransicao(s) {
    sustos = []; fala = null; ameacaSome.length = 0;
    if (s === 'p2') { nevoaFeita = -1; }
    if (s === 'p4') olhosAbertos = 0;
  }
  function numero(x, y, n) { nums.push({ x, y, n, t: performance.now() }); }
  function particula(tipo, x, y, vx, vy, vida) { par.push({ tipo, x, y, vx, vy, vida, t: performance.now(), r: rnd(0, 6), s: rnd(0.7, 1.3) }); }

  // sustos da fase 3
  function iniciarSusto(k, dur) {
    sustos.push({ k, t: performance.now(), dur });
    const snd = {
      portaSombra: 'rangido', espelhoRosto: 'susto', ursinho: null, relogio: null, sussurro: 'sussurro', guimaOlha: 'zumbido',
      passos: 'passos', monitorRosto: 'glitch', janelaMao: 'susto', luzPisca: 'glitch', porta: 'rangido', monitorReflexo: 'susto',
      janelaRosto: 'susto', portaPes: 'passos',
    }[k];
    const x = { portaSombra: 1150, espelhoRosto: 752, sussurro: undefined, passos: 1150, monitorRosto: 350, janelaMao: 305, porta: 1150, monitorReflexo: 350, janelaRosto: 305, portaPes: 1150 }[k];
    if (snd) Som.tocar(snd, { x, vol: k === 'monitorReflexo' || k === 'espelhoRosto' ? 0.6 : 1 });
    if (k === 'espelhoRosto' || k === 'monitorRosto' || k === 'janelaRosto') fx.glitch = Math.max(fx.glitch, 0.35);
  }
  function sustoAtivo(k) {
    const t = performance.now();
    for (const s of sustos) if (s.k === k && t - s.t < s.dur) return (t - s.t) / s.dur;
    return -1;
  }

  // =================================================================
  //  MONITOR: views e chat (só visual)
  // =================================================================
  const NOMES = ['lulu', 'gabs_', 'kaique', 'mari.s', 'problems_fã', 'teteu', 'bia', 'nandinho', 'jujuba', 'rafa'];
  const CORES = ['#ff9fc0', '#9fd6ff', '#ffe08a', '#b7ff9f', '#d2b5ff'];
  const MSG = {
    p1: ['GUIMA!!!', 'que fofaa', 'kkkkk', 'ama', 'vai guima', 'salve', '<3 <3', 'primeira vez aqui', 'linda', 'hahaha'],
    p2: ['guima?', 'que foi isso', 'ela tá bem?', '...', 'olha o espelho', 'arruma o quarto', 'isso é roteiro?', 'tá estranho'],
    p3: ['vai dormir guima', 'desliga a live', 'ATRÁS DE VOCÊ', 'viram aquilo?', 'boa noite', 'não desliga', 'ela tá olhando'],
  };
  function atualizarChat(now) {
    if (!S) return;
    if (performance.now() < chatProx) return;
    chatProx = performance.now() + rnd(700, 1900);
    const lista = MSG[S.stage] || MSG.p1;
    const ruim = S.stage !== 'p1' && Math.random() < 0.35;
    chat.push({ n: pick(NOMES), c: pick(CORES), m: pick(lista), ruim });
    if (chat.length > 8) chat.shift();
    if (S.stage === 'p1') views += Math.floor(rnd(0, 40));
    else views = Math.max(3, views - Math.floor(rnd(10, 120)));
  }

  // =================================================================
  //  NÉVOA DO ESPELHO (fase 2)
  // =================================================================
  const E = LAY.espelho;
  const nevoa = A.novoCanvas(E.w, E.h);
  let nevoaFeita = -1; // índice do último traço aplicado (-1 = refazer)
  function refazerNevoa() {
    const n = nevoa.getContext('2d');
    n.globalCompositeOperation = 'source-over';
    n.clearRect(0, 0, E.w, E.h);
    n.fillStyle = 'rgba(206,198,210,0.93)'; n.fillRect(0, 0, E.w, E.h);
    const r = A.semente(11);
    for (let i = 0; i < 900; i++) { n.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '120,110,120'},${r() * 0.15})`; n.fillRect(r() * E.w, r() * E.h, 2 + r() * 3, 2 + r() * 3); }
    // escorridos
    for (let i = 0; i < 14; i++) { const x = r() * E.w; n.fillStyle = 'rgba(150,140,155,0.25)'; n.fillRect(x, r() * E.h * 0.5, 2, 60 + r() * 200); }
    // marca de mão por dentro
    n.fillStyle = 'rgba(70,50,65,0.5)';
    A.mao(n, E.w * 0.55, E.h * 0.36, 1.2);
    nevoaFeita = S ? (S.p2.sBase || 0) : 0;
  }
  function apagarSeg(n, x0, y0, x1, y1, forca) {
    n.globalCompositeOperation = 'destination-out';
    n.strokeStyle = `rgba(0,0,0,${forca})`; n.lineWidth = 46; n.lineCap = 'round'; n.lineJoin = 'round';
    n.beginPath(); n.moveTo(x0 - E.x, y0 - E.y); n.lineTo(x1 - E.x, y1 - E.y); n.stroke();
  }
  function apagarNevoaLocal(x0, y0, x1, y1) { apagarSeg(nevoa.getContext('2d'), x0, y0, x1, y1, 0.3); }
  function atualizarNevoa() {
    if (!S || S.stage !== 'p2') return;
    if (nevoaFeita < 0) refazerNevoa();
    const p2 = S.p2, n = nevoa.getContext('2d');
    const total = (p2.sBase || 0) + p2.strokes.length;
    if (nevoaFeita < (p2.sBase || 0)) nevoaFeita = p2.sBase || 0;
    while (nevoaFeita < total) {
      const pts = p2.strokes[nevoaFeita - (p2.sBase || 0)] || [];
      for (let i = 0; i + 3 < pts.length; i += 2) apagarSeg(n, pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 0.22);
      nevoaFeita++;
    }
  }

  // =================================================================
  //  DESENHO DA CENA
  // =================================================================
  let tLocal = 0;
  function desenhar() {
    const t = performance.now() / 1000;
    tLocal = t;
    const st = S || lobbyS;
    G._S = st;
    const now = S ? agora() : Date.now();
    const R = st.room;
    const ehLobby = st.stage === 'lobby';
    const stage = st.stage === 'intro' || ehLobby ? 'p1' : st.stage;
    const el = now - st.at;
    const cut = st.cut, ce = cut ? now - cut.at : 0;
    const V = { stage: stage === 'lobby' ? 'p1' : stage, el, t, imgGuima: A.imgGuima, views, chat };

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';

    if (stage === 'fim') { A.fim(c, el, t); return fxFinal(stage, st, now); }
    const stageFX = ehLobby ? 'lobby' : stage;

    // ---------- sustos ativos em variáveis de visão ----------
    V.luzPisca = sustoAtivo('luzPisca') >= 0 || (stage === 'p2' && R.fairy === 'flicker' && Math.random() < 0.02);
    V.relogioGira = sustoAtivo('relogio') >= 0 || stage === 'p4';
    const ursinho = sustoAtivo('ursinho');
    V.ursoGiro = ursinho >= 0 ? Math.min(1, ursinho * 6) * 2.6 : stage === 'p4' ? 2.6 : 0;
    V.pesSombra = sustoAtivo('portaPes') >= 0 || sustoAtivo('passos') > 0.5;
    V.frestaLuz = stage === 'p1';

    // ---------- fundo ----------
    c.drawImage(A.fundo(R, stage), 0, 0);

    // coisas atrás das cortinas (janela)
    janelaAtras(c, R, st, now, t, stage);
    A.cortinas(c, R, t, { vento: stage === 'p4' ? 1 : 0.4 });
    A.luzesVaral(c, R, t, V);
    A.relogio(c, R, t, V);
    A.quadro(c, R, R.frame.rot, t, V);
    desenharEspelho(c, st, R, now, t, stage, cut, ce);

    // porta (pode abrir)
    let abertura = R.door || 0;
    const ps = sustoAtivo('portaSombra'), pp = sustoAtivo('porta');
    if (ps >= 0) abertura = Math.sin(ps * Math.PI) * 0.18;
    if (pp >= 0) abertura = Math.sin(pp * Math.PI) * 0.45;
    const thPorta = stage === 'p4' && st.p4.threats.find((x) => x.k === 'porta');
    if (thPorta) abertura = Math.min(0.62, (now - thPorta.born) / 1400 * 0.62);
    V.portaFigura = (cc) => {
      const P = LAY.porta;
      cc.save(); cc.beginPath(); cc.rect(P.x, P.y, P.w, P.h); cc.clip();
      if (ps >= 0 || pp >= 0) A.silhueta(cc, P.x + 70, P.y + 330, 1.1, '#000', pp >= 0 ? 'rgba(255,255,255,0.8)' : null, t);
      if (thPorta) desenharAmeaca(cc, thPorta, now, t);
      cc.restore();
    };
    A.porta(c, R, abertura, t, V);

    // monitor
    const mr = sustoAtivo('monitorRosto'), mref = sustoAtivo('monitorReflexo');
    if (mr >= 0) V.monitorLiga = (cc, x, y, w, h) => {
      cc.fillStyle = '#000'; cc.fillRect(x, y, w, h);
      A.rostoGrande(cc, x + w / 2, y + h / 2 + 10, 0.36, { t, distorce: 0.8, olhosPretos: 1, filtro: 'grayscale(1) contrast(1.8)' });
    };
    if (mref >= 0) V.monitorReflexo = (cc, x, y, w, h) => {
      cc.globalAlpha = 0.35; A.silhueta(cc, x + w / 2 + 30, y + h + 40, 0.5, '#999', 'rgba(255,255,255,0.9)', t); cc.globalAlpha = 1;
    };
    if (stage === 'p3' && st.p3.hold) V.pcSegurando = clamp((now - st.p3.hold.at) / 1800, 0, 1);
    V.dicaPc = performance.now() < dicaPcAte;
    if (R.monitor === 'off') {
      let min = null;
      if (stage === 'p3' && st.p3.pcOff) min = Math.floor((now - st.p3.pcOff) / 8000);
      if (stage === 'p4') min = st.p4.final ? 240 : Math.floor(30 + clamp((now - st.p4.startAt) / C.fase4.duracao, 0, 1) * 210);
      if (min !== null) V.relogioPC = String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
    }
    A.monitorTela(c, R, t, V);
    const thMon = stage === 'p4' && st.p4.threats.find((x) => x.k === 'monitor');
    if (thMon) desenharAmeaca(c, thMon, now, t);

    A.gaveta(c, R);
    const brilhoAbajur = intensidadeAbajur(R, t);
    V.correnteLocal = undefined;
    A.abajur(c, R, t, V, brilhoAbajur);
    A.ursinho(c, R, t, V);

    // livros guardados na mesa e roupas no cesto
    R.books.filter((b) => b.done).forEach((b, i) => A.livro(c, { x: 580 + (i % 2) * 4, y: 614 - i * 11, c: b.c, r: 0.03 * (i - 1) }));
    const guardadas = R.clothes.filter((o) => o.done).length;
    if (guardadas) {
      c.fillStyle = '#7fc1e0'; c.beginPath(); c.ellipse(LAY.cesto.x + 60, LAY.cesto.y + 12, 36, 12, 0.1, 0, 7); c.fill();
      if (guardadas > 1) { c.fillStyle = '#4f5d8f'; c.beginPath(); c.ellipse(LAY.cesto.x + 96, LAY.cesto.y + 8, 30, 10, -0.2, 0, 7); c.fill(); }
      if (guardadas > 2) { c.fillStyle = '#f4f0f2'; c.beginPath(); c.ellipse(LAY.cesto.x + 40, LAY.cesto.y + 4, 16, 8, 0.4, 0, 7); c.fill(); }
    }
    // chão: papéis, livros, roupas
    R.papers.forEach((p) => !p.got && A.papel(c, p));
    R.books.forEach((b) => !b.done && A.livro(c, b));
    R.clothes.forEach((o) => !o.done && A.roupa(c, o, t));

    // cama: travesseiro, Guima deitada, cobertor
    const fofo = Math.max(0, 1 - (performance.now() - fofarAt) / 400);
    const noChao = !R.pillow.bed;
    if (!noChao) A.travesseiro(c, R.pillow.x, R.pillow.y, Math.sin(fofo * Math.PI) * 1.5, false);
    const naCama = stage === 'p4' || (cut && cut.n === 'boaNoite' && ce > 1300);
    const thCama = stage === 'p4' && st.p4.threats.find((x) => x.k === 'cama');
    if (thCama) desenharAmeaca(c, thCama, now, t);
    const thCriado = stage === 'p4' && st.p4.threats.find((x) => x.k === 'criado');
    if (thCriado) desenharAmeaca(c, thCriado, now, t);
    if (naCama) desenharGuimaCama(c, st, now, t, cut, ce);
    else A.cobertor(c, R, R.blanket, false, t);
    if (noChao) A.travesseiro(c, R.pillow.x, R.pillow.y, 0, true);

    // Guima em pé
    if (!naCama && !ehLobby) desenharGuimaEmPe(c, st, now, t, cut, ce);
    if (ehLobby) A.guimaEmPe(c, LAY.guima.x, 655, { t, lids: A.piscada(t), inclina: Math.sin(t * 0.8) * 2 });

    // ameaças restantes da fase 4
    if (stage === 'p4') {
      for (const th of st.p4.threats) if (!['porta', 'monitor', 'cama', 'criado', 'espelho'].includes(th.k)) desenharAmeaca(c, th, now, t);
    }

    // ---------- luz ----------
    A.luz(c, luzes(st, R, now, t, stage, brilhoAbajur, cut, ce));

    // coisa final brilha por cima da escuridão
    if (stage === 'p4') {
      // as coisas aparecem um pouco mesmo no escuro (olhos, rostos pálidos)
      c.save(); c.globalAlpha = 0.42;
      for (const th of st.p4.threats) {
        if (th.k === 'porta') { c.save(); c.beginPath(); c.rect(LAY.porta.x, LAY.porta.y, LAY.porta.w, LAY.porta.h); c.clip(); desenharAmeaca(c, th, now, t); c.restore(); }
        else desenharAmeaca(c, th, now, t);
      }
      c.restore();
      for (const th of st.p4.threats) if (['final', 'teto', 'chefe', 'rastejante', 'pendurada'].includes(th.k)) desenharOlhosNoEscuro(c, th, now, t);
    }

    // ---------- itens flutuantes (fase 1) ----------
    if (stage === 'p1' && !ehLobby) desenharItens(c, st, now, t, cut, ce);

    // ---------- partículas, números, falas ----------
    desenharParticulas(c);
    desenharNumeros(c);
    desenharFala(c, st, now);
    desenharAneis(c);
    desenharCursores(c, stage);

    // overlays por fase / cenas
    if (!ehLobby) overlays(c, st, now, t, stage, el, cut, ce);

    if (mostrarAreas) desenharAreas(c);
    if (performance.now() < avisoAte) {
      c.save(); c.font = '800 22px Nunito, sans-serif'; c.fillStyle = 'rgba(255,240,245,0.9)'; c.textAlign = 'center';
      const v = visivel(); c.fillText(avisoTxt, 960, v.y + v.h - 40); c.restore();
    }
    fxFinal(stageFX, st, now);
  }

  function intensidadeAbajur(R, t) {
    if (R.lamp === 'off') return 0;
    if (R.lamp === 'flicker') {
      const n = Math.sin(t * 23) + Math.sin(t * 7.3) * 0.8 + Math.sin(t * 2.1);
      if (n > 1.5 || Math.random() < 0.04) return 0.08;
      return 0.8 + Math.random() * 0.1;
    }
    return 1;
  }

  // ------------------------------------------------------------------
  function janelaAtras(c, R, st, now, t, stage) {
    const J = LAY.janela;
    c.save(); c.beginPath(); c.rect(J.x, J.y, J.w, J.h); c.clip();
    const jr = sustoAtivo('janelaRosto'), jm = sustoAtivo('janelaMao');
    if (jr >= 0) {
      c.globalAlpha = Math.sin(jr * Math.PI);
      c.fillStyle = '#cfcac0'; c.beginPath(); c.ellipse(305, 250, 46, 62, 0, 0, 7); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(288, 240, 10, 15, 0, 0, 7); c.ellipse(322, 240, 10, 15, 0, 0, 7); c.ellipse(305, 285, 9, 16, 0, 0, 7); c.fill();
    }
    if (jm >= 0) {
      c.globalAlpha = 1; c.fillStyle = 'rgba(210,205,195,0.9)';
      A.mao(c, 240 + jm * 20, 300, 1.4);
    }
    c.restore();
  }

  // ------------------------------------------------------------------
  //  ESPELHO
  // ------------------------------------------------------------------
  const rachaduras = (() => {
    const r = A.semente(99), linhas = [];
    const cx = E.x + E.w * 0.42, cy = E.y + E.h * 0.4;
    for (let i = 0; i < 11; i++) {
      let x = cx, y = cy, a = (i / 11) * Math.PI * 2 + r() * 0.4;
      const pts = [[x, y]];
      for (let k = 0; k < 6; k++) { a += (r() - 0.5) * 0.7; const l = 20 + r() * 50; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); }
      linhas.push(pts);
    }
    return linhas;
  })();

  function desenharEspelho(c, st, R, now, t, stage, cut, ce) {
    const x = E.x, y = E.y, w = E.w, h = E.h;
    // pés
    c.fillStyle = '#8a5f3c'; c.fillRect(x + 20, y + h - 8, 14, 22); c.fillRect(x + w - 34, y + h - 8, 14, 22);
    c.fillStyle = 'rgba(30,10,20,0.3)'; c.beginPath(); c.ellipse(x + w / 2, y + h + 14, w * 0.6, 10, 0, 0, 7); c.fill();
    // moldura
    c.fillStyle = A.grad(c, x, 0, x + w, 0, [[0, '#a57a4f'], [0.5, '#d5ab77'], [1, '#9b6f45']]);
    c.beginPath(); A.formaEspelho(c, x, y, w, h); c.fill();
    c.strokeStyle = 'rgba(255,240,210,0.4)'; c.lineWidth = 2; c.beginPath(); A.formaEspelho(c, x + 7, y + 7, w - 14, h - 14); c.stroke();
    // vidro
    const gx = x + 14, gy = y + 14, gw = w - 28, gh = h - 28;
    c.save();
    c.beginPath(); A.formaEspelho(c, gx, gy, gw, gh); c.clip();
    const escuroV = stage === 'p1' ? 0 : stage === 'p2' ? 0.3 : 0.6;
    c.fillStyle = A.grad(c, 0, gy, 0, gy + gh, [[0, stage === 'p1' ? '#e9d3dc' : '#6d5a6a'], [0.6, stage === 'p1' ? '#c8a6b6' : '#4a3c4a'], [1, stage === 'p1' ? '#9a7686' : '#2c222c']]);
    c.fillRect(gx, gy, gw, gh);
    // reflexo do quarto (bem simples, invertido)
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(gx + gw * 0.6, gy + 60, 34, 150);
    c.fillStyle = `rgba(20,10,20,${0.25 + escuroV * 0.5})`; c.fillRect(gx, gy + gh * 0.72, gw, gh * 0.3);
    // conteúdo assustador
    if (stage === 'p2' && !(cut && cut.n === 'espelho')) {
      const lvl = R.mirror.reflect || 0;
      if (lvl >= 1) {
        c.globalAlpha = 0.16 + lvl * 0.04;
        A.silhueta(c, gx + gw / 2 + Math.sin(t * 0.3) * 6, gy + gh - 150, 0.9, '#1a0f18', null, t);
        c.globalAlpha = 1;
      }
      if (lvl >= 2) {
        const pul = Math.random() < 0.02 ? 1.3 : 1;
        A.rostoGrande(c, gx + gw / 2 + Math.sin(t * 0.7) * 3, gy + 200 + Math.sin(t * 0.4) * 5, lvl >= 3 ? 0.42 : 0.36, {
          t, distorce: lvl >= 3 ? 0.62 : 0.35, olhosPretos: 1, inclina: Math.sin(t * 0.35) * 8 + 6, sy: lvl >= 3 ? 1.3 : 1.15,
          alpha: (lvl >= 3 ? 0.42 : 0.22) * pul, filtro: `blur(${lvl >= 3 ? 1.5 : 3.5}px) grayscale(0.7) contrast(1.3)`,
        });
      }
      // névoa / poeira
      if (R.mirror.ready) { atualizarNevoa(); c.drawImage(nevoa, x, y); }
      else if (R.mirror.cloth < 1) { c.globalAlpha = 0.45; c.fillStyle = 'rgba(200,190,200,0.6)'; c.fillRect(gx, gy, gw, gh); c.globalAlpha = 1; }
    }
    if (stage === 'p1') {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath(); c.moveTo(gx + 20, gy + gh); c.lineTo(gx + 80, gy); c.lineTo(gx + 110, gy); c.lineTo(gx + 50, gy + gh); c.fill();
    }
    if (stage === 'p3' || stage === 'p4') {
      const er = sustoAtivo('espelhoRosto');
      if (er >= 0) A.rostoGrande(c, gx + gw / 2, gy + 220, 0.5, { t, distorce: 0.9, olhosPretos: 1, alpha: 0.9, filtro: 'grayscale(1) contrast(1.5)' });
      if (stage === 'p4') { const th = st.p4.threats.find((x2) => x2.k === 'espelho'); if (th) desenharAmeaca(c, th, now, t); }
    }
    // brilho do vidro
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.beginPath(); c.moveTo(gx + 10, gy + gh); c.lineTo(gx + 60, gy + 30); c.lineTo(gx + 80, gy + 30); c.lineTo(gx + 30, gy + gh); c.fill();
    c.restore();
    // rachadura
    if (R.mirror.cracked) {
      c.save(); c.beginPath(); A.formaEspelho(c, gx, gy, gw, gh); c.clip();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.6;
      rachaduras.forEach((pts) => { c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke(); });
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1;
      rachaduras.forEach((pts) => { c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a + 1.5, b + 1.5) : c.moveTo(a + 1.5, b + 1.5))); c.stroke(); });
      c.restore();
    }
    // pano cobrindo
    const pano = stage === 'p2' ? R.mirror.cloth : 0;
    if (stage === 'p2') {
      if (pano > 0.01) {
        const topo = y - 12 + (1 - pano) * (h * 0.92);
        c.fillStyle = A.grad(c, x - 20, 0, x + w + 20, 0, [[0, '#cfc6c0'], [0.3, '#ebe4de'], [0.6, '#d6cec7'], [1, '#bdb3ac']]);
        c.beginPath();
        c.moveTo(x - 14, topo + 40);
        c.quadraticCurveTo(x + w / 2, topo - 24, x + w + 14, topo + 40);
        c.lineTo(x + w + 22, y + h + 12);
        for (let i = 0; i <= 8; i++) c.lineTo(x + w + 22 - (i * (w + 44)) / 8, y + h + 12 + (i % 2 ? 10 : -4));
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(120,100,100,0.25)'; c.lineWidth = 3;
        for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + (i * w) / 5, topo + 20); c.quadraticCurveTo(x + (i * w) / 5 + 8, y + h * 0.7, x + (i * w) / 5 - 4, y + h + 8); c.stroke(); }
      } else {
        // pano no chão
        c.fillStyle = '#d6cec7';
        c.beginPath(); c.ellipse(x + w / 2 + 60, y + h + 30, 110, 26, 0.05, 0, 7); c.fill();
        c.fillStyle = 'rgba(120,100,100,0.25)'; c.beginPath(); c.ellipse(x + w / 2 + 70, y + h + 34, 70, 12, 0.05, 0, 7); c.fill();
      }
    }
    // espelho "chamando" (brilho pulsante sutil)
    if (stage === 'p2' && R.mirror.ready && !cut) {
      const a = 0.12 + Math.sin(t * 2.2) * 0.08;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = A.rad(c, x + w / 2, y + h / 2, 20, h * 0.6, [[0, `rgba(180,200,255,${a})`], [1, 'rgba(180,200,255,0)']]);
      c.fillRect(x - 100, y - 100, w + 200, h + 200); c.restore();
    }
  }

  // ------------------------------------------------------------------
  //  GUIMA
  // ------------------------------------------------------------------
  function desenharGuimaEmPe(c, st, now, t, cut, ce) {
    const g = st.g, stage = st.stage === 'intro' ? 'p1' : st.stage;
    const pg = posGuima();
    const o = { t, esc: pg.esc, rosto: 'feliz' };
    const pt = performance.now();
    const trem = pt < tremorGuima ? (Math.random() - 0.5) * 10 : 0;
    if (stage === 'p1') {
      const k = pt - reacao;
      let pulo = 0, estica = 0;
      if (k > 0 && k < 560) { const u = k / 560; pulo = -Math.sin(u * Math.PI) * 34; estica = Math.sin(u * Math.PI * 2) * 0.025; }
      o.pulo = pulo; o.estica = estica;
      o.lids = A.piscada(t);
      if (k > 0 && k < 700) o.lids = 0.55; // olhinhos fechados de felicidade
      o.inclina = Math.sin(t * 0.9) * 2.5 + (k > 0 && k < 600 ? Math.sin(k / 90) * 5 : 0) + trem;
      const eu = st.p1.euforia && !st.p1.onlyBad;
      if (eu) {
        // feliz demais: pulando sem parar
        o.pulo = -Math.abs(Math.sin(t * 8)) * 26; o.estica = Math.sin(t * 16) * 0.025;
        o.inclina = Math.sin(t * 5) * 7; o.lids = 0.45;
        if (Math.random() < 0.12) particula('coracao', pg.x + rnd(-160, 160), 380 + rnd(-100, 80), rnd(-60, 60), rnd(-240, -120), rnd(0.8, 1.4));
      }
      if (g.sad && now < g.sad) { o.rosto = 'desgosto'; o.inclina = -5 + trem; o.lids = 0; }
      if (st.p1.onlyBad) {
        const u = clamp((now - st.p1.onlyBad) / 40000, 0, 1);
        o.inclina = Math.sin(t * 0.5) * 1.5; o.palida = u * 0.2; o.lids = A.piscada(t * 0.7);
        if (u > 0.5 && !(g.sad && now < g.sad)) o.rosto = 'serio';
      }
      if (cut && cut.n === 'quebra') { o.lids = 0; o.inclina = 0; o.estica = 0; o.pulo = 0; o.rosto = ce > 500 ? 'medo' : 'serio'; }
    } else if (stage === 'p2') {
      const tw = (t % 4.3) < 0.12 ? (Math.random() - 0.5) * 16 : 0;
      o.rosto = (st.room.mirror.reflect || 0) >= 2 ? 'medo' : 'desgosto';
      o.inclina = 8 + Math.sin(t * 0.5) * 2 + tw + trem;
      o.olhosFundos = 0.45; o.palida = 0.22; o.cansada = 0.35;
      o.lids = A.piscada(t * 0.6, 2);
      o.filtro = 'saturate(0.7) brightness(0.95)';
      o.corpoEscuro = 1;
      if (cut && cut.n === 'espelho' && ce > 200) { o.rosto = 'panico'; o.olhosPretos = 1; o.inclina = 0; }
    } else if (stage === 'p3') {
      o.rosto = 'serio';
      o.cansada = 1; o.palida = 0.4; o.olhosFundos = 0.3; o.veias = 0.15;
      o.inclina = 5 + Math.sin(t * 0.4) * 3 + trem;
      o.lids = Math.max(0.3, A.piscada(t * 0.5, 1));
      o.filtro = 'saturate(0.55) brightness(0.88)';
      o.corpoEscuro = 1;
      const olha = sustoAtivo('guimaOlha');
      if (olha >= 0) { o.inclina = 0; o.lids = 0; o.olhosPretos = Math.min(1, olha * 5); o.filtro = 'saturate(0.2) brightness(0.8) contrast(1.3)'; }
      if (st.p3.bedReady) { o.lids = 0.6; o.inclina = 12 + Math.sin(t * 0.6) * 2; }
      if (cut && cut.n === 'boaNoite') o.alpha = clamp(1 - ce / 1000, 0, 1);
    }
    A.guimaEmPe(c, pg.x, pg.y, o);
  }

  function posCabecaCama() {
    const s = S ? sentar(S, agora()) : 0;
    const quadril = { x: 1810, y: 752 };
    const a0 = Math.atan2(-50, -188), a1 = Math.atan2(-236, -26);
    const ang = a0 + (a1 - a0) * s, dist = lerp(194, 238, s);
    const px = quadril.x + Math.cos(ang) * dist, py = quadril.y + Math.sin(ang) * dist;
    // centro do rosto fica ~90px "acima" do pescoço
    const rot = lerp(-Math.PI / 2, 0, s);
    return { x: px + Math.sin(rot) * 80, y: py - Math.cos(rot) * 80 };
  }
  function sentar(st, now) {
    const cut = st.cut;
    if (cut && cut.n === 'acordou') return clamp((now - cut.at) / 700, 0, 1);
    if (cut && cut.n === 'transforma') { const e = now - cut.at; return clamp((e - 1200) / 3000, 0, 1); }
    return clamp((st.g.wake || 0) / 100, 0, 1) * 0.72;
  }
  function desenharGuimaCama(c, st, now, t, cut, ce) {
    const g = st.g;
    const s = sentar(st, now);
    // pálpebras
    const alvoOlhos = g.eyes ? 1 : 0;
    olhosAbertos += (alvoOlhos - olhosAbertos) * (alvoOlhos ? 0.012 : 0.2);
    const w = g.wake || 0;
    const o = { t, rosto: 'dormindo', lids: 0, cansada: 1, palida: 0.5, veias: 0.35, olhosFundos: 0.3, filtro: 'saturate(0.4) brightness(0.86)', inclina: 0 };
    if (olhosAbertos > 0.35) { o.rosto = w > 55 ? 'panico' : 'medo'; o.lids = 1 - olhosAbertos; }
    if (w > 55) o.olhosPretos = clamp((w - 55) / 40, 0, 1) * olhosAbertos;
    o.inclina = s > 0.3 ? Math.sin(t * 13) * s * 3 : 0;
    if (cut && cut.n === 'acordou') { o.rosto = 'panico'; o.lids = 0; o.olhosPretos = 1; o.distorce = 0.3; }
    if (cut && cut.n === 'transforma') {
      const e = ce;
      o.rosto = e < 1200 ? 'dormindo' : e < 4200 ? 'panico' : 'feliz'; // no fim: o sorriso assustador
      o.lids = 0;
      o.olhosPretos = e > 1200 ? 1 : 0;
      o.distorce = clamp((e - 4200) / 2000, 0, 1);
      o.inclina = e > 6200 ? Math.sin(t * 1.3) * 4 + 10 : Math.sin(t * 20) * 2 * clamp((e - 1200) / 3000, 0, 1);
      o.filtro = `saturate(${0.35 - o.distorce * 0.3}) brightness(${0.9 + o.distorce * 0.1}) contrast(${1 + o.distorce * 0.4})`;
    }
    if (cut && cut.n === 'boaNoite') { o.rosto = 'dormindo'; o.lids = 0; }
    A.guimaNaCama(c, s, o);
    const resp = Math.sin(t * (cut && cut.n === 'transforma' ? 3 : 1.2));
    A.cobertor(c, st.room, 1, true, t, resp);
  }

  // ------------------------------------------------------------------
  //  AMEAÇAS
  // ------------------------------------------------------------------
  function desenharAmeaca(c, th, now, t) {
    const pos = G.posAmeaca(th, now);
    const idade = now - th.born;
    const a = clamp(idade / 700, 0, 1);
    const hit = acertos[th.id] ? clamp(1 - (performance.now() - acertos[th.id]) / 400, 0, 1) : 0;
    A.ameaca(c, th.k, pos, a, t, idade, hit + (idade > 6000 ? 0.15 : 0), th);
  }
  function desenharOlhosNoEscuro(c, th, now, t) {
    const pos = G.posAmeaca(th, now);
    const a = clamp((now - th.born) / 1200, 0, 1);
    c.save(); c.globalAlpha = a * 0.6; c.globalCompositeOperation = 'lighter';
    const olhosDe = { final: [[-10, 6], [12, 4]], chefe: [[46, -18], [68, -16]], rastejante: [[-8, -18], [8, -18]], pendurada: [[-12, 40], [12, 40]] }[th.k];
    if (olhosDe) {
      olhosDe.forEach(([dx, dy]) => {
        c.fillStyle = A.rad(c, pos.x + dx, pos.y + dy, 0, 22, [[0, 'rgba(255,250,220,0.8)'], [1, 'rgba(255,250,220,0)']]);
        c.beginPath(); c.arc(pos.x + dx, pos.y + dy, 22, 0, 7); c.fill();
      });
    }
    c.restore();
  }

  // ------------------------------------------------------------------
  //  ITENS
  // ------------------------------------------------------------------
  function desenharItens(c, st, now, t, cut, ce) {
    const pg = posGuima();
    const alvoX = pg.x, alvoY = pg.y - 110;
    for (const it of st.p1.items) {
      if (!it.taken) {
        const p = G.itemPos(it, now);
        const entra = clamp((now - it.born) / 600, 0, 1);
        const esc = (st.p1.onlyBad ? 1.25 : 1) * (0.6 + 0.4 * entra);
        const hover = !cut && perto(ponteiro.x, ponteiro.y, p.x, p.y, 70) ? 1.1 : 1;
        A.item(c, it.kind, p.x, p.y, p.r, esc * hover, t + it.s * 10, 1);
      } else {
        const k = now - it.takenAt;
        if (it.fate === 'guima') {
          const u = clamp(k / 520, 0, 1), e = u * u * (3 - 2 * u);
          const x = lerp(it.tx, alvoX, e), y = lerp(it.ty, alvoY, e) - Math.sin(e * Math.PI) * 120;
          if (u < 1) A.item(c, it.kind, x, y, e * 4, 1 - e * 0.7, t, 1 - e);
        } else if (it.fate === 'poof') {
          const u = clamp(k / 300, 0, 1);
          if (u < 1) { c.globalAlpha = 1 - u; A.item(c, it.kind, it.tx, it.ty, 0, 1 + u * 0.5, t, 0); c.globalAlpha = 1; }
        } else if (it.fate === 'lento') {
          const u = clamp(k / 1400, 0, 1), e = u * u;
          const x = lerp(it.tx, alvoX, e), y = lerp(it.ty, alvoY + 30, e);
          A.item(c, it.kind, x, y, 0, 1.3 - e * 0.5, t, 0);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  //  LUZES
  // ------------------------------------------------------------------
  function luzes(st, R, now, t, stage, lampI, cut, ce) {
    const V = { escuro: 0, luzes: [], corEscuro: '8,6,22' };
    const janI = 1 - (R.curtain.L + R.curtain.R) / 2;
    const monI = R.monitor !== 'off' ? 0.7 : 0;
    const fairy = R.fairy === 'on' ? 1 : R.fairy === 'flicker' ? 0.5 : 0;
    const pontos = [];
    if (stage === 'p1' || stage === 'lobby') { V.escuro = 0; return V; }
    if (stage === 'p2') V.escuro = 0.74;
    if (stage === 'p3') V.escuro = R.ceil ? 0.3 : 0.84;
    if (stage === 'p4') V.escuro = 0.93;
    if (lampI > 0) V.luzes.push({ x: 1346, y: 540, r: stage === 'p2' ? 620 : 700, i: 0.95 * lampI, cor: '255,190,120' });
    if (monI > 0) V.luzes.push({ x: 350, y: 520, r: 460, i: 0.75 * monI, cor: '140,170,255' });
    const lua = stage === 'p2' ? 0.6 : stage === 'p3' ? 0.75 : 0.35;
    V.luzes.push({ x: 305, y: 270, r: 470, i: lua * Math.max(janI, stage === 'p4' ? 0.35 : 0), cor: stage === 'p2' ? '210,150,200' : '160,180,255' });
    if (fairy) for (let i = 0; i < 5; i++) V.luzes.push({ x: 200 + i * 380, y: 70, r: 190, i: 0.35 * fairy * (sustoAtivo('luzPisca') >= 0 ? Math.random() : 1), cor: '255,200,170' });
    if (stage === 'p2' || stage === 'p3') V.luzes.push({ x: 985, y: 480, r: 440, i: stage === 'p2' ? 0.4 : 0.3 });
    if (stage === 'p4') {
      const hp = posCabecaCama();
      V.luzes.push({ x: hp.x, y: hp.y, r: 260, i: 0.5 + (st.g.eyes ? 0.1 : 0) });
      if (cut && cut.n === 'transforma') V.luzes.push({ x: hp.x, y: hp.y, r: 520, i: clamp((ce - 1500) / 3000, 0, 0.75), cor: '255,120,120' });
      if (cut && cut.n === 'acordou') V.luzes.push({ x: hp.x, y: hp.y, r: 420, i: 0.6, cor: '255,80,80' });
    }
    // cursores como lanterninhas no escuro
    if (V.escuro > 0.6) {
      if (ponteiro.dentro) V.luzes.push({ x: ponteiro.x, y: ponteiro.y, r: stage === 'p4' ? 200 : 240, i: stage === 'p4' ? 0.62 : 0.55 });
      for (const pid in cursores) {
        const cc = cursores[pid];
        if (performance.now() - cc.visto < 4000) V.luzes.push({ x: cc.x, y: cc.y, r: stage === 'p4' ? 190 : 220, i: 0.5, cor: '120,220,255' });
      }
    }
    // piscar da escuridão na fase 4 com tensão
    if (stage === 'p4' && Math.random() < 0.01) V.escuro = 0.99;
    return V;
  }

  // ------------------------------------------------------------------
  //  PARTÍCULAS / NÚMEROS / FALA / ANÉIS / CURSORES
  // ------------------------------------------------------------------
  function desenharParticulas(c) {
    const pt = performance.now();
    for (let i = par.length - 1; i >= 0; i--) {
      const p = par[i];
      const k = (pt - p.t) / 1000;
      if (k > p.vida) { par.splice(i, 1); continue; }
      const u = k / p.vida;
      const x = p.x + p.vx * k, y = p.y + p.vy * k + (p.tipo === 'coracao' ? 60 * k * k : 0);
      c.save(); c.globalAlpha = 1 - u;
      if (p.tipo === 'coracao') A.coracao(c, x, y, 12 * p.s * (1 + u * 0.3), '#ff6f9a');
      else if (p.tipo === 'brilho') { const r = 11 * p.s * (1 - u * 0.5); c.fillStyle = '#fff6c8'; c.translate(x, y); c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0); c.quadraticCurveTo(0, 0, 0, r); c.quadraticCurveTo(0, 0, -r, 0); c.quadraticCurveTo(0, 0, 0, -r); c.fill(); }
      else if (p.tipo === 'fumaca' || p.tipo === 'fumacaEscura') {
        c.fillStyle = p.tipo === 'fumaca' ? 'rgba(60,40,50,0.5)' : 'rgba(0,0,0,0.75)';
        c.beginPath(); c.arc(x, y, 14 * p.s * (1 + u * 2), 0, 7); c.fill();
      } else if (p.tipo === 'pedaco') {
        c.translate(x, y + 500 * k * k); c.rotate(k * 6 * p.s); c.fillStyle = '#060306';
        c.beginPath(); c.moveTo(-10 * p.s, -6); c.lineTo(8 * p.s, -9); c.lineTo(12 * p.s, 5); c.lineTo(-4, 10 * p.s); c.fill();
      } else if (p.tipo === 'z') { c.font = '900 34px "Baloo 2", Nunito'; c.fillStyle = 'rgba(200,210,255,0.8)'; c.fillText('z', x, y); }
      c.restore();
    }
  }
  function desenharNumeros(c) {
    const pt = performance.now();
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i], k = (pt - n.t) / 1000;
      if (k > 1.4) { nums.splice(i, 1); continue; }
      const esc = k < 0.15 ? 0.5 + k / 0.15 * 0.7 : 1.2 - Math.min(0.2, (k - 0.15));
      A.numero(c, n.x, n.y - k * 70, n.n, k > 1 ? 1 - (k - 1) / 0.4 : 1, esc);
    }
  }
  function desenharFala(c, st, now) {
    if (!fala) return;
    const k = performance.now() - fala.at;
    if (k > fala.dur + 400) { fala = null; return; }
    const a = k < 200 ? k / 200 : k > fala.dur ? 1 - (k - fala.dur) / 400 : 1;
    let x = 985, y = 250;
    if (st.stage === 'p3') { const pg = posGuima(); x = pg.x; y = pg.y - 420 * pg.esc; }
    if (st.stage === 'p4') { const hp = posCabecaCama(); x = hp.x; y = hp.y - 120; }
    const estranho = st.stage !== 'p1' && st.stage !== 'intro';
    A.balao(c, x + 150, y, fala.txt, a, estranho);
  }
  function desenharAneis(c) {
    const pt = performance.now();
    for (let i = aneis.length - 1; i >= 0; i--) {
      const a = aneis[i], k = (pt - a.t) / 500;
      if (k > 1) { aneis.splice(i, 1); continue; }
      c.save(); c.globalAlpha = (1 - k) * (a.outro ? 0.9 : 0.35);
      c.strokeStyle = a.outro ? '#7fe3ff' : '#fff'; c.lineWidth = a.outro ? 4 : 2;
      c.beginPath(); c.arc(a.x, a.y, 10 + k * 34, 0, 7); c.stroke(); c.restore();
    }
  }
  function desenharCursores(c, stage) {
    const pt = performance.now();
    for (const pid in cursores) {
      const cc = cursores[pid];
      const idade = pt - cc.visto;
      if (idade > 4000) continue;
      const a = idade > 3000 ? 1 - (idade - 3000) / 1000 : 1;
      c.save(); c.globalAlpha = a * 0.85;
      c.fillStyle = '#7fe3ff'; c.strokeStyle = '#0c3040'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(cc.x, cc.y); c.lineTo(cc.x + 4, cc.y + 22); c.lineTo(cc.x + 9, cc.y + 15); c.lineTo(cc.x + 18, cc.y + 17); c.closePath(); c.fill(); c.stroke();
      if (cc.n) { c.font = '800 15px Nunito, sans-serif'; c.fillStyle = 'rgba(127,227,255,0.9)'; c.fillText(cc.n, cc.x + 18, cc.y + 34); }
      c.restore();
    }
  }
  function desenharAreas(c) {
    c.save(); c.fillStyle = 'rgba(0,255,120,0.18)';
    for (let x = 0; x < 1920; x += 24) for (let y = 0; y < 1080; y += 24) { if (alvo(x, y)) c.fillRect(x, y, 22, 22); }
    c.restore();
  }

  // ------------------------------------------------------------------
  //  OVERLAYS: cartões, HUD, cenas pretas, textos
  // ------------------------------------------------------------------
  const CARTOES = {
    p1: ['ESTÁGIO 01', 'CUIDE DA GUIMA :)', 'clique nos presentes'],
    p2: ['ESTÁGIO 02', 'DEIXE O QUARTO CONFORTÁVEL', ''],
    p3: ['ESTÁGIO 03', 'AJUDE A GUIMA A DORMIR', ''],
    p4: ['ESTÁGIO 04', 'NÃO DEIXE A GUIMA ACORDAR', ''],
  };
  const ATRASO_CARTAO = { p1: 300, p2: 2600, p3: 2200, p4: 2400 };
  function overlays(c, st, now, t, stage, el, cut, ce) {
    const v = visivel();
    // HUD
    felicidadeVisivel += (st.happy - felicidadeVisivel) * (stage === 'p2' && el < 5000 ? 0.03 : 0.08);
    pulsoHud *= 0.9;
    const Vh = {
      felicidadeVisivel, pulsoHud, hudX: v.x, hudY: v.y,
      hudAlpha: esconderHud || stage === 'lobby' ? 0 : stage === 'p4' ? 0.55 : 0.95,
      barraGlitch: stage === 'p1' ? 0 : stage === 'p2' ? 0.08 : stage === 'p3' ? 0.25 : 0.5,
      corHud: stage === 'p1' ? '#ff7aa2' : stage === 'p2' ? '#d0708e' : stage === 'p3' ? '#9c6a86' : '#7a2c3c',
    };
    if (!cut || cut.n !== 'transforma') { A.barra(c, Vh); if (CARTOES[stage]) A.objetivo(c, CARTOES[stage][1], v, Vh); }
    if (horaAviso && stage === 'p4') {
      const k = (performance.now() - horaAviso.t) / 1000;
      if (k < 4) {
        c.save(); c.globalAlpha = k < 0.5 ? k * 2 : k > 3 ? 4 - k : 1;
        c.textAlign = 'center'; c.font = '800 20px Nunito, sans-serif'; c.fillStyle = 'rgba(160,190,255,0.8)';
        c.fillText(horaAviso.h >= 4 ? 'são quatro da manhã.' : 'aguenta mais um pouco...', 960, v.y + 130);
        c.font = '900 64px "Baloo 2", Nunito, sans-serif'; c.fillStyle = 'rgba(200,215,255,0.9)';
        c.fillText('0' + horaAviso.h + ':00', 960 + (Math.random() < 0.05 ? rnd(-6, 6) : 0), v.y + 100);
        c.restore();
      }
    }

    // cartão do estágio
    const cd = CARTOES[stage];
    if (cd && !cut) {
      const k = el - ATRASO_CARTAO[stage];
      const a = k < 0 ? 0 : k < 700 ? k / 700 : k < 3600 ? 1 : 1 - (k - 3600) / 900;
      A.cartao(c, cd[0], cd[1], clamp(a, 0, 1), cd[2]);
    }
    // fade do preto no começo de cada estágio
    const fadeIn = { p2: 2600, p3: 2200, p4: 3000 }[stage];
    if (fadeIn && el < fadeIn && !cut) { c.fillStyle = `rgba(0,0,0,${clamp(1 - el / fadeIn, 0, 1)})`; c.fillRect(0, 0, 1920, 1080); }
    // desenho dos papéis
    const kd = performance.now() - desenhoAt;
    if (kd < 4200) A.desenhoPapeis(c, kd < 400 ? kd / 400 : kd > 3600 ? 1 - (kd - 3600) / 600 : 1, t);

    // ---------- cenas ----------
    if (cut) {
      if (cut.n === 'quebra') {
        if (ce > 1500) {
          c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
          const txt = 'VOCÊ DEU ' + (G.NOME_ITEM[cut.item] || 'ISSO') + ' PARA A GUIMA.';
          const n = Math.floor(clamp((ce - 2600) / 60, 0, txt.length));
          c.font = '800 40px Nunito, sans-serif'; c.fillStyle = '#e9e3e6'; c.textAlign = 'center';
          c.fillText(txt.slice(0, n), 960 + (Math.random() < 0.03 ? rnd(-6, 6) : 0), 550);
          c.textAlign = 'left';
          if (ce > 6300) { c.fillStyle = `rgba(0,0,0,${clamp((ce - 6300) / 800, 0, 1)})`; c.fillRect(0, 0, 1920, 1080); }
        } else {
          // tudo congela; a Guima olha pro item
          c.fillStyle = `rgba(0,0,0,${ce / 1500 * 0.35})`; c.fillRect(0, 0, 1920, 1080);
        }
      } else if (cut.n === 'espelho') {
        const e = ce;
        if (e < 1100) {
          const u = clamp(e / 900, 0, 1), ee = u * u * u;
          c.fillStyle = `rgba(0,0,0,${0.5 * u})`; c.fillRect(0, 0, 1920, 1080);
          const x = lerp(E.x + E.w / 2, 960, ee), y = lerp(E.y + 214, 520, ee);
          A.rostoGrande(c, x + rnd(-8, 8) * u, y + rnd(-8, 8) * u, lerp(0.42, 3.6, ee), {
            t, distorce: 0.65 + u * 0.35, olhosPretos: 1, inclina: 6 + Math.sin(t * 30) * 6 * u, sy: 1.3,
            filtro: `grayscale(0.6) contrast(${1.3 + u}) brightness(${1 + u * 0.3})`,
          });
          fx.glitch = Math.max(fx.glitch, 0.4 + u * 0.8); fx.shake = Math.max(fx.shake, u);
          if (e > 850) { fx.flash = 1; fx.flashC = [1, 0.1, 0.15]; }
        } else {
          c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
          if (e < 2600) {
            for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; c.fillRect(0, Math.random() * 1080, 1920, Math.random() * 6); }
            fx.glitch = Math.max(fx.glitch, 0.6);
          }
        }
      } else if (cut.n === 'boaNoite') {
        const a = clamp(ce / 1200, 0, 1);
        c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(0, 0, 1920, 1080);
        if (ce > 1400) {
          const b = clamp((ce - 1400) / 800, 0, 1) * clamp((5000 - ce) / 600, 0, 1);
          c.save(); c.globalAlpha = b; c.textAlign = 'center';
          c.font = '900 64px "Baloo 2", Nunito'; c.fillStyle = '#f1e6ee';
          c.fillText('BOA NOITE, GUIMA :)', 960, 560); c.restore();
        }
      } else if (cut.n === 'acordou') {
        if (ce > 2400) {
          c.fillStyle = 'rgba(0,0,0,0.85)'; c.fillRect(0, 0, 1920, 1080);
          for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`; c.fillRect(0, (i * 97 + t * 900) % 1080, 1920, 3 + Math.random() * 10); }
          c.save(); c.font = '900 50px Nunito'; c.fillStyle = '#fff'; c.textAlign = 'center';
          c.fillText('◀◀  ELA ACORDOU', 960, 540); c.restore();
          fx.invert = ce < 2600 ? 1 : 0;
        } else if (ce > 900) {
          c.save(); c.font = '900 86px "Baloo 2"'; c.fillStyle = 'rgba(255,40,60,0.9)'; c.textAlign = 'center';
          c.fillText('ELA ACORDOU', 960 + rnd(-8, 8), 200 + rnd(-8, 8)); c.restore();
        }
      } else if (cut.n === 'transforma') {
        const e = ce;
        // a coisa pula na Guima
        if (e < 1300) {
          const u = clamp(e / 1100, 0, 1), hp = posCabecaCama();
          const x = lerp(LAY.coisaFinal.x, hp.x, u * u), y = lerp(LAY.coisaFinal.y, hp.y, u * u);
          c.save(); c.globalAlpha = 1 - u * 0.6;
          A.ameaca(c, 'final', { x, y }, 1, t, 9999, 0);
          c.strokeStyle = 'rgba(0,0,0,0.85)'; c.lineWidth = 6;
          for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + rnd(-80, 80), y + rnd(-80, 80), hp.x + rnd(-60, 60), hp.y + rnd(-60, 60)); c.stroke(); }
          c.restore();
          fx.glitch = Math.max(fx.glitch, 0.5 * u);
        }
        if (e > 10400 && e < 11700) {
          // JUMPSCARE
          c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
          const k = (e - 10400) / 1300;
          A.rostoGrande(c, 960 + rnd(-30, 30), 600 + rnd(-30, 30), 2.2 + k * 0.6 + rnd(0, 0.12), {
            t, distorce: 1, olhosPretos: 1, inclina: rnd(-12, 12), sy: 1.25 + rnd(0, 0.1),
            filtro: `contrast(1.9) brightness(${1.1 + rnd(0, 0.5)}) saturate(0.2)`,
          });
          fx.shake = 2.5; fx.glitch = 1; fx.chroma = 3;
          if (Math.random() < 0.25) { fx.flash = 0.8; fx.flashC = [1, 0, 0]; }
          if (Math.random() < 0.12) fx.invert = 1;
        } else if (e >= 11700) {
          c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
          fx.invert = 0;
        }
      }
    }
    // barra preta de "cinema" na fase final
    if (cut && cut.n === 'transforma' && ce > 4200 && ce < 10400) {
      const a = clamp((ce - 4200) / 1200, 0, 1) * 70;
      c.fillStyle = '#000'; c.fillRect(0, v.y, 1920, a); c.fillRect(0, v.y + v.h - a, 1920, a);
    }
  }

  // ------------------------------------------------------------------
  //  PÓS-EFEITOS (alvos por estágio + picos)
  // ------------------------------------------------------------------
  const pf = { grain: 0.03, vig: 0.4, chroma: 0.1, desat: 0, bright: 0, contrast: 1, tint: [1, 1, 1], tintA: 0, wave: 0, barrel: 0.05, scan: 0, zoom: 1, zx: 0.5, zy: 0.5 };
  function alvoFX(stage, st, now) {
    const cut = st.cut, ce = cut ? now - cut.at : 0;
    let a;
    if (stage === 'lobby') a = { grain: 0.04, vig: 0.8, chroma: 0.2, desat: 0.1, bright: -0.12, contrast: 1, tint: [1.05, 0.95, 1], tintA: 0.3, wave: 0, barrel: 0.06, scan: 0 };
    else if (stage === 'p1') a = { grain: 0.035, vig: 0.42, chroma: 0.15, desat: 0, bright: 0.01, contrast: 1.04, tint: [1.06, 0.97, 0.92], tintA: 0.25, wave: 0, barrel: 0.05, scan: 0 };
    else if (stage === 'p2') a = { grain: 0.06, vig: 0.75, chroma: 0.45, desat: 0.12, bright: -0.01, contrast: 1.06, tint: [1, 0.9, 1.05], tintA: 0.3, wave: st.room.mirror.ready ? 0.12 : 0.03, barrel: 0.08, scan: 0.05 };
    else if (stage === 'p3') a = { grain: 0.08, vig: 0.9, chroma: 0.6, desat: 0.3, bright: -0.02, contrast: 1.08, tint: [0.86, 0.9, 1.1], tintA: 0.35, wave: 0.08, barrel: 0.1, scan: 0.1 };
    else if (stage === 'p4') {
      const ten = tensao(st, now);
      a = { grain: 0.11 + ten * 0.05, vig: 0.95, chroma: 0.8 + ten * 1.2, desat: 0.45, bright: -0.01, contrast: 1.12, tint: [1.05, 0.82, 0.86], tintA: 0.3 + ten * 0.2, wave: 0.12 + ten * 0.5, barrel: 0.12, scan: 0.15 };
    } else a = { grain: 0.1, vig: 1, chroma: 0.4, desat: 0.5, bright: 0, contrast: 1.1, tint: [1, 1, 1], tintA: 0, wave: 0, barrel: 0.1, scan: 0.2 };
    let zoom = 1, zx = 0.5, zy = 0.5;
    if (cut && cut.n === 'quebra' && ce < 1500) { zoom = 1 + (ce / 1500) * 0.12; zx = LAY.guima.x / 1920; zy = 1 - 470 / 1080; }
    if (cut && cut.n === 'transforma' && ce < 10400) {
      const hp = posCabecaCama();
      const z1 = clamp((ce - 4200) / 2000, 0, 1), z2 = clamp((ce - 6200) / 4200, 0, 1);
      zoom = 1 + z1 * 0.9 + z2 * 0.5; zx = hp.x / 1920; zy = 1 - hp.y / 1080;
      a.wave = 0.3 * z1; a.desat = 0.6;
    }
    if (st.stage === 'p1' && cut) a.desat = clamp(ce / 1500, 0, 1) * 0.6;
    if (cut && cut.n === 'transforma' && ce >= 10400) a.snap = 1;
    if (cut && cut.n === 'espelho') a.snap = 1;
    a.zoom = zoom; a.zx = zx; a.zy = zy;
    return a;
  }
  function tensao(st, now) {
    if (st.stage !== 'p4') return 0;
    const w = (st.g.wake || 0) / 100, n = (st.p4.threats || []).length / 5;
    return clamp(w * 0.7 + n * 0.4, 0, 1);
  }
  function fxFinal(stage, st, now) {
    const a = alvoFX(stage, st, now);
    for (const k of ['grain', 'vig', 'chroma', 'desat', 'bright', 'contrast', 'tintA', 'wave', 'barrel', 'scan', 'zoom', 'zx', 'zy']) pf[k] += (a[k] - pf[k]) * 0.05;
    if ((a.zoom === 1 && Math.abs(pf.zoom - 1) < 0.002) || a.snap) { pf.zoom = a.zoom; pf.zx = a.zx; pf.zy = a.zy; }
    for (let i = 0; i < 3; i++) pf.tint[i] += (a.tint[i] - pf.tint[i]) * 0.05;
    Som.tensao = tensao(st, now);
    const sh = fx.shake;
    const p = {
      t: tLocal, grain: pf.grain, vig: pf.vig, chroma: pf.chroma + fx.chroma, wave: pf.wave, glitch: Math.min(1.2, fx.glitch),
      desat: pf.desat, bright: pf.bright, contrast: pf.contrast, invert: fx.invert, scan: pf.scan, barrel: pf.barrel,
      tint: pf.tint, tintA: pf.tintA, flashC: fx.flashC, flashA: fx.flash,
      sx: sh ? (Math.random() - 0.5) * 0.012 * sh : 0, sy: sh ? (Math.random() - 0.5) * 0.012 * sh : 0,
      zoom: pf.zoom, zx: pf.zx, zy: pf.zy,
    };
    fx.glitch *= 0.9; fx.shake *= 0.88; fx.flash *= 0.85; fx.chroma *= 0.9;
    if (fx.glitch < 0.01) fx.glitch = 0; if (fx.shake < 0.01) fx.shake = 0; if (fx.flash < 0.01) fx.flash = 0;
    if (!(st.cut && (st.cut.n === 'transforma' || st.cut.n === 'acordou'))) fx.invert = 0;
    const _t0 = performance.now();
    G.tempos = G.tempos || { fx: 0, cena: 0, n: 0 }; G.tempos.cena += _t0 - (G._t0 || _t0); G.tempos.n++;
    if (usaFX) {
      G.FX.desenhar(cena, p);
      const dtfx = performance.now() - _t0;
      G.tempos.fx += dtfx;
      if (fxMedidas < 120) { fxMedidas++; fxTempo += dtfx; if (fxMedidas === 120 && fxTempo / 120 > 40 && !fxForcado) { console.warn('Efeitos desligados (PC lento).'); modoSimples(); } }
    }
    else {
      const W = tela.width, H = tela.height, esc = Math.max(W / 1920, H / 1080);
      ctxSimples.setTransform(1, 0, 0, 1, 0, 0);
      ctxSimples.fillStyle = '#000'; ctxSimples.fillRect(0, 0, W, H);
      // zoom/pan de câmera também no modo simples
      const z = pf.zoom || 1, pan = clamp((z - 1) * 1.6, 0, 1);
      const sw = 1920 / z, sh = 1080 / z;
      const cx = clamp(lerp(960, pf.zx * 1920, pan), sw / 2, 1920 - sw / 2), cy = clamp(lerp(540, (1 - pf.zy) * 1080, pan), sh / 2, 1080 - sh / 2);
      const sx = sh ? (Math.random() - 0.5) * 20 * fx.shake : 0;
      ctxSimples.drawImage(cena, cx - sw / 2 + sx, cy - sh / 2, sw, sh, (W - 1920 * esc) / 2, (H - 1080 * esc) / 2, 1920 * esc, 1080 * esc);
    }
  }

  // ------------------------------------------------------------------
  //  MÚSICA POR ESTÁGIO
  // ------------------------------------------------------------------
  function musicaDesejada(st, now) {
    if (!st || st.stage === 'lobby') return null;
    const cut = st.cut, el = now - st.at;
    if (st.stage === 'intro' || st.stage === 'p1') return cut ? null : 'musica1';
    if (st.stage === 'p2') return cut ? null : el > 2000 ? 'musica2' : null;
    if (st.stage === 'p3') return cut ? null : 'ambiente3';
    if (st.stage === 'p4') return cut || st.p4.final ? null : 'ambiente4';
    if (st.stage === 'fim') return el > 3000 ? 'musica2' : null;
    return null;
  }

  // sussurros e rangidos aleatórios na fase 4
  let proxAmbiente = 0;
  function sonsAleatorios(st, now) {
    if (!st || st.stage !== 'p4' || st.cut || st.p4.final) return;
    const pt = performance.now();
    if (pt < proxAmbiente) return;
    proxAmbiente = pt + rnd(4000, 9000) * (1 - tensao(st, now) * 0.5);
    Som.tocar(pick(['rangido', 'sussurro', 'passos', 'respiro']), { x: rnd(0, 1920), vol: 0.5 });
  }

  // =================================================================
  //  LAÇO PRINCIPAL
  // =================================================================
  function laco() {
    requestAnimationFrame(laco);
    if (S && ehHost) { L.tick(S, Date.now()); publicar(false); }
    if (S) {
      processarEventos();
      atualizarChat();
      sonsAleatorios(S, agora());
      Som.musica(musicaDesejada(S, agora()));
      Som.chefe = S.stage === 'p4' && !S.cut && S.p4.threats.some((x) => x.k === 'chefe');
      if (!partidaVisivel && S.stage) iniciouPartida();
      $('status').textContent = `${S.stage}${S.cut ? ' / cena: ' + S.cut.n : ''} · felicidade ${Math.round(S.happy)} · ${ehHost ? 'anfitrião' : 'convidado'} · sala ${Rede.code}`;
      $('denovo').hidden = !(S.stage === 'fim' && ehHost && agora() - S.at > 5000);
      enviarCursor();
    }
    G._t0 = performance.now();
    try { desenhar(); } catch (e) { console.error(e); }
  }

  // o anfitrião continua rodando a lógica mesmo se a aba ficar em segundo plano
  setInterval(() => { if (S && ehHost) { L.tick(S, Date.now()); publicar(false); } }, 100);

  // carrega fontes e o rosto antes de começar
  A.carregarGuima(() => {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(laco));
  });
  // se o anfitrião entrar numa sala já começada (Firebase), o jogo segue
  G.depurar = () => ({ S, ehHost, sala });
})();
