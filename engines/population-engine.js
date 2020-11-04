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

    const flMean = d3.median(cells.map(x => x.fl).filter(x => x)) || 0,
        flMax = d3.max(cells.map(x => x.fl)) + d3.max(cells.map(x => x.conf)); // to normalize flux
    const areaMean = d3.mean(cells.map(x => x.area)); // to adjust population by cell area

    let xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (cells[i].h < 20)
            continue; // no population in water
        let s = +biomesData.habitability[cells[i].biome || 0]; // base suitability derived from biome habitability
        if (!s)
            continue; // uninhabitable biomes has 0 suitability
        if (flMean)
            s += normalize(cells[i].fl + cells[i].conf, flMean, flMax) * 250; // big rivers and confluences are valued
        s -= (cells[i].h - 50) / 5; // low elevation is valued, high is not;

        if (cells[i].t === 1) {
            if (cells[i].r)
                s += 15; // estuary is valued
            const type = features[cells[cells[i].haven].f].type;
            const group = features[cells[cells[i].haven].f].group;
            if (type === "lake") {
                // lake coast is valued
                if (group === "freshwater")
                    s += 30;
                else if (group !== "lava" && group !== "dry")
                    s += 10;
            } else {
                s += 5; // ocean coast is valued
                if (cells[i].harbor === 1)
                    s += 20; // safe sea harbor is valued
            }
        }

        cells[i].s = s / 5; // general population rate
        // cell rural population is suitability adjusted by cell area
        cells[i].pop = cells[i].s > 0
            ? cells[i].s * cells[i].area / areaMean
            : 0;
    }

    console.timeEnd('rankCells');
}
