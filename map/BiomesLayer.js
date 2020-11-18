import * as generator from "../engines/biome-engine.js";
import {
    view, biomesData
} from "../main.js";
import { clipPoly } from "../modules/utils.js";

generator.addEventListener('clear', onClear);
export function onClear() {
    view.biomes.selectAll("*").remove();
}

generator.addEventListener('post', drawBiomes);
export function drawBiomes({ detail: { cells, vertices } }) {
    let { biomes } = view;
    biomes.selectAll("path").remove();
    const n = cells.length;
    const used = new Uint8Array(n);
    const paths = new Array(biomesData.i.length).fill("");

    const xs = cells.map((v, k) => k)
    for (const i of xs) {
        if (!cells[i].biome) continue; // no need to mark marine biome (liquid water)
        if (used[i]) continue; // already marked
        const b = cells[i].biome;
        const onborder = cells[i].c.some(n => cells[n].biome !== b);
        if (!onborder) continue;
        const edgeVerticle = cells[i].v.find(v =>
            vertices[v].c.some(i =>
                !!cells[i] && cells[i].biome !== b
            )
        );
        const chain = connectVertices(edgeVerticle, b);
        if (chain.length < 3) continue;
        const points = clipPoly(chain.map(v => vertices[v].p), 1);
        paths[b] += "M" + points.join("L") + "Z";
    }

    paths.forEach(function (d, i) {
        if (d.length < 10) return;
        biomes.append("path").attr("d", d).attr("fill", biomesData.color[i]).attr("stroke", biomesData.color[i]).attr("id", "biome" + i);
    });

    // connect vertices to chain
    function connectVertices(start, b) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            if (!!!vertices[current]) continue
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices[current].c; // cells adjacent to vertex
            c.filter(c => cells[c] && cells[c].biome === b)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].biome !== b;
            const c1 = c[1] >= n || cells[c[1]].biome !== b;
            const c2 = c[2] >= n || cells[c[2]].biome !== b;
            const v = vertices[current].v; // neighboring vertices
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
}
