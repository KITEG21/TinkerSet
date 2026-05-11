const http = require('http');

const ports = [3000, 4173, 4174, 4200, 5000, 5050, 8000, 8080, 8501, 8888, 5174, 5230, 1420, 1421, 1430, 1542, 1600, 18080];
const host = process.argv[2] || '127.0.0.1';

async function probe(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err) => resolve({ port, ok: false, code: err.code || err.message }));
    server.listen(port, host, () => server.close(() => resolve({ port, ok: true })));
  });
}

(async () => {
  for (const port of ports) {
    const result = await probe(port);
    console.log(result.ok ? `${result.port} OK` : `${result.port} FAIL ${result.code}`);
  }
})();
