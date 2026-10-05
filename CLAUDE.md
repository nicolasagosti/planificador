# Planificador

App web privada para que un community manager lleve los calendarios de contenido mensuales de sus clientes y vea qué le debe a cada uno, qué ya hizo y qué ya entregó. La usa una sola persona. No publica en redes.

- Especificación completa: `docs/SPEC.md`
- Pantallas aprobadas por el cliente: `docs/mockups/`

## Antes de tocar código

- Leé `docs/SPEC.md` antes de trabajar en reglas de negocio, en el modelo de datos o en una pantalla.
- Antes de tocar una pantalla, mirá su PNG y su `.mockup.html` en `docs/mockups/`.
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

Completar al terminar la fase 0: desarrollo, typecheck, lint, test, migraciones, seed y creación del usuario.
