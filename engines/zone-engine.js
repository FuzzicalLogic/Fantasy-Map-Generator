import {
    pack, notes,
    view
} from "../main.js";
import {
    findCell, getPackPolygon,
    P, rand, ra, rw, rn,
    toAdjective
} from "../modules/utils.js";
import * as Names from "../modules/names-generator.js";

// regenerate some zones
export function addZones(number = 1) {
    console.time("addZones");
    const data = [], { cells, states, burgs } = pack;
    const used = new Uint8Array(cells.length); // to store used cells

    for (let i = 0; i < rn(Math.random() * 1.8 * number); i++) addInvasion(); // invasion of enemy lands
    for (let i = 0; i < rn(Math.random() * 1.6 * number); i++) addRebels(); // rebels along a state border
    for (let i = 0; i < rn(Math.random() * 1.6 * number); i++) addProselytism(); // proselitism of organized religion
    for (let i = 0; i < rn(Math.random() * 1.6 * number); i++) addCrusade(); // crusade on heresy lands
    for (let i = 0; i < rn(Math.random() * 1.8 * number); i++) addDisease(); // disease starting in a random city
    for (let i = 0; i < rn(Math.random() * 1.4 * number); i++) addDisaster(); // disaster starting in a random city
    for (let i = 0; i < rn(Math.random() * 1.4 * number); i++) addEruption(); // volcanic eruption aroung volcano
    for (let i = 0; i < rn(Math.random() * 1.0 * number); i++) addAvalanche(); // avalanche impacting highland road
    for (let i = 0; i < rn(Math.random() * 1.4 * number); i++) addFault(); // fault line in elevated areas
    for (let i = 0; i < rn(Math.random() * 1.4 * number); i++) addFlood() // flood on river banks
    for (let i = 0; i < rn(Math.random() * 1.2 * number); i++) addTsunami() // tsunami starting near coast

    function addInvasion() {
        const atWar = states.filter(s => s.diplomacy && s.diplomacy.some(d => d === "Enemy"));
        if (!atWar.length)
            return;

        const invader = ra(atWar);
        const target = invader.diplomacy.findIndex(d => d === "Enemy");

        const cell = ra(cells.map((v, k) => k)
            .filter(i => cells[i].state === target && cells[i].c.some(c => cells[c].state === invader.i)));
        if (!cell)
            return;

        const cellsArray = [],
            queue = [cell],
            power = rand(5, 30);

        while (queue.length) {
            const q = P(.4) ? queue.shift() : queue.pop();
            cellsArray.push(q);
            if (cellsArray.length > power)
                break;

            cells[q].c.forEach(e => {
                if (used[e]) return;
                if (cells[e].state !== target) return;
                used[e] = 1;
                queue.push(e);
            });
        }

        const invasion = rw({
            "Invasion": 4, "Occupation": 3, "Raid": 2, "Conquest": 2,
            "Subjugation": 1, "Foray": 1, "Skirmishes": 1, "Incursion": 2, "Pillaging": 1, "Intervention": 1
        });
        const name = toAdjective(invader.name) + " " + invasion;
        data.push({ name, type: "Invasion", cells: cellsArray, fill: "url(#hatch1)" });
    }

    function addRebels() {
        const state = ra(states.filter(s => s.i && s.neighbors.some(n => n)));
        if (!state) return;

        const neib = ra(state.neighbors.filter(n => n));
        const cell = cells.map((v, k) => k)
            .find(i => cells[i].state === state.i && cells[i].c.some(c => cells[c].state === neib));
        const cellsArray = [], queue = [cell], power = rand(10, 30);

        while (queue.length) {
            const q = queue.shift();
            cellsArray.push(q);
            if (cellsArray.length > power) break;

            cells[q].c.forEach(e => {
                if (used[e]) return;
                if (cells[e].state !== state.i) return;
                used[e] = 1;
                if (e % 4 !== 0 && !cells[e].c.some(c => cells[c].state === neib)) return;
                queue.push(e);
            });
        }

        const rebels = rw({
            "Rebels": 5, "Insurgents": 2, "Mutineers": 1, "Rioters": 1, "Separatists": 1,
            "Secessionists": 1, "Insurrection": 2, "Rebellion": 1, "Conspiracy": 2
        });
        const name = toAdjective(states[neib].name) + " " + rebels;
        data.push({ name, type: "Rebels", cells: cellsArray, fill: "url(#hatch3)" });
    }

    function addProselytism() {
        const organized = ra(pack.religions.filter(r => r.type === "Organized"));
        if (!organized) return;

        const cell = ra(cells.map((v, k) => k)
            .filter(i => cells[i].religion && cells[i].religion !== organized.i && cells[i].c.some(c => cells[c].religion === organized.i)));
        if (!cell) return;
        const target = cells[cell].religion;
        const cellsArray = [], queue = [cell], power = rand(10, 30);

        while (queue.length) {
            const q = queue.shift();
            cellsArray.push(q);
            if (cellsArray.length > power) break;

            cells[q].c.forEach(e => {
                if (used[e])
                    return;
                if (cells[e].religion !== target)
                    return;
                if (cells[e].h < 20)
                    return;
                used[e] = 1;
                queue.push(e);
            });
        }

        const name = toAdjective(organized.name.split(" ")[0]) + " Proselytism";
        data.push({ name, type: "Proselytism", cells: cellsArray, fill: "url(#hatch6)" });
    }

    function addCrusade() {
        const heresy = ra(pack.religions.filter(r => r.type === "Heresy"));
        if (!heresy)
            return;

        const cellsArray = cells.map((v, k) => k).filter(i => !used[i] && cells[i].religion === heresy.i);
        if (!cellsArray.length)
            return;
        cellsArray.forEach(i => used[i] = 1);

        const name = toAdjective(heresy.name.split(" ")[0]) + " Crusade";
        data.push({ name, type: "Crusade", cells: cellsArray, fill: "url(#hatch6)" });
    }

    function addDisease() {
        const burg = ra(burgs.filter(b => !used[b.cell] && b.i && !b.removed)); // random burg
        if (!burg) return;

        const cellsArray = [], cost = [], power = rand(20, 37);
        const queue = new PriorityQueue({ comparator: (a, b) => a.p - b.p });
        queue.queue({ e: burg.cell, p: 0 });

        while (queue.length) {
            const next = queue.dequeue();
            if (cells[next.e].burg || cells[next.e].pop)
                cellsArray.push(next.e);
            used[next.e] = 1;

            cells[next.e].c.forEach(function (e) {
                const r = cells[next.e].road;
                const c = r ? Math.max(10 - r, 1) : 100;
                const p = next.p + c;
                if (p > power)
                    return;

                if (!cost[e] || p < cost[e]) {
                    cost[e] = p;
                    queue.queue({ e, p });
                }
            });
        }

        const adjective = () => ra(["Great", "Silent", "Severe", "Blind", "Unknown", "Loud", "Deadly", "Burning", "Bloody", "Brutal", "Fatal"]);
        const animal = () => ra(["Ape", "Bear", "Boar", "Cat", "Cow", "Dog", "Pig", "Fox", "Bird", "Horse", "Rat", "Raven", "Sheep", "Spider", "Wolf"]);
        const color = () => ra(["Golden", "White", "Black", "Red", "Pink", "Purple", "Blue", "Green", "Yellow", "Amber", "Orange", "Brown", "Grey"]);

        const type = rw({ "Fever": 5, "Pestilence": 2, "Flu": 2, "Pox": 2, "Smallpox": 2, "Plague": 4, "Cholera": 2, "Dropsy": 1, "Leprosy": 2 });
        const name = rw({ [color()]: 4, [animal()]: 2, [adjective()]: 1 }) + " " + type;
        data.push({ name, type: "Disease", cells: cellsArray, fill: "url(#hatch12)" });
    }

    function addDisaster() {
        const burg = ra(burgs.filter(b => !used[b.cell] && b.i && !b.removed)); // random burg
        if (!burg) return;

        const cellsArray = [], cost = [], power = rand(5, 25);
        const queue = new PriorityQueue({ comparator: (a, b) => a.p - b.p });
        queue.queue({ e: burg.cell, p: 0 });

        while (queue.length) {
            const next = queue.dequeue();
            if (cells[next.e].burg || cells[next.e].pop)
                cellsArray.push(next.e);
            used[next.e] = 1;

            cells[next.e].c.forEach(function (e) {
                const c = rand(1, 10);
                const p = next.p + c;
                if (p > power) return;

                if (!cost[e] || p < cost[e]) {
                    cost[e] = p;
                    queue.queue({ e, p });
                }
            });
        }

        const type = rw({ "Famine": 5, "Dearth": 1, "Drought": 3, "Earthquake": 3, "Tornadoes": 1, "Wildfires": 1 });
        const name = toAdjective(burg.name) + " " + type;
        data.push({ name, type: "Disaster", cells: cellsArray, fill: "url(#hatch5)" });
    }

    function addEruption() {
        const volcano = document.getElementById("markers").querySelector("use[data-id='#marker_volcano']");
        if (!volcano) return;

        const x = +volcano.dataset.x, y = +volcano.dataset.y, cell = findCell(x, y);
        const id = volcano.id;
        const note = notes.filter(n => n.id === id);

        if (note[0]) note[0].legend = note[0].legend.replace("Active volcano", "Erupting volcano");
        const name = note[0] ? note[0].name.replace(" Volcano", "") + " Eruption" : "Volcano Eruption";

        const cellsArray = [], queue = [cell], power = rand(10, 30);

        while (queue.length) {
            const q = P(.5) ? queue.shift() : queue.pop();
            cellsArray.push(q);
            if (cellsArray.length > power) break;
            cells[q].c.forEach(e => {
                if (used[e] || cells[e].h < 20) return;
                used[e] = 1;
                queue.push(e);
            });
        }

        data.push({ name, type: "Disaster", cells: cellsArray, fill: "url(#hatch7)" });
    }

    function addAvalanche() {
        const roads = cells.map((v, k) => k)
            .filter(i => !used[i] && cells[i].road && cells[i].h >= 70);
        if (!roads.length)
            return;

        const cell = +ra(roads);
        const cellsArray = [], queue = [cell], power = rand(3, 15);

        while (queue.length) {
            const q = P(.3) ? queue.shift() : queue.pop();
            cellsArray.push(q);
            if (cellsArray.length > power) break;
            cells[q].c.forEach(e => {
                if (used[e] || cells[e].h < 65)
                    return;
                used[e] = 1;
                queue.push(e);
            });
        }

        const proper = toAdjective(Names.getCultureShort(cells[cell].culture));
        const name = proper + " Avalanche";
        data.push({ name, type: "Disaster", cells: cellsArray, fill: "url(#hatch5)" });
    }

    function addFault() {
        const elevated = cells.map((v, k) => k)
            .filter(i => !used[i] && cells[i].h > 50 && cells[i].h < 70);
        if (!elevated.length)
            return;

        const cell = ra(elevated);
        const cellsArray = [], queue = [cell], power = rand(3, 15);

        while (queue.length) {
            const q = queue.pop();
            if (cells[q].h >= 20)
                cellsArray.push(q);
            if (cellsArray.length > power)
                break;
            cells[q].c.forEach(e => {
                if (used[e] || cells[e].r)
                    return;
                used[e] = 1;
                queue.push(e);
            });
        }

        const proper = toAdjective(Names.getCultureShort(cells[cell].culture));
        const name = proper + " Fault";
        data.push({ name, type: "Disaster", cells: cellsArray, fill: "url(#hatch2)" });
    }

    function addFlood() {
        const fl = cells.map(x => x.fl).filter(x => x),
            meanFlux = d3.mean(fl),
            maxFlux = d3.max(fl),
            flux = (maxFlux - meanFlux) / 2 + meanFlux;
        const rivers = cells.map((v, k) => k)
            .filter(i => !used[i] && cells[i].h < 50 && cells[i].r && cells[i].fl > flux && cells[i].burg);
        if (!rivers.length)
            return;

        const cell = +ra(rivers),
            river = cells[cell].r;
        const cellsArray = [],
            queue = [cell],
            power = rand(5, 30);

        while (queue.length) {
            const q = queue.pop();
            cellsArray.push(q);
            if (cellsArray.length > power)
                break;

            cells[q].c.forEach(e => {
                if (used[e] || cells[e].h < 20 || cells[e].r !== river || cells[e].h > 50 || cells[e].fl < meanFlux)
                    return;
                used[e] = 1;
                queue.push(e);
            });
        }

        const name = toAdjective(burgs[cells[cell].burg].name) + " Flood";
        data.push({ name, type: "Disaster", cells: cellsArray, fill: "url(#hatch13)" });
    }

    function addTsunami() {
        const coastal = cells
            .map((x, i) => ({ ...x, i: i }))
            .filter(({ i, t, f }) => !used[i] && t === -1 && pack.features[f].type !== "lake")
            .map(({ i }) => i);
        if (!coastal.length)
            return;

        const eye = +ra(coastal), queue = [eye],
            cellsArray = [],
            power = rand(10, 30);

        while (queue.length && cellsArray.length <= power) {
            const q = queue.shift();
            if (cells[q].t === 1)
                cellsArray.push(q);

            cells[q].c
                .filter(x => (!used[x])
                    && cells[x].t <= 2
                    && pack.features[cells[x].f].type !== "lake")
                .forEach(x => {
                    used[x] = 1;
                    queue.push(x);
                });
        }

        const proper = toAdjective(Names.getCultureShort(cells[eye].culture));
        const name = proper + " Tsunami";
        data.push({ name, type: "Disaster", cells: cellsArray, fill: "url(#hatch13)" });
    }

    void function drawZones() {
        view.zones.selectAll("g").data(data).enter().append("g")
            .attr("id", (d, i) => "zone" + i)
            .attr("data-description", d => d.name)
            .attr("data-type", d => d.type)
            .attr("data-cells", d => d.cells.join(","))
            .attr("fill", d => d.fill)
            .selectAll("polygon")
            .data(d => d.cells).enter().append("polygon")
            .attr("points", d => getPackPolygon(d)).attr("id", function (d) { return this.parentNode.id + "_" + d });
    }()

    console.timeEnd("addZones");
}

