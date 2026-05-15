# UX Patterns - Agenda Luna Mandala

> Reglas concretas con ejemplos correcto/incorrecto para que Codex/Claude no inventen UX cuando construyen UI.
>
> `docs/brand.md` define la marca (qué colores, qué fuentes).
> `apps/*/DESIGN.md` define el sistema de diseño (tokens, componentes).
> Este documento define **cómo se interactúa** — cuándo se usa modal vs drawer vs toolbar, dónde viven los formularios, qué patrón usar para cada situación.
>
> Aplica principalmente a **Admin** (`apps/admin-next/`). Para booking público, las reglas de Cal verbatim del `apps/booking/DESIGN.md` mandan.
>
> Antes de cualquier tarea de UI, Codex debe leer este archivo además de `AGENTS.md`, `brand.md` y el `DESIGN.md` correspondiente.

---

## Heurística antes de generar cualquier UI

Codex debe responder internamente estas 5 preguntas antes de escribir JSX:

1. ¿Esto es **contenido principal** o **control de vista**? (Los controles de vista NUNCA viven como bloques en el flujo principal — van en toolbar/popover/menú.)
2. ¿Esto es acción **primaria**, **secundaria** o **terciaria**? (Define jerarquía visual y prohibe dos primarias al mismo nivel.)
3. ¿Mi cambio **empuja la tabla / lista / contenido principal hacia abajo**? (Si sí, mal patrón. Repensar.)
4. ¿Estoy **agregando superficie visual** o **reduciendo fricción**? (Preferir siempre reducir.)
5. ¿Esto cabe en un **patrón existente** (modal, drawer, popover, toolbar, chip)? (Antes de inventar, reusar.)

Si la respuesta a 3 es sí: parar. Si la respuesta a 5 es no: proponer 2 opciones a Daniel antes de codificar.

---

## 1. Create / Edit forms NUNCA viven inline en una página de lectura

**Mal:**
En la página de Control, un bloque grande "Crear nueva cita" con todos los campos en medio de la página, empujando la tabla de citas hacia abajo.

**Bien:**
Botón compacto "Nueva cita" en la toolbar superior. Click abre **modal flotante centrado** con los campos. Submit cierra el modal. La tabla se actualiza sola vía invalidación de TanStack Query.

**Regla precisa:**

- **Crear** (entidad nueva, no requiere ver lista al mismo tiempo): **modal centrado**.
- **Editar** record existente, útil ver la lista atrás como contexto: **drawer lateral derecho**.
- **Ajustes** donde TODA la página es el editor de una entidad larga: forma inline OK.

---

## 2. Filtros / búsqueda / orden / agrupación viven en toolbar compacta, no en panel

**Mal:**
Panel desplegable "Filtros" de 200px de alto encima de la tabla, con acordeón, títulos de sección, botón "Aplicar filtros".

**Bien:**
Toolbar compacta de 48-56px con: input de búsqueda, dropdown de fecha, dropdown de estado, dropdown de terapeuta. Filtros que no caben en la toolbar viven en un popover "Más filtros" que se abre flotante.

**Regla:** los controles de vista (filtros, orden, agrupación, columnas) NO pueden empujar la tabla. Si no caben en una sola línea, popover.

---

## 3. Acciones primarias son botones compactos, no cards con título y descripción

**Mal:**
Card grande con título "Crear cita", subtítulo "Programar una nueva cita en la agenda", icono decorativo, y botón al centro.

**Bien:**
Botón "Nueva cita" con icono pequeño a la izquierda, en la toolbar de la página, alineado a la derecha. Sin explicación.

---

## 4. Estado / status de un record: chip pequeño, no badge decorativo

**Mal:**
Sección con label "Estado de la cita:" y al lado un badge gigante verde con icono de check y texto "CONFIRMADA".

**Bien:**
Chip pequeño "Confirmada" en la fila de la tabla. Background sutil del color semántico (chip-success). Sin icono salvo que aporte información que el texto no aporta.

**Regla:** no duplicar el label y el chip ("Status: Confirmada" + chip "Confirmada" = redundante).

---

## 5. Confirmación destructiva: click-to-arm O modal, no ambos

**Mal:**
Botón "Borrar cliente" → modal "¿Estás seguro?" → modal "Confirma una vez más" → toast "Borrando..." → toast "Borrado".

**Bien (Opción A, preferida para acciones en línea):**
Primer click cambia el botón a "¿Confirmar borrar?" con highlight rojo. Segundo click ejecuta. Click fuera cancela.

**Bien (Opción B, preferida para acciones críticas con contexto):**
Modal único con título "Borrar a María González" y dos botones: "Cancelar" (secundario) y "Borrar" (primario destructivo).

---

## 6. Empty states: mensaje corto + acción única

**Mal:**
Hero con ilustración SVG, título "¡Aún no tienes citas!", párrafo de bienvenida explicando qué es la agenda, botón primario "Crear tu primera cita", link secundario "Ver tutorial".

**Bien:**
En la zona donde iría la tabla, mensaje centrado vertical: "Sin citas para esta fecha." Debajo, botón secundario "Nueva cita". Nada más. Sin emoji, sin ilustración, sin tutorial.

---

## 7. Loading: skeleton de la estructura final, no spinner centrado

**Mal:**
Spinner gigante centrado en la página mientras carga la tabla.

**Bien:**
Estructura de la tabla visible con filas grises animadas (skeleton). Header y toolbar siempre presentes. La tabla se rehidrata sin saltos de layout (no CLS).

**Regla:** el layout final aparece desde el primer paint, solo el contenido se rellena. Cero `Cargando...` centrado.

---

## 8. Errores: contextuales (form field) o toast, no página completa

**Mal:**
Una petición falla y aparece "Error 500. Algo salió mal. Por favor recarga la página."

**Bien:**
- Error de validación: inline bajo el campo correspondiente, en rojo, 13px.
- Error de red / servidor: toast pequeño arriba a la derecha con mensaje exacto y botón "Reintentar".
- 401: redirect silencioso a login.
- 409 SLOT_OCCUPIED: mantener el modal abierto con el error visible junto al campo de fecha.

La UI nunca se rompe entera por un error. Lo que falló muestra que falló, lo demás sigue navegable.

---

## 9. Densidad de tablas en admin: filas compactas, no airy

Valores duros para tablas operativas:

- Altura de fila: **40-44px**, nunca 64px.
- Padding horizontal de celda: **12px**.
- Font-size body: **14px**.
- Hover muy sutil (background +2% opacity).
- Selected: borde lateral izquierdo de 2px en color primary, no fondo completo.
- Header sticky.
- Sin border-radius en filas individuales.

---

## 10. No card dentro de card. Nunca.

Una sección dentro de una página es **un nivel** de contenedor. Dentro de esa sección, los items son filas o chips, no mini-cards.

Si parece que necesitas card-en-card, casi siempre la solución es: aplanar y usar separadores (hairline) entre subsecciones.

---

## 11. Un solo CTA primario por pantalla

Si hay dos acciones que parecen igualmente importantes, una es primaria (filled, color primary) y la otra es secundaria (outlined o ghost). Si las dos parecen igual de críticas, una de las dos no debería estar visible al mismo tiempo.

---

## 12. No explicar lo obvio en labels o helpers

**Mal:**
- Label "Nombre del cliente" + caption "Escribe aquí el nombre completo del cliente que va a tomar la cita."
- Botón "Guardar" + tooltip "Guarda los cambios realizados."

**Bien:**
- Label "Nombre del cliente". Placeholder "Ej. María González". Sin caption.
- Botón "Guardar". Sin tooltip.

Reservar helpers para información NO obvia (formato esperado, restricciones, advertencias).

---

## 13. No narrar el estado del sistema en banners

**Mal:**
Banner azul arriba de la página de Control: "Esta página muestra todas las citas del día. Puedes filtrar por terapeuta, sala o estado usando los controles."

**Bien:**
El layout habla por sí solo. Cero banner explicativo. Si un usuario no entiende, es un problema de UX, no de banner.

---

## 14. Modales: centrados, ancho fijo (no full-screen) en desktop

- Ancho típico: 480-560px para forms pequeños, 720px para forms con dos columnas, 960px para tablas embebidas.
- Padding interno: 24px.
- Header con título a la izquierda, botón X a la derecha. Sin subtítulo decorativo.
- Footer con botones alineados a la derecha. Cancelar (secundario) primero, Acción primaria al extremo derecho.
- ESC cierra. Click fuera cierra (a menos que haya cambios sin guardar — entonces confirmar).
- Backdrop con blur sutil o oscurecimiento 40%.
- Animación entrada: 150ms fade + scale 0.98 → 1.

---

## 15. Drawers: laterales derechos, no full-height en desktop

- Ancho típico: 400-480px para detalles, 560px para edición compleja.
- Posición: lateral derecho.
- Header sticky con título + close.
- Contenido scrolleable.
- Footer sticky si hay acciones (Guardar/Cancelar).
- ESC cierra.
- Click fuera cierra (con guardia si hay cambios sin guardar).

---

## 16. Atajos de teclado en admin desde el día 1

- `/` enfoca búsqueda global de la página.
- `Cmd+K` abre command palette si existe.
- `Esc` cierra cualquier modal, drawer o popover.
- `Enter` submit en formularios (a menos que esté en textarea).
- `Tab` orden lógico de navegación.
- En tablas: flechas para mover fila activa, Enter para abrir drawer.

---

## 17. Antes de inventar un componente nuevo, leer `ui/` existente

Si ya hay `<Button>`, `<Input>`, `<Select>`, `<Modal>`, `<Drawer>`, `<Chip>`, NO crear `<MyCustomButton>`. Si necesitas un comportamiento nuevo, agrégalo como prop al componente existente, o como variante.

**Mal:**
`<NewAppointmentButton>` que es internamente un Button con estilos hardcoded.

**Bien:**
`<Button variant="primary" icon={<PlusIcon />}>Nueva cita</Button>`.

---

## 18. Anti-patrones específicos del Franky (admin viejo) — no repetir

Estos son errores concretos que ocurrieron en el admin actual y que Codex debe evitar conscientemente:

- ❌ Toolbar de filtros expandida ocupando 200px arriba de la tabla.
- ❌ "Crear nueva cita" como bloque permanente en medio de la página de Control.
- ❌ Card que solo contiene un botón.
- ❌ Texto narrativo explicando qué es cada sección de Ajustes.
- ❌ Múltiples toasts simultáneos para acciones encadenadas.
- ❌ Modales con subtítulos explicativos ("Aquí puedes crear una cita nueva. Llena los campos requeridos.").
- ❌ Hero titles de 32px+ para controles secundarios.
- ❌ Confirmaciones dobles ("¿Seguro?" → "¿Realmente seguro?").
- ❌ Spinners de página completa.
- ❌ `setRefreshTick`, `forceRender`, recargas manuales.

---

## 19. Cuando dudar: 2 opciones a Daniel antes de codificar

Si el patrón correcto no está claro, NO ELEGIR a ciegas. Parar y proponer a Daniel:

> "Para Crear Cita tengo dos opciones:
>
> A) Modal centrado de 560px con los campos en una columna.
> B) Drawer lateral derecho con los campos y un calendario embebido.
>
> Recomiendo A porque no necesitas ver la lista de citas mientras llenas. ¿Cuál?"

Cinco minutos de pregunta valen más que tres horas de UI que hay que rehacer.

---

## 20. Inspiración visual — sí, copia de UX — no

Cal.com y Linear son referencias **visuales** (paleta, tipografía, espaciado, ergonomía). NO son referencias para reproducir feature-by-feature. Si Cal tiene un "Event Type Builder" complejo, NO trasladar ese patrón a Luna Mandala salvo que Daniel lo pida explícito. Cada producto resuelve sus problemas. El lenguaje visual se hereda; la estructura de pantallas se diseña para Luna.
