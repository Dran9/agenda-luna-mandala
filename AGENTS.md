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
8. `DESIGN_BRIEF_AGENDA_LUNA.md`
9. `design.md`
10. `docs/06_ENGINEERING_GUARDRAILS.md`
11. `docs/07_ROADMAP_MICROPHASES.md`
12. `docs/08_ACCEPTANCE_GATES.md`
13. `docs/10_PUBLIC_BOOKING_SPEC.md`

Si la tarea es arrancar implementacion desde cero, leer tambien:

14. `docs/09_CODEX_START_PROMPT.md`

## Proyecto Nuevo

Este es un rebuild limpio. No copiar el repo viejo `agendaluna` ni traer commits viejos.

Puedes usar el repo viejo solo como referencia conceptual para:

- claims por minuto;
- disponibilidad terapeuta+sala;
- booking publico / Reserva publica (`booking-web`);
- admin C0;
- errores aprendidos.

No copiar archivos sin una decision explicita.

## Reglas Tecnicas Duras

- Hostinger Web/Node.js v1.
- Express sirve API y builds estaticos.
- MySQL/MariaDB es la fuente de verdad.
- Claims por minuto evitan doble reserva.
- `DESIGN_BRIEF_AGENDA_LUNA.md` y `design.md` son contrato visual activo.
- Redis/BullMQ no existen en v1.
- Google Calendar no decide disponibilidad.
- No tocar runtime/deploy junto con features.
- No ejecutar scripts de escritura contra DB remota sin confirmacion explicita de Daniel.
- Operar siempre en Speed/Standard. Nunca usar FAST.

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

## Decision Con Daniel

- Si Daniel pide una direccion concreta de producto, UX, arquitectura o deploy, no reemplazarla por criterio propio sin consultarle antes.
- Si el agente cree que conviene hacer algo distinto, pausar y explicar la recomendacion con claridad antes de implementarla o lanzarla.
- Si una entrega visual/producto no cumple la referencia o contrato pedido, no tratar `npm test` o `npm run build` como suficiente.
- Antes de push o entrega final de UI, incluir evidencia visual cuando aplique: screenshots desktop/mobile o explicar explicitamente por que no se pudieron generar.

## UI/UX Guardrail Para Admin

Admin es una superficie operativa. Debe sentirse como una herramienta de gestion densa, clara y elegante, no como una landing page ni como una sucesion de cards decorativas.

Antes de tocar UI, especialmente `Control`, tablas, filtros, busquedas, agrupaciones, acciones o modales, el agente debe responder internamente:

1. Esto es contenido principal o control de vista?
2. Debe vivir como bloque permanente, toolbar compacta, menu flotante, drawer o modal?
3. Estoy agregando superficie visual o reduciendo friccion?
4. El cambio corta el flujo de lectura o empuja la tabla/lista principal hacia abajo?
5. Estoy usando el patron mas silencioso posible?
6. Hace falta proponer el plan visual antes de codificar?

Reglas duras para Admin:

- Filtros, agrupacion, orden, busqueda y configuracion de columnas son controles de vista. No deben agregarse como paneles grandes dentro del flujo principal salvo instruccion explicita.
- Preferir toolbar compacta + chips de estado activo + popovers/menus flotantes.
- Las acciones primarias como `Nueva cita` deben vivir como botones compactos en header/toolbar, no como bloques informativos permanentes.
- No insertar secciones que empujen tablas, grids o listas hacia abajo si el objetivo es operar sobre esas tablas, grids o listas.
- Evitar cards que solo contienen un boton, textos explicativos obvios, bloques narrativos para acciones simples y titulos gigantes para controles secundarios.
- Si el patron correcto no esta claro, pausar y proponer 2 opciones visuales antes de tocar codigo.
- Para UI operativa, priorizar densidad legible, bajo ruido visual, jerarquia clara, controles familiares y minimo desplazamiento.

## Calidad

Una tarea no esta lista si:

- rompe `/api/health`;
- deja botones falsos;
- crea citas saltando claims;
- requiere Redis/BullMQ;
- mezcla deploy y feature;
- no tiene tests proporcionales;
- ignora una referencia visual o solicitud explicita de Daniel sin consultarle;
- entrega UI sin QA visual cuando la tarea era de producto/interfaz;
- toca DB remota sin permiso.
