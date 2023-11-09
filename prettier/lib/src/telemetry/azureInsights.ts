var APP_INSIGHTS_KEY = "7d7048df-6dd0-4048-bb23-b716c1461f8f",
  APP_INSIGHTS_KEY_SECURE = "3fdd7f28-937a-48c8-9a21-ba337db23bd1",
  APP_INSIGHTS_KEY_FT = "f0000000-0000-0000-0000-000000000000";,async function setupTelemetryReporters(ctx, telemetryNamespace, telemetryEnabled) {
  let deactivation = ctx.get(TelemetryReporters).deactivate();
  if (telemetryEnabled) {
    let container = ctx.get(TelemetryReporters),
      reporter = new AzureInsightReporter(ctx, telemetryNamespace, APP_INSIGHTS_KEY);
    container.setReporter(reporter);
    let reporterRestricted = new AzureInsightReporter(ctx, telemetryNamespace, APP_INSIGHTS_KEY_SECURE);
    container.setRestrictedReporter(reporterRestricted);
    let reporterFt = new AzureInsightReporter(ctx, telemetryNamespace, APP_INSIGHTS_KEY_FT);
    container.setFTReporter(reporterFt);
  }
  await deactivation;
},__name(setupTelemetryReporters, "setupTelemetryReporters");