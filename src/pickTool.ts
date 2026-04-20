import { WritableStore } from "openrct2-flexui";

interface PickToolDesc {
    id: string;
    filter: ToolFilter[];
    pressed: WritableStore<boolean>;
    onDown: (e: ToolEventArgs) => void;
}

export function togglePickTool(desc: PickToolDesc): void {
    if (desc.pressed.get()) {
        ui.tool?.cancel();
        return;
    }

    ui.tool?.cancel();
    desc.pressed.set(true);

    ui.activateTool({
        id: desc.id,
        cursor: "cross_hair",
        filter: desc.filter,
        onDown: desc.onDown,
        onFinish: () => desc.pressed.set(false),
    });
}

export function cancelActiveTool(): void {
    ui.tool?.cancel();
}
