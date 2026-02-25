## Ejecutar el sistema en Docker (sin correr local)

### Qué debes instalar

- **Docker Desktop para Windows** (con backend WSL2 recomendado).
  - Asegúrate de tener **WSL2** habilitado en Windows.
  - En Docker Desktop: Settings → General → “Use the WSL 2 based engine”.

### Qué tener en cuenta

- **Persistencia de la base SQLite**: se guarda en `./data` (volumen).  
  - Si borras la carpeta `data/`, perderás usuarios/turnos/horarios.
- **Seguridad**:
  - Cambia `JWT_SECRET` en `docker-compose.yml` (o usa `.env`).
  - El barbero por defecto se crea en la DB si no existe uno:
    - Email: `barbero@barberia.com`
    - Password: `barbero123`
  - Recomendación: cambia esa contraseña apenas levantes el sistema.

### Cómo levantar

En la raíz del proyecto (donde está `docker-compose.yml`):

```bash
docker compose up --build
```

Luego abre:

- En PC: `http://localhost:3000`

### Cómo verlo desde el celular

Si tu celular está en la misma red WiFi que tu PC:

- Averigua la IP local de tu PC (ej: `192.168.0.10`)
- En el celular abre: `http://192.168.0.10:3000`

> Nota: puede que Windows Firewall te pida permiso para exponer el puerto 3000.

### Apagar

```bash
docker compose down
```

### Reconstruir (si cambiaste código)

```bash
docker compose up --build
```

