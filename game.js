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
// ============================================================
// 🧠 SISTEMA DE IA EVOLUTIVA DE HOVERSE
// La IA vive dentro del juego y mejora con cada contribución
// ============================================================

let iaPanelActivo = false;

// --- BASE DE CONOCIMIENTO DE LA IA (evoluciona con cada mejora) ---
let iaConocimiento = {
    version: "0.1",
    mejorasAplicadas: [],
    criteriosEvaluacion: {
        calidadGrafica: { peso: 30, descripcion: "¿Mejora visualmente el juego?" },
        rendimiento: { peso: 25, descripcion: "¿Optimiza o al menos no empeora los FPS?" },
        seguridad: { peso: 20, descripcion: "¿Código limpio sin vulnerabilidades?" },
        compatibilidad: { peso: 15, descripcion: "¿Funciona en todos los navegadores?" },
        documentacion: { peso: 10, descripcion: "¿Tiene comentarios claros?" }
    }
};

// --- EVALUADORA IA (gratis, corre en el navegador) ---
function evaluarCodigoConIA(codigo, descripcion) {
    return new Promise((resolve) => {
        // Simulamos análisis de IA (esto luego se conectará a modelo real)
        setTimeout(() => {
            const evaluacion = {
                puntuacion: 0,
                detalles: [],
                sugerencias: [],
                aprobado: false
            };
            
            // 1. ANÁLISIS DE CALIDAD GRÁFICA (30%)
            let calidadGrafica = 50; // base
            if (codigo.includes('shader') || codigo.includes('material') || codigo.includes('texture')) {
                calidadGrafica += 30;
                evaluacion.detalles.push("✅ Detectada mejora gráfica potencial");
            }
            if (codigo.includes('light') || codigo.includes('shadow')) {
                calidadGrafica += 20;
                evaluacion.detalles.push("✅ Mejora en iluminación detectada");
            }
            if (codigo.includes('color') || codigo.includes('effect')) {
                calidadGrafica += 15;
                evaluacion.detalles.push("✅ Efectos visuales añadidos");
            }
            calidadGrafica = Math.min(100, calidadGrafica);
            
            // 2. ANÁLISIS DE RENDIMIENTO (25%)
            let rendimiento = 70; // base
            if (codigo.includes('requestAnimationFrame') || codigo.includes('optimize')) {
                rendimiento += 20;
                evaluacion.detalles.push("⚡ Optimización de rendimiento detectada");
            }
            if (codigo.includes('setInterval') && !codigo.includes('clearInterval')) {
                rendimiento -= 30;
                evaluacion.sugerencias.push("⚠️ setInterval sin clearInterval puede causar fugas de memoria");
            }
            rendimiento = Math.min(100, Math.max(0, rendimiento));
            
            // 3. ANÁLISIS DE SEGURIDAD (20%)
            let seguridad = 80; // base
            if (codigo.includes('innerHTML') && !codigo.includes('textContent')) {
                seguridad -= 20;
                evaluacion.sugerencias.push("🔒 Usar textContent en lugar de innerHTML para evitar XSS");
            }
            if (codigo.includes('eval(')) {
                seguridad -= 50;
                evaluacion.sugerencias.push("⚠️ EVITAR eval() por riesgos de seguridad");
            }
            
            // 4. COMPATIBILIDAD (15%)
            let compatibilidad = 85; // base
            if (codigo.includes('webkit') || codigo.includes('moz')) {
                compatibilidad += 10;
                evaluacion.detalles.push("🌐 Prefijos de navegador incluidos");
            }
            
            // 5. DOCUMENTACIÓN (10%)
            let documentacion = codigo.includes('//') ? 80 : 30;
            if (documentacion < 50) {
                evaluacion.sugerencias.push("📝 Añadir comentarios explicativos al código");
            }
            
            // CÁLCULO DE PUNTUACIÓN FINAL
            evaluacion.puntuacion = Math.round(
                (calidadGrafica * 0.30) +
                (rendimiento * 0.25) +
                (seguridad * 0.20) +
                (compatibilidad * 0.15) +
                (documentacion * 0.10)
            );
            
            evaluacion.aprobado = evaluacion.puntuacion >= 75;
            
            if (evaluacion.aprobado) {
                evaluacion.detalles.unshift(`🎉 ¡CÓDIGO APROBADO! Puntuación: ${evaluacion.puntuacion}/100`);
                // Registrar mejora en conocimiento de IA
                iaConocimiento.mejorasAplicadas.push({
                    fecha: new Date().toISOString(),
                    descripcion: descripcion,
                    puntuacion: evaluacion.puntuacion,
                    codigo: codigo.substring(0, 200)
                });
            } else {
                evaluacion.detalles.unshift(`❌ CÓDIGO RECHAZADO. Puntuación: ${evaluacion.puntuacion}/100`);
                evaluacion.sugerencias.push(`📈 Necesitas al menos 75 puntos. Faltan: ${75 - evaluacion.puntuacion} puntos`);
            }
            
            resolve(evaluacion);
        }, 1000);
    });
}

// --- CREAR PANEL DE IA EN EL JUEGO ---
function crearPanelIA() {
    if (iaPanelActivo) return;
    iaPanelActivo = true;
    
    const panel = document.createElement('div');
    panel.id = 'ia-panel';
    panel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        max-width: 90vw;
        max-height: 80vh;
        background: rgba(10, 20, 30, 0.98);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        border: 1px solid rgba(126, 200, 80, 0.5);
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        z-index: 10000;
        font-family: monospace;
        color: #eee;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;
    
    panel.innerHTML = `
        <div style="padding: 20px; background: rgba(0,0,0,0.5); border-bottom: 1px solid #7ec850;">
            <h2 style="margin:0; color:#7ec850;">🧠 IA Evolutiva de HOverse</h2>
            <p style="margin:5px 0 0; font-size:12px;">Versión ${iaConocimiento.version} | Mejoras aplicadas: ${iaConocimiento.mejorasAplicadas.length}</p>
        </div>
        
        <div style="padding: 20px; overflow-y: auto; flex:1;">
            <label style="display:block; margin-bottom:10px;">📝 Describe tu mejora:</label>
            <input type="text" id="ia-descripcion" placeholder="Ej: Añadir sombras dinámicas, mejorar agua, optimizar árboles..." 
                   style="width:100%; padding:10px; border-radius:8px; border:1px solid #444; background:#1a2a2a; color:#fff; margin-bottom:15px;">
            
            <label style="display:block; margin-bottom:10px;">💻 Código JavaScript (mejora para game.js):</label>
            <textarea id="ia-codigo" rows="10" placeholder="// Escribe aquí el código que propone mejorar HOverse...
// Ejemplo: 
// function mejorarSombras() {
//     sunLight.shadow.mapSize.width = 2048;
//     console.log('Sombras mejoradas!');
// }" 
                      style="width:100%; padding:10px; border-radius:8px; border:1px solid #444; background:#1a2a2a; color:#7ec850; font-family:monospace;"></textarea>
            
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button id="ia-evaluar" style="flex:1; background:#7ec850; color:#1a2a2a; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer;">🤖 Evaluar con IA</button>
                <button id="ia-cerrar" style="background:#444; border:none; padding:12px; border-radius:8px; cursor:pointer;">❌ Cerrar</button>
            </div>
            
            <div id="ia-resultado" style="margin-top:20px; padding:15px; background:#0a0f0f; border-radius:8px; display:none;">
                <div id="ia-resultado-contenido"></div>
            </div>
        </div>
        
        <div style="padding:12px; background:#0a0f0f; font-size:11px; text-align:center; border-top:1px solid #2a3a2a;">
            🌱 HOverse crece con cada contribución | La IA aprende de tu código
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Eventos
    document.getElementById('ia-evaluar').onclick = async () => {
        const descripcion = document.getElementById('ia-descripcion').value;
        const codigo = document.getElementById('ia-codigo').value;
        
        if (!codigo.trim()) {
            alert("Escribe algo de código para evaluar");
            return;
        }
        
        const resultadoDiv = document.getElementById('ia-resultado');
        const contenidoDiv = document.getElementById('ia-resultado-contenido');
        
        resultadoDiv.style.display = 'block';
        contenidoDiv.innerHTML = '<div style="text-align:center">🤔 Analizando código con IA...</div>';
        
        const evaluacion = await evaluarCodigoConIA(codigo, descripcion);
        
        let html = `<div style="font-size:14px;">`;
        html += `<strong>📊 Puntuación: ${evaluacion.puntuacion}/100</strong><br>`;
        
        if (evaluacion.aprobado) {
            html += `<span style="color:#7ec850;">✅ APROBADO - ¡Mejora aceptada!</span><br>`;
            html += `<br><strong>🎉 Detalles:</strong><ul>`;
            evaluacion.detalles.forEach(d => html += `<li>${d}</li>`);
            html += `</ul>`;
            html += `<br><strong>💾 Esta mejora será integrada en HOverse.</strong>`;
            html += `<br><br><button id="ia-aplicar-mejora" style="background:#7ec850; color:#000; padding:8px 16px; border:none; border-radius:6px; cursor:pointer;">🚀 Aplicar mejora ahora</button>`;
        } else {
            html += `<span style="color:#ff8888;">❌ RECHAZADO - Necesita mejoras</span><br>`;
            html += `<br><strong>📋 Detalles:</strong><ul>`;
            evaluacion.detalles.forEach(d => html += `<li>${d}</li>`);
            html += `</ul>`;
            if (evaluacion.sugerencias.length) {
                html += `<br><strong>💡 Sugerencias de la IA:</strong><ul>`;
                evaluacion.sugerencias.forEach(s => html += `<li>${s}</li>`);
                html += `</ul>`;
            }
        }
        html += `</div>`;
        
        contenidoDiv.innerHTML = html;
        
        if (evaluacion.aprobado) {
            document.getElementById('ia-aplicar-mejora')?.addEventListener('click', () => {
                try {
                    // Evaluar el código propuesto (con cuidado)
                    const funcionEvaluar = new Function(codigo);
                    funcionEvaluar();
                    alert("✅ Mejora aplicada con éxito. HOverse es un poco mejor gracias a ti.");
                    cerrarPanelIA();
                } catch (e) {
                    alert("❌ Error al aplicar el código: " + e.message);
                }
            });
        }
    };
    
    document.getElementById('ia-cerrar').onclick = cerrarPanelIA;
}

function cerrarPanelIA() {
    const panel = document.getElementById('ia-panel');
    if (panel) panel.remove();
    iaPanelActivo = false;
}

// --- AÑADIR OPCIÓN EN MENÚ CONTEXTUAL ---
// Modificar la función crearMenuContextual para incluir opción de IA
// (esto va dentro del array opciones en el menú que hicimos antes)

// Si ya creaste el menú, añade esta opción:
// { texto: "🧠 Proponer mejora a IA", accion: () => crearPanelIA() }
// --- MENSAJE DE BIENVENIDA EN CONSOLA ---
console.log('%c🌍 HOverse - El universo vivo que construyes con IA', 'color: #7ec850; font-size: 16px; font-weight: bold;');
console.log('%cConstruye, explora y mejora el juego con la comunidad. ¡Bienvenido!', 'color: #ffaa66; font-size: 12px;');
