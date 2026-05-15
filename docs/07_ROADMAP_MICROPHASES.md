# 07 - Roadmap Por Microfases

## Nota Runtime Vigente

Este roadmap historico de producto nacio con Hostinger Web/Node.js. El runtime vigente ahora es VPS Docker, segun `docs/15_VPS_DOCKER_MIGRATION_PLAN.md` y `docs/04_HOSTINGER_DEPLOY_CONTRACT.md`.

Las fases de producto se conservan, pero cualquier trabajo nuevo de runtime/deploy debe seguir las fases D0-D8 del plan VPS Docker.

## Fase D0 - Fuente De Verdad VPS Docker

Objetivo:

Alinear documentos para que no haya contradiccion entre Hostinger Web y VPS Docker antes de tocar runtime.

Entregables:

- `AGENTS.md`, `README.md` y docs base actualizados.
- Contrato 04 convertido a contrato VPS Docker.
- `docs/15_VPS_DOCKER_MIGRATION_PLAN.md` como plan operativo.

Gate:

- Una busqueda de frases legacy no encuentra contratos vigentes contradictorios.

## Fase D1 - Docker Local Base

Objetivo:

Levantar API + DB localmente con Docker Desktop sin cambiar producto.

Entregables:

- `.dockerignore`;
- `Dockerfile`;
- `compose.local.yaml`;
- env example para Docker local;
- comandos documentados.

Gate:

- `docker compose -f compose.local.yaml up -d db api`;
- `/api/health` responde local;
- migracion/seed/verify corren solo contra DB local Docker.

## Fase D2 - Compose Prod-Sim

Objetivo:

Tener topologia local parecida a produccion antes de tocar el VPS.

Entregables:

- `compose.yaml`;
- Caddy reverse proxy;
- healthchecks;
- restart policies;
- volumen DB;
- log rotation.

Gate:

- `docker compose up -d`;
- `/api/health` responde via Caddy;
- DB no queda publica.

## Fase D3-D8 - Infra VPS Endurecida

Resumen:

- D3: Cloudflare Pages para estaticos.
- D4: CI/CD con GHCR y deploy por SHA.
- D5: observabilidad con `pino`, Sentry y UptimeRobot Free.
- D6: backups off-site con restore drill.
- D7: hardening VPS.
- D8: spike Postgres opcional, no antes de Docker/CI/backups.

Ver detalle en `docs/15_VPS_DOCKER_MIGRATION_PLAN.md`.

## Fase 0 - Tuberia Inicial Legacy

Objetivo historico:

Probar que el repo nuevo despliega sin romperse.

Entregables:

- `package.json`;
- Express minimo;
- `/api/health`;
- booking placeholder en `/`;
- admin placeholder en `/admin`;
- Vite build;
- `.env.example`;
- deploy contract cumplido.

Prohibido:

- DB;
- auth;
- admin real;
- booking real;
- disponibilidad.

Gate:

- Runtime local responde `/api/health`.
- `/` y `/admin/` cargan.

## Fase 0.5 - Direccion Visual Base

Objetivo:

Fijar la cara minima premium antes de construir DB y pantallas reales encima.

Entregables:

- tokens CSS base desde `design.md`;
- placeholders de Reserva publica y Admin visualmente dignos;
- logo/brand mark placeholder visible;
- layout mobile de Reserva publica sin sensacion de landing generica;
- shell admin Twilight minimo;
- ninguna funcionalidad falsa.

Prohibido:

- DB;
- auth;
- booking real;
- admin real;
- disponibilidad;
- cambios de runtime/deploy salvo bug directo de Fase 0.

Gate:

- `/` y `/admin/` siguen cargando;
- `/api/health` sigue respondiendo;
- build/test pasan;
- la UI respeta `DESIGN_BRIEF_AGENDA_LUNA.md` y `design.md`;
- no hay overflow evidente en mobile.

## Fase 1 - DB Core

Objetivo:

Crear base nueva y migraciones limpias.

Entregables:

- pool MySQL;
- migrator;
- `schema_migrations`;
- `0001_core.sql`;
- seed minimo;
- `db:verify`.

Gate:

- migracion corre en DB local/prueba;
- verify lee tablas;
- no toca DB vieja.

## Fase 2 - Disponibilidad Y Claims

Objetivo:

Garantizar no doble reserva.

Entregables:

- `claims.service`;
- `availability.service`;
- `roundRobin.service`;
- tests.

Gate:

- no doble terapeuta;
- no doble sala;
- dos citas simultaneas validas con recursos distintos;
- cancelar libera claims.

## Fase 3 - Reserva Publica Real

Objetivo:

Cliente puede reservar, reagendar y cancelar de punta a punta desde `booking-web`, cumpliendo `docs/10_PUBLIC_BOOKING_SPEC.md`.

Entregables:

- catalogo publico;
- tres variantes iniciales: default, single therapist, hybrid explore;
- identificacion por WhatsApp antes de horarios;
- disponibilidad real por terapeuta+sala;
- hold con TTL y expiracion visible;
- confirmacion con idempotencia;
- onboarding para cliente nuevo;
- gestion de cita existente con `managementToken`;
- cancelacion/reagenda con politica 6h/50%;
- soporte WhatsApp `Hablar con alguien`;
- guia WhatsApp via `test_outbox` cuando aplique.

Gate:

- booking mobile usable;
- ninguna hora aparece antes de identificar WhatsApp;
- cita crea claims;
- hold expirado no confirma;
- reagenda fallida conserva cita original;
- operaciones mutables usan idempotency key;
- Control aun puede ser minimo.

## Fase 4 - Admin C0

Objetivo:

Secretaria puede operar.

Entregables:

- Control;
- Clientes;
- Terapeutas;
- Ajustes servicios/salas;
- nueva cita manual;
- detalle de cita;
- cambios de estado seguros.

Gate:

- no botones falsos;
- no conflicto de sala/terapeuta;
- tests/build pasan.

## Fase 5 - Pagos/QR/WhatsApp

Objetivo:

Operar cobro y mensajes base.

Entregables:

- datos pago/QR;
- comprobante;
- revision manual;
- OCR Google Vision;
- WhatsApp webhook/test/live separado.

Gate:

- ningun test envia WhatsApp real;
- OCR dudoso va a revision.

## Fase 6 - Telegram Terapeutas

Objetivo:

Canal interno simple.

Entregables:

- agenda diaria;
- avisos de cambio;
- link terapeuta;
- sin datos clinicos sensibles.

## Fase 7 - Hardening

Objetivo:

Preparar venta/deploy sobre VPS Docker.

Entregables:

- logs;
- rate limits;
- backups/export;
- deploy checklist Docker/VPS;
- QA visual.
