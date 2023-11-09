var OPENAI_PROXY_HOST = "https://copilot-proxy.githubusercontent.com";,var V1_ENGINES_COPILOT_CODEX = "/v1/engines/copilot-codex";,function _getOverrideProxyURL(ctx) {
  return isRunningInTest(ctx) ? getConfig(ctx, ConfigKey.DebugTestOverrideProxyUrl) : getConfig(ctx, ConfigKey.DebugOverrideProxyUrl);
},__name(_getOverrideProxyURL, "_getOverrideProxyURL");,function getProxyURLWithPath(ctx, path) {
  let proxyUrl = _getOverrideProxyURL(ctx);
  return proxyUrl.length == 0 && (proxyUrl = OPENAI_PROXY_HOST), `${proxyUrl}${path}`;
},__name(getProxyURLWithPath, "getProxyURLWithPath");,async function _getEnginePath(ctx, repoNwo, fileType, dogFood, userKind, customModel, retrievalOrg, telemetryData) {
  let engineOverride = getConfig(ctx, ConfigKey.DebugOverrideEngine);
  if (engineOverride) return `/v1/engines/${engineOverride}`;
  let customEngine = await ctx.get(Features).customEngine({
    repoNwo: repoNwo,
    fileType: fileType,
    userKind: userKind,
    dogFood: dogFood,
    customModel: customModel,
    retrievalOrg: retrievalOrg
  }, telemetryData);
  return customEngine !== "" ? `/v1/engines/${customEngine}` : V1_ENGINES_COPILOT_CODEX;
},__name(_getEnginePath, "_getEnginePath");,async function getEngineURL(ctx, nwo, fileType, dogfood, userKind, customModel, retrievalOrg, telemetryData) {
  return getProxyURLWithPath(ctx, await _getEnginePath(ctx, nwo, fileType, dogfood, userKind, customModel, retrievalOrg, telemetryData));
},__name(getEngineURL, "getEngineURL");