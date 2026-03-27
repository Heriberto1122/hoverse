import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================================================
// 🌍 MUNDO CON IA CONSTRUCTORA Y CONSTRUCCIÓN 3D COMPLETA
// ============================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 60, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
renderer.domElement.addEventListener('click', () => controls.lock());

// ============================================================================
// 💡 LUCES MEJORADAS
// ============================================================================
const ambientLight = new THREE.AmbientLight(0x5c6e6b);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5d1, 1.2);
sunLight.position.set(15, 20, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

const playerLight = new THREE.PointLight(0xffaa66, 0.7, 15);
scene.add(playerLight);

const fillLight = new THREE.PointLight(0x88aaff, 0.3);
fillLight.position.set(5, 10, 5);
scene.add(fillLight);

// ============================================================================
// 🧱 SISTEMA DE BLOQUES
// ============================================================================
const bloques = new Map();

const tiposBloque = {
    pasto: { color: 0x7ec850, nombre: "🌿 Pasto" },
    tierra: { color: 0x8B5A2B, nombre: "🌱 Tierra" },
    piedra: { color: 0x888888, nombre: "🪨 Piedra" },
    madera: { color: 0x8B4513, nombre: "🪵 Madera" },
    hoja: { color: 0x2E8B57, nombre: "🍃 Hoja" },
    diamante: { color: 0x66ccff, nombre: "💎 Diamante" },
    ladrillo: { color: 0xcc5533, nombre: "🧱 Ladrillo" }
};

function crearBloque(x, y, z, tipo) {
    const key = `${x},${y},${z}`;
    if (bloques.has(key)) return null;
    
    const data = tiposBloque[tipo];
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: data.color });
    const bloque = new THREE.Mesh(geometry, material);
    bloque.position.set(x, y, z);
    bloque.castShadow = true;
    bloque.receiveShadow = true;
    bloque.userData = { tipo, x, y, z };
    scene.add(bloque);
    bloques.set(key, bloque);
    return bloque;
}

function eliminarBloque(x, y, z) {
    const key = `${x},${y},${z}`;
    const bloque = bloques.get(key);
    if (bloque) {
        scene.remove(bloque);
        bloque.geometry.dispose();
        bloque.material.dispose();
        bloques.delete(key);
        return true;
    }
    return false;
}

// ============================================================================
// 🏔️ GENERAR MUNDO INICIAL (con colinas)
// ============================================================================
function generarMundo() {
    for (let x = -30; x <= 30; x++) {
        for (let z = -30; z <= 30; z++) {
            // Terreno más variado
            const altura = Math.floor(
                Math.sin(x * 0.25) * Math.cos(z * 0.25) * 2.5 +
                Math.sin(x * 0.5) * 0.8 +
                Math.cos(z * 0.5) * 0.8 +
                2
            );
            
            const alturaFinal = Math.max(0, Math.min(6, altura));
            
            for (let y = 0; y <= alturaFinal; y++) {
                let tipo = 'tierra';
                if (y === alturaFinal) tipo = 'pasto';
                if (alturaFinal >= 3 && y < alturaFinal - 1) tipo = 'piedra';
                crearBloque(x, y, z, tipo);
            }
        }
    }
    
    // Árboles (más abundantes)
    for (let i = 0; i < 120; i++) {
        const x = Math.floor(Math.random() * 50) - 25;
        const z = Math.floor(Math.random() * 50) - 25;
        if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
        
        let sueloY = 0;
        for (let y = 8; y >= 0; y--) {
            if (bloques.has(`${x},${y},${z}`)) {
                sueloY = y + 1;
                break;
            }
        }
        
        if (sueloY > 0 && sueloY < 7) {
            for (let h = 0; h < 4; h++) {
                crearBloque(x, sueloY + h, z, 'madera');
            }
            crearBloque(x, sueloY + 4, z, 'hoja');
            crearBloque(x + 1, sueloY + 3, z, 'hoja');
            crearBloque(x - 1, sueloY + 3, z, 'hoja');
            crearBloque(x, sueloY + 3, z + 1, 'hoja');
            crearBloque(x, sueloY + 3, z - 1, 'hoja');
        }
    }
    
    console.log("✅ Mundo generado con " + bloques.size + " bloques");
}

generarMundo();

// ============================================================================
// 🧠 IA CONSTRUCTORA (genera cosas automáticamente)
// ============================================================================
let mensajeIA = document.createElement('div');
mensajeIA.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(0,0,0,0.7);
    color: #7ec850;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: monospace;
    font-size: 12px;
    z-index: 100;
    backdrop-filter: blur(5px);
    border-left: 3px solid #7ec850;
    animation: pulse 2s infinite;
`;
document.body.appendChild(mensajeIA);

function encontrarSuelo(x, z) {
    for (let y = 10; y >= 0; y--) {
        if (bloques.has(`${x},${y},${z}`)) {
            return y + 1;
        }
    }
    return null;
}

function iaConstructora() {
    const ideas = [
        { nombre: "🏠 una casita", construir: (x, z) => {
            const suelo = encontrarSuelo(x, z);
            if (suelo === null || suelo > 5) return false;
            // Base de piedra
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    crearBloque(x + dx, suelo, z + dz, 'piedra');
                }
            }
            // Paredes de ladrillo
            for (let dx = -2; dx <= 2; dx++) {
                crearBloque(x + dx, suelo + 1, z - 2, 'ladrillo');
                crearBloque(x + dx, suelo + 1, z + 2, 'ladrillo');
                crearBloque(x - 2, suelo + 1, z + dx, 'ladrillo');
                crearBloque(x + 2, suelo + 1, z + dx, 'ladrillo');
            }
            // Techo
            crearBloque(x, suelo + 2, z, 'ladrillo');
            crearBloque(x, suelo + 3, z, 'diamante');
            return true;
        }},
        { nombre: "🌳 un árbol gigante", construir: (x, z) => {
            const suelo = encontrarSuelo(x, z);
            if (suelo === null) return false;
            for (let h = 0; h < 6; h++) crearBloque(x, suelo + h, z, 'madera');
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) <= 3) {
                        crearBloque(x + dx, suelo + 5, z + dz, 'hoja');
                    }
                }
            }
            return true;
        }},
        { nombre: "🗼 una torre de piedra", construir: (x, z) => {
            const suelo = encontrarSuelo(x, z);
            if (suelo === null) return false;
            for (let y = 0; y < 5; y++) {
                crearBloque(x, suelo + y, z, 'piedra');
                crearBloque(x + 1, suelo + y, z, 'piedra');
                crearBloque(x, suelo + y, z + 1, 'piedra');
                crearBloque(x + 1, suelo + y, z + 1, 'piedra');
            }
            crearBloque(x, suelo + 5, z, 'diamante');
            return true;
        }},
        { nombre: "💎 un montículo de diamantes", construir: (x, z) => {
            const suelo = encontrarSuelo(x, z);
            if (suelo === null) return false;
            crearBloque(x, suelo, z, 'diamante');
            crearBloque(x + 1, suelo, z, 'diamante');
            crearBloque(x, suelo, z + 1, 'diamante');
            crearBloque(x - 1, suelo, z, 'diamante');
            crearBloque(x, suelo, z - 1, 'diamante');
            return true;
        }}
    ];
    
    const idea = ideas[Math.floor(Math.random() * ideas.length)];
    let intentos = 0;
    let construido = false;
    
    while (intentos < 40 && !construido) {
        const x = Math.floor(Math.random() * 50) - 25;
        const z = Math.floor(Math.random() * 50) - 25;
        
        let ocupado = false;
        for (let dx = -3; dx <= 3 && !ocupado; dx++) {
            for (let dz = -3; dz <= 3 && !ocupado; dz++) {
                if (bloques.has(`${x + dx},2,${z + dz}`)) ocupado = true;
            }
        }
        
        if (!ocupado && Math.abs(x) > 8 && Math.abs(z) > 8) {
            construido = idea.construir(x, z);
            if (construido) {
                mensajeIA.innerHTML = `🧠 IA Constructora: "${idea.nombre}" apareció en (${x}, ${z}) 🌟`;
                setTimeout(() => { if(mensajeIA) mensajeIA.innerHTML = `🧠 IA activa: construyendo el mundo...`; }, 5000);
            }
        }
        intentos++;
    }
    
    setTimeout(iaConstructora, Math.random() * 35000 + 20000);
}

setTimeout(() => {
    iaConstructora();
    mensajeIA.innerHTML = "🧠 IA Constructora activa: creando ciudades y paisajes...";
}, 3000);

// ============================================================================
// 🎮 SISTEMA DE CONSTRUCCIÓN 3D COMPLETA (¡ARRIBA, ABAJO, PAREDES!)
// ============================================================================
const raycaster = new THREE.Raycaster();
let modoConstruir = true;
let bloqueActual = 'pasto';

// Interfaz de usuario
const ui = document.createElement('div');
ui.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(10px);
    padding: 12px 24px;
    border-radius: 40px;
    color: white;
    font-family: monospace;
    display: flex;
    gap: 20px;
    z-index: 100;
    border: 1px solid #7ec850;
    font-size: 14px;
    flex-wrap: wrap;
    justify-content: center;
`;
ui.innerHTML = `
    <span>🔨 <span id="modo-text" style="color:#7ec850">CONSTRUIR</span></span>
    <span>📦 <span id="bloque-text">🌿 Pasto</span></span>
    <span>🖱️ Click IZQUIERDO: Construir | Click DERECHO: Destruir</span>
    <span>⌨️ 1-6: Bloques | M: Cambiar modo | ESPACIO: Saltar</span>
`;
document.body.appendChild(ui);

function actualizarUI() {
    document.getElementById('modo-text').textContent = modoConstruir ? "CONSTRUIR" : "DESTRUIR";
    document.getElementById('modo-text').style.color = modoConstruir ? "#7ec850" : "#ff6b6b";
    document.getElementById('bloque-text').textContent = tiposBloque[bloqueActual].nombre;
}
actualizarUI();

// Selección de bloques con teclas
window.addEventListener('keydown', (e) => {
    const tecla = e.code;
    const bloquesLista = Object.keys(tiposBloque);
    if (tecla >= 'Digit1' && tecla <= 'Digit6') {
        const idx = parseInt(tecla.slice(-1)) - 1;
        if (bloquesLista[idx]) {
            bloqueActual = bloquesLista[idx];
            actualizarUI();
        }
    }
    if (tecla === 'KeyM') {
        modoConstruir = !modoConstruir;
        actualizarUI();
    }
});

function interactuar(event, esConstruir) {
    if (!controls.isLocked) return;
    
    // Centro de la pantalla para el raycaster
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(Array.from(bloques.values()));
    
    if (intersects.length > 0) {
        const bloque = intersects[0].object;
        const pos = bloque.userData;
        
        if (esConstruir) {
            // Obtener la cara donde estamos mirando para colocar el bloque ADYACENTE
            const normal = intersects[0].face.normal;
            const nuevoX = pos.x + Math.round(normal.x);
            const nuevoY = pos.y + Math.round(normal.y);
            const nuevoZ = pos.z + Math.round(normal.z);
            const key = `${nuevoX},${nuevoY},${nuevoZ}`;
            
            // Limitar altura máxima de construcción
            if (!bloques.has(key) && nuevoY >= 0 && nuevoY < 12) {
                crearBloque(nuevoX, nuevoY, nuevoZ, bloqueActual);
            }
        } else {
            // Destruir bloque (excepto el suelo base en y=0)
            if (pos.y > 0) {
                eliminarBloque(pos.x, pos.y, pos.z);
            }
        }
    }
}

window.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;
    if (e.button === 0) {
        e.preventDefault();
        interactuar(e, modoConstruir);
    }
    if (e.button === 2) {
        e.preventDefault();
        interactuar(e, false);
    }
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================================
// 🕹️ MOVIMIENTO 3D COMPLETO (CON SALTO)
// ============================================================================
const movimiento = { adelante: false, atras: false, izquierda: false, derecha: false };
let velocidad = 7;
let puedeSaltar = true;
let velocidadY = 0;
const gravedad = 20;
const fuerzaSalto = 8;

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': movimiento.adelante = true; break;
        case 'KeyS': movimiento.atras = true; break;
        case 'KeyA': movimiento.izquierda = true; break;
        case 'KeyD': movimiento.derecha = true; break;
        case 'Space': 
            if (puedeSaltar && controls.isLocked) {
                velocidadY = fuerzaSalto;
                puedeSaltar = false;
                e.preventDefault();
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': movimiento.adelante = false; break;
        case 'KeyS': movimiento.atras = false; break;
        case 'KeyA': movimiento.izquierda = false; break;
        case 'KeyD': movimiento.derecha = false; break;
    }
});

// Detección de colisión con el suelo
function verificarColisionSuelo() {
    const posicion = camera.position;
    const alturaJugador = 1.6;
    
    // Revisar debajo del jugador
    const pieX = Math.floor(posicion.x);
    const pieY = Math.floor(posicion.y - alturaJugador);
    const pieZ = Math.floor(posicion.z);
    
    if (bloques.has(`${pieX},${pieY},${pieZ}`)) {
        return true;
    }
    
    // Revisar esquinas
    const esquinas = [
        [Math.floor(posicion.x + 0.3), Math.floor(posicion.y - alturaJugador), Math.floor(posicion.z + 0.3)],
        [Math.floor(posicion.x - 0.3), Math.floor(posicion.y - alturaJugador), Math.floor(posicion.z + 0.3)],
        [Math.floor(posicion.x + 0.3), Math.floor(posicion.y - alturaJugador), Math.floor(posicion.z - 0.3)],
        [Math.floor(posicion.x - 0.3), Math.floor(posicion.y - alturaJugador), Math.floor(posicion.z - 0.3)]
    ];
    
    for (let [x, y, z] of esquinas) {
        if (bloques.has(`${x},${y},${z}`)) {
            return true;
        }
    }
    return false;
}

let prevTime = performance.now();

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - prevTime) / 1000);
    prevTime = now;
    
    if (controls.isLocked) {
        // Movimiento horizontal
        let dx = 0, dz = 0;
        if (movimiento.adelante) dz -= 1;
        if (movimiento.atras) dz += 1;
        if (movimiento.izquierda) dx -= 1;
        if (movimiento.derecha) dx += 1;
        if (dx !== 0 || dz !== 0) { const len = Math.hypot(dx, dz); dx /= len; dz /= len; }
        
        controls.moveRight(dx * velocidad * delta);
        controls.moveForward(dz * velocidad * delta);
        
        // Gravedad y salto (3D completo)
        velocidadY -= gravedad * delta;
        camera.position.y += velocidadY * delta;
        
        // Colisión con el suelo
        if (verificarColisionSuelo()) {
            if (velocidadY <= 0) {
                camera.position.y = Math.floor(camera.position.y) + 1.6;
                velocidadY = 0;
                puedeSaltar = true;
            }
        }
        
        // Limitar caída máxima
        if (camera.position.y < 1.6) {
            camera.position.y = 1.6;
            velocidadY = 0;
            puedeSaltar = true;
        }
        
        // Luz que sigue al jugador
        playerLight.position.set(camera.position.x, camera.position.y - 1, camera.position.z);
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log("%c🌍 HOVERSE | IA Constructora activa | CONSTRUCCIÓN 3D TOTAL", "color:#7ec850; font-size:14px;");
console.log("%c💡 Click IZQUIERDO: Construir | Click DERECHO: Destruir | ESPACIO: Saltar", "color:#ffaa66;");