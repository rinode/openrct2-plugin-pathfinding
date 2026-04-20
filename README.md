# openrct2-plugin-pathfinding

OpenRCT2 plugin for visualizing pathfinding on footpaths. Pick two tiles, pick an algorithm, watch the path light up as ghost footpaths.

## Features

- Pick start/end footpath tiles with an in-game tool
- A\*, Dijkstra, BFS, and Greedy Best-First, via [openrct2-library-pathfinding](https://github.com/rinode/openrct2-library-pathfinding)
- Time budget per tick (1-50 ms)
- Stats: tile count, nodes explored, ticks, elapsed time
- Junction graph tab: prebuild, invalidate, visualize junctions; any algorithm can opt into running on the graph

## Requirements

- OpenRCT2 built from the [PathNavigator API branch](https://github.com/rinode/OpenRCT2/tree/feature/path-navigator) (until merged upstream)
- A park with footpaths

## Install

Copy `openrct2-plugin-pathfinding.js` from [Releases](https://github.com/rinode/openrct2-plugin-pathfinding/releases) to your OpenRCT2 `plugin/` folder.

## Build from source

```
npm install
npm run build
```

Dev mode (auto-deploys to the plugin folder):

```
npm run develop
```

## Usage

Open the **Pathfinding** window from the map menu. Four tabs:

- **Pathfinding** — *Find path (astar / dijkstra / bfs / greedy).* Pick two footpath tiles, run a search, see the path as ghost footpaths.
- **Guest navigation** — *Guide one peep (guidePeep).* Pick a guest and a destination, the guest walks the computed path.
- **Stress test** — *Guide all peeps (guidePeeps).* Send every guest in the park to one destination; a single reverse Dijkstra on the junction graph plans every reachable peep's path in one pass, so planning stays tick-distributed even with hundreds of guests. Counters track inflight/arrived/stuck/removed/no-path/no-start.
- **Junction graph** — *(buildGraph).* Precompute and inspect the junction graph used as an opt-in speedup.

### Junction graph

Any algorithm can run on a corridor-contracted junction graph instead of tile by tile. Trades a one-time build for much faster repeat queries on sparse networks with long corridors. This is the 4-connected analog of Steve Rabin's JPS+ talk.

Controls on the **Junction graph** tab:

- **Prebuild** builds the graph for the component containing the picked seed tile, so the first search skips the build.
- **Invalidate** clears the cached graph. Next search rebuilds. The graph also auto-invalidates when footpaths or banners change.
- **Junctions** toggles ghost overlays on every junction tile in the cached graph.

Once the graph has any junctions, the **Use junction graph** checkbox on each algorithm tab becomes enabled. Tick it to run that search on the graph.

## License

MIT
