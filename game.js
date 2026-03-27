import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================================================
// 🌍 MUNDO CON IA CONSTRUCTORA VISUAL
// ============================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 100);

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

// Luz que sigue al jugador
const playerLight = new THREE.PointLight(0xffaa66, 0.6, 12);
scene.add(playerLight);

// Luz de relleno
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
    if (bloques.has(key)) return;
    
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
// 🏔️ GENERAR MUNDO INICIAL
// ============================================================================
function generarMundo() {
    // Terreno base
    for (let x = -25; x <= 25; x++) {
        for (let z = -25; z <= 25; z++) {
            const altura = Math.floor(
                Math.sin(x * 0.25) * Math.cos(z * 0.25) * 2 +
                Math.sin(x * 0.6) * 0.6 +
                Math.cos(z * 0.6) * 0.6 +
                2
            );
            
            for (let y = 0; y <= altura; y++) {
                let tipo = 'tierra';
                if (y === altura) tipo = 'pasto';
                if (altura >= 3 && y < altura - 1) tipo = 'piedra';
                crearBloque(x, y, z, tipo);
            }
        }
    }
    
    // Árboles
    for (let i = 0; i < 80; i++) {
        const x = Math.floor(Math.random() * 40) - 20;
        const z = Math.floor(Math.random() * 40) - 20;
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
        
        let sueloY = 0;
        for (let y = 5; y >= 0; y--) {
            if (bloques.has(`${x},${y},${z}`)) {
                sueloY = y + 1;
                break;
            }
        }
        
        if (sueloY > 0 && sueloY < 6) {
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

function iaConstructora() {
    const ideas = [
        { nombre: "🏠 una casita", construir: (x, z) => {
            const suelo = encontrarSuelo(x, z);
            if (suelo === null) return false;
            // Base
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    crearBloque(x + dx, suelo, z + dz, 'ladrillo');
                }
            }
            // Paredes
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
        { nombre: "🗼 una torre", construir: (x, z) => {
            const suelo = encontrarSuelo(x, z);
            if (suelo === null) return false;
            for (let y = 0; y < 5; y++) {
                crearBloque(x, suelo + y, z, 'piedra');
                crearBloque(x + 1, suelo + y, z, 'piedra');
                crearBloque(x, suelo + y, z + 1, 'piedra');
                crearBloque(x + 1, suelo + y, z + 1, 'piedra');
            }
            crearBloque(x + 0.5, suelo + 5, z + 0.5, 'diamante');
            return true;
        }},
        { nombre: "💎 una mina de diamantes", construir: (x, z) => {
            const suelo = encontrarSuelo(x, z);
            if (suelo === null) return false;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    crearBloque(x + dx, suelo - 1, z + dz, 'diamante');
                }
            }
            return true;
        }}
    ];
    
    const idea = ideas[Math.floor(Math.random() * ideas.length)];
    let intentos = 0;
    let construido = false;
    
    while (intentos < 30 && !construido) {
        const x = Math.floor(Math.random() * 50) - 25;
        const z = Math.floor(Math.random() * 50) - 25;
        
        // Verificar zona vacía
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
                console.log(`✨ IA construyó ${idea.nombre} en (${x}, ${z})`);
            }
        }
        intentos++;
    }
    
    // Programar próxima construcción (entre 20 y 50 segundos)
    setTimeout(iaConstructora, Math.random() * 30000 + 20000);
}

function encontrarSuelo(x, z) {
    for (let y = 8; y >= 0; y--) {
        if (bloques.has(`${x},${y},${z}`)) {
            return y + 1;
        }
    }
    return null;
}

// Iniciar IA después de generar el mundo
setTimeout(() => {
    iaConstructora();
    mensajeIA.innerHTML = "🧠 IA Constructora activa: creando ciudades y paisajes...";
}, 3000);

// ============================================================================
// 🎮 SISTEMA DE CONSTRUCCIÓN/DESTRUCCIÓN
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
`;
ui.innerHTML = `
    <span>🔨 <span id="modo-text" style="color:#7ec850">CONSTRUIR</span></span>
    <span>📦 <span id="bloque-text">🌿 Pasto</span></span>
    <span>🖱️ Click izquierdo: Construir | Derecho: Destruir</span>
    <span>⌨️ 1-6: Bloques | M: Cambiar modo</span>
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
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(Array.from(bloques.values()));
    
    if (intersects.length > 0) {
        const bloque = intersects[0].object;
        const pos = bloque.userData;
        
        if (esConstruir) {
            const normal = intersects[0].face.normal;
            const nx = pos.x + Math.round(normal.x);
            const ny = pos.y + Math.round(normal.y);
            const nz = pos.z + Math.round(normal.z);
            const key = `${nx},${ny},${nz}`;
            if (!bloques.has(key) && ny >= 0 && ny < 10) {
                crearBloque(nx, ny, nz, bloqueActual);
            }
        } else {
            if (pos.y > 0) {
                eliminarBloque(pos.x, pos.y, pos.z);
            }
        }
    }
}

window.addEventListener('mousedown', (e) => {
    if (!controls.isLocked) return;
    if (e.button === 0) interactuar(e, modoConstruir);
    if (e.button === 2) interactuar(e, false);
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================================
// 🕹️ MOVIMIENTO
// ============================================================================
const movimiento = { adelante: false, atras: false, izquierda: false, derecha: false };
let velocidad = 7;

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': movimiento.adelante = true; break;
        case 'KeyS': movimiento.atras = true; break;
        case 'KeyA': movimiento.izquierda = true; break;
        case 'KeyD': movimiento.derecha = true; break;
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

let prevTime = performance.now();

function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - prevTime) / 1000);
    prevTime = now;
    
    if (controls.isLocked) {
        let dx = 0, dz = 0;
        if (movimiento.adelante) dz -= 1;
        if (movimiento.atras) dz += 1;
        if (movimiento.izquierda) dx -= 1;
        if (movimiento.derecha) dx += 1;
        if (dx !== 0 || dz !== 0) { const len = Math.hypot(dx, dz); dx /= len; dz /= len; }
        controls.moveRight(dx * velocidad * delta);
        controls.moveForward(dz * velocidad * delta);
        if (camera.position.y > 1.7) camera.position.y -= 9.8 * delta;
        else camera.position.y = 1.7;
        
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

// Mensaje final
console.log("%c🌍 HOVERSE | IA Constructora activa | Construye, explora, mejora", "color:#7ec850; font-size:14px;");
console.log("%c💡 La IA está creando ciudades automáticamente... ¡Explora el mundo!", "color:#ffaa66;");