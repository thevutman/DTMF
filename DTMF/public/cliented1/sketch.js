const socket = io();
let video;
const state3Container = document.getElementById('state-3-container');

// Declaramos la variable al inicio, pero sin asignarle valor todavía
let videoContainer; 
let btnTomarFoto;

// La función setup de P5.js ahora está vacía
function setup() {
    // La inicialización de P5.js se hace con esta función vacía
}

// Esta función se ejecuta continuamente para dibujar en el canvas
function draw() {
    // Dibuja el video solo si ya ha sido inicializado y la variable videoContainer existe
    if (video && videoContainer) {
        image(video, 0, 0, videoContainer.offsetWidth, videoContainer.offsetHeight);
    }
}

// Escuchar el evento del servidor para cambiar de estado
socket.on('cambiar_a_escena_3', () => {
    console.log('Señal recibida. Creando la interfaz del Estado 3.');
    
    // Crear dinámicamente los elementos de la interfaz
    const title = document.createElement('h1');
    title.textContent = '¡Prepárense para la foto!';
    
    // Asignamos el elemento HTML a la variable declarada al inicio
    videoContainer = document.createElement('div');
    videoContainer.id = 'video-container';
    
    btnTomarFoto = document.createElement('button');
    btnTomarFoto.id = 'btn-tomar-foto';
    btnTomarFoto.textContent = 'Tomar Foto';
    btnTomarFoto.disabled = true;

    // Agregar los elementos al DOM
    state3Container.appendChild(title);
    state3Container.appendChild(videoContainer);
    state3Container.appendChild(btnTomarFoto);
    
    // Iniciar la cámara con P5.js
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    
    // Añadir el listener al botón dinámico
    btnTomarFoto.addEventListener('click', () => {
        let img = video.get();
        let imageData = img.canvas.toDataURL('image/jpeg', 0.9);
        
        socket.emit('foto_tomada', imageData);
        console.log('Foto tomada y enviada al servidor.');
        
        btnTomarFoto.disabled = true;
        btnTomarFoto.textContent = 'Foto Enviada';
    });
});

// Escuchar el evento del servidor para habilitar el botón
socket.on('habilitar_foto', () => {
    console.log('Botón habilitado por el servidor.');
    if (btnTomarFoto) {
        btnTomarFoto.disabled = false;
        btnTomarFoto.textContent = '¡Sonríe!';
    }
});