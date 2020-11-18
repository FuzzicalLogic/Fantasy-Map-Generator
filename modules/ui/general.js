import {
    svg,
    graphWidth, graphHeight,
    pack, grid, notes,
    biomesData,
    resetZoom, zoom
} from "../../main.js";
import { closeDialogs } from "./editors.js";

import { editBiomes } from "./biomes-editor.js";
import { overviewBurgs } from "./burgs-overview.js";
import { editCultures } from "./cultures-editor.js";
import { editDiplomacy } from "./diplomacy-editor.js";
import { editHeightmap } from "./heightmap-editor.js";
import { overviewMilitary } from "./military-overview.js";
import { editNotes } from "./notes-editor.js";
import { editProvinces } from "./provinces-editor.js";
import { editReligions } from "./religions-editor.js";
import { overviewRivers } from "./rivers-overview.js";
import { editStates } from "./states-editor.js";
import { editUnits } from "./units-editor.js";
import { editZones } from "./zones-editor.js";
import { editNamesbase } from "./namesbase-editor.js";

import { viewCellDetails, toggleAddLabel, toggleAddBurg, toggleAddRiver, toggleAddRoute, toggleAddMarker } from "./tools.js";
import { findGridCell, findCell, convertTemperature, rn, link, getComposedPath, capitalize, si } from "../utils.js";
import { toggle3dOptions, regeneratePrompt, changeMapSize, toggleOptions, hideOptions } from "./options.js";
import {
    toggleLayer, toggleIce, toggleStates,
    toggleGrid, toggleRelief, toggleTexture, 
    toggleScaleBar, layerIsOn
} from "./layers.js";

import { quickLoad, quickSave, toggleSaveReminder } from "../save-and-load.js";

export function initialize() {
    window.tip = tip;

    // fit full-screen map if window is resized
    $(window).resize(function (e) {
        if (localStorage.getItem("mapWidth") && localStorage.getItem("mapHeight")) return;
        mapWidthInput.value = window.innerWidth;
        mapHeightInput.value = window.innerHeight;
        changeMapSize();
    });

    //window.onbeforeunload = () => "Are you sure you want to navigate away?";

    // show tip for non-svg elemets with data-tip
    document.getElementById("dialogs").addEventListener("mousemove", showDataTip);
    document.getElementById("optionsContainer").addEventListener("mousemove", showDataTip);
    document.getElementById("exitCustomization").addEventListener("mousemove", showDataTip);

    // assign lock behavior
    document.querySelectorAll("[data-locked]").forEach(function (e) {
        e.addEventListener("mouseover", function (event) {
            if (this.className === "icon-lock") tip("Click to unlock the option and allow it to be randomized on new map generation");
            else tip("Click to lock the option and always use the current value on new map generation");
            event.stopPropagation();
        });

        e.addEventListener("click", function (event) {
            const id = (this.id).slice(5);
            if (this.className === "icon-lock") unlock(id);
            else lock(id);
        });
    });

    // prevent default browser behavior for FMG-used hotkeys
    document.addEventListener("keydown", event => {
        if (event.altKey && event.keyCode !== 18) event.preventDefault(); // disallow alt key combinations
        if ([112, 113, 117, 120, 9].includes(event.keyCode)) event.preventDefault(); // F1, F2, F6, F9, Tab
    });

    const keys = Array.from(document.querySelectorAll('#mapLayers [data-keycode]'))
        .map(x => +x.dataset.keycode);
    document.addEventListener('keyup', e => {
        const key = e.keyCode;
        if (keys.includes(key)) {
            let layer = document.querySelector(`[data-keycode="${key}"]`)
            toggleLayer(layer.id, layer.dataset.layer);
        }
    });

    // Hotkeys, see github.com/Azgaar/Fantasy-Map-Generator/wiki/Hotkeys
    document.addEventListener("keyup", event => {
        const canvas3d = document.getElementById("canvas3d"); // check if 3d mode is active
        const active = document.activeElement.tagName;
        if (active === "INPUT" || active === "SELECT" || active === "TEXTAREA") return; // don't trigger if user inputs a text
        if (active === "DIV" && document.activeElement.contentEditable === "true") return; // don't trigger if user inputs a text
        event.stopPropagation();

        const key = event.keyCode;
        const ctrl = event.ctrlKey || event.metaKey || key === 17;
        const shift = event.shiftKey || key === 16;
        const alt = event.altKey || key === 18;

        if (key === 112) showInfo(); // "F1" to show info
        else if (key === 113) regeneratePrompt(); // "F2" for new map
        else if (key === 113) regeneratePrompt(); // "F2" for a new map
        else if (key === 117) quickSave(); // "F6" for quick save
        else if (key === 120) quickLoad(); // "F9" for quick load
        else if (key === 9) toggleOptions(event); // Tab to toggle options
        else if (key === 27) { closeDialogs(); hideOptions(); } // Escape to close all dialogs
        else if (key === 46) removeElementOnKey(); // "Delete" to remove the selected element
        else if (key === 79 && canvas3d) toggle3dOptions(); // "O" to toggle 3d options

        else if (ctrl && key === 81) toggleSaveReminder(); // Ctrl + "Q" to toggle save reminder
        else if (undo.offsetParent && ctrl && key === 90) undo.click(); // Ctrl + "Z" to undo
        else if (redo.offsetParent && ctrl && key === 89) redo.click(); // Ctrl + "Y" to redo

        else if (shift && key === 72) editHeightmap(); // Shift + "H" to edit Heightmap
        else if (shift && key === 66) editBiomes(); // Shift + "B" to edit Biomes
        else if (shift && key === 83) editStates(); // Shift + "S" to edit States
        else if (shift && key === 80) editProvinces(); // Shift + "P" to edit Provinces
        else if (shift && key === 68) editDiplomacy(); // Shift + "D" to edit Diplomacy
        else if (shift && key === 67) editCultures(); // Shift + "C" to edit Cultures
        else if (shift && key === 78) editNamesbase(); // Shift + "N" to edit Namesbase
        else if (shift && key === 90) editZones(); // Shift + "Z" to edit Zones
        else if (shift && key === 82) editReligions(); // Shift + "R" to edit Religions
        else if (shift && key === 81) editUnits(); // Shift + "Q" to edit Units
        else if (shift && key === 79) editNotes(); // Shift + "O" to edit Notes
        else if (shift && key === 84) overviewBurgs(); // Shift + "T" to open Burgs overview
        else if (shift && key === 86) overviewRivers(); // Shift + "V" to open Rivers overview
        else if (shift && key === 77) overviewMilitary(); // Shift + "M" to open Military overview
        else if (shift && key === 69) viewCellDetails(); // Shift + "E" to open Cell Details

        else if (shift && key === 49) toggleAddBurg(); // Shift + "1" to click to add Burg
        else if (shift && key === 50) toggleAddLabel(); // Shift + "2" to click to add Label
        else if (shift && key === 51) toggleAddRiver(); // Shift + "3" to click to add River
        else if (shift && key === 52) toggleAddRoute(); // Shift + "4" to click to add Route
        else if (shift && key === 53) toggleAddMarker(); // Shift + "5" to click to add Marker

        else if (alt && key === 66) console.table(pack.burgs); // Alt + "B" to log burgs data
        else if (alt && key === 83) console.table(pack.states); // Alt + "S" to log states data
        else if (alt && key === 67) console.table(pack.cultures); // Alt + "C" to log cultures data
        else if (alt && key === 82) console.table(pack.religions); // Alt + "R" to log religions data
        else if (alt && key === 70) console.table(pack.features); // Alt + "F" to log features data

        else if (key === 88) toggleTexture(); // "X" to toggle Texture layer
        else if (key === 71) toggleGrid(); // "G" to toggle Grid layer
        else if (key === 70) toggleRelief(); // "F" to toggle Relief icons layer
        else if (key === 83) toggleStates(); // "S" to toggle States layer
        else if (key === 74) toggleIce(); // "J" to toggle Ice layer
        else if (key === 189) toggleScaleBar(); // Minus (-) to toggle Scale bar

        else if (key === 37) zoom.translateBy(svg, 10, 0); // Left to scroll map left
        else if (key === 39) zoom.translateBy(svg, -10, 0); // Right to scroll map right
        else if (key === 38) zoom.translateBy(svg, 0, 10); // Up to scroll map up
        else if (key === 40) zoom.translateBy(svg, 0, -10); // Up to scroll map up
        else if (key === 107 || key === 109) pressNumpadSign(key); // Numpad Plus/Minus to zoom map or change brush size
        else if (key === 48 || key === 96) resetZoom(1000); // 0 to reset zoom
        else if (key === 49 || key === 97) zoom.scaleTo(svg, 1); // 1 to zoom to 1
        else if (key === 50 || key === 98) zoom.scaleTo(svg, 2); // 2 to zoom to 2
        else if (key === 51 || key === 99) zoom.scaleTo(svg, 3); // 3 to zoom to 3
        else if (key === 52 || key === 100) zoom.scaleTo(svg, 4); // 4 to zoom to 4
        else if (key === 53 || key === 101) zoom.scaleTo(svg, 5); // 5 to zoom to 5
        else if (key === 54 || key === 102) zoom.scaleTo(svg, 6); // 6 to zoom to 6
        else if (key === 55 || key === 103) zoom.scaleTo(svg, 7); // 7 to zoom to 7
        else if (key === 56 || key === 104) zoom.scaleTo(svg, 8); // 8 to zoom to 8
        else if (key === 57 || key === 105) zoom.scaleTo(svg, 9); // 9 to zoom to 9
        else if (ctrl) pressControl(); // Control to toggle mode
    });
}


export function tip(tip = "Tip is undefined", main, type, time) {
    const tooltip = document.getElementById("tooltip");
    tooltip.innerHTML = tip;
    tooltip.style.background = "linear-gradient(0.1turn, #ffffff00, #5e5c5c80, #ffffff00)";
    if (type === "error") tooltip.style.background = "linear-gradient(0.1turn, #ffffff00, #e11d1dcc, #ffffff00)"; else
        if (type === "warn") tooltip.style.background = "linear-gradient(0.1turn, #ffffff00, #be5d08cc, #ffffff00)"; else
            if (type === "success") tooltip.style.background = "linear-gradient(0.1turn, #ffffff00, #127912cc, #ffffff00)";

    if (main) tooltip.dataset.main = tip; // set main tip
    if (time) setTimeout(tooltip.dataset.main = "", time); // clear main in some time
}

export function showMainTip() {
    const tooltip = document.getElementById("tooltip");
    tooltip.innerHTML = tooltip.dataset.main;
}

export function clearMainTip() {
    const tooltip = document.getElementById("tooltip");
    tooltip.dataset.main = "";
    tooltip.innerHTML = "";
}

// show tip at the bottom of the screen, consider possible translation
function showDataTip(e) {
    if (!e.target) return;
    let dataTip = e.target.dataset.tip;
    if (!dataTip && e.target.parentNode.dataset.tip) dataTip = e.target.parentNode.dataset.tip;
    if (!dataTip) return;
    //const tooltip = lang === "en" ? dataTip : translate(e.target.dataset.t || e.target.parentNode.dataset.t, dataTip);
    tip(dataTip);
}

export function moved() {
    const point = d3.mouse(this);
    const i = findCell(point[0], point[1]); // pack cell id
    if (i === undefined) return;
    showNotes(d3.event, i);
    const g = findGridCell(point[0], point[1]); // grid cell id
    if (tooltip.dataset.main) showMainTip(); else showMapTooltip(point, d3.event, i, g);
    if (cellInfo.offsetParent) updateCellInfo(point, i, g);
}

// show note box on hover (if any)
function showNotes(e, i) {
    if (notesEditor.offsetParent) return;
    let id = e.target.id || e.target.parentNode.id || e.target.parentNode.parentNode.id;
    if (e.target.parentNode.parentNode.id === "burgLabels") id = "burg" + e.target.dataset.id; else
        if (e.target.parentNode.parentNode.id === "burgIcons") id = "burg" + e.target.dataset.id;

    const note = notes.find(note => note.id === id);
    if (note !== undefined && note.legend !== "") {
        document.getElementById("notes").style.display = "block";
        document.getElementById("notesHeader").innerHTML = note.name;
        document.getElementById("notesBody").innerHTML = note.legend;
    } else if (!options.pinNotes) {
        document.getElementById("notes").style.display = "none";
        document.getElementById("notesHeader").innerHTML = "";
        document.getElementById("notesBody").innerHTML = "";
    }
}

// show viewbox tooltip if main tooltip is blank
function showMapTooltip(point, e, i, g) {
    tip(""); // clear tip
    const tag = e.target.tagName;
    const path = e.composedPath ? e.composedPath() : getComposedPath(e.target); // apply polyfill
    if (!path[path.length - 8]) return;
    const group = path[path.length - 7].id;
    const subgroup = path[path.length - 8].id;
    const land = pack.cells[i].h >= 20;

    // specific elements
    if (group === "armies") {
        tip(e.target.parentNode.dataset.name + ". Click to edit");
        return;
    }
    if (group === "rivers") { tip(getRiverName(e.target.id) + "Click to edit"); return; }
    if (group === "routes") { tip("Click to edit the Route"); return; }
    if (group === "terrain") { tip("Click to edit the Relief Icon"); return; }
    if (subgroup === "burgLabels" || subgroup === "burgIcons") { tip("Click to open Burg Editor"); return; }
    if (group === "labels") { tip("Click to edit the Label"); return; }
    if (group === "markers") { tip("Click to edit the Marker"); return; }
    if (group === "ruler") {
        if (tag === "rect") { tip("Drag to split the ruler into 2 parts"); return; }
        if (tag === "circle") { tip("Drag to adjust the measurer"); return; }
        if (tag === "path" || tag === "line") { tip("Drag to move the measurer"); return; }
        if (tag === "text") { tip("Click to remove the measurer"); return; }
    }
    if (subgroup === "burgIcons") { tip("Click to edit the Burg"); return; }
    if (subgroup === "burgLabels") { tip("Click to edit the Burg"); return; }
    if (group === "lakes" && !land) { tip(`${capitalize(subgroup)} lake. Click to edit`); return; }
    if (group === "coastline") { tip("Click to edit the coastline"); return; }
    if (group === "zones") { tip(path[path.length - 8].dataset.description); return; }
    if (group === "ice") { tip("Click to edit the Ice"); return; }

    // covering elements
    if (layerIsOn("togglePrec") && land)
        tip("Annual Precipitation: " + getFriendlyPrecipitation(i));
    else if (layerIsOn("togglePopulation"))
        tip(getPopulationTip(i));
    else if (layerIsOn("toggleTemp"))
        tip("Temperature: " + convertTemperature(grid.cells[g].temp));
    else if (layerIsOn("toggleBiomes") && pack.cells[i].biome)
        tip("Biome: " + biomesData.name[pack.cells[i].biome]);
    else if (layerIsOn("toggleReligions") && pack.cells[i].religion) {
        const religion = pack.religions[pack.cells[i].religion];
        const type = religion.type === "Cult" || religion.type == "Heresy" ? religion.type : religion.type + " religion";
        tip(type + ": " + religion.name);
    }
    else if (pack.cells[i].state && (layerIsOn("toggleProvinces") || layerIsOn("toggleStates"))) {
        const state = pack.states[pack.cells[i].state].fullName;
        const province = pack.cells[i].province;
        const prov = province
            ? pack.provinces[province].fullName + ", "
            : "";
        tip(prov + state);
    }
    else if (layerIsOn("toggleCultures") && pack.cells[i].culture)
        tip("Culture: " + pack.cultures[pack.cells[i].culture].name);
    else if (layerIsOn("toggleHeight"))
        tip("Height: " + getFriendlyHeight(point));
}

function getRiverName(id) {
    const r = pack.rivers.find(r => r.i == id.slice(5));
    return r ? r.name + " " + r.type + ". " : "";
}

// get cell info on mouse move
function updateCellInfo(point, i, g) {
    const cells = pack.cells;
    const x = infoX.innerHTML = rn(point[0]);
    const y = infoY.innerHTML = rn(point[1]);
    const f = cells.f[i];
    infoLat.innerHTML = toDMS(mapCoordinates.latN - (y / graphHeight) * mapCoordinates.latT, "lat");
    infoLon.innerHTML = toDMS(mapCoordinates.lonW + (x / graphWidth) * mapCoordinates.lonT, "lon");

    infoCell.innerHTML = i;
    const unit = areaUnit.value === "square" ? " " + distanceUnitInput.value + "²" : " " + areaUnit.value;
    infoArea.innerHTML = cells[i].area
        ? si(cells[i].area * distanceScaleInput.value ** 2) + unit
        : "n/a";
    infoEvelation.innerHTML = getElevation(pack.features[f], pack.cells.h[i]);
    infoDepth.innerHTML = getDepth(pack.features[f], pack.cells.h[i], point);
    infoTemp.innerHTML = convertTemperature(grid.cells.temp[g]);
    infoPrec.innerHTML = cells.h[i] >= 20 ? getFriendlyPrecipitation(i) : "n/a";
    infoRiver.innerHTML = cells.h[i] >= 20 && cells.r[i] ? getRiverInfo(cells.r[i]) : "no";
    infoState.innerHTML = cells.h[i] >= 20 ? cells[i].state ? `${pack.states[cells[i].state].fullName} (${cells[i].state})` : "neutral lands (0)" : "no";
    infoProvince.innerHTML = cells[i].province ? `${pack.provinces[cells[i].province].fullName} (${cells[i].province})` : "no";
    infoCulture.innerHTML = cells[i].culture
        ? `${pack.cultures[cells[i].culture].name} (${cells[i].culture})`
        : "no";
    infoReligion.innerHTML = cells[i].religion ? `${pack.religions[cells[i].religion].name} (${cells[i].religion})` : "no";
    infoPopulation.innerHTML = getFriendlyPopulation(i);
    infoBurg.innerHTML = cells[i].burg ? pack.burgs[cells[i].burg].name + " (" + cells[i].burg + ")" : "no";
    infoFeature.innerHTML = f ? pack.features[f].group + " (" + f + ")" : "n/a";
    infoBiome.innerHTML = biomesData.name[cells[i].biome];
}

// convert coordinate to DMS format
function toDMS(coord, c) {
    const degrees = Math.floor(Math.abs(coord));
    const minutesNotTruncated = (Math.abs(coord) - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    const cardinal = c === "lat" ? coord >= 0 ? "N" : "S" : coord >= 0 ? "E" : "W";
    return degrees + "° " + minutes + "′ " + seconds + "″ " + cardinal;
}

// get surface elevation
function getElevation(f, h) {
    if (f.land) return getHeight(h) + " (" + h + ")"; // land: usual height
    if (f.border) return "0 " + heightUnit.value; // ocean: 0

    // lake: lowest coast height - 1
    const lakeCells = Array.from(pack.cells.map((v, k) => k)
        .filter(i => pack.cells.f[i] === f.i)
    );
    const heights = lakeCells.map(i => pack.cells[i].c.map(c => pack.cells.h[c])).flat().filter(h => h > 19);
    const elevation = (d3.min(heights) || 20) - 1;
    return getHeight(elevation) + " (" + elevation + ")";
}

// get water depth
function getDepth(f, h, p) {
    if (f.land) return "0 " + heightUnit.value; // land: 0
    if (!f.border) return getHeight(h, "abs"); // lake: pack abs height
    const gridH = grid.cells.h[findGridCell(p[0], p[1])];
    return getHeight(gridH, "abs"); // ocean: grig height
}

// get user-friendly (real-world) height value from map data
export function getFriendlyHeight(p) {
    const packH = pack.cells[findCell(p[0], p[1])].h;
    const gridH = grid.cells[findGridCell(p[0], p[1])].h;
    const h = packH < 20 ? gridH : packH;
    return getHeight(h);
}

export function getHeight(h, abs) {
    const unit = heightUnit.value;
    let unitRatio = 3.281; // default calculations are in feet
    if (unit === "m") unitRatio = 1; // if meter
    else if (unit === "f") unitRatio = 0.5468; // if fathom

    let height = -990;
    if (h >= 20) height = Math.pow(h - 18, +heightExponentInput.value);
    else if (h < 20 && h > 0) height = (h - 20) / h * 50;

    if (abs) height = Math.abs(height);
    return rn(height * unitRatio) + " " + unit;
}

// get user-friendly (real-world) precipitation value from map data
function getFriendlyPrecipitation(i) {
    const prec = grid.cells[pack.cells[i].g].prec;
    return prec * 100 + " mm";
}

function getRiverInfo(id) {
    const r = pack.rivers.find(r => r.i == id);
    return r ? `${r.name} ${r.type} (${id})` : "n/a";
}

export function getCellPopulation(i) {
    const rural = pack.cells[i].pop * populationRate.value;
    const urban = pack.cells[i].burg
        ? pack.burgs[pack.cells[i].burg].population * populationRate.value * urbanization.value
        : 0;
    return [rural, urban];
}

// get user-friendly (real-world) population value from map data
function getFriendlyPopulation(i) {
    const [rural, urban] = getCellPopulation(i);
    return `${si(rural + urban)} (${si(rural)} rural, urban ${si(urban)})`;
}

function getPopulationTip(i) {
    const [rural, urban] = getCellPopulation(i);
    return `Cell population: ${si(rural + urban)}; Rural: ${si(rural)}; Urban: ${si(urban)}`;
}

// lock option
export function lock(id) {
    const input = document.querySelector("[data-stored='" + id + "']");
    if (input) localStorage.setItem(id, input.value);
    const el = document.getElementById("lock_" + id);
    if (!el) return;
    el.dataset.locked = 1;
    el.className = "icon-lock";
}

// unlock option
export function unlock(id) {
    localStorage.removeItem(id);
    const el = document.getElementById("lock_" + id);
    if (!el) return;
    el.dataset.locked = 0;
    el.className = "icon-lock-open";
}

// check if option is locked
export function locked(id) {
    const lockEl = document.getElementById("lock_" + id);
    return lockEl.dataset.locked == 1;
}

// check if option is stored in localStorage
export function stored(option) {
    return localStorage.getItem(option);
}

// apply drop-down menu option. If the value is not in options, add it
export function applyOption(select, id, name = id) {
    const custom = !Array.from(select.options).some(o => o.value == id);
    if (custom) select.options.add(new Option(name, id));
    select.value = id;
}

// show info about the generator in a popup
function showInfo() {
    const Discord = link("https://discordapp.com/invite/X7E84HU", "Discord");
    const Reddit = link("https://www.reddit.com/r/FantasyMapGenerator", "Reddit")
    const Patreon = link("https://www.patreon.com/azgaar", "Patreon");
    const Trello = link("https://trello.com/b/7x832DG4/fantasy-map-generator", "Trello");

    const QuickStart = link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Quick-Start-Tutorial", "Quick start tutorial");
    const QAA = link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Q&A", "Q&A page");

    alertMessage.innerHTML = `
    <b>Fantasy Map Generator</b> (FMG) is an open-source application, it means the code is published an anyone can use it. 
    In case of FMG is also means that you own all created maps and can use them as you wish, you can even sell them.

    <p>The development is supported by community, you can donate on ${Patreon}.
    You can also help creating overviews, tutorials and spreding the word about the Generator.</p>

    <p>The best way to get help is to contact the community on ${Discord} and ${Reddit}. 
    Before asking questions, please check out the ${QuickStart} and the ${QAA}.</p>

    <p>You can track the development process on ${Trello}.</p>

    Links:
    <ul style="columns:2">
      <li>${link("https://github.com/Azgaar/Fantasy-Map-Generator", "GitHub repository")}</li>
      <li>${link("https://github.com/Azgaar/Fantasy-Map-Generator/blob/master/LICENSE", "License")}</li>
      <li>${link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog", "Changelog")}</li>
      <li>${link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Hotkeys", "Hotkeys")}</li>
    </ul>`;

    $("#alert").dialog({
        resizable: false, title: document.title, width: "28em",
        buttons: { OK: function () { $(this).dialog("close"); } },
        position: { my: "center", at: "center", of: "svg" }
    });
}

function pressNumpadSign(key) {
    // if brush sliders are displayed, decrease brush size
    let brush = null;
    const d = key === 107 ? 1 : -1;

    if (brushRadius.offsetParent) brush = document.getElementById("brushRadius"); else
        if (biomesManuallyBrush.offsetParent) brush = document.getElementById("biomesManuallyBrush"); else
            if (statesManuallyBrush.offsetParent) brush = document.getElementById("statesManuallyBrush"); else
                if (provincesManuallyBrush.offsetParent) brush = document.getElementById("provincesManuallyBrush"); else
                    if (culturesManuallyBrush.offsetParent) brush = document.getElementById("culturesManuallyBrush"); else
                        if (zonesBrush.offsetParent) brush = document.getElementById("zonesBrush"); else
                            if (religionsManuallyBrush.offsetParent) brush = document.getElementById("religionsManuallyBrush");

    if (brush) {
        const value = Math.max(Math.min(+brush.value + d, +brush.max), +brush.min);
        brush.value = document.getElementById(brush.id + "Number").value = value;
        return;
    }

    const scaleBy = key === 107 ? 1.2 : .8;
    zoom.scaleBy(svg, scaleBy); // if no, zoom map
}

function pressControl() {
    if (zonesRemove.offsetParent) {
        zonesRemove.classList.contains("pressed") ? zonesRemove.classList.remove("pressed") : zonesRemove.classList.add("pressed");
    }
}

// trigger trash button click on "Delete" keypress
function removeElementOnKey() {
    $(".dialog:visible .fastDelete").click();
    $("button:visible:contains('Remove')").click();
}