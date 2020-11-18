import {
    graphWidth, graphHeight,
    mapCoordinates, scale,
    view
} from "../main.js";
import { rn, round } from "../modules/utils.js";

export async function drawCoordinates() {
    let { coordinates } = view;
    coordinates.selectAll("*").remove(); // remove every time
    const steps = [.5, 1, 2, 5, 10, 15, 30]; // possible steps
    const goal = mapCoordinates.lonT / scale / 10;
    const step = steps.reduce((p, c) => Math.abs(c - goal) < Math.abs(p - goal) ? c : p);

    const desired = +coordinates.attr("data-size"); // desired label size
    coordinates.attr("font-size", Math.max(rn(desired / scale ** .8, 2), .1)); // actual label size
    const graticule = d3.geoGraticule()
        .extent([[mapCoordinates.lonW, mapCoordinates.latN], [mapCoordinates.lonE + .1, mapCoordinates.latS + .1]])
        .stepMajor([400, 400])
        .stepMinor([step, step]);
    const projection = d3.geoEquirectangular().fitSize([graphWidth, graphHeight], graticule());

    const grid = coordinates.append("g").attr("id", "coordinateGrid");
    const labels = coordinates.append("g").attr("id", "coordinateLabels");

    const p = getViewPoint(scale + desired + 2, scale + desired / 2); // on border point on viexBox
    const data = graticule.lines().map(d => {
        const lat = d.coordinates[0][1] === d.coordinates[1][1]; // check if line is latitude or longitude
        const c = d.coordinates[0], pos = projection(c); // map coordinates
        const [x, y] = lat ? [rn(p.x, 2), rn(pos[1], 2)] : [rn(pos[0], 2), rn(p.y, 2)]; // labels position
        const v = lat ? c[1] : c[0]; // label
        const text = !v ? v : Number.isInteger(v) ? lat ? c[1] < 0 ? -c[1] + "°S" : c[1] + "°N" : c[0] < 0 ? -c[0] + "°W" : c[0] + "°E" : "";
        return { lat, x, y, text };
    });

    const d = round(d3.geoPath(projection)(graticule()));
    grid.append("path").attr("d", d).attr("vector-effect", "non-scaling-stroke");
    labels.selectAll('text').data(data).enter().append("text").attr("x", d => d.x).attr("y", d => d.y).text(d => d.text);
}

function getViewPoint(x, y) {
    const view = document.getElementById('viewbox');
    const svg = document.getElementById('map');
    const pt = svg.createSVGPoint();
    pt.x = x, pt.y = y;
    return pt.matrixTransform(view.getScreenCTM().inverse());
}
