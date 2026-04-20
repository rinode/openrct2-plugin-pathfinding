import {
    button, checkbox, dropdown, groupbox, horizontal, label, spinner, tab,
    store, compute, WritableStore, Store, TabCreator,
} from "openrct2-flexui";
import { PathfindingAlgorithm, algorithms, getDefaultGraph, guidePeep, peepFootpathTile } from "openrct2-library-pathfinding";
import { showPath, clearPath } from "./visualization";
import { togglePickTool } from "./pickTool";
import { junctionCount } from "./graphState";

const algorithmNames = Object.values(PathfindingAlgorithm);

interface SelectedGuest {
    id: number;
    name: string;
}

function formatGuest(g: SelectedGuest | null): string {
    return g ? `${g.name} (#${g.id})` : "Not set";
}

function formatCoords(pos: CoordsXYZ | null): string {
    if (!pos) return "Not set";
    return `(${pos.x / 32}, ${pos.y / 32}, ${pos.z})`;
}

function pickGuest(pressed: WritableStore<boolean>, target: WritableStore<SelectedGuest | null>): void {
    togglePickTool({
        id: "pathfinding-pick-guest",
        filter: ["entity"],
        pressed,
        onDown: (e) => {
            if (e.entityId === undefined) return;
            const entity = map.getEntity(e.entityId);
            if (!entity || entity.type !== "guest") return;
            const guest = entity as Guest;
            target.set({ id: guest.id!, name: guest.name });
            ui.tool?.cancel();
        },
    });
}

function pickFootpathTile(pressed: WritableStore<boolean>, target: WritableStore<CoordsXYZ | null>): void {
    togglePickTool({
        id: "pathfinding-pick-guest-dest",
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

export function createGuestNavigationTab(): TabCreator {
    const selectedGuest: WritableStore<SelectedGuest | null> = store(null);
    const destPos: WritableStore<CoordsXYZ | null> = store(null);
    const guestPressed: WritableStore<boolean> = store(false);
    const destPressed: WritableStore<boolean> = store(false);
    const selectedAlgorithm: WritableStore<number> = store(0);
    const budgetMs: WritableStore<number> = store(2);
    const useGraph: WritableStore<boolean> = store(false);
    const statusText: WritableStore<string> = store("");

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
        clearPath();
    }

    const guestLabel: Store<string> = compute(selectedGuest, formatGuest);
    const destLabel: Store<string> = compute(destPos, formatCoords);
    const canRun: Store<boolean> = compute(selectedGuest, destPos, (g, d) => g !== null && d !== null);
    const cannotRun: Store<boolean> = compute(canRun, c => !c);
    const useGraphDisabled: Store<boolean> = compute(junctionCount, c => c === 0);

    return tab({
        image: 29448, // SPR_G2_PEEP_SPAWN
        height: "auto",
        onClose: () => cancelSession(),
        content: [
            label({ text: "{BLACK}{MEDIUMFONT}Guide one peep" }),
            groupbox({
                text: "Target",
                content: [
                    horizontal([
                        label({ text: "Guest:", width: "55px" }),
                        label({ text: guestLabel, width: "1w" }),
                        button({
                            text: "Pick", width: "40px", height: "16px",
                            isPressed: guestPressed,
                            onClick: () => pickGuest(guestPressed, selectedGuest),
                        }),
                    ]),
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
                    checkbox({
                        text: "Use junction graph",
                        isChecked: useGraph,
                        disabled: useGraphDisabled,
                        onChange: (checked: boolean) => useGraph.set(checked),
                    }),
                ],
            }),
            horizontal([
                button({
                    text: "Send Guest", width: "1w", height: "24px",
                    disabled: cannotRun,
                    onClick: () => {
                        const sg = selectedGuest.get();
                        const dest = destPos.get();
                        if (!sg || !dest) return;

                        const entity = map.getEntity(sg.id);
                        if (!entity || entity.type !== "guest") {
                            statusText.set("Guest no longer exists");
                            return;
                        }
                        const guest = entity as Guest;

                        const start = peepFootpathTile(guest);
                        if (!start) {
                            statusText.set("Guest is not on a footpath");
                            return;
                        }

                        cancelSession();
                        const session = { cancelled: false };
                        activeSession = session;
                        statusText.set("Searching...");

                        const algo = algorithms[algorithmNames[selectedAlgorithm.get()]];
                        const options = useGraph.get() ? { graph: getDefaultGraph() } : undefined;
                        algo(start, dest, budgetMs.get(), options).then((result) => {
                            if (session.cancelled) return;
                            if (!result.success) {
                                statusText.set("No path found");
                                activeSession = null;
                                return;
                            }
                            showPath(result.path);
                            statusText.set(`Guiding along ${result.path.length} tiles...`);

                            guidePeep(guest, result.path, { cancelToken: session }).then((g) => {
                                if (session.cancelled || g.status === "cancelled") return;
                                if (g.status === "arrived") {
                                    guest.setFlag("positionFrozen", true);
                                    frozenIds.add(guest.id!);
                                }
                                statusText.set(
                                    `${g.status} (waypoint ${g.lastWaypointIndex + 1}/${result.path.length}, ${g.elapsedTicks} ticks)`
                                );
                                clearPath();
                                activeSession = null;
                            });
                        });
                    },
                }),
                button({
                    text: "Clear", width: "60px", height: "24px",
                    onClick: () => {
                        cancelSession();
                        statusText.set("");
                    },
                }),
            ]),
            label({ text: statusText, height: "14px" }),
        ],
    });
}
