const socket = io();
const mainContainer = document.getElementById('main-container');

// ------------------------------------
// VARIABLES DE ESTADO Y CONTROL
// ------------------------------------
let estadoActual = 0; // 0: Inicio, 2: Petardos/Tiros, 3: Stickers
let petardosActivated = false; 
let stickersActivated = false; 

// Variables de Petardos/Sensores
let lastSentTime = 0;
const throttleDelay = 100;
const FIREWORK_THRESHOLD = 30; // Umbral de movimiento para detectar un "disparo"
const MOBILE_ID = 'mobile_b'; 

// Variables de Stickers (Asegúrate de que existan en tu HTML al activar el Estado 3)
let stickerGhost = null;
let currentStickerId = null;
let stickerPlaced = false; 
// ------------------------------------

// DEBE IR FUERA DE CUALQUIER FUNCIÓN: Inicializa el listener de movimiento globalmente
window.addEventListener('devicemotion', handleMotion);

// ------------------------------------
// SETUP Y MANEJADORES DE SOCKET.IO
// ------------------------------------

// Este cliente no usa P5.js, así que usamos una función simple para la inicialización.
function setup() { 
    // No necesitamos noCanvas() si no usamos P5.js, pero lo dejamos si lo usabas antes.
} 


// 1. MANEJADOR PARA INICIAR EL ESTADO 2 (PETARDOS)
socket.on('activar_estado_2_moviles', () => {
    console.log(`Mobile B: Señal recibida: INICIAR ESTADO 2 (Petardos)`);
    
    // Cambiar estado y desactivar stickers
    estadoActual = 2;
    stickersActivated = false;
    
    // Crear la interfaz del Estado 2
    mainContainer.innerHTML = `
        <h1>¡Prepárate! 💣</h1>
        <p id="status-message">¡Levanta tu móvil rápido para lanzar petardos!</p>
    `;
    
    petardosActivated = true; 
    
    // Lógica para solicitar permiso de sensor (necesario en iOS)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') console.log('Mobile B: Sensores activados.');
            })
            .catch(console.error);
    }
});


// 2. MANEJADOR PARA INICIAR EL ESTADO 3 (STICKERS)
socket.on('activar_stickers', () => { 
    console.log('Mobile B: Señal recibida: INICIAR ESTADO 3 (Stickers)');
    
    // Cambiar estado y desactivar petardos
    estadoActual = 3;
    petardosActivated = false;
    
    // Aquí debes crear la interfaz HTML de tus stickers y photoArea
    mainContainer.innerHTML = `
        <h1>MODO STICKERS</h1>
        <div id="photo-area" style="height: 300px; border: 2px solid white;">Zona de Foto</div>
        <div id="sticker-options">
            <button id="sticker-1">Sticker 1</button>
            <button id="sticker-2">Sticker 2</button>
        </div>
    `;
    
    // **ACTIVAR LÓGICA DE STICKERS DESPUÉS DE CREAR EL HTML**
    stickersActivated = true;
    stickerPlaced = false; // Resetear bandera al inicio
    const stickerOptions = document.querySelectorAll('#sticker-options button');
    const photoArea = document.getElementById('photo-area');


    // ----------------------------------------------------
    // INICIO DE TU CÓDIGO DE ARRASTRAR Y SOLTAR STICKERS
    // ----------------------------------------------------
    
    stickerOptions.forEach(sticker => {
        sticker.addEventListener('touchstart', (e) => {
            if (stickerPlaced) return;

            currentStickerId = sticker.id;
            
            // Crear una copia "fantasma"
            stickerGhost = sticker.cloneNode(true);
            stickerGhost.style.position = 'absolute';
            stickerGhost.style.width = '60px';
            stickerGhost.style.height = '60px';
            stickerGhost.style.borderRadius = '0';
            stickerGhost.style.pointerEvents = 'none';
            stickerGhost.style.opacity = '0.7';
            stickerGhost.style.zIndex = '1000'; 
            
            document.body.appendChild(stickerGhost);

            const touch = e.touches[0];
            stickerGhost.style.left = `${touch.clientX - stickerGhost.offsetWidth / 2}px`;
            stickerGhost.style.top = `${touch.clientY - stickerGhost.offsetHeight / 2}px`;
        }, { passive: false });
    });

    document.body.addEventListener('touchmove', (e) => {
        if (!stickerGhost) return;
        
        // Evitamos el scroll del navegador
        e.preventDefault();

        const touch = e.touches[0];
        stickerGhost.style.left = `${touch.clientX - stickerGhost.offsetWidth / 2}px`;
        stickerGhost.style.top = `${touch.clientY - stickerGhost.offsetHeight / 2}px`;
    }, { passive: false });

    document.body.addEventListener('touchend', (e) => {
        if (!stickerGhost) return;
        
        const finalRect = stickerGhost.getBoundingClientRect();
        // Asegúrate de que photoArea esté correctamente definido en tu HTML al inicio del Estado 3
        const photoRect = photoArea.getBoundingClientRect(); 
        
        if (finalRect.left > photoRect.left && finalRect.right < photoRect.right &&
            finalRect.top > photoRect.top && finalRect.bottom < photoRect.bottom) {

            const xRelative = (finalRect.left + finalRect.width / 2 - photoRect.left) / photoRect.width;
            const yRelative = (finalRect.top + finalRect.height / 2 - photoRect.top) / photoRect.height;

            socket.emit('sticker_enviado', {
                stickerId: currentStickerId,
                x: xRelative,
                y: yRelative
            });
            console.log(`Sticker ${currentStickerId} enviado a (${xRelative}, ${yRelative})`);
            
            stickerPlaced = true;
            stickerOptions.forEach(opt => opt.style.opacity = '0.5');
        }

        document.body.removeChild(stickerGhost);
        stickerGhost = null;
        currentStickerId = null;
    });
    
    // ----------------------------------------------------
    // FIN DE TU CÓDIGO DE ARRASTRAR Y SOLTAR STICKERS
    // ----------------------------------------------------
});

// MANEJADOR PARA FOTO FINAL (EXISTENTE)
socket.on('mostrar_foto_final', (data) => {
    console.log('Recibida foto final. Habilitando descarga.');
    const photoArea = document.getElementById('photo-area');
    photoArea.innerHTML = `<img id="final-photo" src="${data.foto}" style="width:100%; height:100%; object-fit:contain;">`;
});


// ------------------------------------
// LÓGICA DE SENSORES PARA EL ESTADO 2 (PETARDOS)
// ------------------------------------

// FUNCIÓN UNIFICADA PARA PROCESAR EL MOVIMIENTO
function handleMotion(event) {
    // Solo si estamos en el Estado 2, revisamos si hubo un "disparo"
    if (estadoActual === 2 && petardosActivated) {
        handleFireworkMotion(event);
    } 
}

// LÓGICA ESPECÍFICA PARA EL ESTADO 2 (PETARDOS)
function handleFireworkMotion(event) {
    const acceleration = event.accelerationIncludingGravity;
    
    const magnitude = Math.sqrt(
        acceleration.x * acceleration.x +
        acceleration.y * acceleration.y +
        acceleration.z * acceleration.z
    );

    if (magnitude > FIREWORK_THRESHOLD && (Date.now() - lastSentTime > throttleDelay)) {
        console.log(`Mobile B: ¡Movimiento de DISPARO detectado!`);
        
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = '¡Fuego Artificial Lanzado! 💥';
            setTimeout(() => {
                if (statusMessage) statusMessage.textContent = '¡Levanta tu móvil rápido!';
            }, 500);
        }

        socket.emit('lanzar_fuego_artificial', {
            mobileId: MOBILE_ID,
            intensity: magnitude 
        });

        lastSentTime = Date.now();
    }
}