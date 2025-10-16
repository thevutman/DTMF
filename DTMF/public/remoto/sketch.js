const socket = io();

const btnEscena1 = document.getElementById('btn-escena1');
const btnEstado2 = document.getElementById('btn-estado2');
const btnEstado3 = document.getElementById('btn-estado3');
const btnFoto = document.getElementById('btn-foto');
const btnFinalizar = document.getElementById('btn-finalizar');

const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const forwardBtn = document.getElementById('forward-btn');

btnEscena1.addEventListener('click', () => {
    console.log('Remoto: Activando escena 1.');
    socket.emit('activar_escena_1');
});

btnEstado2.addEventListener('click', () => {
    console.log('Remoto: Activando escena 2 (fuegos).');
    socket.emit('iniciar_estado_2');
});

btnEstado3.addEventListener('click', () => {
    console.log('Remoto: Activando escena 3 (foto).');
    socket.emit('activar_estado_3');
});

btnFoto.addEventListener('click', () => {
    console.log('Remoto: Habilitando botón de foto.');
    socket.emit('habilitar_foto_desktop');
});

btnFinalizar.addEventListener('click', () => {
    console.log('Remoto: Finalizando experiencia.');
    socket.emit('finalizar_experiencia');
});

playBtn.addEventListener('click', () => {
    socket.emit('control_musica', 'play');
});

pauseBtn.addEventListener('click', () => {
    socket.emit('control_musica', 'pause');
});

forwardBtn.addEventListener('click', () => {
    socket.emit('control_musica', 'forward');
});
