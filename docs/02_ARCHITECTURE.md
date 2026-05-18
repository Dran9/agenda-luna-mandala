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
Docker Compose
Caddy
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

Runtime principal v1: VPS Hostinger KVM con Docker Compose.

- Contenedor `api`: Express sirve API.
- Contenedor `db`: MySQL/MariaDB es fuente de verdad.
- Contenedor `caddy`: reverse proxy y terminacion HTTP/HTTPS en VPS.
- Cloudflare queda delante del VPS.
- Cloudflare Pages puede servir Reserva publica y Admin estaticos en produccion.
- Express puede conservar serving estatico en `/`, `/booking` y `/admin` como fallback local/prod-sim durante la transicion.
- Jobs internos livianos pueden correr despues, pero no se introducen Redis/BullMQ en v1.

## Regla De Runtime

`server/index.js`, `server/utils/env.js`, `package.json`, `Dockerfile`, `compose*.yaml`, `.env.example`, `ops/` y workflows de deploy son superficie sensible.

No se tocan salvo tarea explicita de runtime/deploy. Runtime/deploy nunca se mezcla con features de booking, admin, pagos o UI.

Arranque esperado:

```js
app.listen(env.PORT, () => {
  console.log(`Agenda Luna Mandala running on port ${env.PORT}`);
});
```

No enlazar a `HOST` salvo prueba explicita. En Docker, el proceso debe escuchar en `env.PORT` y quedar expuesto por Compose/Caddy.

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

## Extensiones Futuras

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

El runtime VPS Docker no debe reescribir negocio. Redis/BullMQ, workers separados o cambios de DB se evaluan despues, cuando duela.
