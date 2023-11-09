async function telemetryAuthNotifyShown(ctx, authSource) {
  let data = TelemetryData.createAndMarkAsIssued({
    authSource: authSource
  });
  await telemetry(ctx, "auth.auth_notify_shown", data);
},__name(telemetryAuthNotifyShown, "telemetryAuthNotifyShown");,async function telemetryAuthNotifyDismissed(ctx) {
  await telemetry(ctx, "auth.auth_notify_dismissed");
},__name(telemetryAuthNotifyDismissed, "telemetryAuthNotifyDismissed");,async function telemetryNewGitHubLogin(ctx, authSource, authType) {
  let data = TelemetryData.createAndMarkAsIssued({
    authSource: authSource,
    authType: authType
  });
  await telemetry(ctx, "auth.new_github_login", data);
},__name(telemetryNewGitHubLogin, "telemetryNewGitHubLogin");,async function telemetryGitHubLoginFailed(ctx) {
  await telemetryError(ctx, "auth.github_login_failed");
},__name(telemetryGitHubLoginFailed, "telemetryGitHubLoginFailed");