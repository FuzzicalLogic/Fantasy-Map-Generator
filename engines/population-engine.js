import { pack, biomesData } from "../main.js";
import {
    normalize
} from "../modules/utils.js";
// assess cells suitability to calculate population and rand cells for culture center and burgs placement
export function rankCells() {
    console.time('rankCells');
    const { cells, features } = pack;
    cells.forEach(v => v.pop = 0);
    cells.forEach(v => v.s = 0);

    // Normalize Flux
    const fluxes = cells.filter(x => !!x.fl).map(x => x.fl),
        confluences = cells.filter(x => !!x.conf).map(x => x.conf),
        flMean = d3.median(fluxes) || 0,
        flMax = d3.max(fluxes) + d3.max(confluences),
    // Adjust population by cell area
        areaMean = d3.mean(cells.map(x => x.area));

    let xs = cells.map(x => x);
    for (const x of xs) {
        if (x.h < 20)
            continue; // no population in water
        let s = +biomesData.habitability[x.biome || 0]; // base suitability derived from biome habitability
        if (!s)
            continue; // uninhabitable biomes has 0 suitability
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

        x.s = s / 5; // general population rate
        // cell rural population is suitability adjusted by cell area
        x.pop = x.s > 0
            ? x.s * x.area / areaMean
            : 0;
    }

    console.timeEnd('rankCells');
}
