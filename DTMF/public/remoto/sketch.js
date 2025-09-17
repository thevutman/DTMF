const socket = io();

const btnEstado3 = document.getElementById('btn-estado3');
const btnFoto = document.getElementById('btn-foto');
const btnFinalizar = document.getElementById('btn-finalizar');

// Cuando se hace clic en el botón de "Activar Estado 3"
btnEstado3.addEventListener('click', () => {
    console.log('Enviando señal para activar el Estado 3...');
    // Emitir el evento al servidor
    socket.emit('activar_estado_3');
});

// Cuando se hace clic en el botón de "Habilitar Foto"
btnFoto.addEventListener('click', () => {
    console.log('Enviando señal para habilitar la foto...');
    // Emitir el evento al servidor
    socket.emit('habilitar_foto_desktop');
});

// Cuando se hace clic en el botón de "Finalizar"
btnFinalizar.addEventListener('click', () => {
    console.log('Enviando señal para finalizar la experiencia...');
    // Emitir el evento al servidor
    socket.emit('finalizar_experiencia');
});