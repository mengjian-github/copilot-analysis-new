var ExpConfig = class _ExpConfig {
  static {
    __name(this, "ExpConfig");
  }
  constructor(variables, assignmentContext, features) {
    this.variables = variables, this.assignmentContext = assignmentContext, this.features = features;
  }
  static createFallbackConfig(ctx, reason) {
    return telemetryExpProblem(ctx, {
      reason: reason
    }), this.createEmptyConfig();
  }
  static createEmptyConfig() {
    return new _ExpConfig({}, "", "");
  }
  addToTelemetry(telemetryData) {
    telemetryData.properties["VSCode.ABExp.Features"] = this.features, telemetryData.properties["abexp.assignmentcontext"] = this.assignmentContext;
  }
};