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
npm start
curl -s http://127.0.0.1:3000/api/health
```

Si `npm start` deja proceso corriendo, detenerlo antes de cerrar.

## Tests

Escala de tests:

- Servicios puros: unit tests sin DB.
- Claims/disponibilidad: tests de memoria y DB si aplica.
- Rutas criticas: integration tests contra DB de prueba, no remota.
- UI: build + QA visual.

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

