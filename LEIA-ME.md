# Cuide da Guima :)

Jogo de terror para dois jogadores. Tudo acontece no quarto da Guima, ninguém tem vez: os dois clicam ao mesmo tempo.

## Como abrir

- **Testar rápido:** dê dois cliques no `index.html`. Use **"jogar sozinho (teste)"** ou abra uma segunda aba do mesmo navegador para ser o 2º jogador (modo local).
- **Com servidor no PC:** rode `iniciar-windows.bat` (precisa do Node.js). Abre em `http://localhost:8080`. Nesse modo os sons em arquivo funcionam.
- **Pela internet (os dois em casas diferentes):** configure o Firebase (abaixo) e suba a pasta no GitHub Pages.

## Firebase (multiplayer online)

1. No console do Firebase, crie um projeto com **Realtime Database** e ative **Authentication → Anônimo**.
2. Em Authentication → Settings → Domínios autorizados, adicione `problemsite.github.io`.
3. Em Realtime Database → Regras, cole o conteúdo de `regras-firebase.json`.
4. Cole a configuração do app em `js/config.js`, no bloco `firebase`.

Sem Firebase configurado, o jogo funciona no modo local (duas abas do mesmo navegador).

## As fases

1. **Cuide da Guima** — presentes flutuam rápido pela tela (mais itens quando são dois jogadores). Clique nos bons: a felicidade sobe de pouquinho em pouquinho. Desde o começo aparecem algumas coisas ruins (faca, tesoura, caco de vidro, maçã podre…). Em 100% ela fica "feliz demais" — é o aviso — e logo depois só vêm coisas ruins. Alguém vai ter que escolher uma.
2. **Deixe o quarto confortável** — nada de botões. Tem que descobrir o que fazer: arrastar o pano do espelho, girar o quadro até ficar reto, levar roupas pro cesto, livros pra mesa, travesseiro pra cama, empurrar a gaveta, achar o plugue solto do abajur, catar os papéis rasgados. Conforme o quarto melhora, o reflexo no espelho piora. No fim, tem que **esfregar** o espelho embaçado.
3. **Ajude a Guima a dormir** — arrastar as duas cortinas, **segurar** o botão do PC, apagar o interruptor perto da porta, puxar a cordinha do abajur, puxar o cobertor, afofar o travesseiro (3 cliques) e levar a Guima até a cama arrastando. Sustos aleatórios o tempo todo.
4. **Não deixe a Guima acordar** — escuro total, o mouse vira uma lanterna. O relógio do computador desligado vai de 00:30 até 04:00. Clique na Guima quando os olhos abrirem e nas coisas que aparecem — fica cada vez mais difícil (em dupla tudo pede mais cliques). Três vezes aparece o **inimigo difícil**, se arrastando até a cama: precisa de muitos cliques dos dois. Se ela acordar de vez, a fita "rebobina" e a vigília recomeça. Às 4h aparece uma última coisa perto da cama…

Se os jogadores empacarem, a própria Guima dá dicas falando.

## Teclas

- **F2** — painel de gravação: pular fases, forçar eventos (faca, espelho, jumpscare…), mudar a felicidade, esconder a barra, mostrar as áreas clicáveis. Os dois jogadores podem usar.
- **M** — liga/desliga o som.

## Ajustes

Tudo em `js/config.js`: tempo de cada fase, quanto a felicidade sobe, quantos itens aparecem, duração da vigília, se a falha reinicia a fase 4, volume e **troca de sons por arquivos** (ver `sons/LEIA-ME.txt`).

## Rostos

Ficam em `assets/rostos/` (sorrindo, séria, triste/desgostosa, triste/assustada, muito assustada, dormindo). Para trocar um, substitua o arquivo mantendo o nome e rode `node ferramentas/embutir-rosto.js` (atualiza a cópia usada quando o jogo é aberto direto do arquivo). As posições de olhos, boca, pescoço e mechas de cada rosto ficam no começo de `js/arte-guima.js` (objeto `ROSTOS`).

## Desempenho

Os efeitos de imagem (grão, distorção, aberração de cor) usam a placa de vídeo. Se o PC for fraco, o jogo desliga os efeitos sozinho. Para forçar o modo simples, abra com `?semfx` no fim do endereço.
