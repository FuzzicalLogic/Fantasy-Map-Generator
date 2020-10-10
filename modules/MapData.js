import { Voronoi } from "./voronoi.js";
import { randomizeOptions } from "./ui/options.js";
import { rn } from "./utils.js";
import { generate as generateHeight } from "./heightmap-generator.js";
export function generate(seed, w, h, view) {
    let data = MapData(seed);
    Math.seedrandom(seed);
    data.options = randomizeOptions();
    data.grid = placePoints(w, h);
    data.grid = calculateVoronoi(data.grid, data.grid.points);

    return data;
}


export function fromBlob(data) {

}

export function fromURL(url) {

}

function MapData(seed, w, h) {
    return {
        get seed() { return seed; },
        get width() { return w; },
        get height() { return h; },
    }
}

function placePoints(w, h) {
    const nCells = 10000 * densityInput.value; // generate 10k points for each densityInput point
    const spacing = rn(Math.sqrt(w * h / nCells), 2); // spacing between points before jirrering
    return {
        spacing: spacing,
        boundary: getBoundaryPoints(w, h, spacing),
        points: getJitteredGrid(w, h, spacing),
        cellsX: Math.floor((w + 0.5 * spacing) / spacing),
        cellsY: Math.floor((h + 0.5 * spacing) / spacing)
    }
}

// add boundary points to pseudo-clip voronoi cells
function getBoundaryPoints(width, height, spacing) {
    const offset = rn(-1 * spacing);
    const bSpacing = spacing * 2;
    const w = width - offset * 2;
    const h = height - offset * 2;
    const numberX = Math.ceil(w / bSpacing) - 1;
    const numberY = Math.ceil(h / bSpacing) - 1;
    let points = [];
    for (let i = 0.5; i < numberX; i++) {
        let x = Math.ceil(w * i / numberX + offset);
        points.push([x, offset], [x, h + offset]);
    }
    for (let i = 0.5; i < numberY; i++) {
        let y = Math.ceil(h * i / numberY + offset);
        points.push([offset, y], [w + offset, y]);
    }
    return points;
}

function getJitteredGrid(width, height, spacing) {
    const radius = spacing / 2; // square radius
    const jittering = radius * .9; // max deviation
    const jitter = () => Math.random() * 2 * jittering - jittering;

    let points = [];
    for (let y = radius; y < height; y += spacing) {
        for (let x = radius; x < width; x += spacing) {
            const xj = Math.min(rn(x + jitter(), 2), width);
            const yj = Math.min(rn(y + jitter(), 2), height);
            points.push([xj, yj]);
        }
    }
    return points;
}
export function calculateVoronoi(graph, points) {
    const n = points.length;
    const allPoints = points.concat(graph.boundary);
    const delaunay = Delaunator.from(allPoints);

    let { cells, vertices } = Voronoi(delaunay, allPoints, n);
    cells.i = n < 65535 ? Uint16Array.from(d3.range(n)) : Uint32Array.from(d3.range(n)); // array of indexes
    return {
        ...graph,
        cells: cells,
        vertices: vertices
    };
}
