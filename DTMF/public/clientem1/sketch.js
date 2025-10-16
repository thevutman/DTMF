const socket = io();
const mainContainer = document.getElementById('main-container');

const MOBILE_ID = 'mobile_a';
const FIREWORK_THRESHOLD = 28;
const MARACA_THRESHOLD = 16;
const SENSOR_THROTTLE = 120;

let estadoActual = 0; // 0: esperando, 1: intro sunset, 2: petardos, 3: foto/maraca
let maracaActivated = false;
let petardosActivated = false;
let sunsetInteractionActive = false;

let lastSensorDispatch = 0;

let maracaSound;
let audioPrimed = false;
let meterFill;

let motionPermissionGranted =
    typeof DeviceMotionEvent === 'undefined' || typeof DeviceMotionEvent.requestPermission !== 'function';

// --- nuevas variables para controlar loop/stop de la maraca ---
let maracaLooping = false;
let shakeStopTimer = null;
const SHAKE_STOP_DELAY = 600; // ms: tiempo sin agitar para pausar la maraca

function preload() {
    soundFormats('mp3');
    maracaSound = loadSound('../assets/sonido/maracas.mp3');
}

function setup() {
    noCanvas();
    renderWaiting();
    // touchstart debe ser non-passive para que iOS considere la interacción válida para desbloquear audio
    window.addEventListener('touchstart', primeAudio, { passive: false });
    // click como fallback (Android/desktop)
    window.addEventListener('click', primeAudio, { passive: false });
    window.addEventListener('devicemotion', handleMotion, { passive: true });

    socket.on('escena_1_intro', () => {
        estadoActual = 1;
        maracaActivated = false;
        petardosActivated = false;
        sunsetInteractionActive = false;
        renderSunsetWelcome();
    });

    socket.on('activar_interaccion_moviles', () => {
        if (estadoActual === 1 && !sunsetInteractionActive) {
            sunsetInteractionActive = true;
            renderSunsetButton();
        }
    });

    socket.on('activar_estado_2_moviles', () => {
        estadoActual = 2;
        maracaActivated = false;
        petardosActivated = true;
        sunsetInteractionActive = false;
        renderSceneTwo();
        requestSensorPermission();
    });

    socket.on('cambiar_a_escena_3', () => {
        estadoActual = 3;
        maracaActivated = false;
        petardosActivated = false;
        sunsetInteractionActive = false;
        renderSceneThreeWaiting();
    });

    socket.on('habilitar_foto', () => {
        if (estadoActual === 3) {
            const status = document.getElementById('status-message');
            if (status) {
                status.textContent = '¡Sonríe y mantente listo!';
            }
        }
    });

    socket.on('mostrar_foto', () => {
        if (estadoActual === 3) {
            const status = document.getElementById('status-message');
            if (status) {
                status.textContent = 'Siente el ritmo. ¡Maraca lista!';
            }
        }
    });

    socket.on('activar_maraca', () => {
        if (estadoActual === 3) {
            maracaActivated = true;
            renderMaracaMode();
            requestSensorPermission();
        }
    });

    socket.on('mostrar_foto_final', () => {
        estadoActual = 0;
        maracaActivated = false;
        petardosActivated = false;
        sunsetInteractionActive = false;
        renderClosing();
    });
}

function primeAudio() {
    if (!audioPrimed && getAudioContext().state !== 'running') {
        getAudioContext().resume()
            .then(() => {
                audioPrimed = true;
            })
            .catch(() => {});
    } else {
        audioPrimed = true;
    }

    // Intentar reproducir un fragmento muy corto y con volumen bajo para primar el audio en iOS
    try {
        if (maracaSound && typeof maracaSound.isLoaded === 'function' && maracaSound.isLoaded()) {
            // play(startTime, rate, amp, cueStart, duration)
            // volumen muy bajo y duración corta (50ms)
            maracaSound.setVolume(0.02);
            maracaSound.play(0, 1, 0.02, 0, 0.05);
        }
    } catch (e) {
        console.warn('primeAudio: no se pudo reproducir clip corto', e);
    }

    // Solicitar permiso de movimiento en iOS dentro del gesto de usuario
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().then(response => {
            // response === 'granted' en iOS cuando el usuario acepta
            motionPermissionGranted = response === 'granted';
            // opcional: actualizar UI si necesitas
        }).catch(() => {
            motionPermissionGranted = false;
        });
    } else {
        // navegadores que no requieren permiso explícito
        motionPermissionGranted = true;
    }
}

function renderWaiting() {
    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Esperando señal</div>
            <h1>Team Vibras</h1>
            <p>Sigue conectado. El staff lanzará la primera escena muy pronto.</p>
            <p class="small-text">Mantén tu volumen activo y desactiva el bloqueo de rotación.</p>
        </div>
    `;
}

function renderSunsetWelcome() {
    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Escena 1 · Intro musical</div>
            <h1>Mobile A conectado...</h1>
            <p>Escucha el build up. El sol espera tu señal para encender el horizonte.</p>
            <p class="small-text">En segundos aparecerá el botón ☀️ para calentar el cielo.</p>
        </div>
    `;
}

function renderSunsetButton() {
    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Escena 1 · Control ☀️</div>
            <h1>Ilumina el sunset</h1>
            <p>Cuando el beat lo pida, toca el botón SUN para subir los tonos naranja.</p>
            <button id="btn-sun" class="action-button sun-button">SUN / SUNSET ☀️</button>
            <p class="small-text">Cada toque empuja el visualizador hacia un atardecer más cálido.</p>
        </div>
    `;

    const sunButton = document.getElementById('btn-sun');
    if (sunButton) {
        sunButton.addEventListener('click', () => {
            socket.emit('cambiar_momento_sunset', 'sol');
        });
    }
}

function renderSceneTwo() {
    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Escena 2 · Fuegos</div>
            <h1>Levanta el teléfono</h1>
            <p>Cuando escuches los disparos de DTMF, lanza chispas levantando el móvil como si fuera una bengala.</p>
            <p class="small-text">Cada sacudida fuerte manda fuego al visualizador.</p>
        </div>
    `;
}

function renderSceneThreeWaiting() {
    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Escena 3 · Foto Tribu</div>
            <h1>Conecta la energía</h1>
            <p id="status-message">Espera la señal del staff para la foto final.</p>
            <p class="small-text">Cuando veas la foto en pantalla, agita al ritmo para iluminarla.</p>
        </div>
    `;
}

function renderMaracaMode() {
    console.log(maracaSound, audioPrimed);
    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Maraca activada</div>
            <h1>Agita para brillar</h1>
            <p>Agita tu móvil como maraca cuando suene el coro. Cada movimiento enciende la foto de la tribu.</p>
            <div class="maraca-meter"><span id="meter-fill"></span></div>
            <p class="small-text">Si no reacciona, revisa que el bloqueo de orientación esté desactivado.</p>
        </div>
    `;
    meterFill = document.getElementById('meter-fill');
}

function playMaraca() {
    // ahora inicia la maraca en loop para sonar mientras se agita
    if (maracaSound && audioPrimed) {
        try {
            if (!maracaLooping) {
                maracaSound.setLoop(true);
                maracaSound.setVolume(1);
                maracaSound.loop();
                maracaLooping = true;
            }
            // reset temporizador de parada si se usa el botón como prueba
            if (shakeStopTimer) clearTimeout(shakeStopTimer);
            shakeStopTimer = setTimeout(() => {
                stopMaracaLoop();
            }, SHAKE_STOP_DELAY);
        } catch (e) {
            console.warn('playMaraca error:', e);
        }
    }
}

// helper para parar la maraca en loop
function stopMaracaLoop() {
    try {
        if (maracaSound && maracaLooping) {
            // usar pause() para mantener posición o stop() para reiniciar
            maracaSound.pause();
        }
    } catch (e) {
        console.warn('stopMaracaLoop error:', e);
    } finally {
        maracaLooping = false;
        if (shakeStopTimer) {
            clearTimeout(shakeStopTimer);
            shakeStopTimer = null;
        }
    }
}

function renderClosing() {
    // detener maraca si se estaba reproduciendo
    stopMaracaLoop();

    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Gracias Tribu</div>
            <h1>Escena final</h1>
            <p>La foto quedó brutal. Guarda tu energía para el encore.</p>
        </div>
    `;
}

function requestSensorPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission().catch(() => { /* Ignorar si el usuario cancela */ });
    }
}

function handleMotion(event) {
    if (!motionPermissionGranted && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        return;
    }
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

    if (estadoActual === 2 && petardosActivated && magnitude > FIREWORK_THRESHOLD) {
        lastSensorDispatch = now;
        socket.emit('lanzar_fuego_artificial', {
            mobileId: MOBILE_ID,
            intensity: magnitude
        });
    } else if (estadoActual === 3 && maracaActivated && magnitude > MARACA_THRESHOLD) {
        lastSensorDispatch = now;
        console.log('maraca trigger', { audioPrimed, maracaLoaded: maracaSound && maracaSound.isLoaded && maracaSound.isLoaded() });

        // iniciar loop si no está sonando; reiniciar temporizador de parada en cada agitación
        if (maracaSound && audioPrimed && typeof maracaSound.isLoaded === 'function' && maracaSound.isLoaded()) {
            try {
                if (!maracaLooping) {
                    maracaSound.setLoop(true);
                    maracaSound.setVolume(1);
                    maracaSound.loop();
                    maracaLooping = true;
                }
                // resetear temporizador para pausar después de no-agitar
                if (shakeStopTimer) clearTimeout(shakeStopTimer);
                shakeStopTimer = setTimeout(() => {
                    stopMaracaLoop();
                }, SHAKE_STOP_DELAY);
            } catch (e) {
                console.warn('Error reproduciendo maraca en trigger:', e);
            }
        }
        if (meterFill) {
            const percent = Math.min(100, Math.floor((magnitude / 40) * 100));
            meterFill.style.width = `${percent}%`;
            setTimeout(() => {
                if (meterFill) {
                    meterFill.style.width = '0%';
                }
            }, 220);
        }
        socket.emit('maraca_agitada', {
            x: acceleration.x,
            y: acceleration.y,
            z: acceleration.z
        });
    }
}
