# Admin Next Integration Plan

## Estado

- Rama actual: `Mandala3.0`.
- Base estable previa: `codex/stabilize-docker-admin`.
- Spike: `Mandala3.0` agrega docs visuales vigentes y `apps/admin-next/` sobre esa base.
- Ultimo commit relevante: `17b57de docs: archive twilight visual contract`.
- Documentos visuales vigentes confirmados:
  - `docs/brand.md`
  - `docs/UX_PATTERNS.md`
  - `apps/admin-next/DESIGN.md`
  - `apps/booking/DESIGN.md`
  - `docs/archive/design-twilight-v0.md`
  - `docs/archive/design-brief-twilight-v0.md`
- `design.md` y `DESIGN_BRIEF_AGENDA_LUNA.md` ya no existen en root; quedaron archivados.

## Hallazgo Principal

Comparado contra `main`, `Mandala3.0` trae cambios de backend/runtime porque hereda `codex/stabilize-docker-admin`. Esa rama base contiene Docker/local runtime, workflows, ajustes de API/backend, cambios en admin viejo, booking, docs y tests.

Comparado contra su base real, `codex/stabilize-docker-admin`, el spike `Mandala3.0` no toca backend/runtime. La verificacion:

```txt
git diff --name-only codex/stabilize-docker-admin..Mandala3.0 -- server Dockerfile compose.local.yaml compose.yaml package.json package-lock.json .env.example ops
```

salio vacia.

Por eso el hard gate "backend intocable" esta cumplido para el spike si se mide contra su base real. La integracion a `main` debe ser en dos pasos para no mezclar aprobacion de runtime/backend con aprobacion del nuevo Admin.

## Diff 1: main -> codex/stabilize-docker-admin

Fuente: `git diff --name-status main..codex/stabilize-docker-admin`.

### Runtime/Docker

- Agrega `.dockerignore`.
- Agrega `Dockerfile`.
- Agrega `compose.local.yaml`.
- Agrega `compose.yaml`.
- Modifica `.env.example`.
- Modifica `.gitignore`.
- Agrega workflows:
  - `.github/workflows/ci.yml`
  - `.github/workflows/publish-api-image.yml`
- Agrega configuracion ops:
  - `ops/caddy/Caddyfile`
  - `ops/env/.env.local.docker.example`
  - `ops/env/.env.prod-sim.example`
  - `ops/env/.env.vps.example`
- Modifica `package.json`.

### Backend/API

- Modifica `server/createApp.js`.
- Modifica `server/db/seed.js`.
- Modifica `server/routes/admin.route.js`.
- Modifica `server/services/adminResources.service.js`.
- Modifica `server/services/adminTherapists.service.js`.
- Modifica `server/services/publicBooking.service.js`.
- Modifica `server/utils/env.js`.

### Admin viejo

- Modifica `apps/admin/src/main.jsx`.
- Modifica `apps/admin/src/styles.css`.

### Booking

- Modifica `apps/booking/src/main.jsx`.
- Modifica `apps/booking/src/styles.css`.

### Docs/tests

- Modifica `AGENTS.md`.
- Modifica `README.md`.
- Modifica docs `00`, `02`, `04`, `06`, `07`, `08`, `09`.
- Agrega:
  - `docs/15_VPS_DOCKER_MIGRATION_PLAN.md`
  - `docs/16_DOCKER_LOCAL_RUNBOOK.md`
  - `docs/17_VPS_PROD_SIM_RUNBOOK.md`
  - `docs/18_CI_CD_RUNBOOK.md`
  - `docs/19_LOCAL_PRODUCT_CLOSURE_BACKLOG.md`
- Modifica tests:
  - `test/admin.route.test.js`
  - `test/adminResources.service.test.js`
  - `test/adminTherapists.service.test.js`
  - `test/health.test.js`
  - `test/publicBooking.core.test.js`

### Commits base

Fuente: `git log --oneline main..codex/stabilize-docker-admin`.

```txt
4d59632 fix(admin): memoize appointment surfaces
9015756 docs(vps): update codex start prompt
9410b1b fix(admin): restore operational management surfaces
2e62da2 fix(booking): polish spanish copy and phone input
b79a36c chore(seed): update luna mandala catalog data
3d80bcf fix(booking): require compatible rooms for reservable services
6de5538 fix(admin): add resource and therapist mutation routes
08866b1 fix(server): configure cors allowlist for static deployments
0f9b19a chore(docker): add local vps compose runtime
2971647 docs(vps): align docker runtime contract
```

## Diff 2: codex/stabilize-docker-admin -> Mandala3.0

Fuente: `git diff --name-status codex/stabilize-docker-admin..Mandala3.0`.

### Docs visuales

- Modifica `AGENTS.md`.
- Modifica `README.md`.
- Agrega `docs/REBUILD_ANALYSIS.md`.
- Agrega `docs/UX_PATTERNS.md`.
- Agrega `docs/brand.md`.
- Agrega `docs/brand/luna-mandala-logo.svg`.
- Agrega referencias:
  - `docs/design-references/cal.DESIGN.md`
  - `docs/design-references/linear.DESIGN.md`
- Agrega `apps/booking/DESIGN.md`.
- Agrega `apps/admin-next/DESIGN.md`.
- Modifica docs `05`, `07`, `08`, `09`.

### Archivo archivado Twilight

- Renombra `design.md` a `docs/archive/design-twilight-v0.md`.
- Renombra `DESIGN_BRIEF_AGENDA_LUNA.md` a `docs/archive/design-brief-twilight-v0.md`.

### Admin Next

- Agrega `apps/admin-next/package.json` y `apps/admin-next/package-lock.json`.
- Agrega `apps/admin-next/vite.config.js`.
- Agrega `apps/admin-next/index.html`.
- Agrega `apps/admin-next/SPIKE_FOLLOWUPS.md`.
- Agrega rutas:
  - `apps/admin-next/src/routes/LoginRoute.jsx`
  - `apps/admin-next/src/routes/ControlRoute.jsx`
  - helpers/tests de `controlUtils`.
- Agrega auth:
  - `AuthContext.jsx`
  - `api.js`
  - `authState.js`
  - `loginForm.js`
  - `schema.js`
  - `storage.js`
  - tests correspondientes.
- Agrega appointments:
  - API paths, queries, query settings, mutation options.
  - tabla densa.
  - modal de cita manual.
  - payload, schema, errores, opciones, status/table helpers.
  - tests correspondientes.
- Agrega lib:
  - `http.js`
  - `httpUtils.js`
  - `queryClient.js`
  - `queryDefaults.js`
  - `brand.js`
  - tests correspondientes.
- Agrega UI base:
  - `Button`, `Chip`, `Input`, `Select`, `Modal`, `Toolbar`.
  - helpers/tests de clases y modal.
- Agrega CSS plano:
  - `tokens.css`
  - `base.css`
  - `layout.css`
  - `forms.css`
  - `table.css`
  - `modal.css`.

### Confirmacion explicita del spike puro

- Cero `server/`.
- Cero runtime/deploy.
- Cero root `package.json`.
- Cero root `package-lock.json`.
- Cero `Dockerfile`, `compose*.yaml`, `.env.example`, `ops/`.

La unica excepcion de lockfile es local a la app nueva: `apps/admin-next/package-lock.json`, esperado por el stack del spike.

### Commits spike puro

Fuente: `git log --oneline codex/stabilize-docker-admin..Mandala3.0`.

El rango incluye:

- `3dc48e3 docs(design): add brand, DESIGN.md per app, UX patterns, rebuild analysis`
- `c18b400 merge design docs for admin rebuild spike`
- Bootstrap de Vite/React Query/Router/tokens.
- Login, auth context, HTTP client y logout global 401.
- Control del dia con tabla densa via TanStack Query.
- Modal de crear cita e invalidacion sin reload.
- QA visual/hard gates/followups.
- Refinamientos de formulario, telefono, timestamp de refresh y sticky columns.
- Cobertura de tests para forms, HTTP, tabla, control, storage, payloads, query keys, API paths, schemas, opciones, errores, defaults, UI helpers, invalidacion y modal Escape.
- `17b57de docs: archive twilight visual contract`.

## Orden Recomendado

1. Revisar y aprobar `codex/stabilize-docker-admin` contra `main`.
2. Mergear o fijar `codex/stabilize-docker-admin` como base aprobada.
3. Revisar `Mandala3.0` encima de esa base aprobada.
4. Solo despues arrancar fase 2 del Admin rebuild.

No recomendamos mergear `Mandala3.0` directo a `main` como si fuera solo spike, porque eso mezclaria runtime/backend/base Docker con el nuevo Admin.

## Gates Para Base `codex/stabilize-docker-admin`

Antes de aprobar la base contra `main`:

- `npm test`
- `npm run build`
- Docker local:

```bash
docker compose -f compose.local.yaml up -d db api
curl -fsS http://127.0.0.1:4000/api/health
```

- `db:migrate`, `db:seed` y `db:verify` solo contra DB local.
- QA minima de endpoints nuevos o ajustados:
  - admin resources
  - admin therapists
  - public booking compatible rooms
  - health
- Confirmar CORS/static deployment behavior.
- No tocar ni escribir contra DB remota.

## Gates Para `Mandala3.0`

Antes de aprobar el spike encima de la base:

- `npm --prefix apps/admin-next test`
- `npm --prefix apps/admin-next run build`
- Boundaries:
  - ningun `.jsx` > 300 lineas.
  - ningun `.css` > 200 lineas.
  - `main.jsx` < 40 lineas.
- Evidencia actual:
  - mayor `.jsx`: `ManualAppointmentModal.jsx` con 112 lineas.
  - mayor `.css`: `table.css` con 190 lineas.
  - `main.jsx`: 31 lineas.
  - tests admin-next: 82 passing.
  - build admin-next: OK.
- QA visual obligatoria:
  - screenshot Control con tabla cargada.
  - screenshot modal Nueva cita.
  - screenshot tabla post-creacion sin reload.
- Confirmar que no hay `location.reload`, `setRefreshTick`, `Math.random` ni `key={Math.random()}` en `apps/admin-next/src`.
- Confirmar `design.md` y `DESIGN_BRIEF_AGENDA_LUNA.md` archivados.
- Confirmar jerarquia visual vigente:
  - `docs/brand.md`
  - `apps/admin-next/DESIGN.md`
  - `docs/UX_PATTERNS.md`
  - `docs/design-references/cal.DESIGN.md`
  - `docs/design-references/linear.DESIGN.md`.

## Por Que El Spike Sigue Cumpliendo Backend Intocable

El gate "backend intocable" no debe medirse contra `main` para evaluar el spike, porque `Mandala3.0` fue construido sobre `codex/stabilize-docker-admin`. Esa base ya contenia cambios backend/runtime antes del spike.

La medicion correcta para el spike es:

```txt
codex/stabilize-docker-admin..Mandala3.0
```

En ese rango, la verificacion de paths sensibles salio vacia:

```txt
server
Dockerfile
compose.local.yaml
compose.yaml
package.json
package-lock.json
.env.example
ops
```

Por lo tanto:

- Si se evalua `Mandala3.0` contra `main`, se ven cambios backend/runtime heredados.
- Si se evalua el spike puro contra su base real, el backend/runtime queda intocable.
- La conclusion tecnica es que el spike cumple su hard gate, pero la integracion debe separarse por capas.

## Bloqueado Hasta Aprobacion De Daniel

Hasta que Daniel apruebe la integracion base:

- No arrancar fase 2 del Admin rebuild.
- No mergear `Mandala3.0` directo a `main`.
- No asumir que los cambios backend/runtime heredados ya estan aprobados.
- No ampliar features de `apps/admin-next`.
- No modificar endpoints para acomodar el Admin nuevo.
- No actualizar docs north-star fuera del plan aprobado.
- No ejecutar migraciones/seeds contra DB remota.

## Riesgos

- Si se mergea `Mandala3.0` directo a `main`, se mezclan runtime/backend/spike en una sola revision.
- Si se intenta rebasear sin cuidado, se pueden romper dependencias del Admin Next contra endpoints y ajustes existentes en `codex/stabilize-docker-admin`.
- Si se ignora la jerarquia visual nueva, otro agente puede volver a Twilight o a tokens deprecados.
- Si se aprueba el spike sin aprobar primero la base, el informe de cambios contra `main` puede parecer que el spike rompio el hard gate aunque esos cambios son heredados.

## Recomendacion

- NO mergear `Mandala3.0` directo a `main` como si fuera solo spike.
- SI tratar `Mandala3.0` como rama de integracion apilada.
- Primero aprobar `codex/stabilize-docker-admin`.
- Despues aprobar `Mandala3.0`.
- Solo despues iniciar fase 2 del Admin rebuild.
