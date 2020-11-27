import { view } from "../main.js";
import { addEventListener as onStyleEvent } from "../modules/ui/style.js";


export async function drawCompass() {
    if (!view.compass.selectAll("*").size()) {
        view.compass.append("use").attr("xlink:href", "#rose");
        // prolongate rose lines
        view.svg.select("g#rose > g#sL > line#sL1").attr("y1", -19000).attr("y2", 19000);
        view.svg.select("g#rose > g#sL > line#sL2").attr("x1", -19000).attr("x2", 19000);
        shiftCompass();
    }
}

function shiftCompass() {
    const tr = `translate(${styleCompassShiftX.value} ${styleCompassShiftY.value}) scale(${styleCompassSizeInput.value})`;
    d3.select("#rose").attr("transform", tr);
}

onStyleEvent('change', e => {
    if (e.detail.layer !== 'compass')
        return;

    const { size, xShift, yShift } = e.detail;
    if (size !== undefined
    || xShift !== undefined
    || yShift !== undefined)
        shiftCompass();
});