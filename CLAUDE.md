# Planificador

App web privada para que un community manager lleve los calendarios de contenido mensuales de sus clientes y vea qué le debe a cada uno, qué ya hizo y qué ya entregó. La usa una sola persona. No publica en redes.

- Especificación completa: `docs/SPEC.md`
- Pantallas aprobadas por el cliente: `docs/mockups/`

## Antes de tocar código

- Leé `docs/SPEC.md` antes de trabajar en reglas de negocio, en el modelo de datos o en una pantalla.
- Leé también `docs/DECISIONES.md`: resuelve lo que la especificación no cubría y, donde no coinciden, vale sobre ella.
- Antes de tocar una pantalla, mirá su PNG y su `.mockup.html` en `docs/mockups/`.
- Antes de usar una API de Next.js, leé su guía en `node_modules/next/dist/docs/` (ver `AGENTS.md`): esta versión cambió respecto de las anteriores.
- Si la especificación no cubre algo, preguntá. No inventes funcionalidad ni agregues nada que esté en su lista de "No construir".

## Reglas que no se rompen

- Solo cuentan las piezas de calendarios aprobados de clientes no archivados.
- Los totales se calculan con consultas. No hay contadores guardados.
- "Atrasada" se calcula: pieza no entregada con fecha anterior a hoy. Nunca se guarda.
- "Hoy" sale de una sola función, en la zona horaria de la app. Nunca de un `new Date()` suelto.
- Un día de calendario es una cadena `AAAA-MM-DD`, sin hora ni zona.
- Las transiciones de calendario y de pieza se validan en el servidor.
- Un calendario aprobado bloquea la fecha, la red, el formato, el tema y la idea de sus piezas.
- Toda Server Action y toda consulta verifica la sesión y filtra por `user_id`.
- El color significa estado y nada más. El diseño aprobado no se reinterpreta.

## Convenciones

- Interfaz en español rioplatense, con voseo. Código, base de datos y commits en inglés.
- TypeScript estricto, sin `any`.
- Reglas de negocio puras en `src/domain`, sin base ni React, con tests.
- Server Components por defecto. Mutaciones con Server Actions y entrada validada con Zod.
- Migraciones SQL versionadas. Nunca `push` contra producción.
- Cada dependencia nueva se justifica.

## Forma de trabajo

- Una fase por vez, en el orden de la sección 11 de la especificación.
- Al cerrar cada fase: `typecheck`, `lint` y `test` en verde, un commit y un resumen de qué quedó hecho y qué sigue.
- Nunca commitees secretos ni archivos `.env`.

## Comandos

- `npm run dev`: servidor de desarrollo en http://localhost:3000.
- `npm run typecheck`: genera los tipos de rutas de Next (`next typegen`) y corre `tsc`.
- `npm run lint`: ESLint y el chequeo de formato de Prettier. `npm run format` corrige el formato.
- `npm test`: tests de Vitest. `npm run test:watch` los corre en modo observación.
- `npm run build`: build de producción.
- `npm run db:generate -- --name <nombre>`: genera una migración SQL en `src/db/migrations` a partir de `src/db/schema.ts`. Revisá el SQL antes de aplicarlo.
- `npm run db:migrate`: aplica las migraciones pendientes en la base de `DATABASE_URL`.
- `npm run db:seed`: carga los datos de la sección 10 para el usuario de `ADMIN_EMAIL` y reemplaza lo que tuviera. Se niega a correr en producción o si la base tiene otro usuario.
- `npm run user:create`: crea el usuario con `ADMIN_EMAIL` y `ADMIN_PASSWORD` (12 caracteres como mínimo), o le cambia la contraseña y cierra sus sesiones si ya existe. No crea un segundo usuario.
- `npm run test:e2e`: tests de Playwright contra un build de producción local en el puerto 3100, con el usuario de `.env.local`. Con `E2E_BASE_URL` corren contra la app publicada.

Las variables de entorno están documentadas en `.env.example`. En desarrollo van en `.env.local`.
