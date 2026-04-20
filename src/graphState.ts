import { store, WritableStore } from "openrct2-flexui";
import { getDefaultGraph } from "openrct2-library-pathfinding";
import { clearJunctions } from "./visualization";

export const junctionCount: WritableStore<number> = store(0);
export const showingJunctions: WritableStore<boolean> = store(false);

export function refreshJunctionCount(): void {
    junctionCount.set(getDefaultGraph().junctionCount);
}

export function hideJunctions(): void {
    clearJunctions();
    showingJunctions.set(false);
}
