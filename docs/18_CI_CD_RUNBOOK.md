# 18 - CI/CD Runbook

## Objetivo

Cubrir la base D4 sin desplegar automaticamente al VPS todavia.

## Workflows

### CI

Archivo:

```txt
.github/workflows/ci.yml
```

Corre en pull requests, pushes a `main` y manualmente:

```bash
npm ci
npm test
npm run build
docker build --target runtime -t agenda-luna-mandala-api:ci .
```

### Publish API Image

Archivo:

```txt
.github/workflows/publish-api-image.yml
```

Publica imagen a GHCR en push a `main` o manualmente:

```txt
ghcr.io/dran9/agenda-luna-mandala-api:sha-<commit>
ghcr.io/dran9/agenda-luna-mandala-api:main
```

El workflow usa `GITHUB_TOKEN` con permiso `packages: write`.

## Pendiente Para Deploy VPS

No se activa deploy automatico hasta tener:

- VPS creado y endurecido.
- Usuario `deploy` con SSH keys-only.
- Directorio remoto del proyecto.
- Archivo env real no versionado basado en `ops/env/.env.vps.example`.
- Dominio `api.<dominio>` apuntando por Cloudflare al VPS.
- Decision de staging/prod.

Secretos esperados para una fase posterior:

```txt
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_PROJECT_DIR
VPS_ENV_FILE
VPS_HEALTHCHECK_URL
```

## Rollback Esperado

Cuando el deploy remoto exista:

```bash
VPS_API_IMAGE=ghcr.io/dran9/agenda-luna-mandala-api:sha-<commit-anterior> docker compose --env-file .env.vps up -d api
curl -fsS https://api.<dominio>/api/health
```
