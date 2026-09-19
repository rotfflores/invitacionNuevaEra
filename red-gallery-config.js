// Red Memory Archive — keep between 8 and 12 entries in this list.
// To add a real photo, set src to a local file such as "assets/red/recuerdo-01.jpg".
// `position` controls the crop only in the small Polaroid; the full viewer uses contain.
window.RED_MEMORY_ARCHIVE = Object.freeze({
  memories: [
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'A memory waiting to happen', date: 'ADD DATE', note: 'Aquí puede vivir una primera aventura.', position: 'center 22%', shape: 'feature' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'The little things', date: 'ADD DATE', note: 'Una risa que merece quedarse.', position: 'center 28%', shape: 'portrait' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'Golden hour', date: 'ADD DATE', note: 'Un día para volver a mirar.', position: 'center 20%', shape: 'square' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'Long story short', date: 'ADD DATE', note: 'El inicio de otra buena historia.', position: 'center 25%', shape: 'wide' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'Autumn leaves', date: 'ADD DATE', note: 'El tipo de tarde que se queda.', position: 'center 30%', shape: 'portrait' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'A little detour', date: 'ADD DATE', note: 'Una página fuera del itinerario.', position: 'center 24%', shape: 'square' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'The best kind of chaos', date: 'ADD DATE', note: 'Un recuerdo para contar mil veces.', position: 'center 19%', shape: 'wide' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'Stay beautiful', date: 'ADD DATE', note: 'Una escena que merece marco.', position: 'center 28%', shape: 'portrait' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'Dancing around the kitchen', date: 'ADD DATE', note: 'La banda sonora está pendiente.', position: 'center 21%', shape: 'square' },
    { src: 'assets/alison-model-reference.jpg', alt: 'Modelo de referencia provisional para los recuerdos de Alison', title: 'A new chapter', date: 'ADD DATE', note: 'Guarda este espacio para una historia futura.', position: 'center 25%', shape: 'wide' },
  ],
  special: {
    src: 'assets/alison-model-reference.jpg',
    alt: 'Modelo de referencia provisional para la Polaroid final de Alison',
    title: 'The next memory',
    position: 'center 24%',
  },
});
