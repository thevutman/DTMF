const socket = io();
const MOBILE_ID = 'mobile_b';

const FIREWORK_THRESHOLD = 28;
const SENSOR_THROTTLE = 120;
const INTRO_THROTTLE = 300;

let estadoActual = 0; // 0: espera, 1: intro, 2: petardos, 3: stickers, 4: final
let petardosActivated = false;
let stickersReady = false;
let stickerPlaced = false;

let lastSensorDispatch = 0;
let lastIntroPulse = 0;

let stickerGhost = null;
let currentStickerId = null;

const waitingState = document.getElementById('waiting-state');
const sceneOne = document.getElementById('scene-one');
const sceneTwo = document.getElementById('scene-two');
const sceneThree = document.getElementById('scene-three');
const sceneFinal = document.getElementById('scene-final');
const pulseButton = document.getElementById('btn-pulse');
const photoArea = document.getElementById('photo-area');
const photoImg = document.getElementById('photo');
const stickerOptionsContainer = document.getElementById('sticker-options');
const sceneThreeMessage = document.getElementById('scene-three-message');

window.addEventListener('devicemotion', handleMotion, { passive: true });
window.addEventListener('touchmove', followStickerGhost, { passive: false });
window.addEventListener('touchend', dropStickerGhost);

if (pulseButton) {
    pulseButton.addEventListener('click', sendIntroPulse);
}

socket.on('escena_1_intro', () => {
    estadoActual = 1;
    petardosActivated = false;
    stickerPlaced = false;
    stickersReady = false;
    showScene(sceneOne);
});

socket.on('activar_estado_2_moviles', () => {
    estadoActual = 2;
    petardosActivated = true;
    stickerPlaced = false;
    stickersReady = false;
    showScene(sceneTwo);
    requestSensorPermission();
});

socket.on('cambiar_a_escena_3', () => {
    estadoActual = 3;
    petardosActivated = false;
    stickersReady = false;
    stickerPlaced = false;
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

function sendIntroPulse() {
    const now = Date.now();
    if (now - lastIntroPulse < INTRO_THROTTLE) {
        return;
    }
    lastIntroPulse = now;

    const tones = ['D', 'T', 'M', 'F'];
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const intensity = 0.6 + Math.random() * 0.8;

    socket.emit('pulso_dtmf', {
        mobileId: MOBILE_ID,
        tone,
        intensity
    });
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
