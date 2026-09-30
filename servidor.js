// Servidor simples para rodar o jogo no seu PC (sem instalar nada além do Node.js).
// Uso:  node servidor.js   → abre em http://localhost:8080
const http = require('http');
const fs = require('fs');
const path = require('path');
const porta = Number(process.env.PORT) || 8080;
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json' };
http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const arq = path.join(__dirname, path.normalize(url).replace(/^(\.\.[\/\\])+/, ''));
  if (!arq.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (err, dados) => {
    if (err) { res.writeHead(404); return res.end('não encontrado'); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(arq).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(dados);
  });
}).listen(porta, () => console.log(`Cuide da Guima rodando em http://localhost:${porta}  (Ctrl+C para parar)`));
