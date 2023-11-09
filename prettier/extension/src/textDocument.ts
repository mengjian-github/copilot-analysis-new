var import_vscode = require("vscode");,var ExtensionLocationFactory = class extends LocationFactory {
  static {
    __name(this, "ExtensionLocationFactory");
  }
  range(x1, y1, x2, y2) {
    return x2 !== void 0 && y2 !== void 0 ? new my.Range(x1, y1, x2, y2) : new my.Range(x1, y1);
  }
  position(line, character) {
    return new my.Position(line, character);
  }
};