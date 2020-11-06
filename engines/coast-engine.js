import { view, coastline, lakes, lineGen } from "../main.js";
import { addRuler } from "../modules/ui/measurers.js";

import {
    round,
    clipPoly
} from "../modules/utils.js";

// Detect and draw the coasline
export function drawCoastline({ cells, vertices, features }) {
    console.time('drawCoastline');
    const n = cells.length;
    const used = new Uint8Array(features.length); // store conneted features
    const landMask = view.defs.select("#land");
    const waterMask = view.defs.select("#water");
    lineGen.curve(d3.curveBasisClosed);

    let xs = cells.filter(x =>
        (x.h >= 20 && x.c.some(y => cells[y].h < 20)
            || features[x.f].type === "lake"))

    for (const i of xs) {
        const f = i.f;
        if (used[f])
            continue; // already connected

        const type = features[f].type === "lake" ? 1 : -1; // type value to search for
        const start = findStart(i, type);
        if (start === -1)
            continue; // cannot start here
        let vchain = connectVertices(start, type);
        if (features[f].type === "lake")
            relax(vchain, 1.2);
        used[f] = 1;
        let points = clipPoly(vchain.map(v => vertices[v].p), 1);
        const area = d3.polygonArea(points); // area with lakes/islands
        if (area > 0 && features[f].type === "lake") {
            points = points.reverse();
            vchain = vchain.reverse();
        }

        features[f].area = Math.abs(area);
        features[f].vertices = vchain;

        const path = round(lineGen(points));
        if (features[f].type === "lake") {
            landMask.append("path").attr("d", path).attr("fill", "black").attr("id", "land_" + f);
            lakes.select("#" + features[f].group).append("path").attr("d", path).attr("id", "lake_" + f).attr("data-f", f); // draw the lake
        }
        else {
            landMask.append("path").attr("d", path).attr("fill", "white").attr("id", "land_" + f);
            waterMask.append("path").attr("d", path).attr("fill", "black").attr("id", "water_" + f);
            const g = features[f].group === "lake_island" ? "lake_island" : "sea_island";
            coastline.select("#" + g).append("path").attr("d", path).attr("id", "island_" + f).attr("data-f", f); // draw the coastline
        }
    }

    // find cell vertex to start path detection
    function findStart(cell, t) {
        if (t === -1 && cell.b)
            return cell.v.find(v => vertices[v].c.some(c => c >= n)); // map border cell
        const filtered = cell.c.filter(c => cells[c].t === t);
        const index = cell.c.indexOf(d3.min(filtered));
        return index === -1
            ? index
            : cell.v[index];
    }

    // connect vertices to chain
    function connectVertices(start, t) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 50000; i++) {
            if (!!!vertices[current]) continue;
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices[current].c // cells adjacent to vertex
            const v = vertices[current].v // neighboring vertices
            const c0 = c[0] >= n || cells[c[0]].t === t;
            const c1 = c[1] >= n || cells[c[1]].t === t;
            const c2 = c[2] >= n || cells[c[2]].t === t;
            if (v[0] !== prev && c0 !== c1)
                current = v[0];
            else if (v[1] !== prev && c1 !== c2)
                current = v[1];
            else if (v[2] !== prev && c0 !== c2)
                current = v[2];
            if (current === chain[chain.length - 1]) {
                console.error("Next vertex is not found");
                break;
            }
        }

        return chain;
    }

    // move vertices that are too close to already added ones
    function relax(vchain, r) {
        const p = vertices.p, tree = d3.quadtree();

        for (let i = 0; i < vchain.length; i++) {
            const v = vchain[i];
            let [x, y] = vertices[v].p;
            if (i && vchain[i + 1] && tree.find(x, y, r) !== undefined) {
                const v1 = vchain[i - 1], v2 = vchain[i + 1];
                const [x1, y1] = vertices[v1].p;
                const [x2, y2] = vertices[v2].p;
                [x, y] = [(x1 + x2) / 2, (y1 + y2) / 2];
                vertices[v].p = [x, y];
            }
            tree.add([x, y]);
        }
    }

    console.timeEnd('drawCoastline');
}

