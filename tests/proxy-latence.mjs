// Proxy TCP qui ajoute de la latence (tests réseau). Usage : node tests/proxy-latence.mjs <port> <port cible> <retard ms> [gigue ms]
// Proxy TCP qui ajoute un retard (ms) dans chaque sens, avec gigue, sans jamais réordonner les paquets
import net from 'node:net';
const [, , PORT, CIBLE, DELAI, GIGUE = '30'] = process.argv;
net.createServer((c) => {
  const s = net.connect(+CIBLE, '127.0.0.1');
  const pipe = (a, b) => {
    const file = []; let dernier = 0;
    a.on('data', (buf) => { dernier = Math.max(dernier, Date.now() + +DELAI + Math.random() * +GIGUE); file.push([dernier, buf]); });
    const t = setInterval(() => { while (file.length && file[0][0] <= Date.now()) b.write(file.shift()[1]); }, 2);
    a.on('close', () => { clearInterval(t); setTimeout(() => b.destroy(), +DELAI + 100); }); a.on('error', () => b.destroy());
  };
  pipe(c, s); pipe(s, c);
}).listen(+PORT);
