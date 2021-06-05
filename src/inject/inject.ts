//@ts-nocheck
function inject(): void {
    Element.prototype.__attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function () {
        const toReturn = this.__attachShadow({ mode: "open" });
        setTimeout(() => {
            const allCanvas = toReturn.querySelector("div").querySelectorAll("canvas");
            allCanvas.forEach((canvas) => {
                try {
                    canvas.getContext("2d").getImageData(0, 0, 0, 0);
                } catch (e) {
                    document.body.appendChild(canvas);
                }
            });
        });
        return toReturn;
    };
}

export default inject;