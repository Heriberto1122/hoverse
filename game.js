import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- MUNDO BÁSICO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 4, 8);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new PointerLockControls(camera, document.body);
renderer.domElement.addEventListener('click', () => controls.lock());

// Luz
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404060));

// Suelo
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x5a9e4e }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
scene.add(ground);

// Árbol simple
const trunk = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
trunk.position.set(2, 1, 2);
scene.add(trunk);
const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.5), new THREE.MeshStandardMaterial({ color: 0x2E8B57 }));
leaves.position.set(2, 2.5, 2);
scene.add(leaves);

// --- MOVIMIENTO ---
const move = { forward: false, backward: false, left: false, right: false };
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': move.forward = true; break;
        case 'KeyS': move.backward = true; break;
        case 'KeyA': move.left = true; break;
        case 'KeyD': move.right = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': move.forward = false; break;
        case 'KeyS': move.backward = false; break;
        case 'KeyA': move.left = false; break;
        case 'KeyD': move.right = false; break;
    }
});

let prevTime = performance.now();
function animate() {
    const delta = Math.min(0.033, (performance.now() - prevTime) / 1000);
    prevTime = performance.now();
    if (controls.isLocked) {
        let x = 0, z = 0;
        if (move.forward) z -= 1;
        if (move.backward) z += 1;
        if (move.left) x -= 1;
        if (move.right) x += 1;
        if (x !== 0 || z !== 0) { const len = Math.hypot(x, z); x /= len; z /= len; }
        controls.moveRight(x * 8 * delta);
        controls.moveForward(z * 8 * delta);
        if (camera.position.y > 1.7) camera.position.y -= 9.8 * delta;
        else camera.position.y = 1.7;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// ============================================================
// 🧠 IA SIMPLE (SOLO PARA VERIFICAR QUE FUNCIONA)
// ============================================================
let iaActivo = false;
function crearPanelIA() {
    if (iaActivo) return;
    iaActivo = true;
    const panel = document.createElement('div');
    panel.innerHTML = `
        <div style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#1a2a2a; border:2px solid #7ec850; border-radius:20px; padding:20px; z-index:10000; color:white; width:400px;">
            <h2>🧠 IA Evolutiva</h2>
            <p>Prueba de concepto funcionando.</p>
            <button id="cerrar-ia" style="background:#7ec850; color:black; padding:10px; border:none; border-radius:8px;">Cerrar</button>
        </div>
    `;
    document.body.appendChild(panel);
    document.getElementById('cerrar-ia').onclick = () => { panel.remove(); iaActivo = false; };
}

// --- MENÚ CONTEXTUAL SIMPLE (ALERT) ---
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    alert("✅ Menú contextual bloqueado. Presiona 'I' para abrir la IA.");
});

// --- ABRIR IA CON TECLA "I" ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyI') {
        e.preventDefault();
        crearPanelIA();
    }
});

console.log("✅ HOverse cargado. Presiona 'I' para abrir la IA.");
