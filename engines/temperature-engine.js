import {
    graphHeight, mapCoordinates
} from "../main.js";
import {
    rn
} from "../modules/utils.js";

const emitter = new EventTarget();
export const addEventListener = (...args) => emitter.addEventListener(...args);
export const removeEventListener = (...args) => emitter.removeEventListener(...args);
export const dispatchEvent = (...args) => emitter.dispatchEvent(...args);

export function calculateTemperatures({ cells, cellsX, points, vertices }) {
    console.time('calculateTemperatures');

    const tEq = +temperatureEquatorInput.value;
    const tPole = +temperaturePoleInput.value;
    const tDelta = tEq - tPole;
    const int = d3.easePolyInOut.exponent(.5); // interpolation function

    d3.range(0, cells.length, cellsX).forEach(function (r) {
        const y = points[r][1];
        const lat = Math.abs(mapCoordinates.latN - y / graphHeight * mapCoordinates.latT); // [0; 90]
        const initTemp = tEq - int(lat / 90) * tDelta;
        for (let i = r; i < r + cellsX; i++) {
            cells[i].temp = ~~Math.max(Math.min(initTemp - convertToFriendly(cells[i].h), 127), -128);
        }
    });

    // temperature decreases by 6.5 degree C per 1km
    function convertToFriendly(h) {
        if (h < 20) return 0;
        const exponent = +heightExponentInput.value;
        const height = Math.pow(h - 18, exponent);
        return rn(height / 1000 * 6.5);
    }

    dispatchEvent(new CustomEvent('post', {
        detail: {
            cells: cells,
            vertices: vertices,
        }
    }));
    console.timeEnd('calculateTemperatures');
}
