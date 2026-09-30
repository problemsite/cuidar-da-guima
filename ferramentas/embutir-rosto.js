// Gera js/guima-embutida.js a partir das imagens em assets/rostos/
// (usado quando o jogo é aberto direto do arquivo, sem servidor)
// Uso (na pasta do jogo):  node ferramentas/embutir-rosto.js
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const pasta = path.join(raiz, 'assets', 'rostos');
const tipos = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const mapa = {};
for (const f of fs.readdirSync(pasta)) {
  const ext = path.extname(f).toLowerCase();
  if (!tipos[ext]) continue;
  mapa[f] = 'data:' + tipos[ext] + ';base64,' + fs.readFileSync(path.join(pasta, f)).toString('base64');
}
const js = '// Cópia embutida dos rostos (usada quando o jogo é aberto direto do arquivo).\n' +
  '// Se trocar alguma imagem em assets/rostos, rode:  node ferramentas/embutir-rosto.js\n' +
  'window.GUIMA_ROSTOS = ' + JSON.stringify(mapa) + ';\n';
fs.writeFileSync(path.join(raiz, 'js', 'guima-embutida.js'), js);
console.log('Pronto! ' + Object.keys(mapa).length + ' rostos embutidos.');
