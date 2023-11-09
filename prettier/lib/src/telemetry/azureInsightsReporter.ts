var appInsights = Ns(TJ()),
  os = Ns(require("os")),
  import_stream = require("stream");,var IngestionEndpointPattern = /^https:\/\/[^.]*\.in\.applicationinsights\.azure\.com\//,
  Util = il(),
  originalMakeRequest = Util.makeRequest.bind(Util),
  AzureInsightReporter = class {
    constructor(ctx, namespace, key) {
      this.namespace = namespace;
      this.client = createAppInsightsClient(ctx, key), configureReporter(ctx, this.client), ctx.get(CopilotTokenNotifier).on("onCopilotToken", copilotToken => {
        let userId = copilotToken.getTokenValue("tid");
        userId !== void 0 && updateReporterUserId(userId, this.client);
      });
    }
    static {
      __name(this, "AzureInsightReporter");
    }
    sendTelemetryEvent(eventName, properties, measurements) {
      this.client.trackEvent({
        name: this.qualifyEventName(eventName),
        properties: properties,
        measurements: measurements
      });
    }
    sendTelemetryErrorEvent(eventName, properties, measurements) {
      this.sendTelemetryEvent(this.qualifyEventName(eventName), properties, measurements);
    }
    sendTelemetryException(error, properties, measurements) {
      this.client.trackException({
        exception: error,
        properties: properties,
        measurements: measurements
      });
    }
    dispose() {
      return new Promise(resolve => {
        this.client.flush({
          callback: s => {
            resolve(void 0);
          }
        });
      });
    }
    qualifyEventName(eventName) {
      return eventName.startsWith(this.namespace) ? eventName : `${this.namespace}/${eventName}`;
    }
  };,function monkeyPatchMakeRequest(ctx) {
  Util.makeRequest = function (config, requestUrl, requestOptions, requestCallback, ...rest) {
    if (!ctx.get(Fetcher).proxySettings) return originalMakeRequest(config, requestUrl, requestOptions, requestCallback, ...rest);
    requestUrl && requestUrl.indexOf("//") === 0 && (requestUrl = "https:" + requestUrl);
    let fakeResponse = new $N.EventEmitter();
    fakeResponse.setEncoding = () => fakeResponse;
    let fakeRequest = new $N.EventEmitter(),
      body;
    return fakeRequest.write = (chunk, _, __) => {
      body = chunk;
    }, fakeRequest.end = () => {
      if (requestUrl.includes("169.254.169.254")) return fakeRequest.emit("error", new Error("UNREACH")), fakeRequest;
      if (IngestionEndpointPattern.test(requestUrl)) return fakeRequest.emit("error", new Error("UNKNOWN")), fakeRequest;
      let method = requestOptions.method,
        headers = requestOptions.headers;
      return ctx.get(Fetcher).fetch(requestUrl, {
        method: method,
        headers: headers,
        body: body
      }).then(res => {
        res.text().then(text => {
          fakeResponse.emit("data", text), fakeResponse.emit("end");
        });
      }).catch(err => {
        fakeRequest.emit("error", err);
      }), fakeRequest;
    }, fakeRequest.setTimeout = () => fakeRequest, fakeRequest.abort = () => {}, requestCallback(fakeResponse), fakeRequest;
  };
},__name(monkeyPatchMakeRequest, "monkeyPatchMakeRequest");,function createAppInsightsClient(ctx, key) {
  monkeyPatchMakeRequest(ctx);
  let client = new SJ.TelemetryClient(key);
  return client.config.enableAutoCollectRequests = !1, client.config.enableAutoCollectPerformance = !1, client.config.enableAutoCollectExceptions = !1, client.config.enableAutoCollectConsole = !1, client.config.enableAutoCollectDependencies = !1, client.config.noDiagnosticChannel = !0, configureReporter(ctx, client), client;
},__name(createAppInsightsClient, "createAppInsightsClient");,function configureReporter(ctx, client) {
  client.commonProperties = decorateWithCommonProperties(client.commonProperties, ctx);
  let editorSession = ctx.get(EditorSession);
  client.context.tags[client.context.keys.sessionId] = editorSession.sessionId;
  let telemetryConfig = ctx.get(TelemetryUserConfig);
  telemetryConfig.trackingId && (client.context.tags[client.context.keys.userId] = telemetryConfig.trackingId), client.context.tags[client.context.keys.cloudRoleInstance] = "REDACTED", client.config.endpointUrl = ctx.get(TelemetryEndpointUrl).getUrl();
},__name(configureReporter, "configureReporter");,function updateReporterUserId(userId, client) {
  client.context.tags[client.context.keys.userId] = userId;
},__name(updateReporterUserId, "updateReporterUserId");,function decorateWithCommonProperties(properties, ctx) {
  properties = properties || {}, properties.common_os = Ex.platform(), properties.common_platformversion = Ex.release();
  let editorSession = ctx.get(EditorSession);
  return properties.common_vscodemachineid = editorSession.machineId, properties.common_vscodesessionid = editorSession.sessionId, properties.common_uikind = "desktop", properties.common_remotename = "none", properties.common_isnewappinstall = "", properties;
},__name(decorateWithCommonProperties, "decorateWithCommonProperties");