const socket = io();
const mainContainer = document.getElementById('main-container');

let maracaSound;
let maracaActivated = false;
let lastSentTime = 0;
const throttleDelay = 100;

// Función de P5.js para precargar assets
function preload() {
    maracaSound = loadSound('../assets/sonido/maracas.mp3');
}

// Función de P5.js que se ejecuta una vez
function setup() {
    noCanvas();
    
    // 1. Manejar la señal para el Estado 3 (crear la interfaz y esperar la foto)
    socket.on('cambiar_a_escena_3', () => {
        console.log('Señal recibida para el Estado 3. Creando la interfaz de la maraca.');
        
        // Crear dinámicamente los elementos de la interfaz. Esto lo hace el JS y no el HTML.
        const maracaContainer = document.createElement('div');
        maracaContainer.id = 'maraca-container';
        maracaContainer.innerHTML = `
            <h1>¡Prepárense!</h1>
            <p id="status-message">Esperando la foto...</p>
        `;
        
        mainContainer.appendChild(maracaContainer);
    });

    // 2. Manejador para el evento de activación de la maraca
    socket.on('activar_maraca', () => {
        console.log('Señal de activación de maraca recibida.');
        const statusMessage = document.getElementById('status-message');
        const title = mainContainer.querySelector('h1');

        if (title) title.textContent = "¡Es hora de agitar!";
        if (statusMessage) {
            statusMessage.textContent = '¡Maraca activada! Sacude tu teléfono...';
        }
        
        // La activación real de la maraca ocurre aquí
        maracaActivated = true;
        
        // IMPORTANTE: Solicitud de permiso para iOS y activación del listener
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        console.log('Permiso de sensores concedido.');
                        window.addEventListener('devicemotion', handleMotion);
                        maracaSound.play().catch(e => console.log("Audio desbloqueado."));
                    } else {
                        statusMessage.textContent = 'Permiso denegado. No se puede activar la maraca.';
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('devicemotion', handleMotion);
            maracaSound.play().catch(e => console.log("Audio desbloqueado."));
            console.log('Permiso no requerido. Maraca activada.');
        }
    });
}

// Función para procesar los datos de movimiento (devicemotion)
function handleMotion(event) {
    if (!maracaActivated) return;

    const acceleration = event.accelerationIncludingGravity;
    const rotation = event.rotationRate;
    
    const magnitude = Math.sqrt(
        acceleration.x * acceleration.x +
        acceleration.y * acceleration.y +
        acceleration.z * acceleration.z
    );

    const threshold = 20;

    if (magnitude > threshold && (Date.now() - lastSentTime > throttleDelay)) {
        console.log('¡Agitando! Enviando datos de sensores...');
        
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = '¡Agitando! 🎸';
            setTimeout(() => {
                if (statusMessage) {
                    statusMessage.textContent = '¡Maraca activada! Sacude tu teléfono...';
                }
            }, 500);
        }

        maracaSound.currentTime = 0;
        maracaSound.play();

        socket.emit('maraca_agitada', {
            acceleration: { x: acceleration.x, y: acceleration.y, z: acceleration.z },
            rotation: { alpha: rotation.alpha, beta: rotation.beta, gamma: rotation.gamma }
        });

        lastSentTime = Date.now();
    }
}