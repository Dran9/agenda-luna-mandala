# 04 - VPS Docker Deploy Contract

## Nota Sobre El Nombre Del Archivo

El archivo conserva el nombre historico `04_HOSTINGER_DEPLOY_CONTRACT.md` para no romper el orden de lectura del repo.

El contrato vigente ya no es Hostinger Web/Node.js. El contrato vigente es VPS Hostinger KVM con Docker Compose, segun `docs/15_VPS_DOCKER_MIGRATION_PLAN.md`.

## Objetivo

Evitar repetir el error del prototipo: romper produccion por tocar runtime junto con features.

Runtime/deploy es una categoria aislada. No se mezcla con Admin, Reserva publica, pagos, claims ni UI.

## Contrato De Deploy

Produccion debe poder ejecutarse desde imagen Docker versionada por SHA y Compose:

```bash
docker compose pull
docker compose up -d
curl -fsS https://api.<dominio>/api/health
```

Local/prod-sim debe poder levantar una topologia equivalente:

```bash
docker compose up -d
curl -fsS http://127.0.0.1/api/health
```

Durante la transicion, Express puede seguir sirviendo:

```txt
/api/health
/
/booking
/admin/
```

En produccion final, Cloudflare Pages puede servir Reserva publica y Admin estaticos, y el VPS debe servir principalmente API.

## Servicios Esperados

```txt
caddy -> reverse proxy
api   -> Node.js + Express
db    -> MySQL/MariaDB
backup -> dump + restic, si aplica por perfil/cron
```

La DB no debe exponerse publicamente a internet.

## Variables Esperadas

```env
NODE_ENV=production
APP_ENV=production
PORT=3000

DB_HOST=db
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_CONNECTION_LIMIT=10
DB_TIMEZONE=-04:00
APP_TIMEZONE=America/La_Paz

JWT_SECRET=
MESSAGING_PROVIDER=test_outbox
ENABLE_MOCK_FALLBACK=false
ENABLE_DEMO_SCHEDULE_FALLBACK=false

API_CORS_ORIGINS=
PUBLIC_BASE_URL=
ADMIN_BASE_URL=
SENTRY_DSN=
SENTRY_RELEASE=

WA_TOKEN=
WA_PHONE_ID=
WA_VERIFY_TOKEN=
META_APP_SECRET=
GOOGLE_VISION_API_KEY=
TELEGRAM_BOT_TOKEN=
```

No versionar secretos reales.

## Regla Sobre HOST

No usar `HOST` para `app.listen` salvo prueba explicita.

Seguro:

```js
app.listen(env.PORT, () => {});
```

Riesgoso:

```js
app.listen(env.PORT, env.HOST, () => {});
```

Docker Compose y Caddy son responsables de exponer puertos y enrutar trafico.

## Gates Runtime Local

Para cambios de runtime/deploy:

```bash
npm test
npm run build
docker compose up -d
curl -fsS http://127.0.0.1/api/health
docker compose ps
```

Si se trabaja sobre la fase local inicial con `compose.local.yaml`:

```bash
docker compose -f compose.local.yaml up -d db api
curl -fsS http://127.0.0.1:4000/api/health
```

## Gates DB Local Docker

Solo contra DB local o de staging autorizada:

```bash
npm run db:migrate
npm run db:seed
npm run db:verify
```

Prohibido ejecutar migraciones, seed, drops, truncates, updates masivos o scripts de reparacion contra DB remota sin confirmacion explicita de Daniel.

## Archivos Protegidos

No tocar salvo tarea explicitamente de deploy/runtime:

- `server/index.js`
- `server/utils/env.js`
- `package.json`
- `.env.example`
- `Dockerfile`
- `.dockerignore`
- `compose*.yaml`
- `ops/`
- `.github/workflows/`
- scripts build/start/deploy.
- migraciones ya aplicadas.

## Rollback

Cada fase debe poder revertirse con un solo commit o redeployar el SHA anterior.

Rollback operativo esperado:

```bash
API_IMAGE_TAG=<sha-anterior> docker compose pull api
API_IMAGE_TAG=<sha-anterior> docker compose up -d api
curl -fsS https://api.<dominio>/api/health
```

No hacer commits gigantes con runtime + DB + UI + auth.

## Diagnostico De Incidente

Orden de diagnostico:

1. Probar `/api/health` por Cloudflare.
2. Probar `/api/health` directo en el VPS si aplica.
3. Revisar ultimo SHA desplegado.
4. Revisar si se toco runtime/deploy.
5. Revisar `docker compose ps`.
6. Revisar `docker compose logs api --tail=200`.
7. Si el ultimo deploy rompio runtime, rollback al SHA anterior.
8. No agregar fixes encima sin aislar causa.

## Contrato Legacy Hostinger Web

El contrato viejo era:

```bash
npm install
npm run build
npm start
```

Ese contrato queda como referencia historica del prototipo/rebuild inicial. No es el objetivo runtime v1 vigente.

