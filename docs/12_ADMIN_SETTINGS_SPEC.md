# Admin Ajustes v1 - Contrato Producto
## 1. Proposito
Ajustes v1 es el modulo donde Daniel/admin configura recursos operativos del centro.
No es CRM, no es dashboard tecnico y no es tabla cruda de DB.
Su objetivo es mantener disponibilidad y operacion diaria con lenguaje operativo.
## 2. Alcance v1
Modulos incluidos:
- Servicios.
- Salas.
- Compatibilidades servicio-sala.
- Horarios base de terapeutas.
- Horarios base de salas.
Estado de esta fase:
- Especificacion cerrada.
- Base para implementacion read-only posterior.
## 3. Fuera de alcance v1
- pagos.
- QR.
- WhatsApp.
- Telegram.
- Google Calendar como autoridad.
- branding avanzado.
- reportes.
- CRM.
- estadisticas de sesiones por cliente.
- eliminacion destructiva de recursos.
## 4. Modelo de producto por modulo
### 4.1 Servicios
Campos visibles:
- nombre.
- duracion.
- precio.
- estado Activo/Inactivo.
- cantidad de salas compatibles (si esta disponible).
Modo inicial:
- read-only.
Mutaciones futuras minimas:
- activar/desactivar.
- editar duracion.
- editar precio.
Reglas:
- no borrar servicios.
- no cambiar duracion si rompe citas futuras sin advertencia.
- no mostrar enums tecnicos.
### 4.2 Salas
Campos visibles:
- nombre.
- capacidad.
- estado Activo/Inactivo.
- cantidad de servicios compatibles (si esta disponible).
Modo inicial:
- read-only.
Mutaciones futuras minimas:
- activar/desactivar.
- editar capacidad.
Reglas:
- no borrar salas.
- desactivar sala no modifica citas existentes.
- disponibilidad futura respeta estado activo/inactivo.
### 4.3 Compatibilidades servicio-sala
Campos visibles:
- servicio.
- sala.
- estado Activo/Inactivo.
Modo inicial:
- read-only.
Mutacion futura:
- activar/desactivar compatibilidad.
Reglas:
- afecta disponibilidad futura.
- no cambia citas ya creadas.
- no salta claims.
### 4.4 Horarios base
Campos visibles:
- recurso.
- tipo de recurso: terapeuta o sala.
- dias.
- rango horario.
- slot minutes.
- vigencia (si existe).
- estado Activo/Inactivo.
Modo inicial:
- read-only.
Mutaciones futuras:
- crear bloque semanal.
- editar bloque.
- activar/desactivar bloque.
Reglas:
- afecta disponibilidad futura.
- no modifica citas existentes.
- claims siguen siendo autoridad de ocupacion real.
## 5. Arquitectura UX de Ajustes
Estructura fija:
- header compacto.
- navegacion local: Servicios, Salas, Compatibilidades, Horarios.
- toolbar por modulo con: busqueda, filtro Activo/Inactivo/Todos, contador, refresh.
- tabla densa legible.
- empty state.
- error state.
- loading state.
- stale state cuando hay cache y falla refresh.
Comportamiento:
- refresh no disruptivo.
- si ya hay datos, no desmontar vista durante recarga.
- preservar busqueda, filtros y seccion activa.
## 6. Reglas visuales
- No tablas crudas tipo DB dump.
- No palabras partidas.
- No columnas tecnicas.
- No estados como "Confirmada" para recursos.
- Usar "Activo/Inactivo".
- Usar chips compactos.
- Scroll horizontal permitido si esta bien contenido.
- Desktop prioriza tabla densa.
- Mobile puede usar cards compactas.
- No cards dentro de cards.
- No hero ni styling de landing.
## 7. Contrato de datos UI
La UI no debe consumir filas crudas directamente.
Debe consumir view-model semantico:
- `settings.services[]`
- `settings.rooms[]`
- `settings.compatibilities[]`
- `settings.schedules[]`
Reglas de DTO/view-model:
- labels listos para render (sin mapping tecnico en componente).
- estado normalizado (`ACTIVE|INACTIVE`) con `statusLabel` (`Activo|Inactivo`).
- orden semantico estable para lectura operativa.
- fechas/horas preformateables para tabla y mobile.
Campos minimos sugeridos por item:
- services: `id`, `name`, `durationLabel`, `priceLabel`, `status`, `statusLabel`, `compatibleRoomsCount`.
- rooms: `id`, `name`, `capacityLabel`, `status`, `statusLabel`, `compatibleServicesCount`.
- compatibilities: `id`, `serviceLabel`, `roomLabel`, `status`, `statusLabel`.
- schedules: `id`, `resourceLabel`, `resourceType`, `resourceTypeLabel`, `daysLabel`, `timeRangeLabel`, `slotMinutes`, `validityLabel`, `status`, `statusLabel`.
## 8. Acceptance Gates
Antes de push de cualquier implementacion de Ajustes:
- `npm test`.
- `npm run build`.
- `npm start`.
- `/api/health` OK.
Evidencia visual obligatoria:
- screenshot desktop de Ajustes.
- screenshot mobile de Ajustes.
Checklist visual obligatorio:
- sin palabras partidas.
- sin columnas cortadas sin scroll.
- estados correctos Activo/Inactivo.
- horarios legibles.
- no botones falsos.
- no dump DB.
- no enums tecnicos visibles.
## 9. Plan de implementacion posterior
- Fase B: endpoint/view-model read-only de Ajustes.
- Fase C: UI read-only digna.
- Fase D: mutaciones minimas servicios/salas/compatibilidades.
- Fase E: horarios administrativos.
- Fase F: QA cruzada con booking y nueva cita manual.
## 10. Decisiones pendientes para Daniel
1. Precio editable en v1 o solo visible?
2. Duracion editable en v1 o con advertencia obligatoria por citas futuras?
3. Desactivar terapeutas se hace en Terapeutas, en Ajustes o en ambos con regla unica?
4. Horarios se editan por recurso individual o por plantilla semanal?
5. Compatibilidades se editan como matriz o como lista filtrable?
