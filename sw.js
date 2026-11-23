// Когда обновляете файлы, меняйте номер версии (v7 -> v8)
const CACHE='advent-v7';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','door.jpg','jingle-bells-calm.mp3'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
async function ranged(req,res){
  const buf=await res.arrayBuffer();
  const m=/bytes=(\d*)-(\d*)/.exec(req.headers.get('range'))||[];
  const s=m[1]?+m[1]:0;let e=m[2]?+m[2]:buf.byteLength-1;e=Math.min(e,buf.byteLength-1);
  return new Response(buf.slice(s,e+1),{status:206,statusText:'Partial Content',headers:{'Content-Type':res.headers.get('Content-Type')||'audio/mpeg','Content-Range':'bytes '+s+'-'+e+'/'+buf.byteLength,'Content-Length':String(e-s+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  const isPage=r.mode==='navigate'||(u.origin===location.origin&&(u.pathname.endsWith('/')||u.pathname.endsWith('index.html')));
  e.respondWith((async()=>{
    const c=await caches.open(CACHE);
    if(r.headers.has('range')){const hit=await c.match(r.url);return hit?ranged(r,hit):fetch(r)}
    if(isPage){
      // страница: сначала сеть (чтобы сразу видеть обновления), без сети — из памяти
      try{const res=await fetch(r);if(res&&res.ok)c.put(r,res.clone());return res}
      catch(_){return (await c.match(r))||(await c.match('index.html'))||(await c.match('./'))}
    }
    const hit=await c.match(r);
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>hit);
    return hit||net;
  })());
});
