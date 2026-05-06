# 04 - Hostinger Deploy Contract

## Objetivo

Evitar repetir el error del prototipo: romper produccion por tocar runtime junto con features.

## Contrato De Deploy

Hostinger debe poder ejecutar:

```bash
npm install
npm run build
npm start
```

`npm start` debe levantar:

```txt
/api/health
/
/admin/
```

## Variables Esperadas

```env
NODE_ENV=production
PORT=3000

DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_CONNECTION_LIMIT=10
DB_TIMEZONE=-04:00
APP_TIMEZONE=America/La_Paz

JWT_SECRET=
MESSAGING_PROVIDER=test_outbox
ENABLE_MOCK_FALLBACK=false
ENABLE_DEMO_SCHEDULE_FALLBACK=false

WA_TOKEN=
WA_PHONE_ID=
WA_VERIFY_TOKEN=
META_APP_SECRET=
GOOGLE_VISION_API_KEY=
TELEGRAM_BOT_TOKEN=
```

## Regla Sobre HOST

No usar `HOST` para `app.listen` en v1 salvo prueba explicita en Hostinger.

Seguro:

```js
app.listen(env.PORT, () => {});
```

Riesgoso:

```js
app.listen(env.PORT, env.HOST, () => {});
```

## Fase 0 Deploy Gate

Antes de cualquier feature:

- `/api/health` responde en Hostinger.
- `/` sirve booking placeholder.
- `/admin/` sirve admin placeholder.
- `npm run build` pasa local.
- `npm start` pasa local.
- El deploy automatico de Hostinger toma el commit correcto.

## Archivos Protegidos

No tocar salvo tarea explicitamente de deploy/runtime:

- `server/index.js`
- `server/utils/env.js`
- `package.json`
- `.env.example`
- scripts build/start.

## Rollback

Cada fase debe poder revertirse con un solo commit.

No hacer commits gigantes con runtime + DB + UI + auth.

## Diagnostico 503

Si Hostinger muestra:

```txt
503 Service Unavailable
```

Orden de diagnostico:

1. Probar `/api/health`.
2. Revisar ultimo commit.
3. Revisar si se toco runtime.
4. Revisar logs de app Node.
5. Si no hay logs accesibles, revertir ultimo cambio runtime.
6. No agregar fixes encima sin aislar causa.

