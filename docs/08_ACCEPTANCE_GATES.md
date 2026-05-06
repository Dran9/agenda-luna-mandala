# 08 - Acceptance Gates

## Gate Global

Antes de considerar cualquier fase lista:

```bash
npm test
npm run build
npm start
curl -s http://127.0.0.1:3000/api/health
```

## Gate Runtime

- No se toco `server/index.js` salvo tarea runtime.
- `/api/health` responde local.
- `/api/health` responde Hostinger.
- `/` responde.
- `/admin/` responde.

## Gate DB

- Migraciones versionadas.
- Seed repetible.
- `db:verify` pasa.
- No apunta a DB vieja.
- No hay scripts destructivos sin permiso.

## Gate Disponibilidad

- Servicio inactivo no aparece.
- Terapeuta inactivo no aparece.
- Sala inactiva no aparece.
- Horarios se respetan.
- Claims evitan doble reserva.
- Cancelar/completar/no-show libera claims segun regla.

## Gate Admin

- No hay botones falsos.
- Crear cliente funciona.
- Crear terapeuta funciona.
- Crear servicio funciona.
- Crear sala funciona.
- Nueva cita manual funciona.
- Detalle de cita funciona.
- Estado de cita respeta state machine.

## Gate Reserva Publica

- Mobile first.
- Logo visible.
- Las 3 variantes renderizan y conservan `tenantSlug`.
- `type` funciona como alias de `screenType`.
- Servicio seleccionable.
- Terapeuta recomendado cuando aplica.
- Ningun slot aparece antes de identificar WhatsApp.
- Cliente con cita futura ve `Ya tienes cita` antes de poder reservar otra.
- Hold crea `holdToken`, muestra expiracion y no confirma vencido.
- Confirmacion clara para cliente nuevo y existente.
- Reagendar/cancelar respeta politica 6h/50%.
- `Hablar con alguien` abre WhatsApp siempre.
- Mutaciones usan `idempotencyKey`.
- Guia WhatsApp.

## Gate Visual

- `DESIGN_BRIEF_AGENDA_LUNA.md` fue leido.
- `design.md` fue leido.
- Tokens Twilight aplicados desde el inicio.
- Logo/brand mark visible.
- Sin overflow.
- Sin textos cortados.
- Sin cards dentro de cards.
- Sin una paleta generica beige.
- Sin aspecto de plantilla barata.

## Gate Git

- Commits pequenos.
- Sin mezcla runtime/features.
- Sin archivos basura.
- Sin `.env`.
- Sin push sin revision si la tarea no lo autoriza.

