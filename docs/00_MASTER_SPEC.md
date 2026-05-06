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

1. Cliente entra al booking.
2. Ve logo/nombre del centro.
3. Elige servicio o terapeuta.
4. Si elige servicio, backend recomienda terapeuta con disponibilidad real.
5. Cliente elige slot.
6. Cliente ingresa nombre y WhatsApp.
7. Backend confirma cita con claims de terapeuta y sala.
8. Se crea pago pendiente.
9. Se registra mensaje en outbox/test provider.

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

