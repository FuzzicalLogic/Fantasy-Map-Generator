import { pack, grid, getBiomeId } from "../main.js";
import { rn, isLand } from "../modules/utils.js";

// assign biome id for each cell
export function defineBiomes() {
    console.time("defineBiomes");
    const { cells, features } = pack,
        { temp, prec } = grid.cells;

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
        i.biome = getBiomeId(m, temp[i.g], i.h);
    }

    function calculateMoisture(forCell) {
        let moist = prec[forCell.g];
        if (forCell.r) moist += Math.max(forCell.fl / 20, 2);
        const n = forCell.c.filter(isLand)
            .map(c => prec[forCell.g])
            .concat([moist]);
        return rn(4 + d3.mean(n));
    }

    console.timeEnd("defineBiomes");
}
