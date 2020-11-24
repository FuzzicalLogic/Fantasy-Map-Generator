import {
    modules, options,
    seed, nameBases,
    graphWidth, graphHeight, 
    camera,
    view, oceanPattern, oceanLayers,
    mapHistory, regenerateMap,
    customization
} from "../../main.js";

import * as Names from "../names-generator.js";

import * as ThreeD from "./3d.js";

import { fitScaleBar } from "./measurers.js";

import { saveGeoJSON_Cells, saveGeoJSON_Roads, saveGeoJSON_Rivers, saveGeoJSON_Markers, uploadMap } from "../save-and-load.js";

import { tip, stored, applyOption, clearMainTip, lock, unlock, locked } from "./general.js";
import { P, gauss, rn, link, rw, last, rand } from "../utils.js";
import { closeDialogs, fitContent, fitLegendBox } from "./editors.js";


let getById = id => document.getElementById(id);
export const doc = {
    get seed() {
        return getById('optionsSeed').value
    },
    mapWidthInput: () => getById('mapWidthInput'),
    mapHeightInput: () => getById('mapHeightInput'),
    regionsInput: () => getById('regionsInput'),
    regionsOutput: () => getById('regionsOutput'),
    provincesInput: () => getById('provincesInput'),
    provincesOutput: () => getById('provincesOutput'),
    manorsInput: () => getById('manorsInput'),
    manorsOutput: () => getById('manorsOutput'),
    religionsInput: () => getById('religionsInput'),
    religionsOutput: () => getById('religionsOutput'),
    powerInput: () => getById('powerInput'),
    powerOutput: () => getById('powerOutput'),
    neutralInput: () => getById('neutralInput'),
    neutralOutput: () => getById('neutralOutput'),
    culturesInput: () => getById('culturesInput'),
    culturesOutput: () => getById('culturesOutput'),
    temperatureEquatorOutput: () => getById('temperatureEquatorOutput'),
    temperatureEquatorInput: () => getById('temperatureEquatorInput'),
    temperaturePoleOutput: () => getById('temperaturePoleOutput'),
    temperaturePoleInput: () => getById('temperaturePoleInput'),
    precInput: () => getById('precInput'),
    precOutput: () => getById('precOutput'),
    distanceScaleOutput: () => getById('distanceScaleOutput'),
    distanceScaleInput: () => getById('distanceScaleInput'),
    distanceUnitInput: () => getById('distanceUnitInput'),
    heightUnit: () => getById('heightUnit'),
    temperatureScale: () => getById('temperatureScale')
}

export const optionsContent = getById("optionsContent");

export function initialize() {
    //$("#optionsContainer").draggable({ handle: ".drag-trigger", snap: "svg", snapMode: "both" });
    $("#exitCustomization").draggable({ handle: "div" });
    $("#mapLayers").disableSelection();

    // remove glow if tip is aknowledged
    if (localStorage.getItem("disable_click_arrow_tooltip")) {
        clearMainTip();
        optionsTrigger.classList.remove("glow");
    }

    // Activate options tab on click
    getById("options").querySelector(".tab").addEventListener("click", function (event) {
        if (event.target.tagName !== "BUTTON") return;
        const id = event.target.id;
        const active = getById("options").querySelector(".tab > button.active");
        if (active && id === active.id) return; // already active tab is clicked

        if (active)
            active.classList.remove("active");
        getById(id).classList.add("active");
        getById("options").querySelectorAll(".tabcontent")
            .forEach(e => e.setAttribute('hidden',''));

        if (id === "layersTab")
            layersContent.removeAttribute('hidden');
        else if (id === "styleTab")
            styleContent.removeAttribute('hidden');
        else if (id === "optionsTab")
            optionsContent.removeAttribute('hidden');
        else if (id === "toolsTab") customization === 1
            ? customizationMenu.removeAttribute('hidden')
            : toolsContent.removeAttribute('hidden');
        else if (id === "aboutTab")
            aboutContent.removeAttribute('hidden');
    });

    optionsContent.addEventListener("input", function (event) {
        const { id, value } = event.target;

        if (id === "mapWidthInput" || id === "mapHeightInput")
            mapSizeInputChange();
        else if (id === "densityInput" || id === "densityOutput")
            changeCellsDensity(+value);
        else if (id === "culturesInput")
            doc.culturesOutput().value = value;
        else if (id === "culturesOutput")
            doc.culturesInput().value = value;
        else if (id === "culturesSet")
            changeCultureSet();
        else if (id === "regionsInput" || id === "regionsOutput")
            changeStatesNumber(value);
        else if (id === "provincesInput")
            doc.provincesOutput().value = value;
        else if (id === "provincesOutput")
            doc.provincesOutput().value = value;
        else if (id === "provincesOutput")
            doc.powerOutput().value = value;
        else if (id === "powerInput")
            doc.powerOutput().value = value;
        else if (id === "powerOutput")
            doc.powerInput().value = value;
        else if (id === "neutralInput")
            doc.neutralOutput().value = value;
        else if (id === "neutralOutput")
            doc.neutralInput().value = value;
        else if (id === "manorsInput")
            changeBurgsNumberSlider(value);
        else if (id === "religionsInput")
            doc.religionsOutput().value = value;
        else if (id === "uiSizeInput")
            uiSizeOutput.value = value;
        else if (id === "uiSizeOutput")
            changeUIsize(value);
        else if (id === "tooltipSizeInput" || id === "tooltipSizeOutput")
            changeTooltipSize(value);
        else if (id === "transparencyInput")
            changeDialogsTransparency(value);
    });

    optionsContent.addEventListener("change", function (event) {
        if (event.target.dataset.stored)
            lock(event.target.dataset.stored);
        const { id, value } = event.target;
        console.log(`${id} change: ${value}`);
        if (id === "zoomExtentMin" || id === "zoomExtentMax")
            changeZoomExtent(value);
        else if (id === "optionsSeed")
            generateMapWithSeed();
        else if (id === "uiSizeInput")
            changeUIsize(value);
        else if (id === "yearInput")
            changeYear(value);
        else if (id === "eraInput")
            changeEra(value);
    });

    optionsContent.addEventListener("click", function (event) {
        const id = event.target.id;
        if (id === "toggleFullscreen")
            toggleFullscreen();
        else if (id === "optionsSeedGenerate")
            generateMapWithSeed();
        else if (id === "optionsMapHistory")
            showSeedHistoryDialog();
        else if (id === "optionsCopySeed")
            copyMapURL();
        else if (id === "optionsEraRegenerate")
            regenerateEra();
        else if (id === "zoomExtentDefault")
            restoreDefaultZoomExtent();
        else if (id === "translateExtent")
            toggleTranslateExtent(event.target);
    });


    // Sticked menu Options listeners
    getById("sticked").addEventListener("click", function (event) {
        const id = event.target.id;
        if (id === "newMapButton")
            regeneratePrompt();
        else if (id === "saveButton")
            showSavePane();
        else if (id === "loadButton")
            showLoadPane();
        else if (id === "zoomReset")
            camera.reset();
    });

    // load map
    getById("mapToLoad").addEventListener("change", function () {
        const fileToLoad = this.files[0];
        this.value = "";
        closeDialogs();
        uploadMap(fileToLoad);
    });

    // View mode
    viewMode.addEventListener("click", changeViewMode);
    window.restoreDefaultOptions = restoreDefaultOptions;
    window.showSupporters = showSupporters;
    window.hideOptions = hideOptions;
    window.showOptions = showOptions;
    window.toggleOptions = toggleOptions;
    window.regeneratePrompt = regeneratePrompt;
    window.loadURL = loadURL;
}

// Show options pane on trigger click
export function showOptions(event) {
    if (!localStorage.getItem("disable_click_arrow_tooltip")) {
        clearMainTip();
        localStorage.setItem("disable_click_arrow_tooltip", true);
        optionsTrigger.classList.remove("glow");
    }

    optionsTrigger.classList.add('Pressed');
    getById("options").style.display = '';

    if (event) event.stopPropagation();
}

// Hide options pane on trigger click
export function hideOptions(event) {
    optionsTrigger.classList.remove('Pressed');
    getById("options").style.display = "none";
    if (event) event.stopPropagation();
}

// To toggle options on hotkey press
export function toggleOptions(event) {
    if (!getById("optionsTrigger").classList.contains('Pressed'))
        showOptions(event);
    else hideOptions(event);
}

// show popup with a list of Patreon supportes (updated manually, to be replaced with API call)
function showSupporters() {
    const supporters = "Aaron Meyer, Ahmad Amerih, AstralJacks, aymeric, Billy Dean Goehring, Branndon Edwards, Chase Mayers, Curt Flood, cyninge, Dino Princip, E.M. White, es, Fondue, Fritjof Olsson, Gatsu, Johan Fröberg, Jonathan Moore, Joseph Miranda, Kate, KC138, Luke Nelson, Markus Finster, Massimo Vella, Mikey, Nathan Mitchell, Paavi1, Pat, Ryan Westcott, Sasquatch, Shawn Spencer, Sizz_TV, Timothée CALLET, UTG community, Vlad Tomash, Wil Sisney, William Merriott, Xariun, Gun Metal Games, Scott Marner, Spencer Sherman, Valerii Matskevych, Alloyed Clavicle, Stewart Walsh, Ruthlyn Mollett (Javan), Benjamin Mair-Pratt, Diagonath, Alexander Thomas, Ashley Wilson-Savoury, William Henry, Preston Brooks, JOSHUA QUALTIERI, Hilton Williams, Katharina Haase, Hisham Bedri, Ian arless, Karnat, Bird, Kevin, Jessica Thomas, Steve Hyatt, Logicspren, Alfred García, Jonathan Killstring, John Ackley, Invad3r233, Norbert Žigmund, Jennifer, PoliticsBuff, _gfx_, Maggie, Connor McMartin, Jared McDaris, BlastWind, Franc Casanova Ferrer, Dead & Devil, Michael Carmody, Valerie Elise, naikibens220, Jordon Phillips, William Pucs, The Dungeon Masters, Brady R Rathbun, J, Shadow, Matthew Tiffany, Huw Williams, Joseph Hamilton, FlippantFeline, Tamashi Toh, kms, Stephen Herron, MidnightMoon, Whakomatic x, Barished, Aaron bateson, Brice Moss, Diklyquill, PatronUser, Michael Greiner, Steven Bennett, Jacob Harrington, Miguel C., Reya C., Giant Monster Games, Noirbard, Brian Drennen, Ben Craigie, Alex Smolin, Endwords, Joshua E Goodwin, SirTobit , Allen S. Rout, Allen Bull Bear, Pippa Mitchell, R K, G0atfather, Ryan Lege, Caner Oleas Pekgönenç, Bradley Edwards, Tertiary , Austin Miller, Jesse Holmes, Jan Dvořák, Marten F, Erin D. Smale, Maxwell Hill, Drunken_Legends, rob bee, Jesse Holmes, YYako, Detocroix, Anoplexian, Hannah, Paul, Sandra Krohn, Lucid, Richard Keating, Allen Varney, Rick Falkvinge, Seth Fusion, Adam Butler, Gus, StroboWolf, Sadie Blackthorne, Zewen Senpai, Dell McKnight, Oneiris, Darinius Dragonclaw Studios, Christopher Whitney, Rhodes HvZ, Jeppe Skov Jensen, María Martín López, Martin Seeger, Annie Rishor, Aram Sabatés, MadNomadMedia";
    alertMessage.innerHTML = "<ul style='column-count: 3; column-gap: 2em'>" + supporters.split(", ").sort().map(n => `<li>${n}</li>`).join("") + "</ul>";
    $("#alert").dialog({
        resizable: false,
        title: "Patreon Supporters",
        width: "30vw", position: { my: "center", at: "center", of: "svg" }
    });
}

// Option listeners
function mapSizeInputChange() {
    changeMapSize();
    localStorage.setItem("mapWidth", doc.mapWidthInput().value);
    localStorage.setItem("mapHeight", doc.mapHeightInput().value);
}

// change svg size on manual size change or window resize, do not change graph size
export function changeMapSize() {
    view.svg.attr("width", Math.min(+doc.mapWidthInput().value, window.innerWidth))
        .attr("height", Math.min(+doc.mapHeightInput().value, window.innerHeight));

    const maxWidth = Math.max(+doc.mapWidthInput().value, graphWidth);
    const maxHeight = Math.max(+doc.mapHeightInput().value, graphHeight);
    camera.setBoundaries([0, 0], [maxWidth, maxHeight]);
    view.landmass.select("rect").attr("x", 0).attr("y", 0).attr("width", maxWidth).attr("height", maxHeight);
    oceanPattern.select("rect").attr("x", 0).attr("y", 0).attr("width", maxWidth).attr("height", maxHeight);
    oceanLayers.select("rect").attr("x", 0).attr("y", 0).attr("width", maxWidth).attr("height", maxHeight);

    fitScaleBar();
    fitLegendBox();
}

function toggleFullscreen() {
    if (doc.mapWidthInput().value != window.innerWidth || doc.mapHeightInput().value != window.innerHeight) {
        doc.mapWidthInput().value = window.innerWidth;
        doc.mapHeightInput().value = window.innerHeight;
        localStorage.removeItem("mapHeight");
        localStorage.removeItem("mapWidth");
    } else {
        mapWidthInput.value = graphWidth;
        mapHeightInput.value = graphHeight;
    }
    changeMapSize();
}

function toggleTranslateExtent(el) {
    const on = el.dataset.on = +!(+el.dataset.on);
    if (on)
        camera.setBoundaries([-graphWidth / 2, -graphHeight / 2], [graphWidth * 1.5, graphHeight * 1.5]);
    else camera.setBoundaries([0, 0], [graphWidth, graphHeight]);
}

function generateMapWithSeed() {
    if (doc.seed.value == seed) {
        tip("The current map already has this seed", false, "error");
        return;
    }
    regeneratePrompt();
}

function showSeedHistoryDialog() {
    const alert = mapHistory.map(function (h, i) {
        const created = new Date(h.created).toLocaleTimeString();
        const button = `<i data-tip"Click to generate a map with this seed" onclick="restoreSeed(${i})" class="icon-history optionsSeedRestore"></i>`;
        return `<div>${i + 1}. Seed: ${h.seed} ${button}. Size: ${h.width}x${h.height}. Template: ${h.template}. Created: ${created}</div>`;
    }).join("");
    alertMessage.innerHTML = alert;
    $("#alert").dialog({
        resizable: false, title: "Seed history",
        width: fitContent(), position: { my: "center", at: "center", of: "svg" }
    });
}

// generate map with historycal seed
function restoreSeed(id) {
    if (mapHistory[id].seed == seed) {
        tip("The current map is already generated with this seed", null, "error");
        return;
    }
    doc.seed.value = mapHistory[id].seed;
    doc.mapWidthInput().value = mapHistory[id].width;
    doc.mapHeightInput().value = mapHistory[id].height;
    templateInput.value = mapHistory[id].template;
    if (locked("template")) unlock("template");
    regeneratePrompt();
}

function restoreDefaultZoomExtent() {
    zoomExtentMin.value = 1;
    zoomExtentMax.value = 20;
    camera.setZoomLimit()
    camera.reset();
}

function copyMapURL() {
    const locked = document.querySelectorAll("i.icon-lock").length; // check if some options are locked
    const search = `?seed=${optionsSeed.value}&width=${graphWidth}&height=${graphHeight}${locked ? '' : '&options=default'}`;
    navigator.clipboard.writeText(location.host + location.pathname + search)
        .then(() => {
            tip("Map URL is copied to clipboard", false, "success", 3000);
            //window.history.pushState({}, null, search);
        })
        .catch(err => tip("Could not copy URL: " + err, false, "error", 5000));
}

function changeCellsDensity(value) {
    densityOutput.value = value * 10 + "K";
    if (value > 5) densityOutput.style.color = "#b12117";
    else if (value > 1) densityOutput.style.color = "#dfdf12";
    else densityOutput.style.color = "#038603";
}

function changeCultureSet() {
    const max = culturesSet.selectedOptions[0].dataset.max;
    doc.culturesInput().max = doc.culturesOutput().max = max
    if (+doc.culturesOutput().value > +max)
        doc.culturesInput().value = doc.culturesOutput().value = max;
}

function changeStatesNumber(value) {
    doc.regionsInput().value = doc.regionsOutput().value = value;
    doc.regionsOutput().style.color = +value ? null : "#b12117";
    burgLabels.select("#capitals").attr("data-size", Math.max(rn(6 - value / 20), 3));
    view.labels.select("#countries").attr("data-size", Math.max(rn(18 - value / 6), 4));
}

function changeBurgsNumberSlider(value) {
    doc.manorsOutput().value = value == 1000 ? "auto" : value;
}

function changeUIsize(value) {
    if (isNaN(+value) || +value > 4 || +value < .5) return;
    uiSizeInput.value = uiSizeOutput.value = value;
    document.getElementsByTagName("body")[0].style.fontSize = `${1 + (value - 1) * 0.1}rem`;
}

function changeTooltipSize(value) {
    const tooltip = getById("tooltip");
    tooltipSizeInput.value = tooltipSizeOutput.value = value;
    tooltip.style.fontSize = `calc(${value}px + 0.5vw)`;
}

// change transparency for modal windows
function changeDialogsTransparency(value) {
    transparencyInput.value = transparencyOutput.value = value;
    const alpha = (100 - +value) / 100;
    document.documentElement.style.setProperty('--ui-opacity', alpha);
}

function changeZoomExtent(value) {
    const min = Math.max(+zoomExtentMin.value, .01),
        max = Math.min(+zoomExtentMax.value, 200);
    camera.setZoomLimit([min, max]);
    const scale = Math.max(Math.min(+value, 200), .01);
    camera.zoom(scale);
}

// control stored options logic
export function applyStoredOptions() {
    if (!localStorage.getItem("mapWidth") || !localStorage.getItem("mapHeight")) {
        doc.mapWidthInput().value = window.innerWidth;
        doc.mapHeightInput().value = window.innerHeight;
    }

    if (localStorage.getItem("distanceUnit"))
        applyOption(distanceUnitInput, localStorage.getItem("distanceUnit"));
    if (localStorage.getItem("heightUnit"))
        applyOption(heightUnit, localStorage.getItem("heightUnit"));

    for (let i = 0; i < localStorage.length; i++) {
        const stored = localStorage.key(i),
            value = localStorage.getItem(stored);
        const input = getById(stored + "Input") || getById(stored);
        const output = getById(stored + "Output");
        if (input)
            input.value = value;
        if (output)
            output.value = value;
        lock(stored);

        // add saved style presets to options
        if (stored.slice(0, 5) === "style")
            applyOption(stylePreset, stored, stored.slice(5));
    }

    if (localStorage.getItem("winds"))
        options.winds = localStorage.getItem("winds").split(",").map(w => +w);
    if (localStorage.getItem("military"))
        options.military = JSON.parse(localStorage.getItem("military"));

    changeDialogsTransparency(localStorage.getItem("transparency") || 5);
    if (localStorage.getItem("tooltipSize"))
        changeTooltipSize(localStorage.getItem("tooltipSize"));
    if (localStorage.getItem("regions"))
        changeStatesNumber(localStorage.getItem("regions"));

    if (localStorage.getItem("uiSize"))
        changeUIsize(localStorage.getItem("uiSize"));
    else changeUIsize(Math.max(Math.min(rn(mapWidthInput.value / 1280, 1), 2.5), 1));

    // search params overwrite stored and default options
    const params = new URL(window.location.href).searchParams;
    const width = +params.get("width");
    const height = +params.get("height");
    if (width) mapWidthInput.value = width;
    if (height) mapHeightInput.value = height;
    //window.history.pushState({}, null, "?");
}

// randomize options if randomization is allowed (not locked or options='default')
export function randomizeOptions() {
    Math.seedrandom(seed); // reset seed to initial one
    const randomize = new URL(window.location.href).searchParams.get("options") === "default"; // ignore stored options

    // 'Options' settings
    if (randomize || !locked("template")) randomizeHeightmapTemplate();
    if (randomize || !locked("regions"))
        doc.regionsInput().value = doc.regionsOutput().value = gauss(15, 3, 2, 30);
    if (randomize || !locked("provinces"))
        doc.provincesInput().value = doc.provincesOutput().value = gauss(20, 10, 20, 100);
    if (randomize || !locked("manors")) {
        doc.manorsInput().value = 1000;
        doc.manorsOutput().value = "auto";
    }
    if (randomize || !locked("religions"))
        doc.religionsInput().value = doc.religionsOutput().value = gauss(5, 2, 2, 10);
    if (randomize || !locked("power"))
        doc.powerInput().value = doc.powerOutput().value = gauss(4, 2, 0, 10, 2);
    if (randomize || !locked("neutral"))
        doc.neutralInput().value = doc.neutralOutput().value = rn(1 + Math.random(), 1);
    if (randomize || !locked("cultures"))
        doc.culturesInput().value = doc.culturesOutput().value = gauss(12, 3, 5, 30);
    if (randomize || !locked("culturesSet")) randomizeCultureSet();

    // 'Configure World' settings
    if (randomize || !locked("prec"))
        doc.precInput().value = doc.precOutput().value = gauss(120, 20, 5, 500);
    const tMax = +doc.temperatureEquatorOutput().max,
        tMin = +doc.temperatureEquatorOutput().min; // temperature extremes
    if (randomize || !locked("temperatureEquator"))
        doc.temperatureEquatorOutput().value = doc.temperatureEquatorInput().value = rand(tMax - 6, tMax);
    if (randomize || !locked("temperaturePole"))
        doc.temperaturePoleOutput().value = doc.temperaturePoleInput().value = rand(tMin, tMin + 10);

    // 'Units Editor' settings
    const US = navigator.language === "en-US";
    const UK = navigator.language === "en-GB";
    if (randomize || !locked("distanceScale"))
        doc.distanceScaleOutput().value = doc.distanceScaleInput().value = gauss(3, 1, 1, 5);
    if (!stored("distanceUnit"))
        doc.distanceUnitInput().value = US || UK ? "mi" : "km";
    if (!stored("heightUnit")) doc.heightUnit().value = US || UK ? "ft" : "m";
    if (!stored("temperatureScale")) doc.temperatureScale().value = US ? "°F" : "°C";

    // World settings
    generateEra();
}

// select heightmap template pseudo-randomly
function randomizeHeightmapTemplate() {
    const templates = {
        "Volcano": 3,
        "High Island": 22,
        "Low Island": 9,
        "Continents": 20,
        "Archipelago": 25,
        "Mediterranean": 3,
        "Peninsula": 3,
        "Pangea": 5,
        "Isthmus": 2,
        "Atoll": 1,
        "Shattered": 7
    };
    getById("templateInput").value = rw(templates);
}

// select culture set pseudo-randomly
function randomizeCultureSet() {
    const sets = {
        "world": 25,
        "european": 20,
        "oriental": 10,
        "english": 10,
        "antique": 5,
        "highFantasy": 22,
        "darkFantasy": 6,
        "random": 2
    };
    culturesSet.value = rw(sets);
    changeCultureSet();
}

// generate current year and era name
function generateEra() {
    if (!stored("year"))
        yearInput.value = rand(100, 2000); // current year
    if (!stored("era"))
        eraInput.value = Names.getBaseShort(P(.7) ? 1 : rand(nameBases.length)) + " Era";
    options.year = +yearInput.value;
    options.era = eraInput.value;
    options.eraShort = options.era.split(" ").map(w => w[0].toUpperCase()).join(""); // short name for era
}

function regenerateEra() {
    unlock("era");
    options.era = eraInput.value = Names.getBaseShort(P(.7) ? 1 : rand(nameBases.length)) + " Era";
    options.eraShort = options.era.split(" ").map(w => w[0].toUpperCase()).join("");
}

function changeYear(value) {
    if (!!!value || isNaN(+value)) {
        tip("Current year should be a number", false, "error");
        return;
    }
    options.year = +value;
}

function changeEra(value) {
    if (!value) return;
    lock("era");
    options.era = value;
}

// remove all saved data from LocalStorage and reload the page
function restoreDefaultOptions() {
    localStorage.clear();
    location.reload();
}

export function regeneratePrompt() {
    if (customization) { tip("New map cannot be generated when edit mode is active, please exit the mode and retry", false, "error"); return; }
    const workingTime = (Date.now() - last(mapHistory).created) / 60000; // minutes
    if (workingTime < 5) { regenerateMap(); return; }

    alertMessage.innerHTML = `Are you sure you want to generate a new map?<br>
  All unsaved changes made to the current map will be lost`;
    $("#alert").dialog({
        resizable: false, title: "Generate new map",
        buttons: {
            Cancel: function () { $(this).dialog("close"); },
            Generate: function () { closeDialogs(); regenerateMap(); }
        }
    });
}

function showSavePane() {
    $("#saveMapData").dialog({
        title: "Save map", resizable: false, width: "27em",
        position: { my: "center", at: "center", of: "svg" },
        buttons: { Close: function () { $(this).dialog("close"); } }
    });
}

// download map data as GeoJSON
export function saveGeoJSON() {
    alertMessage.innerHTML = `You can export map data in GeoJSON format used in GIS tools such as QGIS.
  Check out ${link("https://github.com/Azgaar/Fantasy-Map-Generator/wiki/GIS-data-export", "wiki-page")} for guidance`;

    $("#alert").dialog({
        title: "GIS data export", resizable: false, width: "35em", position: { my: "center", at: "center", of: "svg" },
        buttons: {
            Cells: saveGeoJSON_Cells,
            Routes: saveGeoJSON_Roads,
            Rivers: saveGeoJSON_Rivers,
            Markers: saveGeoJSON_Markers,
            Close: function () { $(this).dialog("close"); }
        }
    });
}

function showLoadPane() {
    $("#loadMapData").dialog({
        title: "Load map", resizable: false, width: "17em",
        position: { my: "center", at: "center", of: "svg" },
        buttons: { Close: function () { $(this).dialog("close"); } }
    });
}

export function loadURL() {
    const pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    const inner = `Provide URL to a .map file:
    <input id="mapURL" type="url" style="width: 24em" placeholder="https://e-cloud.com/test.map">
    <br><i>Please note server should allow CORS for file to be loaded. If CORS is not allowed, save file to Dropbox and provide a direct link</i>`;
    alertMessage.innerHTML = inner;
    $("#alert").dialog({
        resizable: false, title: "Load map from URL", width: "27em",
        buttons: {
            Load: function () {
                const value = mapURL.value;
                if (!pattern.test(value)) { tip("Please provide a valid URL", false, "error"); return; }
                loadMapFromURL(value);
                $(this).dialog("close");
            },
            Cancel: function () { $(this).dialog("close"); }
        }
    });
}

export function changeViewMode(ev) {
    const button = ev.target;
    if (button.tagName !== "BUTTON") return;
    const isPressed = button.hasAttribute('disabled');
    enterStandardView();

    if (!isPressed && button.id !== "viewStandard") {
        viewStandard.removeAttribute('disabled');
        button.setAttribute('disabled','');
        enter3dView(button.id);
    }
}

export function enterStandardView() {
    viewMode.querySelectorAll(':disabled').forEach(
        button => button.removeAttribute('disabled')
    );
    heightmap3DView.classList.remove("pressed");
    viewStandard.setAttribute('disabled','');

    if (getById("canvas3d")) {
        ThreeD.stop();
        getById("canvas3d").remove();
        if (options3dUpdate.offsetParent)
            $("#options3d").dialog("close");
        if (preview3d.offsetParent)
            $("#preview3d").dialog("close");
    }
}

async function enter3dView(type) {
    const canvas = document.createElement("canvas");
    canvas.id = "canvas3d";
    canvas.dataset.type = type;

    if (type === "heightmap3DView") {
        canvas.width = parseFloat(preview3d.style.width) || graphWidth / 3;
        canvas.height = canvas.width / (graphWidth / graphHeight);
        canvas.style.display = "block";
    } else {
        canvas.width = view.width;
        canvas.height = view.height;
        canvas.style.position = "absolute";
        canvas.style.display = "none";
    }

    const started = await ThreeD.create(canvas, type);
    if (!started) return;

    canvas.style.display = "block";
    canvas.onmouseenter = () => {
        const help = "Left mouse to change angle, middle mouse / mousewheel to zoom, right mouse to pan. <b>O</b> to toggle options";
        +canvas.dataset.hovered > 2 ? tip("") : tip(help);
        canvas.dataset.hovered = (+canvas.dataset.hovered | 0) + 1;
    };

    if (type === "heightmap3DView") {
        getById("preview3d").appendChild(canvas);
        $("#preview3d").dialog({
            title: "3D Preview", resizable: true,
            position: { my: "left bottom", at: "left+10 bottom-20", of: "svg" },
            resizeStop: resize3d, close: enterStandardView
        });
    } else document.body.insertBefore(canvas, optionsContainer);

    toggle3dOptions();
}

function resize3d() {
    const canvas = getById("canvas3d");
    canvas.width = parseFloat(preview3d.style.width);
    canvas.height = parseFloat(preview3d.style.height) - 2;
    ThreeD.redraw();
}

export function toggle3dOptions() {
    if (options3dUpdate.offsetParent) { $("#options3d").dialog("close"); return; }
    $("#options3d").dialog({
        title: "3D mode settings", resizable: false, width: fitContent(),
        position: { my: "right top", at: "right-30 top+10", of: "svg", collision: "fit" }
    });

    updateValues();

    if (modules.options3d) return;
    modules.options3d = true;

    getById("options3dUpdate").addEventListener("click", ThreeD.update);
    getById("options3dSave").addEventListener("click", ThreeD.saveScreenshot);

    getById("options3dScaleRange").addEventListener("input", changeHeightScale);
    getById("options3dScaleNumber").addEventListener("change", changeHeightScale);
    getById("options3dLightnessRange").addEventListener("input", changeLightness);
    getById("options3dLightnessNumber").addEventListener("change", changeLightness);
    getById("options3dSunX").addEventListener("change", changeSunPosition);
    getById("options3dSunY").addEventListener("change", changeSunPosition);
    getById("options3dSunZ").addEventListener("change", changeSunPosition);
    getById("options3dMeshRotationRange").addEventListener("input", changeRotation);
    getById("options3dMeshRotationNumber").addEventListener("change", changeRotation);
    getById("options3dGlobeRotationRange").addEventListener("input", changeRotation);
    getById("options3dGlobeRotationNumber").addEventListener("change", changeRotation);
    getById("options3dMeshSkyMode").addEventListener("change", toggleSkyMode);
    getById("options3dMeshSky").addEventListener("input", changeColors);
    getById("options3dMeshWater").addEventListener("input", changeColors);
    getById("options3dGlobeResolution").addEventListener("change", changeResolution);

    function updateValues() {
        const globe = getById("canvas3d").dataset.type === "viewGlobe";
        options3dMesh.style.display = globe ? "none" : "block";
        options3dGlobe.style.display = globe ? "block" : "none";
        options3dScaleRange.value = options3dScaleNumber.value = ThreeD.options.scale;
        options3dLightnessRange.value = options3dLightnessNumber.value = ThreeD.options.lightness * 100;
        options3dSunX.value = ThreeD.options.sun.x;
        options3dSunY.value = ThreeD.options.sun.y;
        options3dSunZ.value = ThreeD.options.sun.z;
        options3dMeshRotationRange.value = options3dMeshRotationNumber.value = ThreeD.options.rotateMesh;
        options3dGlobeRotationRange.value = options3dGlobeRotationNumber.value = ThreeD.options.rotateGlobe;
        options3dMeshSkyMode.value = ThreeD.options.extendedWater;
        options3dColorSection.style.display = ThreeD.options.extendedWater ? "block" : "none";
        options3dMeshSky.value = ThreeD.options.skyColor;
        options3dMeshWater.value = ThreeD.options.waterColor;
        options3dGlobeResolution.value = ThreeD.options.resolution;
    }

    function changeHeightScale() {
        options3dScaleRange.value = options3dScaleNumber.value = this.value;
        ThreeD.setScale(+this.value);
    }

    function changeLightness() {
        options3dLightnessRange.value = options3dLightnessNumber.value = this.value;
        ThreeD.setLightness(this.value / 100);
    }

    function changeSunPosition() {
        const x = +options3dSunX.value;
        const y = +options3dSunY.value;
        const z = +options3dSunZ.value;
        ThreeD.setSun(x, y, z);
    }

    function changeRotation() {
        (this.nextElementSibling || this.previousElementSibling).value = this.value;
        const speed = +this.value;
        ThreeD.setRotation(speed);
    }

    function toggleSkyMode() {
        const hide = ThreeD.options.extendedWater;
        options3dColorSection.style.display = hide ? "none" : "block";
        ThreeD.toggleSky();
    }

    function changeColors() {
        ThreeD.setColors(options3dMeshSky.value, options3dMeshWater.value);
    }

    function changeResolution() {
        ThreeD.setResolution(this.value);
    }
}
