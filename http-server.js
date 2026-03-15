// http-server.js
const http = require('http');
const net  = require('net');
const dns  = require('dns');

const PORT      = process.env.PORT || 10000;
const GAME_PORT = 8080;
const OWN_HOST  = 'slit-y6jm.onrender.com';

function encodeServerList(ip, port) {
  const parts = ip.split('.').map(Number);
  const bytes = [...parts, (port >> 8) & 0xFF, port & 0xFF];
  let result = 'a';
  for (const b of bytes) {
    result += String.fromCharCode(((b >> 4) & 0xF) + 97);
    result += String.fromCharCode(( b       & 0xF) + 97);
  }
  return result;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/server') {
    dns.lookup(OWN_HOST, (err, ip) => {
      if (err) {
        console.error('DNS error:', err);
        res.writeHead(500);
        res.end('DNS error');
        return;
      }
      console.log('Server list requested -> IP:', ip);
      const encoded = encodeServerList(ip, 443);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(encoded);
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Slither server running');
  }
});

server.on('upgrade', (req, clientSocket, head) => {
  const gameSocket = net.createConnection(GAME_PORT, '127.0.0.1', () => {
    let headers = '';
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headers += req.rawHeaders[i] + ': ' + req.rawHeaders[i + 1] + '\r\n';
    }
    gameSocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n`
    );
    if (head && head.length > 0) gameSocket.write(head);
    clientSocket.pipe(gameSocket);
    gameSocket.pipe(clientSocket);
  });

  gameSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => gameSocket.destroy());
});

server.listen(PORT, () => {
  console.log('HTTP proxy rodando na porta ' + PORT);
});
