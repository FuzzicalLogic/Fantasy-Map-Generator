import { grid, view, biomesData }  from "../main.js";

const emitter = new EventTarget();
export const addEventListener = (...args) => emitter.addEventListener(...args);
export const removeEventListener = (...args) => emitter.removeEventListener(...args);
export const dispatchEvent = (...args) => emitter.dispatchEvent(...args);

export function getRoads(pack) {
    console.time("generateMainRoads");
    const cells = pack.cells, burgs = pack.burgs.filter(b => b.i && !b.removed);
    const capitals = burgs.filter(b => b.capital);
    if (capitals.length < 2) return []; // not enough capitals to build main roads

    let paths = []; // array to store path segments
    for (const b of capitals) {
        const connect = capitals.filter(c => c.i > b.i && c.feature === b.feature);
        if (!connect.length) continue;
        const farthest = d3.scan(connect, (a, c) => ((c.y - b.y) ** 2 + (c.x - b.x) ** 2) - ((a.y - b.y) ** 2 + (a.x - b.x) ** 2));
        const [from, exit] = findLandPath(cells, b.cell, connect[farthest].cell, null);
        const segments = restorePath(cells, b.cell, exit, "main", from);
        paths = [...paths, ...segments]
    }

    cells.i.forEach(i => cells.s[i] += cells.road[i] / 2); // add roads to suitability score
    console.timeEnd("generateMainRoads");
    return paths;
}

export function getTrails(pack) {
    console.time("generateTrails");
    const cells = pack.cells, burgs = pack.burgs.filter(b => b.i && !b.removed);
    if (burgs.length < 2) return []; // not enough burgs to build trails

    let paths = []; // array to store path segments
    for (const f of pack.features.filter(f => f.land)) {
        const isle = burgs.filter(b => b.feature === f.i); // burgs on island
        if (isle.length < 2) continue;

        isle.forEach(function (b, i) {
            let path = [];
            if (!i) {
                // build trail from the first burg on island to the farthest one on the same island
                const farthest = d3.scan(isle, (a, c) => ((c.y - b.y) ** 2 + (c.x - b.x) ** 2) - ((a.y - b.y) ** 2 + (a.x - b.x) ** 2));
                const to = isle[farthest].cell;
                if (cells.road[to]) return;
                const [from, exit] = findLandPath(cells, b.cell, to, null);
                path = restorePath(cells, b.cell, exit, "small", from);
            } else {
                // build trail from all other burgs to the closest road on the same island
                if (cells.road[b.cell]) return;
                const [from, exit] = findLandPath(cells, b.cell, null, true);
                if (exit === null) return;
                path = restorePath(cells, b.cell, exit, "small", from);
            }
            if (path) paths = paths.concat(path);
        });
    }

    console.timeEnd("generateTrails");
    return paths;
}

export function getSearoutes(pack) {
    console.time("generateSearoutes");
    const allPorts = pack.burgs.filter(b => b.port > 0 && !b.removed);
    if (allPorts.length < 2) return [];

    const bodies = new Set(allPorts.map(b => b.port)); // features with ports
    let paths = []; // array to store path segments
    const connected = []; // store cell id of connected burgs

    const cells = pack.cells;
    bodies.forEach(function (f) {
        const ports = allPorts.filter(b => b.port === f); // all ports on the same feature
        if (ports.length < 2) return;

        for (let s = 0; s < ports.length; s++) {
            const source = ports[s].cell;
            if (connected[source]) continue;

            for (let t = s + 1; t < ports.length; t++) {
                const target = ports[t].cell;
                if (connected[target]) continue;

                const [from, exit, passable] = findOceanPath(cells, target, source, true);
                if (!passable) continue;

                const path = restorePath(cells, target, exit, "ocean", from);
                paths = paths.concat(path);

                connected[source] = 1;
                connected[target] = 1;
            }
        }

    });

    console.timeEnd("generateSearoutes");
    return paths;
}

export function regenerate(pack) {
    view.routes.selectAll("path").remove();
    pack.cells.road = new Uint16Array(pack.cells.i.length);
    pack.cells.crossroad = new Uint16Array(pack.cells.i.length);

    dispatchEvent(new CustomEvent('add', {
        detail: {
            type: 'road',
            data: getRoads(pack)
        }
    }));
    dispatchEvent(new CustomEvent('add', {
        detail: {
            type: 'trail',
            data: getTrails(pack)
        }
    }));
    dispatchEvent(new CustomEvent('add', {
        detail: {
            type: 'searoute',
            data: getSearoutes(pack)
        }
    }));

}


  // Find a land path to a specific cell (exit), to a closest road (toRoad), or to all reachable cells (null, null)
function findLandPath(cells, start, exit = null, toRoad = null) {
    const queue = new PriorityQueue({ comparator: (a, b) => a.p - b.p });
    const cost = [], from = [];
    queue.queue({ e: start, p: 0 });

    while (queue.length) {
        const next = queue.dequeue(), n = next.e, p = next.p;
        if (toRoad && cells.road[n]) return [from, n];

        for (const c of cells.c[n]) {
            let { h, state } = cells;
            if (h[c] < 20) continue; // ignore water cells
            const stateChangeCost = state && state[c] !== state[n] ? 400 : 0; // trails tend to lay within the same state
            const habitability = biomesData.habitability[cells.biome[c]];
            const habitedCost = habitability ? Math.max(100 - habitability, 0) : 400; // routes tend to lay within populated areas
            const heightChangeCost = Math.abs(h[c] - h[n]) * 10; // routes tend to avoid elevation changes
            const heightCost = h[c] > 80 ? h[c] : 0; // routes tend to avoid mountainous areas
            const cellCoast = 10 + stateChangeCost + habitedCost + heightChangeCost + heightCost;
            const totalCost = p + (cells.road[c] || cells.burg[c] ? cellCoast / 3 : cellCoast);

            if (from[c] || totalCost >= cost[c]) continue;
            from[c] = n;
            if (c === exit) return [from, exit];
            cost[c] = totalCost;
            queue.queue({ e: c, p: totalCost });
        }

    }
    return [from, exit];
}

function restorePath(cells, start, end, type, from) {
    const path = []; // to store all segments;
    let segment = [], current = end, prev = end;
    const score = type === "main" ? 5 : 1; // to incrade road score at cell

    if (type === "ocean" || !cells.road[prev]) segment.push(end);
    if (!cells.road[prev])
        cells.road[prev] = score;

    for (let i = 0, limit = 1000; i < limit; i++) {
        if (!from[current]) break;
        current = from[current];

        if (cells.road[current]) {
            if (segment.length) {
                segment.push(current);
                path.push(segment);
                if (segment[0] !== end) {
                    cells.road[segment[0]] += score;
                    cells.crossroad[segment[0]] += score;
                }
                if (current !== start) {
                    cells.road[current] += score;
                    cells.crossroad[current] += score;
                }
            }
            segment = [];
            prev = current;
        } else {
            if (prev) segment.push(prev);
            prev = null;
            segment.push(current);
        }

        cells.road[current] += score;
        if (current === start) break;
    }

    if (segment.length > 1) path.push(segment);
    return path;
}

  // find water paths
function findOceanPath(cells, start, exit = null, toRoute = null) {
    const temp = grid.cells.temp;
    const queue = new PriorityQueue({ comparator: (a, b) => a.p - b.p });
    const cost = [], from = [];
    queue.queue({ e: start, p: 0 });

    while (queue.length) {
        const next = queue.dequeue(), n = next.e, p = next.p;
        if (toRoute && n !== start && cells.road[n]) return [from, n, true];

        for (const c of cells.c[n]) {
            if (c === exit) { from[c] = n; return [from, exit, true]; }
            if (cells.h[c] >= 20) continue; // ignore land cells
            if (temp[cells.g[c]] <= -5) continue; // ignore cells with term <= -5
            const dist2 = (cells.p[c][1] - cells.p[n][1]) ** 2 + (cells.p[c][0] - cells.p[n][0]) ** 2;
            const totalCost = p + (cells.road[c] ? 1 + dist2 / 2 : dist2 + (cells.t[c] ? 1 : 100));

            if (from[c] || totalCost >= cost[c]) continue;
            from[c] = n, cost[c] = totalCost;
            queue.queue({ e: c, p: totalCost });
        }

    }
    return [from, exit, false];
}
