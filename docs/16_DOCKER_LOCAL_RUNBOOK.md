# 16 - Docker Local Runbook

## Objetivo

Levantar Agenda Luna Mandala localmente con Docker Desktop sin tocar DB remota ni VPS real.

Este runbook cubre D1 del plan VPS Docker: API + MariaDB local.

## Archivos

- `Dockerfile`: build reproducible de la app Node.
- `compose.local.yaml`: API + DB local.
- `.dockerignore`: contexto Docker limpio.
- `ops/env/.env.local.docker.example`: variables locales de referencia.

## Levantar Local

El compose tiene defaults seguros para desarrollo local, asi que puede correr sin copiar env:

```bash
docker compose -f compose.local.yaml up -d db api
```

Importante: Docker Compose auto-carga el `.env` de la raiz del repo. Para evitar apuntar por accidente a una DB remota, `compose.local.yaml` usa variables con prefijo `LOCAL_*` y no consume `DB_NAME`, `DB_USER`, `DB_PASSWORD` ni `JWT_SECRET` directamente.

Si quieres sobreescribir defaults locales, usa:

```bash
docker compose --env-file ops/env/.env.local.docker.example -f compose.local.yaml up -d db api
```

Healthcheck:

```bash
curl -fsS http://127.0.0.1:4000/api/health
```

Credenciales admin locales del seed:

```txt
Email: admin.dev@lunamandala.local
Password: dev-only-placeholder-hash
```

`compose.local.yaml` arranca la API con `NODE_ENV=development` por defecto para permitir estas credenciales dev. No cambiarlo a `production` en el compose local si se usa el seed placeholder.

Ver estado:

```bash
docker compose -f compose.local.yaml ps
```

Ver logs API:

```bash
docker compose -f compose.local.yaml logs api --tail=100
```

## DB Local

MariaDB queda en un volumen Docker llamado `agenda_luna_mariadb_data`.

La DB local default es:

```txt
DB_NAME=lunamandala_v2_docker
DB_USER=lunav2_user
DB_PORT interno=3306
DB_PORT host=3307
```

Ejecutar migraciones solo contra esta DB local:

```bash
docker compose -f compose.local.yaml exec api npm run db:migrate
docker compose -f compose.local.yaml exec api npm run db:seed
docker compose -f compose.local.yaml exec api npm run db:verify
```

## Parar

```bash
docker compose -f compose.local.yaml down
```

Parar y borrar la DB local:

```bash
docker compose -f compose.local.yaml down -v
```

No usar `down -v` si quieres conservar datos locales.

## Reglas

- No usar este compose contra DB remota.
- No poner secretos reales en `compose.local.yaml`.
- No commitear archivos `.env` reales.
- Si cambia runtime/deploy, validar `docs/04_HOSTINGER_DEPLOY_CONTRACT.md`.
