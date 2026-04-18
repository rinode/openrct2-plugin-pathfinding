import { createPathfindingWindow } from "./pathfindingWindow";

const windowTemplate = createPathfindingWindow();

registerPlugin({
    name: "openrct2-plugin-pathfinding",
    version: "0.1.0",
    licence: "MIT",
    authors: ["rinode"],
    type: "local",
    targetApiVersion: 114,
    main: () => {
        ui.registerMenuItem("Pathfinding", () => {
            windowTemplate.open();
        });
    },
});
