export const MapView = el => {
    return {
        get svg() { return d3.select(el) },
        get box() { return this.svg.select('#viewbox') },
        get defs() { return this.svg.select("#deftemp") },
        get scaleBar() { return this.svg.select("#scaleBar") },
        get legend() { return this.svg.select("#legend") },
        layers: {

        }
    }
}