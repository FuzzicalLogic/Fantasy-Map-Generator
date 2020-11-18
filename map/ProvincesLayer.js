import { ProvinceEvents as generator } from "../modules/burgs-and-states.js";
import {
    view
} from "../main.js";
import { round } from "../modules/utils.js";

generator.addEventListener('post', drawProvinces);
export function drawProvinces({ detail: { cells, vertices, provinces } }) {
    let { provs } = view;
    console.time("drawProvinces");
    const labelsOn = provs.attr("data-labels") == 1;
    provs.selectAll("*").remove();

    const n = cells.length;
    const used = new Uint8Array(n);
    const vArray = new Array(provinces.length); // store vertices array
    const body = new Array(provinces.length).fill(""); // store path around each province
    const gap = new Array(provinces.length).fill(""); // store path along water for each province to fill the gaps

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (!cells[i].province || used[i]) continue;
        const p = cells[i].province;
        const onborder = cells[i].c.some(n => cells[n].province !== p);
        if (!onborder) continue;

        const borderWith = cells[i].c.map(c => cells[c].province).find(n => n !== p);
        const vertex = cells[i].v.find(v => vertices[v].c.some(i => !!cells[i] && cells[i].province === borderWith));
        const chain = connectVertices(vertex, p, borderWith);
        if (chain.length < 3)
            continue;
        const points = chain.map(v => vertices[v[0]].p);
        if (!vArray[p])
            vArray[p] = [];
        vArray[p].push(points);
        body[p] += "M" + points.join("L");
        gap[p] += "M" + vertices[chain[0][0]].p + chain.reduce((r, v, i, d) => !i
            ? r
            : !v[2]
                ? r + "L" + vertices[v[0]].p
                : d[i + 1] && !d[i + 1][2]
                    ? r + "M" + vertices[v[0]].p : r, "");
    }

    // find state visual center
    vArray.forEach((ar, i) => {
        const sorted = ar.sort((a, b) => b.length - a.length); // sort by points number
        provinces[i].pole = polylabel(sorted, 1.0); // pole of inaccessibility
    });

    const g = provs.append("g").attr("id", "provincesBody");
    const bodyData = body.map((p, i) => [p.length > 10 ? p : null, i, provinces[i].color]).filter(d => d[0]);
    g.selectAll("path").data(bodyData).enter().append("path").attr("d", d => d[0]).attr("fill", d => d[2]).attr("stroke", "none").attr("id", d => "province" + d[1]);
    const gapData = gap.map((p, i) => [p.length > 10 ? p : null, i, provinces[i].color]).filter(d => d[0]);
    g.selectAll(".path").data(gapData).enter().append("path").attr("d", d => d[0]).attr("fill", "none").attr("stroke", d => d[2]).attr("id", d => "province-gap" + d[1]);

    const labels = provs.append("g").attr("id", "provinceLabels");
    labels.style("display", `${labelsOn ? "block" : "none"}`);
    const labelData = provinces.filter(p => p.i && !p.removed);
    labels.selectAll(".path").data(labelData).enter().append("text")
        .attr("x", d => d.pole[0]).attr("y", d => d.pole[1])
        .attr("id", d => "provinceLabel" + d.i).text(d => d.name);

    // connect vertices to chain
    function connectVertices(start, t, province) {
        const chain = []; // vertices chain to form a path
        let land = vertices[start].c.some(c =>
            cells[c].h >= 20 && cells[c].province !== t);
        function check(i) {
            province = !!cells[i] ? cells[i].province : 0;
            land = (!!cells[i] && !!cells[i].h)
                ? cells[i].h >= 20 : false;
        }

        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1] ? chain[chain.length - 1][0] : -1; // previous vertex in chain
            chain.push([current, province, land]); // add current vertex to sequence
            const c = vertices[current].c; // cells adjacent to vertex
            c.filter(c => !!cells[c] && cells[c].province === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].province !== t;
            const c1 = c[1] >= n || cells[c[1]].province !== t;
            const c2 = c[2] >= n || cells[c[2]].province !== t;
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
                console.error("Next vertex is not found"); break;
            }
        }
        chain.push([start, province, land]); // add starting vertex to sequence to close the path
        return chain;
    }
    console.timeEnd("drawProvinces");
}
