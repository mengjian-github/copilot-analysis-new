function telemetryShown(ctx, insertionCategory, telemetryData, fromCache) {
  telemetryData.markAsDisplayed();
  let eventName = fromCache ? `${insertionCategory}.shownFromCache` : `${insertionCategory}.shown`;
  telemetry(ctx, eventName, telemetryData);
},__name(telemetryShown, "telemetryShown");,function telemetryAccepted(ctx, insertionCategory, telemetryData) {
  let telemetryName = insertionCategory + ".accepted",
    cfManager = ctx.get(ContextualFilterManager);
  cfManager.previousLabel = 1, cfManager.previousLabelTimestamp = Date.now(), telemetry(ctx, telemetryName, telemetryData);
},__name(telemetryAccepted, "telemetryAccepted");,function telemetryRejected(ctx, insertionCategory, telemetryData) {
  let telemetryName = insertionCategory + ".rejected",
    cfManager = ctx.get(ContextualFilterManager);
  cfManager.previousLabel = 0, cfManager.previousLabelTimestamp = Date.now(), telemetry(ctx, telemetryName, telemetryData);
},__name(telemetryRejected, "telemetryRejected");,function mkCanceledResultTelemetry(telemetryBlob, extraFlags = {}) {
  return {
    ...extraFlags,
    telemetryBlob: telemetryBlob
  };
},__name(mkCanceledResultTelemetry, "mkCanceledResultTelemetry");,function mkBasicResultTelemetry(telemetryBlob) {
  let result = {
    headerRequestId: telemetryBlob.properties.headerRequestId,
    copilot_trackingId: telemetryBlob.properties.copilot_trackingId
  };
  return telemetryBlob.properties.sku !== void 0 && (result.sku = telemetryBlob.properties.sku), telemetryBlob.properties.organizations_list !== void 0 && (result.organizations_list = telemetryBlob.properties.organizations_list), telemetryBlob.properties.enterprise_list !== void 0 && (result.enterprise_list = telemetryBlob.properties.enterprise_list), result;
},__name(mkBasicResultTelemetry, "mkBasicResultTelemetry");,async function handleGhostTextResultTelemetry(ctx, result) {
  if (result.type === "success") return telemetryRaw(ctx, "ghostText.produced", result.telemetryData, {}), result.value;
  if (result.type !== "abortedBeforeIssued") {
    if (result.type === "canceled") {
      telemetry(ctx, "ghostText.canceled", result.telemetryData.telemetryBlob.extendedBy({
        reason: result.reason,
        cancelledNetworkRequest: result.telemetryData.cancelledNetworkRequest ? "true" : "false"
      }));
      return;
    }
    telemetryRaw(ctx, `ghostText.${result.type}`, {
      ...result.telemetryData,
      reason: result.reason
    }, {});
  }
},__name(handleGhostTextResultTelemetry, "handleGhostTextResultTelemetry");