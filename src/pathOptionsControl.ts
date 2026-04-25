import { checkbox, groupbox, store, WritableStore } from "openrct2-flexui";
import { PathNavigationOptions } from "openrct2-library-pathfinding";

export interface PathOptionStores {
    respectBanners: WritableStore<boolean>;
    excludeGhosts: WritableStore<boolean>;
    excludeQueues: WritableStore<boolean>;
    excludeWidePaths: WritableStore<boolean>;
}

export function createPathOptionStores(): PathOptionStores {
    return {
        respectBanners: store(false),
        excludeGhosts: store(false),
        excludeQueues: store(false),
        excludeWidePaths: store(false),
    };
}

export function readPathOptions(s: PathOptionStores): PathNavigationOptions | undefined {
    const r = s.respectBanners.get();
    const eG = s.excludeGhosts.get();
    const eQ = s.excludeQueues.get();
    const eW = s.excludeWidePaths.get();
    if (!r && !eG && !eQ && !eW) return undefined;
    return { respectBanners: r, excludeGhosts: eG, excludeQueues: eQ, excludeWidePaths: eW };
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
                text: "Exclude ghost paths",
                isChecked: s.excludeGhosts,
                onChange: (v: boolean) => s.excludeGhosts.set(v),
            }),
            checkbox({
                text: "Exclude queue paths",
                isChecked: s.excludeQueues,
                onChange: (v: boolean) => s.excludeQueues.set(v),
            }),
            checkbox({
                text: "Exclude wide paths",
                isChecked: s.excludeWidePaths,
                onChange: (v: boolean) => s.excludeWidePaths.set(v),
            }),
        ],
    });
}
