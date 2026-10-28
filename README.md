# U3 Tareas

Proyecto educativo de Infraestructura. CRUD de tareas con Node.js 24, interfaz HTML/CSS/JS, SQLite local y PostgreSQL cuando existe DATABASE_URL.

## Iniciar localmente sin Docker

Requisito: Node.js 24.x. Ejecutar desde esta carpeta:

```powershell
npm ci --ignore-scripts
npm test
npm start
```

Abrir http://localhost:3000. Los registros se guardan en data/tareas.sqlite. No es necesario crear cuentas ni contraseñas para SQLite.

## Contenedor local

Requisito: Docker Desktop con motor Linux iniciado.

```powershell
docker compose up --build -d
docker compose ps
docker compose logs --tail 30
```

Abrir http://localhost:3000, crear una tarea ficticia y cambiar su estado. Ejecutar `docker compose restart` y recargar para comprobar la persistencia. Ejecutar `docker compose down`, volver a levantar y verificar el registro: el volumen nombrado se conserva. No usar `down -v` si se necesitan los datos. Detener al terminar con `docker compose down`.

## Render gratuito y PostgreSQL de prueba

El archivo render.yaml define un servicio Docker Free y una base PostgreSQL Free en la misma región. Crear un Blueprint con este repositorio. Revisar que ambos planes digan Free antes de confirmar. Render vincula DATABASE_URL automáticamente; no copiar su valor al repositorio ni a reportes. PostgreSQL está separado del disco efímero del contenedor. Las conexiones externas a la base se bloquean mediante ipAllowList vacía; la aplicación usa la red privada del proveedor.

La base Free expira a los 30 días según las condiciones actuales de Render. El servicio puede suspenderse por inactividad o cuotas. Descargar un respaldo lógico antes de su vencimiento si se requieren los datos. Esta demostración no promete disponibilidad continua ni incluye datos reales.

## Railway

El mismo Dockerfile y railway.json son compatibles con Railway. Para SQLite, adjuntar volumen en /data, configurar DATA_DIR=/data, APP_ENV=Railway y generar dominio al puerto que indique PORT. Comprobar permisos del volumen con el usuario node. Alternativamente, usar PostgreSQL y vincular DATABASE_URL dentro de Railway. Una cuenta con Trial expired puede exigir un plan pagado; no actualizar el plan sin autorización.

## Azure de pago previsto

Usar App Service Linux Basic B1 de una sola instancia. Para contenedor, publicar la imagen en un registro accesible y establecer puerto 3000. SQLite requiere DATA_DIR=/home/data y WEBSITES_ENABLE_APP_SERVICE_STORAGE=true. Verificar escritura y persistencia antes de darlo por terminado. No compartir SQLite entre réplicas. El almacenamiento de red tiene restricciones de bloqueo: para producción se recomienda PostgreSQL administrado con su costo adicional. La práctica de pago no está demostrada mientras no exista URL, despliegue sano y evidencia de base de datos.

## Variables de configuración

| Variable | Uso | Valor local |
|---|---|---|
| PORT | Puerto HTTP | 3000 |
| HOST | Interfaz de escucha | 0.0.0.0; usar 127.0.0.1 para solo local |
| DATA_DIR | Directorio SQLite persistente | ./data o /data en Docker |
| APP_ENV | Nombre visible del entorno | local |
| DATABASE_URL | Conexión PostgreSQL del proveedor | No establecer para usar SQLite |

## API

GET /health verifica servidor y base. GET /api/tareas lista registros. POST /api/tareas recibe titulo y materia. PATCH /api/tareas/:id recibe estado (pendiente, en curso, completada). DELETE /api/tareas/:id elimina un registro. Las mutaciones usan JSON y consultas parametrizadas. Título máximo 160 caracteres, materia 60, máximo orientativo 500 tareas por demostración.

## Alcance

Aplicación pública compartida sin cuentas de usuario, únicamente para tareas ficticias. La interfaz muestra esta condición. Las variables de configuración no se imprimen en logs. No hay claves ni contraseñas incluidas en el código; PostgreSQL utiliza una conexión generada por el servicio. SQLite y PostgreSQL son dos motores SQL distintos, seleccionados por configuración. El contenedor local preparado no constituye una demostración ejecutada hasta construirlo y verificarlo con Docker.

## Fuentes

- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://docs.railway.com/pricing/free-trial
- https://docs.railway.com/volumes
- https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container
- https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
  
