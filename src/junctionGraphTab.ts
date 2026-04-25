import {
    button, groupbox, horizontal, label, spinner, tab,
    store, compute, WritableStore, Store, TabCreator,
} from "openrct2-flexui";
import { buildGraph, getDefaultGraph, invalidateGraph } from "openrct2-library-pathfinding";
import { showJunctions } from "./visualization";
import { togglePickTool } from "./pickTool";
import { junctionCount, showingJunctions, refreshJunctionCount, hideJunctions } from "./graphState";
import { createPathOptionStores, pathOptionsGroupbox, readPathOptions } from "./pathOptionsControl";

function formatCoords(pos: CoordsXYZ | null): string {
    if (!pos) return "Not set";
    return `(${pos.x / 32}, ${pos.y / 32}, ${pos.z})`;
}

function pickFootpathTile(pressed: WritableStore<boolean>, target: WritableStore<CoordsXYZ | null>): void {
    togglePickTool({
        id: "pathfinding-pick-graph-seed",
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

export function createJunctionGraphTab(): TabCreator {
    const seedPos: WritableStore<CoordsXYZ | null> = store(null);
    const seedPressed: WritableStore<boolean> = store(false);
    const budgetMs: WritableStore<number> = store(2);
    const pathOptionStores = createPathOptionStores();
    const statusText: WritableStore<string> = store("");

    const seedLabel: Store<string> = compute(seedPos, formatCoords);
    const countLabel: Store<string> = compute(junctionCount, c => `${c} junctions`);
    const cannotPrebuild: Store<boolean> = compute(seedPos, s => s === null);
    const cannotShowJunctions: Store<boolean> = compute(junctionCount, c => c === 0);

    return tab({
        image: { frameBase: 5245, frameCount: 8, frameDuration: 8 },
        height: "auto",
        onClose: () => hideJunctions(),
        content: [
            label({ text: "{BLACK}{MEDIUMFONT}Junction graph" }),
            groupbox({
                text: "Seed",
                content: [
                    horizontal([
                        label({ text: "Tile:", width: "40px" }),
                        label({ text: seedLabel, width: "1w" }),
                        button({
                            text: "Pick", width: "40px", height: "16px",
                            isPressed: seedPressed,
                            onClick: () => pickFootpathTile(seedPressed, seedPos),
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
            pathOptionsGroupbox(pathOptionStores),
            groupbox({
                text: "Graph",
                content: [
                    label({ text: countLabel, height: "14px" }),
                    horizontal([
                        button({
                            text: "Prebuild", width: "1w", height: "20px",
                            disabled: cannotPrebuild,
                            onClick: () => {
                                const seed = seedPos.get();
                                if (!seed) return;
                                statusText.set("Building...");
                                buildGraph(seed, budgetMs.get(), readPathOptions(pathOptionStores)).then(() => {
                                    refreshJunctionCount();
                                    statusText.set("");
                                });
                            },
                        }),
                        button({
                            text: "Invalidate", width: "1w", height: "20px",
                            onClick: () => {
                                invalidateGraph();
                                hideJunctions();
                                refreshJunctionCount();
                            },
                        }),
                        button({
                            text: "Junctions", width: "1w", height: "20px",
                            isPressed: showingJunctions,
                            disabled: cannotShowJunctions,
                            onClick: () => {
                                if (showingJunctions.get()) {
                                    hideJunctions();
                                    return;
                                }
                                showJunctions(getDefaultGraph(readPathOptions(pathOptionStores)).getJunctionPositions());
                                showingJunctions.set(true);
                            },
                        }),
                    ]),
                ],
            }),
            label({ text: statusText, height: "14px" }),
        ],
    });
}
