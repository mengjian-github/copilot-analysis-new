var telmetryNames = {
    "X-Copilot-ClientTimeBucket": "timeBucket",
    "X-Copilot-OverrideEngine": "engine",
    "X-Copilot-Repository": "repo",
    "X-Copilot-FileType": "fileType",
    "X-Copilot-UserKind": "userKind"
  },
  FilterSettings = class _FilterSettings {
    constructor(filters) {
      this.filters = filters;
      for (let [filter, value] of Object.entries(this.filters)) value === "" && delete this.filters[filter];
    }
    static {
      __name(this, "FilterSettings");
    }
    extends(otherFilterSettings) {
      for (let [filter, value] of Object.entries(otherFilterSettings.filters)) if (this.filters[filter] !== value) return !1;
      return !0;
    }
    addToTelemetry(telemetryData) {
      for (let [filter, value] of Object.entries(this.filters)) {
        let telemetryName = telmetryNames[filter];
        telemetryName !== void 0 && (telemetryData.properties[telemetryName] = value);
      }
    }
    stringify() {
      let keys = Object.keys(this.filters);
      return keys.sort(), keys.map(key => `${key}:${this.filters[key]}`).join(";");
    }
    toHeaders() {
      return {
        ...this.filters
      };
    }
    withChange(filter, value) {
      return new _FilterSettings({
        ...this.filters,
        [filter]: value
      });
    }
  };