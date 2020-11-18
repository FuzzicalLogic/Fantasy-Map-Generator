import { view, graphWidth, graphHeight } from "../main.js";
import { getDefaultTexture } from "../modules/utils.js";
import { setBase64Texture } from "../modules/ui/style.js";

export function applyTexture() {
    const x = +styleTextureShiftX.value, y = +styleTextureShiftY.value;
    const href = styleTextureInput.value === "default"
        ? getDefaultTexture()
        : setBase64Texture(styleTextureInput.value);

    view.texture.append("image")
        .attr("id", "textureImage")
        .attr("x", x)
        .attr("y", y)
        .attr("width", graphWidth - x)
        .attr("height", graphHeight - y)
        .attr("xlink:href", href)
        .attr("preserveAspectRatio", "xMidYMid slice");
}