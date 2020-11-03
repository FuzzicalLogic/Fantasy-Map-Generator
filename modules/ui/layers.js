"use strict";
import {
    svg, svgWidth, svgHeight, graphWidth, graphHeight, view,
    seed, pack,
    grid,
    biomesData,
    statesBody,
    stateBorders, provinceBorders,
    statesHalo,
    scale,
    lineGen, invokeActiveZooming, zoom,
    mapCoordinates, customization
} from "../../main.js";

import { ReliefIcons } from "../relief-icons.js";
import * as ThreeD from "./3d.js";
import { editUnits } from "./units-editor.js";

import { tip } from "./general.js";
import { getGridPolygon, getPackPolygon, convertTemperature, P, rn, isCtrlClick, getDefaultTexture, clipPoly, normalize, round, last, rand } from "../utils.js";
import { editStyle, calculateFriendlyGridSize, shiftCompass, setBase64Texture } from "./style.js";

let presets = {}; // global object

export function initialize() {
    restoreLayers(); // run on-load
    restoreCustomPresets(); // run on-load

    $("#mapLayers").sortable({ items: "li:not(.solid)", containment: "parent", cancel: ".solid", update: moveLayer });

    window.changePreset = changePreset;
    window.savePreset = savePreset;
    window.removePreset = removePreset;
    window.toggleHeight = toggleHeight;
    window.drawHeightmap = drawHeightmap;
    window.toggleTemp = toggleTemp;
    window.toggleBiomes = toggleBiomes;
    window.togglePrec = togglePrec;
    window.togglePopulation = togglePopulation;
    window.toggleCells = toggleCells;
    window.toggleIce = toggleIce;
    window.toggleCultures = toggleCultures;
    window.toggleReligions = toggleReligions;
    window.toggleStates = toggleStates;
    window.toggleBorders = toggleBorders;
    window.toggleProvinces = toggleProvinces;
    window.toggleGrid = toggleGrid;
    window.toggleCoordinates = toggleCoordinates;
    window.toggleCompass = toggleCompass;
    window.toggleRelief = toggleRelief;
    window.toggleTexture = toggleTexture;
    window.toggleRivers = toggleRivers;
    window.toggleRoutes = toggleRoutes;
    window.toggleMilitary = toggleMilitary;
    window.toggleMarkers = toggleMarkers;
    window.toggleLabels = toggleLabels;
    window.toggleIcons = toggleIcons;
    window.toggleRulers = toggleRulers;
    window.toggleScaleBar = toggleScaleBar;
    window.toggleZones = toggleZones;

}

// define connection between option layer buttons and actual svg groups to move the element
function getLayer(id) {
    if (id === "toggleHeight") return $("#terrs");
    if (id === "toggleBiomes") return $("#biomes");
    if (id === "toggleCells") return $("#cells");
    if (id === "toggleGrid") return $("#gridOverlay");
    if (id === "toggleCoordinates") return $("#coordinates");
    if (id === "toggleCompass") return $("#compass");
    if (id === "toggleRivers") return $("#rivers");
    if (id === "toggleRelief") return $("#terrain");
    if (id === "toggleCultures") return $("#cults");
    if (id === "toggleStates") return $("#regions");
    if (id === "toggleProvinces") return $("#provs");
    if (id === "toggleBorders") return $("#borders");
    if (id === "toggleRoutes") return $("#routes");
    if (id === "toggleTemp") return $("#temperature");
    if (id === "togglePrec") return $("#prec");
    if (id === "togglePopulation") return $("#population");
    if (id === "toggleIce") return $("#ice");
    if (id === "toggleTexture") return $("#texture");
    if (id === "toggleLabels") return $("#labels");
    if (id === "toggleIcons") return $("#icons");
    if (id === "toggleMarkers") return $("#markers");
    if (id === "toggleRulers") return $("#ruler");
}

// on map regeneration restore layers if they was turned on
export function restoreLayers() {
    if (layerIsOn("toggleHeight")) drawHeightmap();
    if (layerIsOn("toggleCells")) drawCells();
    if (layerIsOn("toggleGrid")) drawGrid();
    if (layerIsOn("toggleCoordinates")) drawCoordinates();
    if (layerIsOn("toggleCompass")) view.compass.style("display", "block");
    if (layerIsOn("toggleTemp")) drawTemp();
    if (layerIsOn("togglePrec")) drawPrec();
    if (layerIsOn("togglePopulation")) drawPopulation();
    if (layerIsOn("toggleBiomes")) drawBiomes();
    if (layerIsOn("toggleRelief")) ReliefIcons();
    if (layerIsOn("toggleCultures")) drawCultures();
    if (layerIsOn("toggleProvinces")) drawProvinces();
    if (layerIsOn("toggleReligions")) drawReligions();
    if (layerIsOn("toggleIce")) drawIce();

    // states are getting rendered each time, if it's not required than layers should be hidden
    if (!layerIsOn("toggleBorders")) $('#borders').fadeOut();
    if (!layerIsOn("toggleStates")) view.regions.style("display", "none").selectAll("path").remove();
}

export function layerIsOn(el) {
    const buttonoff = document.getElementById(el).classList.contains("buttonoff");
    return !buttonoff;
}

// move layers on mapLayers dragging (jquery sortable)
function moveLayer(event, ui) {
    const el = getLayer(ui.item.attr("id"));
    if (!el) return;
    const prev = getLayer(ui.item.prev().attr("id"));
    const next = getLayer(ui.item.next().attr("id"));
    if (prev) el.insertAfter(prev);
    else if (next) el.insertBefore(next);
}

function getDefaultPresets() {
    return {
        "political": ["toggleBorders", "toggleIcons", "toggleIce", "toggleLabels", "toggleRivers", "toggleRoutes", "toggleScaleBar", "toggleStates"],
        "cultural": ["toggleBorders", "toggleCultures", "toggleIcons", "toggleLabels", "toggleRivers", "toggleRoutes", "toggleScaleBar"],
        "religions": ["toggleBorders", "toggleIcons", "toggleLabels", "toggleReligions", "toggleRivers", "toggleRoutes", "toggleScaleBar"],
        "provinces": ["toggleBorders", "toggleIcons", "toggleProvinces", "toggleRivers", "toggleScaleBar"],
        "biomes": ["toggleBiomes", "toggleIce", "toggleRivers", "toggleScaleBar"],
        "heightmap": ["toggleHeight", "toggleRivers"],
        "physical": ["toggleCoordinates", "toggleHeight", "toggleIce", "toggleRivers", "toggleScaleBar"],
        "poi": ["toggleBorders", "toggleHeight", "toggleIce", "toggleIcons", "toggleMarkers", "toggleRivers", "toggleRoutes", "toggleScaleBar"],
        "military": ["toggleBorders", "toggleIcons", "toggleLabels", "toggleMilitary", "toggleRivers", "toggleRoutes", "toggleScaleBar", "toggleStates"],
        "landmass": ["toggleScaleBar"]
    }
}

function restoreCustomPresets() {
    presets = getDefaultPresets();
    const storedPresets = JSON.parse(localStorage.getItem("presets"));
    if (!storedPresets) return;

    for (const preset in storedPresets) {
        if (presets[preset]) continue;
        layersPreset.add(new Option(preset, preset));
    }

    presets = storedPresets;
}

export function applyPreset() {
    const selected = localStorage.getItem("preset");
    if (selected) changePreset(selected);
}

// toggle layers on preset change
function changePreset(preset) {
    const layers = presets[preset]; // layers to be turned on
    document.getElementById("mapLayers").querySelectorAll("li").forEach(function (e) {
        if (layers.includes(e.id) && !layerIsOn(e.id)) e.click(); // turn on
        else if (!layers.includes(e.id) && layerIsOn(e.id)) e.click(); // turn off
    });
    layersPreset.value = preset;
    localStorage.setItem("preset", preset);

    const isDefault = getDefaultPresets()[preset];
    removePresetButton.style.display = isDefault ? "none" : "inline-block";
    savePresetButton.style.display = "none";
    if (document.getElementById("canvas3d")) setTimeout(ThreeD.update(), 400);
}

function savePreset() {
    prompt("Please provide a preset name", { default: "" }, name => {
        presets[name] = Array.from(document.getElementById("mapLayers").querySelectorAll("li:not(.buttonoff)")).map(node => node.id).sort();
        layersPreset.add(new Option(name, name, false, true));
        localStorage.setItem("presets", JSON.stringify(presets));
        localStorage.setItem("preset", name);
        removePresetButton.style.display = "inline-block";
        savePresetButton.style.display = "none";
    });
}

function removePreset() {
    const preset = layersPreset.value;
    delete presets[preset];
    const index = Array.from(layersPreset.options).findIndex(o => o.value === preset);
    layersPreset.options.remove(index);
    layersPreset.value = "custom";
    removePresetButton.style.display = "none";
    savePresetButton.style.display = "inline-block";

    localStorage.setItem("presets", JSON.stringify(presets));
    localStorage.removeItem("preset");
}

export function getCurrentPreset() {
    const layers = Array.from(document.getElementById("mapLayers").querySelectorAll("li:not(.buttonoff)")).map(node => node.id).sort();
    const defaultPresets = getDefaultPresets();

    for (const preset in presets) {
        if (JSON.stringify(presets[preset]) !== JSON.stringify(layers)) continue;
        layersPreset.value = preset;
        removePresetButton.style.display = defaultPresets[preset] ? "none" : "inline-block";
        savePresetButton.style.display = "none";
        return;
    }

    layersPreset.value = "custom";
    removePresetButton.style.display = "none";
    savePresetButton.style.display = "inline-block";
}

export function getColor(value, scheme = getColorScheme()) {
    return scheme(1 - (value < 20 ? value - 5 : value) / 100);
}

export function getColorScheme() {
    const interpolations = {
        bright: d3.interpolateSpectral,
        light: d3.interpolateRdYlGn,
        green: d3.interpolateGreens,
        monochrome: d3.interpolateGreys
    };
    let scheme = interpolations[view.terrs.attr("scheme")];
    return d3.scaleSequential(scheme || d3.interpolateSpectral);
}

export function drawHeightmap() {
    console.time("drawHeightmap");
    let { terrs } = view;
    terrs.selectAll("*").remove();
    const { cells, vertices } = pack,
        n = cells.length;
    const used = new Uint8Array(n);
    const paths = new Array(101).fill("");

    const scheme = getColorScheme();
    const terracing = terrs.attr("terracing") / 10; // add additional shifted darker layer for pseudo-3d effect
    const skip = +terrs.attr("skip") + 1;
    const simplification = +terrs.attr("relax");
    switch (+terrs.attr("curve")) {
        case 0: lineGen.curve(d3.curveBasisClosed); break;
        case 1: lineGen.curve(d3.curveLinear); break;
        case 2: lineGen.curve(d3.curveStep); break;
        default: lineGen.curve(d3.curveBasisClosed);
    }

    let currentLayer = 20;
    let layers = [];
    for (let x = currentLayer; x < 101; x += skip) 
        layers.push(x);
    
    const heights = cells.map((x, i) => ({ ...x, h: ~~(x.h), i: i }))
        .filter(({ h }) => h >= 20 && h <= 100 && layers.includes(h))
        .sort(({ h: h1 }, { h: h2 }) => h1 - h2)

    for (const { i, h, c, v } of heights) {
        if (used[i]) 
            continue; // already marked
        const onborder = c.some(n => cells[n].h < h);
        if (!onborder)
            continue;
        const vertex = v.find(v => vertices.c[v].some(i => cells[i].h < h));
        
        const chain = connectVertices(vertex, h);
        if (chain.length < 3)
            continue;
        const points = simplifyLine(chain).map(v => vertices.p[v]);
        paths[h] += round(lineGen(points));
    }

    terrs.append("rect").attr("x", 0).attr("y", 0).attr("width", "100%").attr("height", "100%").attr("fill", scheme(.8)); // draw base layer
    for (const i of d3.range(20, 101)) {
        if (paths[i].length < 10)
            continue;
        const color = getColor(i, scheme);
        if (terracing)
            terrs.append("path").attr("d", paths[i]).attr("transform", "translate(.7,1.4)").attr("fill", d3.color(color).darker(terracing)).attr("data-height", i);
        terrs.append("path").attr("d", paths[i]).attr("fill", color).attr("data-height", i);
    }

    // connect vertices to chain
    function connectVertices(start, h) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => ~~(cells[c].h) === h)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].h < h;
            const c1 = c[1] >= n || cells[c[1]].h < h;
            const c2 = c[2] >= n || cells[c[2]].h < h;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1)
                current = v[0];
            else if (v[1] !== prev && c1 !== c2)
                current = v[1];
            else if (v[2] !== prev && c0 !== c2)
                current = v[2];
            if (current === chain[chain.length - 1]) {
                console.error("Next vertex is not found");
                break;
            }
        }
        return chain;
    }

    function simplifyLine(chain) {
        if (!simplification) return chain;
        const n = simplification + 1; // filter each nth element
        return chain.filter((d, i) => i % n === 0);
    }

    console.timeEnd("drawHeightmap");
}

export function drawTemp() {
    let { temperature } = view;

    console.time("drawTemp");
    temperature.selectAll("*").remove();
    lineGen.curve(d3.curveBasisClosed);
    const scheme = d3.scaleSequential(d3.interpolateSpectral);
    const tMax = +temperatureEquatorOutput.max, tMin = +temperatureEquatorOutput.min, delta = tMax - tMin;

    const { cells, vertices } = grid, n = cells.length;
    const used = new Uint8Array(n); // to detect already passed cells
    const min = d3.min(cells.temp),
        max = d3.max(cells.temp);
    const step = Math.max(Math.round(Math.abs(min - max) / 5), 1);
    const isolines = d3.range(min + step, max, step);
    const chains = [], labels = []; // store label coordinates

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        const t = cells.temp[i];
        if (used[i] || !isolines.includes(t)) continue;
        const start = findStart(i, t);
        if (!start) continue;
        used[i] = 1;
        //debug.append("circle").attr("r", 3).attr("cx", vertices.p[start][0]).attr("cy", vertices.p[start][1]).attr("fill", "red").attr("stroke", "black").attr("stroke-width", .3);

        const chain = connectVertices(start, t); // vertices chain to form a path
        const relaxed = chain.filter((v, i) => i % 4 === 0 || vertices.c[v].some(c => c >= n));
        if (relaxed.length < 6) continue;
        const points = relaxed.map(v => vertices.p[v]);
        chains.push([t, points]);
        addLabel(points, t);
    }

    // min temp isoline covers all map
    temperature.append("path").attr("d", `M0,0 h${svgWidth} v${svgHeight} h${-svgWidth} Z`).attr("fill", scheme(1 - (min - tMin) / delta)).attr("stroke", "none");

    for (const t of isolines) {
        const path = chains.filter(c => c[0] === t).map(c => round(lineGen(c[1]))).join("");
        if (!path) continue;
        const fill = scheme(1 - (t - tMin) / delta), stroke = d3.color(fill).darker(.2);
        temperature.append("path").attr("d", path).attr("fill", fill).attr("stroke", stroke);
    }

    const tempLabels = temperature.append("g").attr("id", "tempLabels").attr("fill-opacity", 1);
    tempLabels.selectAll("text").data(labels).enter().append("text").attr("x", d => d[0]).attr("y", d => d[1]).text(d => convertTemperature(d[2]));

    // find cell with temp < isotherm and find vertex to start path detection
    function findStart(i, t) {
        if (cells[i].b) return cells[i].v.find(v => vertices.c[v].some(c => c >= n)); // map border cell
        return cells[i].v[cells[i].c.findIndex(c => cells.temp[c] < t || !cells.temp[c])];
    }

    function addLabel(points, t) {
        const c = svgWidth / 2; // map center x coordinate
        // add label on isoline top center
        const tc = points[d3.scan(points, (a, b) => (a[1] - b[1]) + (Math.abs(a[0] - c) - Math.abs(b[0] - c)) / 2)];
        pushLabel(tc[0], tc[1], t);

        // add label on isoline bottom center
        if (points.length > 20) {
            const bc = points[d3.scan(points, (a, b) => (b[1] - a[1]) + (Math.abs(a[0] - c) - Math.abs(b[0] - c)) / 2)];
            const dist2 = (tc[1] - bc[1]) ** 2 + (tc[0] - bc[0]) ** 2; // square distance between this and top point
            if (dist2 > 100) pushLabel(bc[0], bc[1], t);
        }
    }

    function pushLabel(x, y, t) {
        if (x < 20 || x > svgWidth - 20) return;
        if (y < 20 || y > svgHeight - 20) return;
        labels.push([x, y, t]);
    }

    // connect vertices to chain
    function connectVertices(start, t) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => cells.temp[c] === t).forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells.temp[c[0]] < t;
            const c1 = c[1] >= n || cells.temp[c[1]] < t;
            const c2 = c[2] >= n || cells.temp[c[2]] < t;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) current = v[0];
            else if (v[1] !== prev && c1 !== c2) current = v[1];
            else if (v[2] !== prev && c0 !== c2) current = v[2];
            if (current === chain[chain.length - 1]) {
                console.error("Next vertex is not found");
                break;
            }
        }
        chain.push(start);
        return chain;
    }
    console.timeEnd("drawTemp");
}

export function drawBiomes() {
    let { biomes } = view;
    biomes.selectAll("path").remove();
    const { cells, vertices } = pack, n = cells.length;
    const used = new Uint8Array(n);
    const paths = new Array(biomesData.i.length).fill("");

    const xs = cells.map((v, k) => k)
    for (const i of xs) {
        if (!cells[i].biome) continue; // no need to mark marine biome (liquid water)
        if (used[i]) continue; // already marked
        const b = cells[i].biome;
        const onborder = cells[i].c.some(n => cells[n].biome !== b);
        if (!onborder) continue;
        const edgeVerticle = cells[i].v.find(v => vertices.c[v].some(i => cells[i].biome !== b));
        const chain = connectVertices(edgeVerticle, b);
        if (chain.length < 3) continue;
        const points = clipPoly(chain.map(v => vertices.p[v]), 1);
        paths[b] += "M" + points.join("L") + "Z";
    }

    paths.forEach(function (d, i) {
        if (d.length < 10) return;
        biomes.append("path").attr("d", d).attr("fill", biomesData.color[i]).attr("stroke", biomesData.color[i]).attr("id", "biome" + i);
    });

    // connect vertices to chain
    function connectVertices(start, b) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => cells[c].biome === b).forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].biome !== b;
            const c1 = c[1] >= n || cells[c[1]].biome !== b;
            const c2 = c[2] >= n || cells[c[2]].biome !== b;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) current = v[0];
            else if (v[1] !== prev && c1 !== c2) current = v[1];
            else if (v[2] !== prev && c0 !== c2) current = v[2];
            if (current === chain[chain.length - 1]) { console.error("Next vertex is not found"); break; }
        }
        return chain;
    }
}

export function drawPrec() {
    let { prec } = view;

    prec.selectAll("circle").remove();
    const cells = grid.cells, p = grid.points;
    prec.style("display", "block");
    const show = d3.transition().duration(800).ease(d3.easeSinIn);
    prec.selectAll("text").attr("opacity", 0).transition(show).attr("opacity", 1);

    const data = cells.map((v,k)=>k).filter(i => cells.h[i] >= 20 && cells.prec[i]);
    prec.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => p[d][0]).attr("cy", d => p[d][1]).attr("r", 0)
        .transition(show).attr("r", d => rn(Math.max(Math.sqrt(cells.prec[d] * .5), .8), 2));
}

export function drawPopulation(event) {
    let { population } = view;
    population.selectAll("line").remove();
    const cells = pack.cells, p = cells.p, burgs = pack.burgs;
    const show = d3.transition().duration(2000).ease(d3.easeSinIn);

    const rural = cells.map((x, i) => ({ i: i, pop: x.pop }))
        .map(x => [p[x.i][0], p[x.i][1], p[x.i][1] - x.pop / 8]);
    population.select("#rural").selectAll("line").data(rural).enter().append("line")
        .attr("x1", d => d[0]).attr("y1", d => d[1])
        .attr("x2", d => d[0]).attr("y2", d => d[1])
        .transition(show).attr("y2", d => d[2]);

    const urban = burgs.filter(b => b.i && !b.removed)
        .map(b => [b.x, b.y, b.y - b.population / 8 * urbanization.value]);
    population.select("#urban").selectAll("line").data(urban).enter().append("line")
        .attr("x1", d => d[0]).attr("y1", d => d[1])
        .attr("x2", d => d[0]).attr("y2", d => d[1])
        .transition(show).delay(500).attr("y2", d => d[2]);
}

function drawCells() {
    view.cells.selectAll("path").remove();
    const data = customization === 1 ? grid.cells.i : pack.cells.map((v, k) => k);
    const polygon = customization === 1 ? getGridPolygon : getPackPolygon;
    let path = "";
    data.forEach(i => path += "M" + polygon(i));
    view.cells.append("path").attr("d", path);
}

export function drawIce() {
    const cells = grid.cells, vertices = grid.vertices,
        n = cells.length, temp = cells.temp, h = cells.h;
    const used = new Uint8Array(cells.length);
    Math.seedrandom(seed);

    const shieldMin = -6; // max temp to form ice shield (glacier)
    const icebergMax = 2; // max temp to form an iceberg

    let { ice } = view;
    const xs = grid.cells.map((v, k) => k);
    for (const i of xs) {
        const t = temp[i];
        if (t > icebergMax) continue; // too warm: no ice
        if (t > shieldMin && h[i] >= 20) continue; // non-glacier land: no ice

        if (t <= shieldMin) {
            // very cold: ice shield
            if (used[i]) continue; // already rendered
            const onborder = cells[i].c.some(n => temp[n] > shieldMin);
            if (!onborder) continue; // need to start from onborder cell
            const vertex = cells[i].v.find(v => vertices.c[v].some(i => temp[i] > shieldMin));
            const chain = connectVertices(vertex);
            if (chain.length < 3) continue;
            const points = clipPoly(chain.map(v => vertices.p[v]));
            ice.append("polygon").attr("points", points).attr("type", "iceShield");
            continue;
        }

        // mildly cold: iceberd
        if (P(normalize(t, -7, 2.5))) continue; // t[-5; 2] cold: skip some cells
        if (grid.features[cells.f[i]].type === "lake") continue; // lake: no icebers
        let size = (6.5 + t) / 10; // iceberg size: 0 = full size, 1 = zero size
        if (cells.t[i] === -1) size *= 1.3; // coasline: smaller icebers
        size = Math.min(size * (.4 + rand() * 1.2), .95); // randomize iceberd size
        resizePolygon(i, size);
    }

    function resizePolygon(i, s) {
        const c = grid.points[i];
        const points = getGridPolygon(i).map(p => [(p[0] + (c[0] - p[0]) * s) | 0, (p[1] + (c[1] - p[1]) * s) | 0]);
        ice.append("polygon").attr("points", points).attr("cell", i).attr("size", rn(1 - s, 2));
    }

    // connect vertices to chain
    function connectVertices(start) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = last(chain); // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => temp[c] <= shieldMin).forEach(c => used[c] = 1);
            const c0 = c[0] >= n || temp[c[0]] > shieldMin;
            const c1 = c[1] >= n || temp[c[1]] > shieldMin;
            const c2 = c[2] >= n || temp[c[2]] > shieldMin;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) current = v[0];
            else if (v[1] !== prev && c1 !== c2) current = v[1];
            else if (v[2] !== prev && c0 !== c2) current = v[2];
            if (current === chain[chain.length - 1]) { console.error("Next vertex is not found"); break; }
        }
        return chain;
    }
}

export function drawCultures() {
    let { cults } = view;
    console.time("drawCultures");

    cults.selectAll("path").remove();
    const { cells, vertices, cultures } = pack,
        n = cells.length;
    const used = new Uint8Array(n);
    const paths = new Array(cultures.length).fill("");

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (!cells[i].culture) continue;
        if (used[i]) continue;
        used[i] = 1;
        const c = cells[i].culture;
        const onborder = cells[i].c.some(n => cells[n].culture !== c);
        if (!onborder) continue;
        const vertex = cells[i].v.find(v => vertices.c[v].some(i => cells[i].culture !== c));
        const chain = connectVertices(vertex, c);
        if (chain.length < 3) continue;
        const points = chain.map(v => vertices.p[v]);
        paths[c] += "M" + points.join("L") + "Z";
    }

    const data = paths.map((p, i) => [p, i]).filter(d => d[0].length > 10);
    cults.selectAll("path").data(data).enter().append("path").attr("d", d => d[0]).attr("fill", d => cultures[d[1]].color).attr("id", d => "culture" + d[1]);

    // connect vertices to chain
    function connectVertices(start, t) {
        const chain = []; // vertices chain to form a path
        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1]; // previous vertex in chain
            chain.push(current); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => cells[c] && cells[c].culture === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].culture !== t;
            const c1 = c[1] >= n || cells[c[1]].culture !== t;
            const c2 = c[2] >= n || cells[c[2]].culture !== t;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1)
                current = v[0];
            else if (v[1] !== prev && c1 !== c2)
                current = v[1];
            else if (v[2] !== prev && c0 !== c2)
                current = v[2];
            if (current === chain[chain.length - 1]) {
                console.error("Next vertex is not found");
                break;
            }
        }
        return chain;
    }
    console.timeEnd("drawCultures");
}

export function drawReligions() {
    let { relig } = view;
    console.time("drawReligions");

    relig.selectAll("path").remove();
    const { cells, vertices, religions, features } = pack, n = cells.length;
    const used = new Uint8Array(n);
    const vArray = new Array(religions.length); // store vertices array
    const body = new Array(religions.length).fill(""); // store path around each religion
    const gap = new Array(religions.length).fill(""); // store path along water for each religion to fill the gaps

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (!cells[i].religion)
            continue;
        if (used[i])
            continue;
        used[i] = 1;
        const r = cells[i].religion;
        const onborder = cells[i].c.filter(n => cells[n].religion !== r);
        if (!onborder.length)
            continue;
        const borderWith = cells[i].c.map(c => cells[c].religion).find(n => n !== r);
        const vertex = cells[i].v.find(v => vertices.c[v].some(i => cells[i].religion === borderWith));
        const chain = connectVertices(vertex, r, borderWith);
        if (chain.length < 3)
            continue;
        const points = chain.map(v => vertices.p[v[0]]);
        if (!vArray[r]) vArray[r] = [];
        vArray[r].push(points);
        body[r] += "M" + points.join("L");
        gap[r] += "M" + vertices.p[chain[0][0]] + chain.reduce((r2, v, i, d) => !i ? r2 : !v[2] ? r2 + "L" + vertices.p[v[0]] : d[i + 1] && !d[i + 1][2] ? r2 + "M" + vertices.p[v[0]] : r2, "");
    }

    const bodyData = body.map((p, i) => [p.length > 10 ? p : null, i, religions[i].color])
        .filter(d => d[0]);
    relig.selectAll("path").data(bodyData).enter().append("path")
        .attr("d", d => d[0])
        .attr("fill", d => d[2])
        .attr("stroke", "none")
        .attr("id", d => "religion" + d[1]);
    const gapData = gap.map((p, i) => [p.length > 10 ? p : null, i, religions[i].color])
        .filter(d => d[0]);
    relig.selectAll(".path").data(gapData).enter().append("path").attr("d", d => d[0]).attr("fill", "none").attr("stroke", d => d[2]).attr("id", d => "religion-gap" + d[1]).attr("stroke-width", "10px");

    // connect vertices to chain
    function connectVertices(start, t, religion) {
        const chain = []; // vertices chain to form a path
        let land = vertices.c[start].some(c =>
            cells[c].h >= 20 && cells[c].religion !== t);
        function check(i) {
            religion = cells[i].religion;
            land = cells[i].h >= 20;
        }

        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1] ? chain[chain.length - 1][0] : -1; // previous vertex in chain
            chain.push([current, religion, land]); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => cells[c].religion === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].religion !== t;
            const c1 = c[1] >= n || cells[c[1]].religion !== t;
            const c2 = c[2] >= n || cells[c[2]].religion !== t;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) {
                current = v[0];
                check(c0 ? c[0] : c[1]);
            }
            else if (v[1] !== prev && c1 !== c2) {
                current = v[1];
                check(c1 ? c[1] : c[2]);
            }
            else if (v[2] !== prev && c0 !== c2) {
                current = v[2];
                check(c2 ? c[2] : c[0]);
            }
            if (current === chain[chain.length - 1][0]) {
                console.error("Next vertex is not found");
                break;
            }

        }
        return chain;
    }
    console.timeEnd("drawReligions");
}

// draw states
export function drawStates() {
    let { regions } = view;
    console.time("drawStates");
    regions.selectAll("path").remove();

    const { cells, vertices, states } = pack,
        n = cells.length;
    const used = new Uint8Array(cells.length);
    const vArray = new Array(states.length); // store vertices array
    const body = new Array(states.length).fill(""); // store path around each state
    const gap = new Array(states.length).fill(""); // store path along water for each state to fill the gaps

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (!cells[i].state || used[i])
            continue;
        const s = cells[i].state;
        const onborder = cells[i].c.some(n => cells[n].state !== s);
        if (!onborder)
            continue;

        const borderWith = cells[i].c.map(c => cells[c].state).find(n => n !== s);
        const vertex = cells[i].v.find(v => vertices.c[v].some(i => !!cells[i] && cells[i].state === borderWith));
        const chain = connectVertices(vertex, s, borderWith);
        if (chain.length < 3)
            continue;
        const points = chain.map(v => vertices.p[v[0]]);
        if (!vArray[s])
            vArray[s] = [];
        vArray[s].push(points);
        body[s] += "M" + points.join("L");
        gap[s] += "M" + vertices.p[chain[0][0]] + chain.reduce((r, v, i, d) => !i ? r : !v[2] ? r + "L" + vertices.p[v[0]] : d[i + 1] && !d[i + 1][2] ? r + "M" + vertices.p[v[0]] : r, "");
    }

    // find state visual center
    vArray.forEach((ar, i) => {
        const sorted = ar.sort((a, b) => b.length - a.length); // sort by points number
        states[i].pole = polylabel(sorted, 1.0); // pole of inaccessibility
    });

    const bodyData = body.map((p, i) => [p.length > 10 ? p : null, i, states[i].color]).filter(d => d[0]);
    statesBody.selectAll("path").data(bodyData).enter().append("path").attr("d", d => d[0]).attr("fill", d => d[2]).attr("stroke", "none").attr("id", d => "state" + d[1]);
    const gapData = gap.map((p, i) => [p.length > 10 ? p : null, i, states[i].color]).filter(d => d[0]);
    statesBody.selectAll(".path").data(gapData).enter().append("path").attr("d", d => d[0]).attr("fill", "none").attr("stroke", d => d[2]).attr("id", d => "state-gap" + d[1]);

    view.defs.select("#statePaths").selectAll("clipPath").remove();
    view.defs.select("#statePaths").selectAll("clipPath").data(bodyData).enter().append("clipPath").attr("id", d => "state-clip" + d[1]).append("use").attr("href", d => "#state" + d[1]);
    statesHalo.selectAll(".path").data(bodyData).enter().append("path")
        .attr("d", d => d[0]).attr("stroke", d => d3.color(d[2]) ? d3.color(d[2]).darker().hex() : "#666666")
        .attr("id", d => "state-border" + d[1]).attr("clip-path", d => "url(#state-clip" + d[1] + ")");

    // connect vertices to chain
    function connectVertices(start, t, state) {
        const chain = []; // vertices chain to form a path
        let land = vertices.c[start].some(c => cells[c] && cells[c].h >= 20 && cells[c].state !== t);
        function check(i) {
            state = cells[i].state;
            land = cells[i].h >= 20;
        }

        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1]
                ? chain[chain.length - 1][0]
                : -1; // previous vertex in chain
            chain.push([current, state, land]); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => cells[c] && cells[c].state === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].state !== t;
            const c1 = c[1] >= n || cells[c[1]].state !== t;
            const c2 = c[2] >= n || cells[c[2]].state !== t;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) {
                current = v[0];
                check(c0 ? c[0] : c[1]);
            }
            else if (v[1] !== prev && c1 !== c2) {
                current = v[1];
                check(c1 ? c[1] : c[2]);
            }
            else if (v[2] !== prev && c0 !== c2) {
                current = v[2];
                check(c2 ? c[2] : c[0]);
            }
            if (current === chain[chain.length - 1][0]) {
                console.error("Next vertex is not found");
                break;
            }
        }
        chain.push([start, state, land]); // add starting vertex to sequence to close the path
        return chain;
    }
    invokeActiveZooming();
    console.timeEnd("drawStates");
}

// draw state and province borders
export function drawBorders() {
    console.time("drawBorders");
    view.borders.selectAll("path").remove();

    const { cells, vertices } = pack,
        n = cells.length;
    const sPath = [], pPath = [];
    const sUsed = new Array(pack.states.length).fill("").map(a => []);
    const pUsed = new Array(pack.provinces.length).fill("").map(a => []);

    for (let i = 0; i < cells.length; i++) {
        if (!cells[i].state) continue;
        const p = cells[i].province;
        const s = cells[i].state;

        // if cell is on province border
        const provToCell = cells[i].c.find(n => cells[n].state === s && p > cells[n].province && pUsed[p][n] !== cells[n].province);
        if (provToCell) {
            const provTo = cells[provToCell].province;
            pUsed[p][provToCell] = provTo;
            const vertex = cells[i].v.find(v => vertices.c[v].some(i => cells[i].province === provTo));
            const chain = connectVertices(vertex, p, cells.map(x => x.province), provTo, pUsed);

            if (chain.length > 1) {
                pPath.push("M" + chain.map(c => vertices.p[c]).join(" "));
                i--;
                continue;
            }
        }

        // if cell is on state border
        const stateToCell = cells[i].c.find(n => cells[n].h >= 20 && s > cells[n].state && sUsed[s][n] !== cells[n].state);
        if (stateToCell !== undefined) {
            const stateTo = cells[stateToCell].state;
            sUsed[s][stateToCell] = stateTo;
            const vertex = cells[i].v.find(v => vertices.c[v].some(i => cells[i].h >= 20 && cells[i].state === stateTo));
            const chain = connectVertices(vertex, s, cells.map(x => x.state), stateTo, sUsed);

            if (chain.length > 1) {
                sPath.push("M" + chain.map(c => vertices.p[c]).join(" "));
                i--;
                continue;
            }
        }
    }

    stateBorders.append("path").attr("d", sPath.join(" "));
    provinceBorders.append("path").attr("d", pPath.join(" "));

    // connect vertices to chain
    function connectVertices(current, f, array, t, used) {
        let chain = [];
        const checkCell = c => c >= n || array[c] !== f;
        const checkVertex = v => vertices.c[v].some(c => array[c] === f) && vertices.c[v].some(c => array[c] === t && cells[c].h >= 20);

        // find starting vertex
        for (let i = 0; i < 1000; i++) {
            if (i === 999)
                console.error("Find starting vertex: limit is reached", current, f, t);
            const p = chain[chain.length - 2] || -1; // previous vertex
            const v = vertices.v[current],
                c = vertices.c[current];

            const v0 = checkCell(c[0]) !== checkCell(c[1]) && checkVertex(v[0]);
            const v1 = checkCell(c[1]) !== checkCell(c[2]) && checkVertex(v[1]);
            const v2 = checkCell(c[0]) !== checkCell(c[2]) && checkVertex(v[2]);
            if (v0 + v1 + v2 === 1)
                break;
            current = v0 && p !== v[0] ? v[0] : v1 && p !== v[1] ? v[1] : v[2];

            if (current === chain[0])
                break;
            if (current === p)
                return [];
            chain.push(current);
        }

        chain = [current]; // vertices chain to form a path
        // find path
        for (let i = 0; i < 1000; i++) {
            if (i === 999)
                console.error("Find path: limit is reached", current, f, t);
            const p = chain[chain.length - 2] || -1; // previous vertex
            const v = vertices.v[current],
                c = vertices.c[current];
            c.filter(c => array[c] === t)
                .forEach(c => used[f][c] = t);

            const v0 = checkCell(c[0]) !== checkCell(c[1]) && checkVertex(v[0]);
            const v1 = checkCell(c[1]) !== checkCell(c[2]) && checkVertex(v[1]);
            const v2 = checkCell(c[0]) !== checkCell(c[2]) && checkVertex(v[2]);
            current = v0 && p !== v[0]
                ? v[0]
                : v1 && p !== v[1]
                    ? v[1]
                    : v[2];

            if (current === p)
                break;
            if (current === chain[chain.length - 1])
                break;
            if (chain.length > 1 && v0 + v1 + v2 < 2)
                break;
            chain.push(current);
            if (current === chain[0])
                break;
        }

        return chain;
    }

    console.timeEnd("drawBorders");
}

export function drawProvinces() {
    let { provs } = view;
    console.time("drawProvinces");
    const labelsOn = provs.attr("data-labels") == 1;
    provs.selectAll("*").remove();

    const { cells, vertices, provinces } = pack,
        n = cells.length;
    const used = new Uint8Array(n);
    const vArray = new Array(provinces.length); // store vertices array
    const body = new Array(provinces.length).fill(""); // store path around each province
    const gap = new Array(provinces.length).fill(""); // store path along water for each province to fill the gaps

    const xs = cells.map((v, k) => k);
    for (const i of xs) {
        if (!cells[i].province || used[i]) continue;
        const p = cells[i].province;
        const onborder = cells[i].c.some(n => cells[n].province !== p);
        if (!onborder) continue;

        const borderWith = cells[i].c.map(c => cells[c].province).find(n => n !== p);
        const vertex = cells[i].v.find(v => vertices.c[v].some(i => cells[i].province === borderWith));
        const chain = connectVertices(vertex, p, borderWith);
        if (chain.length < 3)
            continue;
        const points = chain.map(v => vertices.p[v[0]]);
        if (!vArray[p])
            vArray[p] = [];
        vArray[p].push(points);
        body[p] += "M" + points.join("L");
        gap[p] += "M" + vertices.p[chain[0][0]] + chain.reduce((r, v, i, d) => !i ? r : !v[2] ? r + "L" + vertices.p[v[0]] : d[i + 1] && !d[i + 1][2] ? r + "M" + vertices.p[v[0]] : r, "");
    }

    // find state visual center
    vArray.forEach((ar, i) => {
        const sorted = ar.sort((a, b) => b.length - a.length); // sort by points number
        provinces[i].pole = polylabel(sorted, 1.0); // pole of inaccessibility
    });

    const g = provs.append("g").attr("id", "provincesBody");
    const bodyData = body.map((p, i) => [p.length > 10 ? p : null, i, provinces[i].color]).filter(d => d[0]);
    g.selectAll("path").data(bodyData).enter().append("path").attr("d", d => d[0]).attr("fill", d => d[2]).attr("stroke", "none").attr("id", d => "province" + d[1]);
    const gapData = gap.map((p, i) => [p.length > 10 ? p : null, i, provinces[i].color]).filter(d => d[0]);
    g.selectAll(".path").data(gapData).enter().append("path").attr("d", d => d[0]).attr("fill", "none").attr("stroke", d => d[2]).attr("id", d => "province-gap" + d[1]);

    const labels = provs.append("g").attr("id", "provinceLabels");
    labels.style("display", `${labelsOn ? "block" : "none"}`);
    const labelData = provinces.filter(p => p.i && !p.removed);
    labels.selectAll(".path").data(labelData).enter().append("text")
        .attr("x", d => d.pole[0]).attr("y", d => d.pole[1])
        .attr("id", d => "provinceLabel" + d.i).text(d => d.name);

    // connect vertices to chain
    function connectVertices(start, t, province) {
        const chain = []; // vertices chain to form a path
        let land = vertices.c[start].some(c =>
            cells[c].h >= 20 && cells[c].province !== t);
        function check(i) {
            province = cells[i].province;
            land = cells[i].h >= 20;
        }

        for (let i = 0, current = start; i === 0 || current !== start && i < 20000; i++) {
            const prev = chain[chain.length - 1] ? chain[chain.length - 1][0] : -1; // previous vertex in chain
            chain.push([current, province, land]); // add current vertex to sequence
            const c = vertices.c[current]; // cells adjacent to vertex
            c.filter(c => cells[c].province === t)
                .forEach(c => used[c] = 1);
            const c0 = c[0] >= n || cells[c[0]].province !== t;
            const c1 = c[1] >= n || cells[c[1]].province !== t;
            const c2 = c[2] >= n || cells[c[2]].province !== t;
            const v = vertices.v[current]; // neighboring vertices
            if (v[0] !== prev && c0 !== c1) {
                current = v[0];
                check(c0 ? c[0] : c[1]);
            }
            else if (v[1] !== prev && c1 !== c2) {
                current = v[1];
                check(c1 ? c[1] : c[2]);
            }
            else if (v[2] !== prev && c0 !== c2) {
                current = v[2];
                check(c2 ? c[2] : c[0]);
            }
            if (current === chain[chain.length - 1][0]) {
                console.error("Next vertex is not found"); break;
            }
        }
        chain.push([start, province, land]); // add starting vertex to sequence to close the path
        return chain;
    }
    console.timeEnd("drawProvinces");
}

export function drawGrid() {
    let { gridOverlay } = view;
    console.time("drawGrid");
    gridOverlay.selectAll("*").remove();
    const type = styleGridType.value;
    const size = Math.max(+styleGridSize.value, 2);
    if (type === "pointyHex" || type === "flatHex") {
        const points = getHexGridPoints(size, type);
        const hex = "m" + getHex(size, type).slice(0, 4).join("l");
        const d = points.map(p => "M" + p + hex).join("");
        gridOverlay.append("path").attr("d", d);
    } else if (type === "square") {
        const pathX = d3.range(size, svgWidth, size).map(x => "M" + rn(x, 2) + ",0v" + svgHeight).join(" ");
        const pathY = d3.range(size, svgHeight, size).map(y => "M0," + rn(y, 2) + "h" + svgWidth).join(" ");
        gridOverlay.append("path").attr("d", pathX + pathY);
    }

    // calculate hexes centers
    function getHexGridPoints(size, type) {
        const points = [];
        const rt3 = Math.sqrt(3);
        const off = type === "pointyHex" ? rn(rt3 * size / 2, 2) : rn(size * 3 / 2, 2);
        const ySpace = type === "pointyHex" ? rn(size * 3 / 2, 2) : rn(rt3 * size / 2, 2);
        const xSpace = type === "pointyHex" ? rn(rt3 * size, 2) : rn(size * 3, 2);
        for (let y = 0, l = 0; y < graphHeight + ySpace; y += ySpace, l++) {
            for (let x = l % 2 ? 0 : off; x < graphWidth + xSpace; x += xSpace) { points.push([rn(x, 2), rn(y, 2)]); }
        }
        return points;
    }

    // calculate hex points
    function getHex(radius, type) {
        let x0 = 0, y0 = 0;
        const s = type === "pointyHex" ? 0 : Math.PI / -6;
        const thirdPi = Math.PI / 3;
        let angles = [s, s + thirdPi, s + 2 * thirdPi, s + 3 * thirdPi, s + 4 * thirdPi, s + 5 * thirdPi];
        return angles.map(function (a) {
            const x1 = Math.sin(a) * radius;
            const y1 = -Math.cos(a) * radius;
            const dx = rn(x1 - x0, 2);
            const dy = rn(y1 - y0, 2);
            x0 = x1, y0 = y1;
            return [rn(dx, 2), rn(dy, 2)];
        });
    }

    console.timeEnd("drawGrid");
}

export function drawCoordinates() {
    let { coordinates } = view;
    if (!layerIsOn("toggleCoordinates")) return;
    coordinates.selectAll("*").remove(); // remove every time
    const steps = [.5, 1, 2, 5, 10, 15, 30]; // possible steps
    const goal = mapCoordinates.lonT / scale / 10;
    const step = steps.reduce((p, c) => Math.abs(c - goal) < Math.abs(p - goal) ? c : p);

    const desired = +coordinates.attr("data-size"); // desired label size
    coordinates.attr("font-size", Math.max(rn(desired / scale ** .8, 2), .1)); // actual label size
    const graticule = d3.geoGraticule().extent([[mapCoordinates.lonW, mapCoordinates.latN], [mapCoordinates.lonE + .1, mapCoordinates.latS + .1]])
        .stepMajor([400, 400]).stepMinor([step, step]);
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

// conver svg point into viewBox point
function getViewPoint(x, y) {
    const view = document.getElementById('viewbox');
    const svg = document.getElementById('map');
    const pt = svg.createSVGPoint();
    pt.x = x, pt.y = y;
    return pt.matrixTransform(view.getScreenCTM().inverse());
}

export function toggleHeight(event) {
    if (!view.terrs.selectAll("*").size()) {
        turnButtonOn("toggleHeight");
        drawHeightmap();
        if (event && isCtrlClick(event)) editStyle("terrs");
    } else {
        if (event && isCtrlClick(event)) { editStyle("terrs"); return; }
        if (customization === 1) { tip("You cannot turn off the layer when heightmap is in edit mode", false, "error"); return; }
        turnButtonOff("toggleHeight");
        view.terrs.selectAll("*").remove();
    }
}

export function toggleTemp(event) {
    let { temperature } = view;
    if (!temperature.selectAll("*").size()) {
        turnButtonOn("toggleTemp");
        drawTemp();
        if (event && isCtrlClick(event)) editStyle("temperature");
    } else {
        if (event && isCtrlClick(event)) { editStyle("temperature"); return; }
        turnButtonOff("toggleTemp");
        temperature.selectAll("*").remove();
    }
}

export function toggleBiomes(event) {
    let { biomes } = view;
    if (!biomes.selectAll("path").size()) {
        turnButtonOn("toggleBiomes");
        drawBiomes();
        if (event && isCtrlClick(event)) editStyle("biomes");
    } else {
        if (event && isCtrlClick(event)) { editStyle("biomes"); return; }
        biomes.selectAll("path").remove();
        turnButtonOff("toggleBiomes");
    }
}

export function toggleBorders(event) {
    if (!layerIsOn("toggleBorders")) {
        turnButtonOn("toggleBorders");
        $('#borders').fadeIn();
        if (event && isCtrlClick(event)) editStyle("borders");
    } else {
        if (event && isCtrlClick(event)) { editStyle("borders"); return; }
        turnButtonOff("toggleBorders");
        $('#borders').fadeOut();
    }
}

export function toggleProvinces(event) {
    if (!layerIsOn("toggleProvinces")) {
        turnButtonOn("toggleProvinces");
        drawProvinces();
        if (event && isCtrlClick(event)) editStyle("provs");
    } else {
        if (event && isCtrlClick(event)) { editStyle("provs"); return; }
        view.provs.selectAll("*").remove();
        turnButtonOff("toggleProvinces");
    }
}

export function toggleGrid(event) {
    let { gridOverlay } = view;
    if (!gridOverlay.selectAll("*").size()) {
        turnButtonOn("toggleGrid");
        drawGrid();
        calculateFriendlyGridSize();
        if (event && isCtrlClick(event)) editStyle("gridOverlay");
    } else {
        if (event && isCtrlClick(event)) { editStyle("gridOverlay"); return; }
        turnButtonOff("toggleGrid");
        gridOverlay.selectAll("*").remove();
    }
}

export function toggleCoordinates(event) {
    let { coordinates } = view;
    if (!coordinates.selectAll("*").size()) {
        turnButtonOn("toggleCoordinates");
        drawCoordinates();
        if (event && isCtrlClick(event)) editStyle("coordinates");
    } else {
        if (event && isCtrlClick(event)) { editStyle("coordinates"); return; }
        turnButtonOff("toggleCoordinates");
        coordinates.selectAll("*").remove();
    }
}

export function toggleCompass(event) {
    let { compass } = view;
    if (!layerIsOn("toggleCompass")) {
        turnButtonOn("toggleCompass");
        $('#compass').fadeIn();
        if (!compass.selectAll("*").size()) {
            compass.append("use").attr("xlink:href", "#rose");
            // prolongate rose lines
            svg.select("g#rose > g#sL > line#sL1").attr("y1", -19000).attr("y2", 19000);
            svg.select("g#rose > g#sL > line#sL2").attr("x1", -19000).attr("x2", 19000);
            shiftCompass();
        }
        if (event && isCtrlClick(event)) editStyle("compass");
    } else {
        if (event && isCtrlClick(event)) { editStyle("compass"); return; }
        $('#compass').fadeOut();
        turnButtonOff("toggleCompass");
    }
}

export function toggleRelief(event) {
    let { terrain } = view;
    if (!layerIsOn("toggleRelief")) {
        turnButtonOn("toggleRelief");
        if (!terrain.selectAll("*").size()) ReliefIcons();
        $('#terrain').fadeIn();
        if (event && isCtrlClick(event)) editStyle("terrain");
    } else {
        if (event && isCtrlClick(event)) { editStyle("terrain"); return; }
        $('#terrain').fadeOut();
        turnButtonOff("toggleRelief");
    }
}

export function toggleTexture(event) {
    if (!layerIsOn("toggleTexture")) {
        turnButtonOn("toggleTexture");
        // append default texture image selected by default. Don't append on load to not harm performance
        if (!view.texture.selectAll("*").size()) {
            const x = +styleTextureShiftX.value, y = +styleTextureShiftY.value;
            const href = styleTextureInput.value === "default" ? getDefaultTexture() : setBase64Texture(styleTextureInput.value);
            view.texture.append("image").attr("id", "textureImage")
                .attr("x", x).attr("y", y).attr("width", graphWidth - x).attr("height", graphHeight - y)
                .attr("xlink:href", href).attr("preserveAspectRatio", "xMidYMid slice");
        }
        $('#texture').fadeIn();
        zoom.scaleBy(svg, 1.00001); // enforce browser re-draw
        if (event && isCtrlClick(event)) editStyle("texture");
    } else {
        if (event && isCtrlClick(event)) { editStyle("texture"); return; }
        $('#texture').fadeOut();
        turnButtonOff("toggleTexture");
    }
}

export function toggleRivers(event) {
    if (!layerIsOn("toggleRivers")) {
        turnButtonOn("toggleRivers");
        $('#rivers').fadeIn();
        if (event && isCtrlClick(event)) editStyle("rivers");
    } else {
        if (event && isCtrlClick(event)) { editStyle("rivers"); return; }
        $('#rivers').fadeOut();
        turnButtonOff("toggleRivers");
    }
}

export function toggleRoutes(event) {
    if (!layerIsOn("toggleRoutes")) {
        turnButtonOn("toggleRoutes");
        $('#routes').fadeIn();
        if (event && isCtrlClick(event)) editStyle("routes");
    } else {
        if (event && isCtrlClick(event)) { editStyle("routes"); return; }
        $('#routes').fadeOut();
        turnButtonOff("toggleRoutes");
    }
}

export function toggleMilitary() {
    if (!layerIsOn("toggleMilitary")) {
        turnButtonOn("toggleMilitary");
        $('#armies').fadeIn();
        if (event && isCtrlClick(event)) editStyle("armies");
    } else {
        if (event && isCtrlClick(event)) { editStyle("armies"); return; }
        $('#armies').fadeOut();
        turnButtonOff("toggleMilitary");
    }
}

export function toggleMarkers(event) {
    if (!layerIsOn("toggleMarkers")) {
        turnButtonOn("toggleMarkers");
        $('#markers').fadeIn();
        if (event && isCtrlClick(event)) editStyle("markers");
    } else {
        if (event && isCtrlClick(event)) { editStyle("markers"); return; }
        $('#markers').fadeOut();
        turnButtonOff("toggleMarkers");
    }
}

export function toggleLabels(event) {
    let { labels } = view;

    if (!layerIsOn("toggleLabels")) {
        turnButtonOn("toggleLabels");
        labels.style("display", null)
        invokeActiveZooming();
        if (event && isCtrlClick(event)) editStyle("labels");
    } else {
        if (event && isCtrlClick(event)) { editStyle("labels"); return; }
        turnButtonOff("toggleLabels");
        labels.style("display", "none");
    }
}

export function toggleIcons(event) {
    if (!layerIsOn("toggleIcons")) {
        turnButtonOn("toggleIcons");
        $('#icons').fadeIn();
        if (event && isCtrlClick(event)) editStyle("burgIcons");
    } else {
        if (event && isCtrlClick(event)) { editStyle("burgIcons"); return; }
        turnButtonOff("toggleIcons");
        $('#icons').fadeOut();
    }
}

export function toggleRulers(event) {
    if (!layerIsOn("toggleRulers")) {
        turnButtonOn("toggleRulers");
        $('#ruler').fadeIn();
        if (event && isCtrlClick(event)) editStyle("ruler");
    } else {
        if (event && isCtrlClick(event)) { editStyle("ruler"); return; }
        $('#ruler').fadeOut();
        turnButtonOff("toggleRulers");
    }
}

export function toggleScaleBar(event) {
    if (!layerIsOn("toggleScaleBar")) {
        turnButtonOn("toggleScaleBar");
        $('#scaleBar').fadeIn();
        if (event && isCtrlClick(event)) editUnits();
    } else {
        if (event && isCtrlClick(event)) { editUnits(); return; }
        $('#scaleBar').fadeOut();
        turnButtonOff("toggleScaleBar");
    }
}

export function toggleZones(event) {
    if (!layerIsOn("toggleZones")) {
        turnButtonOn("toggleZones");
        $('#zones').fadeIn();
        if (event && isCtrlClick(event)) editStyle("zones");
    } else {
        if (event && isCtrlClick(event)) { editStyle("zones"); return; }
        turnButtonOff("toggleZones");
        $('#zones').fadeOut();
    }
}

export function turnButtonOff(el) {
    document.getElementById(el).classList.add("buttonoff");
    getCurrentPreset();
}

export function turnButtonOn(el) {
    document.getElementById(el).classList.remove("buttonoff");
    getCurrentPreset();
}

export function togglePrec(event) {
    let { prec } = view;

    if (!prec.selectAll("circle").size()) {
        turnButtonOn("togglePrec");
        drawPrec();
        if (event && isCtrlClick(event)) editStyle("prec");
    } else {
        if (event && isCtrlClick(event)) { editStyle("prec"); return; }
        turnButtonOff("togglePrec");
        const hide = d3.transition().duration(1000).ease(d3.easeSinIn);
        prec.selectAll("text").attr("opacity", 1).transition(hide).attr("opacity", 0);
        prec.selectAll("circle").transition(hide).attr("r", 0).remove();
        prec.transition().delay(1000).style("display", "none");
    }
}

export function togglePopulation(event) {
    let { population } = view;
    if (!population.selectAll("line").size()) {
        turnButtonOn("togglePopulation");
        drawPopulation();
        if (event && isCtrlClick(event)) editStyle("population");
    } else {
        if (event && isCtrlClick(event)) { editStyle("population"); return; }
        turnButtonOff("togglePopulation");
        const hide = d3.transition().duration(1000).ease(d3.easeSinIn);
        population.select("#rural").selectAll("line").transition(hide).attr("y2", d => d[1]).remove();
        population.select("#urban").selectAll("line").transition(hide).delay(1000).attr("y2", d => d[1]).remove();
    }
}

export function toggleCells(event) {
    if (!view.cells.selectAll("path").size()) {
        turnButtonOn("toggleCells");
        drawCells();
        if (event && isCtrlClick(event)) editStyle("cells");
    } else {
        if (event && isCtrlClick(event)) { editStyle("cells"); return; }
        view.cells.selectAll("path").remove();
        turnButtonOff("toggleCells");
    }
}

export function toggleIce() {
    if (!layerIsOn("toggleIce")) {
        turnButtonOn("toggleIce");
        $('#ice').fadeIn();
        if (!view.ice.selectAll("*").size()) drawIce();
        if (event && isCtrlClick(event)) editStyle("ice");
    } else {
        if (event && isCtrlClick(event)) { editStyle("ice"); return; }
        $('#ice').fadeOut();
        turnButtonOff("toggleIce");
    }
}

export function toggleCultures(event) {
    let { cults } = view;
    const cultures = pack.cultures.filter(c => c.i && !c.removed);
    const empty = !cults.selectAll("path").size();
    if (empty && cultures.length) {
        turnButtonOn("toggleCultures");
        drawCultures();
        if (event && isCtrlClick(event)) editStyle("cults");
    } else {
        if (event && isCtrlClick(event)) { editStyle("cults"); return; }
        cults.selectAll("path").remove();
        turnButtonOff("toggleCultures");
    }
}

export function toggleReligions(event) {
    const religions = pack.religions.filter(r => r.i && !r.removed);
    let { relig } = view;
    if (!relig.selectAll("path").size() && religions.length) {
        turnButtonOn("toggleReligions");
        drawReligions();
        if (event && isCtrlClick(event)) editStyle("relig");
    } else {
        if (event && isCtrlClick(event)) { editStyle("relig"); return; }
        relig.selectAll("path").remove();
        turnButtonOff("toggleReligions");
    }
}

export function toggleStates(event) {
    let { regions } = view;
    if (!layerIsOn("toggleStates")) {
        turnButtonOn("toggleStates");
        regions.style("display", null);
        drawStates();
        if (event && isCtrlClick(event)) editStyle("regions");
    } else {
        if (event && isCtrlClick(event)) { editStyle("regions"); return; }
        regions.style("display", "none").selectAll("path").remove();
        turnButtonOff("toggleStates");
    }
}
