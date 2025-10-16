// Importar módulos necesarios
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

// Servir archivos estáticos (HTML, CSS, JS) desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

let fotoActual = null; // Variable para almacenar la foto tomada
let stickers = []; // Array para almacenar los stickers y sus posiciones
let selfies = []; // Collage de selfies enviados por los móviles

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Manejar el evento para activar la Escena 1 (intro DTMF)
    socket.on('activar_escena_1', () => {
        console.log('Escena 1 iniciada desde el remoto.');
        fotoActual = null;
        stickers = [];
        selfies = [];
        io.emit('escena_1_intro');
    });

    // Manejar el evento para activar el Estado 3 (del cliente Remote)
    socket.on('activar_collage_selfies', () => {
        console.log('Remoto: iniciar collage de selfies.');
        selfies = [];
        io.emit('iniciar_collage_selfies');
        io.emit('selfies_actualizadas', selfies);
    });

    // Manejar el evento para habilitar el botón de la foto (del cliente Remote)
    socket.on('habilitar_foto_desktop', () => {
        console.log('Habilitando botón de foto en el cliente Desktop.');
        // Emitir un evento específico al cliente Desktop
        io.emit('habilitar_foto');
        io.emit('mostrar_gif_sonrie');
        io.emit('cambiar_a_escena_3');
    });

    // Manejar la foto enviada por el Cliente Desktop
    socket.on('foto_tomada', (imageData) => {
        console.log('Foto recibida del Desktop.');
        fotoActual = imageData; // Guardar la foto en el servidor
        stickers = []; // Reiniciar los stickers para la nueva foto

        // Enviar la foto al Visualizador y al Mobile B
        io.emit('mostrar_foto', fotoActual);
        io.emit('selfie_stage_completa');

        // Enviar una señal específica a Mobile A para que active la maraca
        io.emit('activar_maraca');
        console.log('Enviando señal para activar la maraca.');
    });

    // Pulsos de la escena 1 enviados por los móviles
    socket.on('pulso_dtmf', (payload) => {
        io.emit('pulso_dtmf_visual', payload);
    });

    // Manejar los datos de la maraca del Cliente Mobile A
    socket.on('maraca_agitada', (data) => {
        console.log(`Movimiento de maraca detectado: x=${data.x}`);
        // Retransmitir la información al Visualizador
        io.emit('efecto_maraca', data);
    });

    // Manejar los datos del sticker del Cliente Mobile B
    socket.on('sticker_enviado', (stickerData) => {
        console.log(`Sticker recibido del Mobile B: ${stickerData.stickerId}`);
        // Guardar el sticker y sus coordenadas
        stickers.push(stickerData);
        // Enviar la información al Visualizador para que lo dibuje
        io.emit('agregar_sticker_visualizador', stickerData);
    });

    // Manejar el evento para finalizar la experiencia (del cliente Remote)
    socket.on('finalizar_experiencia', () => {
        console.log('Señal de finalización recibida. Preparando foto final.');

        // Opción 1 (más simple): Enviar la foto original y el array de stickers
        io.emit('mostrar_foto_final', { foto: fotoActual, stickers: stickers });
    });

    // Manejar los controles de música del Remoto
    socket.on('control_musica', (action) => {
        console.log(`Orden de música recibida: ${action}`);
        // Reenviar la orden al Visualizador
        io.emit('control_musica_visualizador', action);
    });

    // Manejar la desconexión del usuario
    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
    });

    // =========================================================
    // LÓGICA DEL ESTADO 2 (PETARDOS) - AJUSTE DE ESCENA 4
    // =========================================================

    // 1. MANEJADOR PARA INICIAR EL ESTADO 2 (Recibido desde el Remoto)
    socket.on('iniciar_estado_2', () => {
        console.log('--- SERVIDOR: INICIANDO ESTADO 2 (PETARDOS) ---');
        
        // 1. Activa los sensores en TODOS los móviles (Mobile A y Mobile B)
        io.emit('activar_estado_2_moviles');
        
        // 2. Cambia el Visualizador al ESTADO 4 para dibujar los fuegos artificiales
        io.emit('cambiar_a_escena_4'); // <-- ¡AJUSTE REALIZADO!
    });

    // 2. MANEJADOR PARA RECIBIR Y REENVIAR EL FUEGO ARTIFICIAL (Recibido desde Mobile 1 o 2)
    socket.on('lanzar_fuego_artificial', (data) => {
        console.log(`SERVIDOR: Retransmitiendo disparo de ${data.mobileId}.`);
        
        // El Visualizador está escuchando el evento 'mostrar_fuego_artificial'
        io.emit('mostrar_fuego_artificial', {
            mobileId: data.mobileId,
            intensity: data.intensity
        });
    });

    socket.on('selfie_enviada', (data) => {
        if (!data || !data.image) return;

        console.log(`Selfie recibida de ${data.mobileId || 'mobile'} (${selfies.length + 1}).`);
        selfies = selfies.filter(entry => entry.mobileId !== data.mobileId);
        selfies.push({
            mobileId: data.mobileId,
            image: data.image
        });

        socket.emit('selfie_confirmada');
        io.emit('selfies_actualizadas', selfies);
    });
});

server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});