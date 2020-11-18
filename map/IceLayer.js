import {
    view, grid, seed
} from "../main.js";
import {
    P, rand, rn,
    normalize,
    getGridPolygon
} from "../modules/utils.js";

export function drawIce() {
    const cells = grid.cells, vertices = grid.vertices,
        n = cells.length;
    const used = new Uint8Array(cells.length);
    Math.seedrandom(seed);

    const shieldMin = -6; // max temp to form ice shield (glacier)
    const icebergMax = 2; // max temp to form an iceberg

    let { ice } = view;
    const xs = grid.cells.map((v, k) => k);
    for (const i of xs) {
        const t = cells[i].temp;
        if (t > icebergMax) continue; // too warm: no ice
        if (t > shieldMin && cells[i].h >= 20) continue; // non-glacier land: no ice

        // very cold: ice shield
        if (t <= shieldMin) {
            // already rendered
            if (used[i])
                continue; 
            const onborder = cells[i].c.some(n =>
                cells[n].temp > shieldMin
            );
            // need to start from onborder cell
            if (!onborder)
                continue; 
            const vertex = cells[i].v.find(v =>
                !!vertices[v] && vertices[v].c.some(i =>
                    cells[i].temp > shieldMin
                )
            );
            const chain = connectVertices(vertex);
            if (chain.length < 3) continue;
            const points = clipPoly(chain.map(v => vertices[v].p));
            ice.append("polygon")
                .attr("points", points)
                .attr("type", "iceShield");
            continue;
        }

        // mildly cold: iceberd
        if (P(normalize(t, -7, 2.5)))
            continue; // t[-5; 2] cold: skip some cells
        // lake: no icebers
        if (grid.features[cells[i].f].type === "lake")
            continue; 
        // iceberg size: 0 = full size, 1 = zero size
        let size = (6.5 + t) / 10; 
        // coasline: smaller icebers
        if (cells[i].t === -1)
            size *= 1.3; 
        // randomize iceberd size
        size = Math.min(size * (.4 + rand() * 1.2), .95); 
        resizePolygon(i, size);
    }

    function resizePolygon(i, s) {
        const c = grid.points[i];
        const points = getGridPolygon(i).map(p =>
            [
                (p[0] + (c[0] - p[0]) * s) | 0,
                (p[1] + (c[1] - p[1]) * s) | 0
            ]
        );
        ice.append("polygon")
            .attr("points", points)
            .attr("cell", i)
            .attr("size", rn(1 - s, 2));
    }

    // connect vertices to chain
    function connectVertices(start) {
        // vertices chain to form a path
        const chain = []; 
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            if (!!!vertices[current])
                continue;
            // previous vertex in chain
            const prev = last(chain); 
            // add current vertex to sequence
            chain.push(current); 
            // cells adjacent to vertex
            const c = vertices[current].c; 
            c.filter(c => cells[c].temp <= shieldMin)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].temp > shieldMin;
            const c1 = c[1] >= n || cells[c[1]].temp > shieldMin;
            const c2 = c[2] >= n || cells[c[2]].temp > shieldMin;
            // neighboring vertices
            const v = vertices[current].v; 
            if (v[0] !== prev && c0 !== c1)
                current = v[0];
            else if (v[1] !== prev && c1 !== c2)
                current = v[1];
            else if (v[2] !== prev && c0 !== c2)
                current = v[2];
            if (current === chain[chain.length - 1]) {
                console.error("Next vertex is not found"); break;
            }
        }
        return chain;
    }
}

