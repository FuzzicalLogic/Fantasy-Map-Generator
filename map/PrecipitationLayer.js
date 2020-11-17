import * as generator from "../engines/precipitation-engine.js";
import {
    view
} from "../main.js";
import { rn } from "../modules/utils.js";

generator.addEventListener('post', drawPrec);
function drawPrec({ detail: { cells, p } }) {
    let { prec } = view;

    const show = d3.transition().duration(800).ease(d3.easeSinIn);
    prec.selectAll("text").attr("opacity", 0).transition(show).attr("opacity", 1);
    const data = cells.map((v, k) => k)
        .filter(i => !!cells[i] && cells[i].h >= 20 && cells[i].prec);
    prec.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => p[d][0]).attr("cy", d => p[d][1]).attr("r", 0)
        .transition(show).attr("r", d => rn(Math.max(Math.sqrt(cells[d].prec * .5), .8), 2));
}

generator.addEventListener('clear', deleteAll);
function deleteAll() {
    view.prec.selectAll('circle').remove();
}
