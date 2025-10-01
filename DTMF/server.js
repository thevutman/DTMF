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

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Manejar el evento para activar el Estado 3 (del cliente Remote)
    socket.on('activar_estado_3', () => {
        console.log('Señal de activación del Estado 3 recibida del Remoto.');
        // Emitir a todos los clientes para que cambien de escena
        io.emit('cambiar_a_escena_3');
        // El visualizador recibe esta señal y muestra "Junten todos para la foto"
    });

    // Manejar el evento para habilitar el botón de la foto (del cliente Remote)
    socket.on('habilitar_foto_desktop', () => {
        console.log('Habilitando botón de foto en el cliente Desktop.');
        // Emitir un evento específico al cliente Desktop
        // Puedes usar io.to(socket.id) si solo quieres enviarlo a un socket,
        // pero en este caso queremos que lo reciba el cliente Desktop que esté conectado
        io.emit('habilitar_foto');
        io.emit('mostrar_gif_sonrie');
    });

    // Manejar la foto enviada por el Cliente Desktop
    socket.on('foto_tomada', (imageData) => {
        console.log('Foto recibida del Desktop.');
        fotoActual = imageData; // Guardar la foto en el servidor
        stickers = []; // Reiniciar los stickers para la nueva foto

        // Enviar la foto al Visualizador y al Mobile B
        io.emit('mostrar_foto', fotoActual);

        // Enviar una señal específica a Mobile A para que active la maraca
        io.emit('activar_maraca');
        console.log('Enviando señal para activar la maraca.');
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

        // Construir la foto final con todos los stickers
        // Aquí necesitarás lógica más compleja si quieres "pegar" los stickers
        // en la imagen final en el servidor. O, simplemente, puedes enviar
        // la foto original y el array de stickers a los clientes móviles.

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

     // 1. MANEJADOR PARA INICIAR EL ESTADO 2 (Recibido desde el Remoto)
    socket.on('iniciar_estado_2', () => {
        console.log('--- INICIANDO ESTADO 2: PETARDOS Y TIROS ---');
        // Enviar señal a TODOS los móviles (A y B) para que activen sus sensores.
        // Usaremos el mismo evento para ambos, ya que la lógica en los móviles será similar.
        io.emit('activar_estado_2_moviles');
        
        // Opcional: Si el Visualizador necesita una señal para cambiar de estado/pantalla.
        io.emit('cambiar_a_escena_2');
    });

    // 2. MANEJADOR PARA RECIBIR Y REENVIAR EL FUEGO ARTIFICIAL (Recibido desde Mobile 1 o 2)
    socket.on('lanzar_fuego_artificial', (data) => {
        // La 'data' contendrá la intensidad del movimiento y el color o ID del móvil.
        console.log(`Fuego artificial recibido de Mobile ${data.mobileId}. Reenviando a Visualizador.`);
        
        // Reenviar la señal y la data (posición, color, etc.) a SOLO el Visualizador.
        // Los móviles no necesitan saber cuándo dispara el otro.
        io.emit('mostrar_fuego_artificial', {
            mobileId: data.mobileId,
            intensity: data.intensity // Usaremos la intensidad para hacer el efecto más grande/pequeño
        });
    });
});

server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
