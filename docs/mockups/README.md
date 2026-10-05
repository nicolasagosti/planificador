# Mockups aprobados

Estas son las tres pantallas que aprobó el cliente. Son la referencia de diseño de la app.

| Archivo | Qué es |
|---|---|
| `01-clientes.png` | Pantalla Clientes, a 1360 px de ancho |
| `02-cliente.png` | Pantalla Cliente |
| `03-calendario.png` | Calendario aprobado, con una pieza hecha elegida |
| `03-calendario-pieza-atrasada.png` | El mismo calendario con la pieza atrasada elegida |
| `03-calendario-pieza-entregada.png` | El mismo calendario con una pieza entregada elegida |
| `*-movil.png` | Las mismas pantallas a 390 px de ancho |
| `*.mockup.html` | La fuente de cada pantalla, con los valores exactos |

Los datos son inventados. "Hoy" es el lunes 5 de octubre de 2026.

## Cómo leer los `.mockup.html`

Están en el formato de la herramienta de diseño y no se abren solos en el navegador. Sirven para leer valores, no para copiar.

- Todo el estilo está en línea, en el atributo `style`.
- `style-hover` es el estilo al pasar el mouse.
- `{{valor}}` es un dato que calcula el `script` del final del archivo.
- `<sc-for>` repite su contenido por cada elemento de una lista. `<sc-if>` lo muestra según una condición.
- El `script` de `03-calendario.mockup.html` tiene los datos de ejemplo de Café Lumbre y la lógica de estados del prototipo.
