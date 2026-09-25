# Portada de cumpleaños · 1989

Sitio estático en HTML, CSS y JavaScript, sin compilación ni dependencias de aplicación.
Abre `index.html` o sirve esta carpeta con un servidor HTTP local.

## Vista previa al compartir

`index.html` incluye metadatos Open Graph estáticos para el enlace público `https://rotfflores.github.io/invitacionNuevaEra/`. La imagen `assets/alison-invitacion-social-v1.jpg` es una captura de la portada sin controles, de 1200 × 630 píxeles, con el nombre de Alison. Tanto el HTML como la imagen deben estar publicados para que WhatsApp pueda obtenerlos; la dirección local no es compartible. Si cambia el dominio, actualizar las URL absolutas del enlace canónico, `og:url`, `og:image`, `og:image:secure_url` y `twitter:image`. Al reemplazar la imagen, usar un nombre de archivo nuevo y actualizar esos metadatos.

- La invitación está personalizada para Alison en `index.html`.
- El primer toque en el fondo o texto de la portada, o en «ABRIR INVITACIÓN», reproduce `assets/out-of-the-woods.mp3`, la canción proporcionada por la usuaria, en bucle. El control «ACTIVAR AUDIO» permanece disponible en toda la invitación y permite escucharla o silenciarla; tocar el fondo o abrir después no anula el silencio elegido. Al abrir la invitación se detiene el video, mientras la canción continúa. Al ocultar la pestaña se pausa y al volver se reanuda si estaba activada. El video siempre está silenciado; con movimiento reducido permanece detenido y se muestra el fotograma estático aunque se escuche la canción.
- Los iconos son SVG integrados y no dependen de las fuentes o emojis del dispositivo.
- `assets/1989-background.mp4` es el video original proporcionado.
- `assets/1989-poster.jpg` es un fotograma de respaldo. El fondo azul permanece si los medios no cargan.
- La fuente Kalam se aloja localmente; su licencia está en `assets/OFL-Kalam.txt`.
- `invitation-content` contiene el encabezado Midnights y el expediente editorial de The Tortured Poets Department, y se oculta hasta pulsar el botón. No hay secciones posteriores.
- La portada bloquea el desplazamiento y lo libera al terminar la transición.
- El modo de movimiento reducido muestra el fotograma estático y abre sin animación.

El video vertical usa `object-fit: cover`, sin deformación. En pantallas anchas se recorta verticalmente; el punto focal prioriza a Taylor. Mostrar todo el video vertical en una pantalla panorámica sin recortarlo requeriría dejar espacio a los lados.

## Encabezado Midnights

`midnights.css` y `midnights.js` contienen el nuevo encabezado. La portada conserva su funcionamiento y emite `invitation:opened` al terminar su transición. Solo entonces se asignan las fuentes de video de Midnights. En teléfonos se usa un video a pantalla completa; en escritorio, un video vertical nítido y una copia desenfocada detrás. Ambos permanecen silenciados y se pausan cuando el encabezado sale de pantalla o la pestaña deja de estar activa. Con movimiento reducido se muestra únicamente el fotograma estático. El archivo de video original se copia sin recomprimir.

La edad y la fecha del encabezado siguen pendientes: editar `[EDAD]` y `[FECHA DEL EVENTO]` en `index.html`. Su contenido se conserva intacto. La flecha lleva a `event-details`.

## The Tortured Poets Department

El expediente de `event-details` usa HTML editable y tres imágenes originales creadas con la herramienta integrada image_gen: papel WebP, tinta y flor PNG transparentes (unos 58 KB en total). Los prompts y tamaños están en `assets/ttpd-generation.md`. No se descargaron fotografías ni portadas oficiales. Incluye sello, firma con la fuente local existente, entradas editoriales, enlace a Maps y cuenta regresiva. Los estilos y comportamiento están aislados en `event-details.css` y `event-details.js`.

La foto de Alison permanece como marcador explícito. Para incorporar su fotografía real, guardar el archivo en `assets/` y configurar `photoSrc` en `event-config.js`. Se muestra sin deformación con `object-fit: contain`, blanco y negro, contraste suave y grano CSS. Si falla la carga, se conserva el marcador. No se ha generado ningún rostro.

Los datos de ejemplo autorizados están centralizados en `event-config.js`: 13 de diciembre de 2026 a las 19:00, Parque México, Ciudad de México. No representan un evento confirmado. La dirección se contrastó con https://mexicocity.cdmx.gob.mx/venues/parque-mexico/ .

La fecha exige ISO 8601 con desplazamiento explícito y una zona IANA coincidente (`America/Mexico_City`). La cuenta regresiva usa el instante absoluto, independientemente de la zona del visitante, se actualiza al volver a pantalla y deja de ejecutar intervalos fuera de vista. Si faltan datos válidos, muestra campos pendientes; al llegar a cero muestra “THE CHAPTER HAS BEGUN”. Maps usa el lugar y dirección completos con `target="_blank"` y `rel="noopener noreferrer"`.

## Verificación

`verify.cjs` comprueba en Chromium la reproducción silenciada, el encuadre sin desbordamiento, la visibilidad del botón, el bloqueo del desplazamiento, la transición, el foco, el modo de movimiento reducido y el acceso cuando falla el video. Requiere Playwright y Microsoft Edge; ejecutar con un servidor local en el puerto 4173.

Las comprobaciones de tamaños móviles son emuladas. Falta validar en Safari de un iPhone y Chrome de un Android físicos. Los modos de ahorro de energía/datos o los ajustes del navegador pueden bloquear autoplay; el fotograma y el botón siguen disponibles. El video lleva `autoplay`, `muted`, `loop` y `playsinline`, y el código reafirma el silencio antes de solicitar la reproducción.

Las fotografías de Taylor de la sección Poets fueron proporcionadas por la usuaria y se copian sin alteraciones en assets/ttpd-taylor-portrait.jpg y assets/ttpd-taylor-tour.webp. Se muestran completas, sin filtros ni IA, y con pies de foto separados del marcador de Alison.
La imagen `assets/ttpd-taylor-albatross.jpg`, también proporcionada por la usuaria, se integra como impresión editorial sin filtros. La sección comienza directamente con papel crema, sin degradado de transición, y las entradas del evento ya no llevan numeración 01–04.

## Actualización: Reputation y referencia de modelo

Reputation es ahora la última sección. Contiene apertura de dos páginas, paleta interactiva, carrusel móvil y cuadrícula de escritorio con las tres fotos proporcionadas, sin IA ni filtros. Respeta movimiento reducido. Los archivos son reputation.css y reputation.js.

La foto de Albatross mencionada arriba fue retirada. El marcador de Alison ahora muestra una modelo de referencia provisional de Sensory Soft (Pexels), identificada como tal: https://www.pexels.com/photo/portrait-of-woman-in-black-dress-20337324/ . Se configura en event-config.js y debe sustituirse por la foto definitiva de Alison.
