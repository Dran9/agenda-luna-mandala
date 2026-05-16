# Admin Next Integration Plan

## Estado

- Rama actual: `Mandala3.0`.
- Base previa: `codex/stabilize-docker-admin`.
- Spike: `apps/admin-next/` sobre la base previa, con login, Control, crear cita manual, TanStack Query, invalidacion sin reload, boundaries de archivos y contratos visuales activos.
- Commits clave recientes:
  - `17b57de docs: archive twilight visual contract`
  - `21b4363 docs: lock public reschedule contract`
- Visual activo:
  - `docs/brand.md`
  - `docs/UX_PATTERNS.md`
  - `apps/admin-next/DESIGN.md`
  - `apps/booking/DESIGN.md`
- Visual archivado:
  - `docs/archive/design-twilight-v0.md`
  - `docs/archive/design-brief-twilight-v0.md`

## Hallazgo Principal

Contra `main`, `Mandala3.0` trae backend/runtime porque hereda todos los cambios previos de `codex/stabilize-docker-admin`. Por eso no debe evaluarse como si fuera una rama de solo spike Admin.

Contra `codex/stabilize-docker-admin`, el spike `Mandala3.0` no toca backend/runtime. El gate de paths sensibles:

```txt
git diff --name-only codex/stabilize-docker-admin..Mandala3.0 -- server Dockerfile compose.local.yaml compose.yaml package.json package-lock.json .env.example ops
```

salio vacio.

Por lo tanto, el hard gate "backend intocable" esta cumplido para el spike puro, pero la integracion a `main` debe hacerse en dos pasos: primero aprobar la base `codex/stabilize-docker-admin`, despues revisar `Mandala3.0` encima de esa base.

## Diff 1: main -> codex/stabilize-docker-admin

Fuente:

```bash
git diff --name-status main..codex/stabilize-docker-admin
git log --oneline main..codex/stabilize-docker-admin
```

### Runtime/Docker

- Agrega `.dockerignore`.
- Agrega `Dockerfile`.
- Agrega `compose.local.yaml`.
- Agrega `compose.yaml`.
- Agrega workflows:
  - `.github/workflows/ci.yml`
  - `.github/workflows/publish-api-image.yml`
- Agrega configuracion `ops/`:
  - `ops/caddy/Caddyfile`
  - `ops/env/.env.local.docker.example`
  - `ops/env/.env.prod-sim.example`
  - `ops/env/.env.vps.example`
- Modifica `.env.example`, `.gitignore` y root `package.json`.

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

- Modifica `AGENTS.md` y `README.md`.
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

### Commits en la base

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

Fuente:

```bash
git diff --name-status codex/stabilize-docker-admin..Mandala3.0
git log --oneline codex/stabilize-docker-admin..Mandala3.0
```

### Docs visuales

- Agrega `docs/brand.md`.
- Agrega `docs/UX_PATTERNS.md`.
- Agrega `docs/REBUILD_ANALYSIS.md`.
- Agrega `docs/brand/luna-mandala-logo.svg`.
- Agrega referencias de diseno:
  - `docs/design-references/cal.DESIGN.md`
  - `docs/design-references/linear.DESIGN.md`
- Modifica `AGENTS.md`, `README.md` y docs `05`, `07`, `08`, `09`.

### `apps/admin-next`

- Agrega app nueva `apps/admin-next/` con Vite, React, React Router y TanStack Query.
- Agrega `LoginRoute`, `ControlRoute`, auth context, HTTP client, query client y defaults.
- Agrega feature vertical de citas:
  - API paths, queries, mutation options y query keys.
  - tabla densa de Control.
  - modal `Nueva cita`.
  - drawer de detalle de cita.
  - schemas, helpers, errores, opciones y tests.
- Agrega UI base:
  - `Button`, `Chip`, `Drawer`, `Input`, `Modal`, `Select`, `Toolbar`.
- Agrega CSS plano por boundaries:
  - `tokens.css`
  - `base.css`
  - `layout.css`
  - `forms.css`
  - `table.css`
  - `table-interactions.css`
  - `modal.css`
  - `drawer.css`

### Booking/admin design docs

- Agrega `apps/admin-next/DESIGN.md`.
- Agrega `apps/booking/DESIGN.md`.
- Admin nuevo queda bajo contrato Cal.com verbatim, light mode, Cal Sans + Inter, marca Luna Mandala residual.
- Booking futuro queda bajo contrato Luna Mandala completo, mobile-first, Outfit + Comfortaa restringida.

### Archivo Twilight archivado

- Renombra `design.md` a `docs/archive/design-twilight-v0.md`.
- Renombra `DESIGN_BRIEF_AGENDA_LUNA.md` a `docs/archive/design-brief-twilight-v0.md`.
- Root `design.md` y `DESIGN_BRIEF_AGENDA_LUNA.md` ya no son fuente activa.

### Reagendamiento publico documentado

- Modifica `docs/10_PUBLIC_BOOKING_SPEC.md`.
- Fija `Reagendar/Cancelar` como requisito P0 futuro de Reserva publica.
- No implementa el flujo en esta rama.

### Confirmacion explicita del spike puro

- Cero `server/`.
- Cero runtime/deploy.
- Cero root `package.json`.
- Cero root `package-lock.json`.
- Cero `Dockerfile`.
- Cero `compose*.yaml`.
- Cero `.env.example`.
- Cero `ops/`.

La unica lockfile nueva en el spike puro es local a la app nueva: `apps/admin-next/package-lock.json`.

## Orden Recomendado

1. Revisar/aprobar `codex/stabilize-docker-admin` contra `main`.
2. Mergear o fijar esa rama como base aprobada.
3. Revisar `Mandala3.0` encima de esa base.
4. Solo despues arrancar fase 2 del Admin rebuild.

## Gates Para codex/stabilize-docker-admin

- Root `npm test`.
- Root `npm run build`.
- Docker local:

```bash
docker compose -f compose.local.yaml up -d db api
curl -fsS http://127.0.0.1:4000/api/health
```

- `db:migrate`, `db:seed` y `db:verify` solo contra DB local.
- QA minima de endpoints admin resources/therapists.
- QA minima de public booking compatible rooms si se revisa todo el rango.
- Confirmar CORS/static deployments.
- No DB remota.

## Gates Para Mandala3.0

- `npm --prefix apps/admin-next test`.
- `npm --prefix apps/admin-next run build`.
- Boundary `.jsx`: ningun archivo > 300 lineas.
- Boundary `.css`: ningun archivo > 200 lineas.
- Confirmar cero patrones prohibidos:
  - `location.reload`
  - `setRefreshTick`
  - `Math.random`
  - `key={Math.random()}`
- Screenshot Control.
- Screenshot modal Nueva cita.
- Screenshot post-creacion sin reload.
- Confirmar jerarquia visual vigente:
  - `docs/brand.md`
  - `docs/UX_PATTERNS.md`
  - `apps/admin-next/DESIGN.md`
  - `apps/booking/DESIGN.md`
- Confirmar contrato de reagendamiento en `docs/10_PUBLIC_BOOKING_SPEC.md`.

## Reagendamiento Publico

Queda como P0 futuro, documentado pero no implementado en esta tarea.

Contrato fijado:

- Booking debe tener accion `Reagendar/Cancelar`.
- El flujo pide WhatsApp.
- Busca citas futuras activas.
- Muestra la cita encontrada y pide confirmacion explicita antes de mostrar horarios.
- Mantiene el mismo servicio.
- Intenta mantener el mismo terapeuta.
- Permite otros terapeutas si no hay disponibilidad del terapeuta original.
- No borra fisicamente la cita vieja de DB.
- Al confirmar reagenda, libera claims y conserva auditoria en la misma transaccion.
- Si falla la reagenda, la cita original sigue vigente.
- Google Calendar futuro es espejo outbound, no fuente de disponibilidad.

## Riesgos

- Merge directo de `Mandala3.0` a `main` mezcla runtime/backend/spike en una sola revision.
- Rebase descuidado puede romper la dependencia de `apps/admin-next` con endpoints y ajustes que vienen de `codex/stabilize-docker-admin`.
- Ignorar los docs visuales vigentes puede reintroducir Twilight o Comfortaa/admin fuera de contrato.
- Implementar reagendamiento publico sin backend transaccional puede romper claims, auditoria o la garantia de que la cita original sigue vigente si el cambio falla.

## Recomendacion

- NO mergear `Mandala3.0` directo a `main`.
- SI tratar `Mandala3.0` como rama apilada.
- Primero aprobar `codex/stabilize-docker-admin`.
- Despues aprobar `Mandala3.0`.
- Reagendamiento publico queda P0 futuro, no tarea actual.
- Solo despues de esas dos aprobaciones conviene arrancar fase 2 del Admin rebuild.
