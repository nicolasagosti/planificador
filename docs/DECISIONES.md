# Decisiones

Lo que la especificación no cubría o dejaba abierto, y cómo se resolvió. Aprobado el 5 de octubre de 2026. Donde este archivo y `SPEC.md` no coinciden, vale este archivo.

## Modelo de datos

- **`clients.client_since`** (`date`, día 1 del mes, opcional). Es el dato de "Cliente desde julio de 2026". Se carga en el formulario del cliente y, si está vacío, esa línea no se muestra. `created_at` no sirve: todos los clientes que se carguen al empezar dirían "desde octubre de 2026".
- **`pieces.asset_name`** (`text`, opcional). Es el nombre del archivo que se muestra junto al link. Un link de Drive no trae el nombre, y obtenerlo exige la API de Google. Si está vacío, se muestra el dominio del link.
- **`user_id` solo en `clients`.** Calendarios, piezas y eventos se filtran con un join a `clients`.
- **Fechas del calendario al volver a borrador.** Al volver desde enviado o al reabrir, `sent_at` y `approved_at` vuelven a null; la historia queda en `calendar_events`. Un `CHECK` mantiene coherentes estado y fechas: borrador sin fechas, enviado con `sent_at`, aprobado con las dos.
- **Validaciones repetidas en la base.** Las que no dependen de otra tabla también son `CHECK`: tema de 1 a 120 caracteres, idea de hasta 2000, link `http` o `https`, copia de piezas solo en eventos `approved`.

## Reglas

- **Totales.** No hay contadores guardados. Las consultas traen las piezas y los números salen de `src/domain`, para que la regla de "atrasada" viva en un solo lugar.
- **Orden de clientes.** Un cliente con el calendario aprobado y todo entregado va último, después de los que no tienen calendario: es el único que ese mes no pide nada.
- **Varias piezas por día.** Se permiten. Dentro de un día van por orden de creación.
- **Red de la pieza.** No tiene que estar entre las redes del cliente.
- **Link de archivo.** Se edita en calendarios aprobados, con la pieza en cualquier estado. En borrador y enviado no se muestra.
- **Eliminar un calendario reabierto.** Está permitido. La confirmación avisa que el cliente ya lo había aprobado y que se borra esa constancia.
- **Producción** es `VERCEL_ENV=production`. Ahí se ignora `APP_FAKE_TODAY`. El seed se niega a correr con `VERCEL_ENV` o `NODE_ENV` en `production`, y también si la base tiene un usuario que no es el de desarrollo.

## Pantallas

- Al abrir un calendario aprobado, el panel muestra la primera pieza sin entregar. La pieza elegida queda en la URL.
- "Lo que sigue" aparece solo si el calendario del mes actual está aprobado y le queda algo sin entregar.
- Un cliente archivado se abre desde "Clientes archivados" y muestra un aviso con "Desarchivar" en lugar de la frase del mes.
- El 12 de octubre no dice "feriado".
- Los textos que la especificación no fija se proponen en la fase de cada pantalla y se anotan acá cuando se aprueban.

## Calidad y proceso

- **TypeScript 6.0 y ESLint 9**, no las últimas (7 y 10): typescript-eslint todavía no soporta TypeScript 7, y los plugins de `eslint-config-next` no soportan ESLint 10.
- **Un commit por fase**, en `main`.
- **Test de punta a punta en producción.** Corre una vez, antes de que el community manager empiece a usar la app, con un cliente "Prueba E2E" que el test archiva al final. Después ese cliente se borra de la base, con aprobación previa.

## Para confirmar con el cliente

Se suman a la sección 12 de la especificación.

- **Atrasadas de meses anteriores.** Todo se mira por mes: el 2 de noviembre, una pieza del 30 de octubre sin entregar no aparece en Clientes ni en la frase del Cliente. Solo se ve en octubre o en la tabla de calendarios del cliente. En la v1 queda así.
