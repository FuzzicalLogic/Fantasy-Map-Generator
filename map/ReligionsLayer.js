import * as generator from "../modules/religions-generator.js";
import {
    view
} from "../main.js";
import { round } from "../modules/utils.js";

generator.addEventListener('post', onPostReligions);
async function onPostReligions({ detail: { cells, vertices, religions } }) {
    let { relig } = view;
    console.time("drawReligions");

    relig.selectAll("path").remove();
    const n = cells.length;
    const used = new Uint8Array(n);
    const vArray = new Array(religions.length); // store vertices array
    const body = new Array(religions.length).fill(""); // store path around each religion
    const gap = new Array(religions.length).fill(""); // store path along water for each religion to fill the gaps

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (!cells[i].religion)
            continue;
        if (used[i])
            continue;
        used[i] = 1;
        const r = cells[i].religion;
        const onborder = cells[i].c.filter(n => cells[n].religion !== r);
        if (!onborder.length)
            continue;
        const borderWith = cells[i].c.map(c => cells[c].religion).find(n => n !== r);
        const vertex = cells[i].v.find(v => vertices[v].c.some(i => cells[i].religion === borderWith));
        const chain = connectVertices(vertex, r, borderWith);
        if (chain.length < 3)
            continue;
        const points = chain.map(v => vertices[v[0]].p);
        if (!vArray[r]) vArray[r] = [];
        vArray[r].push(points);
        body[r] += "M" + points.join("L");
        gap[r] += "M" + vertices[chain[0][0]].p + chain.reduce((r2, v, i, d) => !i
            ? r2
            : !v[2]
                ? r2 + "L" + vertices[v[0]].p
                : d[i + 1] && !d[i + 1][2]
                    ? r2 + "M" + vertices[v[0]].p
                    : r2, "");
    }

    const bodyData = body.map((p, i) => [
        p.length > 10 ? p : null,
        i,
        religions[i].color
    ]).filter(d => d[0]);
    relig.selectAll("path").data(bodyData).enter().append("path")
        .attr("d", d => d[0])
        .attr("fill", d => d[2])
        .attr("stroke", "none")
        .attr("id", d => "religion" + d[1]);
    const gapData = gap.map((p, i) => [p.length > 10 ? p : null, i, religions[i].color])
        .filter(d => d[0]);
    relig.selectAll(".path").data(gapData).enter().append("path").attr("d", d => d[0]).attr("fill", "none").attr("stroke", d => d[2]).attr("id", d => "religion-gap" + d[1]).attr("stroke-width", "10px");

    // connect vertices to chain
    function connectVertices(start, t, religion) {
        const chain = []; // vertices chain to form a path
        let land = vertices[start].c.some(c =>
            cells[c].h >= 20 && cells[c].religion !== t);
        function check(i) {
            religion = cells[i].religion || 0;
            land = cells[i].h >= 20;
        }

        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1] ? chain[chain.length - 1][0] : -1; // previous vertex in chain
            chain.push([current, religion, land]); // add current vertex to sequence
            const c = vertices[current].c; // cells adjacent to vertex
            c.filter(c => cells[c] && cells[c].religion === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].religion !== t;
            const c1 = c[1] >= n || cells[c[1]].religion !== t;
            const c2 = c[2] >= n || cells[c[2]].religion !== t;
            const v = vertices[current].v; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) {
                current = v[0];
                check(c0 ? c[0] : c[1]);
            }
            else if (v[1] !== prev && c1 !== c2) {
                current = v[1];
                check(c1 ? c[1] : c[2]);
            }
            else if (v[2] !== prev && c0 !== c2) {
                current = v[2];
                check(c2 ? c[2] : c[0]);
            }
            if (current === chain[chain.length - 1][0]) {
                console.error("Next vertex is not found");
                break;
            }

        }
        return chain;
    }
    console.timeEnd("drawReligions");
}
