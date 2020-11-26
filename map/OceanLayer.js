import * as generator from "../modules/ocean-layers.js";
import { view, grid, oceanLayers, lineGen } from "../main.js";
import { addEventListener as onStyleEvent } from "../modules/ui/style.js";

generator.addEventListener('clear', clear);
generator.addEventListener('post', renderLayer);
onStyleEvent('change', e => {
    if (e.detail.layer !== 'ocean')
        return;

    const { pattern, layers, color, backgroundColor } = e.detail;
    if (pattern !== undefined)
        onChangePattern(pattern);
    if (layers !== undefined)
        onChangeLayers(layers);
    if (color !== undefined)
        onChangeColor(color);
    if (backgroundColor !== undefined)
        onChangeBackgroundColor(backgroundColor);
});

async function renderLayer({ detail: { path, opacity } }) {
    oceanLayers.append("path")
        .attr("d", path)
        .attr("fill", "#ecf2f9")
        .style("opacity", opacity)
}

const onChangePattern = (pattern) => {
    view.svg.select("#oceanicPattern").attr("filter", pattern);
}

const onChangeLayers = layers => {
    clear();
    oceanLayers.attr("layers", layers);
    generator.OceanLayers(grid);
}

const onChangeColor = color => {
    oceanLayers.select("rect").attr("fill", color);
}

const onChangeBackgroundColor = color => {
    view.svg.style("background-color", color);
}

function clear() {
    oceanLayers.selectAll('path').remove();
}
