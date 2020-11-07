// Fantasy Map Generator main script
// Azgaar (azgaar.fmg@yandex.by). Minsk, 2017-2019
// https://github.com/Azgaar/Fantasy-Map-Generator
// MIT License

// I don't mind of any help with programming.
// See also https://github.com/Azgaar/Fantasy-Map-Generator/issues/153
"use strict";

export const version = "1.4"; // generator version
document.title += " v" + version;

// if map version is not stored, clear localStorage and show a message
if (rn(localStorage.getItem("version"), 2) !== rn(version, 2)) {
    localStorage.clear();
    setTimeout(showWelcomeMessage, 8000);
}

import * as ThreeD from "./modules/ui/3d.js";
import * as HeightmapGenerator from "./modules/heightmap-generator.js";
import { OceanLayers } from "./modules/ocean-layers.js";
import * as Precipitation from "./engines/precipitation-engine.js";
export const generatePrecipitation = Precipitation.generatePrecipitation;
import * as Rivers from "./modules/river-generator.js";
import * as Coast from "./engines/coast-engine.js";
export const drawCoastline = Coast.drawCoastline;
import * as Biomes from "./engines/biome-engine.js";
export const { applyDefaultBiomesSystem } = Biomes;
export const defineBiomes = Biomes.defineBiomes;

import * as Population from "./engines/population-engine.js";
export const { rankCells } = Population;
import * as Cultures from "./modules/cultures-generator.js";
import * as BurgsAndStates from "./modules/burgs-and-states.js";
import * as Religions from "./modules/religions-generator.js";
import * as Military from "./modules/military-generator.js";
import * as Markers from "./engines/marker-engine.js";
export const addMarkers = Markers.addMarkers;
import * as Zones from "./engines/zone-engine.js";
export const addZones = Zones.addZones;
import * as Names from "./modules/names-generator.js";

import { editWorld } from "./modules/ui/world-configurator.js";
import { initialize as initStorage, uploadMap } from "./modules/save-and-load.js";
import { initialize as initEditors, closeDialogs, clearLegend, unfog } from "./modules/ui/editors.js";
import { drawScaleBar } from "./modules/ui/measurers.js";

import { initialize as initLayers, restoreLayers, applyPreset, drawStates, drawBorders, drawCoordinates } from "./modules/ui/layers.js";
import { initialize as initStyle, applyStyleOnLoad } from "./modules/ui/style.js";
import { initialize as initGeneral, clearMainTip, locked, tip } from "./modules/ui/general.js";
import {
    initialize as initUtilities, parseError, getPackPolygon, P, gauss, rn,
    debounce, link, normalize
} from "./modules/utils.js";

import { initialize as initOptions, applyStoredOptions, applyMapSize, randomizeOptions } from "./modules/ui/options.js";
import { initialize as initTools } from "./modules/ui/tools.js";

export let svg = d3.select("#map");

import { MapView } from "./map/MapView.js";
export let view = MapView(document.getElementById('map'));
MapView.initialize(view);

// append svg layers (in default order)
let {
    ocean, regions, borders, routes, population,
    labels, icons, fogging
} = view;
export let { coastline, lakes } = view;

export let oceanLayers = ocean.append("g").attr("id", "oceanLayers");
export let oceanPattern = ocean.append("g").attr("id", "oceanPattern");
export let statesBody = regions.append("g").attr("id", "statesBody");
export let statesHalo = regions.append("g").attr("id", "statesHalo");
export let stateBorders = borders.append("g").attr("id", "stateBorders");
export let provinceBorders = borders.append("g").attr("id", "provinceBorders");
export let roads = routes.append("g").attr("id", "roads");
export let trails = routes.append("g").attr("id", "trails");
export let searoutes = routes.append("g").attr("id", "searoutes");

export let burgIcons = icons.append("g").attr("id", "burgIcons");
export let anchors = icons.append("g").attr("id", "anchors");

view.box.append("g").attr("id", "debug");

// lake and coast groups
lakes.append("g").attr("id", "freshwater");
lakes.append("g").attr("id", "salt");
lakes.append("g").attr("id", "sinkhole");
lakes.append("g").attr("id", "frozen");
lakes.append("g").attr("id", "lava");
lakes.append("g").attr("id", "dry");
coastline.append("g").attr("id", "sea_island");
coastline.append("g").attr("id", "lake_island");

labels.append("g").attr("id", "states");
labels.append("g").attr("id", "addedLabels");

export let burgLabels = labels.append("g").attr("id", "burgLabels");
burgIcons.append("g").attr("id", "cities");
burgLabels.append("g").attr("id", "cities");
anchors.append("g").attr("id", "cities");

burgIcons.append("g").attr("id", "towns");
burgLabels.append("g").attr("id", "towns");
anchors.append("g").attr("id", "towns");

// population groups
population.append("g").attr("id", "rural");
population.append("g").attr("id", "urban");

// fogging
fogging.append("rect").attr("x", 0).attr("y", 0).attr("width", "100%").attr("height", "100%");
fogging.append("rect").attr("x", 0).attr("y", 0).attr("width", "100%").attr("height", "100%").attr("fill", "#e8f0f6").attr("filter", "url(#splotch)");

import "./map/HeightmapLayer.js";
import "./map/RoutesLayer.js";
import "./map/RiversLayer.js";

// Necessary Load order -- Prior to main
initUtilities();
Religions.initialize();
initLayers();
initGeneral();
initOptions();
initStyle();
initStorage();

window.invokeActiveZooming = invokeActiveZooming;

// assign events separately as not a viewbox child
view.scaleBar.on("mousemove", () => tip("Click to open Units Editor"));
view.legend.on("mousemove", () => tip("Drag to change the position. Click to hide the legend")).on("click", () => clearLegend());

// main data variables
export let grid = {}; // initial grapg based on jittered square grid and data
window.grid = grid;
export let pack = {}; // packed graph and data
window.pack = pack;
export let seed, mapId, mapHistory = [], elSelected, modules = {}, notes = [];
export let customization = 0; // 0 - no; 1 = heightmap draw; 2 - states draw; 3 - add state/burg; 4 - cultures draw

export let biomesData = applyDefaultBiomesSystem();
export let nameBases = Names.getNameBases(); // cultures-related data
export const fonts = ["Almendra+SC", "Georgia", "Arial", "Times+New+Roman", "Comic+Sans+MS", "Lucida+Sans+Unicode", "Courier+New"]; // default web-safe fonts

export let color = d3.scaleSequential(d3.interpolateSpectral); // default color scheme
export const lineGen = d3.line().curve(d3.curveBasis); // d3 line generator with default curve interpolation

// d3 zoom behavior
export let scale = 1, viewX = 0, viewY = 0;
export const zoom = d3.zoom().scaleExtent([1, 20]).on("zoom", zoomed);

// default options
export let options = { pinNotes: false }; // options object
export let mapCoordinates = {}; // map coordinates on globe
options.winds = [225, 45, 225, 315, 135, 315]; // default wind directions

applyStoredOptions();
export let graphWidth = +mapWidthInput.value, graphHeight = +mapHeightInput.value; // voronoi graph extention, cannot be changed arter generation
export let svgWidth = graphWidth, svgHeight = graphHeight; // svg canvas resolution, can be changed
view.landmass.append("rect").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);
oceanPattern.append("rect").attr("fill", "url(#oceanic)").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);
oceanLayers.append("rect").attr("id", "oceanBase").attr("x", 0).attr("y", 0).attr("width", graphWidth).attr("height", graphHeight);

import * as MapData from "./map/MapData.js";
export const { calculateVoronoiO: calculateVoronoi } = MapData;
void function removeLoading() {
    d3.select("#loading").transition().duration(4000).style("opacity", 0).remove();
    d3.select("#initial").transition().duration(4000).attr("opacity", 0).remove();
    d3.select("#optionsContainer").transition().duration(3000).style("opacity", 1);
    d3.select("#tooltip").transition().duration(4000).style("opacity", 1);
}()

// decide which map should be loaded or generated on page load
void function checkLoadParameters() {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // of there is a valid maplink, try to load .map file from URL
    if (params.get("maplink")) {
        console.warn("Load map from URL");
        const maplink = params.get("maplink");
        const pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        const valid = pattern.test(maplink);
        if (valid) { loadMapFromURL(maplink, 1); return; }
        else showUploadErrorMessage("Map link is not a valid URL", maplink);
    }

    // if there is a seed (user of MFCG provided), generate map for it
    if (params.get("seed")) {
        console.warn("Generate map for seed");
        generateMapOnLoad();
        return;
    }

    // open latest map if option is active and map is stored
    if (onloadMap.value === "saved") {
        window.ldb.get("lastMap", blob => {
            if (blob) {
                console.warn("Load last saved map");
                try {
                    uploadMap(blob);
                }
                catch (error) {
                    console.error(error);
                    console.warn("Cannot load stored map, random map to be generated");
                    generateMapOnLoad();
                }
            } else {
                console.error("No map stored, random map to be generated");
                generateMapOnLoad();
            }
        });
        return;
    }

    console.warn("Generate random map");
    generateMapOnLoad();
}()


// add drag to upload logic, pull request from @evyatron
void function addDragToUpload() {
    document.addEventListener("dragover", function (e) {
        e.stopPropagation();
        e.preventDefault();
        document.getElementById("mapOverlay").style.display = null;
    });

    document.addEventListener('dragleave', function (e) {
        document.getElementById("mapOverlay").style.display = "none";
    });

    document.addEventListener("drop", function (e) {
        e.stopPropagation();
        e.preventDefault();

        const overlay = document.getElementById("mapOverlay");
        overlay.style.display = "none";
        if (e.dataTransfer.items == null || e.dataTransfer.items.length !== 1) return; // no files or more than one
        const file = e.dataTransfer.items[0].getAsFile();
        if (file.name.indexOf('.map') == -1) { // not a .map file
            alertMessage.innerHTML = 'Please upload a <b>.map</b> file you have previously downloaded';
            $("#alert").dialog({
                resizable: false, title: "Invalid file format", position: { my: "center", at: "center", of: "svg" },
                buttons: { Close: function () { $(this).dialog("close"); } }
            });
            return;
        }

        // all good - show uploading text and load the map
        overlay.style.display = null;
        overlay.innerHTML = "Uploading<span>.</span><span>.</span><span>.</span>";
        if (closeDialogs) closeDialogs();
        uploadMap(file, () => {
            overlay.style.display = "none";
            overlay.innerHTML = "Drop a .map file to open";
        });
    });
}()

// Necessary Load Order -- After main
initTools();
initEditors();

export function setSeed(v) { seed = v; }
export function setWidth(v) { graphWidth = v; }
export function setHeight(v) { graphHeight = v; }
export function setMapId(v) { mapId = v; }
export function setOptions(o) { options = o; }
export function setCoordinates(v) { mapCoordinates = v; }
export function setNotes(v) { notes = v; }
export function setBiomesData(v) { biomesData = v; }
export function setGrid(v) { grid = v; }
export function setPack(v) { pack = v; }
export function setNameBases(v) { nameBases = v; }
export function setSvgWidth(v) { svgWidth = v; }
export function setSvgHeight(v) { svgHeight = v; }

export function redefineElements(mapview) {
    view = mapview;
    svg = view.svg;
    let { ocean, regions, borders, routes, labels, icons } = view;
    oceanLayers = ocean.select("#oceanLayers");
    oceanPattern = ocean.select("#oceanPattern");
    statesBody = regions.select("#statesBody");
    statesHalo = regions.select("#statesHalo");
    stateBorders = borders.select("#stateBorders");
    provinceBorders = borders.select("#provinceBorders");
    roads = routes.select("#roads");
    trails = routes.select("#trails");
    searoutes = routes.select("#searoutes");
    burgIcons = icons.select("#burgIcons");
    anchors = icons.select("#anchors");
    burgLabels = labels.select("#burgLabels");
}

export async function loadMapFromURL(maplink, random) {
    const URL = decodeURIComponent(maplink);

    try {
        let response = await fetch(URL, { method: 'GET', mode: 'cors' });
        if (!response.ok)
            throw new Error("Cannot load map from URL");
        uploadMap(response.blob());
    }
    catch (err) {
        showUploadErrorMessage(error.message, URL, random);
        if (random)
            generateMapOnLoad();
    }

    /*fetch(URL, { method: 'GET', mode: 'cors' })
        .then(response => {
            if (response.ok) return response.blob();
            throw new Error("Cannot load map from URL");
        }).then(blob => uploadMap(blob))
        .catch(error => {
            showUploadErrorMessage(error.message, URL, random);
            if (random) generateMapOnLoad();
        });*/
}

function showUploadErrorMessage(error, URL, random) {
    console.error(error);
    alertMessage.innerHTML = `Cannot load map from the ${link(URL, "link provided")}.
    ${random ? `A new random map is generated. ` : ''}
    Please ensure the linked file is reachable and CORS is allowed on server side`;
    $("#alert").dialog({ title: "Loading error", width: "32em", buttons: { OK: function () { $(this).dialog("close"); } } });
}

export function generateMapOnLoad() {
    applyStyleOnLoad(); // apply default of previously selected style
    generate(); // generate map
    focusOn(); // based on searchParams focus on point, cell or burg from MFCG
    applyPreset(); // apply saved layers preset
}

// focus on coordinates, cell or burg provided in searchParams
export function focusOn() {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (params.get("from") === "MFCG" && document.referrer) {
        if (params.get("seed").length === 13) {
            // show back burg from MFCG
            params.set("burg", params.get("seed").slice(-4));
        } else {
            // select burg for MFCG
            findBurgForMFCG(params);
            return;
        }
    }

    const s = +params.get("scale") || 8;
    let x = +params.get("x");
    let y = +params.get("y");

    const c = +params.get("cell");
    if (c) {
        x = pack.cells.p[c][0];
        y = pack.cells.p[c][1];
    }

    const b = +params.get("burg");
    if (b && pack.burgs[b]) {
        x = pack.burgs[b].x;
        y = pack.burgs[b].y;
    }

    if (x && y) zoomTo(x, y, s, 1600);
}

// find burg for MFCG and focus on it
export function findBurgForMFCG(params) {
    const { cells, burgs } = pack;
    if (pack.burgs.length < 2) {
        console.error("Cannot select a burg for MFCG");
        return;
    }

    // used for selection
    const size = +params.get("size");
    const coast = +params.get("coast");
    const port = +params.get("port");
    const river = +params.get("river");

    let selection = defineSelection(coast, port, river);
    if (!selection.length) selection = defineSelection(coast, !port, !river);
    if (!selection.length) selection = defineSelection(!coast, 0, !river);
    if (!selection.length) selection = [burgs[1]]; // select first if nothing is found

    function defineSelection(coast, port, river) {
        if (port && river) return burgs.filter(b => b.port && cells.r[b.cell]);
        if (!port && coast && river) return burgs.filter(b => !b.port && cells.t[b.cell] === 1 && cells.r[b.cell]);
        if (!coast && !river) return burgs.filter(b => cells.t[b.cell] !== 1 && !cells.r[b.cell]);
        if (!coast && river) return burgs.filter(b => cells.t[b.cell] !== 1 && cells.r[b.cell]);
        if (coast && river) return burgs.filter(b => cells.t[b.cell] === 1 && cells.r[b.cell]);
        return [];
    }

    // select a burg with closest population from selection
    const selected = d3.scan(selection, (a, b) => Math.abs(a.population - size) - Math.abs(b.population - size));
    const burgId = selection[selected].i;
    if (!burgId) { console.error("Cannot select a burg for MFCG"); return; }

    const b = burgs[burgId];
    const referrer = new URL(document.referrer);
    for (let p of referrer.searchParams) {
        if (p[0] === "name") b.name = p[1];
        else if (p[0] === "size") b.population = +p[1];
        else if (p[0] === "seed") b.MFCG = +p[1];
        else if (p[0] === "shantytown") b.shanty = +p[1];
        else b[p[0]] = +p[1]; // other parameters
    }
    b.MFCGlink = document.referrer; // set direct link to MFCG
    if (params.get("name") && params.get("name") != "null") b.name = params.get("name");

    const label = burgLabels.select("[data-id='" + burgId + "']");
    if (label.size()) {
        label.text(b.name).classed("drag", true).on("mouseover", function () {
            d3.select(this).classed("drag", false);
            label.on("mouseover", null);
        });
    }

    zoomTo(b.x, b.y, 8, 1600);
    invokeActiveZooming();
    tip("Here stands the glorious city of " + b.name, true, "success", 15000);
}

export function showWelcomeMessage() {
    const post = link("https://www.reddit.com/r/FantasyMapGenerator/comments/ft5b41/update_new_version_is_published_into_the_battle_v14/", "Main changes:"); // announcement on Reddit
    const changelog = link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog", "previous version");
    const reddit = link("https://www.reddit.com/r/FantasyMapGenerator", "Reddit community");
    const discord = link("https://discordapp.com/invite/X7E84HU", "Discord server");
    const patreon = link("https://www.patreon.com/azgaar", "Patreon");
    const desktop = link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Q&A#is-there-a-desktop-version", "desktop application");

    alertMessage.innerHTML = `The Fantasy Map Generator is updated up to version <b>${version}</b>.
    This version is compatible with ${changelog}, loaded <i>.map</i> files will be auto-updated.

    <ul>${post}
      <li>Military forces changes (${link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Military-Forces", "detailed description")})</li>
      <li>Battle simulation (${link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Battle-Simulator", "detailed description")})</li>
      <li>Ice layer and Ice editor</li>
      <li>Route and River Elevation profile (by EvolvedExperiment)</li>
      <li>Image Converter enhancement</li>
      <li>Name generator improvement</li>
      <li>Improved integration with City Generator</li>
      <li>Fogging restyle</li>
    </ul>

    <p>You can can also download a ${desktop}.</p>

    <p>Join our ${discord} and ${reddit} to ask questions, share maps, discuss the Generator and Worlbuilding, report bugs and propose new features.</p>

    <span>Thanks for all supporters on ${patreon}!</i></span>`;

    $("#alert").dialog(
        {
            resizable: false, title: "Fantasy Map Generator update", width: "28em",
            buttons: { OK: function () { $(this).dialog("close") } },
            position: { my: "center", at: "center", of: "svg" },
            close: () => localStorage.setItem("version", version)
        }
    );
}

function zoomed() {
    const transform = d3.event.transform;
    const scaleDiff = scale - transform.k;
    const positionDiff = viewX - transform.x | viewY - transform.y;
    if (!positionDiff && !scaleDiff) return;

    scale = transform.k;
    viewX = transform.x;
    viewY = transform.y;
    view.box.attr("transform", transform);

    // update grid only if view position
    if (positionDiff) drawCoordinates();

    // rescale only if zoom is changed
    if (scaleDiff) {
        invokeActiveZooming();
        drawScaleBar();
    }

    // zoom image converter overlay
    const canvas = document.getElementById("canvas");
    if (canvas && +canvas.style.opacity) {
        const img = document.getElementById("image");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, viewX, viewY);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
}

// Zoom to a specific point
export function zoomTo(x, y, z = 8, d = 2000) {
    const transform = d3.zoomIdentity.translate(x * -z + graphWidth / 2, y * -z + graphHeight / 2).scale(z);
    svg.transition().duration(d).call(zoom.transform, transform);
}

// Reset zoom to initial
export function resetZoom(d = 1000) {
    svg.transition().duration(d).call(zoom.transform, d3.zoomIdentity);
}

// calculate x,y extreme points of viewBox
export function getViewBoxExtent() {
    // x = trX / scale * -1 + graphWidth / scale
    // y = trY / scale * -1 + graphHeight / scale
    return [[Math.abs(viewX / scale), Math.abs(viewY / scale)], [Math.abs(viewX / scale) + graphWidth / scale, Math.abs(viewY / scale) + graphHeight / scale]];
}

// active zooming feature
export function invokeActiveZooming() {
    if (coastline.select("#sea_island").size() && +coastline.select("#sea_island").attr("auto-filter")) {
        // toggle shade/blur filter for coatline on zoom
        const filter = scale > 1.5 && scale <= 2.6 ? null : scale > 2.6 ? "url(#blurFilter)" : "url(#dropShadow)";
        coastline.select("#sea_island").attr("filter", filter);
    }

    // rescale lables on zoom
    if (labels.style("display") !== "none") {
        labels.selectAll("g").each(function (d) {
            if (this.id === "burgLabels") return;
            const desired = +this.dataset.size;
            const relative = Math.max(rn((desired + desired / scale) / 2, 2), 1);
            this.getAttribute("font-size", relative);
            const hidden = hideLabels.checked && (relative * scale < 6 || relative * scale > 50);
            if (hidden) this.classList.add("hidden"); else this.classList.remove("hidden");
        });
    }

    // turn off ocean pattern if scale is big (improves performance)
    oceanPattern.select("rect").attr("fill", scale > 10 ? "#fff" : "url(#oceanic)").attr("opacity", scale > 10 ? .2 : null);

    // change states halo width
    if (!customization) {
        const haloSize = rn(statesHalo.attr("data-width") / scale, 1);
        statesHalo.attr("stroke-width", haloSize).style("display", haloSize > 3 ? "block" : "none");
    }

    // rescale map markers
    let { markers } = view;
    if (+markers.attr("rescale") && markers.style("display") !== "none") {
        markers.selectAll("use").each(function (d) {
            const x = +this.dataset.x, y = +this.dataset.y, desired = +this.dataset.size;
            const size = Math.max(desired * 5 + 25 / scale, 1);
            d3.select(this).attr("x", x - size / 2).attr("y", y - size).attr("width", size).attr("height", size);
        });
    }

    // rescale rulers to have always the same size
    let { ruler } = view;
    if (ruler.style("display") !== "none") {
        const size = rn(1 / scale ** .3 * 2, 1);
        ruler.selectAll("circle").attr("r", 2 * size).attr("stroke-width", .5 * size);
        ruler.selectAll("rect").attr("stroke-width", .5 * size);
        ruler.selectAll("text").attr("font-size", 10 * size);
        ruler.selectAll("line, path").attr("stroke-width", size);
    }
}

export function generate() {
    try {
        const timeStart = performance.now();
        invokeActiveZooming();
        generateSeed();
        console.group("Generated Map " + seed);
        applyMapSize();
        randomizeOptions();
        grid = MapData.placePoints(graphWidth, graphHeight);
        calculateVoronoi(grid, grid.points);
        //console.log(MapData.generate(seed, graphWidth, graphHeight))
        drawScaleBar();
        HeightmapGenerator.generate(grid);
        MapData.markFeatures(grid, seed);
        MapData.openNearSeaLakes(grid);
        OceanLayers(grid);
        defineMapSize(grid);
        calculateMapCoordinates(+document.getElementById("mapSizeOutput").value, +document.getElementById("latitudeOutput").value);
        calculateTemperatures(grid);
        generatePrecipitation(grid);
        reGraph(grid);
        pack.features = reMarkFeatures(pack);
        drawCoastline(pack);

        elevateLakes(pack);
        Rivers.generate();
        defineBiomes();

        rankCells();
        Cultures.generate();
        Cultures.expand();
        BurgsAndStates.generate(+regionsInput.value);
        Religions.generate(+religionsInput.value, pack);
        BurgsAndStates.defineStateForms();
        BurgsAndStates.generateProvinces();
        BurgsAndStates.defineBurgFeatures();

        drawStates();
        drawBorders();
        BurgsAndStates.drawStateLabels();

        Rivers.specify();

        Military.generate();
        addMarkers();
        addZones();
        Names.getMapName();

        console.warn(`TOTAL: ${rn((performance.now() - timeStart) / 1000, 2)}s`);
        showStatistics();
        console.groupEnd("Generated Map " + seed);
    }
    catch (error) {
        console.error(error);
        clearMainTip();

        alertMessage.innerHTML = `An error is occured on map generation. Please retry.
      <br>If error is critical, clear the stored data and try again.
      <p id="errorBox">${parseError(error)}</p>`;
        $("#alert").dialog({
            resizable: false, title: "Generation error", width: "32em", buttons: {
                "Clear data": function () { localStorage.clear(); localStorage.setItem("version", version); },
                Regenerate: function () { regenerateMap(); $(this).dialog("close"); },
                Ignore: function () { $(this).dialog("close"); }
            }, position: { my: "center", at: "center", of: "svg" }
        });
    }

}

// generate map seed (string!) or get it from URL searchParams
export function generateSeed() {
    const first = !mapHistory[0];
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const urlSeed = url.searchParams.get("seed");
    if (first && params.get("from") === "MFCG" && urlSeed.length === 13) seed = urlSeed.slice(0, -4);
    else if (first && urlSeed) seed = urlSeed;
    else if (optionsSeed.value && optionsSeed.value != seed) seed = optionsSeed.value;
    else seed = Math.floor(Math.random() * 1e9).toString();
    optionsSeed.value = seed;
    Math.seedrandom(seed);
}

// calculate Delaunay and then Voronoi diagram

// define map size and position based on template and random factor
function defineMapSize(grid) {
    const [size, latitude] = getSizeAndLatitude();
    let mapSizeOutput = document.getElementById('mapSizeOutput'),
        latitudeOutput = document.getElementById('latitudeOutput'),
        mapSizeInput = document.getElementById('mapSizeInput'),
        latitudeInput = document.getElementById('latitudeInput');

    const randomize = new URL(window.location.href).searchParams.get("options") === "default"; // ignore stored options
    if (randomize || !locked("mapSize")) mapSizeOutput.value = mapSizeInput.value = size;
    if (randomize || !locked("latitude")) latitudeOutput.value = latitudeInput.value = latitude;

    function getSizeAndLatitude() {
        const template = document.getElementById("templateInput").value; // heightmap template
        const part = grid.features.some(f => f.land && f.border); // if land goes over map borders
        const max = part ? 85 : 100; // max size
        const lat = part ? gauss(P(.5) ? 30 : 70, 15, 20, 80) : gauss(50, 20, 15, 85); // latiture shift

        if (!part) {
            if (template === "Pangea") return [100, 50];
            if (template === "Shattered" && P(.7)) return [100, 50];
            if (template === "Continents" && P(.5)) return [100, 50];
            if (template === "Archipelago" && P(.35)) return [100, 50];
            if (template === "High Island" && P(.25)) return [100, 50];
            if (template === "Low Island" && P(.1)) return [100, 50];
        }

        if (template === "Pangea") return [gauss(75, 20, 30, max), lat];
        if (template === "Volcano") return [gauss(30, 20, 10, max), lat];
        if (template === "Mediterranean") return [gauss(30, 30, 15, 80), lat];
        if (template === "Peninsula") return [gauss(15, 15, 5, 80), lat];
        if (template === "Isthmus") return [gauss(20, 20, 3, 80), lat];
        if (template === "Atoll") return [gauss(10, 10, 2, max), lat];

        return [gauss(40, 20, 15, max), lat]; // Continents, Archipelago, High Island, Low Island
    }
}

// calculate map position on globe
export function calculateMapCoordinates(size, latShift) {
    const latT = size / 100 * 180;
    const latN = 90 - (180 - latT) * latShift / 100;
    const latS = latN - latT;

    const lon = Math.min(graphWidth / graphHeight * latT / 2, 180);
    mapCoordinates = { latT, latN, latS, lonT: lon * 2, lonW: -lon, lonE: lon };
}

// temperature model
export function calculateTemperatures({ cells, cellsX, points }) {
    console.time('calculateTemperatures');

    const tEq = +temperatureEquatorInput.value;
    const tPole = +temperaturePoleInput.value;
    const tDelta = tEq - tPole;
    const int = d3.easePolyInOut.exponent(.5); // interpolation function

    d3.range(0, cells.length, cellsX).forEach(function (r) {
        const y = points[r][1];
        const lat = Math.abs(mapCoordinates.latN - y / graphHeight * mapCoordinates.latT); // [0; 90]
        const initTemp = tEq - int(lat / 90) * tDelta;
        for (let i = r; i < r + cellsX; i++) {
            cells[i].temp = ~~Math.max(Math.min(initTemp - convertToFriendly(cells[i].h), 127), -128);
        }
    });

    // temperature decreases by 6.5 degree C per 1km
    function convertToFriendly(h) {
        if (h < 20) return 0;
        const exponent = +heightExponentInput.value;
        const height = Math.pow(h - 18, exponent);
        return rn(height / 1000 * 6.5);
    }

    console.timeEnd('calculateTemperatures');
}

// recalculate Voronoi Graph to pack cells
export function reGraph({ cells, points, features, spacing }) {
    console.time("reGraph");
    const newCells = { p: [], g: [], h: [], t: [], f: [], r: [], biome: [] }; // to store new data
    const spacing2 = spacing ** 2;

    let xs = cells.map((v, k) => k);
    for (const i of xs) {
        const height = cells[i].h;
        const type = cells[i].t;
        // exclude all deep ocean points
        if (height < 20 && type !== -1 && type !== -2)
            continue; 
        // exclude non-coastal lake points
        if (type === -2 && (i % 4 === 0 || features[cells[i].f].type === "lake"))
            continue; 
        const x = points[i][0], y = points[i][1];

        addNewPoint(x, y); // add point to array
        // add additional points for cells along coast
        if (type === 1 || type === -1) {
            if (cells[i].b) continue; // not for near-border cells
            cells[i].c.forEach(function (e) {
                if (i > e) return;
                if (cells[e].t === type) {
                    const dist2 = (y - points[e][1]) ** 2 + (x - points[e][0]) ** 2;
                    if (dist2 < spacing2) return; // too close to each other
                    const x1 = rn((x + points[e][0]) / 2, 1);
                    const y1 = rn((y + points[e][1]) / 2, 1);
                    addNewPoint(x1, y1);
                }
            });
        }

        function addNewPoint(x, y) {
            newCells.p.push([x, y]);
            newCells.g.push(i);
            newCells.h.push(height);
        }
    }
    pack.boundary = grid.boundary;
    calculateVoronoi(pack, newCells.p);
    pack.cells.forEach((x, i) => {
        x.g = newCells.g[i];
        x.h = ~~(newCells.h[i]);
        x.p = newCells.p[i];
    });
    let verts = pack.vertices;
    pack.vertices = verts.p.map((x, i) => ({ p: x, c: verts.c[i], v: verts.v[i] }));
    let { p } = newCells; 
    pack.cells.q = d3.quadtree(p.map((p, d) => [p[0], p[1], d])); // points quadtree for fast search
    pack.cells.map((v, k) => k)
        .forEach(i => pack.cells[i].area = Math.abs(d3.polygonArea(getPackPolygon(i))));

    console.timeEnd("reGraph");
}

// Re-mark features (ocean, lakes, islands)
export function reMarkFeatures({ cells }) {
    console.time("reMarkFeatures");
    const features = [0];
    cells.forEach(x => x.f = 0);
    cells.forEach(x => x.t = 0);
    cells.forEach(x => x.haven = 0);
    cells.forEach(x => x.harbor = 0);

    for (let i = 1, queue = [0]; queue[0] !== -1; i++) {
        const start = queue[0]; // first cell
        cells[start].f = i; // assign feature number
        const land = cells[start].h >= 20;
        let border = false; // true if feature touches map border
        let cellNumber = 1; // to count cells number in a feature

        while (queue.length) {
            const q = queue.pop();
            if (cells[q].b) border = true;
            cells[q].c.forEach(function (e) {
                const eLand = cells[e].h >= 20;
                if (land && !eLand) {
                    cells[q].t = 1;
                    cells[e].t = -1;
                    cells[q].harbor++;
                    if (!cells[q].haven)
                        cells[q].haven = e;
                } else if (land && eLand) {
                    if (!cells[e].t && cells[q].t === 1)
                        cells[e].t = 2;
                    else if (!cells[q].t && cells[e].t === 1)
                        cells[q].t = 2;
                }
                if (!cells[e].f && land === eLand) {
                    queue.push(e);
                    cells[e].f = i;
                    cellNumber++;
                }
            });
        }

        const type = land ? "island" : border ? "ocean" : "lake";
        let group;
        if (type === "lake")
            group = defineLakeGroup(start, cellNumber, grid.cells[cells[start].g].temp);
        else if (type === "ocean")
            group = defineOceanGroup(cellNumber);
        else if (type === "island")
            group = defineIslandGroup(start, cellNumber);
        features.push({ i, land, border, type, cells: cellNumber, firstCell: start, group });
        queue[0] = cells.findIndex(x => !!!x.f); // find unmarked cell
    }

    return features;

    function defineLakeGroup(cell, number, temp) {
        if (temp > 31)
            return "dry";
        if (temp > 24)
            return "salt";
        if (temp < -3)
            return "frozen";
        const height = d3.max(cells[cell].c.map(c => cells[c].h));
        if (height > 69 && number < 3 && cell % 5 === 0)
            return "sinkhole";
        if (height > 69 && number < 10 && cell % 5 === 0)
            return "lava";
        return "freshwater";
    }

    function defineOceanGroup(number) {
        if (number > grid.cells.length / 25) return "ocean";
        if (number > grid.cells.length / 100) return "sea";
        return "gulf";
    }

    function defineIslandGroup(cell, number) {
        if (cell && features[cells[cell - 1].f].type === "lake")
            return "lake_island";
        if (number > grid.cells.length / 10)
            return "continent";
        if (number > grid.cells.length / 1000)
            return "island";
        return "isle";
    }

    console.timeEnd("reMarkFeatures");
}

// temporary elevate some lakes to resolve depressions and flux the water to form an open (exorheic) lake
export function elevateLakes({ cells, features }) {
    if (templateInput.value === "Atoll")
        return; // no need for Atolls
    console.time('elevateLakes');
    const maxCells = cells.length / 100; // size limit; let big lakes be closed (endorheic)
    cells.filter(x => x.h < 20)
        .filter(x => features[x.f].group === "freshwater")
        .filter(x => features[x.f].cells <= maxCells)
        .forEach(x => {
            x.h = 20
        });
    /*cells.map((v,k) => k).forEach(i => {
        if (cells[i].h >= 20)
            return;
        if (features[cells[i].f].group !== "freshwater"
            || features[cells[i].f].cells > maxCells)
            return;
        cells[i].h = 20;
    });*/

    console.timeEnd('elevateLakes');
}


// assign biome id to a cell
export function getBiomeId(moisture, temperature, height) {
    if (temperature < -5) return 11; // permafrost biome, including sea ice
    if (height < 20) return 0; // marine biome: liquid water cells
    if (moisture > 40 && temperature > -2 && (height < 25 || moisture > 24 && height > 24)) return 12; // wetland biome
    const m = Math.min(~~(moisture / 5) | 0, 4); // moisture band from 0 to 4
    const t = Math.min(Math.max(20 - temperature, 0), 25); // temparature band from 0 to 25
    return biomesData.biomesMartix[m][t];
}

// show map stats on generation complete
export function showStatistics() {
    const template = templateInput.value;
    const templateRandom = locked("template") ? "" : "(random)";
    const stats = `  Seed: ${seed}
    Canvas size: ${graphWidth}x${graphHeight}
    Template: ${template} ${templateRandom}
    Points: ${grid.points.length}
    Cells: ${pack.cells.length}
    Map size: ${mapSizeOutput.value}%
    States: ${pack.states.length - 1}
    Provinces: ${pack.provinces.length - 1}
    Burgs: ${pack.burgs.length - 1}
    Religions: ${pack.religions.length - 1}
    Culture set: ${culturesSet.selectedOptions[0].innerText}
    Cultures: ${pack.cultures.length - 1}`;

    mapId = Date.now(); // unique map id is it's creation date number
    mapHistory.push({ seed, width: graphWidth, height: graphHeight, template, created: mapId });
    console.log(stats);
}

export const regenerateMap = debounce(function () {
    console.warn("Generate new random map");
    closeDialogs("#worldConfigurator, #options3d");
    customization = 0;
    undraw();
    resetZoom(1000);
    generate();
    restoreLayers();
    if (ThreeD.options.isOn) ThreeD.redraw();
    if ($("#worldConfigurator").is(":visible")) editWorld();
}, 500);

// clear the map
export function undraw() {
    view.box.selectAll("path, circle, polygon, line, text, use, #zones > g, #armies > g, #ruler > g").remove();
    view.defs.selectAll("path, clipPath").remove();
    notes = [];
    unfog();
}
