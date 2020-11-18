import { pack, grid, biomesData } from "../main.js";
import { rn, isLand } from "../modules/utils.js";

const emitter = new EventTarget();
export const addEventListener = (...args) => emitter.addEventListener(...args);
export const removeEventListener = (...args) => emitter.removeEventListener(...args);
export const dispatchEvent = (...args) => emitter.dispatchEvent(...args);

// apply default biomes data
export function applyDefaultBiomesSystem() {
    const name = ["Marine", "Hot desert", "Cold desert", "Savanna", "Grassland", "Tropical seasonal forest", "Temperate deciduous forest", "Tropical rainforest", "Temperate rainforest", "Taiga", "Tundra", "Glacier", "Wetland"];
    const color = ["#466eab", "#fbe79f", "#b5b887", "#d2d082", "#c8d68f", "#b6d95d", "#29bc56", "#7dcb35", "#409c43", "#4b6b32", "#96784b", "#d5e7eb", "#0b9131"];
    const habitability = [0, 4, 10, 22, 30, 50, 100, 80, 90, 12, 4, 0, 12];
    const iconsDensity = [0, 3, 2, 120, 120, 120, 120, 150, 150, 100, 5, 0, 150];
    const icons = [{}, { dune: 3, cactus: 6, deadTree: 1 }, { dune: 9, deadTree: 1 }, { acacia: 1, grass: 9 }, { grass: 1 }, { acacia: 8, palm: 1 }, { deciduous: 1 }, { acacia: 5, palm: 3, deciduous: 1, swamp: 1 }, { deciduous: 6, swamp: 1 }, { conifer: 1 }, { grass: 1 }, {}, { swamp: 1 }];
    const cost = [10, 200, 150, 60, 50, 70, 70, 80, 90, 200, 1000, 5000, 150]; // biome movement cost
    const biomesMartix = [ // hot ↔ cold [>19°C; <-4°C]; dry ↕ wet
        new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 10]),
        new Uint8Array([3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 9, 9, 9, 10, 10, 10]),
        new Uint8Array([5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 9, 9, 9, 9, 9, 10, 10, 10]),
        new Uint8Array([5, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10]),
        new Uint8Array([7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 10, 10])
    ];

    // parse icons weighted array into a simple array
    for (let i = 0; i < icons.length; i++) {
        const parsed = [];
        for (const icon in icons[i]) {
            for (let j = 0; j < icons[i][icon]; j++) { parsed.push(icon); }
        }
        icons[i] = parsed;
    }

    return { i: d3.range(0, name.length), name, color, biomesMartix, habitability, iconsDensity, icons, cost };
}

// assign biome id for each cell
export function defineBiomes() {
    dispatchEvent(new CustomEvent('clear', { detail: pack }));

    console.time("defineBiomes");
    const { cells, features } = pack;

    /*cells.filter(x => x.h >= 20
        && features[x.f].group !== "freshwater")
        .forEach(x => {
            let m = calculateMoisture(x);
            x.biome = getBiomeId(m, temp[x.g], x.h);
        });
    */
    for (const i of cells) {
        // de-elevate lakes; here to save some resources
        if (features[i.f].group === "freshwater")
            i.h = 19;
        const m = i.h < 20 ? 0 : calculateMoisture(i); // cell moisture
        i.biome = getBiomeId(m, grid.cells[i.g].temp, i.h);
        i.s = +biomesData.habitability[i.biome || 0] || 0;
    }

    function calculateMoisture(forCell) {
        let moist = grid.cells[forCell.g].prec;
        if (forCell.r)
            moist += Math.max(forCell.fl / 20, 2);
        const n = forCell.c.filter(isLand)
            .map(c => grid.cells[forCell.g].prec)
            .concat([moist]);
        return rn(4 + d3.mean(n));
    }

    console.timeEnd("defineBiomes");

    dispatchEvent(new CustomEvent('post', { detail: pack }));
}

// assign biome id to a cell
export function getBiomeId(moisture, temperature, height) {
    if (temperature < -5) return 11; // permafrost biome, including sea ice
    if (height < 20) return 0; // marine biome: liquid water cells
    if (moisture > 40 && temperature > -2 && (height < 25 || moisture > 24 && height > 24)) return 12; // wetland biome
    const m = Math.min(~~(moisture / 5) | 0, 4); // moisture band from 0 to 4
    const t = Math.min(Math.max(20 - temperature, 0), 25); // temparature band from 0 to 25
    return biomesData.biomesMartix[m][t];
}
