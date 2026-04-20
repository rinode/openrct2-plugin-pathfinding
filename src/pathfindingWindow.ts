import { tabwindow, Colour, WindowTemplate } from "openrct2-flexui";
import { clearPath } from "./visualization";
import { cancelActiveTool } from "./pickTool";
import { hideJunctions } from "./graphState";
import { createPathfindingTab } from "./pathfindingTab";
import { createGuestNavigationTab } from "./guestNavigationTab";
import { createStressTestTab } from "./stressTestTab";
import { createJunctionGraphTab } from "./junctionGraphTab";

export function createPathfindingWindow(): WindowTemplate {
    return tabwindow({
        title: "Pathfinding",
        width: 260,
        height: "auto",
        padding: 5,
        colours: [Colour.Grey, Colour.Grey, Colour.Grey],
        onClose: () => {
            cancelActiveTool();
            clearPath();
            hideJunctions();
        },
        onTabChange: () => {
            cancelActiveTool();
            clearPath();
            hideJunctions();
        },
        tabs: [
            createPathfindingTab(),
            createGuestNavigationTab(),
            createStressTestTab(),
            createJunctionGraphTab(),
        ],
    });
}
