# Instrucciones Para Agentes Codex - Agenda Luna Mandala

## Trabajo Actual

- **Base activa**: `main`.
- **Rama de trabajo actual**: `codex/payment-c0-manual`.
- **Estado**: PR #1 Runtime/Admin stabilization base, PR #2 Admin Next C0 y PR #3 Admin Next Foundation C1 ya estan mergeados en `main`. PR #4 Payment C0 Manual esta abierto como draft en revision sobre `main`.
- **Scope actual**: implementacion draft de Payment C0 Manual segun contrato. La fase actual permite ajustes de review dentro del PR #4, sin ampliar alcance.
- **Edit-zone principal**: contrato Payment C0, backend/admin de pago manual C0, arancel por relacion `therapist_services`, Admin UI de controles manuales y tests relacionados.
- **Read-only salvo autorizacion explicita**: DB remota, runtime/deploy, root `package.json`, root lockfile y archivos sensibles no relacionados con Payment C0 Manual.
- **No negociables actuales**: no WhatsApp/OCR/email bancario/webhooks en C0; no QR live; no liquidacion a terapeutas; no usar precio global de servicio como arancel final de pago; no deploy ni cambios runtime en este PR.

Esta seccion se actualiza cuando cambia la fase activa del proyecto. Si esta desactualizada o no coincide con la rama en la que estas, parar y reportar antes de codificar.

## Fuente De Verdad

Leer siempre:

1. `README.md`
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
    - Booking publico: `apps/booking/DESIGN.md`
12. `docs/06_ENGINEERING_GUARDRAILS.md`
13. `docs/07_ROADMAP_MICROPHASES.md`
14. `docs/08_ACCEPTANCE_GATES.md`
15. `docs/10_PUBLIC_BOOKING_SPEC.md`
16. `docs/15_VPS_DOCKER_MIGRATION_PLAN.md`
17. `docs/19_LOCAL_PRODUCT_CLOSURE_BACKLOG.md`

Si la tarea es arrancar implementacion desde cero, leer tambien:

16. `docs/09_CODEX_START_PROMPT.md`

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

- VPS Docker v1 en Hostinger KVM.
- Desarrollo local con Docker Desktop.
- Express sirve API; puede servir builds estaticos como fallback local/prod-sim.
- Cloudflare Pages puede servir Reserva publica y Admin estaticos en produccion.
- MySQL/MariaDB es la fuente de verdad.
- Claims por minuto evitan doble reserva.
- `docs/brand.md`, `docs/UX_PATTERNS.md` y el `DESIGN.md` de la app son contrato visual/UX activo.
- `docs/archive/design-twilight-v0.md` y `docs/archive/design-brief-twilight-v0.md` son legado Twilight archivado. No consumir para el rebuild.
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
- `Dockerfile`
- `compose*.yaml`
- `ops/`
- `.github/workflows/`
- scripts de deploy/start/build
- migraciones ya aplicadas

Nunca mezclar cambios en esos archivos con features de admin, booking, pagos o UI.

## Git Y Deploy

- Trabajar en commits pequenos.
- No hacer push si el usuario no lo pidio.
- No reescribir historia.
- No usar `git reset --hard`.
- No borrar ramas o archivos no propios.
- Antes de push: `npm test`, `npm run build` y `/api/health` local.
- Si la tarea toca runtime/deploy: validar tambien Docker Compose segun `docs/04_HOSTINGER_DEPLOY_CONTRACT.md`.

## Decision Con Daniel

- Si Daniel pide una direccion concreta de producto, UX, arquitectura o deploy, no reemplazarla por criterio propio sin consultarle antes.
- Si el agente cree que conviene hacer algo distinto, pausar y explicar la recomendacion con claridad antes de implementarla o lanzarla.
- Si una entrega visual/producto no cumple la referencia o contrato pedido, no tratar `npm test` o `npm run build` como suficiente.
- Antes de push o entrega final de UI, incluir evidencia visual cuando aplique: screenshots desktop/mobile o explicar explicitamente por que no se pudieron generar.

## Contrato Visual Y UX Obligatorio

Antes de cualquier tarea de UI, leer (en este orden):

1. `docs/brand.md` - verdad unica de la marca Luna Mandala (paleta, fuentes, voz, logo).
2. El `DESIGN.md` correspondiente a la app que se toca:
   - Booking publico: `apps/booking/DESIGN.md` (Cal estructural + Luna Mandala completa, Outfit + Comfortaa).
   - Admin nuevo: `apps/admin-next/DESIGN.md` (Cal.com verbatim, light mode, Cal Sans + Inter, marca residual).
3. `docs/UX_PATTERNS.md` - patrones de interaccion concretos con ejemplos mal/bien. **Critico para evitar las monstruosidades UX del Franky (admin viejo).**

`docs/archive/design-twilight-v0.md` reemplaza al antiguo `design.md` raiz. `docs/archive/design-brief-twilight-v0.md` conserva el brief visual anterior. Twilight queda archivado como referencia historica y no se usa en el rebuild.

Reglas duras visuales:

- Todo color, radio, espaciado y tipografia debe venir de un token definido en `brand.md` o en el `DESIGN.md` de la app.
- Si se necesita un valor que no existe, primero se agrega al token correspondiente, despues al componente.
- Componentes no inventan colores ni espaciados.
- Comfortaa nunca aparece en admin.
- El morado primary tiene presencia alta en booking, presencia residual en admin (solo CTA primario y focus ring).

Reglas duras UX (resumen de `UX_PATTERNS.md`):

- Forms de crear/editar viven en modal o drawer, **nunca inline en una pagina de lectura**.
- Filtros, busqueda, orden y agrupacion viven en toolbar compacta o popover, **nunca empujan la tabla hacia abajo**.
- Acciones primarias son botones compactos en toolbar, **nunca cards con titulo y descripcion**.
- Una sola accion primaria visible por pantalla.
- No card dentro de card. Nunca.
- No explicar lo obvio en labels, captions, tooltips o banners.
- Antes de inventar un componente nuevo, leer `ui/` existente y reusar.
- Si el patron correcto no esta claro, pausar y proponer 2 opciones a Daniel antes de codificar.

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
