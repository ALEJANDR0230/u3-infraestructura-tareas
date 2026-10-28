import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
export const database=process.env.DATABASE_URL?'postgresql':'sqlite';
let pool,sqlite;
if(database==='postgresql'){
 const {default:pg}=await import('pg');
 pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000});
 pool.on('error',()=>console.error('Conexión de PostgreSQL interrumpida'));
 await pool.query("CREATE TABLE IF NOT EXISTS tareas(id SERIAL PRIMARY KEY,titulo TEXT NOT NULL CHECK(length(titulo) BETWEEN 1 AND 160),materia TEXT NOT NULL DEFAULT 'Infraestructura',estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','en curso','completada')),created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
}else{
 const {DatabaseSync}=await import('node:sqlite');
 const dir=process.env.DATA_DIR||join(import.meta.dirname,'data');mkdirSync(dir,{recursive:true});
 sqlite=new DatabaseSync(join(dir,'tareas.sqlite'));
 sqlite.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; CREATE TABLE IF NOT EXISTS tareas(id INTEGER PRIMARY KEY AUTOINCREMENT,titulo TEXT NOT NULL CHECK(length(titulo) BETWEEN 1 AND 160),materia TEXT NOT NULL DEFAULT 'Infraestructura',estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','en curso','completada')),created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))");
}
async function query(sql,params=[]){
 if(pool){let i=0;return (await pool.query(sql.replace(/\?/g,()=>'$'+(++i)),params)).rows;}
 return sqlite.prepare(sql).all(...params);
}
export const store={
 async check(){await query('SELECT 1');},
 async list(){return query('SELECT * FROM tareas ORDER BY id DESC');},
 async count(){return Number((await query('SELECT count(*) AS n FROM tareas'))[0].n);},
 async get(id){return (await query('SELECT * FROM tareas WHERE id=?',[id]))[0];},
 async create(titulo,materia){return (await query('INSERT INTO tareas(titulo,materia) VALUES(?,?) RETURNING *',[titulo,materia]))[0];},
 async update(id,estado){return (await query('UPDATE tareas SET estado=? WHERE id=? RETURNING *',[estado,id]))[0];},
 async remove(id){await query('DELETE FROM tareas WHERE id=? RETURNING id',[id]);},
 async close(){if(pool)await pool.end();else sqlite.close();}
};
