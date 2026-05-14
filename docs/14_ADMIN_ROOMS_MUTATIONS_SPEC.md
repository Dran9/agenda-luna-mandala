# 14 - Admin Salas C0 Mutations

## 1. Alcance

Admin > Ajustes > Salas permite crear y editar salas con:

- nombre visible;
- capacidad;
- recursos de sala.

No incluye compatibilidades servicio-sala, horarios, borrado fisico ni cambios en booking.

## 2. Salas Canonicas

El seed local mantiene estas salas canonicas:

| Slug | Nombre visible | Recursos |
| --- | --- | --- |
| `sala-fenix` | Sala Fénix | Camilla, Mesa |
| `sala-cristales` | Sala Cristales | Camilla |
| `sala-orion` | Sala Orión | Mesa |
| `sala-lakshmi` | Sala Lakshmi | Mesa |

Los nombres visibles usan acentos. Los slugs quedan ASCII y no se regeneran al editar nombre.

## 3. Recursos

Set cerrado de recursos:

| Key | Label |
| --- | --- |
| `camilla` | Camilla |
| `mesa` | Mesa |

`individual` y `grupal` no pertenecen a Salas C0.

## 4. Datos

La migracion `0003_room_features.sql` crea `room_features`:

- `center_id`
- `room_id`
- `feature_key`
- `created_at`

La clave primaria es `(center_id, room_id, feature_key)`.

La migracion `0004_canonical_rooms.sql` sincroniza las salas canonicas en bases ya existentes:

- inserta o reactiva `sala-fenix`, `sala-cristales`, `sala-orion`, `sala-lakshmi`;
- actualiza nombres visibles y capacidad base;
- desactiva las salas demo `sala-luna`, `sala-sol`, `sala-aurora`;
- reemplaza recursos canonicos en `room_features`;
- conecta las 4 salas canonicas activas con los servicios activos en `service_rooms`;
- crea horarios base de sala en `resource_schedules` de lunes a sabado, 08:00-18:00.

Esta migracion es idempotente y se aplica con `npm run db:migrate`.

## 5. Contrato Backend

`GET /api/admin/resources` incluye en `settings.rooms[]`:

- `features`: objetos `{ key, label }`;
- `featureKeys`: keys normalizadas;
- `featuresLabel`: texto para UI.

`POST /api/admin/resources/rooms` crea sala activa.

Body:

- `name`: obligatorio, no vacio, max 160 caracteres;
- `capacity`: opcional; si falta, es `null` o string vacio, default `1`; si viene invalido, 400;
- `featureKeys`: opcional; solo `camilla` y `mesa`.

`PATCH /api/admin/resources/rooms/:id` edita sala.

Body opcional:

- `name`;
- `capacity`;
- `isActive`;
- `featureKeys`.

La edicion de sala es transaccional. Si falla el reemplazo de recursos, no se debe perder el set anterior.

## 6. Compatibilidades

Los recursos de sala no regeneran `service_rooms`.

Booking y disponibilidad siguen dependiendo de `service_rooms`. Las mutaciones de compatibilidades viven en otro bloque de Ajustes.

Excepcion cerrada: `0004_canonical_rooms.sql` hace una sincronizacion inicial de compatibilidades para que las 4 salas canonicas no queden decorativas despues de la migracion. Las ediciones futuras de compatibilidades no pertenecen a Salas C0; pertenecen al bloque Ajustes > Compatibilidades.

## 7. Seed

El seed solo reemplaza features de las 4 salas canonicas. No borra ni modifica features de salas creadas por Admin u otras salas no canonicas.

El seed puede desactivar explicitamente las salas demo antiguas:

- `sala-luna`
- `sala-sol`
- `sala-aurora`

## 8. Estado Aplicado En Produccion

Fecha local Bolivia: 2026-05-13.

Produccion Luna Mandala:

- URL admin: `https://lightgray-goshawk-699734.hostingersite.com/admin/`
- DB verificada por preflight: `u926460478_lunamandala`
- Migraciones aplicadas en produccion: `0003_room_features.sql`, `0004_canonical_rooms.sql`
- Commit publicado en `main`: `e7289db fix(db): migrate canonical room data`

Lectura directa post-migracion de salas activas:

| Slug | Nombre visible | Recursos |
| --- | --- | --- |
| `sala-cristales` | Sala Cristales | Camilla |
| `sala-fenix` | Sala Fénix | Camilla, Mesa |
| `sala-lakshmi` | Sala Lakshmi | Mesa |
| `sala-orion` | Sala Orión | Mesa |

Observacion operativa:

- Al momento de la migracion existian 15 citas futuras confirmadas en `sala-luna`.
- `sala-luna` quedo inactiva, pero puede seguir apareciendo en el Kanban como columna fallback mientras esas citas existan, para no ocultarlas.
- Reasignar esas citas a salas canonicas es una tarea operativa separada.

## 9. Pendiente Relacionado

No esta hecho:

- mutaciones de servicios;
- mutaciones de compatibilidades servicio-sala;
- mutaciones de horarios base;
- reasignacion masiva o asistida de citas futuras desde salas inactivas a salas canonicas;
- QA final de Nueva cita manual con estas salas en produccion.
