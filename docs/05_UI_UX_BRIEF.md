# 05 - UI/UX Brief

## Fuente Visual Activa

- `docs/brand.md`: marca Luna Mandala, paleta, fuentes, voz y logo.
- `apps/admin-next/DESIGN.md`: sistema visual del Admin nuevo, Cal.com verbatim, light mode, Cal Sans + Inter.
- `apps/booking/DESIGN.md`: sistema visual de Reserva publica, Cal estructural + Luna Mandala completa, Outfit + Comfortaa.
- `docs/UX_PATTERNS.md`: patrones de interaccion concretos.

Este archivo resume gates historicos de UX. No reemplaza los documentos anteriores.

`docs/archive/design-twilight-v0.md` y `docs/archive/design-brief-twilight-v0.md` conservan el antiguo lenguaje Twilight. Son referencia historica y no se consumen en el rebuild.

## Lenguaje Visual

Base vigente:

- Admin nuevo: Cal.com operativo, sobrio, denso y en light mode.
- Reserva publica: Cal estructural con expresion completa de marca Luna Mandala.

Sensacion:

- calma;
- premium;
- operativo;
- boutique;
- no plantilla;
- no Microsoft amateur;
- no estetica espiritual beige generica.

## Reglas Visuales

- CSS plano con variables.
- Phosphor Icons.
- Sin Tailwind.
- Sin shadcn.
- Webfonts autorizadas segun app:
  - Admin nuevo: Cal Sans + Inter.
  - Reserva publica: Outfit + Comfortaa.
- Logo/brand mark visible desde el dia 1.
- Admin nuevo: light mode por defecto en v1.
- No cards dentro de cards.
- No botones falsos.
- No texto que se corte.

## Reserva Publica (`booking-web`)

Mobile-first. No es landing page; es una herramienta de reserva hermosa, clara y rapida.

Debe soportar tres variantes desde el inicio de la fase de booking real:

- `Booking default`: servicio primero, terapeuta opcional despues.
- `Single therapist`: flujo optimizado para centro/persona con pocos servicios.
- `Hybrid explore`: explorar por enfoque, terapeuta u orientacion guiada.

Primera pantalla:

- logo;
- nombre del centro;
- servicios destacados;
- opcion "Elegir terapeuta";
- boton "Buscar guia" hacia WhatsApp;
- acceso discreto a gestionar cita.

Reglas de UX duras:

- ningun horario aparece antes de identificar WhatsApp;
- si el cliente ya tiene cita futura, primero se muestra `Ya tienes cita`;
- holds deben mostrar expiracion;
- mientras hay hold activo, no se puede cambiar servicio, terapeuta, telefono, pais/zona horaria ni fecha;
- sesiones online deben tener selector visual de pais/zona horaria con bandera, pais, hora local y busqueda;
- el helper de WhatsApp debe contar digitos segun pais/zona horaria;
- la disponibilidad debe mostrar primero una tira corta de fechas cercanas y un calendario extendido solo bajo demanda;
- los horarios deben mostrarse como botones/tarjetas grandes agrupados por `Manana` y `Tarde`;
- los horarios visibles deben respetar la zona horaria elegida por el cliente;
- cancelacion/reagenda tardia debe explicar politica 6h/50%;
- `Hablar con alguien` siempre debe abrir WhatsApp aunque falle el POST interno.

## Admin

Menu:

- Control;
- Clientes;
- Terapeutas;
- Finanzas;
- Ajustes.

Control es la pantalla principal:

- citas de hoy;
- pagos pendientes;
- salas ocupadas;
- nueva cita;
- detalle de cita.

## Componentes Base

Crear cuando hagan falta, no antes:

- `Button`
- `IconButton`
- `Input`
- `Select`
- `Textarea`
- `Toggle`
- `Badge`
- `Panel`
- `Drawer`
- `Modal`
- `EmptyState`
- `FeedbackBanner`
- `Tabs`

## QA Visual

Despues de cada fase UI:

- revisar booking mobile;
- revisar booking desktop;
- revisar admin desktop;
- revisar drawer/modal principal;
- capturar overflow o botones cortados.

Si hay Playwright disponible, usarlo para screenshots. Si no, documentar revision manual.
