const socket = io();
const mainContainer = document.getElementById('main-container');

let maracaSound;
let estadoActual = 0; // 0: Inicio, 2: Petardos/Tiros, 3: Maraca/Foto
let maracaActivated = false; // Controla la lógica de la Maraca (Estado 3)
let petardosActivated = false; // Controla la lógica de los Petardos (Estado 2)

// Variables para el sensor y throttling (compartidas por ambos estados)
let lastSentTime = 0;
<<<<<<< HEAD
const throttleDelay = 100;
=======
const throttleDelay = 100; // Limita el envío de datos a 10 veces por segundo
const FIREWORK_THRESHOLD = 30; // Umbral de movimiento para detectar un "disparo"
>>>>>>> d16cee38da256197cbfc966e4d26903af0aba7a1

function preload() {
    maracaSound = loadSound('./assets/sonido/maracas.mp3');
    // Si tienes un sonido para los fuegos artificiales, cárgalo aquí:
    // fireworkSound = loadSound('./assets/sonido/petardo.mp3');
}

function setup() {
    noCanvas();
    // Inicializar el listener de movimiento globalmente para ambos estados
    window.addEventListener('devicemotion', handleMotion);

    // 1. MANEJADOR PARA INICIAR EL ESTADO 2 (PETARDOS)
    socket.on('activar_estado_2_moviles', () => {
        console.log('Señal recibida: INICIAR ESTADO 2 (Petardos)');
        
<<<<<<< HEAD
        // Crear dinámicamente los elementos de la interfaz. Esto lo hace el JS y no el HTML.
        const maracaContainer = document.createElement('div');
        maracaContainer.id = 'maraca-container';
        maracaContainer.innerHTML = `
            <h1>¡Prepárense!</h1>
            <p id="status-message">Esperando la foto...</p>
=======
        // Limpiar estados anteriores
        estadoActual = 2;
        maracaActivated = false;
        
        // Crear la interfaz del Estado 2
        mainContainer.innerHTML = `
            <h1>¡Prepárate! 💣</h1>
            <p id="status-message">Cuando digan "tiros", ¡levanta tu móvil rápido!</p>
>>>>>>> d16cee38da256197cbfc966e4d26903af0aba7a1
        `;
        
        // Activar el sensor para los petardos
        petardosActivated = true; 
        
        // Solicitar permiso de sensor (necesario en iOS)
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        console.log('Permiso de sensores concedido y activado para Estado 2.');
                    }
                })
                .catch(console.error);
        }
    });

    // 2. MANEJADOR PARA INICIAR EL ESTADO 3 (MARACA)
    socket.on('cambiar_a_escena_3', () => {
        console.log('Señal recibida: INICIAR ESTADO 3 (Maraca)');
        estadoActual = 3;
        petardosActivated = false;
        
        // Crear la interfaz del Estado 3
        mainContainer.innerHTML = `
            <h1>Estado 3</h1>
            <p id="status-message">Esperando la foto...</p>
        `;
    });

    // ... (Mantener la lógica de activación de la maraca existente)
    socket.on('activar_maraca', () => {
        // ... (Tu lógica existente para activar maraca) ...
        // ... (Es importante que aquí se mantenga el código para maracaActivated = true;)
    });
}

<<<<<<< HEAD
// Función para procesar los datos de movimiento (devicemotion)
function handleMotion(event) {
    if (!maracaActivated) return;

=======
// 3. FUNCIÓN UNIFICADA PARA PROCESAR EL MOVIMIENTO
function handleMotion(event) {
    if (estadoActual === 2 && petardosActivated) {
        handleFireworkMotion(event);
    } else if (estadoActual === 3 && maracaActivated) {
        // Lógica de la maraca (que ya tenías)
        // La estoy dejando incompleta aquí, asume que tu código de maraca está completo
        // ... (Tu lógica existente para el Estado 3) ...
        // ... (Asegúrate de que la emisión de 'maraca_agitada' esté aquí) ...
    }
}

// 4. LÓGICA ESPECÍFICA PARA EL ESTADO 2 (PETARDOS)
function handleFireworkMotion(event) {
>>>>>>> d16cee38da256197cbfc966e4d26903af0aba7a1
    const acceleration = event.accelerationIncludingGravity;
    
<<<<<<< HEAD
=======
    // Calcular la magnitud del movimiento (similar a la maraca)
>>>>>>> d16cee38da256197cbfc966e4d26903af0aba7a1
    const magnitude = Math.sqrt(
        acceleration.x * acceleration.x +
        acceleration.y * acceleration.y +
        acceleration.z * acceleration.z
    );

<<<<<<< HEAD
    const threshold = 20;

    if (magnitude > threshold && (Date.now() - lastSentTime > throttleDelay)) {
        console.log('¡Agitando! Enviando datos de sensores...');
=======
    // Detectar un movimiento rápido y significativo
    if (magnitude > FIREWORK_THRESHOLD && (Date.now() - lastSentTime > throttleDelay)) {
        console.log('¡Movimiento de DISPARO detectado! Magnitud:', magnitude);
>>>>>>> d16cee38da256197cbfc966e4d26903af0aba7a1
        
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = '¡Fuego Artificial Lanzado! 💥';
            setTimeout(() => {
                if (statusMessage) statusMessage.textContent = '¡Levanta tu móvil rápido!';
            }, 500);
        }

<<<<<<< HEAD
        maracaSound.currentTime = 0;
        maracaSound.play();

        socket.emit('maraca_agitada', {
            acceleration: { x: acceleration.x, y: acceleration.y, z: acceleration.z },
            rotation: { alpha: rotation.alpha, beta: rotation.beta, gamma: rotation.gamma }
=======
        // 1. Opcional: Reproducir sonido de petardo aquí
        // fireworkSound.play();

        // 2. Enviar la señal al servidor
        socket.emit('lanzar_fuego_artificial', {
            mobileId: 'mobile_a', // Identificador para saber qué móvil disparó
            intensity: magnitude // Usar la intensidad para el tamaño del fuego artificial
>>>>>>> d16cee38da256197cbfc966e4d26903af0aba7a1
        });

        lastSentTime = Date.now();
    }
}