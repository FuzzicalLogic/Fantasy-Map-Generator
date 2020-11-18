import * as generator from "../modules/routes-generator.js";
import {
    pack,
    lineGen,
    roads, trails, searoutes
} from "../main.js";
import { round } from "../modules/utils.js";

generator.addEventListener('add', drawRoutes);
const layers = {
    get road() { return roads; },
    get trail() { return trails; },
    get searoute() { return searoutes; },
}

async function drawRoutes({ detail: data }) {
    let { type, data: routes } = data;

    const { cells, burgs } = pack;
    const toXY = c => {
        const b = cells[c].burg;
        const x = b ? burgs[b].x : cells[c].p[0];
        const y = b ? burgs[b].y : cells[c].p[1];
        return [x, y];
    };
    const toPath = d => round(lineGen(d.map(toXY)), 1);

    if (type !== 'sea')
        lineGen.curve(d3.curveCatmullRom.alpha(0.1));
    else
        lineGen.curve(d3.curveBundle.beta(1));

    layers[type].selectAll("path").data(routes).enter().append("path")
        .attr("id", (d, i) => `${type}${i}`)
        .attr("d", toPath);
}
