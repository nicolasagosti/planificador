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
- **Cambiar la contraseña** del usuario de desarrollo (con el seed) cierra todas sus sesiones abiertas.
- **Momentos.** `updated_at`, y más adelante `done_at` y `delivered_at`, toman la hora de la base (`now()`), no la del servidor de la app.

## Pantallas

- Al abrir un calendario aprobado, el panel muestra la primera pieza sin entregar. La pieza elegida queda en la URL.
- "Lo que sigue" aparece solo si el calendario del mes actual está aprobado y le queda algo sin entregar.
- Un cliente archivado se abre desde "Clientes archivados" y muestra un aviso con "Desarchivar" en lugar de la frase del mes.
- El 12 de octubre no dice "feriado".
- Los textos que la especificación no fija se proponen en la fase de cada pantalla y se anotan acá cuando se aprueban.

### Textos propuestos (fase 3, a confirmar al ver cada pantalla)

Están en `src/domain/phrases.ts` y tienen tests. Los de la especificación salen tal cual; estos son los que no fijaba.

- **Clientes**
  - Todo entregado con una sola pieza: "Estás al día: entregaste la única pieza de octubre."
  - Atrasadas de un solo cliente: "1 está atrasada: es de Café Lumbre." y "2 están atrasadas: son de Óptica Mirador."
  - Calendario enviado hoy o ayer: "hoy, sin respuesta" y "ayer, sin respuesta".
  - "Próxima entrega" con todo entregado: "Todo entregado".
  - "No cuentan todavía" con varios clientes: "8 piezas de Estudio Pampa y 5 de Vivero, que tienen el calendario sin aprobar, y 2 de Alfa y 3 de Beta, que siguen en borrador."
- **Cliente**
  - Todo entregado: "Estás al día: le entregaste las 15 piezas de octubre." Con una sola: "…la única pieza de octubre."
  - Mes sin calendario: "Todavía no hay calendario de octubre para Café Lumbre.", con la acción "Crear calendario de octubre".
  - Mes en borrador: "El calendario de octubre está en borrador: todavía no se lo mandaste.", con "Seguir armándolo".
  - Mes enviado: "Le mandaste el calendario de octubre el 1 oct y todavía no lo aprobó.", con "Marcar como aprobado".
  - Tabla de calendarios, uno enviado: "Enviado el 1 oct, sin respuesta".
- **Calendario**
  - Enviado hoy o ayer: "Enviado hoy." y "Enviado ayer."
  - Pasos de una pieza marcada en el día: "hoy".
  - Archivo sin nombre: se muestra el sitio del link ("drive.google.com").
  - La leyenda nombra solo las redes que usa el calendario ("IG es Instagram, FB es Facebook y TT es TikTok").
- **Avisos cuando el servidor rechaza un cambio**
  - "Agregá al menos una pieza para poder enviarlo."
  - "El calendario cambió de estado mientras tanto. Recargá la página."
  - "El estado de las piezas cambia solo en un calendario aprobado."
  - "La pieza cambió mientras tanto. Recargá la página y probá de nuevo."
- **Validaciones:** los mensajes están en `src/domain/schemas.ts`. Topes que la especificación no daba:
  - nombre, rubro y contacto del cliente, 120 caracteres;
  - teléfono, 40;
  - "Cómo aprueba", 1000;
  - notas, 2000;
  - nombre del archivo, 200;
  - link, 2000.

### Login

- Título "Entrá con tu cuenta" y botón "Entrar con Google" ("Yendo a Google…" mientras espera).
- El botón usa el estilo de la app y no el logo de colores de Google, para respetar que el color significa estado. Las pautas de marca de Google solo se exigen si la app de OAuth se publica y verifica.
- Fuera de producción, debajo y con el título "Con contraseña, solo en desarrollo": campos "Email" y "Contraseña" y botón "Entrar" ("Entrando…" mientras espera).
- Errores, en un recuadro con borde de tinta y sin rojo, porque el rojo significa "atrasada":
  - "Esa cuenta de Google no tiene acceso al Planificador."
  - "No se completó el ingreso con Google."
  - "No pudimos entrar con Google. Probá de nuevo."
  - "El email o la contraseña no son correctos."
  - "Hiciste demasiados intentos. Esperá un minuto y probá de nuevo."
  - "No pudimos iniciar la sesión. Probá de nuevo en un momento."
- Si se llegó al login desde otra página, después de entrar se vuelve a esa página. Solo se aceptan rutas de la app.

## Acceso y seguridad

- **Login con Google** (decidido el 6 de octubre de 2026, en lugar del email y la contraseña de la sección 7 de la especificación):
  - En producción es la única forma de entrar.
  - Solo puede entrar la cuenta de Google de `ADMIN_EMAIL`, y su primer ingreso crea el usuario. Better Auth no deja crear otro usuario ni abrir sesión con otra cuenta, y una sesión de otra cuenta cuenta como ninguna.
  - El script `user:create` se eliminó.
  - El email y la contraseña quedan solo fuera de producción, para desarrollo y para los tests de navegador, porque el login de Google no se puede automatizar.
- **Límite de intentos:** 5 logins con contraseña por minuto por IP, guardados en Postgres. En memoria no serviría en Vercel, porque cada instancia contaría aparte. El límite de Better Auth solo vale para los pedidos a `/api/auth`, así que el login entra por ahí y no por una Server Action.
- **Verificación de la sesión:** el proxy solo mira que exista la cookie, para mandar rápido a `/login`. La sesión se verifica de verdad en cada página, Server Action, route handler y consulta (`requireUser()`).
- **Content Security Policy con nonce por request.** Por eso todas las páginas se renderizan por request.
- **Duración de la sesión:** la de Better Auth por defecto, 7 días, que se renuevan con el uso.

## Datos de ejemplo

- Además de los temas, se inventaron los datos de contacto, las notas y el "cliente desde" de los clientes que no son Café Lumbre, con teléfonos ficticios `11 5555-01xx`.
- Los calendarios de agosto y septiembre de Café Lumbre se entregaron a tiempo: cada pieza se hizo dos días antes de su fecha y se entregó el día anterior.
- Los momentos del seed se guardan a las 15:00 de Buenos Aires, para que caigan en el día indicado.

## Calidad y proceso

- **TypeScript 6.0 y ESLint 9**, no las últimas (7 y 10): typescript-eslint todavía no soporta TypeScript 7, y los plugins de `eslint-config-next` no soportan ESLint 10.
- **Driver de base: `pg` (node-postgres) por TCP**, no `@neondatabase/serverless`. Es lo que Neon recomienda hoy para Vercel con Fluid compute: un pool por instancia, con `attachDatabasePool` de `@vercel/functions` para cerrar las conexiones inactivas antes de que la función se suspenda. Soporta transacciones. El driver de Neon queda para entornos sin proceso persistente.
- **Deploy:** funciones en São Paulo (`gru1`), en la misma región que la base. Las migraciones se aplican en el build, solo en el deploy de producción y por la conexión directa.
- **Un commit por fase**, en `main`.
- **Test de punta a punta en producción.** Corre una vez, antes de que el community manager empiece a usar la app, con un cliente "Prueba E2E" que el test archiva al final. Después ese cliente se borra de la base, con aprobación previa. Como en producción solo se entra con Google, el test usa una sesión guardada a partir de un login manual.

## Para confirmar con el cliente

Se suman a la sección 12 de la especificación.

- **Atrasadas de meses anteriores.** Todo se mira por mes: el 2 de noviembre, una pieza del 30 de octubre sin entregar no aparece en Clientes ni en la frase del Cliente. Solo se ve en octubre o en la tabla de calendarios del cliente. En la v1 queda así.
