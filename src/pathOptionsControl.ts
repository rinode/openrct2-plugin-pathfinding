import { checkbox, groupbox, store, WritableStore } from "openrct2-flexui";
import { PathNavigationOptions } from "openrct2-library-pathfinding";

export interface PathOptionStores {
    respectBanners: WritableStore<boolean>;
    includeGhosts: WritableStore<boolean>;
    includeQueues: WritableStore<boolean>;
    includeWidePaths: WritableStore<boolean>;
}

export function createPathOptionStores(): PathOptionStores {
    return {
        respectBanners: store(false),
        includeGhosts: store(false),
        includeQueues: store(false),
        includeWidePaths: store(false),
    };
}

export function readPathOptions(s: PathOptionStores): PathNavigationOptions | undefined {
    const r = s.respectBanners.get();
    const iG = s.includeGhosts.get();
    const iQ = s.includeQueues.get();
    const iW = s.includeWidePaths.get();
    if (!r && !iG && !iQ && !iW) return undefined;
    return { respectBanners: r, includeGhosts: iG, includeQueues: iQ, includeWidePaths: iW };
}

export function pathOptionsGroupbox(s: PathOptionStores) {
    return groupbox({
        text: "Path rules",
        content: [
            checkbox({
                text: "Respect banners (no-entry signs)",
                isChecked: s.respectBanners,
                onChange: (v: boolean) => s.respectBanners.set(v),
            }),
            checkbox({
                text: "Include ghost paths",
                isChecked: s.includeGhosts,
                onChange: (v: boolean) => s.includeGhosts.set(v),
            }),
            checkbox({
                text: "Include queue paths",
                isChecked: s.includeQueues,
                onChange: (v: boolean) => s.includeQueues.set(v),
            }),
            checkbox({
                text: "Include wide paths",
                isChecked: s.includeWidePaths,
                onChange: (v: boolean) => s.includeWidePaths.set(v),
            }),
        ],
    });
}
