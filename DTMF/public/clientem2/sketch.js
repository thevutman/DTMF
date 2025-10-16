const socket = io();
const MOBILE_ID = 'mobile_b';

const FIREWORK_THRESHOLD = 28;
const SENSOR_THROTTLE = 120;

let estadoActual = 0; // 0: espera, 1: intro, 2: petardos, 3: stickers, 4: final
let petardosActivated = false;
let stickersReady = false;
let stickerPlaced = false;
let sunsetInteractionActive = false;

let lastSensorDispatch = 0;

let stickerGhost = null;
let currentStickerId = null;

const waitingState = document.getElementById('waiting-state');
const sceneOne = document.getElementById('scene-one');
const sceneOnePhaseOne = document.getElementById('scene-one-phase-1');
const sceneOnePhaseTwo = document.getElementById('scene-one-phase-2');
const sceneTwo = document.getElementById('scene-two');
const sceneThree = document.getElementById('scene-three');
const sceneFinal = document.getElementById('scene-final');
const moonButton = document.getElementById('btn-moon');
const motionButton = document.getElementById('btn-enable-motion');
const motionStatus = document.getElementById('motion-status');
const photoArea = document.getElementById('photo-area');
const photoImg = document.getElementById('photo');
const stickerOptionsContainer = document.getElementById('sticker-options');
const sceneThreeMessage = document.getElementById('scene-three-message');

window.addEventListener('devicemotion', handleMotion, { passive: true });
window.addEventListener('touchmove', followStickerGhost, { passive: false });
window.addEventListener('touchend', dropStickerGhost);

if (moonButton) {
    moonButton.addEventListener('click', () => {
        if (estadoActual === 1) {
            socket.emit('cambiar_momento_sunset', 'luna');
        }
    });
}

if (motionButton) {
    motionButton.addEventListener('click', () => {
        requestSensorPermission().then((granted) => {
            motionPermissionGranted = granted;
            updateMotionPrompt();
        });
    });
}

socket.on('escena_1_intro', () => {
    estadoActual = 1;
    petardosActivated = false;
    stickerPlaced = false;
    stickersReady = false;
    sunsetInteractionActive = false;
    showMoonPhase(1);
    showScene(sceneOne);
});

socket.on('activar_interaccion_moviles', () => {
    if (estadoActual === 1 && !sunsetInteractionActive) {
        sunsetInteractionActive = true;
        showMoonPhase(2);
    }
});

socket.on('activar_estado_2_moviles', () => {
    estadoActual = 2;
    petardosActivated = true;
    stickerPlaced = false;
    stickersReady = false;
    sunsetInteractionActive = false;
    showScene(sceneTwo);
    requestSensorPermission();
});

socket.on('cambiar_a_escena_3', () => {
    estadoActual = 3;
    petardosActivated = false;
    stickersReady = false;
    stickerPlaced = false;
    sunsetInteractionActive = false;
    sceneThreeMessage.textContent = 'Espera al staff. La foto viene en camino.';
    photoImg.src = '';
    showScene(sceneThree);
});

socket.on('habilitar_foto', () => {
    if (estadoActual === 3) {
        sceneThreeMessage.textContent = '¡Sonríe! La foto se toma en segundos.';
    }
});

socket.on('mostrar_foto', (imageData) => {
    estadoActual = 3;
    photoImg.src = imageData;
    sceneThreeMessage.textContent = 'Arrastra un sticker y colócalo donde más brille.';
    stickerPlaced = false;
    setupStickerOptions();
    showScene(sceneThree);
});

socket.on('mostrar_foto_final', (data) => {
    estadoActual = 4;
    petardosActivated = false;
    stickersReady = false;
    stickerPlaced = true;
    sunsetInteractionActive = false;
    if (data && data.foto) {
        photoImg.src = data.foto;
    }
    if (sceneFinal) {
        const finalPhotoSrc = data && data.foto ? data.foto : photoImg.src;
        sceneFinal.innerHTML = `
            <div class="status-pill">Escena final</div>
            <h1>Memoria guardada</h1>
            <div class="final-photo">
                <img src="${finalPhotoSrc}" alt="Foto final DTMF">
            </div>
            <p>Comparte este recuerdo y prepárate para el siguiente track.</p>
        `;
    }
    showScene(sceneFinal);
});

function showScene(sceneToShow) {
    [waitingState, sceneOne, sceneTwo, sceneThree, sceneFinal].forEach(section => {
        if (!section) return;
        section.hidden = section !== sceneToShow;
    });
}

function showMoonPhase(phase) {
    if (!sceneOnePhaseOne || !sceneOnePhaseTwo) return;
    if (phase === 1) {
        sceneOnePhaseOne.hidden = false;
        sceneOnePhaseTwo.hidden = true;
    } else {
        sceneOnePhaseOne.hidden = true;
        sceneOnePhaseTwo.hidden = false;
    }
}

function setupStickerOptions() {
    if (!stickerOptionsContainer) return;

    stickerOptionsContainer.innerHTML = '';
    const toneMap = ['D', 'T', 'M', 'F'];
    toneMap.forEach(tone => {
        const sticker = document.createElement('div');
        sticker.className = 'sticker-option';
        sticker.dataset.tone = tone;
        sticker.textContent = tone;
        sticker.id = `sticker-${tone}`;
        sticker.addEventListener('touchstart', startStickerDrag, { passive: false });
        stickerOptionsContainer.appendChild(sticker);
    });

    stickersReady = true;
}

function startStickerDrag(event) {
    if (!stickersReady || stickerPlaced) return;

    currentStickerId = event.currentTarget.id;
    stickerGhost = event.currentTarget.cloneNode(true);
    stickerGhost.style.position = 'absolute';
    stickerGhost.style.width = `${event.currentTarget.offsetWidth}px`;
    stickerGhost.style.height = `${event.currentTarget.offsetHeight}px`;
    stickerGhost.style.pointerEvents = 'none';
    stickerGhost.style.opacity = '0.8';
    stickerGhost.style.zIndex = '999';
    document.body.appendChild(stickerGhost);

    const touch = event.touches[0];
    moveGhost(touch.clientX, touch.clientY);
    event.preventDefault();
}

function followStickerGhost(event) {
    if (!stickerGhost) return;
    const touch = event.touches[0];
    moveGhost(touch.clientX, touch.clientY);
    event.preventDefault();
}

function moveGhost(x, y) {
    stickerGhost.style.left = `${x - stickerGhost.offsetWidth / 2}px`;
    stickerGhost.style.top = `${y - stickerGhost.offsetHeight / 2}px`;
}

function dropStickerGhost() {
    if (!stickerGhost || !photoArea || !stickersReady) return;

    const ghostRect = stickerGhost.getBoundingClientRect();
    const photoRect = photoArea.getBoundingClientRect();

    if (
        ghostRect.left > photoRect.left &&
        ghostRect.right < photoRect.right &&
        ghostRect.top > photoRect.top &&
        ghostRect.bottom < photoRect.bottom
    ) {
        const xRelative = (ghostRect.left + ghostRect.width / 2 - photoRect.left) / photoRect.width;
        const yRelative = (ghostRect.top + ghostRect.height / 2 - photoRect.top) / photoRect.height;

        socket.emit('sticker_enviado', {
            stickerId: currentStickerId,
            tone: document.getElementById(currentStickerId)?.dataset.tone,
            x: xRelative,
            y: yRelative
        });

        stickerPlaced = true;
        Array.from(stickerOptionsContainer.children).forEach(node => {
            node.style.opacity = '0.35';
        });
    }

    document.body.removeChild(stickerGhost);
    stickerGhost = null;
    currentStickerId = null;
}

function handleMotion(event) {
    if (estadoActual !== 2 || !petardosActivated) return;

    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    const magnitude = Math.sqrt(
        acceleration.x * acceleration.x +
        acceleration.y * acceleration.y +
        acceleration.z * acceleration.z
    );

    const now = Date.now();
    if (now - lastSensorDispatch < SENSOR_THROTTLE) {
        return;
    }

    if (magnitude > FIREWORK_THRESHOLD) {
        lastSensorDispatch = now;
        socket.emit('lanzar_fuego_artificial', {
            mobileId: MOBILE_ID,
            intensity: magnitude
        });
    }
}

function requestSensorPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().catch(() => {});
    }
}

function updateMotionPrompt() {
    if (!motionButton || !motionStatus) return;
    if (motionPermissionGranted) {
        motionButton.classList.add('hidden');
        motionStatus.textContent = 'Sensores activos. Sacude fuerte para lanzar destellos.';
    } else {
        motionButton.classList.remove('hidden');
        motionStatus.textContent = 'Si usas iPhone toca el botón para permitir el sensor de movimiento.';
    }
}
