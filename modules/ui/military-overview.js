import { overviewRegiments } from "./regiments-overview.js";

export function overviewMilitary() {
    if (customization) return;
    closeDialogs("#militaryOverview, .stable");
    if (!layerIsOn("toggleStates")) toggleStates();
    if (!layerIsOn("toggleBorders")) toggleBorders();
    if (!layerIsOn("toggleMilitary")) toggleMilitary();

    const body = document.getElementById("militaryBody");
    addLines();
    $("#militaryOverview").dialog();

    if (modules.overviewMilitary) return;
    modules.overviewMilitary = true;
    updateHeaders();

    $("#militaryOverview").dialog({
        title: "Military Overview", resizable: false, width: fitContent(),
        position: { my: "right top", at: "right-10 top+10", of: "svg", collision: "fit" }
    });

    // add listeners
    document.getElementById("militaryOverviewRefresh").addEventListener("click", addLines);
    document.getElementById("militaryPercentage").addEventListener("click", togglePercentageMode);
    document.getElementById("militaryOptionsButton").addEventListener("click", militaryCustomize);
    document.getElementById("militaryRegimentsList").addEventListener("click", () => overviewRegiments(-1));
    document.getElementById("militaryOverviewRecalculate").addEventListener("click", militaryRecalculate);
    document.getElementById("militaryExport").addEventListener("click", downloadMilitaryData);
    document.getElementById("militaryWiki").addEventListener("click", () => wiki("Military-Forces"));

    body.addEventListener("change", function (ev) {
        const el = ev.target, line = el.parentNode, state = +line.dataset.id;
        changeAlert(state, line, +el.value);
    });

    body.addEventListener("click", function (ev) {
        const el = ev.target, line = el.parentNode, state = +line.dataset.id;
        if (el.tagName === "SPAN") overviewRegiments(state);
    });

    // update military types in header and tooltips
    function updateHeaders() {
        const header = document.getElementById("militaryHeader");
        header.querySelectorAll(".removable").forEach(el => el.remove());
        const insert = html => document.getElementById("militaryTotal").insertAdjacentHTML("beforebegin", html);
        for (const u of options.military) {
            const label = capitalize(u.name.replace(/_/g, ' '));
            insert(`<div data-tip="State ${u.name} units number. Click to sort" class="sortable removable" data-sortby="${u.name}">${label}&nbsp;</div>`);
        }
        header.querySelectorAll(".removable").forEach(function (e) {
            e.addEventListener("click", function () { sortLines(this); });
        });
    }

    // add line for each state
    function addLines() {
        body.innerHTML = "";
        let lines = "";
        const states = pack.states.filter(s => s.i && !s.removed);

        for (const s of states) {
            const population = rn((s.rural + s.urban * urbanization.value) * populationRate.value);
            const getForces = u => s.military.reduce((s, r) => s + (r.u[u.name] || 0), 0);
            const total = options.military.reduce((s, u) => s + getForces(u) * u.crew, 0);
            const rate = total / population * 100;

            const sortData = options.military.map(u => `data-${u.name}="${getForces(u)}"`).join(" ");
            const lineData = options.military.map(u => `<div data-type="${u.name}" data-tip="State ${u.name} units number">${getForces(u)}</div>`).join(" ");

            lines += `<div class="states" data-id=${s.i} data-state="${s.name}" ${sortData} data-total="${total}" data-population="${population}" data-rate="${rate}" data-alert="${s.alert}">
        <svg data-tip="${s.fullName}" width=".9em" height=".9em" style="margin-bottom:-1px"><rect x="0" y="0" width="100%" height="100%" fill="${s.color}" class="fillRect"></svg>
        <input data-tip="${s.fullName}" style="width:6em" value="${s.name}" readonly>
        ${lineData}
        <div data-type="total" data-tip="Total state military personnel (considering crew)" style="font-weight: bold">${si(total)}</div>
        <div data-type="population" data-tip="State population">${si(population)}</div>
        <div data-type="rate" data-tip="Military personnel rate (% of state population). Depends on war alert">${rn(rate, 2)}%</div>
        <input data-tip="War Alert. Editable modifier to military forces number, depends of political situation" style="width:4.1em" type="number" min=0 step=.01 value="${rn(s.alert, 2)}">
        <span data-tip="Show regiments list" class="icon-list-bullet pointer"></span>
      </div>`;
        }
        body.insertAdjacentHTML("beforeend", lines);
        updateFooter();

        // add listeners
        body.querySelectorAll("div.states").forEach(el => el.addEventListener("mouseenter", ev => stateHighlightOn(ev)));
        body.querySelectorAll("div.states").forEach(el => el.addEventListener("mouseleave", ev => stateHighlightOff(ev)));

        if (body.dataset.type === "percentage") { body.dataset.type = "absolute"; togglePercentageMode(); }
        applySorting(militaryHeader);
    }

    function changeAlert(state, line, alert) {
        const s = pack.states[state];
        const dif = s.alert || alert ? alert / s.alert : 0; // modifier
        s.alert = line.dataset.alert = alert;

        s.military.forEach(r => {
            Object.keys(r.u).forEach(u => r.u[u] = rn(r.u[u] * dif)); // change units value
            r.a = d3.sum(Object.values(r.u)); // change total
            armies.select(`g>g#regiment${s.i}-${r.i}>text`).text(Military.getTotal(r)); // change icon text
        });

        const getForces = u => s.military.reduce((s, r) => s + (r.u[u.name] || 0), 0);
        options.military.forEach(u => line.dataset[u.name] = line.querySelector(`div[data-type='${u.name}']`).innerHTML = getForces(u));

        const population = rn((s.rural + s.urban * urbanization.value) * populationRate.value);
        const total = line.dataset.total = options.military.reduce((s, u) => s + getForces(u) * u.crew, 0);
        const rate = line.dataset.rate = total / population * 100;
        line.querySelector("div[data-type='total']").innerHTML = si(total);
        line.querySelector("div[data-type='rate']").innerHTML = rn(rate, 2) + "%";

        updateFooter();
    }

    function updateFooter() {
        const lines = Array.from(body.querySelectorAll(":scope > div"));
        const statesNumber = militaryFooterStates.innerHTML = pack.states.filter(s => s.i && !s.removed).length;
        const total = d3.sum(lines.map(el => el.dataset.total));
        militaryFooterForcesTotal.innerHTML = si(total);
        militaryFooterForces.innerHTML = si(total / statesNumber);
        militaryFooterRate.innerHTML = rn(d3.sum(lines.map(el => el.dataset.rate)) / statesNumber, 2) + "%";
        militaryFooterAlert.innerHTML = rn(d3.sum(lines.map(el => el.dataset.alert)) / statesNumber, 2);
    }

    function stateHighlightOn(event) {
        const state = +event.target.dataset.id;
        if (customization || !state) return;
        armies.select("#army" + state).transition().duration(2000).style("fill", "#ff0000");

        if (!layerIsOn("toggleStates")) return;
        const d = regions.select("#state" + state).attr("d");

        const path = debug.append("path").attr("class", "highlight").attr("d", d)
            .attr("fill", "none").attr("stroke", "red").attr("stroke-width", 1).attr("opacity", 1)
            .attr("filter", "url(#blur1)");

        const l = path.node().getTotalLength(), dur = (l + 5000) / 2;
        const i = d3.interpolateString("0," + l, l + "," + l);
        path.transition().duration(dur).attrTween("stroke-dasharray", function () { return t => i(t) });
    }

    function stateHighlightOff(event) {
        debug.selectAll(".highlight").each(function () {
            d3.select(this).transition().duration(1000).attr("opacity", 0).remove();
        });

        const state = +event.target.dataset.id;
        armies.select("#army" + state).transition().duration(1000).style("fill", null);
    }

    function togglePercentageMode() {
        if (body.dataset.type === "absolute") {
            body.dataset.type = "percentage";
            const lines = body.querySelectorAll(":scope > div");
            const array = Array.from(lines), cache = [];

            const total = function (type) {
                if (cache[type]) cache[type];
                cache[type] = d3.sum(array.map(el => +el.dataset[type]));
                return cache[type];
            }

            lines.forEach(function (el) {
                el.querySelectorAll("div").forEach(function (div) {
                    const type = div.dataset.type;
                    if (type === "rate") return;
                    div.textContent = total(type) ? rn(+el.dataset[type] / total(type) * 100) + "%" : "0%";
                });
            });
        } else {
            body.dataset.type = "absolute";
            addLines();
        }
    }

    function militaryCustomize() {
        const types = ["melee", "ranged", "mounted", "machinery", "naval", "armored", "aviation", "magical"];
        const table = document.getElementById("militaryOptions").querySelector("tbody");
        removeUnitLines();
        options.military.map(u => addUnitLine(u));

        $("#militaryOptions").dialog({
            title: "Edit Military Units", resizable: false, width: fitContent(),
            position: { my: "center", at: "center", of: "svg" },
            buttons: {
                Apply: applyMilitaryOptions,
                Add: () => addUnitLine({ icon: "🛡️", name: "custom" + militaryOptionsTable.rows.length, rural: .2, urban: .5, crew: 1, power: 1, type: "melee" }),
                Restore: restoreDefaultUnits,
                Cancel: function () { $(this).dialog("close"); }
            }, open: function () {
                const buttons = $(this).dialog("widget").find(".ui-dialog-buttonset > button");
                buttons[0].addEventListener("mousemove", () => tip("Apply military units settings. <span style='color:#cb5858'>All forces will be recalculated!</span>"));
                buttons[1].addEventListener("mousemove", () => tip("Add new military unit to the table"));
                buttons[2].addEventListener("mousemove", () => tip("Restore default military units and settings"));
                buttons[3].addEventListener("mousemove", () => tip("Close the window without saving the changes"));
            }
        });

        function removeUnitLines() {
            table.querySelectorAll("tr").forEach(el => el.remove());
        }

        function addUnitLine(u) {
            const row = document.createElement("tr");
            row.innerHTML = `<td><button type="button" data-tip="Click to select unit icon">${u.icon || " "}</button></td>
        <td><input data-tip="Type unit name. If name is changed for existing unit, old unit will be replaced" value="${u.name}"></td>
        <td><input data-tip="Enter conscription percentage for rural population" type="number" min=0 max=100 step=.01 value="${u.rural}"></td>
        <td><input data-tip="Enter conscription percentage for urban population" type="number" min=0 max=100 step=.01 value="${u.urban}"></td>
        <td><input data-tip="Enter average number of people in crew (used for total personnel calculation)" type="number" min=1 step=1 value="${u.crew}"></td>
        <td><input data-tip="Enter military power (used for battle simulation)" type="number" min=0 step=.1 value="${u.power}"></td>
        <td><select data-tip="Select unit type to apply special rules on forces recalculation">${types.map(t => `<option ${u.type === t ? "selected" : ""} value="${t}">${t}</option>`).join(" ")}</select></td>
        <td data-tip="Check if unit is separate and can be stacked only with units of the same type">
          <input id="${u.name}Separate" type="checkbox" class="checkbox" ${u.separate ? "checked" : ""}>
          <label for="${u.name}Separate" class="checkbox-label"></label></td>
        <td data-tip="Remove the unit"><span data-tip="Remove unit type" class="icon-trash-empty pointer" onclick="this.parentElement.parentElement.remove();"></span></td>`;
            row.querySelector("button").addEventListener("click", function (e) { selectIcon(this.innerHTML, v => this.innerHTML = v) });
            table.appendChild(row);
        }

        function restoreDefaultUnits() {
            removeUnitLines();
            Military.getDefaultOptions().map(u => addUnitLine(u));
        }

        function applyMilitaryOptions() {
            const unitLines = Array.from(table.querySelectorAll("tr"));
            const names = unitLines.map(r => r.querySelector("input").value.replace(/[&\/\\#, +()$~%.'":*?<>{}]/g, '_'));
            if (new Set(names).size !== names.length) {
                tip("All units should have unique names", false, "error");
                return;
            }

            $("#militaryOptions").dialog("close");
            options.military = unitLines.map((r, i) => {
                const [icon, name, rural, urban, crew, power, type, separate] = Array.from(r.querySelectorAll("input, select, button")).map(d => {
                    let value = d.value;
                    if (d.type === "number") value = +d.value || 0;
                    if (d.type === "checkbox") value = +d.checked || 0;
                    if (d.type === "button") value = d.innerHTML || "⠀";
                    return value;
                });
                return { icon, name: names[i], rural, urban, crew, power, type, separate };
            });
            localStorage.setItem("military", JSON.stringify(options.military));
            Military.generate();
            updateHeaders();
            addLines();
        }

    }

    function militaryRecalculate() {
        alertMessage.innerHTML = "Are you sure you want to recalculate military forces for all states?<br>Regiments for all states will be regenerated";
        $("#alert").dialog({
            resizable: false, title: "Remove regiment",
            buttons: {
                Recalculate: function () {
                    $(this).dialog("close");
                    Military.generate();
                    addLines();
                },
                Cancel: function () { $(this).dialog("close"); }
            }
        });
    }

    function downloadMilitaryData() {
        const units = options.military.map(u => u.name);
        let data = "Id,State," + units.map(u => capitalize(u)).join(",") + ",Total,Population,Rate,War Alert\n"; // headers

        body.querySelectorAll(":scope > div").forEach(function (el) {
            data += el.dataset.id + ",";
            data += el.dataset.state + ",";
            data += units.map(u => el.dataset[u]).join(",") + ",";
            data += el.dataset.total + ",";
            data += el.dataset.population + ",";
            data += rn(el.dataset.rate, 2) + "%,";
            data += el.dataset.alert + "\n";
        });

        const name = getFileName("Military") + ".csv";
        downloadFile(data, name);
    }

}