const socket = io();
let video;
let videoContainer;
let btnTomarFoto;
const state3Container = document.getElementById('state-3-container');
const state2Container = document.getElementById('state-2-container');
const statusText = document.getElementById('status-text');
let btnActivarSelfies = null;

function setup() {}

function draw() {
    if (video && videoContainer) {
        image(video, 0, 0, videoContainer.offsetWidth, videoContainer.offsetHeight);
    }
}

socket.on('escena_1_intro', () => {
    statusText.textContent = 'Escena 1: la audiencia está encendiendo el intro DTMF.';
    clearState2Controls();
});

socket.on('activar_estado_2_moviles', () => {
    statusText.textContent = 'Escena 2: atentos al beat, prepara el conteo para la foto.';
    buildState2Controls();
});

socket.on('cambiar_a_escena_3', () => {
    statusText.textContent = 'Escena 3: arma la cámara y espera la orden del remoto.';
    clearState2Controls();
    buildCameraUI();
});

socket.on('habilitar_foto', () => {
    statusText.textContent = '¡Foto habilitada! Captura cuando todos estén listos.';
    if (btnTomarFoto) {
        btnTomarFoto.disabled = false;
        btnTomarFoto.textContent = 'Tomar Foto';
    }
});

socket.on('mostrar_foto', () => {
    statusText.textContent = 'Foto enviada al visualizador. Activa la maraca en móviles.';
    if (btnTomarFoto) {
        btnTomarFoto.disabled = true;
        btnTomarFoto.textContent = 'Foto enviada';
    }
});

socket.on('mostrar_foto_final', () => {
    statusText.textContent = 'Escena final lista. Confirma que el visualizador proyecte la memoria DTMF.';
    clearState2Controls();
});

socket.on('estado_2_selfies_activadas', () => {
    statusText.textContent = 'Escena 2: cámaras móviles activadas. Monitorea el collage en el visualizador.';
    if (btnActivarSelfies) {
        btnActivarSelfies.disabled = true;
        btnActivarSelfies.textContent = 'Selfies en vivo';
    }
});

function buildCameraUI() {
    if (!state3Container) return;
    if (!videoContainer) {
        const title = document.createElement('h2');
        title.textContent = 'Prepara la toma final';

        videoContainer = document.createElement('div');
        videoContainer.id = 'video-container';

        btnTomarFoto = document.createElement('button');
        btnTomarFoto.id = 'btn-tomar-foto';
        btnTomarFoto.textContent = 'Esperando señal';
        btnTomarFoto.disabled = true;

        state3Container.innerHTML = '';
        state3Container.appendChild(title);
        state3Container.appendChild(videoContainer);
        state3Container.appendChild(btnTomarFoto);

        video = createCapture(VIDEO);
        video.size(640, 480);
        video.hide();

        btnTomarFoto.addEventListener('click', () => {
            const img = video.get();
            const imageData = img.canvas.toDataURL('image/jpeg', 0.9);
            socket.emit('foto_tomada', imageData);
            btnTomarFoto.disabled = true;
            btnTomarFoto.textContent = 'Enviando…';
        });
    }
}

function buildState2Controls() {
    if (!state2Container) return;

    state2Container.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = 'Escena 2 · Control Staff';

    const description = document.createElement('p');
    description.textContent = 'Cuando el público haya lanzado suficientes petardos, cambia a selfies para armar el collage en vivo.';

    btnActivarSelfies = document.createElement('button');
    btnActivarSelfies.className = 'secondary-button';
    btnActivarSelfies.textContent = 'Activar selfies en móviles';

    btnActivarSelfies.addEventListener('click', () => {
        btnActivarSelfies.disabled = true;
        btnActivarSelfies.textContent = 'Activando…';
        socket.emit('activar_selfies_estado_2');
    });

    state2Container.appendChild(title);
    state2Container.appendChild(description);
    state2Container.appendChild(btnActivarSelfies);
}

function clearState2Controls() {
    if (state2Container) {
        state2Container.innerHTML = '';
    }
    btnActivarSelfies = null;
}
