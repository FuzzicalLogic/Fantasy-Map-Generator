import {
    modules, pack, seed,
    view,
    burgIcons, burgLabels, anchors
} from "../../main.js";

import * as Names from "../names-generator.js";
import { editNotes } from "./notes-editor.js";

import { closeDialogs, clicked, unselect, moveBurgToGroup, removeBurg, togglePort, toggleCapital } from "./editors.js";
import { tip, clearMainTip } from "./general.js";
import { findCell, rn, isCtrlClick, normalize, parseTransform, openURL, rand } from "../utils.js";
import { editStyle } from "./style.js";
import { toggleCells, toggleLabels, toggleIcons, layerIsOn } from "./layers.js";

const getById = id => document.getElementById(id);
const getBurgId = () => getById('burgEditor').dataset.id;
const getBurgLabel = () => burgLabels.select(`[data-id="${getBurgId()}"]`);

let editor = {
    get burgGroupShow() { return getById("burgGroupShow"); },
    get burgGroupHide() { return getById("burgGroupHide"); },
    get burgSelectGroup() { return getById("burgSelectGroup"); },
    get burgInputGroup() { return getById("burgInputGroup") },
    get burgAddGroup() { return getById("burgAddGroup") },
    get burgRemoveGroup() { return getById("burgRemoveGroup") },

    get burgName() { return getById("burgName") },
    get burgNameReCulture() { return getById("burgNameReCulture") },
    get burgNameReRandom() { return getById("burgNameReRandom") },
    get burgPopulation() { return getById("burgPopulation") },

    get burgStyleShow() { return getById("burgStyleShow"); },
    get burgStyleHide() { return getById("burgStyleHide"); },
    get burgEditLabelStyle() { return getById("burgEditLabelStyle"); },
    get burgEditIconStyle() { return getById("burgEditIconStyle"); },
    get burgEditAnchorStyle() { return getById("burgEditAnchorStyle"); },

    get burgSeeInMFCG() { return getById("burgSeeInMFCG"); },
    get burgOpenCOA() { return getById("burgOpenCOA"); },
    get burgRelocate() { return getById("burgRelocate"); },
    get burglLegend() { return getById("burglLegend"); },
    get burgRemove() { return getById("burgRemove"); }
};

export function editBurg(id = d3.event.target.dataset.id) {
    if (customization) return;
    closeDialogs(".stable");
    if (!layerIsOn("toggleIcons")) toggleIcons();
    if (!layerIsOn("toggleLabels")) toggleLabels();

    const my = id || d3.event.target.tagName === "text" ? "center bottom-20" : "center top+20";
    const at = id ? "center" : d3.event.target.tagName === "text" ? "top" : "bottom";
    const of = id ? "svg" : d3.event.target;
    getById('burgEditor').setAttribute('data-id', id);
    burgLabels.selectAll("text").call(d3.drag().on("start", dragBurgLabel)).classed("draggable", true);
    updateBurgValues(id);


    $("#burgEditor").dialog({
        title: "Edit Burg", resizable: false, close: closeBurgEditor,
        position: { my, at, of, collision: "fit" }
    });

    if (modules.editBurg) return;
    modules.editBurg = true;

    // add listeners
    editor.burgGroupShow.addEventListener("click", showGroupSection);
    editor.burgGroupHide.addEventListener("click", hideGroupSection);
    editor.burgSelectGroup.addEventListener("change", changeGroup);
    editor.burgInputGroup.addEventListener("change", createNewGroup);
    editor.burgAddGroup.addEventListener("click", toggleNewGroupInput);
    editor.burgRemoveGroup.addEventListener("click", removeBurgsGroup);

    editor.burgName.addEventListener("input", changeName);
    editor.burgNameReCulture.addEventListener("click", generateNameCulture);
    editor.burgNameReRandom.addEventListener("click", generateNameRandom);
    editor.burgPopulation.addEventListener("change", changePopulation);
    burgBody.querySelectorAll(".burgFeature").forEach(el => el.addEventListener("click", toggleFeature));

    editor.burgStyleShow.addEventListener("click", showStyleSection);
    editor.burgStyleHide.addEventListener("click", hideStyleSection);
    editor.burgEditLabelStyle.addEventListener("click", editGroupLabelStyle);
    editor.burgEditIconStyle.addEventListener("click", editGroupIconStyle);
    editor.burgEditAnchorStyle.addEventListener("click", editGroupAnchorStyle);

    editor.burgSeeInMFCG.addEventListener("click", openInMFCG);
    editor.burgOpenCOA.addEventListener("click", openInIAHG);
    editor.burgRelocate.addEventListener("click", toggleRelocateBurg);
    editor.burglLegend.addEventListener("click", editBurgLegend);
    editor.burgRemove.addEventListener("click", removeSelectedBurg);

}

function updateBurgValues(id) {
    const b = pack.burgs[id];
    editor.burgName.value = b.name;
    editor.burgPopulation.value = rn(b.population * populationRate.value * urbanization.value);
    editor.burgEditAnchorStyle.style.display = +b.port ? "inline-block" : "none";

    // toggle features
    if (b.capital) document.getElementById("burgCapital").classList.remove("inactive");
    else document.getElementById("burgCapital").classList.add("inactive");
    if (b.port) document.getElementById("burgPort").classList.remove("inactive");
    else document.getElementById("burgPort").classList.add("inactive");
    if (b.citadel) document.getElementById("burgCitadel").classList.remove("inactive");
    else document.getElementById("burgCitadel").classList.add("inactive");
    if (b.walls) document.getElementById("burgWalls").classList.remove("inactive");
    else document.getElementById("burgWalls").classList.add("inactive");
    if (b.plaza) document.getElementById("burgPlaza").classList.remove("inactive");
    else document.getElementById("burgPlaza").classList.add("inactive");
    if (b.temple) document.getElementById("burgTemple").classList.remove("inactive");
    else document.getElementById("burgTemple").classList.add("inactive");
    if (b.shanty) document.getElementById("burgShanty").classList.remove("inactive");
    else document.getElementById("burgShanty").classList.add("inactive");

    // select group
    const group = getBurgLabel(id).node().parentNode.id;
    const select = editor.burgSelectGroup;
    select.options.length = 0; // remove all options

    burgLabels.selectAll("g").each(function () {
        select.options.add(new Option(this.id, this.id, false, this.id === group));
    });
}

function changeName(e) {
    pack.burgs[getBurgId()].name = this.value;
    getBurgLabel().text(this.value);
}

function generateNameRandom() {
    const base = rand(nameBases.length - 1);
    burgName.value = Names.getBase(base);
    changeName();
}

function generateNameCulture(e) {
    const culture = pack.burgs[getBurgId()].culture;
    editor.burgName.value = Names.getCulture(culture);
    changeName();
}

function dragBurgLabel() {
    const tr = parseTransform(this.getAttribute("transform"));
    const dx = +tr[0] - d3.event.x, dy = +tr[1] - d3.event.y;

    d3.event.on("drag", function () {
        const x = d3.event.x, y = d3.event.y;
        this.setAttribute("transform", `translate(${(dx + x)},${(dy + y)})`);
        tip('Use dragging for fine-tuning only, to actually move burg use "Relocate" button', false, "warning");
    });
}

function changePopulation() {
    const id = +getBurgLabel().attr("data-id");
    pack.burgs[id].population = rn(burgPopulation.value / populationRate.value / urbanization.value, 4);
}

function toggleFeature() {
    const id = +getBurgId();
    const b = pack.burgs[id];
    const feature = this.dataset.feature;
    const turnOn = this.classList.contains("inactive");
    if (feature === "port") togglePort(id);
    else if (feature === "capital") toggleCapital(id);
    else b[feature] = +turnOn;
    if (b[feature]) this.classList.remove("inactive");
    else if (!b[feature]) this.classList.add("inactive");

    if (b.port) editor.burgEditAnchorStyle.style.display = "inline-block";
    else editor.burgEditAnchorStyle.style.display = "none";
}

function toggleNewGroupInput() {
    let {
        burgInputGroup: lInput,
        burgSelectGroup: lSelect
    } = editor;

    if (lInput.style.display === "none") {
        lInput.style.display = "inline-block";
        lInput.focus();
        lSelect.style.display = "none";
    } else {
        lInput.style.display = "none";
        lSelect.style.display = "inline-block";
    }
}

function changeGroup() {
    const id = +getBurgId();
    moveBurgToGroup(id, this.value);
}

function removeBurgsGroup() {
    const group = getBurgLabel().node().parentNode;
    const basic = group.id === "cities" || group.id === "towns";

    const burgsInGroup = [];
    for (let i = 0; i < group.children.length; i++) {
        burgsInGroup.push(+group.children[i].dataset.id);
    }
    const burgsToRemove = burgsInGroup.filter(b => !pack.burgs[b].capital);
    const capital = burgsToRemove.length < burgsInGroup.length;

    alertMessage.innerHTML = `Are you sure you want to remove
      ${basic || capital ? "all elements in the group" : "the entire burg group"}?
      <br>Please note that capital burgs will not be deleted.
      <br><br>Burgs to be removed: ${burgsToRemove.length}`;
    $("#alert").dialog({
        resizable: false, title: "Remove route group",
        buttons: {
            Remove: function () {
                $(this).dialog("close");
                $("#burgEditor").dialog("close");
                hideGroupSection();
                burgsToRemove.forEach(b => removeBurg(b));

                if (!basic && !capital) {
                    // entirely remove group
                    const labelG = document.querySelector("#burgLabels > #" + group.id);
                    const iconG = document.querySelector("#burgIcons > #" + group.id);
                    const anchorG = document.querySelector("#anchors > #" + group.id);
                    if (labelG) labelG.remove();
                    if (iconG) iconG.remove();
                    if (anchorG) anchorG.remove();
                }
            },
            Cancel: function () { $(this).dialog("close"); }
        }
    });
}

function showStyleSection() {
    document.querySelectorAll("#burgBottom > button").forEach(el => el.style.display = "none");
    document.getElementById("burgStyleSection").style.display = "inline-block";
}

function hideStyleSection() {
    document.querySelectorAll("#burgBottom > button").forEach(el => el.style.display = "inline-block");
    document.getElementById("burgStyleSection").style.display = "none";
}

function editGroupLabelStyle() {
    const g = getBurgLabel().node().parentNode.id;
    editStyle("labels", g);
}

function editGroupIconStyle() {
    const g = getBurgLabel().node().parentNode.id;
    editStyle("burgIcons", g);
}

function editGroupAnchorStyle() {
    const g = getBurgLabel().node().parentNode.id;
    editStyle("anchors", g);
}

function editBurgLegend() {
    const id = getBurgLabel().attr("data-id");
    const name = getBurgLabel().text();
    editNotes("burg" + id, name);
}

function showGroupSection() {
    document.querySelectorAll("#burgBottom > button").forEach(el => el.style.display = "none");
    document.getElementById("burgGroupSection").style.display = "inline-block";
}

function hideGroupSection() {
    let {
        burgInputGroup: lInput,
        burgSelectGroup: lSelect
    } = editor;

    document.querySelectorAll("#burgBottom > button").forEach(el => el.style.display = "inline-block");
    document.getElementById("burgGroupSection").style.display = "none";
    lInput.style.display = "none";
    lInput.value = "";
    lSelect.style.display = "inline-block";
}

function createNewGroup() {
    if (!this.value) { tip("Please provide a valid group name", false, "error"); return; }
    const group = this.value.toLowerCase().replace(/ /g, "_").replace(/[^\w\s]/gi, "");

    if (document.getElementById(group)) {
        tip("Element with this id already exists. Please provide a unique name", false, "error");
        return;
    }

    if (Number.isFinite(+group.charAt(0))) {
        tip("Group name should start with a letter", false, "error");
        return;
    }

    const id = +getBurgId();
    const oldGroup = getBurgLabel().node().parentNode.id;

    const label = document.querySelector("#burgLabels [data-id='" + id + "']");
    const icon = document.querySelector("#burgIcons [data-id='" + id + "']");
    const anchor = document.querySelector("#anchors [data-id='" + id + "']");
    if (!label || !icon) { console.error("Cannot find label or icon elements"); return; }

    const labelG = document.querySelector("#burgLabels > #" + oldGroup);
    const iconG = document.querySelector("#burgIcons > #" + oldGroup);
    const anchorG = document.querySelector("#anchors > #" + oldGroup);

    // just rename if only 1 element left
    const count = getBurgLabel().node().parentNode.childElementCount;
    if (oldGroup !== "cities" && oldGroup !== "towns" && count === 1) {
        editor.burgSelectGroup.selectedOptions[0].remove();
        editor.burgSelectGroup.options.add(new Option(group, group, false, true));
        toggleNewGroupInput();
        editor.burgInputGroup.value = "";
        labelG.id = group;
        iconG.id = group;
        if (anchor) anchorG.id = group;
        return;
    }

    // create new groups
    editor.burgSelectGroup.options.add(new Option(group, group, false, true));
    toggleNewGroupInput();
    editor.burgInputGroup.value = "";

    const newLabelG = document.querySelector("#burgLabels").appendChild(labelG.cloneNode(false));
    newLabelG.id = group;
    const newIconG = document.querySelector("#burgIcons").appendChild(iconG.cloneNode(false));
    newIconG.id = group;
    if (anchor) {
        const newAnchorG = document.querySelector("#anchors").appendChild(anchorG.cloneNode(false));
        newAnchorG.id = group;
    }
    moveBurgToGroup(id, group);
}

function toggleRelocateBurg() {
    const toggler = getById("toggleCells");
    editor.burgRelocate.classList.toggle("pressed");
    if (editor.burgRelocate.classList.contains("pressed")) {
        view.box.style("cursor", "crosshair").on("click", relocateBurgOnClick);
        tip("Click on map to relocate burg. Hold Shift for continuous move", true);
        if (!layerIsOn("toggleCells")) {
            toggleCells();
            toggler.dataset.forced = true;
        }
    } else {
        clearMainTip();
        view.box.on("click", clicked).style("cursor", "default");
        if (layerIsOn("toggleCells") && toggler.dataset.forced) {
            toggleCells();
            toggler.dataset.forced = false;
        }
    }
}

function relocateBurgOnClick() {
    const cells = pack.cells;
    const point = d3.mouse(this);
    const cell = findCell(point[0], point[1]);
    const id = getBurgId();
    const burg = pack.burgs[id];

    if (cells.h[cell] < 20) {
        tip("Cannot place burg into the water! Select a land cell", false, "error");
        return;
    }

    if (cells.burg[cell] && cells.burg[cell] !== id) {
        tip("There is already a burg in this cell. Please select a free cell", false, "error");
        return;
    }

    const newState = cells.state[cell];
    const oldState = burg.state;

    if (newState !== oldState && burg.capital) {
        tip("Capital cannot be relocated into another state!", false, "error");
        return;
    }

    // change UI
    const x = rn(point[0], 2), y = rn(point[1], 2);
    burgIcons.select("[data-id='" + id + "']").attr("transform", null).attr("cx", x).attr("cy", y);
    burgLabels.select("text[data-id='" + id + "']").attr("transform", null).attr("x", x).attr("y", y);
    const anchor = anchors.select("use[data-id='" + id + "']");
    if (anchor.size()) {
        const size = anchor.attr("width");
        const xa = rn(x - size * 0.47, 2);
        const ya = rn(y - size * 0.47, 2);
        anchor.attr("transform", null).attr("x", xa).attr("y", ya);
    }

    // change data
    cells.burg[burg.cell] = 0;
    cells.burg[cell] = id;
    burg.cell = cell;
    burg.state = newState;
    burg.x = x;
    burg.y = y;
    if (burg.capital) pack.states[newState].center = burg.cell;

    if (d3.event.shiftKey === false) toggleRelocateBurg();
}

function openInIAHG(event) {
    const id = getBurgId(),
        burg = pack.burgs[id],
        defSeed = `${seed}-b${id}`;
    const openIAHG = () => openURL("https://ironarachne.com/heraldry/" + (burg.IAHG || defSeed));

    if (isCtrlClick(event)) {
        prompt(`Please provide an Iron Arachne Heraldry Generator seed. <br>Default seed is a combination of FMG map seed and burg id (${defSeed})`,
            { default: burg.IAHG || defSeed }, v => {
                if (v && v != defSeed) burg.IAHG = v;
                openIAHG();
            });
    } else openIAHG();
}

function openInMFCG(event) {
    const id = getBurgId();
    const burg = pack.burgs[id];
    const defSeed = +(seed + id.padStart(4, 0));
    if (isCtrlClick(event)) {
        prompt(`Please provide a Medieval Fantasy City Generator seed. 
        Seed should be a number. Default seed is FMG map seed + burg id padded to 4 chars with zeros (${defSeed}). 
        Please note that if seed is custom, "Overworld" button from MFCG will open a different map`,
            { default: burg.MFCG || defSeed, step: 1, min: 1, max: 1e13 - 1 }, v => {
                burg.MFCG = v;
                openMFCG(v);
            });
    } else openMFCG();

    function openMFCG(seed) {
        if (!seed && burg.MFCGlink) { openURL(burg.MFCGlink); return; }
        const cells = pack.cells;
        const name = getBurgLabel().text();
        const size = Math.max(Math.min(rn(burg.population), 65), 6);

        const s = burg.MFCG || defSeed;
        const cell = burg.cell;
        const hub = +cells.road[cell] > 50;
        const river = cells.r[cell] ? 1 : 0;

        const coast = +burg.port;
        const citadel = +burg.citadel;
        const walls = +burg.walls;
        const plaza = +burg.plaza;
        const temple = +burg.temple;
        const shanty = +burg.shanty;

        const sea = coast && cells.haven[burg.cell] ? getSeaDirections(burg.cell) : "";
        function getSeaDirections(i) {
            const p1 = cells.p[i];
            const p2 = cells.p[cells.haven[i]];
            let deg = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI - 90;
            if (deg < 0) deg += 360;
            const norm = rn(normalize(deg, 0, 360) * 2, 2); // 0 = south, 0.5 = west, 1 = north, 1.5 = east
            return "&sea=" + norm;
        }

        const site = "http://fantasycities.watabou.ru/?random=0&continuous=0";
        const url = `${site}&name=${name}&size=${size}&seed=${s}&hub=${hub}&river=${river}&coast=${coast}&citadel=${citadel}&plaza=${plaza}&temple=${temple}&walls=${walls}&shantytown=${shanty}${sea}`;
        openURL(url);
    }
}

function removeSelectedBurg() {
    const id = +getBurgId();
    if (pack.burgs[id].capital) {
        alertMessage.innerHTML = `You cannot remove the burg as it is a state capital.<br><br>
        You can change the capital using Burgs Editor (shift + T)`;
        $("#alert").dialog({
            resizable: false, title: "Remove burg",
            buttons: { Ok: function () { $(this).dialog("close"); } }
        });
    } else {
        alertMessage.innerHTML = "Are you sure you want to remove the burg?";
        $("#alert").dialog({
            resizable: false, title: "Remove burg",
            buttons: {
                Remove: function () {
                    $(this).dialog("close");
                    removeBurg(id); // see Editors module
                    $("#burgEditor").dialog("close");
                },
                Cancel: function () { $(this).dialog("close"); }
            }
        });
    }
}

function closeBurgEditor() {
    editor.burgRelocate.classList.remove("pressed");
    burgLabels.selectAll("text").call(d3.drag().on("drag", null)).classed("draggable", false);
    unselect();
}
