import {
    seed, pack, view,
    grid, graphWidth, graphHeight,
    lineGen
} from "../main.js";

import * as Names from "./names-generator.js";

import { P, rn, rw, round } from "./utils.js";

const emitter = new EventTarget();
export const addEventListener = (...args) => emitter.addEventListener(...args);
export const removeEventListener = (...args) => emitter.removeEventListener(...args);
export const dispatchEvent = (...args) => emitter.dispatchEvent(...args);

export const generate = function (changeHeights = true) {
    console.time('generateRivers');
    Math.seedrandom(seed);
    const { cells, features } = pack;

    markupLand(cells);

    // height with added t value to make map less depressed
    const h = cells.map(x => x.h)
        .map((h, i) => h < 20 || cells[i].t < 1 ? h : h + cells[i].t / 100)
        .map((h, i) => h < 20 || cells[i].t < 1 ? h : h + d3.mean(cells[i].c.map(c => cells[c].t)) / 10000)
        .map(x => ~~x);

    resolveDepressions(h);
    features.forEach(f => { delete f.river; delete f.flux; });

    const riversData = []; // rivers data
    cells.forEach(x => x.fl = 0);
    cells.forEach(x => x.r = 0);
    cells.forEach(x => x.conf = 0);
    let riverNext = 1; // first river id is 1, not 0

    riverNext = drainWater(cells, h, features, riverNext, riversData);
    dispatchEvent(new CustomEvent('add', {
        detail: defineRivers(pack, riverNext, riversData)
    }));

    // apply change heights as basic one
    if (changeHeights)
        h.forEach((x, i) => cells[i].h = x);

    console.timeEnd('generateRivers');
}

// build distance field in cells from water (cells.t)
function markupLand(cells) {
    const q = distance => cells.filter(x => x.t === distance);
    for (let distance = 2, queue = q(distance); queue.length; distance++ , queue = q(distance)) {
        queue.forEach(x => x.c.forEach(c => {
            if (!cells[c].t)
                cells[c].t = distance + 1;
        }));
    }
}

function drainWater(cells, h, features, riverNext, riversData) {
    const land = cells.filter(x => h[x.i] >= 20)
        .sort((a, b) => h[b.i] - h[a.i]);

    land.forEach((cell) => {
        // flux from precipitation
        cell.fl += grid.cells[cell.g].prec; 
        const [x, y] = cell.p;

        // near-border cell: pour out of the screen
        if (cell.b) {
            if (cell.r) {
                const to = [];
                const min = Math.min(y, graphHeight - y, x, graphWidth - x);
                if (min === y) {
                    to[0] = x;
                    to[1] = 0;
                }
                else if (min === graphHeight - y) {
                    to[0] = x;
                    to[1] = graphHeight;
                }
                else if (min === x) {
                    to[0] = 0;
                    to[1] = y;
                }
                else if (min === graphWidth - x) {
                    to[0] = graphWidth;
                    to[1] = y;
                }
                riversData.push({
                    river: cell.r,
                    cell: cell.i,
                    x: to[0],
                    y: to[1]
                });
            }
            return;
        }

        // downhill cell
        let min = cell.c[d3.scan(cell.c, (a, b) => h[a] - h[b])]; 

        // allow only one river can flow through a lake
        const cf = features[cell.f]; // current cell feature
        if (cf.river && cf.river !== cell.r) {
            cell.fl = 0;
        }

        if (cell.fl < 30) {
            if (h[min] >= 20)
                cells[min].fl += cell.fl;
            // flux is too small to operate as river
            return;
        }

        // Proclaim a new river
        if (!cell.r) {
            cell.r = riverNext;
            riversData.push({ river: riverNext, cell: cell.i, x, y });
            riverNext++;
        }

        // downhill cell already has river assigned
        if (cells[min].r) {
            if (cells[min].fl < cell.fl) {
                // mark confluence
                cells[min].conf = cells[min].fl; 
                // min river is a tributary of current river
                if (h[min] >= 20)
                    riversData.find(d => d.river === cells[min].r).parent = cell.r; 
                // re-assign river if downhill part has less flux
                cells[min].r = cell.r;
            } else {
                // mark confluence
                cells[min].conf += cell.fl;
                if (h[min] >= 20)
                    // current river is a tributary of min river
                    riversData.find(d => d.river === cell.r).parent = cells[min].r;
            }
        }
        // assign the river to the downhill cell
        else cells[min].r = cell.r;

        const nx = cells[min].p[0], ny = cells[min].p[1];
        if (h[min] < 20) {
            // pour water to the sea haven
            riversData.push({ river: cell.r, cell: cell.haven, x: nx, y: ny });
        }
        else {
            // feature of min cell
            const mf = features[cells[min].f]; 
            if (mf.type === "lake") {
                if (!mf.river || cell.fl > mf.flux) {
                    // pour water to temporaly elevated lake
                    mf.river = cell.r;
                    // entering flux
                    mf.flux = cell.fl;
                }
            }
            // propagate flux
            cells[min].fl += cell.fl;
            // add next River segment
            riversData.push({ river: cell.r, cell: min, x: nx, y: ny });
        }

    });
    return riverNext;
}

function defineRivers(pack, riverNext, riversData) {
    const { cells } = pack;
    pack.rivers = []; // rivers data
    const riverPaths = []; // temporary data for all rivers
    for (let r = 1; r <= riverNext; r++) {
        const riverSegments = riversData.filter(d => d.river === r);

        if (riverSegments.length > 2) {
            const riverEnhanced = addMeandring(riverSegments);
            const width = rn(.8 + Math.random() * .4, 1); // river width modifier
            const increment = rn(.8 + Math.random() * .6, 1); // river bed widening modifier
            const [path, length] = getPath(riverEnhanced, width, increment);
            riverPaths.push([r, path, width, increment]);
            const source = riverSegments[0], mouth = riverSegments[riverSegments.length - 2];
            const parent = source.parent || 0;
            pack.rivers.push({ i: r, parent, length, source: source.cell, mouth: mouth.cell });
        } else {
            // remove too short rivers
            riverSegments.filter(s => cells[s.cell].r === r)
                .forEach(s => cells[s.cell].r = 0);
        }
    }
    return riverPaths;
}

  // depression filling algorithm (for a correct water flux modeling)
export function resolveDepressions(h) {
    const cells = pack.cells;
    // exclude near-border cells
    const land = cells.filter(x => h[x.i] >= 20 && h[x.i] < 100 && !x.b)
        .sort((a, b) => h[b.i] - h[a.i]); // highest cells go first
    let depressed = false;

    for (let l = 0, depression = Infinity; depression && l < 100; l++) {
        depression = 0;
        for (const cell of land) {
            const minHeight = d3.min(cell.c.map(c => h[c]));
            if (minHeight === 100) continue; // already max height
            if (h[cell.i] <= minHeight) {
                h[cell.i] = Math.min(minHeight + 1, 100);
                depression++;
                depressed = true;
            }
        }
    }

    return depressed;
}

  // add more river points on 1/3 and 2/3 of length
export function addMeandring(segments, rndFactor = 0.3) {
    const riverEnhanced = []; // to store enhanced segments
    let side = 1; // to control meandring direction

    for (let s = 0; s < segments.length; s++) {
        const sX = segments[s].x, sY = segments[s].y; // segment start coordinates
        const c = pack.cells[segments[s].cell].conf || 0; // if segment is river confluence
        riverEnhanced.push([sX, sY, c]);

        if (s + 1 === segments.length) break; // do not enhance last segment

        const eX = segments[s + 1].x, eY = segments[s + 1].y; // segment end coordinates
        const angle = Math.atan2(eY - sY, eX - sX);
        const sin = Math.sin(angle), cos = Math.cos(angle);
        const serpentine = 1 / (s + 1) + 0.3;
        const meandr = serpentine + Math.random() * rndFactor;
        if (P(.5)) side *= -1; // change meandring direction in 50%
        const dist2 = (eX - sX) ** 2 + (eY - sY) ** 2;
        // if dist2 is big or river is small add extra points at 1/3 and 2/3 of segment
        if (dist2 > 64 || (dist2 > 16 && segments.length < 6)) {
            const p1x = (sX * 2 + eX) / 3 + side * -sin * meandr;
            const p1y = (sY * 2 + eY) / 3 + side * cos * meandr;
            if (P(.2)) side *= -1; // change 2nd extra point meandring direction in 20%
            const p2x = (sX + eX * 2) / 3 + side * sin * meandr;
            const p2y = (sY + eY * 2) / 3 + side * cos * meandr;
            riverEnhanced.push([p1x, p1y], [p2x, p2y]);
            // if dist is medium or river is small add 1 extra middlepoint
        } else if (dist2 > 16 || segments.length < 6) {
            const p1x = (sX + eX) / 2 + side * -sin * meandr;
            const p1y = (sY + eY) / 2 + side * cos * meandr;
            riverEnhanced.push([p1x, p1y]);
        }

    }
    return riverEnhanced;
}

export function getPath(points, width = 1, increment = 1) {
    let offset, extraOffset = .1; // starting river width (to make river source visible)
    const riverLength = points.reduce((s, v, i, p) => s + (i ? Math.hypot(v[0] - p[i - 1][0], v[1] - p[i - 1][1]) : 0), 0); // summ of segments length
    const widening = rn((1000 + (riverLength * 30)) * increment);
    const riverPointsLeft = [], riverPointsRight = []; // store points on both sides to build a valid polygon
    const last = points.length - 1;
    const factor = riverLength / points.length;

    // first point
    let x = points[0][0], y = points[0][1], c;
    let angle = Math.atan2(y - points[1][1], x - points[1][0]);
    let sin = Math.sin(angle), cos = Math.cos(angle);
    let xLeft = x + -sin * extraOffset, yLeft = y + cos * extraOffset;
    riverPointsLeft.push([xLeft, yLeft]);
    let xRight = x + sin * extraOffset, yRight = y + -cos * extraOffset;
    riverPointsRight.unshift([xRight, yRight]);

    // middle points
    for (let p = 1; p < last; p++) {
        x = points[p][0];
        y = points[p][1];
        c = points[p][2] || 0;
        const xPrev = points[p - 1][0],
            yPrev = points[p - 1][1];
        const xNext = points[p + 1][0],
            yNext = points[p + 1][1];
        angle = Math.atan2(yPrev - yNext, xPrev - xNext);
        sin = Math.sin(angle), cos = Math.cos(angle);
        offset = (Math.atan(Math.pow(p * factor, 2) / widening) / 2 * width) + extraOffset;
        const confOffset = Math.atan(c * 5 / widening);
        extraOffset += confOffset;
        xLeft = x + -sin * offset, yLeft = y + cos * (offset + confOffset);
        riverPointsLeft.push([xLeft, yLeft]);
        xRight = x + sin * offset, yRight = y + -cos * offset;
        riverPointsRight.unshift([xRight, yRight]);
    }

    // end point
    x = points[last][0], y = points[last][1], c = points[last][2];
    if (c) extraOffset += Math.atan(c * 10 / widening); // add extra width on river confluence
    angle = Math.atan2(points[last - 1][1] - y, points[last - 1][0] - x);
    sin = Math.sin(angle), cos = Math.cos(angle);
    xLeft = x + -sin * offset, yLeft = y + cos * offset;
    riverPointsLeft.push([xLeft, yLeft]);
    xRight = x + sin * offset, yRight = y + -cos * offset;
    riverPointsRight.unshift([xRight, yRight]);

    // generate polygon path and return
    lineGen.curve(d3.curveCatmullRom.alpha(0.1));
    const right = lineGen(riverPointsRight);
    let left = lineGen(riverPointsLeft);
    left = left.substring(left.indexOf("C"));
    return [round(right + left, 2), rn(riverLength, 2)];
}

export function specify() {
    if (!pack.rivers.length) return;
    Math.seedrandom(seed);
    const smallLength = pack.rivers.map(r => r.length || 0).sort((a, b) => a - b)[Math.ceil(pack.rivers.length * .15)];
    const smallType = { "Creek": 9, "River": 3, "Brook": 3, "Stream": 1 }; // weighted small river types

    for (const r of pack.rivers) {
        r.basin = getBasin(r.i, r.parent);
        r.name = getName(r.mouth);
        //debug.append("circle").attr("cx", pack.cells.p[r.mouth][0]).attr("cy", pack.cells.p[r.mouth][1]).attr("r", 2);
        const small = r.length < smallLength;
        r.type = r.parent && !(r.i % 6) ? small ? "Branch" : "Fork" : small ? rw(smallType) : "River";
    }
}

export function getName(cell) {
    return Names.getCulture(pack.cells[cell].culture);
}

  // remove river and all its tributaries
export function remove(id) {
    const cells = pack.cells;
    const riversToRemove = pack.rivers.filter(r => r.i === id || getBasin(r.i, r.parent, id) === id).map(r => r.i);
    riversToRemove.forEach(r => view.rivers.select("#river" + r).remove());
    cells.r.forEach((r, i) => {
        if (!r || !riversToRemove.includes(r)) return;
        cells.r[i] = 0;
        cells.fl[i] = grid.cells.prec[cells.g[i]];
        cells[i].conf = 0;
    });
    pack.rivers = pack.rivers.filter(r => !riversToRemove.includes(r.i));
}

export function getBasin(r, p, e) {
    while (p && r !== p && r !== e) {
        const parent = pack.rivers.find(r => r.i === p);
        if (!parent) return r;
        r = parent.i;
        p = parent.parent;
    }
    return r;
}

  