# Agenda Luna Mandala

Rebuild limpio de Agenda Luna para el repo nuevo:

```txt
Dran9/agenda-luna-mandala
```

Este proyecto nace despues del prototipo `agendaluna`. El prototipo sirvio para aprender el producto, validar decisiones y descubrir riesgos. Este repo no debe copiar su codigo a ciegas.

## Decision Central

Agenda Luna Mandala es una app VPS Docker-first para centros terapeuticos pequenos con:

- varios terapeutas;
- varios servicios;
- salas limitadas;
- booking publico mobile-first;
- round-robin simple;
- pagos por comprobante;
- WhatsApp para clientes;
- Telegram para terapeutas;
- admin operativo para secretaria/centro.

No es Super Agenda reducida. No es una app enterprise. No depende de PaaS caro. Usa VPS Hostinger KVM con Docker en v1.

## Nombres De Superficies

Para evitar ambiguedad:

- Reserva publica: la experiencia que usa el cliente/paciente para reservar.
- `booking-web`: nombre tecnico de la app de Reserva publica.
- `public-booking-api`: endpoints publicos de reserva.
- Admin: operacion interna del centro.

No usar "frontend" como nombre de una superficie, porque Admin tambien es frontend.

## Regla De Rebuild

Se mantiene la logica aprendida:

- MySQL/MariaDB como fuente de verdad.
- Claims por minuto para evitar doble reserva de terapeuta/sala.
- Google Calendar solo como espejo opcional futuro.
- VPS Docker como runtime v1.
- Desarrollo local reproducible con Docker Desktop.
- React/Vite + Express + MySQL.
- CSS plano con variables.
- Phosphor Icons.
- Direccion visual activa:
  - marca: `docs/brand.md`;
  - Admin nuevo: `apps/admin-next/DESIGN.md`;
  - Reserva publica: `apps/booking/DESIGN.md`;
  - patrones UX: `docs/UX_PATTERNS.md`.
- Twilight queda archivado en `docs/archive/design-twilight-v0.md` y `docs/archive/design-brief-twilight-v0.md`; no se consume en el rebuild.

Se descarta:

- deuda de commits mezclados;
- runtime tocado junto a features;
- C1 roto del prototipo;
- carpetas o codigo copiado sin revisar;
- cualquier implementacion que no pase gates por microfase.

## Documentos

Leer en este orden:

1. `AGENTS.md`
2. `docs/00_MASTER_SPEC.md`
3. `docs/01_SCOPE_LOCK.md`
4. `docs/02_ARCHITECTURE.md`
5. `docs/03_DATABASE_PLAN.md`
6. `docs/04_HOSTINGER_DEPLOY_CONTRACT.md`
7. `docs/05_UI_UX_BRIEF.md`
8. `docs/REBUILD_ANALYSIS.md`
9. `docs/brand.md`
10. `docs/UX_PATTERNS.md`
11. El `DESIGN.md` de la app que se toca:
   - Admin nuevo: `apps/admin-next/DESIGN.md`
   - Reserva publica: `apps/booking/DESIGN.md`
12. `docs/06_ENGINEERING_GUARDRAILS.md`
13. `docs/07_ROADMAP_MICROPHASES.md`
14. `docs/08_ACCEPTANCE_GATES.md`
15. `docs/10_PUBLIC_BOOKING_SPEC.md`
16. `docs/15_VPS_DOCKER_MIGRATION_PLAN.md`
17. `docs/09_CODEX_START_PROMPT.md`

## Nuevo Repo Y Nueva DB

Repo nuevo:

```txt
git@github.com:Dran9/agenda-luna-mandala.git
```

DB nueva recomendada:

```txt
u926460478_lunamandala_v2
```

La DB anterior queda congelada como referencia. No migrar datos del prototipo a la DB nueva durante el MVP.

## Stack Permitido

- Node.js + Express.
- MySQL/MariaDB con `mysql2`.
- React + Vite.
- CSS plano con variables.
- Phosphor Icons.
- Direccion visual activa: `docs/brand.md` + `docs/UX_PATTERNS.md` + `apps/admin-next/DESIGN.md` / `apps/booking/DESIGN.md`.
- Zod.
- JWT.
- Node test runner.

## Prohibido En V1

- Next.js.
- NestJS.
- Tailwind.
- shadcn.
- Prisma.
- Drizzle.
- Redis.
- BullMQ.
- Socket.IO.
- Google Calendar como fuente de disponibilidad.

## Filosofia De Implementacion

Cada microfase debe:

- tocar pocos archivos;
- no mezclar runtime con features;
- pasar tests;
- pasar build;
- poder desplegarse por Docker Compose;
- tener rollback facil;
- dejar una app operativa, aunque pequena.

La primera meta no es feature richness. La primera meta es una tuberia estable y reproducible:

```txt
Docker levanta DB + API -> /api/health responde -> booking/admin cargan -> deploy Compose OK
```
