import {
    graphWidth, graphHeight,
    view,
    options
} from "../main.js";
import { rand } from "../modules/utils.js";

// simplest precipitation model
export function generatePrecipitation({ cells, cellsX, cellsY, points }) {
    console.time('generatePrecipitation');
    view.prec.selectAll("*").remove();
    cells.prec = new Uint8Array(cells.length); // precipitation array
    const modifier = precInput.value / 100; // user's input
    let westerly = [], easterly = [], southerly = 0, northerly = 0;

    {// latitude bands
        // x4 = 0-5 latitude: wet through the year (rising zone)
        // x2 = 5-20 latitude: wet summer (rising zone), dry winter (sinking zone)
        // x1 = 20-30 latitude: dry all year (sinking zone)
        // x2 = 30-50 latitude: wet winter (rising zone), dry summer (sinking zone)
        // x3 = 50-60 latitude: wet all year (rising zone)
        // x2 = 60-70 latitude: wet summer (rising zone), dry winter (sinking zone)
        // x1 = 70-90 latitude: dry all year (sinking zone)
    }
    const lalitudeModifier = [4, 2, 2, 2, 1, 1, 2, 2, 2, 2, 3, 3, 2, 2, 1, 1, 1, 0.5]; // by 5d step

    // difine wind directions based on cells latitude and prevailing winds there
    d3.range(0, cells.length, cellsX).forEach(function (c, i) {
        const lat = mapCoordinates.latN - i / cellsY * mapCoordinates.latT;
        const band = (Math.abs(lat) - 1) / 5 | 0;
        const latMod = lalitudeModifier[band];
        const tier = Math.abs(lat - 89) / 30 | 0; // 30d tiers from 0 to 5 from N to S
        if (options.winds[tier] > 40 && options.winds[tier] < 140) westerly.push([c, latMod, tier]);
        else if (options.winds[tier] > 220 && options.winds[tier] < 320) easterly.push([c + cellsX - 1, latMod, tier]);
        if (options.winds[tier] > 100 && options.winds[tier] < 260) northerly++;
        else if (options.winds[tier] > 280 || options.winds[tier] < 80) southerly++;
    });

    // distribute winds by direction
    if (westerly.length) passWind(westerly, 120 * modifier, 1, cellsX);
    if (easterly.length) passWind(easterly, 120 * modifier, -1, cellsX);
    const vertT = (southerly + northerly);
    if (northerly) {
        const bandN = (Math.abs(mapCoordinates.latN) - 1) / 5 | 0;
        const latModN = mapCoordinates.latT > 60 ? d3.mean(lalitudeModifier) : lalitudeModifier[bandN];
        const maxPrecN = northerly / vertT * 60 * modifier * latModN;
        passWind(d3.range(0, cellsX, 1), maxPrecN, cellsX, cellsY);
    }
    if (southerly) {
        const bandS = (Math.abs(mapCoordinates.latS) - 1) / 5 | 0;
        const latModS = mapCoordinates.latT > 60 ? d3.mean(lalitudeModifier) : lalitudeModifier[bandS];
        const maxPrecS = southerly / vertT * 60 * modifier * latModS;
        passWind(d3.range(cells.length - cellsX, cells.length, 1), maxPrecS, -cellsX, cellsY);
    }

    function passWind(source, maxPrec, next, steps) {
        const maxPrecInit = maxPrec;
        for (let first of source) {
            if (first[0]) { maxPrec = Math.min(maxPrecInit * first[1], 255); first = first[0]; }
            let humidity = maxPrec - cells.h[first]; // initial water amount
            if (humidity <= 0) continue; // if first cell in row is too elevated cosdired wind dry
            for (let s = 0, current = first; s < steps; s++ , current += next) {
                // no flux on permafrost
                if (cells.temp[current] < -5) continue;
                // water cell
                if (cells.h[current] < 20) {
                    if (cells.h[current + next] >= 20) {
                        cells.prec[current + next] += Math.max(humidity / rand(10, 20), 1); // coastal precipitation
                    } else {
                        humidity = Math.min(humidity + 5 * modifier, maxPrec); // wind gets more humidity passing water cell
                        cells.prec[current] += 5 * modifier; // water cells precipitation (need to correctly pour water through lakes)
                    }
                    continue;
                }

                // land cell
                const precipitation = getPrecipitation(humidity, current, next);
                cells.prec[current] += precipitation;
                const evaporation = precipitation > 1.5 ? 1 : 0; // some humidity evaporates back to the atmosphere
                humidity = Math.min(Math.max(humidity - precipitation + evaporation, 0), maxPrec);
            }
        }
    }

    function getPrecipitation(humidity, i, n) {
        if (cells.h[i + n] > 85) return humidity; // 85 is max passable height
        const normalLoss = Math.max(humidity / (10 * modifier), 1); // precipitation in normal conditions
        const diff = Math.max(cells.h[i + n] - cells.h[i], 0); // difference in height
        const mod = (cells.h[i + n] / 70) ** 2; // 50 stands for hills, 70 for mountains
        return Math.min(Math.max(normalLoss + diff * mod, 1), humidity);
    }

    void function drawWindDirection() {
        const wind = view.prec.append("g").attr("id", "wind");

        d3.range(0, 6).forEach(function (t) {
            if (westerly.length > 1) {
                const west = westerly.filter(w => w[2] === t);
                if (west && west.length > 3) {
                    const from = west[0][0], to = west[west.length - 1][0];
                    const y = (points[from][1] + points[to][1]) / 2;
                    wind.append("text").attr("x", 20).attr("y", y).text("\u21C9");
                }
            }
            if (easterly.length > 1) {
                const east = easterly.filter(w => w[2] === t);
                if (east && east.length > 3) {
                    const from = east[0][0], to = east[east.length - 1][0];
                    const y = (points[from][1] + points[to][1]) / 2;
                    wind.append("text").attr("x", graphWidth - 52).attr("y", y).text("\u21C7");
                }
            }
        });

        if (northerly) wind.append("text").attr("x", graphWidth / 2).attr("y", 42).text("\u21CA");
        if (southerly) wind.append("text").attr("x", graphWidth / 2).attr("y", graphHeight - 20).text("\u21C8");
    }();

    console.timeEnd('generatePrecipitation');
}

