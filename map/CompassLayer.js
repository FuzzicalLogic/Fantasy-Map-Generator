import { view } from "../main.js";


export function drawCompass() {
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
