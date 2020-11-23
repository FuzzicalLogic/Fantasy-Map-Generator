import {
    pack, nameBases
} from "../main.js";

import { tip, unlock, locked } from "./ui/general.js";
import { P, ra, vowel, capitalize, last, rand } from "./utils.js";
import { BASE_NAMES } from "../config/basenames.js";

let chains = [];

export const getNameBases = () => BASE_NAMES;

 // calculate Markov chain for a namesbase
export function calculateChain(string) {
    const chain = [], array = string.split(",");

    for (const n of array) {
        let name = n.trim().toLowerCase();
        const basic = !(/[^\u0000-\u007f]/.test(name)); // basic chars and English rules can be applied

        // split word into pseudo-syllables
        for (let i = -1, syllable = ""; i < name.length; i += (syllable.length || 1), syllable = "") {
            let prev = name[i] || ""; // pre-onset letter
            let v = 0; // 0 if no vowels in syllable

            for (let c = i + 1; name[c] && syllable.length < 5; c++) {
                const that = name[c], next = name[c + 1]; // next char
                syllable += that;
                if (syllable === " " || syllable === "-") break; // syllable starts with space or hyphen
                if (!next || next === " " || next === "-") break; // no need to check

                if (vowel(that)) v = 1; // check if letter is vowel

                // do not split some diphthongs
                if (that === "y" && next === "e") continue; // 'ye'
                if (basic) { // English-like
                    if (that === "o" && next === "o") continue; // 'oo'
                    if (that === "e" && next === "e") continue; // 'ee'
                    if (that === "a" && next === "e") continue; // 'ae'
                    if (that === "c" && next === "h") continue; // 'ch'
                }

                if (vowel(that) === next) break; // two same vowels in a row
                if (v && vowel(name[c + 2])) break; // syllable has vowel and additional vowel is expected soon
            }

            if (chain[prev] === undefined) chain[prev] = [];
            chain[prev].push(syllable);
        }
    }

    return chain;
}

  // update chain for specific base
export function updateChain(i) { chains[i] = nameBases[i] || nameBases[i].b ? calculateChain(nameBases[i].b) : null; }

  // update chains for all used bases
export function clearChains() { chains = []; }

  // generate name using Markov's chain
export const getBase = function (base, min, max, dupl) {
    if (base === undefined) { console.error("Please define a base"); return; }
    if (!chains[base]) updateChain(base);

    const data = chains[base];
    if (!data || data[""] === undefined) {
        tip("Namesbase " + base + " is incorrect. Please check in namesbase editor", false, "error");
        console.error("Namebase " + base + " is incorrect!");
        return "ERROR";
    }

    if (!min) min = nameBases[base].min;
    if (!max) max = nameBases[base].max;
    if (dupl !== "") dupl = nameBases[base].d;

    let v = data[""], cur = ra(v), w = "";
    for (let i = 0; i < 20; i++) {
        if (cur === "") { // end of word
            if (w.length < min) { cur = ""; w = ""; v = data[""]; } else break;
        } else {
            if (w.length + cur.length > max) { // word too long
                if (w.length < min) w += cur;
                break;
            } else v = data[last(cur)] || data[""];
        }

        w += cur;
        cur = ra(v);
    }

    // parse word to get a final name
    const l = last(w); // last letter
    if (l === "'" || l === " " || l === "-") w = w.slice(0, -1); // not allow some characters at the end
    const basic = !(/[^\u0000-\u007f]/.test(w)); // true if word has only basic characters

    let name = [...w].reduce(function (r, c, i, d) {
        if (c === d[i + 1] && !dupl.includes(c)) return r; // duplication is not allowed
        if (!r.length) return c.toUpperCase();
        if (r.slice(-1) === "-" && c === " ") return r; // remove space after hyphen
        if (r.slice(-1) === " ") return r + c.toUpperCase(); // capitalize letter after space
        if (r.slice(-1) === "-") return r + c.toUpperCase(); // capitalize letter after hyphen
        if (c === "a" && d[i + 1] === "e") return r; // "ae" => "e"
        if (basic && i + 1 < d.length && !vowel(c) && !vowel(d[i - 1]) && !vowel(d[i + 1])) return r; // remove consonant between 2 consonants
        if (i + 2 < d.length && c === d[i + 1] && c === d[i + 2]) return r; // remove three same letters in a row
        return r + c;
    }, "");

    // join the word if any part has only 1 letter
    if (name.split(" ").some(part => part.length < 2)) name = name.split(" ").map((p, i) => i ? p.toLowerCase() : p).join("");

    if (name.length < 2) {
        console.error("Name is too short! Random name will be selected");
        name = ra(nameBases[base].b.split(","));
    }

    return name;
}

  // generate name for culture
export function getCulture(culture, min, max, dupl) {
    if (culture === undefined) {
        console.error("Please define a culture");
        return;
    }
    const base = pack.cultures[culture].base;
    return getBase(base, min, max, dupl);
}

  // generate short name for culture
export function getCultureShort(culture) {
    if (culture === undefined) { console.error("Please define a culture"); return; }
    return getBaseShort(pack.cultures[culture].base);
}

  // generate short name for base
export function getBaseShort(base) {
    if (nameBases[base] === undefined) {
        tip(`Namebase ${base} does not exist. Please upload custom namebases of change the base in Cultures Editor`, false, "error");
        base = 1;
    }
    const min = nameBases[base].min - 1;
    const max = Math.max(nameBases[base].max - 2, min);
    return getBase(base, min, max, "", 0);
}

  // generate state name based on capital or random name and culture-specific suffix
export function getState(name, culture, base) {
    if (name === undefined) { console.error("Please define a base name"); return; }
    if (culture === undefined && base === undefined) { console.error("Please define a culture"); return; }
    if (base === undefined) base = pack.cultures[culture].base;

    // exclude endings inappropriate for states name
    if (name.includes(" ")) name = capitalize(name.replace(/ /g, "").toLowerCase()); // don't allow multiword state names
    if (name.length > 6 && name.slice(-4) === "berg") name = name.slice(0, -4); // remove -berg for any
    if (name.length > 5 && name.slice(-3) === "ton") name = name.slice(0, -3); // remove -ton for any

    if (base === 5 && ["sk", "ev", "ov"].includes(name.slice(-2))) name = name.slice(0, -2); // remove -sk/-ev/-ov for Ruthenian
    else if (base === 12) return vowel(name.slice(-1)) ? name : name + "u"; // Japanese ends on any vowel or -u
    else if (base === 18 && P(.4)) name = vowel(name.slice(0, 1).toLowerCase()) ? "Al" + name.toLowerCase() : "Al " + name; // Arabic starts with -Al

    // no suffix for fantasy bases
    if (base > 32 && base < 42) return name;

    // define if suffix should be used
    if (name.length > 3 && vowel(name.slice(-1))) {
        if (vowel(name.slice(-2, -1)) && P(.85)) name = name.slice(0, -2); // 85% for vv
        else if (P(.7)) name = name.slice(0, -1); // ~60% for cv
        else return name;
    } else if (P(.4)) return name; // 60% for cc and vc

    // define suffix
    let suffix = "ia"; // standard suffix

    const rnd = Math.random(), l = name.length;
    if (base === 3 && rnd < .03 && l < 7) suffix = "terra"; // Italian
    else if (base === 4 && rnd < .03 && l < 7) suffix = "terra"; // Spanish
    else if (base === 13 && rnd < .03 && l < 7) suffix = "terra"; // Portuguese
    else if (base === 2 && rnd < .03 && l < 7) suffix = "terre"; // French
    else if (base === 0 && rnd < .5 && l < 7) suffix = "land"; // German
    else if (base === 1 && rnd < .4 && l < 7) suffix = "land"; // English
    else if (base === 6 && rnd < .3 && l < 7) suffix = "land"; // Nordic
    else if (base === 32 && rnd < .1 && l < 7) suffix = "land"; // generic Human
    else if (base === 7 && rnd < .1) suffix = "eia"; // Greek
    else if (base === 9 && rnd < .35) suffix = "maa"; // Finnic
    else if (base === 15 && rnd < .4 && l < 6) suffix = "orszag"; // Hungarian
    else if (base === 16) suffix = rnd < .6 ? "stan" : "ya"; // Turkish
    else if (base === 10) suffix = "guk"; // Korean
    else if (base === 11) suffix = " Guo"; // Chinese
    else if (base === 14) suffix = rnd < .5 && l < 6 ? "tlan" : "co"; // Nahuatl
    else if (base === 17 && rnd < .8) suffix = "a"; // Berber
    else if (base === 18 && rnd < .8) suffix = "a"; // Arabic

    return validateSuffix(name, suffix);
}

function validateSuffix(name, suffix) {
    if (name.slice(-1 * suffix.length) === suffix) return name; // no suffix if name already ends with it
    const s1 = suffix.charAt(0);
    if (name.slice(-1) === s1) name = name.slice(0, -1); // remove name last letter if it's a suffix first letter
    if (vowel(s1) === vowel(name.slice(-1)) && vowel(s1) === vowel(name.slice(-2, -1))) name = name.slice(0, -1); // remove name last char if 2 last chars are the same type as suffix's 1st
    if (name.slice(-1) === s1) name = name.slice(0, -1); // remove name last letter if it's a suffix first letter
    return name + suffix;
}

  // generato name for the map
export function getMapName(force) {
    if (!force && locked("mapName")) return;
    if (force && locked("mapName")) unlock("mapName");
    const base = P(.7) ? 2 : P(.5) ? rand(0, 6) : rand(0, 31);
    if (!nameBases[base]) { tip("Namebase is not found", false, "error"); return "" };
    const min = nameBases[base].min - 1;
    const max = Math.max(nameBases[base].max - 3, min);
    const baseName = getBase(base, min, max, "", 0);
    const name = P(.7) ? addSuffix(baseName) : baseName;
    mapName.value = name;
}

function addSuffix(name) {
    const suffix = P(.8) ? "ia" : "land";
    if (suffix === "ia" && name.length > 6) name = name.slice(0, -(name.length - 3)); else
        if (suffix === "land" && name.length > 6) name = name.slice(0, -(name.length - 5));
    return validateSuffix(name, suffix);
}

