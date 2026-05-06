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

## Fase 3 - Booking Publico Real

Objetivo:

Cliente puede reservar de punta a punta.

Entregables:

- catalogo;
- disponibilidad;
- confirmacion;
- pago pendiente;
- guia WhatsApp `test_outbox`;
- manage token basico.

Gate:

- booking mobile usable;
- cita crea claims;
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

