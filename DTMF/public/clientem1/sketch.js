const socket = io();
const waitingState = document.getElementById('waiting-state');
const maracaContainer = document.getElementById('maraca-container');
const statusMessage = document.getElementById('status-message');

let lastSentTime = 0;
const throttleDelay = 100; // Envía datos como máximo cada 100 ms

// 1. Manejar la señal para cambiar al Estado 3 (preparar la interfaz)
socket.on('cambiar_a_escena_3', () => {
    console.log('Cambiando a escena de la Maraca.');
    waitingState.style.display = 'none';
    maracaContainer.style.display = 'flex';
    statusMessage.textContent = 'Esperando que tomen la foto...';
});

// 2. ¡NUEVO MANEJADOR! Activamos la maraca cuando el servidor lo ordene
socket.on('activar_maraca', () => {
    console.log('Señal de activación de maraca recibida. Activando sensores.');

    // IMPORTANTE: Por seguridad en iOS, el acceso a sensores aún requiere una interacción del usuario.
    // Esto se soluciona si el usuario ya ha interactuado con la página.
    // Puedes considerar agregar un botón "Toca para empezar" en la pantalla de espera
    // o simplemente informar al usuario que podría necesitar tocar la pantalla si no funciona.
    
    // Si el navegador soporta la solicitud de permiso para sensores (iOS)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    console.log('Permiso de sensores concedido.');
                    window.addEventListener('devicemotion', handleMotion);
                    statusMessage.textContent = '¡Maraca activada! Agita para el beat.';
                } else {
                    statusMessage.textContent = 'Permiso denegado. No se puede activar la maraca.';
                }
            })
            .catch(console.error);
    } else {
        // Para navegadores que no requieren permiso (principalmente en Android)
        window.addEventListener('devicemotion', handleMotion);
        console.log('Permiso no requerido. Maraca activada.');
        statusMessage.textContent = '¡Maraca activada! Agita para el beat.';
    }
});

// 3. Procesar los datos de movimiento (esta función es la misma que antes)
function handleMotion(event) {
    const acceleration = event.acceleration;
    const magnitude = Math.sqrt(
        acceleration.x * acceleration.x +
        acceleration.y * acceleration.y +
        acceleration.z * acceleration.z
    );
    const threshold = 15;

    if (magnitude > threshold && (Date.now() - lastSentTime > throttleDelay)) {
        socket.emit('maraca_agitada', {
            x: acceleration.x,
            y: acceleration.y,
            z: acceleration.z
        });
        lastSentTime = Date.now();
    }
}