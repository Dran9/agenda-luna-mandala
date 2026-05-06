# 07 - Roadmap Por Microfases

## Fase 0 - Tuberia Hostinger

Objetivo:

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

- Hostinger responde `/api/health`.
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

Preparar venta/deploy.

Entregables:

- logs;
- rate limits;
- backups/export;
- deploy checklist;
- QA visual.

