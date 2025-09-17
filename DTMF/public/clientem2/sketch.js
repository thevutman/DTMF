const socket = io();
const waitingState = document.getElementById('waiting-state');
const stickerContainer = document.getElementById('sticker-container');
const photo = document.getElementById('photo');

const stickerOptions = document.querySelectorAll('.sticker-option');
const photoArea = document.getElementById('photo-area');

let currentStickerId = null;
let stickerGhost = null;
let stickerPlaced = false;

// 1. Manejar la señal para cambiar al Estado 3
socket.on('cambiar_a_escena_3', () => {
    console.log('Cambiando a escena de Stickers.');
    waitingState.style.display = 'none';
    stickerContainer.style.display = 'flex';
    photoArea.style.backgroundColor = '#666';
    photo.style.display = 'none';
});

// 2. Manejar la recepción de la foto
socket.on('mostrar_foto', (imageData) => {
    console.log('Foto recibida. Mostrándola en la interfaz.');
    photo.src = imageData;
    photo.style.display = 'block';
    photoArea.style.backgroundColor = 'transparent';
});

// 3. Lógica para arrastrar y soltar (Eventos táctiles)

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
        stickerGhost.style.zIndex = '1000'; // Asegurarse de que esté encima
        
        document.body.appendChild(stickerGhost);

        const touch = e.touches[0];
        stickerGhost.style.left = `${touch.clientX - stickerGhost.offsetWidth / 2}px`;
        stickerGhost.style.top = `${touch.clientY - stickerGhost.offsetHeight / 2}px`;
    }, { passive: false }); // <--- AGREGAMOS ESTO
});

document.body.addEventListener('touchmove', (e) => {
    if (!stickerGhost) return;
    
    // Evitamos el scroll del navegador
    e.preventDefault();

    const touch = e.touches[0];
    stickerGhost.style.left = `${touch.clientX - stickerGhost.offsetWidth / 2}px`;
    stickerGhost.style.top = `${touch.clientY - stickerGhost.offsetHeight / 2}px`;
}, { passive: false }); // <--- AGREGAMOS ESTO

document.body.addEventListener('touchend', (e) => {
    if (!stickerGhost) return;
    
    const finalRect = stickerGhost.getBoundingClientRect();
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

socket.on('mostrar_foto_final', (data) => {
    console.log('Recibida foto final. Habilitando descarga.');
    photo.src = data.foto;
    photoArea.innerHTML = `<img id="final-photo" src="${data.foto}" style="width:100%; height:100%; object-fit:contain;">`;
});