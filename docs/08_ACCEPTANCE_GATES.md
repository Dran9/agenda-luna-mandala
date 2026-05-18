# 08 - Acceptance Gates

## Gate Global

Antes de considerar cualquier fase lista:

```bash
npm test
npm run build
```

Si la fase toca runtime/deploy, agregar:

```bash
docker compose up -d
curl -fsS http://127.0.0.1/api/health
docker compose ps
```

## Gate Runtime

- No se toco `server/index.js` salvo tarea runtime.
- No se tocaron `Dockerfile`, `compose*.yaml`, `ops/`, `.env.example`, `package.json` o workflows salvo tarea runtime/deploy.
- `/api/health` responde local.
- `/api/health` responde via Docker/Caddy cuando aplica.
- `/api/health` responde en VPS/staging/produccion cuando aplica.
- `/` responde si Express conserva fallback estatico.
- `/admin/` responde si Express conserva fallback estatico.
- Si Cloudflare Pages sirve estaticos, Reserva publica y Admin consumen la API sin CORS abierto a `*`.

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
- Refresh de Control no desmonta pantalla cuando ya hay datos.
- Con scroll avanzado y drawer abierto, refresh no salta al inicio ni cierra contexto.
- Existe boton manual de actualizar y feedback no disruptivo de ultima actualizacion.

## Gate Reserva Publica

- Mobile first.
- Logo visible.
- Las 3 variantes renderizan y conservan `tenantSlug`.
- `type` funciona como alias de `screenType`.
- Servicio seleccionable.
- Terapeuta recomendado cuando aplica.
- Ningun slot aparece antes de identificar WhatsApp.
- Selector pais/zona horaria visible para sesiones online.
- Helper de WhatsApp cuenta digitos segun pais/zona horaria.
- Horarios visibles respetan zona horaria elegida por el cliente.
- Disponibilidad muestra tira corta de fechas antes de calendario extendido.
- Calendario extendido aparece solo bajo demanda y deshabilita dias no disponibles.
- Slots aparecen como botones/tarjetas grandes agrupados por `Manana` y `Tarde`.
- Cliente con cita futura ve `Ya tienes cita` antes de poder reservar otra.
- Hold crea `holdToken`, muestra expiracion y no confirma vencido.
- Con hold activo no se puede cambiar servicio, terapeuta, telefono, pais/zona horaria ni fecha.
- Confirmacion clara para cliente nuevo y existente.
- Reagendar/cancelar respeta politica 6h/50%.
- `Hablar con alguien` abre WhatsApp siempre.
- Mutaciones usan `idempotencyKey`.
- Guia WhatsApp.
- Round-robin publico rota por servicio entre terapeutas disponibles usando `round_robin_state`.
- Preview de disponibilidad y hold real no se contradicen en terapeuta sugerido/asignado.

## Gate Visual

- `docs/brand.md` fue leido.
- `docs/UX_PATTERNS.md` fue leido.
- El `DESIGN.md` de la app tocada fue leido.
- Tokens visuales vigentes aplicados desde el inicio.
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
