import { pack, biomesData } from "../main.js";
import {
    normalize
} from "../modules/utils.js";
// assess cells suitability to calculate population and rand cells for culture center and burgs placement
export function rankCells() {
    console.time('rankCells');
    const { cells, features } = pack;
    cells.forEach(v => v.pop = 0);
    cells.forEach(x => x.s = +biomesData.habitability[x.biome || 0]);

    const landCells = cells.filter(x => x.h >= 20);

    // Normalize Flux
    const fluxes = landCells.filter(x => !!x.fl).map(x => x.fl),
        confluences = landCells.filter(x => !!x.conf).map(x => x.conf),
        flMean = d3.median(fluxes) || 0,
        flMax = d3.max(fluxes) + d3.max(confluences),
    // Adjust population by cell area
        areaMean = d3.mean(landCells.map(x => x.area));

    // Initialize and remove unsuitable cells
    const suitable = landCells.filter(x => !!x.s);
    for (const x of suitable) {
        let s = x.s;
        if (flMean)
            s += normalize(x.fl + x.conf, flMean, flMax) * 250; // big rivers and confluences are valued
        s -= (x.h - 50) / 5; // low elevation is valued, high is not;

        if (x.t === 1) {
            if (x.r)
                s += 15; // estuary is valued
            const type = features[cells[x.haven].f].type;
            const group = features[cells[x.haven].f].group;
            if (type === "lake") {
                // lake coast is valued
                if (group === "freshwater")
                    s += 30;
                else if (group !== "lava" && group !== "dry")
                    s += 10;
            } else {
                s += 5; // ocean coast is valued
                if (x.harbor === 1)
                    s += 20; // safe sea harbor is valued
            }
        }

        x.s = ~~s / 5; // general population rate
        // cell rural population is suitability adjusted by cell area
        x.pop = x.s > 0
            ? x.s * x.area / areaMean
            : 0;
    }

    console.timeEnd('rankCells');
}
