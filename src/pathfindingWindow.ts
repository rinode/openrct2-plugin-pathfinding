import { tabwindow, Colour, WindowTemplate } from "openrct2-flexui";
import { clearPath } from "./visualization";
import { cancelActiveTool } from "./pickTool";
import { createPathfindingTab } from "./pathfindingTab";
import { createGuestNavigationTab } from "./guestNavigationTab";
import { createStressTestTab } from "./stressTestTab";

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
        },
        onTabChange: () => {
            cancelActiveTool();
            clearPath();
        },
        tabs: [
            createPathfindingTab(),
            createGuestNavigationTab(),
            createStressTestTab(),
        ],
    });
}
