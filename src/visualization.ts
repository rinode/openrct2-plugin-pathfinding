let ghostedPositions: CoordsXYZ[] = [];

export function showPath(path: CoordsXYZ[]): void {
    clearPath();

    for (const pos of path) {
        const tile = map.getTile(pos.x / 32, pos.y / 32);
        for (let i = 0; i < tile.numElements; i++) {
            const el = tile.getElement(i);
            if (el.type === "footpath" && el.baseZ === pos.z) {
                el.isGhost = true;
                ghostedPositions.push(pos);
                break;
            }
        }
    }
}

export function clearPath(): void {
    for (const pos of ghostedPositions) {
        const tile = map.getTile(pos.x / 32, pos.y / 32);
        for (let i = 0; i < tile.numElements; i++) {
            const el = tile.getElement(i);
            if (el.type === "footpath" && el.baseZ === pos.z) {
                el.isGhost = false;
                break;
            }
        }
    }
    ghostedPositions = [];
}
