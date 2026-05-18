# Admin C0 Acceptance

## Estado

- Rama: `Mandala3.0`.
- HEAD: `0280a7b fix(admin-next): avoid refresh label truncation`.
- Relacion con `codex/stabilize-docker-admin`: la rama `codex/stabilize-docker-admin` esta en `4d59632` y es base de `Mandala3.0`; `Mandala3.0` esta 55 commits encima (`git rev-list --left-right --count codex/stabilize-docker-admin...Mandala3.0` = `0 55`).
- `Mandala3.0` sigue siendo rama apilada y NO debe mergearse directo a `main`.

## Commits Relevantes

- `7e542b8 feat(admin-next): add settings therapists and clients surfaces`
- `0e4d999 fix(admin-next): reset create modal errors and split appointment client name`
- `c488282 feat(admin-next): expand client detail read model`
- `e9cf476 fix(admin-next): harden control drawer mutations`
- `a20a915 feat(admin-next): manage therapist services in drawer`
- `2926bcf fix(admin-next): invalidate created appointment date`
- `7c58dda fix(admin-next): polish no-show labels`
- `3dc3053 fix(admin-next): localize client appointment history`
- `80fd640 fix(admin-next): localize client payment status`
- `f782367 fix(admin-next): polish resource settings UI`
- `a452c32 fix(admin-next): polish client and control labels`
- `3b1262e fix(admin-next): polish therapist labels`
- `0280a7b fix(admin-next): avoid refresh label truncation`

## Superficies Cerradas

- Control: superficie operativa cerrada para revisar agenda, estados y acciones principales sin reload manual.
- Nueva cita manual: flujo validado contra backend local, con creacion/normalizacion indirecta de cliente y refresco de la fecha afectada.
- Detalle de cita: drawer de lectura/operacion con datos ampliados y acciones endurecidas.
- Cambio de sala: mutacion validada contra backend local y reflejada en la superficie de Control.
- Cambio de estado: mutacion validada hasta `completed`.
- Ajustes: servicios, salas y compatibilidad cerrados como superficies de administracion C0.
- Terapeutas: lista, crear, editar perfil y asignacion de servicios cerrados para revision.
- Clientes: lista y drawer read-only ampliado cerrados para Admin C0.

## Gates Validados

- `npm --prefix apps/admin-next test`: OK, 182/182.
- `npm --prefix apps/admin-next run build`: OK.
- `npm test`: OK, 372/372.
- `npm run build`: OK.
- `/api/health`: 200 OK segun reporte previo.
- JSX max: 162.
- CSS max: 193.
- forbidden rg: sin matches.
- `git diff --check`: OK.
- diff sensible backend/runtime/deploy/root package: vacio.

## QA Visual

- Rutas revisadas:
  - `/control`
  - `/ajustes`
  - `/terapeutas`
  - `/clientes`
- Screenshot reportado: `/tmp/admin-next-c0-created-therapist.png`.
- Nota: el in-app browser tuvo limitacion de clipboard virtual para inputs; mutaciones se validaron con API local y verificacion visual posterior.

## Claims Y Estado De Cita

- Nueva cita manual validada contra backend local.
- Cambio de sala validado.
- Cambio de estado a `completed` validado.
- Claims liberados al completar: `claimsCount: 0`.

## Caveats

- No existe `POST /api/admin/clients` ni endpoint update cliente.
- Por eso `Clientes` queda read-only en Admin C0.
- Crear cliente queda cubierto indirectamente por `Nueva cita manual`, que crea/normaliza cliente.
- Si se exige boton dedicado `Nuevo cliente`, requiere endpoint/decision de producto.
- Round-robin observado en datos de prueba no es gate de Admin C0; pertenece a booking publico/availability.
- Reagendamiento publico esta documentado como P0 futuro, no implementado aqui.

## Restricciones Respetadas

- Cero cambios en `server/`.
- Cero runtime/deploy.
- Cero root package/root lockfile.
- Cero `.env.example`.
- Cero Docker/compose/ops/workflows.
- Cero DB remota.
- Cero push/PR/deploy.

## Recomendacion De Integracion

- NO mergear `Mandala3.0` directo a `main`.
- Primero aprobar/mergear `codex/stabilize-docker-admin`.
- Luego revisar `Mandala3.0` encima.
- Despues abrir PR o merge de Admin C0 segun decision de Daniel.
