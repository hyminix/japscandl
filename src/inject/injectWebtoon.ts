//@ts-nocheck
function inject(): void {
  Element.prototype._attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function () {
    const toReturn = this._attachShadow({ mode: "open" });
    setTimeout(() => {
      this.shadowRoot = toReturn;
    });
    return toReturn;
  };
}
export default inject;
