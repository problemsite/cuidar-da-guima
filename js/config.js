// =====================================================================
//  CUIDE DA GUIMA :)  —  CONFIGURAÇÃO
//  Tudo que dá pra ajustar sem mexer no resto do código está aqui.
// =====================================================================
window.CONFIG = {

  // ---------------------------------------------------------------
  //  FIREBASE (multiplayer pela internet)
  //  Cole aqui a configuração do seu projeto (Realtime Database + Auth anônima).
  //  Se ficar vazio, o jogo roda no MODO LOCAL: duas abas do mesmo navegador
  //  conversam entre si (ótimo para testar), ou "Jogar sozinho".
  // ---------------------------------------------------------------
  firebase: {
    apiKey: "AIzaSyC4V_QuMp-CXtDkmt6S8k9al3ir74JF6uU",
    authDomain: "cuidar-da-guima.firebaseapp.com",
    // endereço padrão do Realtime Database. Se ao criar o banco você escolheu outra região,
    // copie o endereço que aparece no topo da aba "Dados" do Realtime Database e cole aqui.
    databaseURL: "https://cuidar-da-guima-default-rtdb.firebaseio.com",
    projectId: "cuidar-da-guima",
    storageBucket: "cuidar-da-guima.firebasestorage.app",
    messagingSenderId: "70112944015",
    appId: "1:70112944015:web:990e9816e42e9bbca875fa"
  },

  // Pede tela cheia quando o jogador clica em PRONTO / COMEÇAR.
  telaCheia: true,

  // Volume geral (0 a 1). Tecla M liga/desliga o som durante o jogo.
  volumeGeral: 0.9,

  // ---------------------------------------------------------------
  //  RITMO DAS FASES  (tempos em milissegundos)
  // ---------------------------------------------------------------
  fase1: {
    felicidadeInicial: 14,
    ganhoMin: 1,            // quanto cada item bom sobe (sorteado entre min e max)
    ganhoMax: 2,
    perdaItemRuim: 7,       // clicar num item ruim antes do final
    intervaloItens: [1200, 2100],
    ritmoDupla: 0.65,       // com 2 jogadores, os itens vêm mais rápido (multiplica o intervalo)
    maxItensNaTela: 6,      // jogando sozinho
    maxItensDupla: 10,      // jogando em dupla
    duracaoItem: [6500, 9500],    // quanto tempo um item leva atravessando a tela (menor = mais rápido)
    // proporção de itens ruins conforme a felicidade sobe (sempre aparece algum desde o começo)
    ruins: [ [0, 0.14], [40, 0.2], [60, 0.27], [80, 0.35], [92, 0.42] ],
    duracaoEuforia: 14000,  // ao chegar em 100%: "feliz demais" por esse tempo, depois só itens ruins
    ruinsNaEuforia: 0.7,
    decaiCada: 4500,        // sem ninguém clicar, a felicidade cai 1 ponto a cada X ms
  },

  // Dicas faladas pela Guima quando os jogadores ficam parados sem progresso (fases 2 e 3)
  dicas: { intervalo: 20000 },

  fase2: {
    tarefasParaEspelho: 7,  // de 8 tarefas, quantas precisam estar feitas para o espelho "chamar"
    esfregarNecessario: 5200, // "distância" total esfregando o espelho até a revelação
  },

  fase4: {
    duracao: 150000,        // tempo da vigília até a coisa aparecer perto da cama (relógio vai de 00:30 a 04:00)
    falhaReinicia: true,    // se a Guima acordar de vez, a vigília volta do começo
    ameacaIntervalo: [5500, 1100],   // intervalo entre sombras (começo -> fim)
    acordarIntervalo: [10000, 3600], // intervalo entre "abrir os olhos" (começo -> fim)
    // inimigo difícil: aparece 3 vezes (em que ponto da vigília), vida e tempo até chegar na cama
    chefeEm: [0.22, 0.5, 0.78],
    chefeVidaSolo: [25, 35, 45],
    chefeVidaDupla: [120, 170, 220],
    chefeDuracao: [32000, 29000, 26000],
  },

  // ---------------------------------------------------------------
  //  SONS
  //  Todos os sons são gerados pelo próprio jogo. Para trocar algum por um
  //  arquivo, coloque o arquivo na pasta /sons e escreva o nome aqui.
  //  Pode pôr vários arquivos: o jogo sorteia um e muda levemente o tom
  //  a cada vez (variacao = quanto o tom pode mudar, 0.05 = 5%).
  //  Obs.: arquivos só funcionam com o jogo hospedado (GitHub Pages ou
  //  iniciar-windows.bat), não abrindo o index.html direto.
  // ---------------------------------------------------------------
  sons: {
    // interface / fase 1
    item:        { arquivos: [], volume: 0.7, variacao: 0.10 },  // clicar num presente bom
    brilho:      { arquivos: [], volume: 0.5, variacao: 0.10 },  // felicidade subindo
    itemRuim:    { arquivos: [], volume: 0.8, variacao: 0.05 },  // clicar num item ruim
    risada:      { arquivos: [], volume: 0.6, variacao: 0.08 },  // Guima feliz
    quebra:      { arquivos: [], volume: 1.0, variacao: 0.00 },  // o momento da faca
    // fase 2
    pano:        { arquivos: [], volume: 0.7, variacao: 0.12 },
    soltar:      { arquivos: [], volume: 0.7, variacao: 0.15 },  // largar objeto
    papel:       { arquivos: [], volume: 0.6, variacao: 0.15 },
    quadro:      { arquivos: [], volume: 0.6, variacao: 0.10 },
    gaveta:      { arquivos: [], volume: 0.7, variacao: 0.10 },
    tomada:      { arquivos: [], volume: 0.7, variacao: 0.05 },
    esfregar:    { arquivos: [], volume: 0.5, variacao: 0.20 },
    revelacao:   { arquivos: [], volume: 1.0, variacao: 0.00 },  // susto do espelho
    // fase 3
    cortina:     { arquivos: [], volume: 0.6, variacao: 0.12 },
    interruptor: { arquivos: [], volume: 0.8, variacao: 0.08 },
    pcDesliga:   { arquivos: [], volume: 0.7, variacao: 0.05 },
    travesseiro: { arquivos: [], volume: 0.6, variacao: 0.15 },
    sussurro:    { arquivos: [], volume: 0.6, variacao: 0.15 },
    passos:      { arquivos: [], volume: 0.6, variacao: 0.10 },
    rangido:     { arquivos: [], volume: 0.7, variacao: 0.12 },
    susto:       { arquivos: [], volume: 0.8, variacao: 0.06 },  // sustinho curto
    // fase 4
    shh:         { arquivos: [], volume: 0.6, variacao: 0.10 },
    afastar:     { arquivos: [], volume: 0.6, variacao: 0.15 },
    coracao:     { arquivos: [], volume: 0.8, variacao: 0.03 },
    glitch:      { arquivos: [], volume: 0.7, variacao: 0.20 },
    grito:       { arquivos: [], volume: 1.0, variacao: 0.00 },  // JUMPSCARE
    zumbido:     { arquivos: [], volume: 0.5, variacao: 0.00 },
    chefeEntra:  { arquivos: [], volume: 1.0, variacao: 0.00 },  // entrada do inimigo difícil
    chefeAcerto: { arquivos: [], volume: 0.6, variacao: 0.20 },
    chefeMorre:  { arquivos: [], volume: 0.9, variacao: 0.05 },
    badalada:    { arquivos: [], volume: 0.7, variacao: 0.00 },  // relógio virando a hora (fase 4)
    euforia:     { arquivos: [], volume: 0.7, variacao: 0.05 },  // Guima chega em 100%
    // músicas / ambientes (em loop). Se colocar arquivo, ele substitui o gerado.
    musica1:     { arquivos: [], volume: 0.45 },  // fase 1 (caixinha de música)
    musica2:     { arquivos: [], volume: 0.40 },  // fase 2 (mesma música, errada)
    ambiente3:   { arquivos: [], volume: 0.50 },  // fase 3
    ambiente4:   { arquivos: [], volume: 0.6 },   // fase 4
    chefe:       { arquivos: [], volume: 0.6 },   // trilha de tensão enquanto o inimigo difícil está vivo
  },
};
