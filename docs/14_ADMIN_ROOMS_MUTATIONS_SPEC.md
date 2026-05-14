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

## 7. Seed

El seed solo reemplaza features de las 4 salas canonicas. No borra ni modifica features de salas creadas por Admin u otras salas no canonicas.

El seed puede desactivar explicitamente las salas demo antiguas:

- `sala-luna`
- `sala-sol`
- `sala-aurora`
