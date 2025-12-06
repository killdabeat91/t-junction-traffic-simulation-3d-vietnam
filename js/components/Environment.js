import * as THREE from 'three';
import { ROAD_WIDTH, SIDEWALK_WIDTH, ROAD_LEN } from '../constants.js';

const matAsphalt = new THREE.MeshToonMaterial({ color: 0x475569 });
const matMarking = new THREE.MeshToonMaterial({ color: 0xfacc15 });
const matWhite = new THREE.MeshToonMaterial({ color: 0xffffff });
const matSidewalk = new THREE.MeshToonMaterial({ color: 0xcbd5e1 });
const matGrass = new THREE.MeshToonMaterial({ color: 0x86efac });

export function createEnvironment(scene) {
    // Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), matGrass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Intersection
    const inter = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.2, ROAD_WIDTH), matAsphalt);
    inter.position.y = 0.1;
    inter.receiveShadow = true;
    scene.add(inter);

    const armLen = ROAD_LEN - (ROAD_WIDTH / 2);
    const offset = (ROAD_WIDTH / 2) + (armLen / 2);

    createRoadSegment(scene, armLen, -offset, 0, Math.PI / 2);
    createRoadSegment(scene, armLen, offset, 0, Math.PI / 2);
    createRoadSegment(scene, armLen, 0, offset, 0);

    createMarkings(scene, -22, 0, -Math.PI / 2);
    createMarkings(scene, 22, 0, Math.PI / 2);
    createMarkings(scene, 0, 22, 0);

    // Trees
    for (let i = 0; i < 40; i++) {
        const r = 40 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        if (Math.abs(x) < 30 && z > -10) continue;
        if (Math.abs(z) < 30) continue;
        createCartoonTree(scene, x, z);
    }

    createBillboard(scene);
}

function createRoadSegment(scene, length, x, z, rotY) {
    const group = new THREE.Group();
    const road = new THREE.Mesh(new THREE.BoxGeometry(ROAD_WIDTH, 0.2, length), matAsphalt);
    road.position.y = 0.1;
    road.receiveShadow = true;
    group.add(road);

    const swGeo = new THREE.BoxGeometry(SIDEWALK_WIDTH, 0.4, length);
    const swLeft = new THREE.Mesh(swGeo, matSidewalk);
    swLeft.position.set(-(ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), 0.2, 0);
    swLeft.receiveShadow = true;
    group.add(swLeft);

    const swRight = new THREE.Mesh(swGeo, matSidewalk);
    swRight.position.set((ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2), 0.2, 0);
    swRight.receiveShadow = true;
    group.add(swRight);

    // Raised median divider (con lươn) - avoid the crosswalk area
    // For West arm (x < 0, rotated), local +z is NEAR intersection
    // For East/South arms, local -z is NEAR intersection
    // Need to flip the median position for West arm
    const isWestArm = (x < 0 && Math.abs(rotY - Math.PI / 2) < 0.1);

    let nearEnd, farEnd;
    if (isWestArm) {
        // West arm: local +z is near intersection, so flip
        nearEnd = length / 2 - 15; // Near intersection is at +z side
        farEnd = -length / 2 + 5;  // Far from intersection is at -z side
    } else {
        // East/South arms: local -z is near intersection
        nearEnd = -length / 2 + 15;
        farEnd = length / 2 - 5;
    }

    const medianLength = Math.abs(farEnd - nearEnd);
    const medianCenter = (nearEnd + farEnd) / 2;

    const medianMat = new THREE.MeshToonMaterial({ color: 0xfacc15 }); // Yellow

    // Main median body - curved top
    const medianGeo = new THREE.CapsuleGeometry(0.3, medianLength, 4, 8);
    const median = new THREE.Mesh(medianGeo, medianMat);
    median.rotation.x = Math.PI / 2;
    median.position.set(0, 0.35, medianCenter);
    median.castShadow = true;
    median.receiveShadow = true;
    group.add(median);

    // White stripes on sides of median
    const stripeMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const stripeGeo = new THREE.PlaneGeometry(0.15, medianLength);

    const stripeLeft2 = new THREE.Mesh(stripeGeo, stripeMat);
    stripeLeft2.rotation.x = -Math.PI / 2;
    stripeLeft2.position.set(-0.4, 0.22, medianCenter);
    group.add(stripeLeft2);

    const stripeRight2 = new THREE.Mesh(stripeGeo, stripeMat);
    stripeRight2.rotation.x = -Math.PI / 2;
    stripeRight2.position.set(0.4, 0.22, medianCenter);
    group.add(stripeRight2);

    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    scene.add(group);
}

function createMarkings(scene, x, z, rot) {
    const g = new THREE.Group();

    // Stop Line (White, solid, across right lane)
    const stop = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.5), matWhite);
    stop.rotation.x = -Math.PI / 2;
    stop.position.set(10, 0.22, 6.75);
    g.add(stop);

    // Zebra Crossing (Stripes across BOTH lanes)
    const stripeGeo = new THREE.PlaneGeometry(0.8, 4);
    for (let i = -18; i <= 18; i += 2) {
        const stripe = new THREE.Mesh(stripeGeo, matWhite);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(i, 0.22, 2);
        g.add(stripe);
    }

    g.position.set(x, 0, z);
    g.rotation.y = rot;
    scene.add(g);
}

function createCartoonTree(scene, x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 3, 6), new THREE.MeshToonMaterial({ color: 0x8B4513 }));
    trunk.position.y = 1.5; trunk.castShadow = true; g.add(trunk);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 0), new THREE.MeshToonMaterial({ color: 0x4ade80 }));
    leaves.position.y = 4; leaves.castShadow = true; g.add(leaves);
    g.position.set(x, 0, z);
    const s = 0.8 + Math.random() * 0.4;
    g.scale.set(s, s, s);
    scene.add(g);
}

function createBillboard(scene) {
    const g = new THREE.Group();

    // Poles
    const poleMat = new THREE.MeshToonMaterial({ color: 0x555555 });
    const poleGeo = new THREE.CylinderGeometry(0.5, 0.5, 15);
    const p1 = new THREE.Mesh(poleGeo, poleMat); p1.position.set(-6, 7.5, 0); g.add(p1);
    const p2 = new THREE.Mesh(poleGeo, poleMat); p2.position.set(6, 7.5, 0); g.add(p2);

    // Panel Body
    const panelGeo = new THREE.BoxGeometry(16, 8, 1);
    const panelMat = new THREE.MeshToonMaterial({ color: 0x111111 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.y = 15;
    g.add(panel);

    // LED Screen with animated neon effect
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);

    let blinkState = 0;

    function updateBillboard() {
        blinkState++;
        const blink1 = Math.sin(blinkState * 0.1) > 0;
        const blink2 = Math.sin(blinkState * 0.15 + 1) > 0;
        const flicker = Math.random() > 0.95 ? 0.3 : 1;

        // Background
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, 512, 256);

        // Neon glow effect for text
        ctx.shadowBlur = blink1 ? 20 : 5;
        ctx.shadowColor = '#00ffff';

        ctx.font = 'bold 42px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Line 2: Name with different color
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = blink2 ? 25 : 8;
        ctx.font = 'bold 52px "Courier New", monospace';
        ctx.fillStyle = blink2 ? `rgba(255, 0, 255, ${flicker})` : 'rgba(100, 0, 100, 0.3)';
        ctx.fillText('"Nit Noi Family"', 256, 140);

        // Border neon effect
        ctx.shadowBlur = blink1 ? 15 : 3;
        ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = blink1 ? '#00ffff' : '#004444';
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, 496, 240);

        texture.needsUpdate = true;
        requestAnimationFrame(updateBillboard);
    }

    updateBillboard();

    const screenMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(15, 7), screenMat);
    screen.position.set(0, 15, 0.55);
    g.add(screen);

    // Position at the "top of the T" (North side, in grass area)
    g.position.set(0, 0, -35);
    g.rotation.y = 0; // Face South towards intersection

    scene.add(g);
}
