import {
    button, checkbox, groupbox, horizontal, label, spinner, tab,
    store, compute, WritableStore, Store, TabCreator,
} from "openrct2-flexui";
import { guidePeeps, getDefaultGraph } from "openrct2-library-pathfinding";
import { togglePickTool } from "./pickTool";
import { createPathOptionStores, pathOptionsGroupbox, readPathOptions } from "./pathOptionsControl";

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

export function createStressTestTab(): TabCreator {
    const destPos: WritableStore<CoordsXYZ | null> = store(null);
    const destPressed: WritableStore<boolean> = store(false);
    const budgetMs: WritableStore<number> = store(2);
    const statusText: WritableStore<string> = store("");
    const inflightStore: WritableStore<number> = store(0);
    const arrivedStore: WritableStore<number> = store(0);
    const stuckStore: WritableStore<number> = store(0);
    const removedStore: WritableStore<number> = store(0);
    const noPathStore: WritableStore<number> = store(0);
    const noStartStore: WritableStore<number> = store(0);

    const debugColors: WritableStore<boolean> = store(false);
    const pathOptionStores = createPathOptionStores();

    let activeSession: { cancelled: boolean } | null = null;
    const frozenIds: Set<number> = new Set();

    type PeepStatus = "inflight" | "arrived" | "blocked";
    const peepStatus: Map<number, PeepStatus> = new Map();
    const savedColors: Map<number, { tshirt: number; trousers: number }> = new Map();

    const COLOR_INFLIGHT = 17; // BRIGHT_YELLOW
    const COLOR_ARRIVED = 14;  // BRIGHT_GREEN
    const COLOR_BLOCKED = 28;  // BRIGHT_RED

    function colorForStatus(s: PeepStatus): number {
        return s === "arrived" ? COLOR_ARRIVED : s === "inflight" ? COLOR_INFLIGHT : COLOR_BLOCKED;
    }

    function applyColor(id: number, s: PeepStatus): void {
        const entity = map.getEntity(id);
        if (!entity || entity.type !== "guest") return;
        const g = entity as Guest;
        if (!savedColors.has(id)) {
            savedColors.set(id, { tshirt: g.tshirtColour, trousers: g.trousersColour });
        }
        const c = colorForStatus(s);
        g.tshirtColour = c;
        g.trousersColour = c;
    }

    function setPeepStatus(id: number, s: PeepStatus | null): void {
        if (s === null) {
            peepStatus.delete(id);
            restorePeepColor(id);
            return;
        }
        peepStatus.set(id, s);
        if (debugColors.get()) applyColor(id, s);
    }

    function restorePeepColor(id: number): void {
        const saved = savedColors.get(id);
        if (!saved) return;
        const entity = map.getEntity(id);
        if (entity && entity.type === "guest") {
            const g = entity as Guest;
            g.tshirtColour = saved.tshirt;
            g.trousersColour = saved.trousers;
        }
        savedColors.delete(id);
    }

    function restoreAllColors(): void {
        for (const id of Array.from(savedColors.keys())) restorePeepColor(id);
    }

    function applyAllStatusColors(): void {
        for (const [id, s] of peepStatus) applyColor(id, s);
    }

    let colorTickSub: IDisposable | null = null;

    function startColorTick(): void {
        if (colorTickSub) return;
        colorTickSub = context.subscribe("interval.tick", () => applyAllStatusColors());
    }

    function stopColorTick(): void {
        if (colorTickSub) {
            colorTickSub.dispose();
            colorTickSub = null;
        }
    }

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
        restoreAllColors();
        peepStatus.clear();
    }

    const destLabel: Store<string> = compute(destPos, formatCoords);
    const cannotRun: Store<boolean> = compute(destPos, d => d === null);

    return tab({
        image: { frameBase: 5568, frameCount: 8, frameDuration: 4 }, // SPR_TAB_GUESTS_0..7
        height: "auto",
        onClose: () => {
            stopColorTick();
            cancelSession();
        },
        content: [
            label({ text: "{BLACK}{MEDIUMFONT}Guide all peeps" }),
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
                        text: "Debug colors",
                        isChecked: debugColors,
                        onChange: (on: boolean) => {
                            if (on) {
                                applyAllStatusColors();
                                startColorTick();
                            } else {
                                stopColorTick();
                                restoreAllColors();
                            }
                        },
                    }),
                ],
            }),
            pathOptionsGroupbox(pathOptionStores),
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
                        for (const g of guests) {
                            if (g.id !== null) setPeepStatus(g.id, "inflight");
                        }
                        statusText.set(`Dispatching ${guests.length} guests...`);
                        inflightStore.set(0);
                        arrivedStore.set(0);
                        stuckStore.set(0);
                        removedStore.set(0);
                        noPathStore.set(0);
                        noStartStore.set(0);

                        const total = guests.length;
                        let arrived = 0;
                        let stuck = 0;
                        let removed = 0;
                        let noPath = 0;
                        let noStart = 0;

                        function refresh(): void {
                            if (session.cancelled) return;
                            inflightStore.set(total - arrived - stuck - removed - noPath - noStart);
                            arrivedStore.set(arrived);
                            stuckStore.set(stuck);
                            removedStore.set(removed);
                            noPathStore.set(noPath);
                            noStartStore.set(noStart);
                        }

                        const pathOptions = readPathOptions(pathOptionStores);
                        guidePeeps(guests, dest, {
                            budgetMs: budgetMs.get(),
                            graph: getDefaultGraph(pathOptions),
                            pathOptions,
                            cancelToken: session,
                            onPeepResult: (peep, r) => {
                                if (session.cancelled) return;
                                const id = peep.id;
                                if (r.status === "arrived") {
                                    arrived++;
                                    (peep as Guest).setFlag("positionFrozen", true);
                                    if (id !== null) {
                                        frozenIds.add(id);
                                        setPeepStatus(id, "arrived");
                                    }
                                } else if (r.status === "stuck") {
                                    stuck++;
                                    if (id !== null) setPeepStatus(id, "blocked");
                                } else if (r.status === "peep_removed") {
                                    removed++;
                                    if (id !== null) setPeepStatus(id, null);
                                } else if (r.status === "no-path") {
                                    noPath++;
                                    if (id !== null) setPeepStatus(id, "blocked");
                                } else if (r.status === "no-start") {
                                    noStart++;
                                    if (id !== null) setPeepStatus(id, null);
                                }
                                refresh();
                            },
                        }).then((summary) => {
                            if (session.cancelled) return;
                            statusText.set(
                                `Done: ${summary.arrived}/${summary.dispatched} arrived` +
                                (summary.noPath + summary.noStart > 0
                                    ? ` (${summary.noPath} no-path, ${summary.noStart} no-start)`
                                    : ""),
                            );
                        });
                    },
                }),
                button({
                    text: "Clear", width: "60px", height: "24px",
                    onClick: () => {
                        cancelSession();
                        statusText.set("");
                        inflightStore.set(0);
                        arrivedStore.set(0);
                        stuckStore.set(0);
                        removedStore.set(0);
                        noPathStore.set(0);
                        noStartStore.set(0);
                    },
                }),
            ]),
            label({ text: statusText, height: "14px" }),
            groupbox({
                text: "Progress",
                content: [
                    horizontal([
                        label({ text: "Inflight:", width: "55px" }),
                        label({ text: compute(inflightStore, v => `${v}`), width: "1w" }),
                        label({ text: "Arrived:", width: "55px" }),
                        label({ text: compute(arrivedStore, v => `${v}`), width: "1w" }),
                    ]),
                    horizontal([
                        label({ text: "Stuck:", width: "55px" }),
                        label({ text: compute(stuckStore, v => `${v}`), width: "1w" }),
                        label({ text: "Removed:", width: "55px" }),
                        label({ text: compute(removedStore, v => `${v}`), width: "1w" }),
                    ]),
                    horizontal([
                        label({ text: "No path:", width: "55px" }),
                        label({ text: compute(noPathStore, v => `${v}`), width: "1w" }),
                        label({ text: "No start:", width: "55px" }),
                        label({ text: compute(noStartStore, v => `${v}`), width: "1w" }),
                    ]),
                ],
            }),
        ],
    });
}
