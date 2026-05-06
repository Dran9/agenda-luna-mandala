# 00 - Master Spec

## Producto

Agenda Luna Mandala es una agenda boutique para centros terapeuticos pequenos que necesitan:

- vender servicios terapeuticos online;
- asignar terapeuta de forma justa;
- manejar salas limitadas;
- confirmar/reagendar/cancelar citas;
- recibir comprobantes de pago;
- comunicarse con clientes por WhatsApp;
- coordinar terapeutas por Telegram.

El primer cliente objetivo es Luna Mandala, pero el producto debe poder revenderse a otros centros pequenos cambiando:

- logo;
- nombre;
- colores;
- servicios;
- terapeutas;
- salas;
- textos;
- datos de pago;
- politicas.

## No Es

- No es Super Agenda.
- No es un SaaS enterprise en v1.
- No es una app con VPS obligatorio.
- No depende de Google Calendar para disponibilidad.
- No necesita Redis/BullMQ hasta v2.

## Usuarios

### Cliente/Paciente

Quiere reservar rapido desde mobile:

- elige servicio;
- acepta terapeuta recomendado o elige terapeuta;
- elige fecha/hora;
- deja nombre y WhatsApp;
- recibe confirmacion y datos de pago;
- puede pedir guia por WhatsApp.

### Secretaria/Admin Del Centro

Necesita operar el dia:

- ver citas de hoy;
- crear cita manual;
- corregir sala/terapeuta;
- cambiar estado;
- revisar pagos;
- crear clientes;
- crear terapeutas;
- configurar servicios y salas.

### Terapeuta

No es cliente principal del admin, pero recibe informacion operacional:

- agenda diaria;
- nuevas citas;
- cambios/cancelaciones;
- recordatorios;
- bloqueo simple futuro.

## Flujo Publico MVP

La superficie publica se llama Reserva publica. Su app tecnica es `booking-web`; su contrato detallado vive en `docs/10_PUBLIC_BOOKING_SPEC.md`.

1. Cliente entra a la Reserva publica.
2. Ve logo/nombre del centro.
3. Elige servicio o terapeuta segun variante de pantalla.
4. Ingresa WhatsApp antes de ver horarios.
5. Si ya tiene cita futura, puede gestionarla o reservar otra sesion explicitamente.
6. Backend muestra disponibilidad real por terapeuta+sala.
7. Cliente elige slot y se crea hold temporal.
8. Cliente nuevo completa onboarding; cliente existente no repite datos.
9. Backend confirma cita con claims de terapeuta y sala.
10. Se crea pago pendiente cuando aplique.
11. Se registra mensaje en outbox/test provider.

## Flujo Admin MVP

1. Admin entra a Control.
2. Ve citas de hoy, pagos pendientes y salas ocupadas.
3. Puede crear cita manual.
4. Puede abrir detalle de cita.
5. Puede completar/cancelar/no-show.
6. Puede crear/editar cliente.
7. Puede crear/editar terapeuta, servicios, horario.
8. Puede crear/editar servicios y salas.

## Principio Mas Importante

La app puede ser pequena, pero no puede mentir:

- si dice que una sala esta libre, debe estar libre;
- si confirma una cita, debe tener claims;
- si un boton existe, debe funcionar;
- si se despliega, `/api/health` debe responder.

