const socket = io();
const MOBILE_ID = 'mobile_b';

const FIREWORK_THRESHOLD = 28;
const SENSOR_THROTTLE = 120;
const INTRO_THROTTLE = 300;

let estadoActual = 0; // 0: espera, 1: intro, 2: petardos, 3: selfies, 4: stickers, 5: final
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
const sceneSelfie = document.getElementById('scene-selfie');
const sceneThree = document.getElementById('scene-three');
const sceneFinal = document.getElementById('scene-final');
const pulseButton = document.getElementById('btn-pulse');
const motionButton = document.getElementById('btn-enable-motion');
const motionStatus = document.getElementById('motion-status');
const selfieButton = document.getElementById('btn-selfie');
const selfieInput = document.getElementById('selfie-input');
const selfieStatus = document.getElementById('selfie-status');
const selfiePreview = document.getElementById('selfie-preview');
const selfiePreviewImg = document.getElementById('selfie-preview-img');
const photoArea = document.getElementById('photo-area');
const photoImg = document.getElementById('photo');
const stickerOptionsContainer = document.getElementById('sticker-options');
const sceneThreeMessage = document.getElementById('scene-three-message');

let motionPermissionGranted =
    typeof DeviceMotionEvent === 'undefined' || typeof DeviceMotionEvent.requestPermission !== 'function';

window.addEventListener('devicemotion', handleMotion, { passive: true });
window.addEventListener('touchmove', followStickerGhost, { passive: false });
window.addEventListener('touchend', dropStickerGhost);

if (pulseButton) {
    pulseButton.addEventListener('click', sendIntroPulse);
}

if (motionButton) {
    motionButton.addEventListener('click', () => {
        requestSensorPermission().then((granted) => {
            motionPermissionGranted = granted;
            updateMotionPrompt();
        });
    });
}

if (selfieButton && selfieInput) {
    selfieButton.addEventListener('click', () => selfieInput.click());
    selfieInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            handleSelfieFile(file);
        }
        event.target.value = '';
    });
}


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
    updateMotionPrompt();
});

socket.on('iniciar_collage_selfies', () => {
    requestSensorPermission();
});

socket.on('cambiar_a_escena_3', () => {
    estadoActual = 3;
    petardosActivated = false;
    stickersReady = false;
    stickerPlaced = false;
    showScene(sceneSelfie);
    if (selfieStatus) {
        selfieStatus.textContent = 'Toca el botón, toma tu selfie vertical y se enviará al collage gigante.';
    }
    if (selfiePreview) {
        selfiePreview.classList.add('hidden');
    }
    if (selfieButton) {
        selfieButton.disabled = false;
    }
});

socket.on('selfie_confirmada', () => {
    if (estadoActual === 3) {
        if (selfieStatus) {
            selfieStatus.textContent = 'Selfie enviada. Mira cómo aparece en la pantalla.';
        }
        if (selfieButton) {
            selfieButton.disabled = true;
        }
        if (selfiePreview) {
            selfiePreview.classList.remove('hidden');
        }
    }
});

socket.on('selfie_stage_completa', () => {
    if (estadoActual === 3 && selfieStatus) {
        selfieStatus.textContent = 'Collage listo. Espera a que llegue la foto del staff.';
    }
});

socket.on('selfies_actualizadas', (list = []) => {
    if (estadoActual === 3 && selfieStatus) {
        const total = list.length;
        selfieStatus.textContent = total > 0
            ? `Selfies en pantalla: ${total}. ¡Gracias por compartir!`
            : 'Aún no hay selfies en el collage, súmate con tu vibra.';
    }
});

socket.on('cambiar_a_escena_3', () => {
    estadoActual = 4;
    petardosActivated = false;
    stickersReady = false;
    stickerPlaced = false;
    if (sceneThreeMessage) {
        sceneThreeMessage.textContent = 'Espera la foto del staff para comenzar a decorar.';
    }
    if (stickerOptionsContainer) {
        stickerOptionsContainer.innerHTML = '';
    }
    showScene(sceneThree);
});

socket.on('habilitar_foto', () => {
    if (estadoActual === 4 && sceneThreeMessage) {
        sceneThreeMessage.textContent = '¡Foto en camino! Ten listos tus stickers.';
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
    estadoActual = 4;
    if (photoImg) {
        photoImg.src = imageData;
    }
    if (sceneThreeMessage) {
        sceneThreeMessage.textContent = 'Arrastra un sticker y colócalo donde más brille.';
    }
    estadoActual = 3;
    photoImg.src = imageData;
    sceneThreeMessage.textContent = 'Arrastra un sticker y colócalo donde más brille.';
    stickerPlaced = false;
    setupStickerOptions();
    showScene(sceneThree);
});

socket.on('mostrar_foto_final', (data) => {
    estadoActual = 5;
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
    [waitingState, sceneOne, sceneTwo, sceneSelfie, sceneThree, sceneFinal].forEach(section => {
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

function requestSensorPermission() {
    if (motionPermissionGranted) {
        return Promise.resolve(true);
    }

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            return DeviceMotionEvent.requestPermission()
                .then((response) => response === 'granted')
                .catch(() => false);
        } catch (err) {
            return Promise.resolve(false);
        }
    }

    motionPermissionGranted = true;
    return Promise.resolve(true);
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

function handleSelfieFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        return;
    }

    if (selfieStatus) {
        selfieStatus.textContent = 'Procesando selfie...';
    }

    compressImage(file)
        .then((dataUrl) => {
            if (!dataUrl) {
                if (selfieStatus) {
                    selfieStatus.textContent = 'No pudimos leer tu selfie. Intenta nuevamente.';
                }
                return;
            }

            if (selfiePreviewImg) {
                selfiePreviewImg.src = dataUrl;
            }
            if (selfiePreview) {
                selfiePreview.classList.remove('hidden');
            }

            socket.emit('selfie_enviada', {
                mobileId: MOBILE_ID,
                image: dataUrl
            });

            if (selfieStatus) {
                selfieStatus.textContent = 'Enviando selfie...';
            }
        })
        .catch(() => {
            if (selfieStatus) {
                selfieStatus.textContent = 'Ocurrió un error. Intenta tomar la selfie de nuevo.';
            }
        });
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 720;
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = () => reject(new Error('image-error'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('read-error'));
        reader.readAsDataURL(file);
    });
}

function handleMotion(event) {
    if (!motionPermissionGranted && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        return;
    }

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
