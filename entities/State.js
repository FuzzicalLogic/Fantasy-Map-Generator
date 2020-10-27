import { pack } from "../main.js";
import { toAdjective, rw, P, rand } from "../modules/utils.js";

export const State = v => ({ ...v, ...STATE_DEFAULTS, neighbors: new Set() });

const STATE_DEFAULTS = {
    cells: 0, area: 0, burgs: 0, rural: 0, urban: 0
}
const FORMS_ADJECTIVE = [
    "Empire",
    "Sultanate",
    "Khaganate",
    "Shogunate",
    "Caliphate",
    "Despotate",
    "Theocracy",
    "Oligarchy",
    "Union",
    "Confederation",
    "Trade Company",
    "League",
    "Tetrarchy",
    "Triumvirate",
    "Diarchy",
    "Horde"
];

const MONARCHY_TIERS = [
    "Duchy",
    "Grand Duchy",
    "Principality",
    "Kingdom",
    "Empire"
]; // per expansionism tier
const REPUBLIC_TYPES = {
    Republic: 75,
    Federation: 4,
    Oligarchy: 2,
    Tetrarchy: 1,
    Triumvirate: 1,
    Diarchy: 1,
    "Trade Company": 4,
    Junta: 1
}; // weighted random
const UNION_TYPES = {
    Union: 3,
    League: 4,
    Confederation: 1,
    "United Kingdom": 1,
    "United Republic": 1,
    "United Provinces": 2,
    Commonwealth: 1,
    Heptarchy: 1
}; // weighted random

export function getFullName({ name, formName: form}) {
    if (!form) return name;
    if (!name) return `The ${form}`;
    // state forms requiring Adjective + Name, all other forms use scheme Form + Of + Name
    return FORMS_ADJECTIVE.includes(form)
        ? `${toAdjective(name)} ${form}`
        : `${form} of ${name}`;
}

const median = () => d3.median(pack.states.map(({ area }) => area));
const empireMin = () => pack.states.map(({ area }) => area)
    .sort((a, b) => b - a)[Math.max(Math.ceil(pack.states.length ** .4) - 2, 0)];
export const getExpansionTier = ({ area }) => {
    let tier = Math.min(Math.floor(area / median() * 2.6), 4);
    if (tier === 4 && area < empireMin()) tier = 3;
    return tier;
};

export function getCulturedForm(s) {
    const base = pack.cultures[s.culture].base;

    if (s.form === "Monarchy") {
        const tier = getExpansionTier(s);
        const form = MONARCHY_TIERS[tier];
        // Default name depends on exponent tier, some culture bases have special names for tiers
        if (s.diplomacy) {
            if (form === "Duchy" && s.neighbors.length > 1 && rand(6) < s.neighbors.length && s.diplomacy.includes("Vassal"))
                return "Marches"; // some vassal dutchies on borderland
            if (P(.3) && s.diplomacy.includes("Vassal"))
                return "Protectorate"; // some vassals
        }

        let alts = Object.keys(ALT_FORMNAMES.Monarchy)
            .filter((v, k, a) => ALT_FORMNAMES.Monarchy[v].cultures.includes(base))
            .filter((v, k, a) => ALT_FORMNAMES.Monarchy[v].tiers.includes(tier))
        return !!alts[0] ? alts[0] : form;
    }

    if (s.form === "Republic") {
        // Default name is from weighted array, special case for small states with only 1 burg
        if (getExpansionTier(s) < 2 && s.burgs === 1) {
            if (trimVowels(s.name) === trimVowels(pack.burgs[s.capital].name)) {
                s.name = pack.burgs[s.capital].name;
                return "Free City";
            }
            if (P(.3)) return "City-state";
        }
        return rw(REPUBLIC_TYPES);
    }

    if (s.form === "Union") return rw(UNION_TYPES);

    if (s.form === "Theocracy") {
        let r = Math.random();
        return Object.keys(ALT_FORMNAMES.Theocracy)
            .reduce((acc, cur, idx, src) => {
                if (acc !== 'Theocracy') return acc;

                if (!!ALT_FORMNAMES.Theocracy[cur].cultures
                && ALT_FORMNAMES.Theocracy[cur].cultures.includes(base))
                    return r < ALT_FORMNAMES.Theocracy[cur].probability ? cur : acc;
                return r < ALT_FORMNAMES.Theocracy[cur].probability ? cur : acc;
            }, 'Theocracy')
    }
}

const ALT_FORMNAMES = {
    Monarchy: {
        Sultanate: {
            tiers: [3, 4],
            cultures: [16]
        },
        Tsardom: {
            tiers: [3, 4],
            cultures: [5]
        },
        Khaganate: {
            tiers: [3, 4],
            cultures: [31]
        },
        Shogunate: {
            tiers: [1, 3],
            cultures: [12]
        },
        Caliphate: {
            tiers: [4],
            cultures: [17, 18]
        },
        Emirate: {
            tiers: [0, 1],
            cultures: [18]
        },
        Despotate: {
            tiers: [0, 1],
            cultures: [7]
        },
        Ulus: {
            tiers: [0, 1],
            cultures: [31]
        },
        Beylik: {
            tiers: [0, 1],
            cultures: [16]
        },
        Satrapy: {
            tiers: [0, 1],
            cultures: [24]
        }
    },
    Theocracy: {
        Diocese: {
            probability: .5,
            cultures: [0, 1, 2, 3, 4, 6, 8, 9, 13, 15, 20]
        },
        Eparchy: {
            probability: .9,
            cultures: [5, 7]
        },
        Imamah: {
            probability: .9,
            cultures: [21, 16]
        },
        Caliphate: {
            probability: .8,
            cultures: [17, 18, 28]
        },
        Thearchy: {
            probability: .02
        },
        See: {
            probability: .05
        },
    }
}

window.getStateCells = getCells;
export function getCells(state, cells = pack.cells) {
    return cells.i.filter(idx => cells.state[idx] === state.i);
}

export function getBurgs(state, burgs = pack.burgs) {
    return burgs.filter(({ state: inState }) => inState === state.i)
}

export function setStatistics(state, { cells: { area, pop, c, state: inState } }) {
    let controlled = getCells(state);
    state.cells = controlled.length;
    state.area = controlled.reduce((sum, idx) => sum += area[idx], 0);
    state.rural = controlled.reduce((sum, idx) => sum += pop[idx], 0);
    state.neighbors = controlled.reduce((arr, idx) => [...arr, ...c[idx]], [])
        .filter(x => !!inState[x] && inState[x] !== state.i)
        .map(x => inState[x])
        .reduce((arr, x) => arr.includes(x) ? arr : [...arr, x], []);
    let myburgs = getBurgs(state);
    state.burgs = myburgs.length;
    state.urban = myburgs.reduce((sum, x) => sum += x.population, 0);
}