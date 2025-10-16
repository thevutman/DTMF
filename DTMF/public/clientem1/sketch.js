const socket = io();
const mainContainer = document.getElementById('main-container');

const MOBILE_ID = 'mobile_a';
const FIREWORK_THRESHOLD = 28;
const MARACA_THRESHOLD = 16;
const SENSOR_THROTTLE = 120;
const INTRO_THROTTLE = 350;

let estadoActual = 0; // 0: esperando, 1: intro DTMF, 2: petardos, 3: foto/maraca
let maracaActivated = false;
let petardosActivated = false;

let lastSensorDispatch = 0;
let lastIntroPulse = 0;

let maracaSound;
let osc;
let audioPrimed = false;
let meterFill;

function preload() {
    soundFormats('mp3');
    maracaSound = loadSound('../assets/sonido/maracas.mp3');
}

function setup() {
    noCanvas();
    renderWaiting();
    window.addEventListener('touchstart', primeAudio, { passive: true });
    window.addEventListener('devicemotion', handleMotion, { passive: true });

    socket.on('escena_1_intro', () => {
        estadoActual = 1;
        maracaActivated = false;
        petardosActivated = false;
        renderSceneOne();
    });

    socket.on('activar_estado_2_moviles', () => {
        estadoActual = 2;
        maracaActivated = false;
        petardosActivated = true;
        renderSceneTwo();
        requestSensorPermission();
    });

    socket.on('cambiar_a_escena_3', () => {
        estadoActual = 3;
        maracaActivated = false;
        petardosActivated = false;
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

function renderSceneOne() {
    mainContainer.innerHTML = `
        <div class="fade">
            <div class="status-pill">Escena 1 · Pulso DTMF</div>
            <h1>Golpea el ritmo</h1>
            <p>Toca el botón cada vez que Bad Bunny grite. Tus pulsos pintan la pantalla gigante.</p>
            <button id="btn-pulse" class="action-button">Enviar pulso</button>
            <p class="small-text">Tip: siente el beat y no lo hagas más de una vez por beat.</p>
        </div>
    `;

    const pulseButton = document.getElementById('btn-pulse');
    if (pulseButton) {
        pulseButton.addEventListener('click', sendIntroPulse);
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

function renderClosing() {
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

function sendIntroPulse() {
    const now = Date.now();
    if (now - lastIntroPulse < INTRO_THROTTLE) {
        return;
    }
    lastIntroPulse = now;

    const tones = ['D', 'T', 'M', 'F'];
    const tone = tones[Math.floor(Math.random() * tones.length)];
    const intensity = random(0.4, 1);

    socket.emit('pulso_dtmf', {
        mobileId: MOBILE_ID,
        tone,
        intensity
    });

    if (!osc) {
        osc = new p5.Oscillator('triangle');
        osc.start();
        osc.amp(0, 0);
    }
    const baseFrequency = tone === 'D' ? 415 : tone === 'T' ? 554 : tone === 'M' ? 622 : 698;
    osc.freq(baseFrequency);
    osc.amp(0.45, 0.02);
    osc.amp(0, 0.18);
}

function handleMotion(event) {
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
        if (maracaSound && audioPrimed) {
            maracaSound.play();
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
