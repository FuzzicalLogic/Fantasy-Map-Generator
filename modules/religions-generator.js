import {
    graphWidth, graphHeight, biomesData
} from "../main.js"
import * as Names from "./names-generator.js";

import { getMixedColor, gauss, rn, rw, ra, toAdjective, trimVowels, biased, rand } from "./utils.js";

const emitter = new EventTarget();
export const addEventListener = (...args) => emitter.addEventListener(...args);
export const removeEventListener = (...args) => emitter.removeEventListener(...args);
export const dispatchEvent = (...args) => emitter.dispatchEvent(...args);

  // name generation approach and relative chance to be selected
const approach = {
    "Number": 1, "Being": 3, "Adjective": 5, "Color + Animal": 5,
    "Adjective + Animal": 5, "Adjective + Being": 5, "Adjective + Genitive": 1,
    "Color + Being": 3, "Color + Genitive": 3, "Being + of + Genitive": 2, "Being + of the + Genitive": 1,
    "Animal + of + Genitive": 1, "Adjective + Being + of + Genitive": 2, "Adjective + Animal + of + Genitive": 2
};

  // turn weighted array into simple array
const approaches = [];

const base = {
    number: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"],
    being: ["God", "Goddess", "Lord", "Lady", "Deity", "Creator", "Maker", "Overlord", "Ruler", "Chief", "Master", "Spirit", "Ancestor", "Father", "Forebear", "Forefather", "Mother", "Brother", "Sister", "Elder", "Numen", "Ancient", "Virgin", "Giver", "Council", "Guardian", "Reaper"],
    animal: ["Dragon", "Wyvern", "Phoenix", "Unicorn", "Sphinx", "Centaur", "Pegasus", "Kraken", "Basilisk", "Chimera", "Cyclope", "Antelope", "Ape", "Badger", "Bear", "Beaver", "Bison", "Boar", "Buffalo", "Cat", "Cobra", "Crane", "Crocodile", "Crow", "Deer", "Dog", "Eagle", "Elk", "Fox", "Goat", "Goose", "Hare", "Hawk", "Heron", "Horse", "Hyena", "Ibis", "Jackal", "Jaguar", "Lark", "Leopard", "Lion", "Mantis", "Marten", "Moose", "Mule", "Narwhal", "Owl", "Panther", "Rat", "Raven", "Rook", "Scorpion", "Shark", "Sheep", "Snake", "Spider", "Swan", "Tiger", "Turtle", "Viper", "Vulture", "Walrus", "Wolf", "Wolverine", "Worm", "Camel", "Falcon", "Hound", "Ox", "Serpent"],
    adjective: ["New", "Good", "High", "Old", "Great", "Big", "Young", "Major", "Strong", "Happy", "Last", "Main", "Huge", "Far", "Beautiful", "Wild", "Fair", "Prime", "Crazy", "Ancient", "Proud", "Secret", "Lucky", "Sad", "Silent", "Latter", "Severe", "Fat", "Holy", "Pure", "Aggressive", "Honest", "Giant", "Mad", "Pregnant", "Distant", "Lost", "Broken", "Blind", "Friendly", "Unknown", "Sleeping", "Slumbering", "Loud", "Hungry", "Wise", "Worried", "Sacred", "Magical", "Superior", "Patient", "Dead", "Deadly", "Peaceful", "Grateful", "Frozen", "Evil", "Scary", "Burning", "Divine", "Bloody", "Dying", "Waking", "Brutal", "Unhappy", "Calm", "Cruel", "Favorable", "Blond", "Explicit", "Disturbing", "Devastating", "Brave", "Sunny", "Troubled", "Flying", "Sustainable", "Marine", "Fatal", "Inherent", "Selected", "Naval", "Cheerful", "Almighty", "Benevolent", "Eternal", "Immutable", "Infallible"],
    genitive: ["Day", "Life", "Death", "Night", "Home", "Fog", "Snow", "Winter", "Summer", "Cold", "Springs", "Gates", "Nature", "Thunder", "Lightning", "War", "Ice", "Frost", "Fire", "Doom", "Fate", "Pain", "Heaven", "Justice", "Light", "Love", "Time", "Victory"],
    theGenitive: ["World", "Word", "South", "West", "North", "East", "Sun", "Moon", "Peak", "Fall", "Dawn", "Eclipse", "Abyss", "Blood", "Tree", "Earth", "Harvest", "Rainbow", "Sea", "Sky", "Stars", "Storm", "Underworld", "Wild"],
    color: ["Dark", "Light", "Bright", "Golden", "White", "Black", "Red", "Pink", "Purple", "Blue", "Green", "Yellow", "Amber", "Orange", "Brown", "Grey"]
};

const forms = {
    Folk: { "Shamanism": 2, "Animism": 2, "Ancestor worship": 1, "Polytheism": 2 },
    Organized: { "Polytheism": 5, "Dualism": 1, "Monotheism": 4, "Non-theism": 1 },
    Cult: { "Cult": 1, "Dark Cult": 1 },
    Heresy: { "Heresy": 1 }
};

const methods = { "Random + type": 3, "Random + ism": 1, "Supreme + ism": 5, "Faith of + Supreme": 5, "Place + ism": 1, "Culture + ism": 2, "Place + ian + type": 6, "Culture + type": 4 };

const types = {
    "Shamanism": { "Beliefs": 3, "Shamanism": 2, "Spirits": 1 },
    "Animism": { "Spirits": 1, "Beliefs": 1 },
    "Ancestor worship": { "Beliefs": 1, "Forefathers": 2, "Ancestors": 2 },
    "Polytheism": { "Deities": 3, "Faith": 1, "Gods": 1, "Pantheon": 1 },

    "Dualism": { "Religion": 3, "Faith": 1, "Cult": 1 },
    "Monotheism": { "Religion": 1, "Church": 1 },
    "Non-theism": { "Beliefs": 3, "Spirits": 1 },

    "Cult": { "Cult": 4, "Sect": 4, "Worship": 1, "Orden": 1, "Coterie": 1, "Arcanum": 1 },
    "Dark Cult": { "Cult": 2, "Sect": 2, "Occultism": 1, "Idols": 1, "Coven": 1, "Circle": 1, "Blasphemy": 1 },

    "Heresy": { "Heresy": 3, "Sect": 2, "Schism": 1, "Dissenters": 1, "Circle": 1, "Brotherhood": 1, "Society": 1, "Iconoclasm": 1, "Dissent": 1, "Apostates": 1 }
};

export function initialize() {
    for (const a in approach) {
        for (let j = 0; j < approach[a]; j++) {
            approaches.push(a);
        }
    }
}

export function generate(numReligions, pack) {
    console.time('generateReligions');
    const { cells, states, cultures } = pack;
    const religions = pack.religions = [];

    cells.forEach(x => x.religion = 0);

    // add folk religions
    cultures.forEach(c => {
        if (!c.i) {
            religions.push({ i: 0, name: "No religion" });
            return;
        }
        if (c.removed) {
            religions.push({ i: c.i, name: "Extinct religion for " + c.name, color: getMixedColor(c.color, .1, 0), removed: true });
            return;
        }
        const form = rw(forms.Folk);
        const name = c.name + " " + rw(types[form]);
        const deity = form === "Animism" ? null : getDeityName(c.i);
        const color = getMixedColor(c.color, .1, 0); // `url(#hatch${rand(8,13)})`;
        religions.push({ i: c.i, name, color, culture: c.i, type: "Folk", form, deity, center: c.center, origin: 0 });
    });

    if (+numReligions == 0 || cultures.length < 2) {
        religions.filter(r => r.i)
            .forEach(r => r.code = getCode(r.name, religions));
        return;
    }

    const burgs = pack.burgs.filter(b => b.i && !b.removed);
    const sorted = burgs.length > +numReligions
        ? burgs.sort((a, b) => b.population - a.population).map(b => b.cell)
        : cells.map((v, k) => k)
            .filter(i => cells[i].s > 2)
            .sort((a, b) => cells[b].s - cells[a].s);
    const religionsTree = d3.quadtree();
    const spacing = (graphWidth + graphHeight) / 6 / numReligions; // base min distance between towns
    const cultsCount = Math.floor(rand(10, 40) / 100 * numReligions);
    const count = +numReligions - cultsCount + religions.length;

    // generate organized religions
    for (let i = 0; religions.length < count && i < 1000; i++) {
        let center = sorted[biased(0, sorted.length - 1, 5)]; // religion center
        const form = rw(forms.Organized);
        const state = cells[center].state;
        const culture = cells[center].culture;

        const deity = form === "Non-theism" ? null : getDeityName(culture);
        let [name, expansion] = getReligionName(form, deity, center, pack);
        if (expansion === "state" && !state)
            expansion = "global";
        if (expansion === "culture" && !culture)
            expansion = "global";

        if (expansion === "state" && Math.random() > .5)
            center = states[state].center;
        if (expansion === "culture" && Math.random() > .5)
            center = cultures[culture].center;
        if (!cells[center].burg && cells[center].c.some(c => cells[c].burg))
            center = cells[center].c.find(c => cells[c].burg);
        const x = cells[center].p[0], y = cells[center].p[1];

        const s = spacing * gauss(1, .3, .2, 2, 2); // randomize to make the placement not uniform
        if (religionsTree.find(x, y, s) !== undefined)
            continue; // to close to existing religion

        // add "Old" to name of the folk religion on this culture
        const folk = religions.find(r => r.culture === culture && r.type === "Folk");
        if (folk && expansion === "culture" && folk.name.slice(0, 3) !== "Old")
            folk.name = "Old " + folk.name;
        const origin = folk ? folk.i : 0;

        const expansionism = rand(3, 8);
        const color = getMixedColor(religions[origin].color, .3, 0); // `url(#hatch${rand(0,5)})`;
        religions.push({ i: religions.length, name, color, culture, type: "Organized", form, deity, expansion, expansionism, center, origin });
        religionsTree.add([x, y]);
    }

    // generate cults
    for (let i = 0; religions.length < count + cultsCount && i < 1000; i++) {
        const form = rw(forms.Cult);
        let center = sorted[biased(0, sorted.length - 1, 1)]; // religion center
        if (!cells[center].burg && cells.c[center].some(c => cells[c].burg))
            center = cells.c[center].find(c => cells[c].burg);
        const x = cells[center].p[0], y = cells[center].p[1];

        const s = spacing * gauss(2, .3, 1, 3, 2); // randomize to make the placement not uniform
        if (religionsTree.find(x, y, s) !== undefined)
            continue; // to close to existing religion

        const culture = cells[center].culture;
        const folk = religions.find(r => r.culture === culture && r.type === "Folk");
        const origin = folk ? folk.i : 0;
        const deity = getDeityName(culture);
        const name = getCultName(form, center, pack);
        const expansionism = gauss(1.1, .5, 0, 5);
        const color = getMixedColor(cultures[culture].color, .5, 0); // "url(#hatch7)";
        religions.push({ i: religions.length, name, color, culture, type: "Cult", form, deity, expansion: "global", expansionism, center, origin });
        religionsTree.add([x, y]);
    }

    expandReligions(pack);

    // generate heresies
    religions.filter(r => r.type === "Organized").forEach(r => {
        if (r.expansionism < 3) return;
        const count = gauss(0, 1, 0, 3);
        for (let i = 0; i < count; i++) {
            let center = ra(
                cells.map((v, k) => k)
                    .filter(i => cells[i].religion === r.i && cells[i].c.some(c => cells[c].religion !== r.i))
            );
            if (!center)
                continue;
            if (!cells[center].burg && cells[center].c.some(c => cells[c].burg))
                center = cells[center].c.find(c => cells[c].burg);
            const x = cells[center].p[0], y = cells[center].p[1];
            if (religionsTree.find(x, y, spacing / 10) !== undefined)
                continue; // to close to other

            const culture = cells[center].culture;
            const name = getCultName("Heresy", center, pack);
            const expansionism = gauss(1.2, .5, 0, 5);
            const color = getMixedColor(r.color, .4, .2); // "url(#hatch6)";
            religions.push({
                i: religions.length,
                name, color, culture,
                type: "Heresy",
                form: r.form,
                deity: r.deity,
                expansion: "global",
                expansionism, center,
                origin: r.i
            });
            religionsTree.add([x, y]);
        }
    });

    expandHeresies(pack);
    checkCenters(pack);

    emitter.dispatchEvent(new CustomEvent('post', {
        detail: pack
    }));

    console.timeEnd('generateReligions');
}

export function add(center, pack) {
    const { cells, religions } = pack;
    const r = cells.religion[center];
    const i = religions.length;
    const culture = cells.culture[center];
    const color = getMixedColor(religions[r].color, .3, 0);

    const type = religions[r].type === "Organized" ? rw({ Organized: 4, Cult: 1, Heresy: 2 }) : rw({ Organized: 5, Cult: 2 });
    const form = rw(forms[type]);
    const deity = type === "Heresy"
        ? religions[r].deity
        : form === "Non-theism"
            ? null
            : getDeityName(culture);

    let name, expansion;
    if (type === "Organized")
        [name, expansion] = getReligionName(form, deity, center, pack)
    else {
        name = getCultName(form, center, pack);
        expansion = "global";
    }
    const formName = type === "Heresy" ? religions[r].form : form;
    const code = getCode(name, religions);
    religions.push({
        i, name, color, culture, type,
        form: formName,
        deity, expansion,
        expansionism: 0,
        center,
        cells: 0,
        area: 0,
        rural: 0,
        urban: 0,
        origin: r,
        code
    });
    cells.religion[center] = i;
}

  // growth algorithm to assign cells to religions
function expandReligions(pack) {
    const { cells, religions } = pack;
    const queue = new PriorityQueue({ comparator: (a, b) => a.p - b.p });
    const cost = [];

    religions.filter(r => r.type === "Organized" || r.type === "Cult")
        .forEach(r => {
            cells[r.center].religion = r.i;
            queue.queue({ e: r.center, p: 0, r: r.i, s: cells[r.center].state, c: r.culture });
            cost[r.center] = 1;
        });

    const neutral = cells.length / 5000 * 200 * gauss(1, .3, .2, 2, 2) * neutralInput.value; // limit cost for organized religions growth
    const popCost = d3.max(cells.map(x => x.pop)) / 3; // enougth population to spered religion without penalty

    while (queue.length) {
        const next = queue.dequeue(), { e: n, p, r, c, s } = next;
        const expansion = religions[r].expansion;

        cells[n].c.forEach(function (e) {
            if (expansion === "culture" && c !== cells[e].culture)
                return;
            if (expansion === "state" && s !== cells[e].state)
                return;

            const cultureCost = c !== cells[e].culture ? 10 : 0;
            const stateCost = s !== cells[e].state ? 10 : 0;
            const biomeCost = cells[e].road
                ? 1
                : biomesData.cost[cells[e].biome];
            const populationCost = Math.max(rn(popCost - cells[e].pop), 0);
            const heightCost = Math.max(cells[e].h, 20) - 20;
            const waterCost = cells[e].h < 20
                ? cells[e].road
                    ? 50
                    : 1000
                : 0;
            const totalCost = p + (cultureCost + stateCost + biomeCost + populationCost + heightCost + waterCost) / religions[r].expansionism;
            if (totalCost > neutral)
                return;

            if (!cost[e] || totalCost < cost[e]) {
                if (cells[e].h >= 20 && cells[e].culture)
                    cells[e].religion = r; // assign religion to cell
                cost[e] = totalCost;
                queue.queue({ e, p: totalCost, r, c, s });
            }
        });
    }
}

  // growth algorithm to assign cells to heresies
function expandHeresies(pack) {
    const { cells, religions } = pack;
    const queue = new PriorityQueue({ comparator: (a, b) => a.p - b.p });
    const cost = [];

    religions.filter(r => r.type === "Heresy").forEach(r => {
        const b = cells[r.center].religion; // "base" religion id
        cells[r.center].religion = r.i; // heresy id
        queue.queue({ e: r.center, p: 0, r: r.i, b });
        cost[r.center] = 1;
    });

    const neutral = cells.length / 5000 * 500 * neutralInput.value; // limit cost for heresies growth

    while (queue.length) {
        const next = queue.dequeue(), { e: n, p, r, b } = next;

        cells[n].c.forEach(function (e) {
            const religionCost = cells[e].religion === b ? 0 : 2000;
            const biomeCost = cells[e].road
                ? 0
                : biomesData.cost[cells[e].biome];
            const heightCost = Math.max(cells[e].h, 20) - 20;
            const waterCost = cells[e].h < 20
                ? cells[e].road
                    ? 50
                    : 1000
                : 0;
            const totalCost = p + (religionCost + biomeCost + heightCost + waterCost) / Math.max(religions[r].expansionism, .1);

            if (totalCost > neutral) return;

            if (!cost[e] || totalCost < cost[e]) {
                if (cells[e].h >= 20 && cells[e].culture)
                    cells[e].religion = r; // assign religion to cell
                cost[e] = totalCost;
                queue.queue({ e, p: totalCost, r });
            }
        });
    }
}

function checkCenters(pack) {
    const { cells, religions } = pack;

    religions.filter(r => r.i).forEach(r => {
        // generate religion code (abbreviation)
        r.code = getCode(r.name, religions);

        // move religion center if it's not within religion area after expansion
        if (cells[r.center].religion === r.i)
            return; // in area
        const religCells = cells.filter(x => x.religion === r.i);
        if (!religCells.length)
            return; // extinct religion
        r.center = religCells.sort((a, b) => b.pop - a.pop)[0];
    });
}

export function updateCultures(pack) {
    console.time('updateCulturesForReligions');
    pack.religions = pack.religions.map((religion, index) => {
        if (index === 0) {
            return religion;
        }
        return { ...religion, culture: pack.cells[religion.center].culture };
    });
    console.timeEnd('updateCulturesForReligions');
}

  // assign a unique two-letters code (abbreviation)
function getCode(rawName, religions) {
    const name = rawName.replace("Old ", ""); // remove Old prefix
    const words = name.split(" "), letters = words.join("");
    let code = words.length === 2
        ? words[0][0] + words[1][0]
        : letters.slice(0, 2);
    for (let i = 1; i < letters.length - 1 && religions.some(r => r.code === code); i++) {
        code = letters[0] + letters[i].toUpperCase();
    }
    return code;
}

  // get supreme deity name
export function getDeityName(culture) {
    if (culture === undefined) {
        console.error("Please define a culture");
        return;
    }
    const meaning = generateMeaning();
    const cultureName = Names.getCulture(culture, null, null, "", .8);
    return cultureName + ", The " + meaning;
}

function generateMeaning() {
    const a = ra(approaches); // select generation approach
    if (a === "Number") return ra(base.number);
    if (a === "Being") return ra(base.being);
    if (a === "Adjective") return ra(base.adjective);
    if (a === "Color + Animal") return ra(base.color) + " " + ra(base.animal);
    if (a === "Adjective + Animal") return ra(base.adjective) + " " + ra(base.animal);
    if (a === "Adjective + Being") return ra(base.adjective) + " " + ra(base.being);
    if (a === "Adjective + Genitive") return ra(base.adjective) + " " + ra(base.genitive);
    if (a === "Color + Being") return ra(base.color) + " " + ra(base.being);
    if (a === "Color + Genitive") return ra(base.color) + " " + ra(base.genitive);
    if (a === "Being + of + Genitive") return ra(base.being) + " of " + ra(base.genitive);
    if (a === "Being + of the + Genitive") return ra(base.being) + " of the " + ra(base.theGenitive);
    if (a === "Animal + of + Genitive") return ra(base.animal) + " of " + ra(base.genitive);
    if (a === "Adjective + Being + of + Genitive") return ra(base.adjective) + " " + ra(base.being) + " of " + ra(base.genitive);
    if (a === "Adjective + Animal + of + Genitive") return ra(base.adjective) + " " + ra(base.animal) + " of " + ra(base.genitive);
}

function getReligionName(form, deity, center, pack) {
    const cells = pack.cells;
    const random = () => Names.getCulture(cells[center].culture, null, null, "", 0);
    const type = function () { return rw(types[form]); }
    const supreme = function () { return deity.split(/[ ,]+/)[0]; }
    const place = function (adj) {
        const base = cells[center].burg
            ? pack.burgs[cells[center].burg].name
            : pack.states[cells[center].state].name;
        let name = trimVowels(base.split(/[ ,]+/)[0]);
        return adj ? toAdjective(name) : name;
    }
    const culture = () => pack.cultures[cells[center].culture].name;

    const m = rw(methods);
    if (m === "Random + type") return [random() + " " + type(), "global"];
    if (m === "Random + ism") return [trimVowels(random()) + "ism", "global"];
    if (m === "Supreme + ism" && deity) return [trimVowels(supreme()) + "ism", "global"];
    if (m === "Faith of + Supreme" && deity) return [ra(['Faith', 'Way', 'Path', 'Word', 'Witnesses']) + " of " + supreme(), "global"];
    if (m === "Place + ism") return [place() + "ism", "state"];
    if (m === "Culture + ism") return [trimVowels(culture()) + "ism", "culture"];
    if (m === "Place + ian + type") return [place("adj") + " " + type(), "state"];
    if (m === "Culture + type") return [culture() + " " + type(), "culture"];
    return [trimVowels(random()) + "ism", "global"]; // else
}

function getCultName(form, center, pack) {
    const cells = pack.cells;
    const type = function () {
        return rw(types[form]);
    }
    const random = function () {
        return trimVowels(Names.getCulture(cells[center].culture, null, null, "", 0).split(/[ ,]+/)[0]);
    }
    const burg = function () {
        return trimVowels(pack.burgs[cells[center].burg].name.split(/[ ,]+/)[0]);
    }
    if (cells[center].burg)
        return burg() + "ian " + type();
    if (Math.random() > .5)
        return random() + "ian " + type();
    return type() + " of the " + generateMeaning();
}

