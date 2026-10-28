import http from 'node:http';
import {store,database} from './storage.mjs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req){
 if(!(req.headers['content-type']||'').startsWith('application/json'))throw Error('Envía JSON');
 let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>4096)throw Error('Solicitud demasiado grande');}
 try{return JSON.parse(text);}catch{throw Error('JSON inválido');}
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 res.setHeader('Referrer-Policy','no-referrer');
 try{
 const url=new URL(req.url,'http://localhost');
 if(['POST','PATCH','DELETE'].includes(req.method)){
  if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host))return json(res,403,{error:'Origen no permitido'});
 }
 if(req.method==='GET'&&url.pathname==='/health'){await store.check();return json(res,200,{status:'ok',database,environment:process.env.APP_ENV||'local',version:'1.0.0'});}
 if(url.pathname==='/api/tareas'&&req.method==='GET')return json(res,200,await store.list());
 if(url.pathname==='/api/tareas'&&req.method==='POST'){
  const input=await body(req);const titulo=typeof input?.titulo==='string'?input.titulo.trim():'';
  const materia=typeof input?.materia==='string'?input.materia.trim():'Infraestructura';
  if(!titulo||titulo.length>160||!materia||materia.length>60)return json(res,400,{error:'Título de 1 a 160 caracteres y materia de 1 a 60'});
  if(await store.count()>=500)return json(res,409,{error:'Límite educativo de 500 tareas alcanzado'});
  const result=await store.create(titulo,materia);
  return json(res,201,result);
 }
 const item=url.pathname.match(/^\/api\/tareas\/([1-9]\d*)$/);
 if(item&&['PATCH','DELETE'].includes(req.method)){
  const id=Number(item[1]);if(!Number.isSafeInteger(id))return json(res,400,{error:'Identificador inválido'});
  if(!await store.get(id))return json(res,404,{error:'Tarea inexistente'});
  if(req.method==='DELETE'){await store.remove(id);res.writeHead(204);return res.end();}
  const input=await body(req);if(!['pendiente','en curso','completada'].includes(input?.estado))return json(res,400,{error:'Estado inválido'});
  await store.update(id,input.estado);return json(res,200,await store.get(id));
 }
 const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
 if(req.method==='GET'&&files[url.pathname]){const [file,type]=files[url.pathname];res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});return res.end(readFileSync(join(root,file)));}
 json(res,404,{error:'Ruta inexistente'});
 }catch(error){if(error.code?.startsWith('ERR_SQLITE')||error.code?.match(/^[0-9A-Z]{5}$/)){console.error('Error de base de datos',error.code);return json(res,500,{error:'No fue posible acceder a la base de datos'});}json(res,400,{error:error.message||'Solicitud inválida'});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log('U3 Tareas http://'+(process.env.HOST||'0.0.0.0')+':'+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await store.close();process.exit(0);}));
