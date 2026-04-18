import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

process.env.OPENRCT2_PLUGIN_PATH = 'C:/Users/Marino/Documents/OpenRCT2/plugin';
const isRelease = process.env.BUILD === 'release';
const pluginPath = process.env.OPENRCT2_PLUGIN_PATH;

/** @type {import("rollup").RollupOptions} */
export default {
    input: './src/index.ts',
    output: {
        file: isRelease
            ? './build/openrct2-plugin-pathfinding.js'
            : pluginPath + '/openrct2-plugin-pathfinding.js',
        format: 'iife'
    },
    plugins: [
        resolve(),
        typescript()
    ]
};
