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

### Clientes (fase 4)

- **La tabla** es una grilla con roles ARIA de tabla (`table`, `row`, `cell`), para respetar las columnas exactas del mockup. Toda la fila es clickeable porque el link del nombre se estira sobre ella; así la fila sin calendario puede llevar su propio link.
- **Los filtros** filtran en el navegador, sin volver al servidor.
- **Alta y edición de clientes** en un diálogo (`<dialog>` nativo), porque la especificación no tiene rutas para eso.
  - Campos: "Nombre", "Rubro", "Contacto", "WhatsApp", "Redes que le manejás", "Cómo aprueba", "Notas" y "Cliente desde". Este último es un mes y un año en dos desplegables, porque `input type="month"` no anda en todos los navegadores.
  - Botones "Crear cliente" y "Guardar cambios" ("Guardando…" mientras espera), y "Cancelar".
- **Después de crear un cliente** se va a su pantalla, donde se arma su primer calendario.
- **"Crear calendario de octubre"**, en las filas sin calendario, es un botón con aspecto de link, porque crea algo: arma el calendario del mes que se está mirando y lo abre. Llegó en la fase 5.
- **Textos propuestos:**
  - Sin clientes: "Todavía no cargaste ningún cliente" y "Creá el primero y después armale el calendario del mes.", con el botón "Nuevo cliente".
  - Filtro vacío: "Ningún cliente tiene piezas atrasadas.", "Ningún calendario está esperando aprobación." y "Ningún calendario está en borrador."
  - Archivados: "No aparecen en Clientes y sus piezas no cuentan. Sus calendarios siguen guardados." y, vacío, "No tenés clientes archivados."
  - Datos vacíos del cliente: una raya ("—").
- **Contraste con los PNG:** las capturas se comparan con Chromium sin hinting de fuentes (`--font-render-hinting=none`), que es como se renderizaron los mockups. Así la pantalla Clientes coincide con `01-clientes.png` en todos los píxeles salvo 35 (0,002 %): la flecha de la fila con el mouse encima. Con el renderizado por defecto de Linux, el texto chico sale entre 3 y 4 % más ancho.

### Cliente (fase 5)

- **Crear calendarios se adelantó a esta fase.** La especificación lo pone en la fase 7, pero "Nuevo calendario", la frase de un mes sin calendario y la fila de Clientes lo necesitan. Crear un calendario lo deja en borrador y vacío, y abre su página. Si el mes ya tenía calendario, solo lo abre. Cargar piezas y las transiciones siguen en la fase 7.
- **"Nuevo calendario"** abre un diálogo con un desplegable "Mes". Propone el primer mes sin calendario a partir del actual y ofrece desde dos meses atrás hasta un año adelante, sin los que ya tienen calendario. Botones "Crear calendario" ("Creando…" mientras espera) y "Cancelar".
- **La página del calendario, por ahora,** tiene la ruta de navegación, el mes con sus flechas, la línea de estado y, si está aprobado, la frase con los números y los cuadraditos. Sin calendario: "Todavía no hay calendario de diciembre para Café Lumbre." y "Crear calendario". La grilla y el panel llegan en la fase 6.
- **Mes enviado:** hasta que la fase 7 traiga "Marcar como aprobado", la frase ofrece "Abrir el calendario de octubre".
- **Cliente archivado:**
  - La frase del mes se reemplaza por "Archivado el 6 oct. No aparece en Clientes y sus piezas no cuentan." y el botón "Desarchivar".
  - No muestra "Lo que sigue", "Nuevo calendario" ni "Archivar cliente", y el servidor no le crea calendarios: para armarle uno, primero se lo desarchiva.
  - Sus calendarios se siguen viendo y "Editar datos" sigue disponible.
- **Archivar y desarchivar no piden confirmación:** no borran nada y se deshacen con un clic. También se desarchiva desde "Clientes archivados".
- **La fecha de archivado** es el día real en que se archivó, con la hora de la base. En desarrollo, con `APP_FAKE_TODAY`, puede no coincidir con "Hoy es…".
- **Texto propuesto:** sin calendarios, "Todavía no armaste calendarios para este cliente."
- **Contraste con los PNG:** con el mismo método que en Clientes, la pantalla coincide con `02-cliente.png` y con `02-cliente-movil.png` en todos los píxeles.

### Calendario aprobado (fase 6)

- **Acciones de arriba.** "Exportar para el cliente" llega en la fase 8 y "Reabrir calendario" en la 7; hasta entonces no se muestran.
- **La pieza elegida** queda en la URL (`?pieza=`) sin recargar la página. Sin pieza en la URL, o si no es de ese calendario, se elige la primera sin entregar; si todas están entregadas, la primera del mes.
- **Cambios de estado.** Se ven al instante en el panel, la grilla, la frase y los cuadraditos. El servidor los rechaza si el calendario no está aprobado o si la pieza ya no estaba en el estado que mostraba la pantalla; entonces todo vuelve atrás y el panel muestra el motivo con borde de tinta, sin rojo.
- **Editar el link.** El mockup no muestra cómo se cambia un link ya cargado y la especificación pide que se pueda editar siempre: debajo del archivo va "Cambiar el link", en letra chica. "Pegar un link" y "Cambiar el link" abren en el panel los campos "Link" y "Nombre del archivo (opcional)", con "Guardar" ("Guardando…") y "Cancelar", y la aclaración "Para quitar el link, dejalo vacío y guardá."
- **En el celular**, al elegir una pieza la página baja hasta el panel, que queda debajo de la grilla.
- **El alto de los días** es de 142 px: el mockup pone 126 px más el relleno, sin `border-box`.
- **Contraste con los PNG:** con "Así hacemos el flat white" elegida, la pantalla coincide con `03-calendario.png` salvo los dos botones de arriba y "Cambiar el link". Lo mismo con las variantes de la pieza atrasada, la entregada y el celular.

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
  - "No se completó el ingreso con Google."
  - "No pudimos entrar con Google. Probá de nuevo."
  - "El email o la contraseña no son correctos."
  - "Hiciste demasiados intentos. Esperá un minuto y probá de nuevo."
  - "No pudimos iniciar la sesión. Probá de nuevo en un momento."
- Si se llegó al login desde otra página, después de entrar se vuelve a esa página. Solo se aceptan rutas de la app.

## Importar calendarios

Pedido por el cliente el 8 de octubre de 2026: arma los calendarios en Excel o en HTML y quiere cargarlos así. Cambia el "No construir: importar calendarios desde Excel" de la especificación y sigue lo que decía su sección 12 (columnas reconocidas y vista previa antes de confirmar). Se adelantó a las fases 6 y 7, como crear calendarios en la fase 5: hasta que llegue la grilla, lo importado se ve en la vista previa, en los números y en los cuadraditos.

- **Dónde.** Botón "Importar Excel o HTML" en la pantalla del calendario: en un mes sin calendario, junto a "Crear calendario"; en un borrador, arriba a la derecha. En enviado y aprobado no está, porque sus piezas están bloqueadas, y un cliente archivado no recibe calendarios.
- **Qué hace.** Crea el calendario si el mes no tenía y reemplaza las piezas del borrador; la vista previa avisa cuántas reemplaza. Con "El cliente ya lo aprobó" marcado, el calendario pasa a enviado y a aprobado en el momento, con sus dos eventos y la copia de las piezas tal como entraron; si no, queda en borrador. Las piezas conservan el estado del archivo y las fechas de "hecha" y "entregada" son las de la importación.
- **Archivos.** Excel `.xlsx` (todas las hojas) y páginas `.html` (todas las tablas). Un `.xls` viejo se rechaza explicando cómo guardarlo como `.xlsx`. Hasta 20 MB y 200 piezas por mes.
- **El archivo no sale del navegador.** Se lee ahí y al servidor llegan solo las piezas, que valida con Zod igual que el formulario de una pieza. No se guarda: no cambia "Subir archivos" de "No construir". Así el servidor nunca abre archivos que sube cualquier cuenta de Google.
- **HTML que se arma con un script.** Los calendarios HTML del cliente tienen la tabla vacía en el archivo y la llenan con un script al abrirse. La página se abre en un marco oculto con `sandbox`, sin el origen de la app (no llega a sus páginas, cookies ni almacenamiento) y con la Content Security Policy de la app (no carga nada de otros sitios). Sus scripts propios reciben el nonce de la página, la única forma en que esa política los deja correr; los scripts externos, estilos, imágenes y marcos se sacan antes. Al terminar de cargar devuelve su HTML. Si no responde en 5 segundos, se lee el archivo tal como vino. `read-excel-file` se usa en su versión `universal`, que no arranca workers: la política no los permite.
- **Cómo se encuentra la tabla.** Es la que tiene, en alguna de sus primeras 30 filas, una columna de fecha y otra de tema o de pieza; lo de arriba (títulos, notas) se saltea. Las tablas con las mismas columnas se leen como una (una por semana, una hoja por mes) y gana la que tiene más piezas del mes. Se saltean las filas vacías, las de una sola celda ("Semana 2") y los encabezados repetidos.
- **Columnas.** Se reconocen por su título, sin importar mayúsculas ni tildes:
  - fecha: "Fecha", "Día", "Fecha de publicación";
  - red: "Red", "Redes", "Red social", "Plataforma";
  - formato: "Formato", "Tipo", "Tipo de contenido";
  - tema: "Tema", "Título", "Concepto";
  - "Pieza": el formato en la primera línea y el tema debajo, como en el HTML del cliente ("Placa" / "Horarios del feriado"), o en una línea con dos puntos o guion;
  - idea: "Idea", "Idea concreta", "Copy", "Descripción", "Texto", "Guion", "Detalle";
  - estado: "Estado", "Filmación", "Filmado", "Subido", "Publicado".
  - Las demás se suman a la idea, debajo, con su título: "Objetivo: …", "CTA: …". Así no se pierde nada del archivo.
- **Fechas.** "6/10", "06/10/2026", "Mar 6/10", "martes 6 de octubre", "6 oct", "6" y las fechas de Excel. Sin año, el del calendario. Día y mes van en el orden argentino, salvo que solo el otro orden caiga en el mes del calendario. Las filas de otros meses no se importan y se cuentan aparte: "Importá el mismo archivo en noviembre para cargarla".
- **Red.** Si el archivo no la dice, la vista previa pregunta y propone la primera red del cliente. Una fila con dos redes ("IG y FB") no se importa: en la app cada pieza tiene una sola.
- **Placa.** Quinto formato (código `graphic`): "Placa", "la placa de Instagram". Es como el cliente llama a una imagen diseñada.
- **Estados.** "Falta filmar" y "No subido" son pendiente, "Filmado" es hecha y "Subido" es entregada; también se entienden los nombres de la app. Pueden venir en una columna o en dos (filmación y subida): gana el más avanzado, así "Filmado" y "No subido" es hecha. La app sigue diciendo Pendiente, Hecha y Entregada.
- **Filas con problemas.** La vista previa las lista con el motivo y el resto se puede importar igual: formato o red desconocidos, estado desconocido, falta la fecha o el tema, tema de más de 120 caracteres o idea de más de 2000 contando las columnas que se le suman.
- **Textos propuestos:** "Importar Excel o HTML"; "Un Excel (.xlsx) o una página web (.html) con el calendario. Se importan las piezas de octubre."; "Leyendo el archivo…"; "Encontramos 9 piezas de octubre."; "El archivo no tiene piezas de octubre."; "1 fila no se importa:"; "El archivo no dice la red de 9 piezas. ¿En qué red van?"; "El cliente ya lo aprobó", con "Entra aprobado con fecha de hoy y sus piezas empiezan a contar, cada una en el estado que dice el archivo." o "Entra en borrador: lo enviás y lo aprobás desde el calendario."; "Reemplaza las 4 piezas que tiene el calendario."; "Importar 9 piezas" ("Importando…"); "No encontramos la tabla de piezas. Tiene que tener una columna de fecha y otra de tema (o de pieza), cada una con su título arriba."

## Acceso y seguridad

- **Login con Google** (decidido el 6 de octubre de 2026, en lugar del email y la contraseña de la sección 7 de la especificación):
  - En producción es la única forma de entrar.
  - El script `user:create` se eliminó.
- **Puede entrar cualquier cuenta de Google** (decidido el 6 de octubre de 2026). Cambia lo que la especificación ponía en "Login de un único usuario" y en "No construir: varios usuarios":
  - El primer ingreso de una cuenta crea su usuario, que arranca sin clientes.
  - Cada cuenta ve y cambia solo sus propios clientes, calendarios y piezas: todas las consultas y Server Actions filtran por el usuario de la sesión, como pedía la especificación desde el principio.
  - Sigue sin haber roles, datos compartidos entre cuentas ni acceso de los clientes.
  - Cualquiera que tenga el link puede crearse una cuenta.
  - `ADMIN_EMAIL` quedó solo para el usuario de desarrollo.
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
- **Tests de navegador y la base.** Comparten la base durante toda la corrida; el seed se recarga al empezar y al terminar. Por eso un test que crea un cliente lo deja archivado al final, salvo el último de la corrida, y así los de Clientes cuentan solo los clientes del seed.
- **Test de punta a punta en producción.** Corre una vez, antes de que el community manager empiece a usar la app, con un cliente "Prueba E2E" que el test archiva al final. Después ese cliente se borra de la base, con aprobación previa. Como en producción solo se entra con Google, el test usa una sesión guardada a partir de un login manual.

## Para confirmar con el cliente

Se suman a la sección 12 de la especificación.

- **Atrasadas de meses anteriores.** Todo se mira por mes: el 2 de noviembre, una pieza del 30 de octubre sin entregar no aparece en Clientes ni en la frase del Cliente. Solo se ve en octubre o en la tabla de calendarios del cliente. En la v1 queda así.
- **Importar: el Excel real.** El lector se armó sobre un HTML real del cliente. Falta un Excel real para confirmar sus columnas y cómo escribe los estados.
- **Importar: piezas en dos redes.** Si en sus archivos es común "IG y FB" en una fila, hay que decidir si se importa como dos piezas.
- **Importar: actualizar un calendario aprobado.** Hoy se importa solo en un mes sin calendario o en borrador. Si quiere seguir llevando los estados en el Excel y volver a importarlo durante el mes, haría falta actualizar solo los estados de un calendario aprobado.
