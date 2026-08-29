const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { request } = require('node:http');
const root = __dirname;
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const upstream = request({ hostname:'localhost', port:3000, path:req.url.slice(4), method:req.method, headers:req.headers }, upstreamRes => { res.writeHead(upstreamRes.statusCode, upstreamRes.headers); upstreamRes.pipe(res); });
    req.pipe(upstream); upstream.on('error', () => { res.writeHead(502, {'Content-Type':'application/json'}); res.end(JSON.stringify({message:'API não está disponível em http://localhost:3000.'})); }); return;
  }
  const file = req.url === '/' ? '/index.html' : req.url.split('?')[0]; const target = path.resolve(root, `.${file}`);
  if (!target.startsWith(root) || !fs.existsSync(target)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type':mime[path.extname(target)] || 'application/octet-stream'}); fs.createReadStream(target).pipe(res);
});

const initialPort = Number(process.env.PORT || 5173);
let port = initialPort;

server.on('error', (error) => {
  if (error.code !== 'EADDRINUSE' || port >= initialPort + 10) {
    throw error;
  }

  port += 1;
  server.listen(port);
});

server.on('listening', () => console.log(`RadarPassagens Web: http://localhost:${port}`));
server.listen(port);
