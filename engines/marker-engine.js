﻿import {
    pack, notes, options,
    svg, view
} from "../main.js";
import * as Names from "../modules/names-generator.js";
import {
    getNextId, biased, convertTemperature,
    P, gauss, rw, ra, rn,
    capitalize, toAdjective,
    generateDate
} from "../modules/utils.js";
import { getFriendlyHeight } from "../modules/ui/general.js";

//Ref TODOs: populationRate, urbanization

// generate some markers
export function addMarkers(number = 1) {
    if (!number) return;
    console.time("addMarkers");
    const { cells, states } = pack;

    addVolcanoes(cells, number);
    addHotSprings(cells, number);
    addMines(cells, number)
    addBridges(cells, number)
    addInns(cells, number);
    addLighthouses(cells, number);
    addWaterfalls(cells, number)
    addBattlefields(cells, states, number);

    console.timeEnd("addMarkers");
}

function addMarker(id, icon, x, y, size) {
    const markers = svg.select("#defs-markers");
    if (markers.select("#marker_" + id).size()) return;

    const symbol = markers.append("symbol")
        .attr("id", "marker_" + id)
        .attr("viewBox", "0 0 30 30");
    symbol.append("path")
        .attr("d", "M6,19 l9,10 L24,19")
        .attr("fill", "#000000")
        .attr("stroke", "none");
    symbol.append("circle")
        .attr("cx", 15)
        .attr("cy", 15)
        .attr("r", 10)
        .attr("fill", "#ffffff")
        .attr("stroke", "#000000")
        .attr("stroke-width", 1);
    symbol.append("text")
        .attr("x", x + "%")
        .attr("y", y + "%")
        .attr("fill", "#000000")
        .attr("stroke", "#3200ff")
        .attr("stroke-width", 0)
        .attr("font-size", size + "px")
        .attr("dominant-baseline", "central")
        .text(icon);
}

function appendMarker(cell, type) {
    const [x, y] = cell.p;
    const id = getNextId("markerElement");
    const name = "#marker_" + type;

    view.markers.append("use")
        .attr("id", id)
        .attr("xlink:href", name)
        .attr("data-id", name)
        .attr("data-x", x)
        .attr("data-y", y)
        .attr("x", x - 15)
        .attr("y", y - 30)
        .attr("data-size", 1)
        .attr("width", 30)
        .attr("height", 30);

    return id;
}

function addVolcanoes(cells, number = 1) {
    let mounts = cells.filter(x => x.h > 70)
        .sort((a, b) => b.h - a.h);
    let count = mounts.length < 10
        ? 0
        : Math.ceil(mounts.length / 300 * number);
    if (count)
        addMarker("volcano", "🌋", 52, 50, 13);

    while (count && mounts.length) {
        const start = biased(0, mounts.length - 1, 5);
        const cell = mounts[start];
        const id = appendMarker(cell, "volcano");
        const proper = Names.getCulture(cell.culture);
        const name = P(.3)
            ? "Mount " + proper
            : Math.random() > .3
                ? proper + " Volcano"
                : proper;
        notes.push({ id, name, legend: `Active volcano. Height: ${getFriendlyHeight(cell.p)}` });
        count--;
    }
}

function addHotSprings(cells, number = 1) {
    let springs = cells.filter(x => x.h > 50)
        .sort((a, b) => b.h - a.h);
    let count = springs.length < 30
        ? 0
        : Math.ceil(springs.length / 1000 * number);
    if (count)
        addMarker("hot_springs", "♨️", 50, 52, 12.5);

    while (count && springs.length) {
        const where = biased(1, springs.length - 1, 3);
        const cell = springs[where];
        const id = appendMarker(cell, "hot_springs");
        const proper = Names.getCulture(cell.culture);
        const temp = convertTemperature(gauss(30, 15, 20, 100));
        notes.push({ id, name: proper + " Hot Springs", legend: `A hot springs area. Temperature: ${temp}` });
        count--;
    }
}

function addMines(cells, number) {
    let hills = cells.filter(x => x.burg && x.h > 47);
    let count = !hills.length
        ? 0
        : Math.ceil(hills.length / 7 * number);
    if (!count)
        return;

    addMarker("mine", "⛏️", 48, 50, 13.5);
    const resources = { "salt": 5, "gold": 2, "silver": 4, "copper": 2, "iron": 3, "lead": 1, "tin": 1 };

    while (count && hills.length) {
        const [cell] = hills.splice(Math.floor(Math.random() * hills.length), 1);
        const id = appendMarker(cell, "mine");
        const resource = rw(resources);
        const burg = pack.burgs[cell.burg];
        const name = `${burg.name} — ${resource} mining town`;
        const population = rn(burg.population * populationRate.value * urbanization.value);
        const legend = `${burg.name} is a mining town of ${population} people just nearby the ${resource} mine`;
        notes.push({ id, name, legend });
        count--;
    }
}

function addBridges(cells, number = 1) {
    const meanRoad = d3.mean(cells.map(x => x.road).filter(x => !!x));
    const meanFlux = d3.mean(cells.map(x => x.fl).filter(x => !!x));

    let bridges = cells.filter(x => !!x.burg && !!x.r && x.h >= 20 && x.fl > meanFlux && x.road > meanRoad)
        .sort((a, b) => (b.road + b.fl / 10) - (a.road + a.fl / 10));

    let count = !!bridges.length
        ? Math.ceil(bridges.length / 12 * number)
        : 0;
    if (count)
        addMarker("bridge", "🌉", 50, 50, 14);

    while (count && bridges.length) {
        const [cell] = bridges.splice(0, 1);
        const id = appendMarker(cell, "bridge");
        const burg = pack.burgs[cell.burg];
        const river = pack.rivers.find(x => x.i === cell.r);
        const riverName = river ? `${river.name} ${river.type}` : "river";
        const name = river && P(.2) ? river.name : burg.name;
        notes.push({ id, name: `${name} Bridge`, legend: `A stone bridge over the ${riverName} near ${burg.name}` });
        count--;
    }
}

function addInns(cells, number) {
    const maxRoad = d3.max(cells.map(x => x.road)) * .9;
    let taverns = cells.filter(x => x.crossroad && x.h >= 20 && x.road > maxRoad);
    if (!taverns.length)
        return;
    const count = Math.ceil(4 * number);
    addMarker("inn", "🍻", 50, 50, 14.5);

    const color = ["Dark", "Light", "Bright", "Golden", "White", "Black", "Red", "Pink", "Purple", "Blue", "Green", "Yellow", "Amber", "Orange", "Brown", "Grey"];
    const animal = ["Antelope", "Ape", "Badger", "Bear", "Beaver", "Bison", "Boar", "Buffalo", "Cat", "Crane", "Crocodile", "Crow", "Deer", "Dog", "Eagle", "Elk", "Fox", "Goat", "Goose", "Hare", "Hawk", "Heron", "Horse", "Hyena", "Ibis", "Jackal", "Jaguar", "Lark", "Leopard", "Lion", "Mantis", "Marten", "Moose", "Mule", "Narwhal", "Owl", "Panther", "Rat", "Raven", "Rook", "Scorpion", "Shark", "Sheep", "Snake", "Spider", "Swan", "Tiger", "Turtle", "Wolf", "Wolverine", "Camel", "Falcon", "Hound", "Ox"];
    const adj = ["New", "Good", "High", "Old", "Great", "Big", "Major", "Happy", "Main", "Huge", "Far", "Beautiful", "Fair", "Prime", "Ancient", "Golden", "Proud", "Lucky", "Fat", "Honest", "Giant", "Distant", "Friendly", "Loud", "Hungry", "Magical", "Superior", "Peaceful", "Frozen", "Divine", "Favorable", "Brave", "Sunny", "Flying"];

    for (let i = 0; i < taverns.length && i < count; i++) {
        const [cell] = taverns.splice(Math.floor(Math.random() * taverns.length), 1);
        const id = appendMarker(cell, "inn");
        const type = P(.3) ? "inn" : "tavern";
        const name = P(.5) ? ra(color) + " " + ra(animal) : P(.6) ? ra(adj) + " " + ra(animal) : ra(adj) + " " + capitalize(type);
        notes.push({ id, name: "The " + name, legend: `A big and famous roadside ${type}` });
    }
}

function addLighthouses(cells, number = 1) {
    const lands = cells.map((x, i) => i)
        .filter(x => cells[x].harbor > 6 && cells[x].c.some(y => cells[y].h < 20 && cells[y].road));
    const lighthouses = Array.from(lands)
        .map(x => [x, cells[x].v[cells[x].c.findIndex(y => cells[y].h < 20 && cells[y].road)]]);
    if (lighthouses.length)
        addMarker("lighthouse", "🚨", 50, 50, 16);
    const count = Math.ceil(4 * number);

    for (let i = 0; i < lighthouses.length && i < count; i++) {
        const idx = lighthouses[i][0], vertex = lighthouses[i][1];
        const cell = cells[idx];
        const id = appendMarker(cell, "lighthouse");
        const proper = cell.burg
            ? pack.burgs[cell.burg].name
            : Names.getCulture(cell.culture);
        notes.push({ id, name: toAdjective(proper) + " Lighthouse" + name, legend: `A lighthouse to keep the navigation safe` });
    }
}

function addWaterfalls(cells, number = 1) {
    const waterfalls = cells.filter(x => !!x.r && x.h > 70);
    if (waterfalls.length)
        addMarker("waterfall", "⟱", 50, 54, 16.5);
    const count = Math.ceil(3 * number);

    for (let i = 0; i < waterfalls.length && i < count; i++) {
        const cell = waterfalls[i];
        const id = appendMarker(cell, "waterfall");
        const proper = cell.burg
            ? pack.burgs[cell.burg].name
            : Names.getCulture(cell.culture);
        notes.push({ id, name: toAdjective(proper) + " Waterfall" + name, legend: `An extremely beautiful waterfall` });
    }
}

function addBattlefields(cells, states, number = 1) {
    let battlefields = cells.filter(x => x.state && x.pop > 2 && x.h < 50 && x.h > 25);
    let count = battlefields.length < 100
        ? 0
        : Math.ceil(battlefields.length / 500 * number);
    if (count)
        addMarker("battlefield", "⚔️", 50, 52, 12);

    while (count && battlefields.length) {
        const [cell] = battlefields.splice(Math.floor(Math.random() * battlefields.length), 1);
        const id = appendMarker(cell, "battlefield");
        const campaign = ra(states[cell.state].campaigns);
        const date = generateDate(campaign.start, campaign.end);
        const name = Names.getCulture(cell.culture) + " Battlefield";
        const legend = `A historical battle of the ${campaign.name}. \r\nDate: ${date} ${options.era}`;
        notes.push({ id, name, legend });
        count--;
    }
}