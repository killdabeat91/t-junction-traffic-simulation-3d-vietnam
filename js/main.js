import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEnvironment } from './components/Environment.js';
import { createTrafficLightMesh, updateLightVisuals } from './components/TrafficLight.js';
import { CartoonVehicle } from './components/Vehicle.js';
import { getBetterPath } from './utils.js';
import { STOP_POS } from './constants.js';

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 400);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(80, 80, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.1;

// --- LIGHTS ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.2);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(100, 150, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
const d = 150;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

// --- ENVIRONMENT ---
createEnvironment(scene);

// --- TRAFFIC LIGHTS ---
const lightWest = createTrafficLightMesh(scene, -22, 25, -Math.PI / 2);
const lightEast = createTrafficLightMesh(scene, 22, -25, Math.PI / 2);
const lightSouth = createTrafficLightMesh(scene, 25, 22, 0);

// --- SIMULATION STATE ---
const sim = {
    vehicles: [],
    phase: 0,
    timer: 0,
    mode: 'fixed',
    flowMain: 1500 / 3600,
    flowSide: 800 / 3600,
    timeScale: 1.0,
    stats: {
        carCount: 0, motoCount: 0, truckCount: 0, totalCount: 0,
        carWait: 0, motoWait: 0, truckWait: 0,
        collisions: 0, violations: 0
    },
    config: {
        mainGreen: 15,
        mainYellow: 3,
        sideGreen: 10,
        sideYellow: 3
    }
};

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1) * sim.timeScale;
    const time = clock.getElapsedTime();

    const phases = [
        { d: sim.config.mainGreen, m: 'green', s: 'red', n: 'Main Green' },
        { d: sim.config.mainYellow, m: 'yellow', s: 'red', n: 'Main Yellow' },
        { d: sim.config.sideGreen, m: 'red', s: 'green', n: 'Side Green' },
        { d: sim.config.sideYellow, m: 'red', s: 'yellow', n: 'Side Yellow' },
        { d: 9999, m: 'red', s: 'red', n: 'ALL RED' },
    ];

    if (sim.mode !== 'manual') {
        sim.timer += dt;
        if (sim.timer >= phases[sim.phase].d) {
            sim.phase = (sim.phase + 1) % 4;
            sim.timer = 0;
        }
    }

    const p = phases[sim.phase];
    const el = document.getElementById('current-phase');
    if (el) {
        el.innerText = p.n;
        el.style.color = p.n.includes('Green') ? '#22c55e' : (p.n.includes('Yellow') ? '#eab308' : '#ef4444');
    }

    let timeLeft = null;
    if (sim.mode !== 'manual') {
        timeLeft = p.d - sim.timer;
    }
    updateLightVisuals(lightWest, p.m, timeLeft);
    updateLightVisuals(lightEast, p.m, timeLeft);
    updateLightVisuals(lightSouth, p.s, timeLeft);

    // Spawning
    if (Math.random() < sim.flowMain * dt) {
        const arm = Math.random() < 0.5 ? 'w' : 'e';
        const r = Math.random();
        let type = 'moto';
        if (r > 0.95) type = 'container';
        else if (r > 0.8) type = 'truck';
        else if (r > 0.5) type = 'car';

        const { path, turn } = getBetterPath(arm, type);
        sim.vehicles.push(new CartoonVehicle(scene, sim.stats.totalCount++, type, path, turn));
        if (type === 'car') sim.stats.carCount++;
        else if (type === 'moto') sim.stats.motoCount++;
        else sim.stats.truckCount++;
    }
    if (Math.random() < sim.flowSide * dt) {
        const r = Math.random();
        let type = 'moto';
        if (r > 0.95) type = 'container';
        else if (r > 0.8) type = 'truck';
        else if (r > 0.5) type = 'car';

        const { path, turn } = getBetterPath('s', type);
        sim.vehicles.push(new CartoonVehicle(scene, sim.stats.totalCount++, type, path, turn));
        if (type === 'car') sim.stats.carCount++;
        else if (type === 'moto') sim.stats.motoCount++;
        else sim.stats.truckCount++;
    }

    const mState = p.m;
    const sState = p.s;

    sim.vehicles.forEach(v => {
        let lead = null;
        let minD = 1000;

        // Strict Violation Check
        // Motorcycles going straight or turning right are allowed to pass on red (Vietnam traffic rule)
        if (!v.hasViolated && v.prevPosition < STOP_POS && v.position >= STOP_POS) {
            const startY = v.path[0].y;
            const myLight = (Math.abs(startY) < 50) ? mState : sState;
            if (myLight === 'red' || myLight === 'yellow') {
                const isExempt = (v.type === 'moto' && (v.turnType === 'straight' || v.turnType === 'right'));
                if (!isExempt) {
                    v.hasViolated = true;
                    sim.stats.violations++;
                }
            }
        }

        sim.vehicles.forEach(other => {
            if (other !== v) {
                // Original path-based lead detection
                if (other.path[0].x === v.path[0].x && other.path[0].y === v.path[0].y) {
                    let overlap = true;
                    if (v.type === 'moto' && other.type === 'moto') {
                        if (Math.abs((v.offset || 0) - (other.offset || 0)) > 1.5) overlap = false;
                    }

                    if (overlap) {
                        const d = other.position - v.position;
                        if (d > 0 && d < minD) {
                            minD = d;
                            lead = other;
                        }
                    }
                }

                // Additional check: Detect lane-changed vehicles using 3D mesh position
                // This catches trucks that have switched to car lane
                // Only apply to cars detecting trucks that have changed lanes
                if (v.type === 'car' && other.hasChangedLane) {
                    const dx = v.mesh.position.x - other.mesh.position.x;
                    const dz = v.mesh.position.z - other.mesh.position.z;

                    const minCollisionDist = 5; // car + truck safe distance

                    // Check if truck is ahead and close
                    const lateralDist = Math.abs(dx * Math.sin(v.mesh.rotation.y) + dz * Math.cos(v.mesh.rotation.y));
                    const forwardDist = dx * Math.cos(v.mesh.rotation.y) - dz * Math.sin(v.mesh.rotation.y);

                    // If truck is in front and close
                    if (lateralDist < 3 && forwardDist > 0 && forwardDist < 15) {
                        const stopGap = forwardDist - minCollisionDist;
                        if (stopGap < minD && stopGap > 0) {
                            minD = stopGap;
                            lead = other;
                        }
                    }
                }

                // Collision detection
                const dx = v.mesh.position.x - other.mesh.position.x;
                const dz = v.mesh.position.z - other.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const len1 = (v.type === 'container') ? 4.5 : (v.type === 'truck' ? 3.0 : (v.type === 'car' ? 2.0 : 1.0));
                const len2 = (other.type === 'container') ? 4.5 : (other.type === 'truck' ? 3.0 : (other.type === 'car' ? 2.0 : 1.0));
                const minCollisionDist = len1 + len2;

                // Only count collision if very close
                if (dist < minCollisionDist * 0.7) {
                    if (!v.collisionCooldown && !other.collisionCooldown) {
                        sim.stats.collisions++;
                        v.collisionCooldown = 60;
                        other.collisionCooldown = 60;
                    }
                }
            }
        });
        if (v.collisionCooldown > 0) v.collisionCooldown--;

        let distToLight = -1;
        let state = 'green';
        let vehicleTimeLeft = null;
        if (v.position < STOP_POS) {
            distToLight = STOP_POS - v.position;
            const startY = v.path[0].y;
            if (Math.abs(startY) < 50) {
                state = mState;
                vehicleTimeLeft = (mState === 'green') ? timeLeft : null;
            } else {
                state = sState;
                vehicleTimeLeft = (sState === 'green') ? timeLeft : null;
            }
        }

        v.update(dt, lead, state, distToLight, sim.vehicles, time, scene, vehicleTimeLeft);

        if (v.speed < 0.5) {
            if (v.type === 'car') sim.stats.carWait += dt;
            else if (v.type === 'moto') sim.stats.motoWait += dt;
            else sim.stats.truckWait += dt;
        }
    });

    sim.vehicles = sim.vehicles.filter(v => !v.finished);

    // Update Stats UI
    const elCar = document.getElementById('count-car'); if (elCar) elCar.innerText = sim.stats.carCount;
    const elMoto = document.getElementById('count-moto'); if (elMoto) elMoto.innerText = sim.stats.motoCount;
    const elTruck = document.getElementById('count-truck'); if (elTruck) elTruck.innerText = sim.stats.truckCount;

    // Total count
    const elTotal = document.getElementById('count-total');
    if (elTotal) elTotal.innerHTML = '<b>' + sim.stats.totalCount + '</b>';

    // Active vehicles
    const elActive = document.getElementById('count-active');
    if (elActive) elActive.innerText = sim.vehicles.length;

    // Throughput (vehicles completed per minute)
    if (!sim.stats.startTime) sim.stats.startTime = Date.now();
    const elapsedMinutes = (Date.now() - sim.stats.startTime) / 60000;
    const completedVehicles = sim.stats.totalCount - sim.vehicles.length;
    const throughput = elapsedMinutes > 0 ? (completedVehicles / elapsedMinutes).toFixed(1) : 0;
    const elThroughput = document.getElementById('throughput');
    if (elThroughput) elThroughput.innerText = throughput + '/phút';

    const elWaitCar = document.getElementById('wait-car'); if (elWaitCar) elWaitCar.innerText = (sim.stats.carWait / (sim.stats.carCount || 1)).toFixed(1) + 's';
    const elWaitMoto = document.getElementById('wait-moto'); if (elWaitMoto) elWaitMoto.innerText = (sim.stats.motoWait / (sim.stats.motoCount || 1)).toFixed(1) + 's';
    const elWaitTruck = document.getElementById('wait-truck'); if (elWaitTruck) elWaitTruck.innerText = (sim.stats.truckWait / (sim.stats.truckCount || 1)).toFixed(1) + 's';
    const elCol = document.getElementById('count-collision'); if (elCol) elCol.innerText = sim.stats.collisions;
    const elVio = document.getElementById('count-violation'); if (elVio) elVio.innerText = sim.stats.violations;

    // Update Compass
    const compassArrow = document.getElementById('compass-arrow');
    const compassLabel = document.getElementById('compass-label');
    if (compassArrow && compassLabel) {
        // Get camera angle relative to world
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        // Calculate angle in XZ plane (horizontal)
        const angle = Math.atan2(cameraDir.x, cameraDir.z);
        const degrees = angle * (180 / Math.PI);

        // Rotate arrow opposite to camera direction to point North
        compassArrow.style.transform = `rotate(${degrees}deg)`;

        // Determine cardinal direction
        let direction = 'N';
        const normDeg = ((degrees % 360) + 360) % 360;
        if (normDeg >= 337.5 || normDeg < 22.5) direction = 'S';
        else if (normDeg >= 22.5 && normDeg < 67.5) direction = 'SW';
        else if (normDeg >= 67.5 && normDeg < 112.5) direction = 'W';
        else if (normDeg >= 112.5 && normDeg < 157.5) direction = 'NW';
        else if (normDeg >= 157.5 && normDeg < 202.5) direction = 'N';
        else if (normDeg >= 202.5 && normDeg < 247.5) direction = 'NE';
        else if (normDeg >= 247.5 && normDeg < 292.5) direction = 'E';
        else if (normDeg >= 292.5 && normDeg < 337.5) direction = 'SE';

        compassLabel.innerText = direction;
    }

    controls.update();
    renderer.render(scene, camera);
}

// --- UI HANDLERS ---
window.toggleSettings = () => {
    document.getElementById('settings').classList.toggle('open');
};
window.setMode = (m, el) => {
    sim.mode = m;
    document.querySelectorAll('.mode-opt').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    if (m === 'manual') {
        document.getElementById('manual-controls').style.display = 'block';
        document.getElementById('auto-controls').style.display = 'none';
    } else {
        document.getElementById('manual-controls').style.display = 'none';
        document.getElementById('auto-controls').style.display = 'block';
        sim.timer = 0;
    }
};
window.forcePhase = (idx) => { sim.phase = idx; };

document.getElementById('time-main').addEventListener('change', e => sim.config.mainGreen = parseInt(e.target.value));
document.getElementById('time-side').addEventListener('change', e => sim.config.sideGreen = parseInt(e.target.value));
document.getElementById('flow-main').addEventListener('input', e => sim.flowMain = e.target.value / 3600);
document.getElementById('flow-side').addEventListener('input', e => sim.flowSide = e.target.value / 3600);
document.getElementById('time-scale').addEventListener('input', e => sim.timeScale = parseFloat(e.target.value));
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
