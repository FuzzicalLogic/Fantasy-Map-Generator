import {
    view,
    graphWidth, graphHeight,
    viewX, viewY, scale
} from "../main.js";

export const DEFAULT_MIN_ZOOM = 1;
export const DEFAULT_MAX_ZOOM = 20;
export const DEFAULT_PAN_INTERVAL = 10;
export const DEFAULT_ZOOM_DURATION = 350;

export const Camera = (svg, map) => {
    const zoom = d3.zoom()
        .scaleExtent([DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM])
        .on("zoom", onMoveCamera);
    const emitter = new EventTarget();
    const dispatchEvent = (...args) => emitter.dispatchEvent(...args)

    map.addEventListener('resize', e => {
        zoom.translateExtent([[0, 0], [e.detail.width, e.detail.height]]);
        svg.transition().duration(DEFAULT_ZOOM_DURATION).call(zoom.transform, d3.zoomIdentity);
    });

    return {
        setBoundaries: (topleft, bottomright) => {
            zoom.translateExtent([topleft, bottomright])
        },
        setZoomLimit: (min = DEFAULT_MIN_ZOOM, max = DEFAULT_MAX_ZOOM) => {
            zoom.scaleExtent([min, max])
        },
        pan: (xSteps = 0, ySteps = 0) => {
            zoom.translateBy(svg, xSteps * DEFAULT_PAN_INTERVAL, ySteps * DEFAULT_PAN_INTERVAL);
        },
        zoom: h => {
            zoom.scaleTo(svg, h);
        },
        zoomBy: x => {
            zoom.scaleBy(svg, x);
        },
        zoomTo: (x, y, z = 8, ms = DEFAULT_ZOOM_DURATION) => {
            const transform = d3.zoomIdentity
                .translate(x * -z + graphWidth / 2, y * -z + graphHeight / 2)
                .scale(z);
            svg.transition()
                .duration(ms)
                .call(zoom.transform, transform);
        },
        restore: () => {
            svg.call(zoom);
        },
        reset: (ms = DEFAULT_ZOOM_DURATION) => {
            svg.transition().duration(ms).call(zoom.transform, d3.zoomIdentity);
        },
        addEventListener: (...args) => emitter.addEventListener(...args),
        removeEventListener: (...args) => emitter.removeEventListener(...args),
    };

    function onMoveCamera() {
        const transform = d3.event.transform;
        const scaleDiff = scale - transform.k;
        const positionDiff = viewX - transform.x | viewY - transform.y;
        if (!positionDiff && !scaleDiff) return;
        view.box.attr("transform", transform);

        if (positionDiff || scaleDiff)
            dispatchEvent(new CustomEvent('move', {
                detail: {
                    zoom: transform.k,
                    position: [ transform.x, transform.y]
                }
            }));

        // zoom image converter overlay
        const canvas = document.getElementById("canvas");
        if (canvas && +canvas.style.opacity) {
            const img = document.getElementById("image");
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(scale, 0, 0, scale, viewX, viewY);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }
}
