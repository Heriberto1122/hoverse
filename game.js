import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- CONFIGURACIÓN INICIAL ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030); // Azul noche/espacio
scene.fog = new THREE.Fog(0x0a1030, 30, 60); // Niebla para rendimiento

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 4, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- CONTROLES (estilo FPS) ---
const controls = new PointerLockControls(camera, document.body);

renderer.domElement.addEventListener('click', () => {
    controls.lock();
    document.getElementById('controls-hint').style.opacity = '0';
});

// --- LUCES ---
// Luz ambiental
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

// Luz solar direccional
const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
sunLight.position.set(10, 20, 5);
sunLight.castShadow = true;
sunLight.receiveShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// Luz de relleno cálida
const fillLight = new THREE.PointLight(0xffaa66, 0.5);
fillLight.position.set(5, 5, 5);
scene.add(fillLight);

// Luz de fondo fría
const backLight = new THREE.PointLight(0x4466cc, 0.3);
backLight.position.set(-5, 3, -8);
scene.add(backLight);

// --- SUELO (pasto base) ---
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a9e4e });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

// --- FUNCIÓN PARA CREAR BLOQUES ---
function createBlock(x, y, z, color, materialType = 'standard') {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    let material;
    
    if (materialType === 'grass') {
        material = new THREE.MeshStandardMaterial({ color: 0x7ec850 });
    } else if (materialType === 'dirt') {
        material = new THREE.MeshStandardMaterial({ color: 0x8B5A2B });
    } else if (materialType === 'wood') {
        material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    } else if (materialType === 'stone') {
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    } else {
        material = new THREE.MeshStandardMaterial({ color: color });
    }
    
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y, z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    return cube;
}

// --- GENERAR TERRENO ---
const terrainBlocks = [];

for (let i = -12; i <= 12; i++) {
    for (let j = -12; j <= 12; j++) {
        // Evitar el centro donde está el jugador
        if (Math.abs(i) < 3 && Math.abs(j) < 3) continue;
        
        // Altura con ruido simple
        const height = Math.floor(
            Math.sin(i * 0.5) * Math.cos(j * 0.5) * 1.5 +
            Math.sin(i * 1.2) * 0.5 +
            Math.cos(j * 1.2) * 0.5 +
            1
        );
        
        // Asegurar altura mínima
        const finalHeight = Math.max(0, Math.min(3, height));
        
        for (let k = 0; k <= finalHeight; k++) {
            let materialType = 'dirt';
            if (k === finalHeight && finalHeight > 0) materialType = 'grass';
            if (finalHeight === 0 && k === 0) materialType = 'grass';
            if (k < finalHeight && finalHeight > 1) materialType = 'stone';
            
            const block = createBlock(i, k, j, 0, materialType);
            scene.add(block);
            terrainBlocks.push(block);
        }
    }
}

// --- ÁRBOLES ---
const treePositions = [
    [-5, 1, -4], [6, 1, 5], [-6, 1, 6], [4, 1, -5], [-3, 1, 8], [7, 1, -2]
];

treePositions.forEach(pos => {
    // Tronco
    for (let h = 1; h <= 3; h++) {
        const trunk = createBlock(pos[0], pos[1] + h, pos[2], 0, 'wood');
        scene.add(trunk);
        terrainBlocks.push(trunk);
    }
    // Hojas (copa simple)
    const leafPositions = [
        [pos[0], pos[1] + 4, pos[2]],
        [pos[0] + 1, pos[1] + 3, pos[2]],
        [pos[0] - 1, pos[1] + 3, pos[2]],
        [pos[0], pos[1] + 3, pos[2] + 1],
        [pos[0], pos[1] + 3, pos[2] - 1]
    ];
    leafPositions.forEach(leafPos => {
        const leaf = createBlock(leafPos[0], leafPos[1], leafPos[2], 0x2E8B57);
        scene.add(leaf);
        terrainBlocks.push(leaf);
    });
});

// --- ROCAS DECORATIVAS ---
for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * 30;
    const z = (Math.random() - 0.5) * 30;
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
    
    const rock = createBlock(Math.floor(x), 0, Math.floor(z), 0x777777);
    scene.add(rock);
    terrainBlocks.push(rock);
}

// --- SISTEMA DE MOVIMIENTO ---
const moveState = { forward: false, backward: false, left: false, right: false };
const velocity = { x: 0, z: 0 };
const speed = 8.0;

document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
    }
});

// --- CONTADOR DE JUGADORES SIMULADO ---
function updatePlayerCount() {
    const randomCount = Math.floor(Math.random() * 50) + 15;
    document.getElementById('playerCount').innerHTML = `👥 ${randomCount}`;
}
setInterval(updatePlayerCount, 45000);
updatePlayerCount();

// --- CICLO DE ANIMACIÓN ---
let previousTime = performance.now();

function animate() {
    const currentTime = performance.now();
    let delta = Math.min(0.033, (currentTime - previousTime) / 1000);
    previousTime = currentTime;
    
    if (controls.isLocked) {
        // Movimiento
        let moveX = 0, moveZ = 0;
        if (moveState.forward) moveZ -= 1;
        if (moveState.backward) moveZ += 1;
        if (moveState.left) moveX -= 1;
        if (moveState.right) moveX += 1;
        
        if (moveX !== 0 || moveZ !== 0) {
            const length = Math.hypot(moveX, moveZ);
            moveX /= length;
            moveZ /= length;
        }
        
        controls.moveRight(moveX * speed * delta);
        controls.moveForward(moveZ * speed * delta);
        
        // Gravedad simple
        if (camera.position.y > 1.7) {
            camera.position.y -= 9.8 * delta;
        } else {
            camera.position.y = 1.7;
        }
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// --- REDIMENSIONAR VENTANA ---
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- MENSAJE DE BIENVENIDA EN CONSOLA ---
console.log('%c🌍 HOverse - El universo vivo que construyes con IA', 'color: #7ec850; font-size: 16px; font-weight: bold;');
console.log('%cConstruye, explora y mejora el juego con la comunidad. ¡Bienvenido!', 'color: #ffaa66; font-size: 12px;');