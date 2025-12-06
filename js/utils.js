export function createCurve(p0, p1, p2, steps = 10) {
    const pts = [];
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        pts.push({ x, y });
    }
    return pts;
}

export function getBetterPath(arm, type) {
    // Different offsets for different vehicle types
    // Motorcycles share the outer lane with trucks/containers
    let off;
    if (type === 'moto') {
        off = 14; // Motorcycles use outer lane (same as trucks)
    } else if (type === 'car') {
        off = 6; // Cars use middle lane
    } else {
        off = 14; // Trucks/containers use outer lane
    }
    const path = [];
    let turn = 'straight';
    if (arm === 'w') {
        path.push({ x: -200, y: off });
        if (Math.random() < 0.7) {
            path.push({ x: 200, y: off });
        } else {
            turn = 'right';
            path.push({ x: -25, y: off });
            path.push(...createCurve({ x: -25, y: off }, { x: -off, y: off }, { x: -off, y: 25 }));
            path.push({ x: -off, y: 200 });
        }
    } else if (arm === 'e') {
        path.push({ x: 200, y: -off });
        if (Math.random() < 0.7) {
            path.push({ x: -200, y: -off });
        } else {
            turn = 'left';
            path.push({ x: 25, y: -off });
            path.push(...createCurve({ x: 25, y: -off }, { x: 0, y: 0 }, { x: -off, y: 25 }));
            path.push({ x: -off, y: 200 });
        }
    } else if (arm === 's') {
        path.push({ x: off, y: 200 });
        if (Math.random() < 0.5) {
            turn = 'left';
            path.push({ x: off, y: 25 });
            path.push(...createCurve({ x: off, y: 25 }, { x: 0, y: 0 }, { x: -25, y: -off }));
            path.push({ x: -200, y: -off });
        } else {
            turn = 'right';
            path.push({ x: off, y: 25 });
            path.push(...createCurve({ x: off, y: 25 }, { x: off, y: off }, { x: 25, y: off }));
            path.push({ x: 200, y: off });
        }
    }
    return { path, turn };
}
