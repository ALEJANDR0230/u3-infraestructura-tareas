const $=id=>document.getElementById(id);let tasks=[];
async function api(path,options={}){const res=await fetch(path,options);if(res.status===204)return null;const data=await res.json();if(!res.ok)throw Error(data.error||'No fue posible completar la operación');return data;}
function render(){
 $('total').textContent=tasks.length;$('pending').textContent=tasks.filter(t=>t.estado!=='completada').length;$('done').textContent=tasks.filter(t=>t.estado==='completada').length;
 const visible=tasks.filter(t=>$('filter').value==='todas'||t.estado===$('filter').value);const list=$('tasks');list.replaceChildren();
 if(!visible.length){const box=document.createElement('div');box.className='empty';const title=document.createElement('strong');title.textContent='Todo comienza con una tarea.';const p=document.createElement('p');p.textContent='Agrega tu primera entrega o cambia el filtro para ver las demás.';box.append(title,p);list.append(box);}
 for(const task of visible){
 const row=document.createElement('article');row.className='task'+(task.estado==='completada'?' completed':'');const content=document.createElement('div');const title=document.createElement('h3');title.textContent=task.titulo;
 const detail=document.createElement('small');detail.textContent=task.materia+' · #'+task.id+' · '+new Date(task.created_at).toLocaleDateString('es-MX');content.append(title,detail);
 const actions=document.createElement('div');actions.className='actions';const select=document.createElement('select');select.setAttribute('aria-label','Estado de '+task.titulo);
 for(const s of ['pendiente','en curso','completada']){const o=document.createElement('option');o.value=s;o.textContent=s[0].toUpperCase()+s.slice(1);select.append(o);}select.value=task.estado;
 select.addEventListener('change',async()=>{select.disabled=true;try{await api('/api/tareas/'+task.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado:select.value})});await refresh();$('message').textContent='Estado guardado.';}catch(e){$('message').textContent=e.message;select.value=task.estado;}finally{select.disabled=false;}});
 const del=document.createElement('button');del.className='delete';del.textContent='Eliminar';del.setAttribute('aria-label','Eliminar '+task.titulo);
 del.addEventListener('click',async()=>{if(!confirm('¿Eliminar la tarea ficticia «'+task.titulo+'»?'))return;del.disabled=true;try{await api('/api/tareas/'+task.id,{method:'DELETE'});await refresh();$('message').textContent='Tarea eliminada.';}catch(e){$('message').textContent=e.message;del.disabled=false;}});
 actions.append(select,del);row.append(content,actions);list.append(row);
 }
}
async function refresh(){tasks=await api('/api/tareas');render();}
$('filter').addEventListener('change',render);
$('task-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await api('/api/tareas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titulo:$('titulo').value,materia:$('materia').value})});$('titulo').value='';$('filter').value='todas';await refresh();$('message').textContent='Tarea guardada en la base de datos.';$('titulo').focus();}catch(err){$('message').textContent=err.message;}finally{btn.disabled=false;}});
try{const health=await api('/health');$('database').textContent='● '+(health.database==='postgresql'?'PostgreSQL':'SQLite');$('environment').textContent=health.environment+' · base de datos conectada';await refresh();}catch(e){$('environment').textContent='Sin conexión';$('message').textContent=e.message;}
  
