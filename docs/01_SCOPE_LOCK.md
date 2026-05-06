# 01 - Scope Lock

## Nomenclatura

- Reserva publica: nombre humano/comercial del booking que usa el cliente final.
- `booking-web`: app tecnica React/Vite de Reserva publica.
- `public-booking-api`: API publica bajo `/api/public/booking`.
- Admin: superficie interna del centro.

## MVP Permitido

### Reserva Publica (`booking-web`)

- Catalogo de servicios.
- Seleccion por servicio.
- Seleccion opcional por terapeuta.
- Recomendacion de terapeuta.
- Disponibilidad por fecha.
- Confirmacion con nombre + WhatsApp.
- Gestion basica de cita existente con token.
- Reagendar/cancelar con politica minima de 6h/50%.
- Boton "Buscar guia" hacia WhatsApp.
- Tres variantes de pantalla inicial segun `docs/10_PUBLIC_BOOKING_SPEC.md`.

### Disponibilidad

- Servicio activo.
- Terapeuta activo.
- Terapeuta ofrece servicio.
- Sala activa compatible.
- Horario semanal simple.
- Bloqueos simples.
- Claims por minuto.
- Round-robin simple.

### Admin

- Control.
- Clientes.
- Terapeutas.
- Finanzas simple.
- Ajustes.
- Crear cita manual.
- Cambiar estado.
- Reagendar con validacion.
- CRUD servicios/salas.

### Pagos

- Pago pendiente al crear cita.
- Registro de comprobante futuro.
- Revision manual.
- OCR Google Vision en fase posterior, no en Fase 0.

### Comunicacion

- `test_outbox` primero.
- WhatsApp live despues.
- Telegram terapeutas despues del admin estable.

## Fuera De Alcance En V1 Inicial

- Multi-tenant SaaS complejo.
- Planes/subscripciones.
- Facturacion formal.
- Redis.
- BullMQ.
- WebSockets.
- Recurrencias complejas.
- Google Calendar como fuente.
- Marketplace de terapeutas.
- Historia clinica.
- Permisos granulares avanzados.
- Reporteria contable formal.

## Prohibicion De Crecimiento Prematuro

No implementar nada porque "despues podria servir".

Solo implementar lo que:

- ayuda a reservar;
- evita doble reserva;
- ayuda a operar el dia;
- ayuda a cobrar;
- ayuda a vender la demo.

