# 09 - Prompt Inicial Para Codex

Usar este prompt en una ventana nueva para iniciar el repo desde cero.

```text
Eres Codex 5.3 implementando Agenda Luna Mandala desde cero.

Proyecto:
`/Users/dran/Documents/Codex openai/Agenda lunamandala`

Repo objetivo:
`Dran9/agenda-luna-mandala`

Lee en este orden:
1. README.md
2. AGENTS.md
3. docs/00_MASTER_SPEC.md
4. docs/01_SCOPE_LOCK.md
5. docs/02_ARCHITECTURE.md
6. docs/03_DATABASE_PLAN.md
7. docs/04_HOSTINGER_DEPLOY_CONTRACT.md
8. docs/05_UI_UX_BRIEF.md
9. DESIGN_BRIEF_AGENDA_LUNA.md
10. design.md
11. docs/06_ENGINEERING_GUARDRAILS.md
12. docs/07_ROADMAP_MICROPHASES.md
13. docs/08_ACCEPTANCE_GATES.md
14. docs/10_PUBLIC_BOOKING_SPEC.md

Objetivo de esta primera tarea:
Implementar SOLO Fase 0 - Tuberia Hostinger.

No implementes DB.
No implementes auth.
No implementes booking real.
Lee la spec de Reserva publica para respetar nombres/rutas, pero en Fase 0 solo crea placeholder.
No implementes admin real.
No implementes disponibilidad.
No copies codigo del repo viejo.
No uses superagenda.md.
No cambies stack.
No uses Next/Nest/Tailwind/shadcn/Prisma/Drizzle/Redis/BullMQ.

Entregables Fase 0:
- package.json con scripts:
  - start
  - dev:server
  - dev:admin
  - dev:booking
  - build
  - build:admin
  - build:booking
  - test
- server/index.js Express minimo.
- server/routes/health.route.js.
- apps/booking React/Vite placeholder real en `/`.
- apps/admin React/Vite placeholder real en `/admin`.
- CSS plano con variables basicas Twilight tomadas de `design.md`.
- .env.example sin secretos.
- .gitignore.
- test minimo para health/app creation si aplica.
- Express debe servir builds estaticos.

Reglas criticas:
- `server/index.js` debe ser simple y estable.
- No usar `HOST` en `app.listen`.
- Usar `app.listen(env.PORT, callback)`.
- No condicionar el arranque por NODE_ENV si el archivo se ejecuta directamente.
- No tocar deploy automatico de Hostinger mas alla de lo documentado.
- No crear features fuera de Fase 0.
- Aunque sean placeholders, `/` y `/admin/` no deben verse genericos ni amateur: respetar `DESIGN_BRIEF_AGENDA_LUNA.md` y `design.md`.

Validacion obligatoria:
npm install
npm test
npm run build
npm start
curl -s http://127.0.0.1:3000/api/health
curl -s -I http://127.0.0.1:3000/
curl -s -I http://127.0.0.1:3000/admin/

Entrega:
- archivos creados;
- pruebas ejecutadas;
- resultado;
- instrucciones para conectar repo remoto;
- advertencias si algo no se pudo validar.

No hagas push sin autorizacion explicita.
```

