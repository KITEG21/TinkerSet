const http = require('http');
const port = process.argv[2] || 5173;
const host = process.argv[3] || '127.0.0.1';
const server = http.createServer((req, res) => res.end('ok'));
server.listen(port, host, () => console.log(`listening ${host}:${port}`));
server.on('error', (err) => { console.error('ERROR', err); process.exit(1); });
