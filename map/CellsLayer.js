import {
    grid, pack,
    view,
    customization
} from "../main.js";
import { getGridPolygon, getPackPolygon } from "../modules/utils.js";

export function drawCells() {
    view.cells.selectAll("path").remove();
    const data = customization === 1 ? grid.cells.i : pack.cells.map(({ i }) => i);
    const polygon = customization === 1 ? getGridPolygon : getPackPolygon;
    let path = "";
    data.forEach(i => path += "M" + polygon(i));
    view.cells.append("path").attr("d", path);
}
