import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ============================================================================
# 🌍 CONEXIÓN CON EL SERVIDOR
// ============================================================================
const socket = io();

// ============================================================================
# 🎮 CONFIGURACIÓN GRÁFICA
// ============================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
renderer.domElement.addEventListener('click', () => controls.lock());

// ============================================================================
# 💡 LUCES MEJORADAS
// ============================================================================
const ambientLight = new THREE.AmbientLight(0x5c6e6b);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5d1, 1.2);
sunLight.position.set(15, 20, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// Luz dinámica que sigue al jugador (para explorar de noche)
const playerLight = new THREE.PointLight(0xffaa66, 0.8, 15);
playerLight.castShadow = true;
scene.add(playerLight);

// ============================================================================
# 🧱 GESTIÓN DE BLOQUES
// ============================================================================
const bloques = new Map();
const tiposBloque = {
    tierra: 0x8B5A2B, pasto: 0x7ec850, piedra: 0x888888,
    madera: 0x8B4513, hoja: 0x2E8B57, diamante: 0x66ccff
};

function crearBloque(x, y, z, tipo) {
    const key = `${x},${y},${z}`;
    if (bloques.has(key)) return;
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: tiposBloque[tipo] || 0x8B5A2B });
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
    }
}

// ============================================================================
# 👥 AVATARES DE JUGADORES
// ============================================================================
const jugadores = new Map();

function crearAvatar(id, nombre, x, y, z, color) {
    const grupo = new THREE.Group();
    
    // Cuerpo
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshStandardMaterial({ color: color }));
    cuerpo.position.y = 0.6;
    grupo.add(cuerpo);
    
    // Cabeza
    const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xffccaa }));
    cabeza.position.y = 1.2;
    grupo.add(cabeza);
    
    // Nombre flotante
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(nombre, 10, 30);
    const textura = new THREE.CanvasTexture(canvas);
    const nombrePlano = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshStandardMaterial({ map: textura, transparent: true }));
    nombrePlano.position.y = 1.8;
    grupo.add(nombrePlano);
    
    grupo.position.set(x, y, z);
    scene.add(grupo);
    jugadores.set(id, grupo);
}

// ============================================================================
# 🕹️ MOVIMIENTO Y CONSTRUCCIÓN
// ============================================================================
const movimiento = { adelante: false, atras: false, izquierda: false, derecha: false };
let modoConstruir = true;
let bloqueActual = 'pasto';

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': movimiento.adelante = true; break;
        case 'KeyS': movimiento.atras = true; break;
        case 'KeyA': movimiento.izquierda = true; break;
        case 'KeyD': movimiento.derecha = true; break;
        case 'KeyM': modoConstruir = !modoConstruir; actualizarUI(); break;
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

function actualizarUI() {
    document.getElementById('modo-text').textContent = modoConstruir ? "CONSTRUIR" : "DESTRUIR";
    document.getElementById('modo-text').style.color = modoConstruir ? "#7ec850" : "#ff6b6b";
    document.getElementById('bloque-text').textContent = document.getElementById('selector-bloque').selectedOptions[0].text;
}
document.getElementById('cambiar-modo').onclick = () => { modoConstruir = !modoConstruir; actualizarUI(); };
document.getElementById('selector-bloque').onchange = (e) => { bloqueActual = e.target.value; actualizarUI(); };

// Raycaster para construir/destruir
const raycaster = new THREE.Raycaster();
function interactuar() {
    if (!controls.isLocked) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(Array.from(bloques.values()));
    if (intersects.length === 0) return;
    
    const bloque = intersects[0].object;
    const pos = bloque.userData;
    
    if (modoConstruir) {
        const normal = intersects[0].face.normal;
        const nx = pos.x + Math.round(normal.x);
        const ny = pos.y + Math.round(normal.y);
        const nz = pos.z + Math.round(normal.z);
        if (ny >= 0 && ny < 10 && !bloques.has(`${nx},${ny},${nz}`)) {
            socket.emit('modificar-bloque', { x: nx, y: ny, z: nz, tipo: bloqueActual, accion: 'construir' });
        }
    } else {
        if (pos.y > 0) {
            socket.emit('modificar-bloque', { x: pos.x, y: pos.y, z: pos.z, accion: 'destruir' });
        }
    }
}
window.addEventListener('mousedown', (e) => { if (e.button === 0 && controls.isLocked) interactuar(); });

// ============================================================================
# 🔌 SOCKET: RECIBIR DATOS DEL SERVIDOR
// ============================================================================
socket.on('mundo-inicial', (data) => {
    data.bloques.forEach(b => crearBloque(b.x, b.y, b.z, b.tipo));
    data.jugadores.forEach(j => crearAvatar(j.id, j.nombre, j.x, j.y, j.z, j.color));
});

socket.on('jugador-conectado', (j) => crearAvatar(j.id, j.nombre, j.x, j.y, j.z, j.color));
socket.on('jugador-desconectado', (id) => { const avatar = jugadores.get(id); if(avatar) scene.remove(avatar); jugadores.delete(id); });
socket.on('jugador-movimiento', ({ id, x, y, z }) => { const avatar = jugadores.get(id); if(avatar) avatar.position.set(x, y, z); });
socket.on('bloque-construido', ({ x, y, z, tipo }) => crearBloque(x, y, z, tipo));
socket.on('bloque-destruido', ({ x, y, z }) => eliminarBloque(x, y, z));

// ============================================================================
# 🏃 MOVIMIENTO DEL JUGADOR LOCAL
// ============================================================================
let velocidad = 5;
let prevTime = performance.now();

function enviarPosicion() {
    socket.emit('movimiento', { x: camera.position.x, y: camera.position.y, z: camera.position.z });
    playerLight.position.set(camera.position.x, camera.position.y - 1, camera.position.z);
}

setInterval(enviarPosicion, 50);

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
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

console.log("%c🌍 HOverse Multijugador | IA construye ciudades | Invita a tus amigos", "color:#7ec850; font-size:14px;");