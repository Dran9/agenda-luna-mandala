# Admin Terapeutas v1 - Contrato Producto
## 1. Proposito
Terapeutas v1 es el modulo operativo donde Daniel/admin consulta cobertura real de terapeutas, servicios y horarios base sin editar datos.
No es CRM, no es historial clinico, no es tablero de citas y no es dump tecnico de tablas.
El objetivo es lectura clara para decisiones operativas diarias.

## 2. Alcance v1
Incluye lectura administrativa de terapeutas en Admin C0:
- toolbar con busqueda, filtro de estado, contador y refresh no disruptivo;
- listado en grid de cards (patron Super Agenda v4: `11-equipo.html`);
- estado Activo/Inactivo por terapeuta;
- stats embebidas por card: `Servicios` y `Salas compatibles`;
- tags de servicios (maximo 4 + `+N`);
- resumen corto de horarios en el pie de card;
- drawer lateral desde derecha (560-600px) inspirado en `12-equipo-drawer.html`;
- tabs visibles en drawer: `Perfil` (activa), `Operativa` y `Disponibilidad` (visibles y deshabilitadas con `Proximamente`);
- endpoints existentes read-only:
  - `GET /api/admin/therapists`
  - `GET /api/admin/therapists/:id`

Nota de alcance visual:
- v1 desktop-only. Mobile vive en una pagina separada de quick actions, fuera del scope de este modulo.

## 3. Fuera de alcance v1
- crear/editar/eliminar terapeutas;
- activar/desactivar terapeutas desde UI;
- editar servicios asociados u horarios;
- habilitar tabs Operativa o Disponibilidad;
- cambios en booking publico, Control, Clientes, Salas, Historial, Finanzas o Ajustes;
- metricas avanzadas (peso RR, sesiones del dia, ingresos, scorecards);
- pagos, QR, WhatsApp, Telegram, Google Calendar como autoridad.

## 4. Patron visual y reglas UX
### 4.1 Grid de cards
Cada card de terapeuta renderiza:
- top row: avatar de iniciales (cliente), identidad (`displayName` + sublinea `Terapeuta`, slug opcional como `#slug`) y pill de estado;
- stats row embebida: dos columnas (`Servicios`, `Salas compatibles`);
- tags row: servicios visibles (maximo 4) y chip `+N` cuando aplica;
- foot row: primer resumen de `schedulesByDay` y, si hay mas bloques, `+N mas` + caret.

Reglas:
- card clickeable abre drawer;
- hover con borde/sombra/translateY suave;
- card inactiva con opacidad reducida;
- `displayName` sin cortes a mitad de palabra (`overflow-wrap: normal`, `word-break: normal`).

### 4.2 Drawer de detalle
Estructura obligatoria:
- header sticky con avatar grande, `displayName`, meta (`#slug` si existe + pill de estado), boton cerrar;
- tabs visibles:
  - Perfil: activa;
  - Operativa: deshabilitada (`title="Proximamente"`, `aria-disabled=true`);
  - Disponibilidad: deshabilitada (`title="Proximamente"`, `aria-disabled=true`);
- contenido Perfil en boxes read-only, en orden:
  1. Contacto (`Telefono`, `Telegram` con `-` si falta valor).
  2. Servicios (`nombre` + `{durationMinutes} min · {statusLabel}`).
  3. Horarios base (`daysLabel`, `timeRange`, `{slotMinutes} min · {statusLabel}`).

Reglas:
- sin botones de mutacion;
- sin inputs editables;
- sin scroll horizontal.

## 5. Contrato de datos UI
La UI consume view-model semantico, no filas crudas.

### 5.1 Lista (`therapists[]`)
Campos minimos:
- `id`, `slug`, `displayName`, `fullName`;
- `phone`, `telegramChatId`, `contactSummary`;
- `isActive` (compat), `status`, `statusLabel`;
- `services[]` como `{ id, name }`;
- `servicesCount`;
- `compatibleRoomsCount`;
- `schedules[]` base;
- `schedulesByDay[]` agrupado como `{ timeRange, days, daysLabel, slotMinutes, status, statusLabel }`;
- `acceptsNew` (placeholder estructural v1, constante `true`, no visible en UI).

### 5.2 Detalle (`therapist` + colecciones)
Campos minimos:
- `therapist`: `id`, `slug`, `displayName`, `fullName`, `phone`, `telegramChatId`, `status`, `statusLabel`, `compatibleRoomsCount`, `acceptsNew`;
- `services[]`: `id`, `name`, `durationMinutes`, `relationStatus/statusLabel`;
- `schedules[]`: `weekday/dayLabel`, `timeRange`, `slotMinutes`, `status/statusLabel`.

### 5.3 Reglas de modelado
- `compatibleRoomsCount` cuenta salas distintas activas compatibles con al menos un servicio activo del terapeuta;
- `schedulesByDay` agrupa dias con mismo rango horario y mismo estado;
- no mostrar enums tecnicos ni estados de citas en UI de Terapeutas;
- `acceptsNew` existe como enchufe futuro: hoy sale `true` constante; al activarse funcionalmente, su origen pasa a columna DB o regla derivada sin rediseñar la UI (solo toggle de visibilidad).

## 6. Acceptance Gates
Antes de commit/push del modulo:
- `npm test` verde;
- `npm run build` verde (booking + admin);
- UI read-only sin controles de mutacion en Terapeutas;
- evidencia visual obligatoria:
  - `mockups/terapeutas-v1-desktop-1440.png`
  - `mockups/terapeutas-v1-desktop-1440-drawer.png`
- `mockups/terapeutas-v1-mobile-430.png` eliminado del repo.

Checklist visual minimo:
- grid de cards legible, sin aspecto de tabla tecnica;
- pills de estado correctas (Activo/Inactivo);
- stats embebidas solo `Servicios` y `Salas compatibles`;
- chips de servicios maximo 4 + `+N`;
- resumen de horarios en pie de card;
- drawer con tabs visibles y deshabilitadas donde corresponde;
- sin scroll horizontal y sin palabras partidas.

## 7. Plan posterior
- Fase D1: habilitar mutacion de estado terapeuta con guardas operativas.
- Fase D2: habilitar tab Operativa (reglas por terapeuta).
- Fase E: habilitar tab Disponibilidad (edicion de horarios/bloqueos).
- Fase F: activar `acceptsNew` con origen real (columna o regla derivada) y visibilidad controlada en UI.
