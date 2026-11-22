const http=require('http'),fs=require('fs'),path=require('path');const root=process.argv[2];
const types={'.js':'text/javascript','.html':'text/html','.png':'image/png','.ttf':'font/ttf','.ico':'image/x-icon','.json':'application/json','.css':'text/css'};
http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!fs.existsSync(p)||fs.statSync(p).isDirectory())p=path.join(root,'index.html');
r.writeHead(200,{'content-type':types[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r)}).listen(Number(process.argv[3]) || 4173);
