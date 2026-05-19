# Payment C0 Deploy Readiness Plan

## 1. Estado

- Payment C0 Manual esta mergeado en `main`.
- Merge commit: `ad4b15e570d4fbdc73bfa6b1c282eea7d7389793`.
- No hay deploy todavia.
- No se toco DB remota.
- No se ejecutaron migraciones remotas.
- Cierre QA local documentado en `docs/21_PAYMENT_C0_LOCAL_QA_CLOSURE.md`.

## 2. Que entraria en produccion

- Migracion `0006_payment_c0_manual_schema.sql`.
- Arancel por relacion `therapist_services`:
  - `price_amount`
  - `currency_code`
- Campos nuevos/manuales en `payments`:
  - `reference`
  - `submitted_at`
  - `approved_at`
  - `rejected_at`
  - `canceled_at`
  - indice `idx_payments_reference`
- Endpoints admin manuales de pagos:
  - crear pago para cita;
  - editar metodo/referencia/notas;
  - marcar recibido/submitted;
  - aprobar;
  - rechazar;
  - anular.
- Admin Next con controles manuales C0 en drawer de cita.
- Tests backend/admin y guardrails Admin Next.

## 3. Que NO entra

- WhatsApp live.
- OCR.
- Lectura automatica de comprobantes.
- Email/webhook bancario.
- Liquidacion a terapeutas.
- QR live.
- Pagos parciales.
- Conciliacion automatica.
- Deploy automatico.

## 4. Preflight antes de deploy

Checklist obligatorio antes de tocar produccion:

- [ ] Autorizacion explicita de Daniel para preparar deploy.
- [ ] Autorizacion explicita separada de Daniel para ejecutar migracion productiva.
- [ ] Backup DB remota reciente y verificable.
- [ ] Confirmar `DB_HOST`, `DB_NAME`, `DB_USER`, `APP_ENV` y `NODE_ENV` del target.
- [ ] Confirmar que el target no es una DB vieja/prototipo.
- [ ] Confirmar rama `main` actualizada al SHA esperado.
- [ ] CI verde sobre `main`.
- [ ] `npm test`.
- [ ] `npm run build`.
- [ ] `npm --prefix apps/admin-next test`.
- [ ] `npm --prefix apps/admin-next run build`.
- [ ] `npm --prefix apps/admin-next run check:guardrails`.
- [ ] Revisar migracion `0006_payment_c0_manual_schema.sql` contra schema real remoto con una lectura/inspeccion previa.
- [ ] Confirmar que `therapist_services` remoto tiene datos suficientes o plan de backfill seguro.
- [ ] Confirmar rollback plan de app por SHA.
- [ ] Confirmar plan DB: backup restore o migracion inversa preparada, no ALTER improvisado.
- [ ] Ventana de bajo trafico.

## 5. Plan de migracion productiva

No ejecutar desde este documento. Este plan describe el orden seguro para una fase posterior.

1. Congelar alcance del deploy:
   - SHA exacto de app.
   - migracion exacta.
   - env target.
2. Tomar backup logico de la DB remota:
   - incluir tablas, datos, triggers/rutinas si existen;
   - guardar fuera del contenedor/host si aplica;
   - verificar que el archivo no esta vacio.
3. Inspeccionar schema remoto con lecturas:
   - confirmar version de migraciones aplicada;
   - confirmar existencia de `payments`, `therapist_services`, `appointments`, `appointment_resource_claims`;
   - confirmar que `payments.status` usa `cancelled` internamente si aplica.
4. Ejecutar migracion `0006_payment_c0_manual_schema.sql` solo despues de autorizacion explicita.
5. Tablas tocadas por la migracion:
   - `therapist_services`: agrega/asegura arancel por terapeuta-servicio.
   - `payments`: agrega `reference`, timestamps manuales y indice por referencia.
6. Por que no toca claims:
   - la migracion no modifica `appointments`;
   - no modifica `appointment_resource_claims`;
   - no cambia disponibilidad;
   - los endpoints de pagos no crean, liberan ni recalculan claims.
7. Validar `therapist_services`:
   - no debe quedar combinacion activa sin `price_amount > 0`;
   - `currency_code` debe ser `BOB` o ISO 4217 valido;
   - validar conteo por servicio/terapeuta activo.
8. Validar `payments`:
   - columnas nuevas existen;
   - `approved_at` se pobló desde `reviewed_at` para pagos approved historicos, si aplica;
   - indice `idx_payments_reference` existe;
   - estados internos siguen compatibles.

## 6. Validacion post-migracion

Checklist posterior, sin crear datos productivos salvo autorizacion explicita:

- [ ] `/api/health` responde OK.
- [ ] Logs API sin errores 500 recurrentes.
- [ ] Admin login funciona.
- [ ] Listar citas en Admin Control.
- [ ] Abrir drawer de cita.
- [ ] Ver seccion Pagos sin errores.
- [ ] Confirmar que citas existentes cargan aunque no tengan pago C0.
- [ ] Confirmar que no hay errores de consola en Admin.
- [ ] Crear pago manual de prueba solo si Daniel autoriza dato productivo, o hacerlo en staging/local.
- [ ] Si se autoriza prueba productiva, usar cita definida por Daniel y revertir/anular segun instruccion.
- [ ] Validar que claims de la cita no cambian despues de mutaciones de pago.

## 7. Rollback conceptual

No ejecutar desde esta fase.

- App rollback:
  - redeploy del SHA anterior;
  - healthcheck inmediato;
  - revisar logs.
- DB rollback recomendado:
  - restaurar backup verificado si la migracion rompe operacion;
  - o ejecutar migracion inversa preparada y revisada previamente.
- No improvisar `ALTER TABLE` en produccion durante incidente.
- Si el problema es solo UI Admin, preferir rollback de app antes que tocar DB.

## 8. Decisiones que Daniel debe tomar antes de deploy

- Autoriza preparar deploy?
- Autoriza ejecutar migracion productiva?
- Autoriza deploy de Admin con Payment C0?
- Quiere revisar UI local antes?
- Decision tomada despues del QA local: pago `Anulado` puede mostrar formulario para registrar un nuevo pago.

## 9. Recomendacion de Ingenieria

No hacer deploy directo todavia.

Orden recomendado:

1. Daniel revisa `docs/21_PAYMENT_C0_LOCAL_QA_CLOSURE.md`.
2. Mantener como esperado que pago `Anulado` permita registrar un nuevo pago.
3. Daniel autoriza "preparar deploy".
4. En fase separada, se ejecuta preflight completo.
5. Solo despues de autorizacion explicita: migracion productiva y deploy.

La siguiente fase debe ser deploy/readiness operativo, no "deploy ahora" implicito.

## 10. Readiness operativo local ejecutado

Fecha: `2026-05-19`.

Alcance ejecutado: preparacion local/readiness sin produccion.

Confirmaciones:

- No hubo deploy.
- No se toco DB remota.
- No se ejecutaron migraciones remotas.
- No hubo push.
- No se abrio PR nuevo.
- Docker local quedo vivo.

Resultados:

| Check | Resultado | Notas |
|---|---:|---|
| Rama local | PASS | `main` contiene `ad4b15e` como merge commit de PR #4. |
| Docker local | PASS | `api` healthy en `127.0.0.1:4000`; `db` healthy en `3307`. |
| `/api/health` local | PASS | Responde `status=ok`. |
| `docker compose -f compose.local.yaml exec -T api npm run db:verify` | PASS | DB local `lunamandala_v2_docker`; migraciones `0001` a `0006` aplicadas; schema OK. |
| `git diff --check` | PASS | Sin whitespace errors. |
| `npm test` | PASS | 396 tests, 396 pass. |
| `npm run build` | PASS | Booking + Admin legacy build OK. Warning Vite CJS deprecated no bloqueante. |
| `npm --prefix apps/admin-next test` | PASS | 190 tests, 190 pass. |
| `npm --prefix apps/admin-next run build` | PASS | Admin Next build OK. |
| `npm --prefix apps/admin-next run check:guardrails` | PASS | Max JSX 257; max CSS 193. |
| Schema local `therapist_services` | PASS | Columnas `price_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00` y `currency_code CHAR(3) NOT NULL DEFAULT 'BOB'`. |
| Schema local `payments` | PASS | Columnas `reference`, `submitted_at`, `approved_at`, `rejected_at`, `canceled_at`. |
| Indices C0 locales | PASS | `idx_therapist_services_price(center_id, service_id, price_amount)` y `idx_payments_reference(center_id, reference)`. |

Hallazgo de readiness:

- En DB local seed/demo, `therapist_services` tiene 18 relaciones activas y solo 3 con `price_amount > 0`; 15 quedan en `0.00 BOB`.
- Esto no bloquea el smoke C0 local porque el flujo validado uso una relacion con arancel positivo.
- Para produccion, antes de migrar/deployar Payment C0, hay que confirmar que todas las relaciones terapeuta-servicio activas que puedan generar pagos tengan arancel positivo. Si no, crear pago manual fallara con `PAYMENT_ARANCEL_NOT_CONFIGURED`, que es correcto tecnicamente pero seria bloqueo operativo.

## 11. SQL de inspeccion pre-produccion

Estas consultas son de lectura. Ejecutarlas solo contra el target confirmado y antes de cualquier migracion productiva.

Confirmar migraciones:

```sql
SELECT version, applied_at
FROM schema_migrations
ORDER BY version;
```

Confirmar columnas Payment C0 antes/despues:

```sql
SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (
    (table_name = 'therapist_services' AND column_name IN ('price_amount', 'currency_code'))
    OR
    (table_name = 'payments' AND column_name IN ('reference', 'submitted_at', 'approved_at', 'rejected_at', 'canceled_at'))
  )
ORDER BY table_name, ordinal_position;
```

Confirmar indices Payment C0:

```sql
SELECT table_name, index_name, column_name, seq_in_index
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name IN ('therapist_services', 'payments')
  AND index_name IN ('idx_therapist_services_price', 'idx_payments_reference')
ORDER BY table_name, index_name, seq_in_index;
```

Confirmar aranceles activos:

```sql
SELECT
  COUNT(*) AS active_relations,
  SUM(price_amount > 0) AS priced_relations,
  SUM(price_amount <= 0 OR currency_code IS NULL OR currency_code = '') AS unpriced_relations
FROM therapist_services
WHERE is_active = 1;
```

Listar relaciones activas sin arancel:

```sql
SELECT
  ts.therapist_id,
  t.full_name AS therapist,
  ts.service_id,
  s.name AS service,
  ts.price_amount,
  ts.currency_code
FROM therapist_services ts
JOIN therapists t ON t.id = ts.therapist_id
JOIN services s ON s.id = ts.service_id
WHERE ts.is_active = 1
  AND (ts.price_amount <= 0 OR ts.currency_code IS NULL OR ts.currency_code = '')
ORDER BY t.full_name, s.name;
```

## 12. Bloqueadores antes de produccion

Queda pendiente antes de cualquier accion productiva:

- Confirmar target productivo exacto (`DB_HOST`, `DB_NAME`, `DB_USER`, `APP_ENV`, `NODE_ENV`).
- Backup DB remota reciente y verificable.
- Inspeccion remota de schema/migraciones solo lectura.
- Resolver o aceptar explicitamente cualquier relacion activa sin arancel positivo.
- Autorizacion explicita separada para ejecutar migracion productiva.
- Autorizacion explicita separada para deploy.
