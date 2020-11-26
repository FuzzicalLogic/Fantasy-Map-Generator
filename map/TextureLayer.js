import { view, graphWidth, graphHeight } from "../main.js";
import { getDefaultTexture } from "../modules/utils.js";
import { setBase64Texture, addEventListener as onStyleEvent } from "../modules/ui/style.js";

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

onStyleEvent('change', e => {
    if (e.detail.layer !== 'texture')
        return;

    const { xShift, yShift, image } = e.detail;
    if (xShift !== undefined)
        onShiftChange([xShift, view.texture.select('image').attr('y')]);
    if (yShift !== undefined)
        onShiftChange([view.texture.select('image').attr('x'), yShift]);
    if (image !== undefined)
        onTextureImageChange(image);
});

const onShiftChange = ([x, y]) => {
    if (!!x) {
        view.texture.select("image")
            .attr("x", x)
            .attr("width", graphWidth - x);
    }
    if (!!y) {
        view.texture.select("image")
            .attr("y", y)
            .attr("height", graphHeight - y);
    }
}

const onTextureImageChange = img => {
    if (img === "none")
        texture.select("image").attr("xlink:href", "");
    else if (img === "default")
        texture.select("image").attr("xlink:href", getDefaultTexture());
    else setBase64Texture(img);
}