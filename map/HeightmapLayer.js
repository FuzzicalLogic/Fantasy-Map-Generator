import { pack, view, lineGen } from "../main.js";
import { getColorScheme, getColor } from "../modules/ui/layers.js";
import { round } from "../modules/utils.js";
import * as generator from "../modules/heightmap-generator.js";

generator.addEventListener('update', drawHeightmap)
export function drawHeightmap({ detail:{ cells, vertices}}) {
    console.time("drawHeightmap");
    let { terrs } = view;
    terrs.selectAll("*").remove();
//    const { cells, vertices } = pack,
        let n = cells.i.length;
    const used = new Uint8Array(cells.i.length);
    const paths = new Array(101).fill("");

    const scheme = getColorScheme();
    const terracing = terrs.attr("terracing") / 10; // add additional shifted darker layer for pseudo-3d effect
    const skip = +terrs.attr("skip") + 1;
    const simplification = +terrs.attr("relax");
    switch (+terrs.attr("curve")) {
        case 0: lineGen.curve(d3.curveBasisClosed); break;
        case 1: lineGen.curve(d3.curveLinear); break;
        case 2: lineGen.curve(d3.curveStep); break;
        default: lineGen.curve(d3.curveBasisClosed);
    }

    let currentLayer = 20;
    const heights = cells.i.sort((a, b) => cells.h[a] - cells.h[b]);
    for (const i of heights) {
        const h = cells.h[i];
        if (h > currentLayer) currentLayer += skip;
        if (currentLayer > 100) break; // no layers possible with height > 100
        if (h < currentLayer) continue;
        if (used[i]) continue; // already marked
        const onborder = cells.c[i].some(n => cells.h[n] < h);
        if (!onborder) continue;
        const vertex = cells.v[i].find(v => vertices.c[v].some(i => cells.h[i] < h));
        const chain = connectVertices(vertex, h);
        if (chain.length < 3) continue;
        const points = simplifyLine(chain).map(v => vertices.p[v]);
        paths[h] += round(lineGen(points));
    }

    terrs.append("rect").attr("x", 0).attr("y", 0).attr("width", "100%").attr("height", "100%").attr("fill", scheme(.8)); // draw base layer
    for (const i of d3.range(20, 101)) {
        if (paths[i].length < 10) continue;
        const color = getColor(i, scheme);
        if (terracing) terrs.append("path").attr("d", paths[i]).attr("transform", "translate(.7,1.4)").attr("fill", d3.color(color).darker(terracing)).attr("data-height", i);
        terrs.append("path").attr("d", paths[i]).attr("fill", color).attr("data-height", i);
    }

    // connect vertices to chain
    function connectVertices(start, h) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => cells.h[c] === h).forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells.h[c[0]] < h;
            const c1 = c[1] >= n || cells.h[c[1]] < h;
            const c2 = c[2] >= n || cells.h[c[2]] < h;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) current = v[0];
            else if (v[1] !== prev && c1 !== c2) current = v[1];
            else if (v[2] !== prev && c0 !== c2) current = v[2];
            if (current === chain[chain.length - 1]) { console.error("Next vertex is not found"); break; }
        }
        return chain;
    }

    function simplifyLine(chain) {
        if (!simplification) return chain;
        const n = simplification + 1; // filter each nth element
        return chain.filter((d, i) => i % n === 0);
    }

    console.timeEnd("drawHeightmap");
}