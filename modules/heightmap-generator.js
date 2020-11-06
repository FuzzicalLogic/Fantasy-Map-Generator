import {
    graphWidth, graphHeight, grid
} from "../main.js";

import { findGridCell, P, getNumberInRange, lim, rand } from "./utils.js";

let cells, vertices, p;
const BLOB_POWER = {
    1: .98,
    2: .985,
    3: .987,
    4: .9892,
    5: .9911,
    6: .9921,
    7: .9934,
    8: .9942,
    9: .9946,
    10: .995
}
const LINE_POWER = {
  1: .81,
  2: .82,
  3: .83,
  4: .84,
  5: .855,
  6: .87,
  7: .885,
  8: .91,
  9: .92,
 10: .93
}
const Templates = {
    "Volcano": templateVolcano,
    "High Island": templateHighIsland,
    "Low Island": templateLowIsland,
    "Continents": templateContinents,
    "Archipelago": templateArchipelago,
    "Atoll": templateAtoll,
    "Mediterranean": templateMediterranean,
    "Peninsula": templatePeninsula,
    "Pangea": templatePangea,
    "Isthmus": templateIsthmus,
    "Shattered": templateShattered
}
const Steps = {
    Hill: addHill,
    Pit: addPit,
    Range: addRange,
    Trough: addTrough,
    Strait: addStrait,
    Add: modify,
    Multiply: modify,
    Smooth: smooth
}

const emitter = new EventTarget();
export const addEventListener = (...args) => emitter.addEventListener(...args);
export const removeEventListener = (...args) => emitter.removeEventListener(...args);
const dispatchEvent = (...args) => emitter.dispatchEvent(...args);

export function generate(map) {
    console.time('generateHeightmap');
    ({ cells, vertices, points: p } = map);
    cells.forEach(x => x.h = 0);

    Templates[document.getElementById("templateInput").value]()
    dispatchEvent(new CustomEvent('update', {
        detail: { cells, vertices }
    }))
    console.timeEnd('generateHeightmap');
}

// Heighmap Template: Volcano
function templateVolcano() {
    Steps.Hill("1", "90-100", "44-56", "40-60");
    Steps.Multiply("50-100", 0, 0.8);
    Steps.Range("1.5", "30-55", "45-55", "40-60");
    Steps.Smooth(2);
    Steps.Hill("1.5", "25-35", "25-30", "20-75");
    Steps.Hill("1", "25-35", "75-80", "25-75");
    Steps.Hill("0.5", "20-25", "10-15", "20-25");
}

// Heighmap Template: High Island
function templateHighIsland() {
    Steps.Hill("1", "90-100", "65-75", "47-53");
    Steps.Add("all", 5, 1);
    Steps.Hill("6", "20-23", "25-55", "45-55");
    Steps.Range("1", "40-50", "45-55", "45-55");
    Steps.Smooth(2);
    Steps.Trough("2-3", "20-30", "20-30", "20-30");
    Steps.Trough("2-3", "20-30", "60-80", "70-80");
    Steps.Hill("1", "10-15", "60-60", "50-50");
    Steps.Hill("1.5", "13-16", "15-20", "20-75");
    Steps.Multiply("20-100", 0, 0.8);
    Steps.Range("1.5", "30-40", "15-85", "30-40");
    Steps.Range("1.5", "30-40", "15-85", "60-70");
    Steps.Pit("2-3", "10-15", "15-85", "20-80");
}

// Heighmap Template: Low Island
function templateLowIsland() {
    Steps.Hill("1", "90-99", "60-80", "45-55");
    Steps.Hill("4-5", "25-35", "20-65", "40-60");
    Steps.Range("1", "40-50", "45-55", "45-55");
    Steps.Smooth(3);
    Steps.Trough("1.5", "20-30", "15-85", "20-30");
    Steps.Trough("1.5", "20-30", "15-85", "70-80");
    Steps.Hill("1.5", "10-15", "5-15", "20-80");
    Steps.Hill("1", "10-15", "85-95", "70-80");
    Steps.Pit("3-5", "10-15", "15-85", "20-80");
    Steps.Multiply("20-100", 0, 0.4);
}

// Heighmap Template: Continents
function templateContinents() {
    Steps.Hill("1", "80-85", "75-80", "40-60");
    Steps.Hill("1", "80-85", "20-25", "40-60");
    Steps.Multiply("20-100", 0, .22);
    Steps.Hill("5-6", "15-20", "25-75", "20-82");
    Steps.Range(".8", "30-60", "5-15", "20-45");
    Steps.Range(".8", "30-60", "5-15", "55-80");
    Steps.Range("0-3", "30-60", "80-90", "20-80");
    Steps.Trough("3-4", "15-20", "15-85", "20-80");
    Steps.Strait("2", "vertical");
    Steps.Smooth(2);
    Steps.Trough("1-2", "5-10", "45-55", "45-55");
    Steps.Pit("3-4", "10-15", "15-85", "20-80");
    Steps.Hill("1", "5-10", "40-60", "40-60");
}

// Heighmap Template: Archipelago
function templateArchipelago() {
    Steps.Add("all", 11, 1);
    Steps.Range("2-3", "40-60", "20-80", "20-80");
    Steps.Hill("5", "15-20", "10-90", "30-70");
    Steps.Hill("2", "10-15", "10-30", "20-80");
    Steps.Hill("2", "10-15", "60-90", "20-80");
    Steps.Smooth(3);
    Steps.Trough("10", "20-30", "5-95", "5-95");
    Steps.Strait("2", "vertical");
    Steps.Strait("2", "horizontal");
}

// Heighmap Template: Atoll
function templateAtoll() {
    Steps.Hill("1", "75-80", "50-60", "45-55");
    Steps.Hill("1.5", "30-50", "25-75", "30-70");
    Steps.Hill(".5", "30-50", "25-35", "30-70");
    Steps.Smooth(1);
    Steps.Multiply("25-100", 0, 0.2);
    Steps.Hill(".5", "10-20", "50-55", "48-52");
}

// Heighmap Template: Mediterranean
function templateMediterranean() {
    Steps.Range("3-4", "30-50", "0-100", "0-10");
    Steps.Range("3-4", "30-50", "0-100", "90-100");
    Steps.Hill("5-6", "30-70", "0-100", "0-5");
    Steps.Hill("5-6", "30-70", "0-100", "95-100");
    Steps.Smooth(1);
    Steps.Hill("2-3", "30-70", "0-5", "20-80");
    Steps.Hill("2-3", "30-70", "95-100", "20-80");
    Steps.Multiply("land", 0, 0.8);
    Steps.Trough("3-5", "40-50", "0-100", "0-10");
    Steps.Trough("3-5", "40-50", "0-100", "90-100");
}

// Heighmap Template: Peninsula
function templatePeninsula() {
    Steps.Range("2-3", "20-35", "40-50", "0-15");
    Steps.Add("all", 5, 1);
    Steps.Hill("1", "90-100", "10-90", "0-5");
    Steps.Add("all", 13, 1);
    Steps.Hill("3-4", "3-5", "5-95", "80-100");
    Steps.Hill("1-2", "3-5", "5-95", "40-60");
    Steps.Trough("5-6", "10-25", "5-95", "5-95");
    Steps.Smooth(3);
}

// Heighmap Template: Pangea
function templatePangea() {
    Steps.Hill("1-2", "25-40", "15-50", "0-10");
    Steps.Hill("1-2", "5-40", "50-85", "0-10");
    Steps.Hill("1-2", "25-40", "50-85", "90-100");
    Steps.Hill("1-2", "5-40", "15-50", "90-100");
    Steps.Hill("8-12", "20-40", "20-80", "48-52");
    Steps.Smooth(2);
    Steps.Multiply("land", 0, 0.7);
    Steps.Trough("3-4", "25-35", "5-95", "10-20");
    Steps.Trough("3-4", "25-35", "5-95", "80-90");
    Steps.Range("5-6", "30-40", "10-90", "35-65");
}

// Heighmap Template: Isthmus
function templateIsthmus() {
    Steps.Hill("5-10", "15-30", "0-30", "0-20");
    Steps.Hill("5-10", "15-30", "10-50", "20-40");
    Steps.Hill("5-10", "15-30", "30-70", "40-60");
    Steps.Hill("5-10", "15-30", "50-90", "60-80");
    Steps.Hill("5-10", "15-30", "70-100", "80-100");
    Steps.Smooth(2);
    Steps.Trough("4-8", "15-30", "0-30", "0-20");
    Steps.Trough("4-8", "15-30", "10-50", "20-40");
    Steps.Trough("4-8", "15-30", "30-70", "40-60");
    Steps.Trough("4-8", "15-30", "50-90", "60-80");
    Steps.Trough("4-8", "15-30", "70-100", "80-100");
}

// Heighmap Template: Shattered
function templateShattered() {
    Steps.Hill("8", "35-40", "15-85", "30-70");
    Steps.Trough("10-20", "40-50", "5-95", "5-95");
    Steps.Range("5-7", "30-40", "10-90", "20-80");
    Steps.Pit("12-20", "30-40", "15-85", "20-80");
}

export function addHill(count, height, rangeX, rangeY) {
    count = getNumberInRange(count);
    const power = BLOB_POWER[densityInput.value];
    while (count > 0) { addOneHill(); count--; }

    function addOneHill() {
        const change = cells.map(x => 0);
        let limit = 0, start;
        let h = lim(getNumberInRange(height));

        do {
            const x = getPointInRange(rangeX, graphWidth);
            const y = getPointInRange(rangeY, graphHeight);
            start = findGridCell(x, y);
            limit++;
        } while (cells[start].h + h > 90 && limit < 50)

        change[start] = h;
        const queue = [start];
        while (queue.length) {
            const q = queue.shift();

            for (const c of cells[q].c) {
                if (change[c]) continue;
                if (change[c] > 1) queue.push(c);
                change[c] = ~~(change[q] ** power * (Math.random() * .2 + .9));
            }
        }
        cells.map((x, i) => lim(~~(x.h + change[i])))
            .forEach((x, i) => cells[i].h = ~~x);
    }

}

export function addPit(count, height, rangeX, rangeY) {
    const power = BLOB_POWER[densityInput.value];
    count = getNumberInRange(count);
    while (count > 0) { addOnePit(); count--; }

    function addOnePit() {
        const used = new Uint8Array(cells.length);
        let retries = 0, start;
        let h = lim(getNumberInRange(height));

        do {
            const x = getPointInRange(rangeX, graphWidth);
            const y = getPointInRange(rangeY, graphHeight);
            start = findGridCell(x, y);
            retries++;
        } while (cells[start].h < 20 && retries < 50)

        const queue = [start];
        while (queue.length) {
            const q = queue.shift();
            h = h ** power * (Math.random() * .2 + .9);
            if (h < 1) return;

            cells[q].c.forEach(function (c, i) {
                if (used[c]) return;
                cells[c].h = ~~lim(cells[c].h - h * (Math.random() * .2 + .9));
                used[c] = 1;
                queue.push(c);
            });
        }
    }
}

export function addRange(count, height, rangeX, rangeY) {
    count = getNumberInRange(count);
    const power = LINE_POWER[densityInput.value];
    while (count > 0) { addOneRange(); count--; }

    function addOneRange() {
        const used = new Uint8Array(cells.length);
        let h = lim(~~getNumberInRange(height));

        // find start and end points
        const startX = getPointInRange(rangeX, graphWidth);
        const startY = getPointInRange(rangeY, graphHeight);

        let dist = 0, limit = 0, endX, endY;
        do {
            endX = Math.random() * graphWidth * .8 + graphWidth * .1;
            endY = Math.random() * graphHeight * .7 + graphHeight * .15;
            dist = Math.abs(endY - startY) + Math.abs(endX - startX);
            limit++;
        } while ((dist < graphWidth / 8 || dist > graphWidth / 3) && limit < 50)

        let range = getRange(findGridCell(startX, startY), findGridCell(endX, endY));

        // get main ridge
        function getRange(cur, end) {
            const range = [cur];
            used[cur] = 1;

            while (cur !== end) {
                let min = Infinity;
                cells[cur].c.forEach(function (e) {
                    if (used[e]) return;
                    let diff = (p[end][0] - p[e][0]) ** 2 + (p[end][1] - p[e][1]) ** 2;
                    if (Math.random() > .85) diff = diff / 2;
                    if (diff < min) { min = diff; cur = e; }
                });
                if (min === Infinity) return range;
                range.push(cur);
                used[cur] = 1;
            }

            return range;
        }

        // add height to ridge and cells around
        let queue = range.slice(), i = 0;
        while (queue.length) {
            const frontier = queue.slice();
            queue = [], i++;
            frontier.forEach(i => {
                cells[i].h = ~~lim(cells[i].h + h * (Math.random() * .3 + .85));
            });
            h = ~~(h ** power - 1);
            if (h < 2) break;
            frontier.forEach(f => {
                cells[f].c.forEach(i => {
                    if (!used[i]) { queue.push(i); used[i] = 1; }
                });
            });
        }

        // generate prominences
        range.forEach((cur, d) => {
            if (d % 6 !== 0) return;
            for (const l of d3.range(i)) {
                const min = cells[cur].c.sort((a, b) => cells[a].h - cells[b].h)[0]
                //const min = cells[cur].c[d3.scan(cells[cur].c, (a, b) => cells[a].h - cells[b].h)]; // downhill cell
                cells[min].h = ~~((cells[cur].h * 2 + cells[min].h) / 3);
                cur = min;
            }
        });
    }
}

export function addTrough(count, height, rangeX, rangeY) {
    count = getNumberInRange(count);
    const power = LINE_POWER[densityInput.value];
    while (count > 0) { addOneTrough(); count--; }

    function addOneTrough() {
        const used = new Uint8Array(cells.length);
        let h = lim(getNumberInRange(height));

        // find start and end points
        let limit = 0, startX, startY, start, dist = 0, endX, endY;
        do {
            startX = getPointInRange(rangeX, graphWidth);
            startY = getPointInRange(rangeY, graphHeight);
            start = findGridCell(startX, startY);
            limit++;
        } while (cells[start].h < 20 && limit < 50)

        limit = 0;
        do {
            endX = Math.random() * graphWidth * .8 + graphWidth * .1;
            endY = Math.random() * graphHeight * .7 + graphHeight * .15;
            dist = Math.abs(endY - startY) + Math.abs(endX - startX);
            limit++;
        } while ((dist < graphWidth / 8 || dist > graphWidth / 2) && limit < 50)

        let range = getRange(start, findGridCell(endX, endY));

        // get main ridge
        function getRange(cur, end) {
            const range = [cur];
            used[cur] = 1;

            while (cur !== end) {
                let min = Infinity;
                cells[cur].c.forEach(function (e) {
                    if (used[e]) return;
                    let diff = (p[end][0] - p[e][0]) ** 2 + (p[end][1] - p[e][1]) ** 2;
                    if (Math.random() > .8) diff = diff / 2;
                    if (diff < min) { min = diff; cur = e; }
                });
                if (min === Infinity) return range;
                range.push(cur);
                used[cur] = 1;
            }

            return range;
        }

        // add height to ridge and cells around
        let queue = range.slice(), i = 0;
        while (queue.length) {
            const frontier = queue.slice();
            queue = [], i++;
            frontier.forEach(i => {
                cells[i].h = ~~lim(cells[i].h - h * (Math.random() * .3 + .85));
            });
            h = ~~(h ** power - 1);
            if (h < 2) break;
            frontier.forEach(f => {
                cells[f].c.forEach(i => {
                    if (!used[i]) { queue.push(i); used[i] = 1; }
                });
            });
        }
        // generate prominences
        range.forEach((cur, d) => {
            if (d % 6 !== 0) return;
            for (const l of d3.range(i)) {
                const min = cells[cur].c.map(x => x).sort((a,b)=> cells[a].h - cells[b].h)[0]; // downhill cell
                //debug.append("circle").attr("cx", p[min][0]).attr("cy", p[min][1]).attr("r", 1);
                cells[min].h = (cells[cur].h * 2 + cells[min].h) / 3;
                cur = min;
            }
        });

    }
}

export function addStrait(width, direction = "vertical") {
    width = Math.min(getNumberInRange(width), grid.cellsX / 3);
    if (width < 1 && P(width)) return;
    const used = new Uint8Array(cells.length);
    const vert = direction === "vertical";
    const startX = vert ? Math.floor(Math.random() * graphWidth * .4 + graphWidth * .3) : 5;
    const startY = vert ? 5 : Math.floor(Math.random() * graphHeight * .4 + graphHeight * .3);
    const endX = vert ? Math.floor((graphWidth - startX) - (graphWidth * .1) + (Math.random() * graphWidth * .2)) : graphWidth - 5;
    const endY = vert ? graphHeight - 5 : Math.floor((graphHeight - startY) - (graphHeight * .1) + (Math.random() * graphHeight * .2));

    const start = findGridCell(startX, startY), end = findGridCell(endX, endY);
    let range = getRange(start, end);
    const query = [];

    function getRange(cur, end) {
        const range = [];

        while (cur !== end) {
            let min = Infinity;
            cells[cur].c.forEach(function (e) {
                let diff = (p[end][0] - p[e][0]) ** 2 + (p[end][1] - p[e][1]) ** 2;
                if (Math.random() > 0.8) diff = diff / 2;
                if (diff < min) { min = diff; cur = e; }
            });
            range.push(cur);
        }

        return range;
    }

    const step = .1 / width;

    while (width > 0) {
        const exp = .9 - step * width;
        range.forEach(function (r) {
            cells[r].c.forEach(function (e) {
                if (used[e]) return;
                used[e] = 1;
                query.push(e);
                cells[e].h = ~~(cells[e].h ** exp);
                if (cells[e].h > 100) cells.h[e] = 5;
            });
        });
        range = query.slice();

        width--;
    }
}

export function modify(range, add, mult, power) {
    const min = range === "land"
        ? 20 : range === "all"
            ? 0 : +range.split("-")[0];
    const max = range === "land" || range === "all"
        ? 100 : +range.split("-")[1];

    grid.cells.map(x => x.h).map(
        h => h >= min && h <= max ? mod(h) : h
    );

    function mod(v) {
        if (add)
            v = min === 20
                ? Math.max(v + add, 20) : v + add;
        if (mult !== 1)
            v = min === 20
                ? ~~((v - 20) * mult + 20) : ~~(v * mult);
        if (power)
            v = min === 20
                ? ~~((v - 20) ** power + 20) : ~~(v ** power);
        return lim(v);
    }
}

export function smooth(fr = 2, add = 0) {
    cells.map((x, i) => {
        const a = [~~x.h];
        cells[i].c.forEach(c => a.push(~~cells[c].h));
        return ~~lim((x.h * (fr - 1) + d3.mean(a) + add) / fr);
    }).forEach((x, i) => {
        cells[i].h = ~~x;
    });
}

function getPointInRange(range, length) {
    if (typeof range !== "string") {
        console.error("Range should be a string");
        return;
    }
    const min = range.split("-")[0] / 100 || 0;
    const max = range.split("-")[1] / 100 || 100;
    return rand(min * length, max * length);
}

