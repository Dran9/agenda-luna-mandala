# Admin Next Integration Plan

## Estado Post-Merge

- PR #1 `codex/stabilize-docker-admin -> main`: mergeado.
- PR #2 `Mandala3.0 -> main`: mergeado despues de integrar la base.
- PR #3 `codex/admin-next-foundation-c1 -> main`: mergeado.
- `main` contiene Admin Next C0 y Admin Next Foundation C1.
- `Mandala3.0` ya no es la rama activa de trabajo.
- La siguiente fase activa es documentacion de contrato para Payment C0 Manual Contract, partiendo desde `main`.

## Lectura De La Integracion

La pila original fue:

```txt
main -> codex/stabilize-docker-admin -> Mandala3.0
```

La base `codex/stabilize-docker-admin` cerro el bloque de runtime, Docker, backend y estabilizacion previa. Encima, `Mandala3.0` cerro Admin Next C0. Luego Foundation C1 agrego higiene post-merge, guardrails automaticos y primer pulido visual sistemico. Con esos PRs mergeados, la revision de integracion ya no debe tratar `Mandala3.0` como rama viva ni como base para trabajo nuevo.

Admin Next C0 queda dentro de `main` como cierre funcional de:

- Control.
- Nueva cita manual.
- Detalle de cita.
- Cambio de sala.
- Cambio de estado.
- Ajustes de servicios, salas y compatibilidad.
- Terapeutas: lista, creacion, edicion de perfil y asignacion de servicios.
- Clientes: lista y drawer ampliado de solo lectura.

## Foundation C1

Admin Next Foundation C1 quedo mergeado en `main`.

Scope cerrado:

- Documentacion post-merge.
- Guardrails versionados para limites de archivos y patrones prohibidos.
- Pulido visual de superficies existentes.
- QA visual de `/control`, `/clientes`, `/terapeutas` y `/ajustes`.

## Proxima Fase

Payment C0 Manual Contract debe enfocarse en documentar el contrato de producto y tecnico antes de implementar pagos.

Fuera de scope:

- Implementar endpoints.
- Tocar `server/`.
- Tocar DB o migraciones.
- Tocar Admin UI.
- Tocar WhatsApp live, OCR o email bancario/webhooks.
- Cambios de runtime/deploy.

## Caveats Vigentes

- `Clientes` sigue read-only en Admin C0.
- No existe `POST /api/admin/clients`.
- No existe endpoint `PATCH` o update cliente en Admin C0.
- Crear cliente queda cubierto indirectamente por `Nueva cita manual`, que crea o normaliza cliente segun backend existente.
- Si se exige un boton dedicado `Nuevo cliente`, requiere decision de producto y endpoint nuevo.
- Reagendamiento publico sigue documentado como P0 futuro y no esta implementado aqui.

## Gates Historicos Para Foundation C1

No conservar numeros historicos en esta nota. Los numeros de test/build, maximos de lineas y evidencia visual deben salir de validaciones corridas en la fase activa.

Gates minimos:

- `npm --prefix apps/admin-next run check:guardrails`.
- `npm --prefix apps/admin-next test`.
- `npm --prefix apps/admin-next run build`.
- `npm test`.
- `npm run build`.
- `git diff --check`.
- `/api/health` local.
- Diff sensible vacio para `server/`, Docker/compose, `.env.example`, `ops/`, root package y root lockfile.

## Recomendacion Operativa

- Trabajar nuevas fases desde `main`.
- No reabrir trabajo sobre `Mandala3.0`.
- Mantener Admin Next separado de runtime/deploy salvo cambios estrictamente necesarios de CI.
- Mantener guardrails de Admin Next como checks automaticos antes de seguir ampliando producto.
- Mantener pagos en contrato/documentacion hasta que Daniel autorice implementacion.
