const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// 🌍 ESTADO DEL MUNDO (se guarda en memoria, luego usarás base de datos)
// ============================================================================
let mundo = {
    bloques: new Map(), // key: "x,y,z" -> tipo
    jugadores: new Map(), // id -> { nombre, x, y, z, avatar, color }
    construccionesIA: [] // registro de lo que la IA ha construido
};

// Datos iniciales del mundo (un pequeño pueblo generado por IA)
function generarPuebloInicial() {
    const pueblo = [];
    // Plaza central
    for (let x = -5; x <= 5; x++) {
        for (let z = -5; z <= 5; z++) {
            mundo.bloques.set(`${x},0,${z}`, 'pasto');
            if (Math.abs(x) <= 2 && Math.abs(z) <= 2) {
                mundo.bloques.set(`${x},1,${z}`, 'piedra');
            }
        }
    }
    // Fuente central
    mundo.bloques.set(`0,1,0`, 'agua');
    mundo.bloques.set(`1,1,0`, 'agua');
    mundo.bloques.set(`-1,1,0`, 'agua');
    mundo.bloques.set(`0,1,1`, 'agua');
    mundo.bloques.set(`0,1,-1`, 'agua');
    
    // Casitas alrededor
    const casas = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
    casas.forEach(([cx, cz]) => {
        for (let x = cx-2; x <= cx+2; x++) {
            for (let z = cz-2; z <= cz+2; z++) {
                mundo.bloques.set(`${x},1,${z}`, 'madera');
            }
        }
        mundo.bloques.set(`${cx},2,${cz}`, 'madera');
        mundo.bloques.set(`${cx},3,${cz}`, 'hoja');
    });
    
    console.log("🏘️ Pueblo inicial generado por IA");
}

generarPuebloInicial();

// ============================================================================
# 🧠 IA CONSTRUCTORA (genera cosas automáticamente)
// ============================================================================
function iaConstructora() {
    console.log("🧠 IA pensando nuevas construcciones...");
    
    const ideas = [
        { tipo: 'arbol', funcion: (x, z) => generarArbol(x, z) },
        { tipo: 'casa', funcion: (x, z) => generarCasa(x, z) },
        { tipo: 'puente', funcion: (x, z) => generarPuente(x, z) },
        { tipo: 'torre', funcion: (x, z) => generarTorre(x, z) }
    ];
    
    // Elegir una idea aleatoria en una zona vacía
    const idea = ideas[Math.floor(Math.random() * ideas.length)];
    let intentos = 0;
    while (intentos < 20) {
        const x = Math.floor(Math.random() * 60) - 30;
        const z = Math.floor(Math.random() * 60) - 30;
        // Verificar que la zona esté vacía (sin bloques cerca)
        let ocupado = false;
        for (let dx = -3; dx <= 3; dx++) {
            for (let dz = -3; dz <= 3; dz++) {
                if (mundo.bloques.has(`${x+dx},1,${z+dz}`)) ocupado = true;
            }
        }
        if (!ocupado) {
            idea.funcion(x, z);
            mundo.construccionesIA.push({ tipo: idea.tipo, x, z, fecha: new Date() });
            console.log(`✨ IA construyó un ${idea.tipo} en (${x}, ${z})`);
            break;
        }
        intentos++;
    }
    
    // Programar la próxima construcción en 30-90 segundos
    setTimeout(iaConstructora, Math.random() * 60000 + 30000);
}

function generarArbol(x, z) {
    mundo.bloques.set(`${x},1,${z}`, 'madera');
    mundo.bloques.set(`${x},2,${z}`, 'madera');
    mundo.bloques.set(`${x},3,${z}`, 'madera');
    mundo.bloques.set(`${x},4,${z}`, 'hoja');
    mundo.bloques.set(`${x+1},3,${z}`, 'hoja');
    mundo.bloques.set(`${x-1},3,${z}`, 'hoja');
    mundo.bloques.set(`${x},3,${z+1}`, 'hoja');
    mundo.bloques.set(`${x},3,${z-1}`, 'hoja');
}

function generarCasa(x, z) {
    // Base de madera
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            mundo.bloques.set(`${x+dx},1,${z+dz}`, 'madera');
        }
    }
    // Paredes
    for (let dx = -2; dx <= 2; dx++) {
        mundo.bloques.set(`${x+dx},2,${z-2}`, 'madera');
        mundo.bloques.set(`${x+dx},2,${z+2}`, 'madera');
        mundo.bloques.set(`${x-2},2,${z+dx}`, 'madera');
        mundo.bloques.set(`${x+2},2,${z+dx}`, 'madera');
    }
    // Techo
    mundo.bloques.set(`${x},3,${z}`, 'hoja');
    mundo.bloques.set(`${x},4,${z}`, 'hoja');
}

function generarPuente(x, z) {
    for (let i = -3; i <= 3; i++) {
        mundo.bloques.set(`${x+i},1,${z}`, 'madera');
        mundo.bloques.set(`${x+i},1,${z+1}`, 'madera');
    }
}

function generarTorre(x, z) {
    for (let y = 1; y <= 5; y++) {
        mundo.bloques.set(`${x},${y},${z}`, 'piedra');
        mundo.bloques.set(`${x+1},${y},${z}`, 'piedra');
        mundo.bloques.set(`${x},${y},${z+1}`, 'piedra');
        mundo.bloques.set(`${x+1},${y},${z+1}`, 'piedra');
    }
    mundo.bloques.set(`${x},6,${z}`, 'diamante');
}

// ============================================================================
# 🔌 SOCKET.IO: COMUNICACIÓN EN TIEMPO REAL
// ============================================================================
io.on('connection', (socket) => {
    console.log('👤 Nuevo jugador conectado:', socket.id);
    
    // Enviar el mundo actual al nuevo jugador
    const bloquesArray = Array.from(mundo.bloques.entries()).map(([key, tipo]) => {
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z, tipo };
    });
    socket.emit('mundo-inicial', { bloques: bloquesArray, jugadores: Array.from(mundo.jugadores.values()) });
    
    // Registrar nuevo jugador
    const nuevoJugador = {
        id: socket.id,
        nombre: `Explorador${Math.floor(Math.random() * 1000)}`,
        x: 0, y: 2, z: 0,
        avatar: Math.floor(Math.random() * 5),
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };
    mundo.jugadores.set(socket.id, nuevoJugador);
    io.emit('jugador-conectado', nuevoJugador);
    
    // Escuchar cambios de posición
    socket.on('movimiento', (data) => {
        const jugador = mundo.jugadores.get(socket.id);
        if (jugador) {
            jugador.x = data.x;
            jugador.y = data.y;
            jugador.z = data.z;
            socket.broadcast.emit('jugador-movimiento', { id: socket.id, x: data.x, y: data.y, z: data.z });
        }
    });
    
    // Escuchar construcción/destrucción de bloques
    socket.on('modificar-bloque', ({ x, y, z, tipo, accion }) => {
        const key = `${x},${y},${z}`;
        if (accion === 'construir' && tipo) {
            mundo.bloques.set(key, tipo);
            io.emit('bloque-construido', { x, y, z, tipo, jugadorId: socket.id });
        } else if (accion === 'destruir') {
            mundo.bloques.delete(key);
            io.emit('bloque-destruido', { x, y, z, jugadorId: socket.id });
        }
    });
    
    // Escuchar cambios de nombre/avatar
    socket.on('actualizar-perfil', ({ nombre, avatar }) => {
        const jugador = mundo.jugadores.get(socket.id);
        if (jugador) {
            if (nombre) jugador.nombre = nombre;
            if (avatar !== undefined) jugador.avatar = avatar;
            io.emit('jugador-actualizado', { id: socket.id, nombre: jugador.nombre, avatar: jugador.avatar });
        }
    });
    
    // Desconexión
    socket.on('disconnect', () => {
        mundo.jugadores.delete(socket.id);
        io.emit('jugador-desconectado', socket.id);
        console.log('👋 Jugador desconectado:', socket.id);
    });
});

// Iniciar IA constructora
setTimeout(iaConstructora, 5000);

// ============================================================================
# 🚀 INICIAR SERVIDOR
// ============================================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║     🌍 HOVERSE MULTIJUGADOR ACTIVO     ║
    ║     🧠 IA Constructora: ACTIVADA       ║
    ║     🎮 Puerto: ${PORT}                    ║
    ║     📡 http://localhost:${PORT}          ║
    ╚═══════════════════════════════════════╝
    `);
});