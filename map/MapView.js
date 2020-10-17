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
        get debug() { return this.box.select("#debug") },
        layers: {

        }
    }
}

MapView.initialize = view => {
    view.svg.append("g").attr("id", "legend");

    let { box } = view;
    box.append("g").attr("id", "ocean");
    box.append("g").attr("id", "lakes");
    box.append("g").attr("id", "landmass");
    box.append("g").attr("id", "texture");
    box.append("g").attr("id", "terrs");
}