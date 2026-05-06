# 03 - Database Plan

## Decision

Crear una DB nueva. No usar ni migrar la DB del prototipo.

DB sugerida:

```txt
u926460478_lunamandala_v2
```

Usuario sugerido:

```txt
u926460478_lunav2_user
```

La DB anterior queda congelada como referencia.

## Reglas

- Migraciones SQL versionadas desde el dia 1.
- Migraciones idempotentes cuando sea razonable.
- No ejecutar migraciones en DB remota sin confirmacion explicita.
- Tests de integracion usan DB local o DB de prueba aislada.
- Seeds deben ser seguros y repetibles.

## Tablas Core MVP

```txt
centers
center_settings
admin_users
files
services
therapists
therapist_services
rooms
service_rooms
resource_schedules
resource_blocks
clients
appointments
appointment_resource_claims
payments
wa_messages
scheduled_jobs
round_robin_state
telegram_links
audit_logs
idempotency_keys
schema_migrations
```

## Estados De Cita

```txt
pending
confirmed
completed
cancelled
no_show
```

Transiciones iniciales:

```txt
pending   -> confirmed, completed, cancelled, no_show
confirmed -> completed, cancelled, no_show
completed -> terminal
cancelled -> terminal
no_show   -> terminal
```

No reactivar terminales en v1 inicial. Si algun dia se permite, debe recrear claims validos en transaccion.

## Claims Activos

`appointment_resource_claims` contiene solo claims activos.

Al cancelar/no-show/completar, borrar claims de la cita en la misma transaccion.

El historial vive en `audit_logs`.

## Seed Minimo

Seed local debe crear:

- centro Luna Mandala;
- settings basicos;
- admin dev;
- 3 servicios;
- 3 salas;
- 5 terapeutas;
- relacion terapeuta-servicio;
- horarios Lun-Sab 08:00-18:00 para terapeutas y salas;
- clientes demo opcionales.

No crear data excesiva.

## Verificacion DB

Debe existir:

```bash
npm run db:verify
```

Debe validar:

- conexion;
- timezone;
- tablas esperadas;
- usuario DB actual;
- nombre DB actual;
- que no esta apuntando accidentalmente a DB vieja si `APP_ENV` indica v2.

