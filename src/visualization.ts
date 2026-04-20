interface GhostRef {
    x: number;
    y: number;
    baseZ: number;
}

let ghosts: GhostRef[] = [];

export function showPath(path: CoordsXYZ[]): void {
    clearPath();

    for (const pos of path) {
        const tx = pos.x / 32;
        const ty = pos.y / 32;
        const tile = map.getTile(tx, ty);

        let real: FootpathElement | null = null;
        let realIndex = -1;
        for (let i = 0; i < tile.numElements; i++) {
            const el = tile.getElement(i);
            if (el.type === "footpath" && el.baseZ === pos.z) {
                real = el as FootpathElement;
                realIndex = i;
                break;
            }
        }
        if (!real || realIndex < 0) continue;

        const baseZ = real.baseZ;
        const clearanceZ = real.clearanceZ;
        const edges = real.edges;
        const corners = real.corners;
        const slopeDirection = real.slopeDirection;
        const isQueue = real.isQueue;
        const object = real.object;
        const surfaceObject = real.surfaceObject;
        const railingsObject = real.railingsObject;

        const ghost = tile.insertElement(0) as FootpathElement;
        ghost.baseZ = baseZ;
        ghost.clearanceZ = clearanceZ;
        ghost.type = "footpath";
        ghost.object = object;
        ghost.surfaceObject = surfaceObject;
        ghost.railingsObject = railingsObject;
        ghost.edges = edges;
        ghost.corners = corners;
        ghost.slopeDirection = slopeDirection;
        ghost.isQueue = isQueue;
        ghost.isGhost = true;

        ghosts.push({ x: pos.x, y: pos.y, baseZ });
    }
}

export function clearPath(): void {
    for (const g of ghosts) {
        const tile = map.getTile(g.x / 32, g.y / 32);
        for (let i = tile.numElements - 1; i >= 0; i--) {
            const el = tile.getElement(i);
            if (el.type === "footpath" && el.baseZ === g.baseZ && el.isGhost) {
                tile.removeElement(i);
                break;
            }
        }
    }
    ghosts = [];
}
