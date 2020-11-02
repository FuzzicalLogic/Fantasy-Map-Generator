import { Voronoi } from "../modules/voronoi.js";
import { randomizeOptions } from "../modules/ui/options.js";
import { rn } from "../modules/utils.js";
import { generate as generateHeight } from "../modules/heightmap-generator.js";
export function generate(seed, w, h, view) {
    let data = MapData(seed);
    Math.seedrandom(seed);
    data.options = randomizeOptions();
    data.grid = placePoints(w, h);
    data.grid = calculateVoronoi(data.grid, data.grid.points);
    generateHeight(data.grid);
    markFeatures(data.grid, seed);
    openNearSeaLakes(data.grid);

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

export function placePoints(w, h) {
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

export function markFeatures(grid, seed) {
    console.time("markFeatures");
    Math.seedrandom(seed); // restart Math.random() to get the same result on heightmap edit in Erase mode
    const cells = grid.cells, heights = grid.cells.h;
    cells.f = new Uint16Array(cells.length); // cell feature number
    cells.t = new Int8Array(cells.length); // cell type: 1 = land coast; -1 = water near coast;
    grid.features = [0];

    for (let i = 1, queue = [0]; queue[0] !== -1; i++) {
        cells.f[queue[0]] = i; // feature number
        const land = heights[queue[0]] >= 20;
        let border = false; // true if feature touches map border

        while (queue.length) {
            const q = queue.pop();
            if (cells[q].b) border = true;
            cells[q].c.forEach(function (e) {
                const eLand = heights[e] >= 20;
                //if (eLand) cells.t[e] = 2;
                if (land === eLand && cells.f[e] === 0) {
                    cells.f[e] = i;
                    queue.push(e);
                }
                if (land && !eLand) {
                    cells.t[q] = 1;
                    cells.t[e] = -1;
                }
            });
        }
        const type = land ? "island" : border ? "ocean" : "lake";
        grid.features.push({ i, land, border, type });

        queue[0] = cells.f.findIndex(f => !f); // find unmarked cell
    }

    console.timeEnd("markFeatures");
}

// How to handle lakes generated near seas? They can be both open or closed.
// As these lakes are usually get a lot of water inflow, most of them should have brake the treshold and flow to sea via river or strait (see Ancylus Lake).
// So I will help this process and open these kind of lakes setting a treshold cell heigh below the sea level (=19).
export function openNearSeaLakes(grid) {
    if (templateInput.value === "Atoll") return; // no need for Atolls
    const cells = grid.cells, features = grid.features;
    if (!features.find(f => f.type === "lake")) return; // no lakes
    console.time("openLakes");
    const limit = 50; // max height that can be breached by water

    for (let t = 0, removed = true; t < 5 && removed; t++) {
        removed = false;

        let xs = cells.map((v, k) => k)
        for (const i of xs) {
            const lake = cells.f[i];
            if (features[lake].type !== "lake") continue; // not a lake cell

            check_neighbours:
            for (const c of cells[i].c) {
                if (cells.t[c] !== 1 || cells[c].h > limit) continue; // water cannot brake this

                for (const n of cells[c].c) {
                    const ocean = cells.f[n];
                    if (features[ocean].type !== "ocean") continue; // not an ocean
                    removed = removeLake(c, lake, ocean);
                    break check_neighbours;
                }
            }
        }

    }

    function removeLake(threshold, lake, ocean) {
        cells.h[threshold] = 19;
        cells.t[threshold] = -1;
        cells.f[threshold] = ocean;
        cells[threshold].c.forEach(function (c) {
            if (cells.h[c] >= 20) cells.t[c] = 1; // mark as coastline
        });
        features[lake].type = "ocean"; // mark former lake as ocean
        return true;
    }

    console.timeEnd("openLakes");
}
