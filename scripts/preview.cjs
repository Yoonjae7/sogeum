const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(['/api/buses','/api/arrivals'].includes(url.pathname)){
  req.query=Object.fromEntries(url.searchParams);res.status=code=>{res.statusCode=code;return res;};res.json=body=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
  try{await require(`../api/${url.pathname.split('/').pop()}.js`)(req,res);}catch{res.status(500).json({status:'unavailable'});}return;
 }
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));}catch{res.writeHead(400);res.end();return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Sogeum preview http://127.0.0.1:4173'));
