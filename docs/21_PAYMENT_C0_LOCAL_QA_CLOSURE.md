# Payment C0 Local QA Closure

## 1. Estado

- PR #4 Payment C0 Manual esta mergeado en `main`.
- Merge commit: `ad4b15e570d4fbdc73bfa6b1c282eea7d7389793`.
- PR metadata verificada: `MERGED`, base `main`, head `codex/payment-c0-manual`, merged at `2026-05-19T12:14:17Z`.
- Fecha de cierre QA local: `2026-05-19`.
- Entorno usado: checkout local en `main`, Docker local vivo.
- API local: `http://127.0.0.1:4000`.
- DB local Docker: host port `3307`, contenedor MariaDB `11.4.10`, DB `lunamandala_v2_docker`.
- Docker local quedo vivo; no se apago ningun servicio.
- No se toco DB remota. La `.env` local contiene `DB_HOST=212.85.3.28`, pero `compose.local.yaml` inyecta `DB_HOST=db`, `DB_PORT=3306`, `DB_NAME=lunamandala_v2_docker`, `NODE_ENV=development`, `APP_ENV=lunamandala_docker`; `server/utils/env.js` no sobreescribe variables ya definidas por Compose.

## 2. Scope validado

- Payment C0 Manual mergeado en `main`.
- Endpoints admin de pagos manuales:
  - `POST /api/admin/appointments/:appointmentId/payments`
  - `PATCH /api/admin/payments/:paymentId`
  - `POST /api/admin/payments/:paymentId/submit`
  - `POST /api/admin/payments/:paymentId/approve`
  - `POST /api/admin/payments/:paymentId/reject`
  - `POST /api/admin/payments/:paymentId/cancel`
- Schema/migracion local disponible para Payment C0 (`0006_payment_c0_manual_schema.sql`) y tests de migracion.
- Arancel por relacion `therapist_services`, con snapshot en `payments.amount` y `payments.currency_code`.
- Admin Next: seccion Pagos en drawer de cita, estados en castellano y controles manuales C0.
- Tests automatizados root y Admin Next.

## 3. Validaciones automaticas

| Comando | Resultado | Notas |
|---|---:|---|
| `git fetch origin --prune` | PASS | Sin errores. |
| `git switch main` | PASS | Ya estaba en `main`. |
| `git pull --ff-only` | PASS | Already up to date. |
| `git status -sb` | PASS | Sin cambios tracked pendientes antes de docs. Untracked preexistentes: `.claude/`, `docs/architecture-workflows.html`, `mocks-*`, `mockups/*`. |
| `git log --oneline -8` | PASS | `ad4b15e Merge pull request #4 from Dran9/codex/payment-c0-manual` aparece como HEAD. |
| `gh pr view 4 --repo Dran9/agenda-luna-mandala --json state,mergedAt,mergeCommit,headRefName,baseRefName,url` | PASS | `state=MERGED`, `mergeCommit=ad4b15e570d4fbdc73bfa6b1c282eea7d7389793`. |
| `docker compose -f compose.local.yaml ps` | PASS | `api` healthy en `4000`, `db` healthy en `3307`. |
| `curl -fsS http://127.0.0.1:4000/api/health` | PASS | `{"status":"ok","service":"agenda-luna-mandala","phase":"fase-0",...}`. |
| `git diff --check` | PASS | Sin whitespace errors. |
| `npm test` | PASS | 396 tests, 396 pass. |
| `npm run build` | PASS | Build booking + admin legacy OK. Vite reporto warning CJS deprecated no bloqueante. |
| `npm --prefix apps/admin-next test` | PASS | 190 tests, 190 pass. |
| `npm --prefix apps/admin-next run build` | PASS | Build Admin Next OK. |
| `npm --prefix apps/admin-next run check:guardrails` | PASS | Max JSX 257 (`PaymentSection.jsx`), max CSS 193 (`table.css`). |

## 4. Smoke API

`/api/health` respondio OK contra la API local Docker.

Smoke funcional local ejecutado contra API `127.0.0.1:4000` y DB local Docker `127.0.0.1:3307`, con datos QA descartables creados por Admin API el `2026-05-19`.

Fixture usado:

- Servicio `Carta Astral` (`service_id=8`).
- Terapeuta `Orion Inti` (`therapist_id=12`).
- Sala `Sala Fenix` (`room_id=1`).
- `services.price_amount = 0.00`.
- `therapist_services.price_amount = 250.00`, `currency_code = BOB`.

Resultados:

| Caso | Resultado | Evidencia |
|---|---:|---|
| Crear pago manual | PASS | `pending`, `amount=250`, `currencyCode=BOB`; snapshot viene de `therapist_services`, no de `services.price_amount=0`. |
| Crear pago con `amount/currencyCode` override | PASS | Rechazado `400 VALIDATION_ERROR`, `amount no editable en C0`. |
| `PATCH` method/reference/notes | PASS | Actualiza `method`, `reference`, `notes`. |
| `PATCH` con `amount/currencyCode` override | PASS | Rechazado `400 VALIDATION_ERROR`. |
| Submit sin evidencia | PASS | Rechazado `422 PAYMENT_EVIDENCE_REQUIRED`. |
| Submit con referencia/nota | PASS | `pending -> submitted`, guarda `submittedAt`. |
| Approve submitted | PASS | `submitted -> approved`, guarda `approvedAt`, `reviewedAt`, `reviewedByAdminUserId=1`. |
| Reject sin motivo/nota | PASS | Rechazado `422 PAYMENT_REVIEW_NOTE_REQUIRED`. |
| Reject submitted | PASS | `submitted -> rejected`, guarda `rejectedAt` y reviewer. |
| Reintento | PASS | `rejected -> submitted`. |
| Cash sin nota | PASS | `pending cash -> approved` falla con `409 PAYMENT_INVALID_TRANSITION`. |
| Cash con nota | PASS | `pending cash -> approved`, guarda timestamps de aprobacion. |
| Cancel pending | PASS | API devuelve `canceled`; DB guarda `cancelled`. |
| Cancel submitted | PASS | API devuelve `canceled`. |
| Cancel rejected | PASS | API devuelve `canceled`. |
| Duplicado activo | PASS | Segundo pago activo para misma cita falla con `409 PAYMENT_ACTIVE_EXISTS`. |
| Claims | PASS | Hash/count de claims de la cita no cambio despues de mutaciones de pago (`count=120`, mismo SHA2 antes/despues). |

Limitaciones del smoke API:

- No se probo `proofFileId` con archivo real; C0 manual no exige upload obligatorio.
- Los datos QA quedaron en la DB local Docker como evidencia descartable.

## 5. QA visual

Admin Next se levanto con:

```bash
npm --prefix apps/admin-next run dev
```

URL usada:

```txt
http://127.0.0.1:5174/control
```

El Vite dev server de Admin Next proxyfue `/api` a `http://127.0.0.1:4000`, por lo que uso la API local Docker.

Superficies revisadas:

- `/control`.
- Tabla de citas.
- Drawer de cita.
- Seccion `Pagos`.
- Desktop `1440x900`.
- Mobile `390x844`.

Resultados visuales:

| Check | Resultado | Notas |
|---|---:|---|
| Seccion Pagos visible y compacta | PASS | Drawer muestra `Pagos`, `Manual C0`, monto, referencia y chip de estado. |
| `Pendiente` | PASS | Pago pending muestra `Pendiente` y acciones `Marcar recibido` / `Anular pago`. |
| `En revision` | PASS | Pago submitted muestra `En revision`, `Aprobar`, `Rechazar`, `Anular`. |
| `Aprobado` | PASS | Pago approved queda sin controles de pago visibles. |
| `Rechazado` | PASS | Pago rejected muestra `Marcar recibido`, no `Registrar pago`. |
| `Anulado` | PASS | Pago canceled muestra `Anulado` y permite registrar un nuevo pago. Daniel confirmo este comportamiento como esperado despues del QA local. |
| Sin OCR visible | PASS | No hay texto/control OCR. |
| Sin WhatsApp live visible | PASS | No hay WhatsApp live. |
| Sin email/webhook bancario visible | PASS | No hay controles email/webhook. |
| Sin liquidacion terapeutas visible | PASS | No hay controles de liquidacion. |
| Consola browser | PASS | Sin errores/warnings relevantes durante QA. |
| Mobile overflow | PASS | En `390x844`, `documentElement.scrollWidth=390`, `body.scrollWidth=390`, sin overflow horizontal. |

Screenshots:

- `/tmp/payment-c0-admin-desktop-approved.png`
- `/tmp/payment-c0-admin-desktop-rejected.png`
- `/tmp/payment-c0-admin-mobile-rejected.png`

## 6. Claims/disponibilidad

Pagos C0 no modificaron claims de la cita validada.

Evidencia:

- Antes de mutaciones de pago: `count=120`, hash `3b14e705d902c15a9ddfa408556ed6176f0782a446764965501aed85bd2f7336`.
- Despues de create/patch/submit/approve: `count=120`, mismo hash.
- Tests automatizados tambien cubren `approveAdminPayment allows cash pending approval only with note and does not touch claims`, `approve`, `reject` y `cancel` sin tocar claims.

## 7. Riesgos residuales

- Producto: Daniel confirmo despues del QA local que una cita cuyo ultimo pago esta `Anulado` puede mostrar formulario `Registrar pago` para registrar un nuevo pago. No queda como riesgo visual pendiente.
- No se ejecuto deploy ni migracion productiva; eso queda para fase separada.
- No se valido `proofFileId` con archivo real porque C0 manual no exige upload.
- La `.env` local contiene target remoto; el Docker local fue verificado como seguro por variables efectivas de Compose, pero cualquier comando fuera de Compose debe revisar env antes de escribir.

## 8. Conclusion

Local QA Closure: **PASS**.

Recomendacion siguiente:

1. Preparar deploy en fase separada, con autorizacion explicita y sin tocar produccion desde esta fase.
2. Mantener `Anulado -> registrar nuevo pago` como comportamiento esperado de C0.
3. Ejecutar preflight productivo completo antes de cualquier migracion o deploy.
