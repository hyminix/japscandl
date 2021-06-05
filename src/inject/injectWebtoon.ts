function inject(): void {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    //@ts-ignore
    Element.prototype._attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function () {
        //@ts-ignore
        const toReturn = this._attachShadow({ mode: "open" });
        setTimeout(() => {
            //@ts-ignore
            this.shadowRoot = toReturn;
        });
        return toReturn;
    };
}
export default inject;