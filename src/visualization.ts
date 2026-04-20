interface GhostRef {
    x: number;
    y: number;
    baseZ: number;
}

let pathGhosts: GhostRef[] = [];
let junctionGhosts: GhostRef[] = [];

function placeGhost(pos: CoordsXYZ): GhostRef | null {
    const tile = map.getTile(pos.x / 32, pos.y / 32);

    let real: FootpathElement | null = null;
    for (let i = 0; i < tile.numElements; i++) {
        const el = tile.getElement(i);
        if (el.type === "footpath" && el.baseZ === pos.z) {
            real = el as FootpathElement;
            break;
        }
    }
    if (!real) return null;

    // Snapshot the source values before insertElement, which reallocates the
    // tile's element vector and invalidates the `real` pointer.
    const baseZ = real.baseZ;
    const clearanceZ = real.clearanceZ;
    const object = real.object;
    const surfaceObject = real.surfaceObject;
    const railingsObject = real.railingsObject;
    const edges = real.edges;
    const corners = real.corners;
    const slopeDirection = real.slopeDirection;
    const isQueue = real.isQueue;

    const ghost = tile.insertElement(0) as FootpathElement;
    ghost.type = "footpath";
    ghost.baseZ = baseZ;
    ghost.clearanceZ = clearanceZ;
    ghost.object = object;
    ghost.surfaceObject = surfaceObject;
    ghost.railingsObject = railingsObject;
    ghost.edges = edges;
    ghost.corners = corners;
    ghost.slopeDirection = slopeDirection;
    ghost.isQueue = isQueue;
    ghost.isGhost = true;

    return { x: pos.x, y: pos.y, baseZ };
}

function removeGhosts(refs: GhostRef[]): void {
    for (const g of refs) {
        const tile = map.getTile(g.x / 32, g.y / 32);
        for (let i = tile.numElements - 1; i >= 0; i--) {
            const el = tile.getElement(i);
            if (el.type === "footpath" && el.baseZ === g.baseZ && el.isGhost) {
                tile.removeElement(i);
                break;
            }
        }
    }
}

export function showPath(path: CoordsXYZ[]): void {
    clearPath();
    for (const pos of path) {
        const ref = placeGhost(pos);
        if (ref) pathGhosts.push(ref);
    }
}

export function clearPath(): void {
    removeGhosts(pathGhosts);
    pathGhosts = [];
}

export function showJunctions(positions: CoordsXYZ[]): void {
    clearJunctions();
    for (const pos of positions) {
        const ref = placeGhost(pos);
        if (ref) junctionGhosts.push(ref);
    }
}

export function clearJunctions(): void {
    removeGhosts(junctionGhosts);
    junctionGhosts = [];
}
