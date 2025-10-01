const socket = io();

// 1. REFERENCIAS A BOTONES DE CONTROL DE ESTADO
const btnEstado2 = document.getElementById('btn-estado2');  // ¡NUEVO! Referencia al botón del Estado 2
const btnEstado3 = document.getElementById('btn-estado3');
const btnFoto = document.getElementById('btn-foto');
const btnFinalizar = document.getElementById('btn-finalizar');

// 2. REFERENCIAS A BOTONES DE MÚSICA
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const forwardBtn = document.getElementById('forward-btn');

// --- MANEJADORES DE EVENTOS DE ESTADO ---

// NUEVO MANEJADOR: INICIAR ESTADO 2 (Petardos/Tiros)
btnEstado2.addEventListener('click', () => {
    console.log('Enviando señal para activar el Estado 2 (Petardos)...');
    // Emitir el evento al servidor que ya programamos
    socket.emit('iniciar_estado_2');
});


// Cuando se hace clic en el botón de "Activar Estado 3"
btnEstado3.addEventListener('click', () => {
    console.log('Enviando señal para activar el Estado 3...');
    // NOTA: Asumo que en el servidor, 'activar_estado_3' funciona como 'cambiar_a_escena_3'
    socket.emit('activar_estado_3');
});

// Cuando se hace clic en el botón de "Habilitar Foto"
btnFoto.addEventListener('click', () => {
    console.log('Enviando señal para habilitar la foto...');
    socket.emit('habilitar_foto_desktop');
});

// Cuando se hace clic en el botón de "Finalizar"
btnFinalizar.addEventListener('click', () => {
    console.log('Enviando señal para finalizar la experiencia...');
    socket.emit('finalizar_experiencia');
});

// --- MANEJADORES DE EVENTOS DE MÚSICA ---

// Enviar comandos de música al servidor
playBtn.addEventListener('click', () => {
    socket.emit('control_musica', 'play');
});

pauseBtn.addEventListener('click', () => {
    socket.emit('control_musica', 'pause');
});

forwardBtn.addEventListener('click', () => {
    socket.emit('control_musica', 'forward');
});