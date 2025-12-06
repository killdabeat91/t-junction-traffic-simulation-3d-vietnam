import * as THREE from 'three';

function createCountdownTexture(number, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark background with gradient
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, '#2a2a3a');
    gradient.addColorStop(1, '#1a1a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    // Border
    ctx.strokeStyle = '#444455';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 120, 120);

    // Number with glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.font = 'bold 72px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number, 64, 64);

    return new THREE.CanvasTexture(canvas);
}

export function createTrafficLightMesh(scene, x, z, rotation) {
    const group = new THREE.Group();

    // Main pole - taller and more detailed
    const poleMat = new THREE.MeshToonMaterial({ color: 0x2c3e50 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 10), poleMat);
    pole.position.y = 5;
    pole.castShadow = true;
    group.add(pole);

    // Pole base - decorative
    const baseMat = new THREE.MeshToonMaterial({ color: 0x1a252f });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.5, 8), baseMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    // Curved arm (using multiple segments to simulate curve)
    const armMat = new THREE.MeshToonMaterial({ color: 0x2c3e50 });

    // Horizontal arm
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5), armMat);
    arm1.rotation.z = Math.PI / 2;
    arm1.position.set(2.5, 9.5, 0);
    arm1.castShadow = true;
    group.add(arm1);

    // Curved connector
    const curve = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.2, 8, 8, Math.PI / 2), armMat);
    curve.rotation.x = Math.PI / 2;
    curve.rotation.z = -Math.PI / 2;
    curve.position.set(0, 9.5, 0);
    group.add(curve);

    // Traffic light housing - more rounded
    const housingGeo = new THREE.CapsuleGeometry(0.9, 3.5, 8, 16);
    const housingMat = new THREE.MeshToonMaterial({ color: 0x1a1a2e });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(5, 8, 0);
    housing.castShadow = true;
    group.add(housing);

    // Hood/visor over lights
    const visorMat = new THREE.MeshToonMaterial({ color: 0x0f0f1a });
    const createVisor = (yPos) => {
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.15, 1.2),
            visorMat
        );
        visor.position.set(5.6, yPos + 0.4, 0);
        visor.rotation.x = -0.3;
        return visor;
    };
    group.add(createVisor(9));
    group.add(createVisor(8));
    group.add(createVisor(7));

    // Traffic lights with glow effect
    const lightGeo = new THREE.CircleGeometry(0.45, 32);

    // Red light
    const redMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
    const red = new THREE.Mesh(lightGeo, redMat);
    red.position.set(5, 9, 0.91);
    red.name = "red";
    group.add(red);

    // Yellow light
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
    const yellow = new THREE.Mesh(lightGeo, yellowMat);
    yellow.position.set(5, 8, 0.91);
    yellow.name = "yellow";
    group.add(yellow);

    // Green light
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x003300 });
    const green = new THREE.Mesh(lightGeo, greenMat);
    green.position.set(5, 7, 0.91);
    green.name = "green";
    group.add(green);

    // Countdown display - larger and more visible
    const countGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const countMat = new THREE.MeshBasicMaterial({ map: createCountdownTexture("--", "#ffffff") });
    const countdown = new THREE.Mesh(countGeo, countMat);
    countdown.position.set(5, 10.8, 0.5);
    countdown.name = "countdown";
    group.add(countdown);

    // Countdown housing
    const countHousing = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.2, 0.5),
        new THREE.MeshToonMaterial({ color: 0x1a1a2e })
    );
    countHousing.position.set(5, 10.8, 0.2);
    group.add(countHousing);

    // Motorcycle supplementary signal - allows right turn and straight on red
    // Small green arrow panel
    const motoSignalGroup = new THREE.Group();

    // Signal housing
    const motoHousing = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 2.4, 0.4),
        new THREE.MeshToonMaterial({ color: 0x1a1a2e })
    );
    motoSignalGroup.add(motoHousing);

    // Green arrow for right turn (always on)
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 128;
    arrowCanvas.height = 180;
    const ctx = arrowCanvas.getContext('2d');

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 128, 180);

    // Right turn arrow (green)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(90, 50);    // Arrow tip
    ctx.lineTo(60, 30);    // Top
    ctx.lineTo(60, 45);
    ctx.lineTo(30, 45);
    ctx.lineTo(30, 55);
    ctx.lineTo(60, 55);
    ctx.lineTo(60, 70);
    ctx.closePath();
    ctx.fill();

    // Straight arrow (green)
    ctx.beginPath();
    ctx.moveTo(64, 90);    // Arrow tip
    ctx.lineTo(44, 110);   // Left
    ctx.lineTo(54, 110);
    ctx.lineTo(54, 150);
    ctx.lineTo(74, 150);
    ctx.lineTo(74, 110);
    ctx.lineTo(84, 110);
    ctx.closePath();
    ctx.fill();

    // Motorcycle icon (small)
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('🏍️', 64, 175);

    const arrowTexture = new THREE.CanvasTexture(arrowCanvas);
    const arrowMat = new THREE.MeshBasicMaterial({ map: arrowTexture });
    const arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), arrowMat);
    arrowMesh.position.z = 0.21;
    motoSignalGroup.add(arrowMesh);

    // Position the motorcycle signal below main light
    motoSignalGroup.position.set(5, 5.5, 0.9);
    group.add(motoSignalGroup);

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
    return group;
}

export function updateLightVisuals(meshGroup, state, timeLeft) {
    const red = meshGroup.getObjectByName("red");
    const yellow = meshGroup.getObjectByName("yellow");
    const green = meshGroup.getObjectByName("green");
    const countdown = meshGroup.getObjectByName("countdown");

    // Brighter active colors with glow effect
    red.material.color.setHex(state === 'red' ? 0xff2222 : 0x330000);
    yellow.material.color.setHex(state === 'yellow' ? 0xffee00 : 0x333300);
    green.material.color.setHex(state === 'green' ? 0x22ff22 : 0x003300);

    let displayTime = "--";
    let color = '#ffffff';
    if (timeLeft !== null && timeLeft < 999) {
        displayTime = Math.ceil(timeLeft);
        color = state === 'red' ? '#ff4444' : (state === 'green' ? '#44ff44' : '#ffff44');
    }
    countdown.material.map = createCountdownTexture(displayTime, color);
}
