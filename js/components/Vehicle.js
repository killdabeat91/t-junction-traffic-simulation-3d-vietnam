import * as THREE from 'three';
import { STOP_POS } from '../constants.js';

export class CartoonVehicle {
    constructor(scene, id, type, path, turnType) {
        this.id = id;
        this.type = type;
        this.path = path;
        this.turnType = turnType;
        this.speed = 0;
        if (type === 'moto') this.maxSpeed = 15;
        else if (type === 'car') this.maxSpeed = 18;
        else if (type === 'truck') this.maxSpeed = 12;
        else this.maxSpeed = 10; // container

        // Motorcycle offset: random between -3 and +3 (path offset is 14, same as trucks)
        // This allows motorcycles to spread across the outer lane (position 11 to 17)
        this.offset = (type === 'moto') ? (Math.random() - 0.5) * 6 : 0;

        this.position = 0;
        this.prevPosition = 0;
        this.pathIndex = 0;
        this.t = 0;
        this.finished = false;
        this.hasViolated = false;
        this.collisionCooldown = 0;
        this.mesh = this.createMesh(type);
        scene.add(this.mesh);
    }

    createMesh(type) {
        const g = new THREE.Group();
        const color = new THREE.Color().setHSL(Math.random(), 0.85, 0.55);
        const darkColor = color.clone().multiplyScalar(0.6);

        if (type === 'moto') {
            // Motorcycle body - sleeker design
            const bodyMat = new THREE.MeshToonMaterial({ color: 0xf59e0b });
            const bodyDark = new THREE.MeshToonMaterial({ color: 0xb45309 });

            // Main body
            const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.7), bodyMat);
            body.position.y = 1.0; body.castShadow = true; g.add(body);

            // Fuel tank
            const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), bodyMat);
            tank.rotation.z = Math.PI / 2;
            tank.position.set(0.2, 1.3, 0); tank.castShadow = true; g.add(tank);

            // Front fork
            const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), bodyDark);
            fork.rotation.z = 0.3;
            fork.position.set(0.9, 0.8, 0); g.add(fork);

            // Wheels - vertical, aligned with motorcycle direction
            const wheelGeo = new THREE.TorusGeometry(0.35, 0.12, 8, 16);
            const wheelMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a });
            const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
            frontWheel.rotation.x = Math.PI / 2; // Vertical wheel
            frontWheel.position.set(0.9, 0.47, 0); g.add(frontWheel);
            const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
            rearWheel.rotation.x = Math.PI / 2; // Vertical wheel
            rearWheel.position.set(-0.7, 0.47, 0); g.add(rearWheel);

            // Rider - more detailed
            const helmetMat = new THREE.MeshToonMaterial({ color: 0x333333 });
            const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), helmetMat);
            helmet.scale.set(1, 1.1, 0.9);
            helmet.position.set(-0.1, 2.0, 0); g.add(helmet);

            // Visor
            const visor = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8, 0, Math.PI),
                new THREE.MeshBasicMaterial({ color: 0x1a1a2e }));
            visor.rotation.y = Math.PI / 2;
            visor.position.set(0.05, 2.0, 0); g.add(visor);

            // Body/jacket
            const jacketColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.4);
            const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5),
                new THREE.MeshToonMaterial({ color: jacketColor }));
            jacket.position.set(-0.1, 1.45, 0); g.add(jacket);

            // Turn signals
            const tGeo = new THREE.SphereGeometry(0.08);
            const tMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
            const tl = new THREE.Mesh(tGeo, tMat.clone()); tl.position.set(1.0, 0.9, 0.35); tl.name = 'turnFL'; g.add(tl);
            const tr = new THREE.Mesh(tGeo, tMat.clone()); tr.position.set(1.0, 0.9, -0.35); tr.name = 'turnFR'; g.add(tr);
            return g;
        }

        // Common wheel geometry - more detailed
        const createWheel = (x, z) => {
            const wheelGroup = new THREE.Group();

            // Tire - torus rotated to roll along X axis
            const tire = new THREE.Mesh(
                new THREE.TorusGeometry(0.5, 0.2, 8, 24),
                new THREE.MeshToonMaterial({ color: 0x1a1a1a })
            );
            tire.rotation.x = Math.PI / 2; // Rotate to be vertical, rolling on ground
            wheelGroup.add(tire);

            // Rim - cylinder aligned with wheel
            const rim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.35, 0.35, 12),
                new THREE.MeshToonMaterial({ color: 0x888899 })
            );
            rim.rotation.x = Math.PI / 2; // Align with tire
            wheelGroup.add(rim);

            // Hub cap - on the outer side
            const hub = new THREE.Mesh(
                new THREE.CircleGeometry(0.25, 8),
                new THREE.MeshToonMaterial({ color: 0xaaaaaa })
            );
            hub.rotation.x = Math.PI / 2;
            hub.position.y = 0.18;
            wheelGroup.add(hub);

            // Position wheel: radius is ~0.7 (0.5 + 0.2), so Y should be 0.7 to sit on ground
            wheelGroup.position.set(x, 0.7, z);
            wheelGroup.rotation.x = Math.PI / 2; // Final rotation to align wheels
            g.add(wheelGroup);

            // Clone for other side
            const wheelGroup2 = wheelGroup.clone();
            wheelGroup2.position.set(x, 0.7, -z);
            g.add(wheelGroup2);
        };

        if (type === 'car') {
            // Car body - more curved and realistic
            const bodyMat = new THREE.MeshToonMaterial({ color: color });
            const glassMat = new THREE.MeshToonMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 });

            // Main body
            const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2.1), bodyMat);
            body.position.y = 1.0; body.castShadow = true; g.add(body);

            // Hood (front slope)
            const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 2.0), bodyMat);
            hood.position.set(1.8, 1.4, 0);
            hood.rotation.z = -0.15;
            hood.castShadow = true; g.add(hood);

            // Cabin/roof
            const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.9), bodyMat);
            roof.position.set(-0.3, 2.0, 0); roof.castShadow = true; g.add(roof);

            // Windows
            const frontWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), glassMat);
            frontWindow.position.set(0.8, 1.9, 0);
            frontWindow.rotation.y = Math.PI / 2;
            frontWindow.rotation.x = 0.2;
            g.add(frontWindow);

            const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), glassMat);
            rearWindow.position.set(-1.4, 1.85, 0);
            rearWindow.rotation.y = Math.PI / 2;
            rearWindow.rotation.x = -0.15;
            g.add(rearWindow);

            // Side windows
            const sideWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), glassMat);
            sideWindow.position.set(-0.3, 1.9, 1.01);
            g.add(sideWindow);
            const sideWindow2 = sideWindow.clone();
            sideWindow2.position.z = -1.01;
            sideWindow2.rotation.y = Math.PI;
            g.add(sideWindow2);

            // Headlights
            const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
            const headlightL = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), headlightMat);
            headlightL.position.set(2.01, 1.0, 0.6);
            headlightL.rotation.y = Math.PI / 2;
            g.add(headlightL);
            const headlightR = headlightL.clone();
            headlightR.position.z = -0.6;
            g.add(headlightR);

            createWheel(1.2, 1.05);
            createWheel(-1.2, 1.05);

            // Brake lights
            const lGeo = new THREE.BoxGeometry(0.1, 0.2, 0.3);
            const brake = new THREE.Mesh(lGeo, new THREE.MeshBasicMaterial({ color: 0x550000 }));
            brake.position.set(-2.01, 1.2, 0.7); brake.name = 'brakeL'; g.add(brake);
            const brake2 = brake.clone(); brake2.position.set(-2.01, 1.2, -0.7); brake2.name = 'brakeR'; g.add(brake2);

            // Turn signals
            const tGeo = new THREE.BoxGeometry(0.1, 0.15, 0.2);
            const tMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
            const tl = new THREE.Mesh(tGeo, tMat.clone()); tl.position.set(2.01, 1.0, 0.95); tl.name = 'turnFL'; g.add(tl);
            const tr = new THREE.Mesh(tGeo, tMat.clone()); tr.position.set(2.01, 1.0, -0.95); tr.name = 'turnFR'; g.add(tr);
            const rtl = new THREE.Mesh(tGeo, tMat.clone()); rtl.position.set(-2.01, 1.2, 0.95); rtl.name = 'turnRL'; g.add(rtl);
            const rtr = new THREE.Mesh(tGeo, tMat.clone()); rtr.position.set(-2.01, 1.2, -0.95); rtr.name = 'turnRR'; g.add(rtr);

        } else if (type === 'truck') {
            const cabMat = new THREE.MeshToonMaterial({ color: color });
            const cargoMat = new THREE.MeshToonMaterial({ color: 0xe5e7eb });
            const glassMat = new THREE.MeshToonMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });

            // Cabin
            const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), cabMat);
            cab.position.set(1.6, 1.6, 0); cab.castShadow = true; g.add(cab);

            // Cabin roof detail
            const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.0), cabMat);
            cabRoof.position.set(1.6, 2.8, 0); g.add(cabRoof);

            // Windshield
            const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), glassMat);
            windshield.position.set(2.71, 2.0, 0);
            windshield.rotation.y = Math.PI / 2;
            g.add(windshield);

            // Cargo box
            const cargo = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 2.3), cargoMat);
            cargo.position.set(-1.8, 1.8, 0); cargo.castShadow = true; g.add(cargo);

            // Cargo door lines
            const doorLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.4, 2.2),
                new THREE.MeshToonMaterial({ color: 0xcccccc }));
            doorLine.position.set(-3.9, 1.8, 0); g.add(doorLine);

            createWheel(1.6, 1.1);
            createWheel(-1.5, 1.1);
            createWheel(-3.2, 1.1);

            // Lights
            const lGeo = new THREE.BoxGeometry(0.1, 0.25, 0.3);
            const brake = new THREE.Mesh(lGeo, new THREE.MeshBasicMaterial({ color: 0x550000 }));
            brake.position.set(-3.91, 1.2, 0.8); brake.name = 'brakeL'; g.add(brake);
            const brake2 = brake.clone(); brake2.position.set(-3.91, 1.2, -0.8); brake2.name = 'brakeR'; g.add(brake2);

            const tGeo = new THREE.BoxGeometry(0.1, 0.2, 0.25);
            const tMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
            const tl = new THREE.Mesh(tGeo, tMat.clone()); tl.position.set(2.71, 1.2, 1.0); tl.name = 'turnFL'; g.add(tl);
            const tr = new THREE.Mesh(tGeo, tMat.clone()); tr.position.set(2.71, 1.2, -1.0); tr.name = 'turnFR'; g.add(tr);
            const rtl = new THREE.Mesh(tGeo, tMat.clone()); rtl.position.set(-3.91, 1.2, 1.0); rtl.name = 'turnRL'; g.add(rtl);
            const rtr = new THREE.Mesh(tGeo, tMat.clone()); rtr.position.set(-3.91, 1.2, -1.0); rtr.name = 'turnRR'; g.add(rtr);

        } else if (type === 'container') {
            const cabMat = new THREE.MeshToonMaterial({ color: 0xdc2626 }); // Red cabin
            const containerMat = new THREE.MeshToonMaterial({ color: 0x2563eb }); // Blue container
            const glassMat = new THREE.MeshToonMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });

            // Cabin - truck head
            const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.4), cabMat);
            cab.position.set(3.5, 1.7, 0); cab.castShadow = true; g.add(cab);

            // Cabin details
            const grille = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 1.8),
                new THREE.MeshToonMaterial({ color: 0x444444 }));
            grille.position.set(4.76, 1.2, 0); g.add(grille);

            // Windshield
            const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.2), glassMat);
            windshield.position.set(4.76, 2.2, 0);
            windshield.rotation.y = Math.PI / 2;
            g.add(windshield);

            // Container
            const container = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.8, 2.4), containerMat);
            container.position.set(-1.5, 1.9, 0); container.castShadow = true; g.add(container);

            // Container ridges (decorative)
            for (let i = -4; i <= 2; i += 1.5) {
                const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 2.3),
                    new THREE.MeshToonMaterial({ color: 0x1d4ed8 }));
                ridge.position.set(i, 1.9, 0); g.add(ridge);
            }

            createWheel(3.5, 1.2);
            createWheel(0.5, 1.2);
            createWheel(-1.5, 1.2);
            createWheel(-4.5, 1.2);

            // Lights
            const lGeo = new THREE.BoxGeometry(0.1, 0.3, 0.4);
            const brake = new THREE.Mesh(lGeo, new THREE.MeshBasicMaterial({ color: 0x550000 }));
            brake.position.set(-5.26, 1.2, 0.9); brake.name = 'brakeL'; g.add(brake);
            const brake2 = brake.clone(); brake2.position.set(-5.26, 1.2, -0.9); brake2.name = 'brakeR'; g.add(brake2);

            const tGeo = new THREE.BoxGeometry(0.1, 0.25, 0.3);
            const tMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
            const tl = new THREE.Mesh(tGeo, tMat.clone()); tl.position.set(4.76, 1.2, 1.1); tl.name = 'turnFL'; g.add(tl);
            const tr = new THREE.Mesh(tGeo, tMat.clone()); tr.position.set(4.76, 1.2, -1.1); tr.name = 'turnFR'; g.add(tr);
            const rtl = new THREE.Mesh(tGeo, tMat.clone()); rtl.position.set(-5.26, 1.2, 1.1); rtl.name = 'turnRL'; g.add(rtl);
            const rtr = new THREE.Mesh(tGeo, tMat.clone()); rtr.position.set(-5.26, 1.2, -1.1); rtr.name = 'turnRR'; g.add(rtr);
        }
        return g;
    }

    updateLights(time) {
        const blink = Math.floor(time * 4) % 2 === 0;
        const onColor = 0xffaa00;
        const offColor = 0x333300;
        let signaling = false;
        if (this.turnType !== 'straight' && this.position > 150 && this.position < 250) {
            signaling = true;
        }
        if (signaling && blink) {
            // Note: Lights are swapped because mesh faces -X direction when moving
            if (this.turnType === 'left') {
                const fr = this.mesh.getObjectByName('turnFR'); if (fr) fr.material.color.setHex(onColor);
                const rr = this.mesh.getObjectByName('turnRR'); if (rr) rr.material.color.setHex(onColor);
            } else {
                const fl = this.mesh.getObjectByName('turnFL'); if (fl) fl.material.color.setHex(onColor);
                const rl = this.mesh.getObjectByName('turnRL'); if (rl) rl.material.color.setHex(onColor);
            }
        } else {
            ['turnFL', 'turnFR', 'turnRL', 'turnRR'].forEach(n => {
                const o = this.mesh.getObjectByName(n); if (o) o.material.color.setHex(offColor);
            });
        }
    }

    update(dt, lead, lightState, distToLight, allVehicles, time, scene, timeLeft) {
        this.prevPosition = this.position;
        let s = 100;
        let dv = 0;

        // Motorcycles ignore trucks/containers/other motos as lead when changing lanes to pass
        if (lead && !(this.type === 'moto' && this.hasChangedLane && (lead.type === 'truck' || lead.type === 'container' || lead.type === 'moto'))) {
            s = lead.position - this.position - 6;
            dv = this.speed - lead.speed;
        }

        // Flag for green light about to change (within 3 seconds and 50m)
        this.slowForYellow = false;
        if (lightState === 'green' && timeLeft !== null && timeLeft <= 3 && distToLight > 0 && distToLight < 50) {
            this.slowForYellow = true;
        }

        if (distToLight > 0 && distToLight < 80) {
            if (lightState === 'red' || lightState === 'yellow') {
                // Motorcycles going straight OR turning right can pass on red (Vietnam traffic rule)
                const canPassOnRed = (this.type === 'moto' && (this.turnType === 'straight' || this.turnType === 'right'));

                if (!canPassOnRed) {
                    const stopGap = distToLight - 8; // Increased buffer to stop before line
                    if (stopGap < s) {
                        s = stopGap;
                        dv = this.speed;
                    }
                }
            }
        }

        // Lane change logic for trucks: switch to car lane if it has less traffic
        if ((this.type === 'truck' || this.type === 'container') && this.turnType === 'straight') {
            if (distToLight > 20 && distToLight < 100 && (lightState === 'red' || lightState === 'yellow')) {
                // Count vehicles in truck lane vs car lane from same direction
                const myStart = this.path[0];
                let truckLaneCount = 0;
                let carLaneCount = 0;

                for (let v of allVehicles) {
                    if (v === this) continue;
                    const vStart = v.path[0];
                    // Same direction check
                    if (Math.abs(vStart.x - myStart.x) < 10 && Math.abs(vStart.y - myStart.y) < 10) {
                        // Vehicle is waiting (near stop line and slow)
                        if (v.position > 150 && v.position < 210 && v.speed < 2) {
                            if (v.type === 'truck' || v.type === 'container') {
                                truckLaneCount++;
                            } else if (v.type === 'car') {
                                carLaneCount++;
                            }
                        }
                    }
                }

                // If car lane has significantly fewer vehicles, switch lanes
                // Trucks use offset 0 by default, cars use offset ~8 (difference in path)
                // We simulate lane change by adjusting the lateral offset
                if (!this.hasChangedLane && carLaneCount < truckLaneCount && carLaneCount < 3) {
                    this.hasChangedLane = true;
                    this.targetOffset = -8; // Move towards car lane (inner lane)
                }
            }
        }

        // Lane change logic for motorcycles when there's a truck/container ahead
        // Motorcycles immediately move to the appropriate side and proceed without waiting
        if (this.type === 'moto' && !this.hasChangedLane) {
            // Check if there's a truck/container ahead (regardless of speed - don't wait)
            let bigVehicleAhead = false;
            for (let v of allVehicles) {
                if (v === this) continue;
                if (v.type !== 'truck' && v.type !== 'container') continue;

                // Check if same direction
                const vStart = v.path[0];
                const myStart = this.path[0];
                if (Math.abs(vStart.x - myStart.x) < 10 && Math.abs(vStart.y - myStart.y) < 10) {
                    // Check if truck is ahead (any distance up to 40m)
                    const distAhead = v.position - this.position;
                    if (distAhead > 0 && distAhead < 40) {
                        bigVehicleAhead = true;
                        break;
                    }
                }
            }

            if (bigVehicleAhead) {
                this.hasChangedLane = true;

                // Motorcycle is in outer lane (path offset is 14)
                // Right turn: immediately move to right edge and continue (don't wait)
                // Left turn: move to left side
                if (this.turnType === 'right' || this.turnType === 'straight') {
                    // Right turn or straight: move to right edge, change to right turn, and GO
                    this.targetOffset = 3;
                    this.turnType = 'right';
                    // Don't stop for the truck - motorcycle will pass on the inside
                } else if (this.turnType === 'left') {
                    // Left turn: move to left side of lane
                    this.targetOffset = -3;
                }
            }
        }

        // Smooth lane change animation
        if (this.targetOffset !== undefined && this.targetOffset !== this.offset) {
            const laneChangeSpeed = 2 * dt;
            if (Math.abs(this.targetOffset - this.offset) < laneChangeSpeed) {
                this.offset = this.targetOffset;
            } else {
                this.offset += (this.targetOffset > this.offset ? 1 : -1) * laneChangeSpeed;
            }
        }

        // Yield Logic (Smarter Left Turn) - only yield if there are vehicles in conflict zone
        if (this.turnType === 'left' && this.position > 170 && this.position < 210) {
            const myStart = this.path[0];
            let oppPrefix = '';
            if (myStart.x < -100) oppPrefix = 'e';
            else if (myStart.x > 100) oppPrefix = 'w';

            if (oppPrefix) {
                let hasConflict = false;
                for (let v of allVehicles) {
                    const vStart = v.path[0];
                    const isOpp = (oppPrefix === 'e' && vStart.x > 100) || (oppPrefix === 'w' && vStart.x < -100);

                    if (isOpp && v.turnType === 'straight') {
                        // Check if opposing vehicle is in critical zone
                        if (v.position > 160 && v.position < 210 && v.speed > 1) {
                            const distToConflict = 200 - v.position;
                            // Only yield if vehicle is actually close
                            if (distToConflict < 25 && distToConflict > -5) {
                                hasConflict = true;
                                const tta = distToConflict / Math.max(v.speed, 0.5);
                                if (tta < 3) {
                                    const dist = 3;
                                    if (dist < s) { s = dist; dv = this.speed; }
                                }
                            }
                        }
                    }
                }
                // If no conflict, proceed normally (no yielding needed)
            }
        }

        // Note: Cross-lane collision check removed to prevent gridlock
        // Vehicles may pass through each other visually but traffic flows smoothly

        let limit = this.maxSpeed;
        // Only reduce speed slightly when actively turning (in the curve)
        if (this.turnType !== 'straight' && this.position > 195 && this.position < 210) {
            limit = Math.max(12, this.maxSpeed * 0.7); // At least 12, or 70% of max
        }
        // Slow down when green light is about to change
        if (this.slowForYellow) {
            limit = Math.min(limit, this.maxSpeed * 0.6);
        }
        if (s < 0.1) s = 0.1;

        // Simplified IDM - less aggressive braking when no lead vehicle
        const desiredGap = 4.0;
        const T = 1.5;
        const delta = 4;
        let s_star = desiredGap + this.speed * T;
        if (dv > 0) {
            s_star += (this.speed * dv) / (2 * Math.sqrt(2 * 2));
        }

        // Calculate acceleration
        let acc = 2.5 * (1 - Math.pow(this.speed / limit, delta) - Math.pow(s_star / s, 2));

        // Limit negative acceleration when gap is large (no lead vehicle)
        if (s > 50 && acc < 0) {
            acc = Math.max(acc, -0.5);
        }

        this.speed += acc * dt;
        if (this.speed < 0) this.speed = 0;

        const move = this.speed * dt;
        this.position += move;

        let remaining = move;
        while (remaining > 0 && this.pathIndex < this.path.length - 1) {
            const p1 = this.path[this.pathIndex];
            const p2 = this.path[this.pathIndex + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const cur = this.t * len;
            if (cur + remaining <= len) {
                this.t = (cur + remaining) / len;
                remaining = 0;
            } else {
                remaining -= (len - cur);
                this.pathIndex++;
                this.t = 0;
            }
        }
        if (this.pathIndex >= this.path.length - 1) {
            this.finished = true;
            scene.remove(this.mesh);
        } else {
            const p1 = this.path[this.pathIndex];
            const p2 = this.path[this.pathIndex + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            // Calculate position with offset
            const x = p1.x + (p2.x - p1.x) * this.t;
            const z = p1.y + (p2.y - p1.y) * this.t;

            // Perpendicular offset
            // Direction vector (dx, dy)
            // Perpendicular (-dy, dx)
            const ndx = dx / len;
            const ndy = dy / len;
            const ox = -ndy * this.offset;
            const oz = ndx * this.offset;

            this.mesh.position.set(x + ox, 0, z + oz);
            this.mesh.rotation.y = -Math.atan2(dy, dx);
            if (this.type === 'car') {
                const color = (acc < -0.5 || this.speed < 0.1) ? 0xff0000 : 0x550000;
                this.mesh.getObjectByName('brakeL').material.color.setHex(color);
                this.mesh.getObjectByName('brakeR').material.color.setHex(color);
            }
            this.updateLights(time);
        }
    }
}
