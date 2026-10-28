import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const entry=fileURLToPath(new URL('./server.mjs',import.meta.url));
async function start(dataDir){
 const child=spawn(process.execPath,[entry],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',DATA_DIR:dataDir,APP_ENV:'prueba'},stdio:['ignore','pipe','pipe']});
 const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('Tiempo de inicio agotado')),10000);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Servidor salió '+code));});child.stdout.on('data',chunk=>{out+=chunk;const match=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});});
 return {child,base};
}
async function stop(child){if(child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
const opts=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
test('CRUD, validación, consultas parametrizadas y persistencia entre procesos',async t=>{
 const data=await mkdtemp(join(tmpdir(),'u3-tareas-test-'));let instance;
 try{
 instance=await start(data);let {base}=instance;
 await t.test('Salud de la aplicación y SQLite',async()=>{const r=await fetch(base+'/health');assert.equal(r.status,200);assert.equal((await r.json()).database,'sqlite');});
 let id;
 await t.test('Crear y consultar título con caracteres de SQL y HTML',async()=>{const titulo="Prueba <script>alert(1)</script> '; DROP TABLE tareas;--";const r=await fetch(base+'/api/tareas',opts('POST',{titulo,materia:'Infraestructura'}));assert.equal(r.status,201);const row=await r.json();id=row.id;assert.equal(row.titulo,titulo);const rows=await(await fetch(base+'/api/tareas')).json();assert.equal(rows.length,1);assert.equal(rows[0].titulo,titulo);});
 await t.test('Actualizar estado y rechazar valores inválidos',async()=>{assert.equal((await fetch(base+'/api/tareas/'+id,opts('PATCH',{estado:'completada'}))).status,200);assert.equal((await fetch(base+'/api/tareas/'+id,opts('PATCH',{estado:'inventado'}))).status,400);assert.equal((await fetch(base+'/api/tareas',opts('POST',{titulo:'   '}))).status,400);assert.equal((await fetch(base+'/api/tareas',opts('POST',null))).status,400);});
 await t.test('Rechazar modificación desde otro origen',async()=>{const o=opts('POST',{titulo:'No crear'});o.headers.Origin='https://example.org';assert.equal((await fetch(base+'/api/tareas',o)).status,403);});
 await stop(instance.child);instance=await start(data);base=instance.base;
 await t.test('Persistir un registro y su estado después de reiniciar',async()=>{const rows=await(await fetch(base+'/api/tareas')).json();assert.equal(rows.length,1);assert.equal(rows[0].id,id);assert.equal(rows[0].estado,'completada');});
 await t.test('Eliminar y devolver 404 en un recurso inexistente',async()=>{assert.equal((await fetch(base+'/api/tareas/'+id,{method:'DELETE'})).status,204);assert.equal((await fetch(base+'/api/tareas/'+id,opts('PATCH',{estado:'pendiente'}))).status,404);assert.equal((await(await fetch(base+'/api/tareas')).json()).length,0);});
 }finally{if(instance)await stop(instance.child);await rm(data,{recursive:true,force:true});}
});
  
