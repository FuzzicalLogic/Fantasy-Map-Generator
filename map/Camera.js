import {
    view,
    viewX, viewY, scale,
    setViewX, setViewY, setScale
} from "../main.js";

export const DEFAULT_MIN_ZOOM = 1;
export const DEFAULT_MAX_ZOOM = 20;
export const DEFAULT_PAN_INTERVAL = 10;
export const DEFAULT_ZOOM_DURATION = 350;

export const Camera = (svg) => {
    const zoom = d3.zoom()
        .scaleExtent([DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM])
        .on("zoom", onMoveCamera);

    return {
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
        reset: (ms = DEFAULT_ZOOM_DURATION) => {
            svg.transition().duration(ms).call(zoom.transform, d3.zoomIdentity);
        }
    };
}

function onMoveCamera() {
    const transform = d3.event.transform;
    const scaleDiff = scale - transform.k;
    const positionDiff = viewX - transform.x | viewY - transform.y;
    if (!positionDiff && !scaleDiff) return;

    setScale(transform.k);
    setViewX(transform.x);
    setViewY(transform.y);
    view.box.attr("transform", transform);

    // update grid only if view position
    if (positionDiff) drawCoordinates();

    // rescale only if zoom is changed
    if (scaleDiff) {
        invokeActiveZooming();
        drawScaleBar();
    }

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

