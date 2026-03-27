import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================================================
// 🌍 MUNDO CON IA CONSTRUCTORA
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
// 💡 LUCES
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

function bloqueEn(x, y, z) {
    return bloques.has(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`);
}

// ============================================================================
// 🏔️ GENERAR MUNDO INICIAL
// ============================================================================
function generarMundo() {
    for (let x = -30; x <= 30; x++) {
        for (let z = -30; z <= 30; z++) {
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
    
    // Árboles
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
// 🧠 IA CONSTRUCTORA
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
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    crearBloque(x + dx, suelo, z + dz, 'piedra');
                }
            }
            for (let dx = -2; dx <= 2; dx++) {
                crearBloque(x + dx, suelo + 1, z - 2, 'ladrillo');
                crearBloque(x + dx, suelo + 1, z + 2, 'ladrillo');
                crearBloque(x - 2, suelo + 1, z + dx, 'ladrillo');
                crearBloque(x + 2, suelo + 1, z + dx, 'ladrillo');
            }
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
            crearBloque(x, suelo + 5, z, 'diamante');
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
                mensajeIA.innerHTML = `🧠 IA: "${idea.nombre}" apareció en (${x}, ${z}) 🌟`;
                setTimeout(() => { if(mensajeIA) mensajeIA.innerHTML = `🧠 IA activa: construyendo el mundo...`; }, 5000);
            }
        }
        intentos++;
    }
    setTimeout(iaConstructora, Math.random() * 35000 + 20000);
}

setTimeout(() => {
    iaConstructora();
    mensajeIA.innerHTML = "🧠 IA Constructora activa: creando ciudades...";
}, 3000);

// ============================================================================
// 🎮 SISTEMA DE CONSTRUCCIÓN/DESTRUCCIÓN
// ============================================================================
const raycaster = new THREE.Raycaster();
let modoConstruir = true;
let bloqueActual = 'pasto';

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
    <span>🖱️ Click IZQ: Construir | DER: Destruir</span>
    <span>⌨️ 1-6: Bloques | M: Modo | ESPACIO: Saltar</span>
`;
document.body.appendChild(ui);

function actualizarUI() {
    document.getElementById('modo-text').textContent = modoConstruir ? "CONSTRUIR" : "DESTRUIR";
    document.getElementById('modo-text').style.color = modoConstruir ? "#7ec850" : "#ff6b6b";
    document.getElementById('bloque-text').textContent = tiposBloque[bloqueActual].nombre;
}
actualizarUI();

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
            const nuevoX = pos.x + Math.round(normal.x);
            const nuevoY = pos.y + Math.round(normal.y);
            const nuevoZ = pos.z + Math.round(normal.z);
            const key = `${nuevoX},${nuevoY},${nuevoZ}`;
            if (!bloques.has(key) && nuevoY >= 0 && nuevoY < 12) {
                crearBloque(nuevoX, nuevoY, nuevoZ, bloqueActual);
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
    if (e.button === 0) { e.preventDefault(); interactuar(e, modoConstruir); }
    if (e.button === 2) { e.preventDefault(); interactuar(e, false); }
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================================================
// 🕹️ MOVIMIENTO WASD + SALTO DE 3 BLOQUES
// ============================================================================
const teclas = {
    KeyW: false, KeyS: false, KeyA: false, KeyD: false
};

let velocidadMovimiento = 6.5;
let velocidadY = 0;
let enSuelo = true;
const GRAVEDAD = 22;
const FUERZA_SALTO = 8.5; // Suficiente para saltar 3 bloques de altura

// Eventos de teclado
document.addEventListener('keydown', (e) => {
    if (teclas.hasOwnProperty(e.code)) {
        teclas[e.code] = true;
        e.preventDefault();
    }
    if (e.code === 'Space' && enSuelo && controls.isLocked) {
        velocidadY = FUERZA_SALTO;
        enSuelo = false;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (teclas.hasOwnProperty(e.code)) {
        teclas[e.code] = false;
        e.preventDefault();
    }
});

// ============================================================================
// DETECCIÓN DE SUELO PRECISA
// ============================================================================
function verificarSuelo() {
    const pos = camera.position;
    const alturaOjos = 1.62;
    const pieY = pos.y - alturaOjos;
    
    // Puntos de las esquinas del jugador
    const offsets = [
        { x: -0.35, z: -0.35 }, { x: 0.35, z: -0.35 },
        { x: -0.35, z: 0.35 }, { x: 0.35, z: 0.35 },
        { x: 0, z: 0 }
    ];
    
    for (let offset of offsets) {
        const bloqueX = Math.floor(pos.x + offset.x);
        const bloqueZ = Math.floor(pos.z + offset.z);
        const bloqueY = Math.floor(pieY - 0.05);
        
        if (bloques.has(`${bloqueX},${bloqueY},${bloqueZ}`)) {
            const techoBloque = bloqueY + 1;
            const distancia = techoBloque - pieY;
            if (distancia >= 0 && distancia < 0.3) {
                return { contacto: true, y: techoBloque };
            }
        }
    }
    return { contacto: false, y: 0 };
}

// ============================================================================
// COLISIÓN HORIZONTAL (paredes)
// ============================================================================
function colisionHorizontal(dx, dz) {
    const pos = camera.position;
    const alturaOjos = 1.62;
    const alturas = [pos.y - alturaOjos, pos.y - alturaOjos + 0.8, pos.y];
    
    for (let alt of alturas) {
        const bloqueX = Math.floor(pos.x + dx);
        const bloqueZ = Math.floor(pos.z + dz);
        const bloqueY = Math.floor(alt);
        
        if (bloques.has(`${bloqueX},${bloqueY},${bloqueZ}`)) {
            return true;
        }
    }
    return false;
}

// ============================================================================
// COLISIÓN CON TECHO (para que no atraviese)
// ============================================================================
function verificarTecho() {
    const pos = camera.position;
    const alturaCabeza = pos.y;
    const bloqueCabeza = Math.floor(alturaCabeza);
    const bloqueX = Math.floor(pos.x);
    const bloqueZ = Math.floor(pos.z);
    
    if (bloques.has(`${bloqueX},${bloqueCabeza},${bloqueZ}`)) {
        camera.position.y = bloqueCabeza - 0.1;
        if (velocidadY > 0) velocidadY = 0;
        return true;
    }
    return false;
}

let tiempoAnterior = performance.now();

function animate() {
    const ahora = performance.now();
    let delta = Math.min(0.033, (ahora - tiempoAnterior) / 1000);
    tiempoAnterior = ahora;
    
    if (controls.isLocked) {
        // ========== MOVIMIENTO HORIZONTAL WASD ==========
        let moveX = 0, moveZ = 0;
        if (teclas.KeyW) moveZ -= 1;
        if (teclas.KeyS) moveZ += 1;
        if (teclas.KeyA) moveX -= 1;
        if (teclas.KeyD) moveX += 1;
        
        if (moveX !== 0 || moveZ !== 0) {
            const len = Math.hypot(moveX, moveZ);
            moveX /= len;
            moveZ /= len;
        }
        
        // Movimiento en X con colisión
        const movX = moveX * velocidadMovimiento * delta;
        if (!colisionHorizontal(movX, 0)) {
            controls.moveRight(movX);
        }
        
        // Movimiento en Z con colisión
        const movZ = moveZ * velocidadMovimiento * delta;
        if (!colisionHorizontal(0, movZ)) {
            controls.moveForward(movZ);
        }
        
        // ========== GRAVEDAD Y SALTO ==========
        const suelo = verificarSuelo();
        
        if (suelo.contacto && velocidadY <= 0) {
            // Está en el suelo
            camera.position.y = suelo.y + 1.62;
            velocidadY = 0;
            enSuelo = true;
        } else {
            // Aplicar gravedad
            enSuelo = false;
            velocidadY -= GRAVEDAD * delta;
            camera.position.y += velocidadY * delta;
        }
        
        // Verificar techo (para no atravesar)
        verificarTecho();
        
        // Límite inferior (caída)
        if (camera.position.y < 1.62) {
            camera.position.y = 1.62;
            velocidadY = 0;
            enSuelo = true;
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

console.log("%c🌍 HOVERSE | WASD funciona | Salta 3 bloques de altura", "color:#7ec850; font-size:14px;");
console.log("%c💡 WASD: mover | ESPACIO: saltar | Click IZQ: construir | Click DER: destruir", "color:#ffaa66;");