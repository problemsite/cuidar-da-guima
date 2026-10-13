# Cuide da Guima :)

Jogo de terror para dois jogadores. Tudo acontece no quarto da Guima, ninguém tem vez: os dois clicam ao mesmo tempo.

## Como abrir

- **Testar rápido:** dê dois cliques no `index.html`. Use **"jogar sozinho (teste)"** ou abra uma segunda aba do mesmo navegador para ser o 2º jogador (modo local).
- **Com servidor no PC:** rode `iniciar-windows.bat` (precisa do Node.js). Abre em `http://localhost:8080`. Nesse modo os sons em arquivo funcionam.
- **Pela internet (os dois em casas diferentes):** suba a pasta no GitHub Pages e libere o jogo pela Central (abaixo).

## Trava e Firebase único

- O jogo usa a **trava do site principal** (`/trava.js`) e o **Firebase único `jogos-github`**, como os outros sites. Não tem mais Firebase próprio nem regras para colar.
- As salas ficam em `sites/cuidar-da-guima/salas`.
- **Liberar/bloquear o jogo e a senha dos jogadores:** pela Central, como nos outros sites. Bloqueado, ninguém de fora abre nem consegue gravar nada.
- **Primeira vez:** abra o jogo uma vez no navegador da equipe e clique em **criar sala**. Isso avisa a Central de que os jogadores podem gravar na pasta `salas`.
- No navegador da equipe dá para testar com duas abas: cada aba vira um jogador diferente.
- Aberto do PC (duplo clique no `index.html` ou `iniciar-windows.bat`) não tem trava: roda no modo local.

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
