import * as generator from "../engines/population-engine.js";
import {
    view
} from "../main.js";

generator.addEventListener('post', drawRuralPopulation);
async function drawRuralPopulation({ detail: { cells } }) {
    let { population } = view;
    population.selectAll("line").remove();

    const show = d3.transition().duration(2000).ease(d3.easeSinIn);

    const rural = cells.map((x, i) => ({ i: i, pop: x.pop, p: x.p }))
        .map(x => [x.p[0], x.p[1], x.p[1] - x.pop / 8]);
    population.select("#rural").selectAll("line").data(rural).enter().append("line")
        .attr("x1", d => d[0]).attr("y1", d => d[1])
        .attr("x2", d => d[0]).attr("y2", d => d[2]);
}

import * as burgsgenerator from "../modules/burgs-and-states.js";
burgsgenerator.addPopulationEventListener('post', drawUrbanPopulation);
async function drawUrbanPopulation({ detail: { burgs } }) {
    let { population } = view;

    const show = d3.transition().duration(2000).ease(d3.easeSinIn);
    const urban = burgs.filter(b => b.i && !b.removed)
        .map(b => [b.x, b.y, b.y - b.population / 8 * urbanization.value]);
    population.select("#urban").selectAll("line").data(urban).enter().append("line")
        .attr("x1", d => d[0]).attr("y1", d => d[1])
        .attr("x2", d => d[0]).attr("y2", d => d[2]);

}