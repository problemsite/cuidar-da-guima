// =====================================================================
//  REDE — Firebase (internet) ou modo local (duas abas do mesmo navegador)
// =====================================================================
(function () {
  const G = (window.G = window.G || {});
  const C = window.CONFIG;
  const temFirebase = !!(C.firebase && C.firebase.apiKey && C.firebase.databaseURL);

  const gerarCodigo = () => {
    const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 5; i++) c += s[Math.floor(Math.random() * s.length)];
    return c;
  };
  const meuId = (() => {
    let id = null;
    try { id = sessionStorage.getItem('guimaPid'); } catch (e) {}
    if (!id) { id = 'j' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('guimaPid', id); } catch (e) {} }
    return id;
  })();

  function carregarScript(src) {
    return new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }

  // callbacks comuns
  function base() {
    return {
      pid: meuId, code: null, host: false, sala: null,
      cbSala: [], cbEstado: [], cbAcao: [], cbCursor: [],
      onSala(f) { this.cbSala.push(f); }, onEstado(f) { this.cbEstado.push(f); },
      onAcao(f) { this.cbAcao.push(f); }, onCursores(f) { this.cbCursor.push(f); },
      _sala(s) { this.sala = s; this.cbSala.forEach((f) => f(s)); },
      _estado(s) { this.cbEstado.forEach((f) => f(s)); },
      _acao(pid, a) { this.cbAcao.forEach((f) => f(pid, a)); },
      _cursor(pid, c) { this.cbCursor.forEach((f) => f(pid, c)); },
    };
  }

  // -------------------------------------------------------------------
  //  MODO LOCAL (BroadcastChannel)
  // -------------------------------------------------------------------
  function redeLocal() {
    const R = base();
    R.modo = 'local';
    let canal = null;
    const conectar = (code) => {
      if (canal) canal.close();
      canal = new BroadcastChannel('guima-sala-' + code);
      canal.onmessage = (e) => receber(e.data);
    };
    const mandar = (m) => canal && canal.postMessage(m);
    function receber(m) {
      if (!m || !m.tipo) return;
      if (R.host) {
        const s = R.sala;
        if (m.tipo === 'ola') {
          if (!s.jogadores[m.pid] && Object.keys(s.jogadores).length >= 2) return mandar({ tipo: 'cheia', para: m.pid });
          if (!s.jogadores[m.pid] && s.comecou) return mandar({ tipo: 'cheia', para: m.pid, msg: 'A partida já começou.' });
          s.jogadores[m.pid] = Object.assign(s.jogadores[m.pid] || { pronto: false }, { nome: m.nome, on: true });
          publicarSala();
        } else if (m.tipo === 'pronto' && s.jogadores[m.pid]) { s.jogadores[m.pid].pronto = !!m.v; publicarSala(); }
        else if (m.tipo === 'tchau' && s.jogadores[m.pid]) { s.jogadores[m.pid].on = false; publicarSala(); }
        else if (m.tipo === 'acao') R._acao(m.pid, m.a);
        else if (m.tipo === 'cursor') R._cursor(m.pid, m.c);
      } else {
        if (m.tipo === 'sala') { R._sala(m.s); if (esperandoOla) { esperandoOla(); esperandoOla = null; } }
        else if (m.tipo === 'cheia' && m.para === meuId && falhaOla) { falhaOla(m.msg || 'A sala já tem dois jogadores.'); falhaOla = null; }
        else if (m.tipo === 'estado') R._estado(m.s);
        else if (m.tipo === 'cursor') R._cursor(m.pid, m.c);
      }
    }
    let esperandoOla = null, falhaOla = null;
    function publicarSala() { mandar({ tipo: 'sala', s: R.sala }); R._sala(R.sala); }

    R.criar = async (nome, solo) => {
      R.code = gerarCodigo(); R.host = true;
      conectar(R.code);
      R.sala = { host: meuId, comecou: false, solo: !!solo, jogadores: { [meuId]: { nome, pronto: false, on: true } } };
      publicarSala();
      window.addEventListener('beforeunload', () => mandar({ tipo: 'fechou' }));
      return { code: R.code };
    };
    R.entrar = (code, nome) => new Promise((ok, erro) => {
      R.code = code.toUpperCase(); R.host = false;
      conectar(R.code);
      esperandoOla = () => ok({ code: R.code });
      falhaOla = (msg) => erro(new Error(msg));
      mandar({ tipo: 'ola', pid: meuId, nome });
      setTimeout(() => { if (esperandoOla) { esperandoOla = null; erro(new Error('Sala não encontrada. (No modo local, a sala precisa estar aberta em outra aba deste navegador.)')); } }, 1800);
      window.addEventListener('beforeunload', () => mandar({ tipo: 'tchau', pid: meuId }));
    });
    R.pronto = (v) => {
      if (R.host) { R.sala.jogadores[meuId].pronto = !!v; publicarSala(); }
      else mandar({ tipo: 'pronto', pid: meuId, v });
    };
    R.comecar = () => { if (R.host) { R.sala.comecou = true; publicarSala(); } };
    R.voltarLobby = () => { if (R.host) { R.sala.comecou = false; Object.values(R.sala.jogadores).forEach((j) => (j.pronto = false)); publicarSala(); } };
    R.publicar = (S) => mandar({ tipo: 'estado', s: S });
    R.enviar = (a) => { if (R.host) R._acao(meuId, a); else mandar({ tipo: 'acao', pid: meuId, a }); };
    R.cursor = (c) => mandar({ tipo: 'cursor', pid: meuId, c });
    return R;
  }

  // -------------------------------------------------------------------
  //  FIREBASE (Realtime Database + Auth anônima)
  // -------------------------------------------------------------------
  function redeFirebase() {
    const R = base();
    R.modo = 'firebase';
    let db = null, salaRef = null;
    const V = '10.12.2';
    R.iniciar = async () => {
      await carregarScript(`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`);
      await carregarScript(`https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`);
      await carregarScript(`https://www.gstatic.com/firebasejs/${V}/firebase-database-compat.js`);
      firebase.initializeApp(C.firebase);
      const cred = await firebase.auth().signInAnonymously();
      R.pid = cred.user.uid;
      db = firebase.database();
    };
    function ouvir(code) {
      salaRef = db.ref('salas/' + code);
      const eu = salaRef.child('jogadores/' + R.pid);
      eu.child('on').onDisconnect().set(false);
      eu.child('on').set(true);
      let meta = {}, jog = {};
      const emitir = () => R._sala({ host: meta.host, comecou: !!meta.comecou, solo: !!meta.solo, jogadores: jog });
      salaRef.child('meta').on('value', (s) => { meta = s.val() || {}; R.host = meta.host === R.pid; emitir(); });
      salaRef.child('jogadores').on('value', (s) => { jog = s.val() || {}; emitir(); });
      salaRef.child('estado').on('value', (s) => { const v = s.val(); if (v && !R.host) R._estado(v); });
      salaRef.child('cursores').on('child_changed', (s) => { if (s.key !== R.pid) R._cursor(s.key, s.val()); });
      salaRef.child('cursores').on('child_added', (s) => { if (s.key !== R.pid) R._cursor(s.key, s.val()); });
      salaRef.child('acoes').on('child_added', (s) => {
        if (!R.host) return;
        const v = s.val();
        s.ref.remove();
        if (v) R._acao(v.pid, v.a);
      });
    }
    R.criar = async (nome, solo) => {
      let code;
      for (let i = 0; i < 6; i++) {
        code = gerarCodigo();
        const ex = await db.ref('salas/' + code + '/meta').get();
        if (!ex.exists()) break;
      }
      R.code = code; R.host = true;
      await db.ref('salas/' + code).set({
        meta: { host: R.pid, comecou: false, solo: !!solo, criada: firebase.database.ServerValue.TIMESTAMP },
        jogadores: { [R.pid]: { nome, pronto: false, on: true } },
      });
      ouvir(code);
      return { code };
    };
    R.entrar = async (code, nome) => {
      code = code.toUpperCase();
      const snap = await db.ref('salas/' + code).get();
      if (!snap.exists()) throw new Error('Sala não encontrada.');
      const v = snap.val();
      const jog = v.jogadores || {};
      if (!jog[R.pid] && Object.keys(jog).length >= 2) throw new Error('A sala já tem dois jogadores.');
      if (!jog[R.pid] && v.meta && v.meta.comecou) throw new Error('A partida já começou.');
      await db.ref(`salas/${code}/jogadores/${R.pid}`).update({ nome, on: true, pronto: jog[R.pid] ? !!jog[R.pid].pronto : false });
      R.code = code;
      R.host = v.meta && v.meta.host === R.pid;
      ouvir(code);
      return { code, estado: v.estado || null };
    };
    R.pronto = (val) => salaRef && salaRef.child('jogadores/' + R.pid + '/pronto').set(!!val);
    R.comecar = () => salaRef && salaRef.child('meta/comecou').set(true);
    R.voltarLobby = async () => {
      if (!salaRef) return;
      await salaRef.child('meta/comecou').set(false);
      const s = await salaRef.child('jogadores').get();
      const up = {};
      Object.keys(s.val() || {}).forEach((k) => (up[k + '/pronto'] = false));
      salaRef.child('jogadores').update(up);
    };
    R.publicar = (S) => salaRef && salaRef.child('estado').set(S);
    R.enviar = (a) => {
      if (R.host) R._acao(R.pid, a);
      else if (salaRef) salaRef.child('acoes').push({ pid: R.pid, a });
    };
    R.cursor = (c) => salaRef && salaRef.child('cursores/' + R.pid).set(c);
    return R;
  }

  G.Rede = temFirebase ? redeFirebase() : redeLocal();
  if (!G.Rede.iniciar) G.Rede.iniciar = async () => {};
})();
