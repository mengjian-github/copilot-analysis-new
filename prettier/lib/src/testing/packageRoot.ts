var path = Ns(require("path")),
  packageRoot = H4.basename(__dirname) === "dist" ? H4.resolve(__dirname, "..") : H4.resolve(__dirname, "..", "..", "..");,var fakeTelemetryServerPortPromise;,async function startFakeTelemetryServerIfNecessary() {
  return fakeTelemetryServerPortPromise === void 0 && (fakeTelemetryServerPortPromise = new Promise((r, err) => {
    console.warn("Launching fake telemetry server");
    let fakeTelemetryServer = new NJ.Worker(RJ.join(packageRoot, "lib", "src", "testing", "telemetryFakeWorker.js"));
    fakeTelemetryServer.on("message", ({
      port: port
    }) => {
      console.warn(`Telemetry server ready on port ${port}`), r(port);
    }), fakeTelemetryServer.on("error", err);
  })), fakeTelemetryServerPortPromise;
},__name(startFakeTelemetryServerIfNecessary, "startFakeTelemetryServerIfNecessary");,var PromiseQueue = class {
    static {
      __name(this, "PromiseQueue");
    }
    async register(promise) {
      return promise;
    }
  },
  TestPromiseQueue = class extends PromiseQueue {
    constructor() {
      super(...arguments);
      this.promises = [];
    }
    static {
      __name(this, "TestPromiseQueue");
    }
    async register(promise) {
      return this.promises.push(promise), promise;
    }
    async awaitPromises() {
      await Promise.all(this.promises);
    }
  };,async function collectCapturedTelemetry(ctx) {
  let url = ctx.get(TelemetryEndpointUrl).getUrl(),
    messages = (await (await ctx.get(Fetcher).fetch(url, {})).json()).messages ?? [];
  for (let message of messages) WN.strictEqual(message.tags["ai.cloud.roleInstance"], "REDACTED");
  return messages;
},__name(collectCapturedTelemetry, "collectCapturedTelemetry");,async function withInlineTelemetryCapture(ctx, work) {
  return _withTelemetryCapture(ctx, !0, work);
},__name(withInlineTelemetryCapture, "withInlineTelemetryCapture");,async function _withTelemetryCapture(ctx, forceTelemetry, work) {
  let port = await startFakeTelemetryServerIfNecessary(),
    extensionId = "copilot-test",
    endpoint = Math.floor(Math.random() * 1e5).toString();
  delete process.env.http_proxy, delete process.env.https_proxy;
  let oldUrl = ctx.get(TelemetryEndpointUrl).getUrl();
  ctx.get(TelemetryEndpointUrl).setUrlForTesting(`http://localhost:${port}/${endpoint}`), setupTelemetryReporters(ctx, extensionId, forceTelemetry);
  try {
    let queue = new TestPromiseQueue();
    ctx.forceSet(PromiseQueue, queue);
    let result = await work(ctx);
    return await queue.awaitPromises(), await ctx.get(TelemetryReporters).deactivate(), [await collectMessagesWithRetry(ctx), result];
  } finally {
    ctx.get(TelemetryEndpointUrl).setUrlForTesting(oldUrl);
  }
},__name(_withTelemetryCapture, "_withTelemetryCapture");,async function collectMessagesWithRetry(ctx) {
  for (let waitTimeMultiplier = 0; waitTimeMultiplier < 3; waitTimeMultiplier++) {
    await new Promise(resolve => setTimeout(resolve, waitTimeMultiplier * 1e3));
    let messages = await collectCapturedTelemetry(ctx);
    if (messages.length > 0) return messages;
    console.warn("Retrying to collect telemetry messages #" + (waitTimeMultiplier + 1));
  }
  return [];
},__name(collectMessagesWithRetry, "collectMessagesWithRetry");,var FailingTelemetryReporter = class {
  static {
    __name(this, "FailingTelemetryReporter");
  }
  sendTelemetryEvent(eventName, properties, measurements) {
    throw new Error("Telemetry disabled");
  }
  sendTelemetryErrorEvent(eventName, properties, measurements, errorProps) {
    throw new Error("Telemetry disabled");
  }
  sendTelemetryException(error, properties, measurements) {
    throw new Error("Telemetry disabled");
  }
  dispose() {
    return Promise.resolve();
  }
  hackOptOutListener() {}
};