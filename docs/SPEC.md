# Planificador: especificación de la versión 1

## 1. Qué es y para quién

Planificador es una app web privada para un community manager que maneja las redes de varios clientes.

Hoy arma un Excel por cliente con el calendario de contenido del mes, se lo manda al cliente y el cliente lo aprueba. Con varios clientes pierde de vista en qué quedó cada pieza. La app reemplaza ese Excel como lugar de trabajo: cada cliente tiene su apartado, ahí se carga el calendario de cada mes, y la app dice en todo momento qué le debe a cada cliente, qué ya hizo y qué ya entregó.

- **Usuario:** una sola persona, el community manager.
- **Los clientes no entran a la app.** La aprobación pasa por fuera (por WhatsApp) y él la registra.
- **La app no publica nada.** Él sigue programando las publicaciones en Meta.

## 2. Alcance

**La versión 1 incluye:**

- Login de un único usuario.
- Clientes: crear, editar, archivar y desarchivar.
- Calendarios mensuales por cliente: crear, cargar piezas, marcar como enviado, marcar como aprobado, reabrir.
- Seguimiento de cada pieza: pendiente, hecha, entregada.
- Resumen del mes y de cada cliente: debés, hechas sin entregar, entregadas, atrasadas.
- Exportar un calendario para mandárselo al cliente: vista imprimible (PDF desde el navegador) y Excel.
- Deploy en Vercel.

**No construir:**

- Publicar o programar en Instagram, Facebook o cualquier red, ni integrarse con sus APIs.
- Acceso de clientes, roles o varios usuarios.
- Subir archivos. De cada pieza se guarda solo un link.
- Notificaciones, recordatorios o mails.
- Feriados. El "feriado" que aparece el 12 de octubre en el mockup es decorativo.
- Importar calendarios desde Excel. Queda para después de la v1 (ver sección 12).

## 3. Reglas de negocio

### Vocabulario

La interfaz va en español rioplatense, con voseo. El código y la base van en inglés.

| En la interfaz | En el código | Qué es |
|---|---|---|
| Cliente | `client` | Un negocio al que le maneja las redes |
| Calendario | `calendar` | El plan de contenido de un cliente para un mes |
| Pieza | `piece` | Un contenido planificado para un día: un reel, un post, una historia |
| Borrador / Enviado / Aprobado | `draft` / `sent` / `approved` | Estados del calendario |
| Pendiente / Hecha / Entregada | `pending` / `done` / `delivered` | Estados de la pieza |
| Atrasada | `overdue` | Condición calculada, no es un estado |
| Debés | pending count | Piezas pendientes de calendarios aprobados |

### Estados del calendario

Hay un solo calendario por cliente y por mes.

| Estado | Qué significa | Qué se puede hacer |
|---|---|---|
| Borrador | Lo está armando; todavía no se lo mandó al cliente | Agregar, editar y borrar piezas. Exportar. Marcar como enviado. Eliminar el calendario |
| Enviado | Se lo mandó y espera respuesta | Piezas de solo lectura. Exportar. Marcar como aprobado. Volver a borrador |
| Aprobado | El cliente lo aprobó | Cambiar el estado de cada pieza y su link de archivo. Exportar. Reabrir |

Transiciones válidas, todas validadas en el servidor:

- Borrador a enviado: exige al menos una pieza. Guarda `sent_at`.
- Enviado a aprobado: guarda `approved_at`.
- Enviado a borrador: para corregir lo que pidió el cliente.
- Aprobado a borrador ("Reabrir"): pide confirmación. Las piezas conservan su estado, pero dejan de contar hasta que se apruebe de nuevo.

Cada transición se registra en `calendar_events`. Al aprobar se guarda además una copia de las piezas tal como estaban, para que quede constancia de qué aprobó el cliente.

En un calendario aprobado, la fecha, la red, el formato, el tema y la idea de cada pieza quedan bloqueados. Para cambiarlos hay que reabrirlo.

### Estados de la pieza

Pendiente, hecha, entregada. Se avanza o se retrocede de a un paso, y solo si el calendario está aprobado.

| Cambio | Efecto |
|---|---|
| Pendiente a hecha | `done_at` = ahora |
| Hecha a entregada | `delivered_at` = ahora |
| Entregada a hecha | `delivered_at` = null |
| Hecha a pendiente | `done_at` = null |

"Entregada" significa que él ya entregó o programó la pieza. La app no verifica nada: es un registro manual.

### Qué cuenta

- Solo cuentan las piezas de calendarios **aprobados** de clientes **no archivados**.
- **Debés:** piezas pendientes.
- **Hechas sin entregar:** piezas hechas.
- **Entregadas:** piezas entregadas.
- **Atrasada:** pieza no entregada cuya fecha es anterior a hoy. Se calcula, nunca se guarda. Las atrasadas ya están contadas en "debés" o en "hechas": no son un cuarto grupo.
- **Hoy** es la fecha actual en la zona horaria de la app (`APP_TIMEZONE`, por defecto `America/Argentina/Buenos_Aires`), no la fecha UTC del servidor.
- Los totales se calculan con consultas sobre los estados. No se guardan contadores.
- Las piezas de calendarios en borrador o enviados "no cuentan todavía". Se muestran aparte, con cuadraditos huecos.

### Orden de los clientes

En la pantalla Clientes, los más urgentes van primero:

1. Más piezas atrasadas.
2. Más piezas pendientes.
3. Más piezas hechas sin entregar.
4. Calendario enviado, primero el que lleva más días esperando.
5. Calendario en borrador.
6. Sin calendario ese mes.

Los empates se resuelven por nombre.

### Validaciones

- La fecha de una pieza tiene que caer dentro del mes de su calendario.
- Tema obligatorio, hasta 120 caracteres. Idea opcional, hasta 2000.
- El link de archivo, si existe, tiene que ser una URL `http` o `https`.
- Red y formato salen de listas fijas definidas en el código: redes Instagram (IG), Facebook (FB) y TikTok (TT); formatos Reel, Historia, Carrusel y Post.
- Nombre del cliente obligatorio.

## 4. Modelo de datos

PostgreSQL. Ids `uuid`. Todas las tablas llevan `created_at` y `updated_at` (`timestamptz`).

**`clients`**

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | FK al usuario de la librería de auth | Obligatoria. Toda consulta filtra por ella |
| `name` | `text` | Obligatoria |
| `industry` | `text` | Rubro |
| `contact_name`, `contact_phone` | `text` | |
| `networks` | `text[]` | Redes que le maneja |
| `approval_notes` | `text` | Cómo aprueba |
| `notes` | `text` | |
| `archived_at` | `timestamptz` null | Archivar en vez de borrar |

**`calendars`**

| Columna | Tipo | Notas |
|---|---|---|
| `client_id` | FK a `clients` | `on delete restrict` |
| `month` | `date` | Siempre el día 1 del mes, con `CHECK` |
| `status` | enum `draft`, `sent`, `approved` | Por defecto `draft` |
| `sent_at`, `approved_at` | `timestamptz` null | |

Restricción única sobre (`client_id`, `month`).

**`pieces`**

| Columna | Tipo | Notas |
|---|---|---|
| `calendar_id` | FK a `calendars` | `on delete cascade` |
| `date` | `date` | Día de publicación |
| `network`, `format` | `text` | Validadas contra las listas del código |
| `topic` | `text` | Tema. Obligatoria |
| `idea` | `text` null | Idea o copy |
| `status` | enum `pending`, `done`, `delivered` | Por defecto `pending` |
| `done_at`, `delivered_at` | `timestamptz` null | |
| `asset_url` | `text` null | Link al archivo |

Índice sobre (`calendar_id`, `date`). `CHECK` que mantenga coherentes el estado y las fechas: pendiente sin fechas, hecha con `done_at`, entregada con las dos.

**`calendar_events`**

| Columna | Tipo | Notas |
|---|---|---|
| `calendar_id` | FK a `calendars` | `on delete cascade` |
| `type` | enum `sent`, `approved`, `reopened`, `back_to_draft` | |
| `snapshot` | `jsonb` null | Copia de las piezas, solo en `approved` |

Más las tablas que necesite la librería de auth.

Hoy hay un solo usuario. `user_id` está igual para que sumar usuarios más adelante no obligue a migrar los datos.

## 5. Pantallas y rutas

Las tres pantallas aprobadas están en `docs/mockups/`. Los PNG son la referencia visual. Los `.mockup.html` tienen los valores exactos de tamaños, espacios y colores.

| Ruta | Pantalla |
|---|---|
| `/login` | Login |
| `/` | Clientes. Mes por `?mes=AAAA-MM`; por defecto el mes actual |
| `/clientes/archivados` | Clientes archivados |
| `/clientes/[clientId]` | Cliente |
| `/clientes/[clientId]/calendarios/[AAAA-MM]` | Calendario |
| `/clientes/[clientId]/calendarios/[AAAA-MM]/imprimir` | Vista imprimible |

Todo exige sesión, menos `/login`.

### Elementos comunes

- Barra superior: nombre "Planificador" con sus tres cuadraditos, "Hoy es lunes 5 de octubre" y "Salir".
- Ruta de navegación en Cliente y Calendario: Clientes / Café Lumbre / Octubre 2026.
- Fechas cortas en minúscula: "vie 2 oct", "el 28 sep". La semana empieza el lunes.
- Login: email, contraseña y "Entrar". No está en el mockup: usá el mismo lenguaje visual que el resto.

### Clientes (`01-clientes`)

- Selector de mes.
- Titular en una frase: "Debés 25 piezas, tenés 9 hechas sin entregar y ya entregaste 13." Cada número lleva adelante el cuadradito de su estado. Concordar singular y plural: "1 pieza", "1 hecha".
- Variantes del titular: si no hay pendientes ni hechas y sí entregadas, "Estás al día: entregaste las 13 piezas de octubre." Si no hay calendarios aprobados ese mes, "Todavía no tenés calendarios aprobados en octubre."
- Línea de atrasadas, solo si hay: "3 están atrasadas: 2 de Óptica Mirador y 1 de Café Lumbre."
- Nota de las que no cuentan, solo si hay: "No cuentan todavía: 8 piezas de Estudio Pampa, que tiene el calendario sin aprobar, y 6 de Impulso Funcional, que sigue en borrador."
- Filtros con su cantidad: Todos, Con atrasos, Esperando aprobación, En borrador.
- Botón "Nuevo cliente".
- Tabla, una fila por cliente. Toda la fila es un link al cliente. Columnas: Cliente (nombre y rubro), Calendario del mes (estado con ícono y detalle), Debés, Hechas, Entregadas, el mes pieza por pieza, Próxima entrega.
- "Pieza por pieza" es una fila de cuadraditos, uno por pieza, en orden de fecha.
- "Próxima entrega" es la fecha de la primera pieza no entregada. Debajo va "2 atrasadas" en rojo si las hay; si no, "ya está hecha" o "falta hacerla".
- Fila con calendario enviado: "Enviado", "hace 4 días, sin respuesta", guiones en los números, cuadraditos huecos de borde sólido, "Cuando apruebe".
- Fila con calendario en borrador: "Borrador", "sin enviar", guiones, cuadraditos huecos de borde punteado, "Cuando lo envíes".
- Fila sin calendario ese mes: "Sin calendario" y el link "Crear calendario de octubre".
- Pie: "Ordenados por urgencia: primero los que tienen piezas atrasadas." y "Ver clientes archivados".
- Sin clientes todavía: una invitación a crear el primero, no una tabla vacía.

### Cliente (`02-cliente`)

- Nombre, rubro y "Cliente desde julio de 2026".
- Frase del mes actual: "En octubre le debés 10 piezas, tenés 2 hechas sin entregar y ya le entregaste 3." Si hay una sola atrasada se la nombra: "1 está atrasada: el post de Facebook del viernes 2." Si hay más: "3 están atrasadas."
- Si el calendario del mes actual no está aprobado, la frase dice en qué estado está y ofrece la acción que sigue.
- Calendarios: tabla del más nuevo al más viejo con mes y estado, los tres números y los cuadraditos. Cada fila lleva a su calendario. Botón "Nuevo calendario", que propone el próximo mes sin calendario.
- "Lo que sigue en octubre": las próximas 5 piezas no entregadas del mes actual, con fecha, formato y red, tema y estado. Link "Abrir el calendario de octubre".
- Datos del cliente: contacto, WhatsApp, redes que le maneja, cómo aprueba, notas. "Editar datos" y "Archivar cliente", con la aclaración de que archivar no borra nada.

### Calendario (`03-calendario`)

El mockup muestra el estado **aprobado**. Los otros dos estados usan la misma grilla.

**Aprobado**

- Mes con flechas al mes anterior y al siguiente. Acciones "Exportar para el cliente" y "Reabrir calendario".
- Línea de estado: "Aprobado el 28 sep. Las fechas y los temas quedaron fijos: acá solo cambiás el estado de cada pieza."
- La frase con los tres números, la fila de cuadraditos y "1 está atrasada." o "Ninguna atrasada."
- Grilla del mes de lunes a domingo. Los días de otro mes van sombreados y vacíos. El día de hoy va marcado con "hoy".
- Cada pieza es un botón con el cuadradito de su estado, el formato, la red abreviada y el tema. Si está atrasada, dice "Atrasada".
- Al elegir una pieza, el panel lateral muestra: formato y red, tema, "Para el jueves 8 de octubre", la idea, los tres pasos con su fecha, la acción principal y el archivo.
- Acción principal según el estado: "Marcar como hecha" o "Marcar como entregada". Acción secundaria: "Volver a pendiente" o "Volver a hecha". Una pieza entregada muestra "Lista. No queda nada por hacer con esta pieza."
- Archivo: si hay link, el nombre del archivo y un botón que lo abre en una pestaña nueva. El botón dice "Abrir en Drive" si el link es de Google Drive y "Abrir archivo" en cualquier otro caso. Si no hay link, "Todavía no cargaste nada." y "Pegar un link". El link se puede editar siempre.
- Los cambios de estado se tienen que ver al instante y revertirse si el servidor los rechaza.
- Leyenda al pie de la grilla.

**Borrador** (no está en el mockup)

- Línea de estado: "Borrador: todavía no se lo mandaste."
- Cada día del mes permite agregar una pieza. Al elegir una pieza, el panel lateral es un formulario: fecha, red, formato, tema, idea, "Guardar" y "Eliminar pieza".
- Las piezas se ven neutras, sin color de estado: fondo blanco y borde fino.
- Acciones: "Marcar como enviado", deshabilitada si no hay piezas y explicando por qué; "Exportar para el cliente"; "Eliminar calendario", con confirmación.

**Enviado** (no está en el mockup)

- Línea de estado: "Enviado el 1 oct, hace 4 días."
- Grilla de solo lectura, piezas neutras.
- Acciones: "Marcar como aprobado", "Volver a borrador", "Exportar para el cliente".

**Sin calendario para ese mes:** "Todavía no hay calendario de noviembre para Café Lumbre." y "Crear calendario".

### Exportar

- **Vista imprimible:** hoja A4 apaisada con el nombre del cliente, el mes y una tabla de fecha, red, formato, tema e idea. Sin la barra ni los botones de la app. Un botón "Imprimir o guardar como PDF" que no sale en la impresión.
- **Excel:** las mismas columnas, una fila por pieza, generado en el servidor. Nombre: `calendario-cafe-lumbre-2026-10.xlsx`.
- Se puede exportar en cualquier estado del calendario.

## 6. Diseño

El diseño ya está aprobado. No lo reinterpretes: tomá los valores de `docs/mockups/`.

### Principios

- **El color significa estado y nada más.** El resto de la interfaz es tinta sobre papel.
- **La unidad es la pieza.** Todo número se puede contar también en cuadraditos, uno por pieza, en orden de fecha.
- **El titular es la respuesta en una frase**, no un tablero de tarjetas con números.
- **Una tabla es una tabla:** líneas finas y alineación. Sin tarjetas con sombra, sin degradados, sin emojis.
- **El color nunca va solo:** cada estado lleva además su forma y su texto.

### Colores

| Uso | Valor |
|---|---|
| Fondo de página | `#F6F7F9` |
| Superficies y celdas | `#FFFFFF` |
| Tinta: texto, botón principal, borde fuerte | `#171C28` |
| Texto secundario | `#535B6B` |
| Línea fina | `#D4D8E0` |
| Fila al pasar el mouse | `#ECEEF3` |
| Día de otro mes | `#EEF0F4` |
| Borde de cuadradito hueco | `#717A8A` |

| Estado | Sólido | Fondo de la pieza | Forma del cuadradito |
|---|---|---|---|
| Pendiente | `#F4B700` | `#FFF2C2` | Cuadrado amarillo con borde interior `#8F6B00` |
| Hecha | `#2457D6` | `#E2EAFD` | Cuadrado azul |
| Entregada | `#2E3545` | `#E7E9EE` | Cuadrado grafito |
| Atrasada | `#D62B1F` | `#FDE8E5` | Rombo rojo: el cuadrado girado 45°. Texto `#A51D13` |
| No cuenta, enviado | | | Hueco, borde sólido |
| No cuenta, borrador | | | Hueco, borde punteado |

El estado del calendario no usa color: va con ícono y texto. Lápiz para borrador, avión de papel para enviado, tilde en círculo para aprobado.

### Tipografía y medidas

- Una sola familia: **Archivo**, variable, con el eje de ancho (`wdth`). Cargarla con `next/font`.
- Titulares y números con ancho entre 105% y 112% y pesos 500, 700 y 800. Texto base de 15 px.
- Números con cifras tabulares.
- Contenedor de hasta 1296 px con 32 px a los lados.
- Botones y controles de al menos 44 px de alto. Radio de 8 px en botones, 6 px en piezas, 3 px en cuadraditos.

### Comportamiento

- En el celular, las tablas y la grilla se desplazan de costado dentro de su caja, y el panel lateral pasa abajo. Ver los PNG `-movil`.
- Controles reales: `button`, `a`, `input` con su `label`. Foco visible. Contraste AA.
- Armá componentes propios con Tailwind. No copies la estructura ni los estilos en línea de los `.mockup.html`.
- No uses una librería de componentes que imponga su estética. Para diálogos y menús podés usar primitivas accesibles sin estilo.

## 7. Stack y decisiones técnicas

- **Next.js** con App Router y **TypeScript** en modo estricto. Server Components por defecto y Server Actions para las mutaciones.
- **Tailwind CSS**, con los colores de la sección 6 como tokens del tema.
- **PostgreSQL en Neon.**
- **Drizzle ORM** con migraciones SQL versionadas en el repo. Nunca `push` contra producción.
- **Auth:** email y contraseña para un único usuario, sin registro público. Recomendado: Better Auth con `emailAndPassword.disableSignUp`. El usuario se crea con un script que lee `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- **Zod** para validar toda entrada en el servidor.
- **Vitest** para las reglas de dominio y **Playwright** para un recorrido completo.
- **ESLint y Prettier.** npm como gestor de paquetes.
- Usá las últimas versiones estables y consultá la documentación actual de cada librería antes de usar su API.

### Estructura

- `src/domain`: reglas puras, sin base ni React. Transiciones, conteos, atrasadas, orden de clientes, textos del titular.
- `src/db`: esquema, migraciones y consultas.
- `src/app`: rutas y Server Actions.
- `src/components`: componentes de interfaz.

### Fechas

- Un día de calendario es una fecha sin hora: columna `date` y cadena `AAAA-MM-DD` en TypeScript. No lo conviertas a `Date` con zona horaria.
- Los momentos (`sent_at`, `done_at`) son `timestamptz`.
- Una sola función devuelve "hoy" en `APP_TIMEZONE`. En desarrollo y en tests se puede fijar con `APP_FAKE_TODAY=2026-10-05`. En producción esa variable se ignora.

### Datos

- Las operaciones de varios pasos van en una transacción. Aprobar un calendario actualiza el estado, inserta el evento y guarda la copia, todo junto. Elegí un driver de Neon que soporte transacciones.
- Variables de entorno documentadas en `.env.example`: `DATABASE_URL`, las de la librería de auth, `APP_TIMEZONE`, `APP_FAKE_TODAY`.

## 8. Seguridad

- Verificá la sesión en cada Server Action, en cada route handler y en la capa de datos. El middleware solo no alcanza.
- Toda consulta filtra por `user_id`.
- Las transiciones y validaciones se hacen en el servidor. Lo que valida el cliente es comodidad.
- `asset_url`: aceptar solo `http` y `https`, y abrir con `rel="noopener noreferrer"`.
- Límite de intentos en el login.
- Secretos solo en variables de entorno. Nunca commitear `.env`.
- Cabeceras de seguridad razonables y `noindex` en toda la app.
- El seed de desarrollo se niega a correr en producción.

## 9. Calidad

- Tests de dominio para: transiciones válidas e inválidas, conteos, atrasadas en el borde de la zona horaria, orden de clientes, y singular y plural del titular.
- Un test de punta a punta: login, crear cliente, crear calendario, cargar piezas, enviar, aprobar, marcar una pieza como hecha y como entregada, y ver que los números cambian.
- `typecheck`, `lint` y `test` pasan antes de cada commit.
- Commits chicos, uno por paso con sentido.

## 10. Datos de ejemplo

El seed de desarrollo carga los datos del mockup. Con `APP_FAKE_TODAY=2026-10-05`, las pantallas tienen que coincidir con los PNG.

### Clientes y su calendario de octubre de 2026

| Cliente | Rubro | Calendario | Piezas | Entregadas | Hechas | Pendientes | Atrasadas |
|---|---|---|---|---|---|---|---|
| Óptica Mirador | Óptica | Aprobado el 29 sep | 8 | 1 | 0 | 7 | 2 (vie 2 y sáb 3) |
| Café Lumbre | Cafetería de especialidad | Aprobado el 28 sep | 15 | 3 | 2 | 10 | 1 |
| Vivero Las Lilas | Vivero | Aprobado el 30 sep | 12 | 3 | 4 | 5 | 0 |
| Panadería La Espiga | Panadería | Aprobado el 25 sep | 12 | 6 | 3 | 3 | 0 |
| Estudio Pampa | Estudio de arquitectura | Enviado el 1 oct | 8 | | | | |
| Impulso Funcional | Gimnasio | Borrador | 6 | | | | |

Totales esperados: debés 25, hechas 9, entregadas 13, atrasadas 3.

- Vivero Las Lilas: su primera pieza no entregada es la del martes 6 y está hecha.
- Panadería La Espiga: su primera pieza no entregada es la del miércoles 7 y está hecha.
- Para los clientes que no son Café Lumbre, inventá temas verosímiles que respeten estas cantidades.

### Café Lumbre

Contacto: Carla Benítez, dueña. WhatsApp 11 5555-0142. Redes: Instagram y Facebook. Cómo aprueba: "Por WhatsApp. Suele tardar dos o tres días." Notas: "Tono cercano, sin emojis en los copies. Las fotos del local las manda ella los lunes." Cliente desde julio de 2026.

Otros calendarios: noviembre de 2026 en borrador con 4 piezas; septiembre de 2026 aprobado el 27 ago con 14 entregadas; agosto de 2026 aprobado el 29 jul con 12 entregadas.

Octubre de 2026, enviado el 24 sep y aprobado el 28 sep:

| Día | Formato | Red | Tema | Estado | Hecha | Entregada |
|---|---|---|---|---|---|---|
| 1 | Reel | Instagram | Día Internacional del Café | Entregada | 28 sep | 29 sep |
| 2 | Post | Facebook | Promo de octubre | Pendiente | | |
| 3 | Historia | Instagram | Dos por uno en medialunas | Entregada | 30 sep | 1 oct |
| 5 | Carrusel | Instagram | Carta de primavera | Entregada | 1 oct | 2 oct |
| 7 | Post | Facebook | Horarios del feriado | Hecha | 2 oct | |
| 8 | Reel | Instagram | Así hacemos el flat white | Hecha | 4 oct | |
| 10 | Historia | Instagram | Encuesta: ¿frío o caliente? | Pendiente | | |
| 13 | Post | Instagram | Nuevo blend de Colombia | Pendiente | | |
| 15 | Reel | Instagram | Detrás de la barra | Pendiente | | |
| 17 | Historia | Instagram | Desayuno para regalar | Pendiente | | |
| 18 | Post | Instagram | Feliz Día de la Madre | Pendiente | | |
| 21 | Post | Facebook | Taller de latte art | Pendiente | | |
| 23 | Carrusel | Instagram | Cinco tips para el café en casa | Pendiente | | |
| 27 | Reel | Instagram | Clientes de la casa | Pendiente | | |
| 30 | Post | Instagram | Lo que viene en noviembre | Pendiente | | |

La pieza del día 2 es la atrasada. Las ideas de cada pieza están en el `script` de `docs/mockups/03-calendario.mockup.html`. Las cinco piezas con fecha de "hecha" tienen link de archivo: usá URLs de ejemplo.

## 11. Fases

Una fase por vez. Cada una termina con `typecheck`, `lint` y `test` en verde, un commit y un resumen de qué quedó hecho y qué sigue.

| Fase | Qué se construye | Cómo se comprueba |
|---|---|---|
| 0. Base | Proyecto Next.js, TypeScript estricto, Tailwind con los tokens, Archivo, ESLint, Prettier, Vitest. Completar los comandos en `CLAUDE.md` y crear `.env.example` | La app levanta y los tres comandos pasan |
| 1. Datos | Esquema, migraciones, función de "hoy" y seed | La base tiene los datos de la sección 10 |
| 2. Login y primer deploy | Auth de un usuario, script para crearlo, protección de todas las rutas, deploy en Vercel con Neon | Sin sesión no se ve nada; con sesión se entra |
| 3. Reglas de dominio | `src/domain` completo, con sus tests | Los tests cubren la sección 3 |
| 4. Clientes | Pantalla Clientes, y alta y edición de clientes | Coincide con `01-clientes.png` y los totales dan 25, 9, 13 y 3 |
| 5. Cliente | Pantalla Cliente, archivar y desarchivar | Coincide con `02-cliente.png` |
| 6. Calendario aprobado | Grilla, panel y cambios de estado | Coincide con `03-calendario.png`; al marcar piezas cambian los números |
| 7. Calendario en borrador y enviado | Crear calendario, cargar piezas y todas las transiciones | Se arma un calendario nuevo y se lo lleva hasta aprobado |
| 8. Exportar | Vista imprimible y Excel | El PDF y el Excel tienen todas las piezas del mes |
| 9. Cierre | Test de punta a punta, repaso de seguridad y de accesibilidad | El recorrido completo pasa en producción |

Si el generador de proyectos se queja de que la carpeta no está vacía por `CLAUDE.md` y `docs/`, generá el proyecto en una carpeta temporal y mové los archivos.

**La v1 está terminada cuando** él puede crear un cliente, cargarle el calendario de un mes, marcarlo como enviado y como aprobado, llevar cada pieza hasta entregada y ver en las tres pantallas qué debe, qué hizo y qué entregó, todo en producción y detrás del login.

## 12. Pendientes a confirmar con el cliente

No frenan la v1. Si alguno te traba, preguntá antes de decidir.

- **Importar desde Excel.** No se sabe si quiere seguir armando el calendario en Excel o pasar a armarlo en la app. La v1 lo carga en la app. Si después lo pide, la importación va con columnas fijas (fecha, red, formato, tema) y una vista previa antes de confirmar.
- **Listas de redes y de formatos.** Las de la sección 3 son un punto de partida.
- **Zona horaria.** Se asume Buenos Aires.
