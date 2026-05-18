# 17 - VPS Prod-Sim Runbook

## Objetivo

Levantar una topologia parecida a produccion sin tocar el VPS ni DB remota.

Este runbook cubre D2 del plan VPS Docker:

- Caddy delante de la API.
- API sin puerto publico directo.
- MariaDB solo en la red Docker.
- Variables separadas con prefijo `VPS_*`.
- Log rotation basico en Docker.

## Archivos

- `compose.yaml`: stack prod/prod-sim.
- `ops/caddy/Caddyfile`: reverse proxy.
- `ops/env/.env.prod-sim.example`: valores locales seguros.
- `ops/env/.env.vps.example`: plantilla para VPS real, sin secretos reales.

## Levantar Prod-Sim Local

```bash
docker compose --env-file ops/env/.env.prod-sim.example up -d --build
```

Healthcheck por Caddy:

```bash
curl -fsS http://127.0.0.1:8080/api/health
```

Estado:

```bash
docker compose --env-file ops/env/.env.prod-sim.example ps
```

Logs:

```bash
docker compose --env-file ops/env/.env.prod-sim.example logs api --tail=100
docker compose --env-file ops/env/.env.prod-sim.example logs caddy --tail=100
```

## DB Prod-Sim

La DB de prod-sim usa un proyecto Compose separado:

```txt
COMPOSE_PROJECT_NAME=agenda-prod-sim
DB_NAME=lunamandala_v2_prod_sim
```

Ejecutar migraciones solo contra esta DB local:

```bash
docker compose --env-file ops/env/.env.prod-sim.example exec api npm run db:migrate
docker compose --env-file ops/env/.env.prod-sim.example exec api npm run db:seed
docker compose --env-file ops/env/.env.prod-sim.example exec api npm run db:verify
```

## Admin En Prod-Sim

Prod-sim usa `NODE_ENV=production`. Por eso el seed placeholder no sirve para login admin.

Antes de usar Admin en prod-sim hay que crear un hash real de password o cargar credenciales reales de staging. No usar el placeholder:

```txt
dev-only-placeholder-hash
```

Para pruebas de login con el seed placeholder, usar `compose.local.yaml`.

## Parar

```bash
docker compose --env-file ops/env/.env.prod-sim.example down
```

Parar y borrar la DB prod-sim:

```bash
docker compose --env-file ops/env/.env.prod-sim.example down -v
```

## VPS Real

En el VPS:

1. Copiar `ops/env/.env.vps.example` a un archivo real no versionado.
2. Cambiar dominios, secretos y `VPS_API_IMAGE`.
3. Levantar:

```bash
docker compose --env-file /ruta/segura/.env.vps up -d
curl -fsS https://api.example.com/api/health
```

La DB no expone puertos publicos. Caddy publica 80/443.

## Reglas

- No usar `.env.vps.example` con secretos reales.
- No ejecutar migraciones contra VPS real sin confirmacion explicita de Daniel.
- No mezclar cambios de este stack con features.
