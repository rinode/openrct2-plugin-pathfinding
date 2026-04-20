import {
    button, checkbox, dropdown, groupbox, horizontal, label, spinner, tab,
    store, compute, WritableStore, Store, TabCreator,
} from "openrct2-flexui";
import { PathfindingAlgorithm, algorithms, getDefaultGraph } from "openrct2-library-pathfinding";
import { showPath, clearPath } from "./visualization";
import { togglePickTool } from "./pickTool";
import { junctionCount, refreshJunctionCount } from "./graphState";

const algorithmNames = Object.values(PathfindingAlgorithm);

function formatCoords(pos: CoordsXYZ | null): string {
    if (!pos) return "Not set";
    return `(${pos.x / 32}, ${pos.y / 32}, ${pos.z})`;
}

function pickFootpathTile(
    toolId: string,
    pressed: WritableStore<boolean>,
    target: WritableStore<CoordsXYZ | null>,
): void {
    togglePickTool({
        id: toolId,
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

export function createPathfindingTab(): TabCreator {
    const startPos: WritableStore<CoordsXYZ | null> = store(null);
    const endPos: WritableStore<CoordsXYZ | null> = store(null);
    const startPressed: WritableStore<boolean> = store(false);
    const endPressed: WritableStore<boolean> = store(false);
    const selectedAlgorithm: WritableStore<number> = store(0);
    const budgetMs: WritableStore<number> = store(2);
    const useGraph: WritableStore<boolean> = store(false);
    const resultText: WritableStore<string> = store("");
    const debugText: WritableStore<string> = store("");

    let activeSession: { cancelled: boolean } | null = null;

    function cancelSession(): void {
        if (activeSession) {
            activeSession.cancelled = true;
            activeSession = null;
        }
        clearPath();
    }

    const startLabel: Store<string> = compute(startPos, formatCoords);
    const endLabel: Store<string> = compute(endPos, formatCoords);
    const canRun: Store<boolean> = compute(startPos, endPos, (s, e) => s !== null && e !== null);
    const cannotRun: Store<boolean> = compute(canRun, c => !c);
    const useGraphDisabled: Store<boolean> = compute(junctionCount, c => c === 0);

    return tab({
        image: 5176,
        height: "auto",
        onClose: () => cancelSession(),
        content: [
            label({ text: "{BLACK}{MEDIUMFONT}Find path" }),
            groupbox({
                text: "Endpoints",
                content: [
                    horizontal([
                        label({ text: "Start:", width: "40px" }),
                        label({ text: startLabel, width: "1w" }),
                        button({
                            text: "Pick", width: "40px", height: "16px",
                            isPressed: startPressed,
                            onClick: () => pickFootpathTile("pathfinding-pick-start", startPressed, startPos),
                        }),
                    ]),
                    horizontal([
                        label({ text: "End:", width: "40px" }),
                        label({ text: endLabel, width: "1w" }),
                        button({
                            text: "Pick", width: "40px", height: "16px",
                            isPressed: endPressed,
                            onClick: () => pickFootpathTile("pathfinding-pick-end", endPressed, endPos),
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
                    text: "Find Path", width: "1w", height: "24px",
                    disabled: cannotRun,
                    onClick: () => {
                        const s = startPos.get();
                        const e = endPos.get();
                        if (!s || !e) return;

                        cancelSession();
                        const session = { cancelled: false };
                        activeSession = session;
                        resultText.set("Searching...");
                        debugText.set("");

                        const algo = algorithms[algorithmNames[selectedAlgorithm.get()]];
                        const options = useGraph.get() ? { graph: getDefaultGraph() } : undefined;
                        algo(s, e, budgetMs.get(), options).then((result) => {
                            if (session.cancelled) return;
                            if (result.success) {
                                showPath(result.path);
                                resultText.set(`Path: ${result.path.length} tiles`);
                            } else {
                                resultText.set("No path found");
                            }
                            debugText.set(
                                `${result.nodesExplored} nodes, ${result.ticks} ticks, ${result.elapsedMs} ms`
                            );
                            refreshJunctionCount();
                            activeSession = null;
                        });
                    },
                }),
                button({
                    text: "Clear", width: "60px", height: "24px",
                    onClick: () => {
                        cancelSession();
                        resultText.set("");
                        debugText.set("");
                    },
                }),
            ]),
            label({ text: resultText, height: "14px" }),
            label({ text: debugText, height: "14px" }),
        ],
    });
}
