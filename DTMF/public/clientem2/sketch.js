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
let currentSticker = null;

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
const fireworkInstructions = document.getElementById('firework-instructions');
const selfieWrapper = document.getElementById('selfie-wrapper');
const selfieVideo = document.getElementById('selfie-video');
const selfieButton = document.getElementById('btn-selfie');
const selfieStatus = document.getElementById('selfie-status');
const selfieError = document.getElementById('selfie-error');

let selfieStream = null;
let selfieCanvas = null;
let selfieCount = 0;
let selfieCooldown = false;

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

if (selfieButton) {
    selfieButton.addEventListener('click', () => {
        captureSelfie();
    });
}

socket.on('escena_1_intro', () => {
    estadoActual = 1;
    petardosActivated = false;
    stickerPlaced = false;
    stickersReady = false;
    sunsetInteractionActive = false;
    stopSelfieMode();
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
    stopSelfieMode();
    selfieCount = 0;
    updateSelfieStatus();
    showScene(sceneTwo);
    requestSensorPermission();
});

socket.on('cambiar_a_escena_3', () => {
    estadoActual = 3;
    petardosActivated = false;
    stickersReady = false;
    stickerPlaced = false;
    sunsetInteractionActive = false;
    stopSelfieMode();
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
    stopSelfieMode();
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

socket.on('activar_camaras_estado_2', () => {
    if (estadoActual === 2) {
        activarModoSelfie();
    }
});

socket.on('resetear_collage_estado_2', () => {
    selfieCount = 0;
    updateSelfieStatus();
    stopSelfieMode();
    if (estadoActual === 2) {
        if (fireworkInstructions) fireworkInstructions.hidden = false;
        if (selfieWrapper) selfieWrapper.hidden = true;
    }
});

function showScene(sceneToShow) {
    [waitingState, sceneOne, sceneTwo, sceneThree, sceneFinal].forEach(section => {
        if (!section) return;
        section.hidden = section !== sceneToShow;
    });
}

function activarModoSelfie() {
    petardosActivated = false;
    if (fireworkInstructions) {
        fireworkInstructions.hidden = true;
    }
    if (selfieWrapper) {
        selfieWrapper.hidden = false;
    }
    if (motionButton) {
        motionButton.hidden = true;
    }
    if (motionStatus) {
        motionStatus.hidden = true;
    }
    updateSelfieStatus();
    startSelfieStream();
}

function startSelfieStream() {
    if (!selfieVideo) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showSelfieError('Tu navegador no permite usar la cámara.');
        return;
    }

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
    }).then(stream => {
        selfieStream = stream;
        selfieVideo.srcObject = stream;
        selfieVideo.setAttribute('playsinline', 'true');
        selfieVideo.muted = true;
        return selfieVideo.play();
    }).catch(() => {
        showSelfieError('Activa permisos de cámara para sumarte al collage.');
    });
}

function captureSelfie() {
    if (!selfieVideo || !selfieStream || selfieCooldown) {
        return;
    }

    const width = selfieVideo.videoWidth;
    const height = selfieVideo.videoHeight;

    if (!width || !height) {
        showSelfieError('Esperando que la cámara encienda…');
        return;
    }

    if (!selfieCanvas) {
        selfieCanvas = document.createElement('canvas');
    }

    selfieCanvas.width = width;
    selfieCanvas.height = height;

    const ctx = selfieCanvas.getContext('2d');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(selfieVideo, -width, 0, width, height);
    ctx.restore();

    const imageData = selfieCanvas.toDataURL('image/jpeg', 0.9);
    selfieCount += 1;
    updateSelfieStatus();

    socket.emit('selfie_estado_2_tomada', {
        mobileId: MOBILE_ID,
        imageData,
        timestamp: Date.now()
    });

    if (selfieButton) {
        selfieButton.disabled = true;
    }
    selfieCooldown = true;
    setTimeout(() => {
        selfieCooldown = false;
        if (selfieButton) {
            selfieButton.disabled = false;
        }
    }, 1200);
}

function updateSelfieStatus() {
    if (selfieStatus) {
        selfieStatus.textContent = `Selfies enviadas: ${selfieCount}`;
    }
    if (selfieError) {
        selfieError.hidden = true;
    }
}

function showSelfieError(message) {
    if (selfieError) {
        selfieError.textContent = message;
        selfieError.hidden = false;
    }
}

function stopSelfieMode() {
    if (selfieWrapper) {
        selfieWrapper.hidden = true;
    }
    if (fireworkInstructions) {
        fireworkInstructions.hidden = false;
    }
    if (motionButton) {
        motionButton.hidden = false;
    }
    if (motionStatus) {
        motionStatus.hidden = false;
    }
    if (selfieStream) {
        selfieStream.getTracks().forEach(track => track.stop());
        selfieStream = null;
    }
    if (selfieButton) {
        selfieButton.disabled = false;
    }
    if (selfieVideo) {
        selfieVideo.srcObject = null;
    }
    if (selfieError) {
        selfieError.hidden = true;
    }
    selfieCooldown = false;
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
    // lista de stickers disponibles (ids deben coincidir con los cargados en el visual)
    const stickersList = [
        { id: 'base', label: 'Palmera', tone: 'D' },
        { id: 'concho', label: 'Concho', tone: 'T' },
        { id: 'sillas', label: 'Sillas', tone: 'M' },
        { id: 'ticket', label: 'Ticket', tone: 'F' }
    ];

    stickersList.forEach(s => {
        const sticker = document.createElement('div');
        sticker.className = 'sticker-option';
        sticker.dataset.stickerId = s.id;
        sticker.dataset.tone = s.tone;
        sticker.textContent = s.label;
        sticker.id = `sticker-${s.id}`;
        sticker.addEventListener('touchstart', startStickerDrag, { passive: false });
        stickerOptionsContainer.appendChild(sticker);
    });

    stickersReady = true;
}

function startStickerDrag(event) {
    if (!stickersReady || stickerPlaced) return;

    const el = event.currentTarget;
    // guardar id y tone reales para enviar luego
    currentSticker = {
        stickerId: el.dataset.stickerId,
        tone: el.dataset.tone
    };

    stickerGhost = el.cloneNode(true);
    stickerGhost.style.position = 'absolute';
    stickerGhost.style.width = `${el.offsetWidth}px`;
    stickerGhost.style.height = `${el.offsetHeight}px`;
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

        // usar currentSticker.stickerId (no el id DOM)
        socket.emit('sticker_enviado', {
            stickerId: currentSticker?.stickerId || null,
            tone: currentSticker?.tone || null,
            x: xRelative,
            y: yRelative
        });

        stickerPlaced = true;
        Array.from(stickerOptionsContainer.children).forEach(node => {
            node.style.opacity = '0.35';
        });
    }

    if (stickerGhost && stickerGhost.parentNode) {
        document.body.removeChild(stickerGhost);
    }
    stickerGhost = null;
    currentSticker = null;
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
