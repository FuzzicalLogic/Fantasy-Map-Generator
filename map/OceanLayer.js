import * as generator from "../modules/ocean-layers.js";
import { oceanLayers, lineGen } from "../main.js";

generator.addEventListener('post', renderLayer);
function renderLayer({ detail: { path, opacity } }) {
    oceanLayers.append("path")
        .attr("d", path)
        .attr("fill", "#ecf2f9")
        .style("opacity", opacity)
}

generator.addEventListener('clear', clear);
function clear() {
    oceanLayers.selectAll('path').remove();
}