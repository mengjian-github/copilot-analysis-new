function escapeForRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
},__name(escapeForRegExp, "escapeForRegExp");,var rootDirRegExp = new RegExp(escapeForRegExp(__dirname.replace(/[\\/]extension[\\/]src$|[\\/]dist$/, "")) + `[\\\\/]?([^:)'"\\s]*)`, "gi"),
  irrelevantStackPaths = new Set(["node_modules/diagnostic-channel/dist/src/patchRequire.js"]),
  TelemetryDelegator = class {
    constructor(handler) {
      this.handler = handler;
    }
    static {
      __name(this, "TelemetryDelegator");
    }
    sendEventData() {}
    sendErrorData(error) {
      let relevant = !1;
      for (let match of (error.stack ?? "").matchAll(rootDirRegExp)) if (!irrelevantStackPaths.has(match[1].replace(/\\/g, "/"))) {
        relevant = !0;
        break;
      }
      relevant && this.handler(error);
    }
  };