// Gera public/sw.js a cada build, com um carimbo de versão novo — o
// conteúdo do arquivo precisa MUDAR a cada deploy pra o navegador
// perceber que existe uma versão nova do service worker e reinstalar.
// Sem isso, o app instalado na tela inicial do celular podia ficar preso
// numa versão antiga por dias. Roda automaticamente antes de "npm run dev"
// e "npm run build" (veja package.json).
import { writeFileSync } from 'node:fs';

const versao = Date.now().toString(36);
const conteudo = `// Gerado automaticamente por scripts/generate-sw.mjs a cada build — o
// carimbo de versão abaixo muda sempre, pra forçar o navegador a detectar
// que existe uma versão nova do app e atualizar sozinho.
const CACHE = 'barbearia-${versao}';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first: sempre busca a versão mais nova quando há internet,
// e só usa o cache (modo offline) se a rede falhar.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
`;

writeFileSync(new URL('../public/sw.js', import.meta.url), conteudo);
console.log('public/sw.js gerado (versão ' + versao + ').');
