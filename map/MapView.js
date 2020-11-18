import { MapLayer } from "./MapLayer.js";

export const MapView = el => {
    return {
        get svg() { return d3.select(el) },
        get box() { return this.svg.select('#viewbox') },
        get defs() { return this.svg.select("#deftemp") },
        get scaleBar() { return this.svg.select("#scaleBar") },
        get legend() { return this.svg.select("#legend") },
        get ocean() { return this.box.select("#ocean") },
        get lakes() { return this.box.select("#lakes") },
        get landmass() { return this.box.select("#landmass") },
        get texture() { return this.box.select("#texture") },
        get terrs() { return this.box.select('#terrs') },
        get biomes() { return this.box.select('#biomes') },
        get cells() { return this.box.select('#cells') },
        get gridOverlay() { return this.box.select('#gridOverlay') },
        get coordinates() { return this.box.select('#coordinates') },
        get compass() { return this.box.select('#compass') },
        get rivers() { return this.box.select('#rivers') },
        get terrain() { return this.box.select('#terrain') },
        get relig() { return this.box.select('#relig') },
        get cults() { return this.box.select('#cults') },
        get regions() { return this.box.select('#regions') },
        get provs() { return this.box.select('#provs') },
        get zones() { return this.box.select('#zones') },
        get borders() { return this.box.select('#borders') },
        get routes() { return this.box.select('#routes') },
        get temperature() { return this.box.select('#temperature') },
        get coastline() { return this.box.select('#coastline') },
        get ice() { return this.box.select('#ice') },
        get prec() { return this.box.select('#prec') },
        get population() { return this.box.select('#population') },
        get labels() { return this.box.select('#labels') },
        get icons() { return this.box.select('#icons') },
        get armies() { return this.box.select('#armies') },
        get markers() { return this.box.select('#markers') },
        get fogging() { return this.box.select('#fogging') },
        get ruler() { return this.box.select('#ruler') },
        get debug() { return this.box.select("#debug") },
        layers: []
    }
}

MapView.initialize = view => {
    let { box } = view;
    view.svg.append("g").attr("id", "legend");

    box.append("g").attr("id", "ocean");
    box.append("g").attr("id", "lakes");
    box.append("g").attr("id", "landmass");
    box.append("g").attr("id", "texture");
    box.append("g").attr("id", "terrs").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "biomes");
    box.append("g").attr("id", "cells").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "gridOverlay");
    box.append("g").attr("id", "coordinates").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "compass").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "rivers").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "terrain");
    box.append("g").attr("id", "relig").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "cults").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "regions");
    box.append("g").attr("id", "provs");
    box.append("g").attr("id", "zones").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "borders").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "routes").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "temperature").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "coastline");
    box.append("g").attr("id", "ice").style("display", "none");
    box.append("g").attr("id", "prec").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "population").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "labels").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "icons").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "armies").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "markers").attr('class', 'Layer Hidden');
    box.append("g").attr("id", "fogging-cont").attr("mask", "url(#fog)").append("g").attr("id", "fogging").style("display", "none");
    box.append("g").attr("id", "ruler").attr('class', 'Layer Hidden');
}