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
    const largestLand = d3.scan(features.map(f => f.land ? f.cells : 0), (a, b) => b - a);
    const landMask = view.defs.select("#land");
    const waterMask = view.defs.select("#water");
    lineGen.curve(d3.curveBasisClosed);

    let xs = cells.map((v, k) => k);
    for (const i of xs) {
        const startFromEdge = !i && cells[i].h >= 20;
        if (!startFromEdge && cells[i].t !== -1 && cells[i].t !== 1)
            continue; // non-edge cell
        const f = cells[i].f;
        if (used[f])
            continue; // already connected
        if (features[f].type === "ocean")
            continue; // ocean cell

        const type = features[f].type === "lake" ? 1 : -1; // type value to search for
        const start = findStart(i, type);
        if (start === -1)
            continue; // cannot start here
        let vchain = connectVertices(start, type);
        if (features[f].type === "lake")
            relax(vchain, 1.2);
        used[f] = 1;
        let points = clipPoly(vchain.map(v => vertices.p[v]), 1);
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

        // draw ruler to cover the biggest land piece
        if (f === largestLand) {
            const from = points[d3.scan(points, (a, b) => a[0] - b[0])];
            const to = points[d3.scan(points, (a, b) => b[0] - a[0])];
            addRuler(from[0], from[1], to[0], to[1]);
        }
    }

    // find cell vertex to start path detection
    function findStart(i, t) {
        if (t === -1 && cells[i].b)
            return cells[i].v.find(v => vertices.c[v].some(c => c >= n)); // map border cell
        const filtered = cells[i].c.filter(c => cells[c].t === t);
        const index = cells[i].c.indexOf(d3.min(filtered));
        return index === -1
            ? index
            : cells[i].v[index];
    }

    // connect vertices to chain
    function connectVertices(start, t) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 50000; i++) {
            const prev = chain[chain.length - 1]; // previous vertex in chain
            //d3.select("#labels").append("text").attr("x", vertices.p[current][0]).attr("y", vertices.p[current][1]).text(i).attr("font-size", "1px");
            chain.push(current); // add current vertex to sequence
            const c = vertices.c[current] // cells adjacent to vertex
            const v = vertices.v[current] // neighboring vertices
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
        //chain.push(chain[0]); // push first vertex as the last one
        return chain;
    }

    // move vertices that are too close to already added ones
    function relax(vchain, r) {
        const p = vertices.p, tree = d3.quadtree();

        for (let i = 0; i < vchain.length; i++) {
            const v = vchain[i];
            let [x, y] = [p[v][0], p[v][1]];
            if (i && vchain[i + 1] && tree.find(x, y, r) !== undefined) {
                const v1 = vchain[i - 1], v2 = vchain[i + 1];
                const [x1, y1] = [p[v1][0], p[v1][1]];
                const [x2, y2] = [p[v2][0], p[v2][1]];
                [x, y] = [(x1 + x2) / 2, (y1 + y2) / 2];
                p[v] = [x, y];
            }
            tree.add([x, y]);
        }
    }

    console.timeEnd('drawCoastline');
}

