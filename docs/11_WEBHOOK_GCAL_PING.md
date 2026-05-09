# 11 - Webhook GCal Ping

## Estado

Documento de decision tecnica para implementar integracion Google Calendar como fuente de senales externas hacia MySQL.

No reemplaza las reglas de disponibilidad actuales. MySQL sigue siendo la fuente de verdad transaccional.

## North Star

```txt
MySQL es la fuente de verdad transaccional.
Las integraciones externas son fuentes de senales que sincronizan bloqueos y eventos operativos hacia MySQL mediante un pipeline idempotente.
```

Google Calendar no decide disponibilidad en vivo. Google Calendar informa cambios. Agenda Luna Mandala normaliza esos cambios y los persiste en MySQL como bloqueos/eventos internos.

Booking y Admin nunca deben consultar Google Calendar para decidir un slot durante la solicitud del usuario. Deben leer MySQL.

## Prueba Ya Validada

Se creo un spike descartable en:

```txt
/Users/dran/Documents/Codex openai/gcal-signal-probe
```

Objetivo del spike:

- listar calendarios visibles desde una cuenta Google central;
- activar `events.watch` sobre un `calendarId`;
- recibir pings en un endpoint HTTPS `google-webhook`;
- crear/listar eventos;
- comprobar si calendarios compartidos disparan pings.

Resultado validado por Daniel:

1. `events.watch` sobre `primary` devuelve `ok: true` con `channelId`, `resourceId`, `resourceUri`, `expiration` y `address`.
2. Crear, mover o borrar eventos en `primary` dispara invocaciones al endpoint `google-webhook` del spike descartable.
3. Crear, mover o borrar eventos en un calendario compartido tambien dispara pings si el watch se crea sobre el `calendarId` real del calendario compartido.
4. No basta con hacer watch sobre `primary` para recibir cambios de todos los calendarios visibles en la UI de Google Calendar.
5. La cuenta central puede listar eventos y calendarios compartidos si tiene permisos suficientes.

Conclusion:

```txt
Cuenta central Luna
-> calendarios compartidos por terapeutas
-> watch individual por calendarId
-> webhook ping
-> sync incremental
-> MySQL blocks
-> Booking/Admin leen MySQL
```

No se necesitan refresh tokens de cada terapeuta si ellos comparten su calendario con la cuenta central de Luna y esa cuenta tiene permisos suficientes.

## Concepto Correcto

Google Calendar `events.watch` no manda el evento completo. Manda una senal: algo cambio en ese calendario.

El webhook debe:

1. recibir el ping;
2. identificar `channelId` / `resourceId`;
3. ubicar el calendario fuente en DB;
4. encolar o marcar sync pendiente;
5. hacer debounce para no sincronizar muchas veces por multiples pings;
6. ejecutar `events.list` con `syncToken`;
7. upsert de eventos externos;
8. crear/actualizar/desactivar bloqueos internos en MySQL;
9. registrar auditoria/telemetria minima;
10. exponer el resultado a Booking/Admin via datos internos.

## Reglas De Producto

### Terapeutas Fijos Luna

Para terapeutas fijos/presenciales de Luna Mandala:

- disponibilidad base vive en Agenda Luna;
- citas confirmadas viven en MySQL;
- claims terapeuta+sala evitan doble reserva;
- Google Calendar puede ser espejo, no fuente principal.

### Terapeutas Externos

Para terapeutas externos:

- su Google Calendar compartido puede alimentar bloqueos en MySQL;
- una cita externa o bloqueo personal en GCal se convierte en `resource_block` interno;
- si el terapeuta atiende fuera de Luna, no consume sala Luna;
- si el terapeuta atiende presencial en Luna, el slot debe cumplir:
  - disponibilidad base Luna;
  - ausencia de bloqueo externo importado;
  - sala compatible disponible;
  - claims libres.

### Salas Luna

Las salas de Luna participan solo cuando el servicio/modalidad requiere espacio fisico Luna.

Un terapeuta externo puede tener servicios:

- `external_location`: no consume sala Luna;
- `luna_onsite`: consume sala Luna y entra al motor de salas/claims;
- futuro: `online`: no consume sala fisica, pero puede requerir reglas de timezone.

## Modelo De Calendarios

El watch es por calendario, no por cuenta completa.

Para cada terapeuta externo con GCal:

```txt
1 terapeuta/calendario compartido = 1 external_calendar_source = 1 watch activo
```

Si un terapeuta tiene varios calendarios relevantes, se registran varios sources.

## Permisos Google Necesarios

Para la prueba y v1 tecnica:

- cuenta central Luna con OAuth;
- Google Calendar API habilitada;
- refresh token de la cuenta central;
- cada terapeuta comparte su calendario con la cuenta central;
- permisos recomendados:
  - para solo leer/bloquear disponibilidad: `See all event details` o equivalente suficiente para leer eventos;
  - para crear eventos desde Agenda en calendario externo: `Make changes to events`.

Nota: para privacidad, no se debe persistir titulo sensible del evento externo salvo que sea necesario y autorizado. Preferir `busy_external` y hash/metadata redacted.

## Variables Futuras

No implementar sin fase explicita. Variables esperadas para modulo Google Calendar futuro:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_WEBHOOK_BASE_URL=https://agenda.example.com
GOOGLE_WEBHOOK_TOKEN=
GCAL_SYNC_DEBOUNCE_SECONDS=10
GCAL_WATCH_RENEWAL_HOURS=12
GCAL_RECONCILE_INTERVAL_MINUTES=30
```

`GOOGLE_WEBHOOK_TOKEN` debe usarse para validar que el ping corresponde a un canal creado por nosotros. Google permite `token` al crear channel; luego llega en headers.

## Tablas Sugeridas

No crear migraciones todavia salvo fase explicita.

### external_calendar_sources

```txt
id
center_id
therapist_id
provider                         -- google_calendar, microsoft, ical futuro
calendar_id
calendar_summary_redacted
sync_mode                        -- busy_import, availability_import, mirror_only
access_role                      -- reader, writer, owner si aplica
watch_channel_id
watch_resource_id
watch_expires_at
sync_token
last_full_sync_at
last_incremental_sync_at
status                           -- active, paused, auth_error, watch_expired
created_at
updated_at
```

### external_calendar_events

```txt
id
source_id
provider
external_event_id
external_etag
status                           -- active, cancelled, ignored
starts_at
ends_at
is_all_day
transparency                     -- opaque, transparent si Google lo envia
visibility                       -- default, private, public
summary_redacted
summary_hash
managed_by_luna                  -- true si fue creado por Agenda Luna como espejo
last_seen_at
created_at
updated_at
UNIQUE(provider, source_id, external_event_id)
```

### external_calendar_notifications

Inbox/debug/idempotencia de pings.

```txt
id
source_id nullable
channel_id
resource_id
resource_state                   -- sync, exists, not_exists, etc.
message_number
received_at
processed_at
status                           -- received, ignored, synced, failed
error_message nullable
UNIQUE(channel_id, message_number)
```

### resource_blocks

Si la tabla actual no tiene soporte de origen externo, agregar campos en una fase DB explicita:

```txt
source_type                      -- manual_admin, google_calendar, telegram, whatsapp, system
source_id nullable               -- external_calendar_events.id u otro origen
external_provider nullable
external_event_id nullable
reason                           -- external_busy, therapist_unavailable, admin_block, etc.
status                           -- active, cancelled
```

Si no conviene alterar `resource_blocks` todavia, se puede crear tabla puente:

```txt
external_event_resource_blocks
external_calendar_event_id
resource_block_id
created_at
```

## Pipeline Idempotente

### Crear watch

```txt
POST /api/admin/integrations/google-calendar/sources/:id/watch
```

Proceso:

1. leer `external_calendar_sources`;
2. llamar Google `events.watch` para `calendar_id`;
3. generar `channel_id` unico;
4. incluir token propio en el watch;
5. guardar `watch_channel_id`, `watch_resource_id`, `watch_expires_at`;
6. hacer sync inicial para obtener `sync_token`.

### Recibir webhook

```txt
POST /api/webhooks/google-calendar
```

Headers relevantes:

```txt
X-Goog-Channel-ID
X-Goog-Resource-ID
X-Goog-Resource-State
X-Goog-Message-Number
X-Goog-Channel-Token
```

Proceso:

1. validar header token si esta disponible;
2. buscar source por `watch_channel_id` y `watch_resource_id`;
3. insertar en `external_calendar_notifications` con unique `(channel_id, message_number)`;
4. si ya existe, responder 200 idempotente;
5. marcar source como `sync_pending` o encolar trabajo;
6. responder rapido 200.

No hacer sync pesado dentro del webhook si puede exceder tiempo o multiplicarse. En Hostinger v1 sin worker real, se puede disparar sync liviano despues de responder solo si es seguro, pero preferir endpoint/job interno.

### Debounce

Google puede mandar multiples pings por un solo cambio. Validado en el spike descartable.

Regla:

```txt
si hay 9 pings en 1 segundo para el mismo source, ejecutar 1 sync incremental despues de 5-15 segundos
```

Sin Redis/BullMQ en v1, alternativas:

- tabla `external_calendar_sync_jobs` con estado `pending/running/done/failed`;
- cron liviano cada minuto que agrupa pendientes;
- endpoint interno protegido que procesa pendientes;
- en Hostinger, evitar dependencias de worker complejo hasta que el runtime este definido.

### Sync incremental

Usar Google `events.list`:

- si hay `sync_token`: pedir cambios incrementales;
- si no hay `sync_token`: hacer sync inicial con ventana acotada;
- guardar `nextSyncToken`;
- si Google devuelve 410, token expirado: limpiar token y hacer full sync acotado.

Pseudo:

```txt
source = load source
params = { calendarId, showDeleted: true, singleEvents: true }
if source.sync_token:
  params.syncToken = source.sync_token
else:
  params.timeMin = now - 30 days
  params.timeMax = now + 180 days

response = calendar.events.list(params)
for event in response.items:
  upsert external_calendar_events
  if event cancelled:
    cancel linked resource_block
  else if event managedByLuna:
    mark ignored/mirror
  else if event blocks time:
    upsert resource_block for therapist
save nextSyncToken
```

## Mapeo A Bloqueos

Evento externo bloquea disponibilidad si:

- `status` no es `cancelled`;
- tiene start/end validos;
- no es `transparent`;
- no fue creado por Agenda Luna como espejo;
- cae dentro de una ventana relevante para reservas futuras.

Crear bloque:

```txt
resource_type = therapist
resource_id = therapist_id
starts_at = event.start
ends_at = event.end
reason = external_busy
source_type = google_calendar
external_event_id = event.id
status = active
```

Si evento se mueve:

- actualizar start/end del bloque asociado;
- recalcular conflictos con citas confirmadas si se superpone.

Si evento se borra/cancela:

- marcar evento externo `cancelled`;
- cancelar/desactivar bloque interno asociado.

## Conflictos

Si un bloqueo externo llega para una franja donde ya hay cita confirmada en MySQL:

No cancelar automaticamente.

Crear caso operativo para Control:

```txt
external_calendar_conflict
therapist_id
appointment_id
external_event_id
starts_at
ends_at
severity = warning/critical
status = open
```

Control debe mostrar: terapeuta bloqueó una hora que ya tenia cita. Acciones futuras:

- mantener cita y contactar terapeuta;
- cambiar terapeuta;
- mover hora;
- cancelar/reagendar;
- ignorar bloqueo externo si fue error.

## Evitar Loops

Cuando Agenda Luna crea/refleja una cita en Google Calendar:

- agregar `extendedProperties.private.managedBy = agenda_luna_mandala`;
- agregar `appointmentId` interno si no expone datos sensibles;
- cuando sync vea ese evento, no crear `external_busy` duplicado;
- asociarlo como espejo si hace falta.

## Polling De Respaldo

Aunque los pings funcionen, mantener reconciliacion lenta.

Motivo:

- watches expiran;
- puede perderse una notificacion;
- puede haber errores temporales de webhook;
- Google no debe ser asumido como canal perfecto.

Regla recomendada:

```txt
webhook ping = velocidad
polling lento = seguro de vida
```

No hacer polling rapido como motor principal.

Sugerencia inicial:

- sync por ping: inmediato/debounced;
- reconcile: cada 30-60 minutos;
- renovar watches antes de expiracion.

## Seguridad Y Privacidad

- No imprimir refresh tokens.
- No imprimir secretos.
- No guardar titulos completos de eventos privados salvo autorizacion.
- Preferir `summary_hash` + `summary_redacted = busy_external`.
- Validar `X-Goog-Channel-Token`.
- Responder 200 rapido a Google.
- Webhook publico no debe revelar estado interno.
- Logs con datos redacted.

## Integracion Con Agenda Luna Mandala

No implementar dentro de runtime actual sin fase explicita.

Cuando se integre:

1. Crear migraciones nuevas en fase DB controlada.
2. Agregar rutas webhook sin tocar `server/index.js` salvo montaje minimo si la fase lo autoriza.
3. Crear servicios separados:

```txt
server/services/externalCalendarSources.service.js
server/services/googleCalendarWatch.service.js
server/services/googleCalendarSync.service.js
server/services/externalCalendarBlocks.service.js
```

4. Booking no cambia su contrato: sigue leyendo disponibilidad desde MySQL.
5. Admin Control debe mostrar conflictos/bloqueos externos en vista Control/Casos.

## Acceptance Gate Futuro

Para aceptar modulo GCal v1:

1. Cuenta central lista calendario compartido.
2. Se crea watch sobre calendario compartido.
3. Crear evento externo dispara webhook.
4. Mover evento externo dispara webhook y actualiza bloqueo.
5. Borrar evento externo desactiva bloqueo.
6. Booking deja de ofrecer slot bloqueado sin consultar GCal en vivo.
7. Evento creado por Agenda y reflejado en GCal no se reimporta como bloqueo externo duplicado.
8. Multiples pings generan un solo sync efectivo por debounce.
9. Sync repetido es idempotente.
10. Token expirado 410 se recupera con full sync acotado.
11. Watch expirado se renueva.
12. No se imprimen secretos ni datos privados.

## Decision Actual

La prueba confirma que la arquitectura es viable.

No mezclar ahora con Admin C0/Control. Primero cerrar Control operativo minimo. Luego calendar bridge debe entrar como fase propia:

```txt
Fase futura: External Calendar Signals / Google Calendar Bridge
```

