import * as generator from "../modules/religions-generator.js";
import {
    view
} from "../main.js";
import { round } from "../modules/utils.js";

generator.addEventListener('post', onPostCultures);
export function onPostCultures({ detail: { cells, vertices, cultures } }) {
    let { cults } = view;
    console.time("drawCultures");

    cults.selectAll("path").remove();
    const n = cells.length;
    const used = new Uint8Array(n);
    const paths = new Array(cultures.length).fill("");

    const xs = cells.filter(x => !!x.culture);
    for (const cell of xs) {
        if (used[cell.i]) continue;
        used[cell.i] = 1;
        const c = cell.culture;
        const onborder = cell.c.some(n => cells[n].culture !== c);
        if (!onborder) continue;
        const vertex = cell.v.find(v => vertices[v].c.some(i => cells[i] && cells[i].culture !== c));
        const chain = connectVertices(vertex, c);
        if (chain.length < 3) continue;
        const points = chain.map(v => vertices[v].p);
        paths[c] += "M" + points.join("L") + "Z";
    }

    const data = paths.map((p, i) => [p, i]).filter(d => d[0].length > 10);
    cults.selectAll("path").data(data).enter().append("path").attr("d", d => d[0]).attr("fill", d => cultures[d[1]].color).attr("id", d => "culture" + d[1]);

    // connect vertices to chain
    function connectVertices(start, t) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices[current].c; // cells adjacent to vertex
            c.filter(c => cells[c] && cells[c].culture === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].culture !== t;
            const c1 = c[1] >= n || cells[c[1]].culture !== t;
            const c2 = c[2] >= n || cells[c[2]].culture !== t;
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
    console.timeEnd("drawCultures");
}

