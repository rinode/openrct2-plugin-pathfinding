import {
    button, dropdown, groupbox, horizontal, label, spinner,
    window as flexWindow,
    store, compute, WritableStore, Store, WindowTemplate, Colour,
} from "openrct2-flexui";
import { PathfindingAlgorithm, algorithms } from "openrct2-library-pathfinding";
import { showPath, clearPath } from "./visualization";

const algorithmNames = Object.values(PathfindingAlgorithm);

function formatCoords(pos: CoordsXYZ | null): string {
    if (!pos) return "Not set";
    return `(${pos.x / 32}, ${pos.y / 32}, ${pos.z})`;
}

function pickFootpathTile(
    toolId: string,
    target: WritableStore<CoordsXYZ | null>,
): void {
    ui.activateTool({
        id: toolId,
        cursor: "cross_hair",
        filter: ["footpath"],
        onDown: (e) => {
            if (!e.mapCoords) return;

            const tx = e.mapCoords.x / 32;
            const ty = e.mapCoords.y / 32;
            const tile = map.getTile(tx, ty);

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

export function createPathfindingWindow(): WindowTemplate {
    const startPos: WritableStore<CoordsXYZ | null> = store(null);
    const endPos: WritableStore<CoordsXYZ | null> = store(null);
    const selectedAlgorithm: WritableStore<number> = store(0);
    const budgetMs: WritableStore<number> = store(2);
    const resultText: WritableStore<string> = store("");
    const debugText: WritableStore<string> = store("");

    const startLabel: Store<string> = compute(startPos, formatCoords);
    const endLabel: Store<string> = compute(endPos, formatCoords);
    const canRun: Store<boolean> = compute(startPos, endPos, (s, e) => s !== null && e !== null);
    const cannotRun: Store<boolean> = compute(canRun, c => !c);

    return flexWindow({
        title: "Pathfinding",
        width: 260,
        height: "auto",
        padding: 5,
        colours: [Colour.Grey, Colour.Grey],
        onClose: () => {
            clearPath();
        },
        content: [
            groupbox({
                text: "Endpoints",
                content: [
                    horizontal([
                        label({ text: "Start:", width: "40px" }),
                        label({ text: startLabel, width: "1w" }),
                        button({
                            text: "Pick", width: "40px", height: "16px",
                            onClick: () => pickFootpathTile("pathfinding-pick-start", startPos),
                        }),
                    ]),
                    horizontal([
                        label({ text: "End:", width: "40px" }),
                        label({ text: endLabel, width: "1w" }),
                        button({
                            text: "Pick", width: "40px", height: "16px",
                            onClick: () => pickFootpathTile("pathfinding-pick-end", endPos),
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
                    text: "Find Path", width: "1w", height: "24px",
                    disabled: cannotRun,
                    onClick: () => {
                        const s = startPos.get();
                        const e = endPos.get();
                        if (!s || !e) return;

                        clearPath();
                        resultText.set("Searching...");
                        debugText.set("");

                        const algo = algorithms[algorithmNames[selectedAlgorithm.get()]];
                        algo(s, e, budgetMs.get()).then((result) => {
                            if (result.success) {
                                showPath(result.path);
                                resultText.set(
                                    `Path: ${result.path.length} tiles`
                                );
                            } else {
                                clearPath();
                                resultText.set("No path found");
                            }
                            debugText.set(
                                `${result.nodesExplored} nodes, ${result.ticks} ticks, ${result.elapsedMs} ms`
                            );
                        });
                    },
                }),
                button({
                    text: "Clear", width: "60px", height: "24px",
                    onClick: () => {
                        clearPath();
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
