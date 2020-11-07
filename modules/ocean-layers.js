import {
    oceanLayers, lineGen
} from "../main.js";

import { P, rn, clipPoly, round } from "./utils.js";

let cells, vertices, pointsN, used;

export function OceanLayers(grid) {
    const outline = oceanLayers.attr("layers");
    if (outline === "none") return;
    console.time("drawOceanLayers");

    lineGen.curve(d3.curveBasisClosed);
    ({ cells, vertices } = grid);
    pointsN = cells.length;

    const limits = outline === "random"
        ? randomizeOutline()
        : outline.split(",").map(s => +s);
    markupOcean(cells, limits);

    const chains = [];
    const opacity = rn(0.4 / limits.length, 2);
    used = [];

    let ocean = cells.filter(x => x.t <= 0);
    for (const cell of ocean) {
        const t = cell.t;
        if (used.includes(cell) || !limits.includes(t)) continue;
        const start = findStart(cell);
        if (!start) continue;
        used.push(cell);
        // vertices chain to form a path
        const chain = connectVertices(start, t); 
        if (chain.length < 4) continue;
        // select only n-th point
        const relax = 1 + t * -2; 
        const relaxed = chain.filter((v, i) =>
            !(i % relax) || vertices.c[v].some(c => c >= pointsN));
        if (relaxed.length < 4) continue;
        const points = clipPoly(relaxed.map(v => vertices.p[v]), 1);
        chains.push([t, points]); 
    }

    chains.filter(c => limits.includes(c[0]))
        .map(layer => round(lineGen(layer[1])))
        .forEach(path => oceanLayers.append("path")
            .attr("d", path)
            .attr("fill", "#ecf2f9")
            .style("opacity", opacity)
        );

    // find eligible cell vertex to start path detection
    function findStart(fromCell) {
        let { t } = fromCell;
        // map border cell
        if (fromCell.b)
            return fromCell.v.find(v => vertices.c[v].some(c => c >= cells.length)); 
        return fromCell.v[fromCell.c.findIndex(c => cells[c].t < t || !cells[c].t)];
    }

    console.timeEnd("drawOceanLayers");
}

function randomizeOutline() {
    const limits = [];
    let odd = .2
    for (let l = -9; l < 0; l++) {
        if (P(odd)) {
            odd = .2;
            limits.push(l);
        }
        else {
            odd *= 2;
        }
    }
    return limits;
}

  // Define grid ocean cells type based on distance form land
function markupOcean(cells, limits) {
    for (let j = -2; j >= limits[0] - 1; j--) {
        cells.filter(x => x.t === j + 1)
            .forEach(x => x.c.forEach(y => {
                if (!cells[y].t)
                    cells[y].t = j
            }));
    }
}

  // connect vertices to chain
function connectVertices(start, t) {
    const chain = []; // vertices chain to form a path
    for (let i = 0, current = start; i === 0 || current !== start && i < 10000; i++) {
        const prev = chain[chain.length - 1]; // previous vertex in chain
        chain.push(current); // add current vertex to sequence

        const c = vertices.c[current]; // cells adjacent to vertex
        c.filter(c => cells[c] && cells[c].t === t)
            .forEach(c => used.push(cells[c]));

        const v = vertices.v[current]; // neighboring vertices
        const c0 = !!!(cells[c[0]] && cells[c[0]].t) || cells[c[0]].t === t - 1;
        const c1 = !!!(cells[c[1]] && cells[c[1]].t) || cells[c[1]].t === t - 1;
        const c2 = !!!(cells[c[2]] && cells[c[2]].t) || cells[c[2]].t === t - 1;

        if (v[0] !== undefined && v[0] !== prev && c0 !== c1)
            current = v[0];
        else if (v[1] !== undefined && v[1] !== prev && c1 !== c2)
            current = v[1];
        else if (v[2] !== undefined && v[2] !== prev && c0 !== c2)
            current = v[2];

        if (current === chain[chain.length - 1]) {
            console.error("Next vertex is not found"); break;
        }
    }
    chain.push(chain[0]); // push first vertex as the last one
    return chain;
}
