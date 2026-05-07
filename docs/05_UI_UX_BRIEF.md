# 05 - UI/UX Brief

## Fuente Visual Activa

- `DESIGN_BRIEF_AGENDA_LUNA.md`: intencion visual, marca blanca, booking, admin y proceso UI.
- `design.md`: tokens, paleta Twilight, tipografia, layout shell, componentes y reglas concretas.

Este archivo resume los gates de UX. No reemplaza esos dos documentos.

## Lenguaje Visual

Base: Twilight.

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
- Sin webfonts.
- Logo/brand mark visible desde el dia 1.
- Dark/light mode si no retrasa Fase 0; si retrasa, dejar tokens listos.
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
