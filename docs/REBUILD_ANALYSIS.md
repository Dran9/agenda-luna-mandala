# Rebuild Analysis - Agenda Luna Mandala

> Opinión externa de Opus 4.7 (Claude Code) sobre la decisión de rebuild.
> Generado contra el estado real del repo, no contra la narrativa.

---

## 1. Diagnóstico brutal pero justo

**El backend NO es Frankenstein. El admin frontend SÍ.**

Lo medido en frío contra el código:

| Capa | Estado real | Veredicto |
|---|---|---|
| `server/services/claims.service.js` (223 ln) | Limpio, claims por minuto con `UNIQUE` real | Salvar |
| `server/services/availability.service.js` (557 ln) | Modular, sin acoplar a HTTP | Salvar |
| `server/services/roundRobin.service.js` (149 ln) | Pequeño y aislado | Salvar |
| `server/services/publicBooking.service.js` (898 ln) | Grande pero coherente | Salvar (vigilar tamaño) |
| `server/services/appointments.service.js` (1.371 ln) | Hinchado | Refactor, no rebuild |
| `server/services/adminAppointments.service.js` (1.933 ln) | Hinchado | Refactor, no rebuild |
| `server/routes/admin.route.js` (602 ln) | Dispatcher + error mapper | Aceptable |
| Migraciones SQL (5 archivos) | SQL real, `UNIQUE`, FKs, `InnoDB utf8mb4` | Salvar tal cual |
| `apps/admin/src/main.jsx` | **7.210 líneas, 113 `useState`, 155 hooks, 75 funciones internas, 17 `fetch()` desperdigados, sin cache, sin router, sin boundary de componente** | **Tirar** |
| `apps/admin/src/styles.css` | 3.813 líneas acumuladas | Tirar |
| `apps/booking/src/main.jsx` (2.491 ln) | Misma forma, menor escala | Tirar (después) |

El servidor es el héroe silencioso. La capa de servicios respeta separación, los errores tienen jerarquía (`PublicBookingError`, `SlotOccupiedError`, etc.), y `claims.service` realmente garantiza unicidad por minuto en DB. Eso es exactamente lo que cuesta acertar y aquí ya está acertado.

El admin, en cambio, es **una SPA dentro de un solo archivo**. Un `App` implícito con >100 piezas de estado local, fetches manuales con `AbortController` repetidos, `setRefreshTick(value => value + 1)` para simular invalidación, `setTimeout(loadX, 2000)` defer manual para no ahogar al servidor, y modales/drawers definidos como hermanos en el mismo archivo. No es un problema de React; es ausencia de arquitectura de cliente.

**Índice Frankenstein 7/10 está mal calibrado.** El número real, distribuido:

- Backend negocio: **3.5/10** (refactor focal de dos services gordos).
- Backend runtime/deploy: **5/10** (acoplado a Hostinger Web; falta Docker).
- Admin frontend: **8.5/10**.
- CSS: **8/10**.
- Booking público: **6/10**.
- Specs/docs: **2/10** (buenas, completas, coherentes).

Lo que está mal NO es la app entera. Es una capa muy concreta.

---

## 2. ¿Rebuild sí / no / parcial?

**Parcial, dirigido al frontend. NO rewrite total.**

Tirar el backend sería destruir trabajo que sí funciona y arriesgar la corrección de claims (lo más fácil de romper sutilmente). Tirar el admin frontend es liberación neta: ya está pidiendo a gritos un boundary de archivos, una capa de cache de servidor y un sistema visual real.

Concretamente:

- **Mantener**: `server/` entero, `server/db/migrations/`, contratos de API `/api/admin/*` y `/api/public/booking/*`, claims, disponibilidad, round-robin, publicBooking.
- **Refactorizar in-place (no en el spike, después)**: `adminAppointments.service.js` y `appointments.service.js`, partidos por subdominio (listar, crear, mover sala, cambiar status, historial).
- **Reescribir desde cero**: `apps/admin/`, `apps/booking/`, `styles.css`, sistema de íconos, design tokens aplicados.
- **Añadir como track separado**: Docker como contrato de runtime.

---

## 3. Stack recomendado

Mantener lo que ya está y agregar SOLO lo que resuelve dolor real.

**Sin tocar:**
- Node 20+, Express 5, mysql2, MariaDB.
- React 18, Vite 5, Phosphor Icons, CSS plano con variables (los docs prohíben Tailwind/shadcn en `docs/05_UI_UX_BRIEF.md`).

**Agregar:**
- **TanStack Query** para todo estado de servidor. Reemplaza `refreshTick`, `AbortController` manuales, y defer con `setTimeout`. Solo esto elimina ~40% de la complejidad actual del admin.
- **React Router 6** para vistas (`/control`, `/clientes`, `/terapeutas`, `/ajustes`). Hoy todo es `activeSection` en estado local — síntoma número uno de un `main.jsx` que crece sin parar.
- **Zod** (los docs ya lo nombran y no está en `package.json`) para validar payloads en cliente y server, compartido vía `shared/`.
- **Docker + docker-compose** (app + mariadb) como contrato local desde el día 1.

**Lo que NO meto, aunque parezca tentador:**
- ❌ TypeScript en este spike. Cambio cultural caro; mezclado con rebuild es el escenario clásico de "todo flota". Después, sí. Ahora, no.
- ❌ Next.js, SSR, RSC. Admin operativo SPA, no marketing site.
- ❌ Redux/Zustand/Jotai. Separando estado de servidor (Query) y UI local (`useState`), no se necesita store global.
- ❌ SSE/WebSockets. Polling selectivo de TanStack Query + invalidación post-mutación cubre el 95% de "se siente vivo". SSE solo si después medimos latencia perceptible.
- ❌ Redis/BullMQ (los docs ya lo prohíben para v1).
- ❌ Prisma/Drizzle. mysql2 directo es suficiente.
- ❌ Storybook, design system framework. Vanilla CSS con tokens de `docs/brand.md` y `apps/admin-next/DESIGN.md`.
- ❌ Monorepo tooling pesado (Turbo/Nx). `npm workspaces` si hace falta `shared/`.

---

## 4. Arquitectura recomendada

**Backend (sin cambios estructurales, ya está bien):**

```
server/
  routes/        # HTTP boundary, mapping de errores
  services/      # lógica pura, recibe connection
  db/            # pool + migrations
  utils/         # dates, env, jwt
  adapters/      # messaging, telegram (cuando toque)
```

Regla nueva: ningún `*.service.js` puede superar ~600 líneas. Si crece, se parte por subdominio. `adminAppointments.service.js` se parte en `appointments.list.js`, `appointments.create.js`, `appointments.mutations.js`, `appointments.history.js`.

**Frontend admin (rebuild):**

```
apps/admin-next/src/
  main.jsx                 # ~30 líneas: QueryClient + Router + Theme
  routes/
    LoginRoute.jsx
    ControlRoute.jsx
    ClientsRoute.jsx
    TherapistsRoute.jsx
    SettingsRoute.jsx
  features/
    appointments/
      api.js               # fetchers tipados por Zod
      queries.js           # useAppointmentsQuery, useAppointmentQuery
      mutations.js         # useCreateAppointment con invalidate
      AppointmentTable.jsx
      AppointmentDrawer.jsx
      ManualAppointmentModal.jsx
    therapists/
    clients/
    resources/
    auth/
  ui/                      # primitives: Button, Chip, Drawer, Modal
  styles/
    tokens.css             # variables de docs/brand.md + apps/admin-next/DESIGN.md
    base.css
    components/
  lib/
    http.js                # fetch wrapper + 401 handler único
    queryClient.js
```

**Regla dura: ningún archivo en `apps/admin-next/src/` > 300 líneas.** Eso solo evita el regreso del monstruo. Si una vista pasa de 300 líneas, se descompone en `*Header`, `*Table`, `*Toolbar`, `*Drawer` antes de continuar.

**Estado:**
- Servidor → TanStack Query (queries con `staleTime` por endpoint, `invalidateQueries(['appointments', date])` tras cada mutación).
- UI local → `useState` dentro del componente que la usa.
- Auth token → un `AuthContext` thin, persiste en `localStorage`.

**Comportamiento "app profesional sin recargar":**
- Mutación crea cita → `onSuccess` invalida `['appointments', date]`, `['claims', appointmentId]`. Tabla y drawer se rehidratan solos.
- `refetchOnWindowFocus: true` para Control.
- `refetchInterval: 30_000` para Control activo; `false` para Ajustes.
- Sin `location.reload`. Sin `setRefreshTick`. Sin defer con `setTimeout`.

---

## 5. Plan del spike de 1 día (corregido)

El spike propuesto originalmente (Docker + backend modular + auth + control + crear cita + booking público + Query + invalidation + base SSE + UI sobria + modular) **es 1-2 semanas, no un día**. Forzarlo en un día produce otro Frankenstein, esta vez nuevo y "limpio".

Spike honesto de 1 día, redirigido contra el dolor real (admin), reutilizando el backend que ya funciona:

**Setup (máx 90 min):**
1. Reutilizar el Docker local existente (`compose.local.yaml`). No crear runtime nuevo en este spike.
2. Levantar `server/` actual sin modificar. Correr migracion/seed solo contra MariaDB local. Verificar `/api/health`.

**Spike frontend (resto del día), en `apps/admin-next/`:**

3. Vite + React 18 + TanStack Query + React Router + Zod. `main.jsx` < 40 líneas.
4. `lib/http.js` con un solo punto que maneja `401 → logout`.
5. Login route → consume `/api/admin/auth/login` existente.
6. Control route con **una sola feature vertical**:
   - `useAppointmentsQuery(date)` contra `/api/admin/appointments`.
   - Tabla de citas del día (componente < 300 ln).
   - Crear cita manual → mutación que invalida la query y refresca la tabla sin reload.
7. Aplicar tokens reales de `docs/brand.md` y `apps/admin-next/DESIGN.md` en CSS plano. Nada de tokens Twilight.

**Lo que NO entra al spike de 1 día:**
- Booking público (otra app; spike 2).
- Drawers, kanban de salas, historial, búsqueda global, ajustes, terapeutas.
- SSE.
- Refactor del backend.
- Migración del admin viejo.

El spike prueba **una hipótesis: ¿con este stack y este boundary de archivos, el flujo "ver día + crear cita + ver invalidación instantánea" se siente sólido y queda en código legible?** Si la respuesta es sí, ya sabés que el rebuild completo del admin es viable en ~2-3 semanas. Si no, perdiste un día, no un mes.

---

## 6. Criterios objetivos para decidir si seguimos con rebuild completo

Firmar antes de empezar. Si alguno falla, parar y revisar — no improvisar.

1. **Boundary de archivos respetado**: ningún `.jsx` del spike > 300 líneas. Ningún `.css` > 200 líneas.
2. **Estado de servidor centralizado**: cero `useState` que guarde payload de API. Cero `refreshTick`. Cero `setTimeout` para postergar fetch.
3. **Invalidación funciona sin recarga**: crear cita refresca tabla del día en < 500 ms percibidos, sin parpadeo de layout.
4. **Tiempo a primer pixel útil en Control**: < 1.5 s en laptop con MariaDB local Docker.
5. **Reproducibilidad**: `docker compose up` desde cero (volumen limpio) deja `/api/health` verde y admin nuevo navegable en < 3 minutos sin pasos manuales.
6. **Lectura por terceros**: alguien que no escribió el spike ubica "dónde se crea una cita" en < 30 segundos navegando archivos.
7. **Conteo de dependencias**: el `package.json` del admin no agrega más de 5 paquetes runtime nuevos (Query, Router, Zod, y poco más).
8. **El backend NO fue tocado** durante el spike. Cero commits a `server/`. Si lo tocaste, falló la disciplina.

**Si 6 de 8 se cumplen, rebuild completo es viable. Si caen 4+, el problema no era el stack** — y entonces sí toca volver a pensar.

---

## 7. Riesgos y antipatrones a evitar

**Riesgos:**

- **Mezclar rebuild con cambio de runtime (Hostinger Web → Docker VPS).** `docs/06_ENGINEERING_GUARDRAILS.md` lo prohíbe explícito. Son dos tracks: el spike usa Docker local, pero el deploy a VPS es otra entrega.
- **"Aprovechar para meter TypeScript".** No. Después.
- **Tentación de tocar `server/services/adminAppointments.service.js` durante el spike** porque "ya que estoy". No. El spike valida frontend.
- **Copiar `main.jsx` viejo y "limpiarlo".** `AGENTS.md` ya lo prohíbe. Limpiar un Frankenstein nunca produce algo sano; produce un Frankenstein peinado.
- **Sobre-invalidar** queries en TanStack (invalidar `['appointments']` global tras cada cambio): el día que haya 500 citas en cache se vuelve lento. Invalidar por clave específica (`['appointments', date]`).
- **Diseño "design system" antes de tener 3 pantallas.** Primero 3 pantallas reales, después extracción de primitivos, no al revés.

**Antipatrones a evitar desde el día 1:**

- Un archivo `App.jsx` o `main.jsx` que tenga lógica de negocio.
- Cualquier `useEffect` que haga `fetch` directo (eso es trabajo de TanStack Query).
- `setRefreshTick`, `forceRender`, `key={Math.random()}` para forzar reload.
- Modales y drawers definidos en el mismo archivo que la ruta que los abre.
- Clases CSS con nombres específicos de un sitio (`.control-toolbar-top-with-filters-v2`).
- "Hotfix UI" sin ticket explícito. Es así como llegamos a 3.813 líneas de CSS.

---

## 8. Qué haría distinto desde el día 1 para que no vuelva el Frankenstein

Cinco reglas duras, escritas en `AGENTS.md`, con consecuencias claras:

1. **Límite de tamaño por archivo, verificado en CI.** Lint check: `find apps -name '*.jsx' -exec wc -l {} \; | awk '$1>300'` debe ser vacío. Si falla, el commit no pasa.
2. **Boundary obligatorio entre estado de servidor y estado de UI.** Todo dato que viene de la API se accede solo vía `features/*/queries.js`. PRs que metan `fetch()` fuera de esa capa, rechazadas.
3. **Una feature = una carpeta.** `features/appointments/` es autocontenida. Si un componente de `appointments` necesita algo de `therapists`, lo importa explícito desde `features/therapists/api.js`. Nada de utilidades globales que se llenan de basura.
4. **CSS sólo con tokens de `docs/brand.md` y el `DESIGN.md` de la app.** Nada de hex sueltos en componentes. Si un componente necesita un color nuevo, primero entra al archivo de tokens.
5. **"Refactor track" separado de "feature track" desde el día 1.** Cuando un service del backend pase de 600 líneas, abre ticket de partición. No se acepta "lo divido la próxima vez". Misma regla que para los `.jsx`.

Y una decisión cultural, no técnica: **el admin no es la primera pantalla que se pinta bonita; es la última que se complica.** La densidad operativa que pide `AGENTS.md` (toolbar compacta, chips, popovers, drawer) solo se sostiene si nadie agrega "una cardita más" por simpatía. Eso requiere que el revisor diga "no" a cambios visuales que parecen inofensivos pero rompen la jerarquía. Es lo más difícil y lo que más impacto tiene a 6 meses.

---

## TL;DR

- **Backend**: salvar y refactorizar dos archivos gordos in-place. ~3-4 días.
- **Admin frontend**: rebuild completo en `apps/admin-next/` con TanStack Query + Router + tokens de `docs/brand.md` / `apps/admin-next/DESIGN.md` + boundary 300 ln/archivo. ~2-3 semanas.
- **Booking público**: rebuild después del admin. ~1 semana.
- **Docker local desde día 1**, pero deploy a VPS es un track aparte y posterior.
- **Spike de 1 día**: SOLO frontend, una vertical (Control + crear cita), contra el backend actual. 6/8 criterios = luz verde para rebuild completo.

La hipótesis original de Codex era correcta. Ajustes: alcance del spike más chico para que quepa en un día, y separar el cambio de runtime (Docker/VPS) del rebuild de UI. Mantenerlos separados o se repite la historia.
