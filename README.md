# openrct2-plugin-pathfinding

OpenRCT2 plugin for visualizing pathfinding on footpaths. Pick a start and end tile, choose an algorithm, and see the computed path highlighted as ghost tiles.

## Features

- Pick start/end footpath tiles with an in-game tool
- A\*, Dijkstra, BFS, and Greedy Best-First algorithms (via [openrct2-library-pathfinding](https://github.com/rinode/openrct2-library-pathfinding))
- Configurable time budget per tick (1–50 ms)
- Path visualization using ghost footpath elements
- Stats: tile count, nodes explored, ticks, elapsed time

## Requirements

- OpenRCT2 with PathNavigator API support (`feature/path-navigator` branch)
- A park with footpaths

## Install

Copy `openrct2-plugin-pathfinding.js` from [Releases](https://github.com/rinode/openrct2-plugin-pathfinding/releases) to your OpenRCT2 `plugin/` folder.

## Build from source

```
npm install
npm run build
```

Dev mode (auto-deploy to plugin folder):

```
npm run develop
```

## Usage

1. Open the **Pathfinding** window from the map menu
2. Click **Pick** to select start and end footpath tiles
3. Choose an algorithm and time budget
4. Click **Find Path**

## License

MIT
