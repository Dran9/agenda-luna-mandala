# 19 - Local Product Closure Backlog

## Objetivo

Cerrar Agenda Luna Mandala localmente con Docker Desktop antes de volver a Cloudflare/VPS.

Runtime diario:

```bash
docker compose -f compose.local.yaml up -d db api
```

URLs:

```txt
Booking: http://localhost:4000/
Admin:   http://localhost:4000/admin/
API:     http://localhost:4000/api/health
```

No usar DB remota para este backlog.

## Estado Verificado El 2026-05-14

Validado en Docker local:

- Login Admin local funciona.
- Booking publico permite:
  - elegir servicio;
  - identificar WhatsApp;
  - ver disponibilidad solo despues de identificar;
  - crear hold;
  - completar onboarding;
  - confirmar cita.
- La cita creada por Booking aparece en Admin Control como proxima cita.
- Claims y confirmacion siguen cubiertos por tests backend.
- `npm test` pasa con 174 tests.
- `npm run build` pasa.
- `/api/health` responde 200.

Fix aplicado durante esta auditoria:

- Admin ya no muestra estados tecnicos en ingles en resumen/casos/clientes.
- Labels visibles: `Pendientes`, `Confirmadas`, `Canceladas`, `Completadas`, `No asistió`.

Limitacion de QA:

- El Browser plugin bloqueo una navegacion interna a Clientes por politica propia. Se continuo la auditoria con API local y revision de codigo.

## Prioridad P0 - Cierre Operativo Admin

Objetivo: que Daniel pueda operar un dia real desde Admin sin tocar DB ni consola.

1. Nueva cita manual
   - Probar flujo completo en UI.
   - Confirmar que crea claims.
   - Confirmar que aparece en Control, Salas y Clientes.
   - Confirmar errores de disponibilidad/telefono como mensajes claros.

2. Detalle de cita
   - Abrir desde tabla.
   - Ver cliente, servicio, terapeuta, sala, claims y pagos.
   - Cambiar estado: confirmar, completar, cancelar, no asistió.
   - Cambiar sala solo cuando corresponde.

3. Borrado y acciones destructivas
   - Revisar `Borrar` en citas/clientes.
   - Mantener confirmacion de doble paso o modal explicito.
   - Evitar que un boton destructivo parezca accion normal.

4. Control diario
   - `Día`, `Timeline`, `Historial`, `Salas`.
   - Refresh no disruptivo.
   - Filtros/busqueda/agrupacion sin empujar demasiado la tabla.

## Prioridad P1 - Clientes

Objetivo: que la ficha de cliente sea util para operar y vender demo.

1. Lista de clientes
   - Revisar tabla desktop y mobile.
   - Confirmar labels de estados y stats en castellano.
   - Confirmar busqueda por nombre/WhatsApp.

2. Drawer/ficha
   - Datos personales.
   - Onboarding.
   - Historial.
   - Proxima cita.
   - Pagos asociados si existen.

3. Mutaciones minimas
   - Crear cliente si todavia no esta expuesto.
   - Editar datos basicos si aplica al MVP.
   - No borrar sin confirmacion fuerte.

## Prioridad P1 - Booking Publico

Objetivo: dejar el flujo cliente mobile listo para demo/comercial.

1. Reserva nueva
   - Mobile 430px.
   - Desktop.
   - Las 3 variantes: default, single therapist, hybrid explore.
   - `type=` como alias de `screenType=`.

2. Cliente existente
   - Si hay cita futura, mostrar `Ya tienes cita`.
   - Bloquear slots hasta `Reservar otra sesion`.
   - Confirmar que cliente con onboarding completo no repite datos.

3. Reagendar/cancelar
   - Entrada desde header.
   - Seleccion de cita.
   - Politica 6h/50%.
   - `Hablar con alguien` siempre abre WhatsApp.

4. Hold UX
   - No permitir cambios ambiguos con hold activo.
   - Expiracion visible.
   - Hold expirado permite empezar de nuevo.

## Prioridad P2 - Ajustes / Recursos

Objetivo: que recursos operativos no sean decorativos.

1. Salas
   - Crear sala.
   - Editar nombre/capacidad/recursos.
   - Activar/desactivar.
   - Confirmar que disponibilidad futura respeta cambios.

2. Servicios
   - Definir si precio/duracion son editables en v1.
   - Si se editan, advertir impacto en citas futuras.

3. Compatibilidades
   - Elegir patron UI: matriz o lista filtrable.
   - Mutar compatibilidad servicio-sala sin tocar citas existentes.

4. Horarios base
   - Definir si se editan por recurso individual o plantilla semanal.

## Prioridad P2 - Pagos

Objetivo: no vender una agenda que no ayuda a cobrar.

1. Crear pago pendiente al confirmar cita si aplica.
2. Registrar comprobante manual.
3. Revisar pago: aprobado/rechazado.
4. Mostrar estados de pago con labels, no enums.
5. OCR queda fuera hasta fase posterior.

## Prioridad P3 - Comunicacion

Objetivo: dejar trazabilidad antes de conectar proveedores reales.

1. Revisar `test_outbox`.
2. Mostrar o inspeccionar mensajes generados por booking/cambios.
3. WhatsApp live despues del Admin estable.
4. Telegram terapeutas despues del Admin estable.

## Orden De Trabajo Recomendado

1. QA + fix de `Nueva cita manual`.
2. QA + fix de detalle/cambio de estado/cambio de sala.
3. QA + fix de Clientes.
4. QA mobile de Booking reserva nueva.
5. QA de cliente existente + reagendar/cancelar.
6. Ajustes mutables: salas primero.
7. Pagos manuales.
8. Comunicacion `test_outbox`.

## Gate Para Considerar La App 90%

- Admin puede operar citas, clientes, salas y pagos basicos.
- Booking mobile puede reservar, reagendar y cancelar.
- Claims siguen impidiendo doble reserva.
- No hay botones visibles sin funcion.
- No hay enums tecnicos visibles al usuario.
- `npm test`, `npm run build`, Docker local y `/api/health` verdes.
- QA visual desktop Admin y mobile Booking con screenshots.
