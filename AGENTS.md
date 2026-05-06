# Instrucciones Para Agentes Codex - Agenda Luna Mandala

## Fuente De Verdad

Leer siempre:

1. `README.md`
2. `docs/00_MASTER_SPEC.md`
3. `docs/01_SCOPE_LOCK.md`
4. `docs/02_ARCHITECTURE.md`
5. `docs/03_DATABASE_PLAN.md`
6. `docs/04_HOSTINGER_DEPLOY_CONTRACT.md`
7. `docs/05_UI_UX_BRIEF.md`
8. `docs/06_ENGINEERING_GUARDRAILS.md`
9. `docs/07_ROADMAP_MICROPHASES.md`
10. `docs/08_ACCEPTANCE_GATES.md`

Si la tarea es arrancar implementacion desde cero, leer tambien:

11. `docs/09_CODEX_START_PROMPT.md`

## Proyecto Nuevo

Este es un rebuild limpio. No copiar el repo viejo `agendaluna` ni traer commits viejos.

Puedes usar el repo viejo solo como referencia conceptual para:

- claims por minuto;
- disponibilidad terapeuta+sala;
- booking publico;
- admin C0;
- errores aprendidos.

No copiar archivos sin una decision explicita.

## Reglas Tecnicas Duras

- Hostinger Web/Node.js v1.
- Express sirve API y builds estaticos.
- MySQL/MariaDB es la fuente de verdad.
- Claims por minuto evitan doble reserva.
- Redis/BullMQ no existen en v1.
- Google Calendar no decide disponibilidad.
- No tocar runtime/deploy junto con features.
- No ejecutar scripts de escritura contra DB remota sin confirmacion explicita de Daniel.

## Archivos Sensibles

Estos archivos solo se tocan en tareas cuyo objetivo explicito sea runtime/deploy:

- `package.json`
- `server/index.js`
- `server/utils/env.js`
- `.env.example`
- scripts de deploy/start/build
- migraciones ya aplicadas

Nunca mezclar cambios en esos archivos con features de admin, booking, pagos o UI.

## Git Y Deploy

- Trabajar en commits pequenos.
- No hacer push si el usuario no lo pidio.
- No reescribir historia.
- No usar `git reset --hard`.
- No borrar ramas o archivos no propios.
- Antes de push: `npm test`, `npm run build`, `npm start`, `/api/health`.

## Calidad

Una tarea no esta lista si:

- rompe `/api/health`;
- deja botones falsos;
- crea citas saltando claims;
- requiere Redis/BullMQ;
- mezcla deploy y feature;
- no tiene tests proporcionales;
- toca DB remota sin permiso.

