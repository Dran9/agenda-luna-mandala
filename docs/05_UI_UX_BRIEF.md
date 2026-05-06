# 05 - UI/UX Brief

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

## Booking Publico

Mobile-first.

Primera pantalla:

- logo;
- nombre del centro;
- servicios destacados;
- opcion "Elegir terapeuta";
- boton "Buscar guia" hacia WhatsApp;
- acceso discreto a gestionar cita.

No es landing page. Es herramienta de reserva hermosa.

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

