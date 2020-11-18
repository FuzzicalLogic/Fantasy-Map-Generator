import { StateEvents as generator } from "../modules/burgs-and-states.js";
import {
    view, statesBody, statesHalo
} from "../main.js";

generator.addEventListener('post', onPostStates);
async function onPostStates({ detail: { cells, vertices, states } }) {
    let { regions } = view;
    console.time("drawStates");
    regions.selectAll("path").remove();

    const n = cells.length;
    const used = new Uint8Array(cells.length);
    const vArray = new Array(states.length); // store vertices array
    const body = new Array(states.length).fill(""); // store path around each state
    const gap = new Array(states.length).fill(""); // store path along water for each state to fill the gaps

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (!cells[i].state || used[i])
            continue;
        const s = cells[i].state;
        const onborder = cells[i].c.some(n => cells[n].state !== s);
        if (!onborder)
            continue;

        const borderWith = cells[i].c.map(c => cells[c].state).find(n => n !== s);
        const vertex = cells[i].v.find(v => vertices[v].c.some(i => !!cells[i] && cells[i].state === borderWith));
        const chain = connectVertices(vertex, s, borderWith);
        if (chain.length < 3)
            continue;
        const points = chain.map(v => vertices[v[0]].p);
        if (!vArray[s])
            vArray[s] = [];
        vArray[s].push(points);
        body[s] += "M" + points.join("L");
        gap[s] += "M" + vertices[chain[0][0]].p + chain.reduce((r, v, i, d) => !i
            ? r
            : !v[2]
                ? r + "L" + vertices[v[0]].p
                : d[i + 1] && !d[i + 1][2]
                    ? r + "M" + vertices[v[0]].p
                    : r, "");
    }

    // find state visual center
    vArray.forEach((ar, i) => {
        const sorted = ar.sort((a, b) => b.length - a.length); // sort by points number
        states[i].pole = polylabel(sorted, 1.0); // pole of inaccessibility
    });

    const bodyData = body.map((p, i) => [p.length > 10 ? p : null, i, states[i].color]).filter(d => d[0]);
    statesBody.selectAll("path").data(bodyData).enter().append("path").attr("d", d => d[0]).attr("fill", d => d[2]).attr("stroke", "none").attr("id", d => "state" + d[1]);
    const gapData = gap.map((p, i) => [p.length > 10 ? p : null, i, states[i].color]).filter(d => d[0]);
    statesBody.selectAll(".path").data(gapData).enter().append("path").attr("d", d => d[0]).attr("fill", "none").attr("stroke", d => d[2]).attr("id", d => "state-gap" + d[1]);

    view.defs.select("#statePaths").selectAll("clipPath").remove();
    view.defs.select("#statePaths").selectAll("clipPath").data(bodyData).enter().append("clipPath").attr("id", d => "state-clip" + d[1]).append("use").attr("href", d => "#state" + d[1]);
    statesHalo.selectAll(".path").data(bodyData).enter().append("path")
        .attr("d", d => d[0]).attr("stroke", d => d3.color(d[2]) ? d3.color(d[2]).darker().hex() : "#666666")
        .attr("id", d => "state-border" + d[1]).attr("clip-path", d => "url(#state-clip" + d[1] + ")");

    // connect vertices to chain
    function connectVertices(start, t, state) {
        const chain = []; // vertices chain to form a path
        let land = vertices[start].c.some(c => cells[c] && cells[c].h >= 20 && cells[c].state !== t);
        function check(i) {
            try {
                state = cells[i].state;
                land = cells[i].h >= 20;
            }
            catch (e) {
                //console.log(cells);
                //console.log(i);
            }
        }

        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            if (!!!vertices[current]) continue;
            const prev = chain[chain.length - 1]
                ? chain[chain.length - 1][0]
                : -1; // previous vertex in chain
            chain.push([current, state, land]); // add current vertex to sequence
            const c = vertices[current].c; // cells adjacent to vertex
            c.filter(c => cells[c] && cells[c].state === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].state !== t;
            const c1 = c[1] >= n || cells[c[1]].state !== t;
            const c2 = c[2] >= n || cells[c[2]].state !== t;
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
        chain.push([start, state, land]); // add starting vertex to sequence to close the path
        return chain;
    }
    invokeActiveZooming();
    console.timeEnd("drawStates");
}
