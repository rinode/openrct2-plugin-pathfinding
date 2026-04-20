import {
    button, dropdown, groupbox, horizontal, label, spinner, tab,
    store, compute, WritableStore, Store, TabCreator,
} from "openrct2-flexui";
import { PathfindingAlgorithm, algorithms, guidePeep } from "openrct2-library-pathfinding";
import { togglePickTool } from "./pickTool";

const algorithmNames = Object.values(PathfindingAlgorithm);

function formatCoords(pos: CoordsXYZ | null): string {
    if (!pos) return "Not set";
    return `(${pos.x / 32}, ${pos.y / 32}, ${pos.z})`;
}

function pickFootpathTile(pressed: WritableStore<boolean>, target: WritableStore<CoordsXYZ | null>): void {
    togglePickTool({
        id: "pathfinding-pick-stress-dest",
        filter: ["footpath"],
        pressed,
        onDown: (e) => {
            if (!e.mapCoords) return;
            const tile = map.getTile(e.mapCoords.x / 32, e.mapCoords.y / 32);

            if (e.tileElementIndex !== undefined) {
                const el = tile.getElement(e.tileElementIndex);
                if (el.type === "footpath") {
                    target.set({ x: e.mapCoords.x, y: e.mapCoords.y, z: el.baseZ });
                    ui.tool?.cancel();
                    return;
                }
            }

            for (const el of tile.elements) {
                if (el.type === "footpath") {
                    target.set({ x: e.mapCoords.x, y: e.mapCoords.y, z: el.baseZ });
                    ui.tool?.cancel();
                    return;
                }
            }
        },
    });
}

function guestPosition(guest: Guest): CoordsXYZ | null {
    const tx = Math.floor(guest.x / 32);
    const ty = Math.floor(guest.y / 32);
    const tile = map.getTile(tx, ty);
    let bestZ = -Infinity;
    for (const el of tile.elements) {
        if (el.type === "footpath" && el.baseZ <= guest.z + 8 && el.baseZ > bestZ) {
            bestZ = el.baseZ;
        }
    }
    if (bestZ === -Infinity) return null;
    return { x: tx * 32, y: ty * 32, z: bestZ };
}

export function createStressTestTab(): TabCreator {
    const destPos: WritableStore<CoordsXYZ | null> = store(null);
    const destPressed: WritableStore<boolean> = store(false);
    const selectedAlgorithm: WritableStore<number> = store(0);
    const budgetMs: WritableStore<number> = store(2);
    const statusText: WritableStore<string> = store("");
    const progressText: WritableStore<string> = store("");

    let activeSession: { cancelled: boolean } | null = null;
    const frozenIds: Set<number> = new Set();

    function unfreezeAll(): void {
        for (const id of frozenIds) {
            const entity = map.getEntity(id);
            if (entity && entity.type === "guest") {
                (entity as Guest).setFlag("positionFrozen", false);
            }
        }
        frozenIds.clear();
    }

    function cancelSession(): void {
        if (activeSession) {
            activeSession.cancelled = true;
            activeSession = null;
        }
        unfreezeAll();
    }

    const destLabel: Store<string> = compute(destPos, formatCoords);
    const cannotRun: Store<boolean> = compute(destPos, d => d === null);

    return tab({
        image: { frameBase: 5568, frameCount: 8, frameDuration: 4 }, // SPR_TAB_GUESTS_0..7
        height: "auto",
        onClose: () => cancelSession(),
        content: [
            groupbox({
                text: "Target",
                content: [
                    horizontal([
                        label({ text: "Destination:", width: "55px" }),
                        label({ text: destLabel, width: "1w" }),
                        button({
                            text: "Pick", width: "40px", height: "16px",
                            isPressed: destPressed,
                            onClick: () => pickFootpathTile(destPressed, destPos),
                        }),
                    ]),
                ],
            }),
            groupbox({
                text: "Settings",
                content: [
                    horizontal([
                        label({ text: "Algorithm:", width: "65px" }),
                        dropdown({
                            width: "1w",
                            items: compute(store(0), () => algorithmNames),
                            selectedIndex: selectedAlgorithm,
                            onChange: (index: number) => selectedAlgorithm.set(index),
                        }),
                    ]),
                    horizontal([
                        label({ text: "Budget:", width: "65px" }),
                        spinner({
                            width: "1w",
                            value: budgetMs,
                            minimum: 1,
                            maximum: 50,
                            format: (v: number) => `${v} ms/tick`,
                            onChange: (v: number) => budgetMs.set(v),
                        }),
                    ]),
                ],
            }),
            horizontal([
                button({
                    text: "Send All", width: "1w", height: "24px",
                    disabled: cannotRun,
                    onClick: () => {
                        const dest = destPos.get();
                        if (!dest) return;

                        cancelSession();
                        const session = { cancelled: false };
                        activeSession = session;

                        const guests = map.getAllEntities("guest");
                        statusText.set(`Dispatching ${guests.length} guests...`);
                        progressText.set("");

                        const algo = algorithms[algorithmNames[selectedAlgorithm.get()]];
                        const budget = budgetMs.get();

                        let dispatched = 0;
                        let noStart = 0;
                        let noPath = 0;
                        let arrived = 0;
                        let stuck = 0;
                        let removed = 0;

                        function refresh(): void {
                            if (session.cancelled) return;
                            const inflight = dispatched - arrived - stuck - removed;
                            progressText.set(
                                `inflight=${inflight} arrived=${arrived} stuck=${stuck} removed=${removed} noPath=${noPath} noStart=${noStart}`
                            );
                        }

                        for (const guest of guests) {
                            const start = guestPosition(guest);
                            if (!start) { noStart++; continue; }

                            dispatched++;
                            algo(start, dest, budget).then((result) => {
                                if (session.cancelled) return;
                                if (!result.success) {
                                    noPath++;
                                    refresh();
                                    return;
                                }
                                guidePeep(guest, result.path, { cancelToken: session }).then((g) => {
                                    if (session.cancelled) return;
                                    if (g.status === "arrived") {
                                        arrived++;
                                        guest.setFlag("positionFrozen", true);
                                        frozenIds.add(guest.id!);
                                    } else if (g.status === "stuck") stuck++;
                                    else if (g.status === "peep_removed") removed++;
                                    refresh();
                                });
                            });
                        }
                        refresh();
                    },
                }),
                button({
                    text: "Clear", width: "60px", height: "24px",
                    onClick: () => {
                        cancelSession();
                        statusText.set("");
                        progressText.set("");
                    },
                }),
            ]),
            label({ text: statusText, height: "14px" }),
            label({ text: progressText, height: "14px" }),
        ],
    });
}
