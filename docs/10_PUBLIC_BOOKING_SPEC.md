# 10 - Public Booking Spec

## Nombre Interno

Para evitar confusion entre superficies:

- Nombre de producto/negocio: Reserva publica.
- App tecnica: `booking-web`.
- API tecnica: `public-booking-api`.
- Superficie interna: Admin.

Usar "Reserva publica" al hablar de UX, cliente final y demo comercial. Usar `booking-web` solo para carpetas, scripts, variables y tickets tecnicos.

## Objetivo

Replicar una experiencia de reserva publica premium para cliente final, sin admin, con:

1. Pantalla inicial en tres variantes visuales/funcionales.
2. Flujo de reserva con disponibilidad real, hold temporal y confirmacion.
3. Flujo de reagendar/cancelar con politica de tiempo minimo y soporte humano por WhatsApp.

## Alcance

Incluye:

- `booking-web`.
- `public-booking-api`.
- Seleccion de servicio/terapeuta.
- Identificacion por WhatsApp antes de mostrar horarios.
- Disponibilidad real por terapeuta+sala.
- Hold temporal.
- Confirmacion con idempotencia.
- Reagendar/cancelar con policy acknowledgement.
- Escalamiento a WhatsApp humano.

No incluye:

- Vistas de Admin.
- Endpoints internos de operaciones.
- OCR, pagos avanzados o Telegram.
- Google Calendar como fuente de disponibilidad.

## Variantes De Pantalla Inicial

### URLs

- `/?tenantSlug=<slug>`: `Booking default`.
- `/?tenantSlug=<slug>&screenType=single_therapist`: `Single therapist`.
- `/?tenantSlug=<slug>&screenType=hybrid_explore`: `Hybrid explore`.
- `type=<valor>` debe funcionar como alias de `screenType=<valor>`.
- `screenType` ausente o invalido cae a `Booking default`.

### Navbar De Variantes

Debe existir una barra superior para QA/demo con enlaces:

- `Booking default`.
- `Single therapist`.
- `Hybrid explore`.

Reglas:

- El enlace activo usa clase/estado visual `is-active`.
- La navegacion conserva `tenantSlug`.
- La barra no debe sentirse como admin ni como landing page; es un switch de experiencia.

## Configuracion

### Query Params

- `tenantSlug`, default `demo`.
- `screenType` o `type`.
- `supportWhatsapp`, default `59170000000`.

### Env Frontend

- `VITE_TENANT_SLUG`.
- `VITE_BOOKING_SCREEN_TYPE`.
- `VITE_SUPPORT_WHATSAPP`.
- `VITE_API_BASE_URL`, opcional; si no existe, usar proxy relativo `/api`.

### Puertos Locales

- `booking-web`: `5174`.
- API: `4000`.

## Contratos De Datos

### Catalog

```ts
type Catalog = {
  center: {
    slug: string;
    displayName: string;
    timezone: string;
  };
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    therapistCount: number;
    reservable: boolean;
  }>;
  therapists: Array<{
    id: string;
    displayName: string;
    serviceIds: string[];
  }>;
};
```

### BookingSlot

```ts
type BookingSlot = {
  startsAt: string;
  endsAt: string;
  therapistId: string;
  therapistName: string;
  roomId: string;
  roomName: string;
};
```

### IdentifyResponse

```ts
type IdentifyResponse = {
  status: 'new' | 'existing';
  client?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phoneE164: string;
  };
  appointments?: AppointmentSummary[];
  nextAppointment?: AppointmentSummary | null;
};

type AppointmentSummary = {
  id: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  therapistName: string;
  roomName: string;
  managementToken: string;
  availableActions: Array<{
    action: 'cancel' | 'reschedule';
    allowed: boolean;
    reason?: 'minimum_notice_violation';
    minimumNoticeHours: number;
    penaltyPercent: number;
    message: string;
  }>;
};
```

## Flujo De Reserva

### Carga Inicial

1. Cargar catalogo con `GET /api/public/booking/catalog?tenantSlug=...`.
2. Consultar `https://ipapi.co/json/` para sugerir zona horaria.
3. Si IP API falla, continuar con `America/La_Paz`.

### Seleccion Inicial Por Variante

`Booking default`:

- Buscar y elegir servicio primero.
- Terapeuta opcional despues.

`Single therapist`:

- Si hay un solo servicio reservable, autoseleccionar.
- Si hay mas de un servicio, mostrar grilla de servicios.

`Hybrid explore`:

- Submodo `focus`: busqueda por enfoque/servicio.
- Submodo `therapist`: busqueda por terapeuta.
- Submodo `orientation`: muestra 3 servicios iniciales y link `Elegir manualmente`.
- Debe hacer auto-scroll suave a la siguiente seccion cuando la eleccion lo justifique.

### Identificacion Antes De Horarios

Regla dura: ningun horario aparece antes de identificar WhatsApp.

1. Cliente selecciona servicio.
2. Cliente ingresa WhatsApp.
3. Boton `Continuar` llama `POST /api/public/booking/identify`.
4. Si hay citas futuras activas, mostrar aviso `Ya tienes cita`.
5. En ese aviso, ofrecer:
   - `Reagendar/Cancelar`.
   - `Reservar otra sesion`.
6. No cargar slots hasta que el cliente elija `Reservar otra sesion` o no tenga citas futuras.

### Disponibilidad Y Slot

1. Cargar slots con `POST /api/public/booking/availability`.
2. Filtros visuales en frontend:
   - solo slots futuros;
   - solo horas `07:00` a `20:00`;
   - agrupar en `Manana` antes de las 13:00 y `Tarde` desde las 13:00.
3. Fecha default: proximo dia habil.
4. Strip visible: 5 dias habiles.
5. Calendario extendido: solo lunes a viernes.
6. Seleccionar slot llama `POST /api/public/booking/hold`.
7. Guardar `holdToken` y `expiresAt`.
8. Mientras exista hold activo, bloquear nueva seleccion o exigir liberar/expirar el hold anterior.

### Presentacion Visual De Fechas Y Horarios

La disponibilidad no debe sentirse como una lista tecnica. Debe ser una decision guiada, clara y mobile-first.

Reglas:

- Mostrar primero una tira corta de fechas cercanas, idealmente 5 dias habiles.
- La tira de fechas debe usar botones grandes con dia de semana y fecha.
- Incluir accion `Ver mas fechas` para desplegar calendario extendido.
- El calendario extendido se muestra solo cuando el cliente lo pide.
- El calendario debe indicar mes y ano, permitir navegar mes anterior/siguiente cuando aplique y deshabilitar dias no seleccionables.
- No mostrar sabados ni domingos como fechas reservables en v1.
- El dia seleccionado debe tener estado visual claro.
- Los slots deben renderizarse como botones/tarjetas grandes, no como links ni lista plana.
- Agrupar slots en `Manana` y `Tarde`.
- Cada slot debe mostrar hora principal y, cuando aporte claridad, terapeuta y zona horaria visible.
- En mobile los slots deben mantener targets tactiles comodos y no cortar textos.
- Si no hay slots para una fecha, mostrar empty state claro y mantener acceso a otras fechas.

Mientras hay hold activo:

- Bloquear cambio de fecha.
- Bloquear cambio de calendario.
- Bloquear cambio de servicio.
- Bloquear cambio de terapeuta.
- Bloquear cambio de telefono.
- Bloquear cambio de pais/zona horaria.
- Mantener visible expiracion del hold y accion de confirmacion.

### Confirmacion

Cliente nuevo:

- Pedir onboarding obligatorio:
  - nombre;
  - apellido;
  - edad `18..75`;
  - ciudad;
  - fuente de llegada.

Cliente existente:

- No pedir onboarding.

Confirmar con:

- `POST /api/public/booking/confirm`.
- `idempotencyKey` unico.

Resultado esperado:

- `Tu cita esta confirmada`.
- Mostrar fecha/hora final, servicio, terapeuta y sala si aplica.

## Flujo De Reagendar/Cancelar

### Entrada

Puede iniciar desde:

- boton header `Reagendar/Cancelar`;
- aviso `Ya tienes cita`;
- link futuro en mensaje WhatsApp.

El subflujo usa telefono + `identify`.

### Seleccion De Cita

1. Buscar por WhatsApp.
2. Si hay multiples citas futuras, mostrar lista para elegir.
3. Si no hay citas futuras, mostrar error explicativo y ofrecer soporte.

### Politica De Cambios

Regla v1:

- Minimo de anticipacion: 6 horas.
- Penalidad si no se cumple: 50%.

El backend calcula `availableActions` por cita. Si una accion tiene `minimum_notice_violation`:

1. UI muestra panel de politica.
2. Botones quedan bloqueados hasta `Aceptar condiciones`.
3. Al aceptar, la request envia `policyAcknowledged: true`.

### Cancelacion

1. Boton `Cancelar cita` abre confirmacion explicita.
2. Confirmacion llama `POST /api/public/booking/cancel`.
3. Enviar:
   - `managementToken` preferente;
   - fallback `appointmentId + phoneE164`;
   - `idempotencyKey`;
   - `policyAcknowledged` cuando aplique.
4. Resultado: `Tu cita fue cancelada`.

### Reagendamiento

1. Boton `Reagendar` inicia busqueda de slots del mismo servicio.
2. Cliente elige nuevo slot.
3. Backend crea hold del nuevo slot.
4. Confirmacion llama `POST /api/public/booking/reschedule` con:
   - `holdToken`;
   - `managementToken` o fallback;
   - `idempotencyKey`;
   - `policyAcknowledged` cuando aplique.
5. Si falla la reagenda, el horario original sigue vigente y la UI debe decirlo con claridad.

### Soporte Humano

En violacion de politica, ofrecer `Hablar con alguien`.

Accion:

1. Intentar `POST /api/public/booking/support-request` con `source: late_policy`.
2. Abrir siempre `https://wa.me/<supportWhatsapp>?text=<mensaje>`.
3. Si falla el POST, igual abrir WhatsApp.

## Endpoints Publicos Obligatorios

- `GET /api/public/booking/catalog?tenantSlug=...`
- `POST /api/public/booking/identify`
- `POST /api/public/booking/availability`
- `POST /api/public/booking/hold`
- `POST /api/public/booking/confirm`
- `POST /api/public/booking/cancel`
- `POST /api/public/booking/reschedule`
- `POST /api/public/booking/support-request`

## Validaciones Clave

Telefono:

- Solo digitos en frontend.
- Validar largo por zona horaria/pais.

Hold:

- Existe.
- No expiro.
- Pertenece al tenant.
- Corresponde al telefono/cita.

Onboarding:

- `firstName >= 2`.
- `lastName >= 2`.
- `age` entre 18 y 75.
- `city` no vacio.
- `source` no vacio.

Politica tardia:

- Si no hay 6 horas minimas, cancelar/reagendar requiere `policyAcknowledged=true`.
- Sin acknowledgement, responder `422`.

## Disponibilidad Real Backend

Defaults configurables:

- apertura `08:00`;
- cierre `20:00`;
- paso `30 min`;
- TTL de hold `180s`.

Fairness/orden:

1. Ordenar terapeutas y salas por menor carga actual.
2. La carga actual incluye claims confirmados + locks/holds activos.
3. Desempate por `id` ascendente.
4. Elegir el primer par terapeuta+sala no bloqueado.

Locks y claims:

- Hold bloquea terapeuta + sala + token de hold.
- Confirm/reschedule valida colisiones en DB antes de confirmar.
- Confirm/reschedule libera locks temporales al finalizar.
- Cancelar libera claims segun regla de negocio vigente.

## Idempotencia Y Concurrencia

- `confirm`, `cancel` y `reschedule` requieren `idempotencyKey`.
- Request repetida con misma clave y mismo payload responde `replayed: true`.
- Misma clave concurrente en progreso responde error de operacion en progreso.
- Si el slot se toma entre pasos, responder `409` con codigo `SLOT_NOT_AVAILABLE`.

## Errores Esperados

- `400`: request invalido.
- `404`: recurso no encontrado.
- `409`: slot ocupado o hold invalido por colision.
- `410`: hold expirado.
- `422`: politica minima no cumplida sin aceptacion.

La UI nunca debe romper el flujo por estos errores. Debe explicar el problema y ofrecer siguiente accion.

## Zona Horaria Y Telefono

- Selector de pais/zona horaria visible en el flujo.
- Sugerir zona horaria por IP cuando sea posible.
- Placeholder telefono: `71234567`.
- Mostrar helper de conteo de digitos.
- Validar estricto solo donde el largo esta definido en esta tabla; para paises con formatos variables, aceptar rango prudente y guiar con helper.
- El selector no debe ser un `<select>` basico si hay paises multiples.
- El selector debe mostrar bandera, pais y hora local actual.
- Debe permitir busqueda por pais.
- Debe agrupar opciones por region cuando haya suficientes paises.
- Cambiar pais/zona horaria actualiza helper de telefono y formato de horarios.
- Los horarios visibles se formatean en la zona horaria elegida por el cliente.
- El backend recibe y conserva timestamps ISO; el frontend decide presentacion local.
- La zona horaria del navegador puede sugerir default, pero no reemplaza la eleccion explicita del cliente.

Paises minimos para v1 internacional:

- Bolivia: `America/La_Paz`.
- Argentina: `America/Argentina/Buenos_Aires`.
- Chile: `America/Santiago`.
- Peru: `America/Lima`.
- Colombia: `America/Bogota`.
- Mexico: `America/Mexico_City`.
- Uruguay: `America/Montevideo`.
- Brasil: `America/Sao_Paulo`.
- USA Este: `America/New_York`.
- USA Centro: `America/Chicago`.
- USA Pacifico: `America/Los_Angeles`.
- Canada Este: `America/Toronto`.
- Espana: `Europe/Madrid`.
- Francia: `Europe/Paris`.
- Italia: `Europe/Rome`.
- Alemania: `Europe/Berlin`.

Reglas por timezone:

| Timezone | Digitos |
| --- | --- |
| `America/La_Paz` | 8 |
| `America/Argentina/Buenos_Aires` | 10-11 |
| `America/Santiago` | 9 |
| `America/Lima` | 9 |
| `America/Bogota` | 10 |
| `America/Mexico_City` | 10 |
| `America/Montevideo` | 8 |
| `America/Sao_Paulo` | 10-11 |
| `Europe/Madrid` | 9 |
| `Europe/Paris` | 8-11 |
| `Europe/Rome` | 8-11 |
| `Europe/Berlin` | 10-11 |
| `America/New_York` | 10 |
| `America/Chicago` | 10 |
| `America/Los_Angeles` | 10 |
| `America/Toronto` | 10 |

## Textos Funcionales

Usar estos textos como baseline del flujo:

- Header principal: `Reserva tu sesion`.
- Accion de gestion: `Reagendar/Cancelar`.
- Boton telefono: `Continuar`.
- Estado sin seleccion: `Elige una opcion para continuar`.
- Estado identificacion: `Identifica tu reserva`.
- Exito confirmacion: `Tu cita esta confirmada`.
- Exito cancelacion: `Tu cita fue cancelada`.
- Exito reagenda: `Tu cita fue reagendada`.
- Soporte politica: `Hablar con alguien`.

## Checklist De Aceptacion

1. Las 3 URLs de variante funcionan y renderizan su patron correcto.
2. `type=<valor>` funciona como alias de `screenType=<valor>`.
3. El navbar marca `is-active` y conserva `tenantSlug`.
4. Ningun horario aparece antes de identificar WhatsApp.
5. Si existe cita futura, no se muestran slots hasta elegir `Reservar otra sesion`.
6. Seleccionar slot crea hold y muestra expiracion.
7. Mientras hay hold activo, no se puede seleccionar otro slot de forma ambigua.
8. Confirmacion de cliente nuevo exige onboarding valido.
9. Confirmacion de cliente existente no pide onboarding.
10. Reagendar conserva cita original si el cambio falla.
11. Politica de 6h/50% bloquea acciones hasta aceptacion.
12. `Hablar con alguien` abre WhatsApp aunque falle el POST interno.
13. Todas las operaciones mutables usan `idempotencyKey`.
14. Conflicto de slot responde `409` y la UI permite elegir otro horario.
15. Hold expirado responde `410` y la UI permite crear un nuevo hold.
16. El selector pais/zona horaria muestra bandera, pais y hora local actual.
17. El helper de WhatsApp cambia segun pais/zona horaria.
18. La disponibilidad muestra primero tira corta de fechas y calendario extendido solo bajo demanda.
19. Los slots se muestran como botones/tarjetas grandes agrupados por `Manana` y `Tarde`.
20. Los horarios visibles usan la zona horaria elegida por el cliente.

## Payloads De Referencia

### Identify

```json
{
  "method": "POST",
  "url": "/api/public/booking/identify",
  "body": {
    "tenantSlug": "demo",
    "phoneE164": "71234567"
  }
}
```

### Availability

```json
{
  "method": "POST",
  "url": "/api/public/booking/availability",
  "body": {
    "tenantSlug": "demo",
    "serviceId": "svc_reiki",
    "therapistId": null,
    "date": "2026-05-07",
    "timezone": "America/La_Paz"
  }
}
```

### Hold

```json
{
  "method": "POST",
  "url": "/api/public/booking/hold",
  "body": {
    "tenantSlug": "demo",
    "phoneE164": "71234567",
    "serviceId": "svc_reiki",
    "startsAt": "2026-05-07T10:00:00-04:00",
    "therapistId": "therapist_1",
    "roomId": "room_1"
  }
}
```

### Confirm

```json
{
  "method": "POST",
  "url": "/api/public/booking/confirm",
  "headers": {
    "Idempotency-Key": "uuid-or-ulid"
  },
  "body": {
    "tenantSlug": "demo",
    "holdToken": "hold_token",
    "phoneE164": "71234567",
    "client": {
      "firstName": "Ana",
      "lastName": "Rojas",
      "age": 32,
      "city": "La Paz",
      "source": "Instagram"
    }
  }
}
```

### Cancel

```json
{
  "method": "POST",
  "url": "/api/public/booking/cancel",
  "headers": {
    "Idempotency-Key": "uuid-or-ulid"
  },
  "body": {
    "tenantSlug": "demo",
    "managementToken": "management_token",
    "policyAcknowledged": true
  }
}
```

### Reschedule

```json
{
  "method": "POST",
  "url": "/api/public/booking/reschedule",
  "headers": {
    "Idempotency-Key": "uuid-or-ulid"
  },
  "body": {
    "tenantSlug": "demo",
    "managementToken": "management_token",
    "holdToken": "new_hold_token",
    "policyAcknowledged": true
  }
}
```

### Support Request

```json
{
  "method": "POST",
  "url": "/api/public/booking/support-request",
  "body": {
    "tenantSlug": "demo",
    "phoneE164": "71234567",
    "source": "late_policy",
    "appointmentId": "appointment_1"
  }
}
```
