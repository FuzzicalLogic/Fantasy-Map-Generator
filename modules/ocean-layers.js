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
    used = new Uint8Array(pointsN); // to detect already passed cells

    let xs = cells.filter(x => x.t <= 0)
        .map((v, k) => k);
    for (const i of xs) {
        const t = cells[i].t;
        if (used[i] || !limits.includes(t)) continue;
        const start = findStart(cells[i]);
        if (!start) continue;
        used[i] = 1;
        const chain = connectVertices(start, t); // vertices chain to form a path
        if (chain.length < 4) continue;
        const relax = 1 + t * -2; // select only n-th point
        const relaxed = chain.filter((v, i) => !(i % relax) || vertices.c[v].some(c => c >= pointsN));
        if (relaxed.length < 4) continue;
        const points = clipPoly(relaxed.map(v => vertices.p[v]), 1);
        //const inside = d3.polygonContains(points, grid.points[i]);
        chains.push([t, points]); //chains.push([t, points, inside]);
    }

    //const bbox = `M0,0h${graphWidth}v${graphHeight}h${-graphWidth}Z`;
    for (const t of limits) {
        const layer = chains.filter(c => c[0] === t);
        let path = layer.map(c => round(lineGen(c[1]))).join("");
        //if (layer.every(c => !c[2])) path = bbox + path; // add outer ring if all segments are outside (works not for all cases)
        if (path)
            oceanLayers.append("path").attr("d", path).attr("fill", "#ecf2f9").style("opacity", opacity);
    }

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
        if (P(odd)) { odd = .2; limits.push(l); }
        else { odd *= 2; }
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
        c.filter(c => cells[c] && cells[c].t === t).forEach(c => used[c] = 1);

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
