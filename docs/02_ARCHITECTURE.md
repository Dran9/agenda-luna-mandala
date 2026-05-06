# 02 - Architecture

## Stack

```txt
Node.js + Express
MySQL/MariaDB + mysql2
React + Vite
CSS plano con variables
Phosphor Icons
Zod
JWT
node:test
```

## Estructura Esperada

```txt
agenda-luna-mandala/
  server/
    index.js
    db/
      pool.js
      migrate.js
      migrations/
      seed.js
      verify.js
    routes/
      health.route.js
      public.route.js
      admin.route.js
      webhook.route.js
    services/
      availability.service.js
      claims.service.js
      roundRobin.service.js
      appointments.service.js
      appointmentStatus.service.js
      payments.service.js
      errors.js
    adapters/
      messaging/
      ocr/
      telegram/
    utils/
      env.js
      dates.js
      jwt.js
  apps/
    booking/
    admin/
  shared/
  test/
  package.json
```

## Runtime

Un solo proceso Node en Hostinger Web:

- Express sirve API.
- Express sirve build admin en `/admin`.
- Express sirve booking en `/` y `/booking`.
- Jobs internos livianos pueden correr despues, pero no en Fase 0.

## Regla De Runtime

`server/index.js` es sagrado.

Fase 0 debe dejarlo estable. Despues no se toca salvo tarea explicita de runtime.

Arranque esperado:

```js
app.listen(env.PORT, () => {
  console.log(`Agenda Luna Mandala running on port ${env.PORT}`);
});
```

No enlazar a `HOST` salvo que Hostinger lo exija y se pruebe explicitamente.

## Disponibilidad

La disponibilidad se calcula con datos propios:

- `services`
- `therapists`
- `therapist_services`
- `rooms`
- `service_rooms`
- `resource_schedules`
- `resource_blocks`
- `appointments`
- `appointment_resource_claims`

Google Calendar puede ser espejo outbound futuro. Nunca fuente.

## Claims Por Minuto

Cada cita activa crea claims por minuto:

```txt
therapist:{id}:{minute}
room:{id}:{minute}
```

La DB garantiza unicidad con un indice unico:

```sql
UNIQUE(center_id, resource_type, resource_id, claim_time)
```

Si hay conflicto de insert, el slot ya no esta disponible.

## Preparacion Futura VPS

Interfaces que deben existir sin usar Redis/BullMQ:

- `locks.service`
  - v1: MySQL `GET_LOCK` o transaccion/claims.
  - v2: Redis.
- `jobs.service`
  - v1: tabla `scheduled_jobs`.
  - v2: BullMQ.
- `messaging.service`
  - v1: test_outbox/log_only/whatsapp_live.
  - v2: cola.

La migracion a VPS no debe reescribir negocio.

