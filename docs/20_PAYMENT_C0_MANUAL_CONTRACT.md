# Payment C0 Manual Contract

## Estado y alcance

Estado: contrato propuesto, no implementacion.

Fase: Pagos Manuales C0.

Rama base: `main`.

Contexto de base:

- PR #1 Runtime/Admin stabilization base esta mergeado.
- PR #2 Admin Next C0 esta mergeado.
- PR #3 Admin Next Foundation C1 esta mergeado.
- `Mandala3.0` es historica y ya no es rama activa.
- Esta fase solo fija contrato de producto y tecnico. No implementa pagos.

## Decisiones de producto confirmadas

- Todos los servicios son pagos.
- Arancel significa monto cobrado al cliente.
- El arancel depende de terapeuta + servicio.
- El cliente paga al centro Luna Mandala, no directamente al terapeuta.
- El centro luego liquida o paga a terapeutas fuera de C0.
- El pago debe estar hecho antes de la sesion.
- El QR es unico del centro.
- El comprobante llegara por WhatsApp como JPG, PNG o PDF.
- Mas adelante Google Vision leera comprobantes.
- Tambien habra confirmaciones bancarias por email/webhook.
- WhatsApp live, OCR y email bancario no entran en C0 manual.
- Liquidacion mensual a terapeutas no entra en C0.

## Decisiones de Daniel para implementacion C0

Daniel confirma opcion A en las cuatro decisiones bloqueantes:

1. C0 usa un pago activo por cita.
   - Una cita tiene un pago esperado/manual activo.
   - Pagos parciales quedan fuera de C0.
   - Si un pago se rechaza o se anula, se puede registrar otro bajo regla controlada.

2. API/UI usan canon `canceled` para el estado tecnico anulado, con mapping interno explicito si la DB actual usa `cancelled`.
   - En castellano visible al usuario debe decir `Anulado` o `Pago anulado`, no `Cancelado`, para evitar confusion con "cancelar" como pagar.
   - No se requiere migracion de rename solo por este nombre si el mapping interno es suficiente.
   - La compatibilidad debe quedar documentada y cubierta por tests.

3. C0 agrega campos especificos desde el primer corte.
   - Agregar `reference` para referencia manual del pago.
   - Agregar `submitted_at` para fecha/hora en que se registro comprobante o referencia recibida.
   - `notes` queda para observaciones libres, no como lugar principal de referencia.

4. Pago en efectivo puede pasar de `pending` a `approved` solo para `cash`, con nota obligatoria.
   - Refleja operacion real de caja.
   - Evita forzar `submitted` cuando no hay comprobante digital.
   - Debe quedar auditado.

## Separacion de fases

Pagos Manuales C0:

- Registro manual de pago esperado para una cita.
- Captura de snapshot de arancel en el pago.
- Registro manual de referencia, nota o comprobante recibido.
- Revision manual por Admin: aprobar, rechazar o cancelar.
- Exposicion de estado de pago en detalle de cita y ficha de cliente cuando se implemente UI.

QR/WhatsApp C1:

- Mostrar o enviar datos de pago del centro.
- QR unico del centro como dato operativo.
- Mensajes via `test_outbox` primero, sin WhatsApp live.

WhatsApp live / recepcion automatica de comprobantes:

- Integracion real de WhatsApp/API.
- Recepcion automatica de archivos JPG, PNG o PDF.
- Asociacion automatica de comprobantes a pagos/citas cuando exista confianza suficiente.

OCR Google Vision:

- Lectura automatica de comprobantes.
- Extraccion de monto, fecha, banco, referencia y posible match.
- OCR dudoso siempre debe ir a revision manual.

Email bancario / webhook:

- Recepcion de confirmaciones bancarias por email o webhook.
- Conciliacion asistida o automatica en fase posterior.

Liquidacion mensual a terapeutas:

- Calculo de saldos a terapeutas.
- Reportes de liquidacion.
- Pagos internos del centro a terapeutas.
- Esta fase es separada del cobro al cliente.

## Non-goals C0

C0 no incluye:

- OCR.
- WhatsApp live/API.
- Lectura automatica de comprobantes.
- Email bancario/webhook.
- Conciliacion automatica.
- Liquidacion a terapeutas.
- Pago directo al terapeuta.
- Bloqueo dependiente de proveedor externo.
- QR automatico por cita.
- Upload obligatorio de comprobante.
- Cambios en claims mas alla de referencias seguras y lectura de estado asociado.
- Cambios en disponibilidad por fallo o exito de integraciones externas.

## Modelo de arancel

`services.price_amount` no puede ser la verdad final del arancel.

La verdad final del arancel depende de `therapist + service`. El mismo servicio puede tener distinto monto segun terapeuta, y el mismo terapeuta puede tener distintos montos por servicio.

La fuente futura correcta debe vivir en la relacion terapeuta-servicio:

```txt
therapist_services.price_amount
therapist_services.currency_code
```

o nombres equivalentes si la implementacion futura decide una tabla nueva manteniendo el mismo contrato semantico.

`services.price_amount` puede seguir existiendo como fallback historico/default para datos seed o compatibilidad, pero no debe usarse como arancel final cuando exista precio en `therapist_services`.

Al crear un pago, el sistema debe guardar snapshot en:

```txt
payments.amount
payments.currency_code
```

Ese snapshot es obligatorio porque conserva el historial financiero. Si Daniel cambia el arancel futuro de una combinacion terapeuta-servicio, los pagos ya creados no deben cambiar de monto ni moneda.

Regla de derivacion propuesta:

1. Buscar cita por centro y `appointmentId`.
2. Leer `appointment.therapist_id` y `appointment.service_id`.
3. Buscar precio activo en `therapist_services` para ese terapeuta + servicio + centro.
4. Si falta precio en `therapist_services`, C0 debe fallar con error claro. `services.price_amount` no debe usarse como verdad final del arancel.
5. Crear pago con snapshot de amount/currency.

## Modelo de datos propuesto

Este modelo es contrato. No implica migracion en esta fase.

### `therapist_services`

La tabla existe como relacion terapeuta-servicio. Para pagos necesita precio por combinacion:

```txt
center_id
therapist_id
service_id
priority
is_active
price_amount DECIMAL(10,2) NOT NULL
currency_code CHAR(3) NOT NULL DEFAULT 'BOB'
created_at
updated_at
```

Validaciones esperadas:

- `price_amount > 0`.
- `currency_code` ISO 4217 de 3 letras, inicialmente `BOB`.
- La relacion debe estar activa para derivar arancel de una cita nueva.

### `payments`

La tabla actual ya existe con `appointment_id`, `amount`, `currency_code`, `status`, `method`, `proof_file_id`, `reviewed_by_admin_user_id`, `reviewed_at`, `notes`, timestamps e indices basicos. Para C0 manual, el contrato futuro deberia converger a:

```txt
id
center_id
appointment_id
client_id snapshot o referencia derivable
therapist_id snapshot o referencia derivable
service_id snapshot o referencia derivable
amount
currency_code
status
method
reference
notes
proof_file_id opcional
submitted_at
approved_at
rejected_at
canceled_at
reviewed_by_admin_user_id
created_at
updated_at
```

Notas de compatibilidad:

- Si `client_id`, `therapist_id` y `service_id` no se duplican en `payments`, deben poder derivarse de `appointments` de forma estable para lectura. Si se duplican, deben tratarse como snapshot operativo.
- C0 debe agregar `reference` y `submitted_at` desde el primer corte. `notes` queda para observaciones libres.
- La migracion futura debe agregar timestamps de estado (`submitted_at`, `approved_at`, `rejected_at`, `canceled_at`) para no sobrecargar `notes`.
- El schema actual usa `cancelled` en `payments.status`; este contrato usa estado canonico `canceled` en API/UI. La implementacion futura debe resolver la compatibilidad con mapping interno explicito salvo que inspeccion tecnica demuestre que una migracion es mas segura.

### `payment_attachments` o comprobantes

C0 manual no requiere upload obligatorio. Puede registrar solo referencia/nota manual.

Para fases posteriores conviene preparar metadata separada:

```txt
id
center_id
payment_id
file_id
source
mime_type
original_filename
received_at
created_at
```

En C0, si se usa `proof_file_id`, debe ser opcional y no debe bloquear el flujo manual.

### `payment_events` / audit log opcional

Recomendado para trazabilidad futura:

```txt
id
center_id
payment_id
event_type
from_status
to_status
admin_user_id
payload_json
created_at
```

Si no se crea tabla dedicada en C0, al menos debe quedar camino claro para registrar eventos en `audit_logs` cuando se implemente.

## Estados de pago

Estados canonicos de contrato:

```txt
pending
submitted
approved
rejected
canceled
```

Significado:

- `pending`: pago esperado, sin comprobante ni referencia recibida.
- `submitted`: comprobante o referencia recibido, pendiente de revision.
- `approved`: pago aceptado por Admin.
- `rejected`: comprobante/referencia rechazado.
- `canceled`: pago anulado por cancelacion, reemplazo o no aplica. En UI castellana usar `Anulado` o `Pago anulado`.

No agregar `requested` en C0 salvo pedido explicito de Daniel.

Transiciones permitidas:

```txt
pending   -> submitted
pending   -> canceled
pending   -> approved  solo si method = cash y con nota obligatoria
submitted -> approved
submitted -> rejected
rejected  -> submitted
```

Restricciones:

- `approved` no deberia volver atras salvo override futuro explicito con auditoria.
- `canceled` es terminal salvo decision futura.
- `rejected -> submitted` permite reintento cuando el cliente manda nuevo comprobante o nueva referencia.
- `pending -> approved` solo aplica para pago en efectivo (`cash`) con nota obligatoria y auditoria.

## Relacion con citas y claims

Pagos y claims son dominios separados.

- Claims siguen siendo la fuente para evitar doble reserva.
- Pago no debe crear cita saltando claims.
- Pago no debe confirmar disponibilidad.
- Pago no debe borrar, recrear ni modificar claims.
- Fallo de pago manual no debe romper disponibilidad.
- C0 puede exponer estado de pago asociado a cita, pero no rediseña appointment claims.
- No mezclar claims y pagos en la misma transaccion salvo decision tecnica explicita futura.

La cita puede existir y estar confirmada con claims validos aunque el pago este `pending` o `submitted`. La operacion diaria debe poder ver ese riesgo y resolverlo manualmente.

## Regla operativa "pago antes de sesion"

La regla de negocio es: el pago debe estar hecho antes de la sesion.

Interpretacion C0 manual:

- Admin debe poder ver si una cita tiene pago `approved` antes de la hora de inicio.
- Admin puede marcar manualmente `submitted`, `approved`, `rejected` o `canceled`.
- C0 no depende de proveedores externos para bloquear o desbloquear citas.
- C0 no debe bloquear automaticamente toda operacion por fallo de WhatsApp, OCR, email o banco.
- Si se define bloqueo funcional futuro, debe quedar como decision explicita posterior. Ejemplo: alerta visual o filtro de citas proximas sin pago aprobado, no bloqueo duro inicial.

## Endpoints minimos propuestos

Estos endpoints son contrato. No se implementan en esta fase.

### `POST /api/admin/appointments/:appointmentId/payments`

Proposito: crear pago manual esperado para una cita.

Request body esperado:

```json
{
  "method": "transfer",
  "amount": null,
  "currencyCode": null,
  "reference": null,
  "notes": "Pendiente de comprobante WhatsApp"
}
```

Response shape esperada:

```json
{
  "payment": {
    "id": 123,
    "appointmentId": 456,
    "status": "pending",
    "amount": 250,
    "currencyCode": "BOB",
    "method": "transfer",
    "reference": null,
    "notes": "Pendiente de comprobante WhatsApp",
    "createdAt": "2026-05-18T21:00:00.000Z",
    "updatedAt": "2026-05-18T21:00:00.000Z"
  }
}
```

Validaciones:

- Admin autenticado y autorizado para el centro.
- La cita existe y pertenece al centro.
- La cita tiene terapeuta y servicio.
- Existe arancel activo para terapeuta + servicio.
- `amount`/`currencyCode` se derivan por defecto del arancel; override manual solo si se permite con nota obligatoria.
- `method` pertenece a enum permitido: `transfer`, `cash`, `card`, `other`.
- No crear pago activo duplicado. C0 permite un pago activo por cita.

Errores esperados:

- `400`: payload invalido.
- `401`/`403`: admin no autorizado.
- `404`: cita no encontrada.
- `409`: ya existe pago activo para la cita.
- `422`: no se puede derivar arancel terapeuta-servicio.

Efectos secundarios permitidos:

- Insertar `payments` con snapshot amount/currency.
- Registrar evento/auditoria si existe mecanismo.
- Devolver detalle de pago y, opcionalmente, resumen actualizado de cita.

Efectos secundarios prohibidos:

- Crear, confirmar, cancelar o reagendar cita.
- Crear, borrar o modificar claims.
- Enviar WhatsApp live.
- Ejecutar OCR.
- Consultar banco/email/webhook.

### `PATCH /api/admin/payments/:paymentId`

Proposito: editar datos manuales permitidos sin cambiar estado principal.

Request body esperado:

```json
{
  "method": "transfer",
  "reference": "Banco Union 123456",
  "notes": "Comprobante recibido por WhatsApp"
}
```

Response shape esperada:

```json
{
  "payment": {
    "id": 123,
    "status": "pending",
    "amount": 250,
    "currencyCode": "BOB",
    "method": "transfer",
    "reference": "Banco Union 123456",
    "notes": "Comprobante recibido por WhatsApp",
    "updatedAt": "2026-05-18T21:10:00.000Z"
  }
}
```

Validaciones:

- Pago existe y pertenece al centro.
- Solo campos manuales permitidos: `method`, `reference`, `notes`.
- `amount` y `currencyCode` no se editan despues de crear pago salvo override futuro explicito con auditoria.
- No editar pagos `approved` o `canceled` salvo regla futura de override.

Errores esperados:

- `400`: payload invalido.
- `401`/`403`: admin no autorizado.
- `404`: pago no encontrado.
- `409`: pago terminal o no editable.

Efectos secundarios permitidos:

- Actualizar metadata manual.
- Registrar auditoria.

Efectos secundarios prohibidos:

- Cambiar estado.
- Modificar claims/cita.
- Enviar integraciones externas.

### `POST /api/admin/payments/:paymentId/submit`

Proposito: marcar comprobante o referencia como recibido y dejar pago en revision.

Request body esperado:

```json
{
  "reference": "Banco Union 123456",
  "notes": "JPG recibido por WhatsApp",
  "proofFileId": null
}
```

Response shape esperada:

```json
{
  "payment": {
    "id": 123,
    "status": "submitted",
    "submittedAt": "2026-05-18T21:15:00.000Z",
    "reference": "Banco Union 123456",
    "notes": "JPG recibido por WhatsApp"
  }
}
```

Validaciones:

- Pago pertenece al centro.
- Estado actual `pending` o `rejected`.
- Debe existir `reference`, `notes` o `proofFileId`.
- `proofFileId`, si existe, pertenece al mismo centro.

Errores esperados:

- `400`: payload invalido.
- `401`/`403`: admin no autorizado.
- `404`: pago no encontrado.
- `409`: transicion invalida.
- `422`: no hay evidencia manual suficiente.

Efectos secundarios permitidos:

- Cambiar estado a `submitted`.
- Guardar `submitted_at`.
- Guardar referencia/nota/proof opcional.
- Registrar auditoria.

Efectos secundarios prohibidos:

- Aprobar automaticamente.
- Leer comprobante con OCR.
- Enviar WhatsApp live.
- Modificar claims.

### `POST /api/admin/payments/:paymentId/approve`

Proposito: aprobar pago revisado manualmente.

Request body esperado:

```json
{
  "notes": "Monto coincide con comprobante"
}
```

Response shape esperada:

```json
{
  "payment": {
    "id": 123,
    "status": "approved",
    "approvedAt": "2026-05-18T21:20:00.000Z",
    "reviewedByAdminUserId": 7
  }
}
```

Validaciones:

- Pago pertenece al centro.
- Estado actual `submitted`, o `pending` solo cuando `method = cash`.
- Admin autenticado queda como reviewer.
- Aprobar desde `pending` por pago en efectivo requiere nota obligatoria.

Errores esperados:

- `400`: payload invalido.
- `401`/`403`: admin no autorizado.
- `404`: pago no encontrado.
- `409`: transicion invalida.

Efectos secundarios permitidos:

- Cambiar estado a `approved`.
- Guardar `approved_at`, `reviewed_by_admin_user_id` y `reviewed_at`.
- Registrar auditoria.
- Devolver resumen actualizado.

Efectos secundarios prohibidos:

- Modificar cita o claims.
- Completar cita.
- Enviar confirmaciones externas obligatorias.
- Liquidar terapeuta.

### `POST /api/admin/payments/:paymentId/reject`

Proposito: rechazar comprobante o referencia.

Request body esperado:

```json
{
  "reason": "Monto no coincide",
  "notes": "Cliente debe reenviar comprobante correcto"
}
```

Response shape esperada:

```json
{
  "payment": {
    "id": 123,
    "status": "rejected",
    "rejectedAt": "2026-05-18T21:25:00.000Z",
    "reviewedByAdminUserId": 7,
    "notes": "Cliente debe reenviar comprobante correcto"
  }
}
```

Validaciones:

- Pago pertenece al centro.
- Estado actual `submitted`.
- Rechazo requiere nota o motivo.

Errores esperados:

- `400`: payload invalido.
- `401`/`403`: admin no autorizado.
- `404`: pago no encontrado.
- `409`: transicion invalida.
- `422`: falta motivo de rechazo.

Efectos secundarios permitidos:

- Cambiar estado a `rejected`.
- Guardar `rejected_at`, reviewer y nota.
- Registrar auditoria.

Efectos secundarios prohibidos:

- Borrar pago.
- Borrar cita.
- Cancelar cita automaticamente.
- Modificar claims.
- Enviar WhatsApp live.

### `POST /api/admin/payments/:paymentId/cancel`

Proposito: cancelar pago manual cuando ya no aplica o fue reemplazado.

Request body esperado:

```json
{
  "reason": "Cita cancelada antes de pago",
  "notes": "Pago pendiente anulado"
}
```

Response shape esperada:

```json
{
  "payment": {
    "id": 123,
    "status": "canceled",
    "canceledAt": "2026-05-18T21:30:00.000Z"
  }
}
```

Validaciones:

- Pago pertenece al centro.
- Estado actual `pending`, `submitted` o `rejected`.
- Cancelacion requiere nota o motivo.

Errores esperados:

- `400`: payload invalido.
- `401`/`403`: admin no autorizado.
- `404`: pago no encontrado.
- `409`: pago terminal o transicion invalida.
- `422`: falta motivo.

Efectos secundarios permitidos:

- Cambiar estado a `canceled` (`Anulado` en UI castellana).
- Guardar `canceled_at`.
- Registrar auditoria.

Efectos secundarios prohibidos:

- Anular o cancelar cita automaticamente.
- Modificar claims.
- Eliminar pago fisicamente.
- Ejecutar integraciones externas.

## Admin UI futuro, solo contrato

No tocar Admin UI en esta fase.

Cuando Daniel autorice implementacion, Admin C0 deberia permitir:

- Ver estado de pago en detalle de cita.
- Registrar pago manual desde drawer/modal operativo.
- Marcar pago como `submitted`.
- Aprobar o rechazar pago.
- Anular pago si aplica.
- Ver monto y moneda snapshot.
- Ver referencia y notas.
- Ver historial read-only en detalle de cliente.
- Refrescar/invalidate queries sin reload manual.
- Mostrar labels en castellano, no enums crudos.

La UI C0 no debe incluir:

- Botones falsos.
- OCR.
- WhatsApp live.
- Recepcion automatica de comprobantes.
- Email bancario/webhooks.
- Conciliacion automatica.
- Liquidacion a terapeuta.
- Precio global de servicio como arancel editable final.

## Tests esperados para implementacion futura

### Backend

- Crea pago manual con amount snapshot desde `therapist_services`.
- No usa `services.price_amount` como verdad final si existe precio en `therapist_services`.
- Falla si appointment no existe.
- Falla si appointment pertenece a otro centro.
- Falla si cita/terapeuta/servicio no permiten derivar arancel.
- Valida `amount > 0` y `currency_code`.
- Mantiene `currency_code` en creacion, lectura y resumen.
- Valida `method`.
- Crea pago `pending` con snapshot estable.
- No permite pagos duplicados activos por cita si se adopta regla de unico activo.
- Permite pago nuevo si el anterior esta `canceled`, si esa regla queda aprobada.
- Permite `pending -> submitted`.
- Permite `pending -> canceled`.
- Permite `submitted -> approved`.
- Permite `submitted -> rejected`.
- Permite `rejected -> submitted`.
- Rechaza transiciones invalidas.
- Rechazo requiere nota o motivo.
- Cancelacion requiere nota o motivo.
- Permite `pending -> approved` solo con `method = cash` y nota obligatoria.
- `approve` no toca claims.
- `reject` no borra cita.
- `cancel` no toca claims.
- Ninguna mutacion de pago crea cita saltando claims.
- Payload de cita expone `payments` y `paymentsSummary`.
- Payload de cliente expone pagos correctamente.

### Admin Next futuro

- No muestra acciones no implementadas.
- Refleja estados con labels en castellano.
- No muestra enums crudos.
- Muestra monto snapshot y moneda.
- Permite registrar referencia/nota manual sin upload obligatorio.
- Invalida queries sin reload manual despues de mutaciones.
- Mantiene guardrails JSX/CSS.
- QA visual desktop/mobile cuando se toque UI.

## Riesgos y mitigaciones

- Riesgo: construir sobre precio global de servicio.
  Mitigacion: arancel final vive en terapeuta + servicio; `services.price_amount` queda como fallback historico/default.

- Riesgo: mezclar pagos con claims.
  Mitigacion: claims siguen siendo dominio de disponibilidad; pagos no modifican claims.

- Riesgo: meter OCR/WhatsApp/email demasiado temprano.
  Mitigacion: C0 manual no implementa proveedores externos; esas fases quedan separadas.

- Riesgo: confundir cobro al cliente con liquidacion a terapeutas.
  Mitigacion: C0 solo modela cobro al cliente por el centro; liquidacion mensual es fase futura.

- Riesgo: confundir "cancelar" como pagar con "cancelar" como anular.
  Mitigacion: API mantiene `canceled` como estado tecnico; UI castellana debe usar `Anulado` o `Pago anulado`.

- Riesgo: crear una fase pagos demasiado grande.
  Mitigacion: C0 limita alcance a pago manual, estados, endpoints minimos y UI operativa minima futura.

- Riesgo: botones falsos.
  Mitigacion: Admin UI futura solo debe mostrar acciones implementadas y cubiertas por tests/QA.

- Riesgo: historial financiero mutable por cambios de arancel.
  Mitigacion: snapshot obligatorio en `payments.amount` y `payments.currency_code`.

## Preguntas abiertas

### Bloqueantes para implementacion

No quedan preguntas bloqueantes para iniciar implementacion, pendiente solo autorizacion explicita de Daniel.

### No bloqueantes / pueden diferirse

- Diseno exacto de `payment_attachments`.
- Auditoria dedicada en `payment_events` vs reutilizar `audit_logs`.
- Formato de QR del centro y administracion de imagen/metadata.
- Reglas de conciliacion automatica con banco.
- Modelo de liquidacion mensual a terapeutas.

## Implementation Readiness

Estado: listo para implementar cuando Daniel autorice codigo explicitamente.

Decisiones cerradas:

- Un pago activo por cita en C0.
- Pagos parciales fuera de C0.
- API/UI usan canon `canceled`; DB puede mantener `cancelled` con mapping interno explicito.
- UI castellana usa `Anulado` o `Pago anulado`, no `Cancelado`, para el estado tecnico de anular pago.
- C0 agrega `reference` y `submitted_at` desde el primer corte.
- `notes` queda para observaciones libres.
- Pago en efectivo puede aprobarse desde `pending` solo si `method = cash` y hay nota obligatoria.

Orden exacto de implementacion sugerido:

1. PR A - Schema/model contract.
2. PR B - Backend endpoints.
3. PR C - Admin Next UI minima.
4. PR D futuro - QR/WhatsApp C1.

### PR A - Schema/model contract

Objetivo:

- Preparar el modelo minimo para pagos manuales sin UI.

Archivos probables a tocar:

- `server/db/migrations/*` con nueva migracion versionada.
- `server/db/seed.js` si necesita poblar aranceles por terapeuta-servicio.
- Tests backend de schema/modelo existentes o nuevos bajo el arbol de tests del repo.
- Docs solo si aparece una diferencia real frente al contrato.

Cambios esperados:

- Agregar `price_amount` y `currency_code` a `therapist_services`.
- Agregar `reference`, `submitted_at`, `approved_at`, `rejected_at`, `canceled_at` a `payments`.
- Resolver compatibilidad `canceled`/`cancelled` con mapping interno explicito o migracion solo si inspeccion tecnica lo justifica.
- Mantener `payments.amount` y `payments.currency_code` como snapshot obligatorio.
- No tocar Admin UI.

Tests minimos:

- Schema tiene arancel por terapeuta-servicio.
- Seed/test data puede derivar arancel desde `therapist_services`.
- `payments` conserva amount/currency snapshot.
- Mapping `canceled` API/UI vs `cancelled` DB queda cubierto si aplica.

Riesgos:

- Migracion mas grande de lo necesario.
- Usar `services.price_amount` como verdad final por comodidad.
- Cambiar enums sin compatibilidad.

Gates antes de entregar:

- `npm test`.
- `npm run build`.
- `git diff --check`.
- `npm --prefix apps/admin-next run check:guardrails`.
- Diff revisado para confirmar que no toca UI/runtime/deploy.

### PR B - Backend endpoints

Objetivo:

- Implementar endpoints Admin de pagos manuales.

Archivos probables a tocar:

- `server/routes/admin.route.js` o router Admin vigente.
- Nuevo servicio o modulo en `server/services/` para pagos Admin.
- Servicios de citas/clientes solo para exponer payloads de lectura ya existentes.
- Tests backend de endpoints/state machine.

Cambios esperados:

- `POST /api/admin/appointments/:appointmentId/payments`.
- `PATCH /api/admin/payments/:paymentId`.
- `POST /api/admin/payments/:paymentId/submit`.
- `POST /api/admin/payments/:paymentId/approve`.
- `POST /api/admin/payments/:paymentId/reject`.
- `POST /api/admin/payments/:paymentId/cancel`.
- Un pago activo por cita.
- Snapshot amount/currency desde `therapist_services`.
- `pending -> approved` solo para `cash` con nota obligatoria.
- Pagos no modifican claims.

Tests minimos:

- Crea pago manual con snapshot desde `therapist_services`.
- Falla si cita pertenece a otro centro.
- Falla si no se puede derivar arancel.
- Rechaza pago activo duplicado.
- Permite transiciones validas.
- Rechaza transiciones invalidas.
- Rechazo/anulacion requieren nota.
- `approve`, `reject` y `cancel` no tocan claims.
- Payload de cita expone `payments`/`paymentsSummary`.
- Payload de cliente expone pagos correctamente.

Riesgos:

- Mezclar pagos con claims.
- Crear cita saltando claims desde pagos.
- Introducir integraciones externas antes de tiempo.
- No cubrir compatibilidad de `canceled`/`cancelled`.

Gates antes de entregar:

- `npm test`.
- `npm run build`.
- `git diff --check`.
- `npm --prefix apps/admin-next run check:guardrails`.
- `/api/health` local si se levanta API para QA.

### PR C - Admin Next UI minima

Objetivo:

- Dar operacion manual de pagos en Admin sin botones falsos ni integraciones externas.

Archivos probables a tocar:

- `apps/admin-next/src/features/appointments/*`.
- `apps/admin-next/src/features/clients/*` si se ajusta lectura de historial.
- `apps/admin-next/src/ui/*` solo si hace falta reutilizar componente existente.
- Tests de Admin Next cercanos a las features tocadas.
- CSS de Admin Next solo si el patron existente no alcanza.

Cambios esperados:

- Detalle de cita muestra estado de pago, monto snapshot y moneda.
- Registrar pago manual.
- Marcar `submitted`.
- Aprobar/rechazar/anular.
- Labels en castellano: `Pendiente`, `En revision`, `Aprobado`, `Rechazado`, `Anulado`.
- Sin OCR.
- Sin WhatsApp live.
- Sin email/webhooks.
- Sin liquidacion terapeuta.
- Invalidacion de queries sin reload manual.

Tests minimos:

- No muestra acciones no implementadas.
- Refleja estados con labels castellanos.
- No muestra enums crudos.
- Mutaciones invalidan queries.
- Guardrails JSX/CSS siguen verdes.

Riesgos:

- Meter UI demasiado grande.
- Usar "cancelar pago" en textos visibles y confundir con pagar.
- Dejar botones falsos.
- Romper densidad operativa del Admin.

Gates antes de entregar:

- `npm --prefix apps/admin-next test`.
- `npm --prefix apps/admin-next run build`.
- `npm --prefix apps/admin-next run check:guardrails`.
- `npm test`.
- `npm run build`.
- `git diff --check`.
- QA visual desktop/mobile con screenshots o explicacion si no se pudo generar.

### PR D futuro - QR/WhatsApp C1

Objetivo:

- Agregar QR unico del centro y mensajeria por `test_outbox`.

No hacer ahora:

- WhatsApp live.
- OCR.
- Email bancario/webhook.
- Liquidacion mensual.

Riesgos:

- Activar proveedores reales antes de tener flujo manual estable.
- Mezclar C1 con C0.

Gates:

- Ningun test envia WhatsApp real.
- OCR sigue fuera.
- Pagos manuales C0 siguen operativos.

## Prompt para siguiente developer de implementacion

Usar este prompt solo cuando Daniel autorice explicitamente implementar codigo.

```txt
Eres developer en Agenda Luna Mandala.

Objetivo general:
Implementar Pagos Manuales C0 en cortes pequenos, respetando docs/20_PAYMENT_C0_MANUAL_CONTRACT.md.

Base:
- Rama activa: main.
- Admin Next C0 y Foundation C1 ya mergeados.
- Mandala3.0 es historica.
- Pagos C0 es manual.
- No WhatsApp live, no OCR, no email bancario/webhook, no liquidacion terapeutas.
- No usar services.price_amount como verdad final del arancel.
- Arancel final vive en therapist_services por terapeuta + servicio.
- Al crear pago, guardar snapshot en payments.amount y payments.currency_code.
- Pagos no modifican claims.

Decisiones cerradas por Daniel:
- Un pago activo por cita en C0.
- Pagos parciales fuera de C0.
- API/UI usan canon canceled; si DB usa cancelled, mapping interno explicito.
- UI castellana usa Anulado/Pago anulado, no Cancelado, para anular pago.
- Agregar reference y submitted_at desde el primer corte.
- notes queda para observaciones.
- pending -> approved permitido solo para method cash con nota obligatoria.

PR A - Schema/model contract:
- Inspeccionar schema actual.
- Proponer e implementar migracion minima.
- Agregar arancel en therapist_services: price_amount y currency_code.
- Agregar reference/submitted_at/approved_at/rejected_at/canceled_at en payments segun contrato.
- Resolver compat canceled/cancelled con mapping interno o migracion solo si inspeccion lo justifica.
- Tests de modelo: arancel por therapist_services, snapshot amount/currency, compat estado anulado.
- No UI.
- No runtime/deploy.

PR B - Backend endpoints:
- Implementar endpoints minimos de payments:
  POST /api/admin/appointments/:appointmentId/payments
  PATCH /api/admin/payments/:paymentId
  POST /api/admin/payments/:paymentId/submit
  POST /api/admin/payments/:paymentId/approve
  POST /api/admin/payments/:paymentId/reject
  POST /api/admin/payments/:paymentId/cancel
- Implementar state machine.
- Crear pago con snapshot amount/currency desde therapist_services.
- Un pago activo por cita.
- pending -> approved solo para cash con nota obligatoria.
- No claims mutation.
- Tests backend completos.
- No Admin UI.

PR C - Admin Next UI minima:
- Detalle de cita muestra pago.
- Registrar pago manual.
- Submit/approve/reject/anular.
- Labels castellano: Pendiente, En revision, Aprobado, Rechazado, Anulado.
- No botones falsos.
- No OCR/WhatsApp live/email/liquidacion.
- Invalidacion sin reload.
- Tests Admin Next proporcionales.
- QA visual desktop/mobile.

PR D futuro:
- QR/WhatsApp C1.
- No hacer ahora salvo autorizacion explicita posterior.

Antes de cada entrega:
- git diff --check.
- npm --prefix apps/admin-next run check:guardrails.
- Tests/build proporcionales al PR.
- Confirmar archivos sensibles no tocados fuera de scope.
- No commit/push/PR salvo autorizacion explicita.
```
