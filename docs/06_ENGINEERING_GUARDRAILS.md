# 06 - Engineering Guardrails

## Regla Principal

No mezclar categorias de cambio.

Categorias:

1. Runtime/deploy.
2. DB/migrations.
3. Backend negocio.
4. Frontend UI.
5. Tests.
6. Docs.

Una tarea puede tocar varias categorias solo si el plan lo exige explicitamente. Runtime/deploy nunca se mezcla con features.

## Commits Pequenos

Cada commit debe poder explicarse en una frase:

- `feat(db): add core migration`
- `feat(availability): add claims by minute`
- `fix(admin): block terminal appointment reactivation`
- `docs: add deploy contract`

Evitar:

- `big update`
- `final changes`
- `fix all`
- commits de 30 archivos despues de Fase 0.

## Checklist Antes De Push

```bash
npm test
npm run build
```

Si la tarea toca runtime/deploy, agregar el gate Docker correspondiente:

```bash
docker compose up -d
curl -fsS http://127.0.0.1/api/health
docker compose ps
```

Si se usa la fase local inicial:

```bash
docker compose -f compose.local.yaml up -d db api
curl -fsS http://127.0.0.1:4000/api/health
```

Detener o dejar documentados los procesos/servicios levantados segun corresponda.

## Tests

Escala de tests:

- Servicios puros: unit tests sin DB.
- Claims/disponibilidad: tests de memoria y DB si aplica.
- Rutas criticas: integration tests contra DB de prueba, no remota.
- UI: build + QA visual.

## Patron UI: Refresh No Disruptivo (Control/Admin)

Para cockpits operativos, el refresh no puede desmontar la pantalla.

Reglas duras:

- Nunca usar `location.reload` ni navegacion forzada para refrescar datos.
- Separar `initial loading` de `background refresh`.
- Si ya existe payload en memoria, mantenerlo renderizado durante refetch.
- Si falla un refetch y ya habia payload valido, no limpiar la vista; mostrar aviso no bloqueante.
- Preservar estado de navegacion local: tab activa, drawer abierto, item seleccionado, filtros y busqueda.
- Refetch de drawer: si ya habia detalle cargado, no vaciarlo ni mostrar overlay global.
- Auto-refresh recomendado: 30-60 segundos, silencioso.
- Debe existir boton manual `Actualizar` y un indicador discreto de estado (ej. "Datos actualizados HH:mm").

Checklist tecnico minimo:

1. Estado separado: `isLoading` (primer carga) + `isRefreshing` (fondo).
2. Render condicional por "hay datos" y no por "loading global".
3. Error de refetch con cache: mensaje suave + ultima carga valida.
4. Smoke: hacer scroll, abrir drawer, disparar refresh y confirmar cero salto de scroll y cero cierre de contexto.

Este patron aplica a `Control` y cualquier vista interna de lectura continua.

## Manejo De DB Remota

Prohibido sin confirmacion explicita:

- migrate;
- seed;
- drop;
- truncate;
- update masivo;
- scripts de reparacion.

Permitido con cuidado:

- `db:verify`;
- health;
- SELECTs diagnosticos no destructivos.

## Areas Que Requieren Revision Del Ingeniero Jefe

- runtime/deploy;
- auth;
- migraciones;
- claims;
- round-robin publico;
- state machine de citas;
- pagos/OCR;
- WhatsApp live;
- Telegram live;
- cualquier push a main.

## Si Algo Rompe Produccion

1. No seguir agregando fixes a ciegas.
2. Identificar ultimo commit.
3. Revertir si afecta runtime.
4. Preservar rama rota.
5. Hacer forense.
6. Reintroducir en PRs pequenos.
