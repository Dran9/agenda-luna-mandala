# 15 - VPS Docker Migration Plan

## Decision

Agenda Luna Mandala cambia de objetivo runtime:

- Antes: Hostinger Web/Node.js v1 como restriccion principal.
- Ahora: VPS Hostinger KVM con Docker como runtime principal.
- Local: desarrollo reproducible con Docker Desktop en esta maquina.
- Produccion: mismo contrato de contenedores, movible al KVM2.

Este documento es plan de migracion. No autoriza por si solo tocar DB remota, hacer push, ni mezclar runtime/deploy con features.

## Contexto Del Repo Actual

El repo ya no esta en Fase 0 pura:

- Express sirve API y builds estaticos.
- Hay apps Vite separadas para `booking-web` y Admin.
- La DB actual esta modelada para MySQL/MariaDB con `mysql2` y SQL crudo.
- Los claims por minuto ya tienen defensa a nivel DB con `UNIQUE(center_id, resource_type, resource_id, claim_time)`.
- Hay muchos servicios con queries MySQL directas. Migrar a Postgres ahora no es un cambio pequeno.

Conflicto documental detectado al iniciar D0:

- `AGENTS.md`, `README.md`, `docs/00_MASTER_SPEC.md`, `docs/02_ARCHITECTURE.md`, `docs/04_HOSTINGER_DEPLOY_CONTRACT.md`, `docs/07_ROADMAP_MICROPHASES.md` y `docs/08_ACCEPTANCE_GATES.md` trataban Hostinger Web/Node.js como verdad dura.
- Por eso la primera fase real no debe ser un `Dockerfile`; debe ser alinear la fuente de verdad.

Estado:

- D0 actualizo esos documentos para que VPS Docker sea el contrato vigente.
- Las menciones restantes a Hostinger Web deben quedar marcadas como historicas/legacy, no como objetivo activo.

## Objetivos De Producto

La arquitectura debe servir a una agenda que factura poco al inicio.

- Presupuesto operativo objetivo: VPS + servicios gratis o centavos.
- No depender de PaaS con precio mensual base.
- No introducir Redis, BullMQ, workers separados, replicas ni colas hasta que duela.
- Poder reconstruir el VPS desde repo + secretos + backup.
- Tener rollback en minutos, no en una noche de debug manual.

Objetivos iniciales de servicio:

- Uptime objetivo inicial: 99.5% mensual.
- RPO inicial: 24 horas.
- RTO inicial: 2 horas.
- Recalibrar RPO/RTO cuando haya pagos/citas reales con mas volumen.

## Decision DB: Mantener MySQL/MariaDB En La Migracion Inicial

Recomendacion: no migrar a Postgres en la primera pasada VPS.

Razon:

- El data layer usa `mysql2` crudo en muchos servicios y migraciones.
- El patron de claims por minuto ya protege el solapamiento critico a nivel DB con indice unico.
- Cambiar DB ahora mezclaria runtime/deploy + DB/migrations + backend negocio.
- Postgres con exclusion constraints es tecnicamente atractivo, pero aqui no es el cuello de botella inmediato.

Decision operativa:

- Fase Docker inicial usa MariaDB o MySQL en contenedor.
- Mantener claims por minuto como contrato de negocio.
- Prohibir rutas que creen citas sin claims.
- Abrir un spike Postgres posterior, aislado y time-boxed, solo despues de Docker, CI/CD, backups y observabilidad.

## Arquitectura Target

```txt
Usuarios
  -> Cloudflare DNS/proxy
  -> Cloudflare Pages: Reserva publica y Admin estaticos
  -> api.<dominio>
      -> Cloudflare proxy
      -> Caddy en VPS
      -> Express API container
      -> MariaDB/MySQL container
      -> backup restic -> Cloudflare R2 o Backblaze B2
```

En local:

```txt
Docker Desktop
  -> api container
  -> db container
  -> caddy container opcional para prod-sim
  -> Vite dev servers en host o profile full-dev
```

El target descarga los assets estaticos a Cloudflare Pages, pero no debe ser el primer cambio de codigo. Primero se estabiliza Docker local/prod-sim con la topologia actual; despues se separa static hosting y se agrega CORS.

## Que Cambia

- El contrato de deploy pasa de `npm install && npm run build && npm start` en Hostinger Web a imagen Docker + `docker compose`.
- El VPS corre Caddy, API, DB y backup.
- Cloudflare queda delante del VPS.
- Los frontends Vite pasan a Cloudflare Pages cuando la API este estable.
- CI publica imagenes a GHCR con tag por SHA.
- Deploy es pull + compose up + healthcheck.
- Rollback es redeploy del SHA anterior.

## Que No Cambia

- Producto MVP.
- Reserva publica y Admin como superficies separadas.
- Claims por minuto.
- MySQL/MariaDB como fuente de verdad en esta primera migracion.
- Google Calendar no decide disponibilidad.
- Redis/BullMQ no existen en v1.
- No se mezcla runtime/deploy con features.
- No se escriben datos en DB remota sin permiso explicito de Daniel.

## Stack Target

Runtime:

- Node.js LTS en contenedor.
- Express API.
- MariaDB/MySQL en contenedor.
- Caddy como reverse proxy.
- Docker Compose para local, staging y produccion.

Frontend:

- Vite build para `booking-web`.
- Vite build para Admin.
- Cloudflare Pages para hosting estatico en produccion.
- Express puede conservar serving estatico como fallback/local/prod-sim mientras dure la transicion.

Observabilidad:

- `pino` JSON a stdout.
- Sentry frontend/backend.
- UptimeRobot Free para healthchecks externos y alertas iniciales.
- Sentry Uptime queda como fallback si UptimeRobot no alcanza o falla.
- Docker log rotation local.

Backups:

- Dump logico diario.
- Restic cifrado.
- R2 Standard o B2 como destino off-site.
- Restore drill mensual en staging.

## Costo Y Notas Verificadas

Verificado el 2026-05-14 contra fuentes publicas:

- Hostinger KVM 2 publica 2 vCPU, 8 GB RAM y 100 GB NVMe; precio final depende de plazo/promocion y debe confirmarse al comprar.
- Cloudflare Pages Free tiene 500 builds/mes, 1 build concurrente, 20,000 archivos por sitio y 25 MiB maximo por asset.
- Cloudflare R2 Standard incluye free tier mensual de 10 GB-month, 1M Class A, 10M Class B y egress gratis; el free tier no aplica a Infrequent Access.
- Sentry Developer es gratis para 1 usuario e incluye 5k errores, 5 GB logs, 1 uptime monitor, 1 cron monitor y 30 dias de lookback.
- UptimeRobot Free existe y se usara para monitoreo inicial por decision de Daniel. Riesgo aceptado: su ayuda oficial dice que el plan Free es para uso no comercial.
- GitHub Actions es gratis en repos publicos; en privados usa cuotas por plan. GitHub Container Registry indica que storage/bandwidth para Container Registry actualmente es gratis, con aviso previo si cambia.
- Docker Desktop es gratis para small businesses con menos de 250 empleados y menos de USD 10M de revenue anual, uso personal, educacion y open source no comercial.

Fuentes:

- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Sentry pricing: https://sentry.io/pricing/
- UptimeRobot Free plan note: https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- GitHub Packages billing: https://docs.github.com/en/billing/concepts/product-billing/github-packages
- GitHub Container Registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Docker Desktop license: https://docs.docker.com/subscription/desktop-license/
- Hostinger VPS: https://www.hostinger.com/vps-hosting

## Fases

### Fase D0 - Alinear Fuente De Verdad

Objetivo:

Cambiar el contrato documental antes de tocar runtime.

Entregables:

- Agregar este plan.
- Actualizar `AGENTS.md` para reemplazar `Hostinger Web/Node.js v1` por `VPS Docker v1`.
- Actualizar `README.md`, `docs/00_MASTER_SPEC.md`, `docs/02_ARCHITECTURE.md`, `docs/06_ENGINEERING_GUARDRAILS.md`, `docs/07_ROADMAP_MICROPHASES.md` y `docs/08_ACCEPTANCE_GATES.md`.
- Convertir `docs/04_HOSTINGER_DEPLOY_CONTRACT.md` en contrato legacy o reemplazarlo por un contrato `VPS_DOCKER_DEPLOY_CONTRACT`.
- Mantener la regla dura de no mezclar runtime/deploy con features.

Gate:

- Los documentos ya no se contradicen sobre el runtime principal.
- Se entiende que Hostinger Web queda como referencia historica, no como objetivo v1.

### Fase D1 - Docker Local Base

Objetivo:

Levantar API + DB localmente con Docker Desktop sin cambiar producto.

Entregables esperados:

- `.dockerignore`.
- `Dockerfile` para la app Node.
- `compose.local.yaml`.
- `ops/env/.env.local.docker.example`.
- `ops/caddy/Caddyfile.local` si se usa prod-sim.
- Documentacion de comandos locales.

Decisiones iniciales:

- API expuesta localmente en `4000` hacia el host.
- DB solo en red Docker, con puerto host opcional para debugging.
- Vite puede correr en host al inicio, apuntando a `http://localhost:4000/api`.
- Profile opcional `full-dev` puede contener Vite si Docker Desktop se comporta bien con file watching.

Gate:

```bash
docker compose -f compose.local.yaml up -d db api
npm test
npm run build
curl -s http://127.0.0.1:4000/api/health
npm run db:migrate
npm run db:seed
npm run db:verify
```

Nota:

Las migraciones en esta fase son solo contra DB local de Docker.

### Fase D2 - Compose Prod-Sim

Objetivo:

Tener una topologia local parecida a produccion antes de tocar el VPS.

Estado:

- Implementado `compose.yaml` con Caddy, API y MariaDB.
- Implementado `ops/caddy/Caddyfile`.
- Implementados templates `ops/env/.env.prod-sim.example` y `ops/env/.env.vps.example`.
- Implementado runbook `docs/17_VPS_PROD_SIM_RUNBOOK.md`.
- Prod-sim usa proyecto Compose separado `agenda-prod-sim` para no pisar `compose.local.yaml`.

Entregables esperados:

- `compose.yaml` orientado a produccion.
- Caddy reverse proxy.
- Healthchecks por servicio.
- Restart policies.
- Volumen persistente de DB.
- Log rotation de Docker.
- Variables separadas para local/staging/prod.

Gate:

```bash
docker compose up -d
curl -s http://127.0.0.1/api/health
docker compose ps
docker compose logs api
```

Resultado esperado:

- Caddy enruta `/api/*` a Express.
- DB no queda publica.
- Express puede seguir sirviendo static build como fallback.

### Fase D3 - Cloudflare Pages Para Static

Objetivo:

Quitar del VPS el trabajo de servir JS/CSS/HTML de Vite en produccion.

Estado:

- Pendiente de setup externo en Cloudflare Pages y dominios.
- Backend preparado con `API_CORS_ORIGINS` por allowlist, sin `*`.

Entregables esperados:

- Proyecto Pages para Reserva publica.
- Proyecto Pages para Admin, o build combinado si se decide mantener `/admin` en el mismo dominio.
- `VITE_API_BASE_URL=https://api.<dominio>`.
- `API_CORS_ORIGINS` en backend.
- Headers/cache para assets estaticos.
- Preview deployments para QA cuando aplique.

Gate:

- Reserva publica carga desde Pages y consume API del VPS.
- Admin carga desde Pages y consume API del VPS.
- Login/admin sigue funcionando con `Authorization: Bearer`.
- No hay CORS abierto a `*` en produccion.
- Express static fallback sigue disponible solo si se decide conservarlo.

Recomendacion:

Usar dos Pages projects al inicio reduce acoplamiento:

- `reservas.<dominio>` o dominio publico principal para booking.
- `admin.<dominio>` para Admin.
- `api.<dominio>` para Express.

### Fase D4 - CI/CD Minimo

Objetivo:

Dejar de deployar a mano.

Estado:

- Implementado workflow CI con `npm ci`, `npm test`, `npm run build` y Docker build.
- Implementado workflow publish para GHCR con tag SHA y `main`.
- Deploy VPS queda pendiente hasta tener VPS, secretos SSH, env real y dominio.

Entregables esperados:

- Workflow CI: `npm ci`, `npm test`, `npm run build`, Docker build.
- Workflow publish: imagen API a GHCR con tag SHA.
- Workflow deploy staging: pull + compose up + healthcheck.
- Workflow deploy prod manual: mismo flujo, aprobado por Daniel.
- Rollback documentado por SHA anterior.

Imagen:

```txt
ghcr.io/dran9/agenda-luna-mandala-api:<git-sha>
```

Secretos necesarios:

- `GHCR` via `GITHUB_TOKEN` para publish desde Actions.
- `VPS_HOST`.
- `VPS_USER`.
- `VPS_SSH_KEY`.
- `PROD_ENV_FILE` o secretos individuales.
- `STAGING_ENV_FILE` o secretos individuales.

Gate:

- Un commit en staging genera imagen, deploya y pasa `/api/health`.
- Produccion solo corre por accion manual.
- Rollback documentado y probado en staging.

### Fase D5 - Observabilidad Y Logs

Objetivo:

Saber que se rompio antes de enterarse por el cliente.

Entregables esperados:

- `pino` para logs JSON.
- Request id por request.
- Error handler con logs estructurados.
- Sentry backend.
- Sentry frontend para booking/admin.
- Release asociado al SHA.
- Monitor externo inicial para `/api/health`.

Decisiones:

- Usar UptimeRobot Free para produccion inicial por decision explicita de Daniel.
- Documentar el riesgo de uso comercial del plan Free, pero no bloquear la arquitectura por eso.
- Usar Sentry Uptime como fallback o segundo monitor si conviene.
- Si se necesita SMS/llamada o mas cobertura, tratarlo como costo explicito.
- No meter agregador pago de logs hasta que haya volumen o incidente que lo justifique.

Gate:

- Error backend test genera evento Sentry en staging.
- Error frontend test genera evento Sentry en staging.
- Logs API son JSON parseables.
- Monitor externo alerta en una prueba controlada de staging.

### Fase D6 - Backups Off-Site Y Restore Drill

Objetivo:

Que backup signifique restore posible.

Entregables esperados:

- Script o contenedor de backup.
- `mysqldump --single-transaction --routines --triggers`.
- Compresion.
- Restic cifrado.
- Destino R2 Standard o B2.
- Politica de retencion.
- Runbook de restore.
- Restore drill mensual en staging.

Politica inicial:

- Dump diario.
- Retener 14 diarios, 8 semanales, 6 mensuales.
- RPO 24h.
- RTO 2h.

Gate:

- Backup corre en staging.
- Restore en DB staging limpia reconstruye tablas y datos.
- `npm run db:verify` pasa contra DB restaurada.

### Fase D7 - VPS Hardening

Objetivo:

No repetir blackouts con sintomas nuevos.

Checklist VPS:

- Ubuntu LTS minimal.
- Usuario `deploy` sin password login.
- SSH keys only.
- Root login deshabilitado.
- UFW: permitir SSH, HTTP, HTTPS.
- fail2ban.
- unattended-upgrades.
- Docker instalado desde repo oficial.
- DB no expuesta fuera de Docker network.
- Secrets fuera del repo.
- Cloudflare proxy activo.
- IP origen no publicada en DNS sin proxy.
- Despues de estabilizar DNS, evaluar limitar 80/443 a IPs Cloudflare o usar Cloudflare Tunnel.

Gate:

- Reinicio de VPS levanta servicios automaticamente.
- `docker compose ps` sano.
- `/api/health` sano desde Cloudflare.
- Direct DB port cerrado desde internet.
- Restore runbook existe.

### Fase D8 - Spike Postgres Opcional

Objetivo:

Decidir con evidencia si Postgres merece el cambio.

No empieza antes de:

- Docker local estable.
- CI/CD estable.
- Backups y restore drill funcionando.
- Cero datos reales que compliquen migracion, o migracion de datos definida.

Preguntas del spike:

- Cuanto SQL MySQL habria que reescribir.
- Como se modelan `ENUM`, `JSON`, timestamps y auto-increment.
- Si se reemplazan claims por exclusion constraints o se conservan claims.
- Si los tests actuales portan en menos de 1 dia.
- Si el beneficio supera retrasar booking/admin/pagos.

Recomendacion actual:

Postgres no es Fase D1. Es decision posterior.

## Runbook Minimo

### Deploy Staging

```bash
docker compose pull api
docker compose up -d api
curl -fsS https://staging-api.<dominio>/api/health
```

### Deploy Produccion

```bash
API_IMAGE_TAG=<sha> docker compose pull api
API_IMAGE_TAG=<sha> docker compose up -d api
curl -fsS https://api.<dominio>/api/health
```

### Rollback

```bash
API_IMAGE_TAG=<sha-anterior> docker compose pull api
API_IMAGE_TAG=<sha-anterior> docker compose up -d api
curl -fsS https://api.<dominio>/api/health
```

### Incidente

1. Verificar Cloudflare status y DNS.
2. Verificar `/api/health`.
3. Ver `docker compose ps`.
4. Ver `docker compose logs api --tail=200`.
5. Si el ultimo deploy rompio runtime, rollback al SHA anterior.
6. Si DB esta corrupta o perdida, restaurar ultimo backup en staging primero.
7. Solo restaurar produccion despues de confirmar causa y snapshot disponible.

## Primeros Tickets Recomendados

1. `docs(runtime): replace Hostinger Web contract with VPS Docker contract`.
2. `chore(docker): add local compose for api and db`.
3. `chore(docker): add production-like compose and caddy config`.
4. `ci: run tests build and docker image build`.
5. `ci: publish api image to ghcr`.
6. `ops: add staging deploy workflow`.
7. `ops: add restic backup and restore drill`.
8. `obs: add pino and sentry`.
9. `ops: split static frontends to Cloudflare Pages`.
10. `docs: add VPS incident runbook`.

## Decisiones Que Daniel Debe Confirmar

- Confirmar que MySQL/MariaDB se mantiene para la primera migracion.
- Confirmar dominios: booking, admin, api y staging.
- Confirmar si staging vive en el mismo KVM2 o si staging queda local hasta que haya mas presupuesto.
- Confirmar RPO/RTO inicial: 24h/2h o algo mas estricto.
- Confirmar destino de backups: R2 o B2.
- Confirmar si produccion requiere SMS/llamada en alertas, porque eso puede requerir plan pago aunque UptimeRobot Free quede como monitor inicial.
