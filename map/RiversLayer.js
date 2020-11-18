import * as generator from "../modules/river-generator.js";
import {
    view,
    pack,
    lineGen,
    roads, trails, searoutes
} from "../main.js";
import { round } from "../modules/utils.js";

generator.addEventListener('add', render);
async function render({ detail: rivers }) {
    view.rivers.selectAll("path").remove();
    view.rivers.selectAll("path").data(rivers).enter()
        .append("path")
        .attr("d", d => d[1])
        .attr("id", d => "river" + d[0])
        .attr("data-width", d => d[2])
        .attr("data-increment", d => d[3]);

}