var streamChoicesLogger = new Logger(1, "streamChoices"),
  APIJsonDataStreaming = class {
    constructor() {
      this.logprobs = [];
      this.top_logprobs = [];
      this.text = [];
      this.tokens = [];
      this.text_offset = [];
    }
    static {
      __name(this, "APIJsonDataStreaming");
    }
    append(choice) {
      choice.text && this.text.push(choice.text), choice.delta?.content && this.text.push(choice.delta.content), choice.logprobs && (this.tokens.push(choice.logprobs.tokens ?? []), this.text_offset.push(choice.logprobs.text_offset ?? []), this.logprobs.push(choice.logprobs.token_logprobs ?? []), this.top_logprobs.push(choice.logprobs.top_logprobs ?? []));
    }
  };,function splitChunk(chunk) {
  let dataLines = chunk.split(`
`),
    newExtra = dataLines.pop();
  return [dataLines.filter(line => line != ""), newExtra];
},__name(splitChunk, "splitChunk");,var SSEProcessor = class _SSEProcessor {
  constructor(ctx, expectedNumChoices, response, body, telemetryData, dropCompletionReasons, fastCancellation, cancellationToken) {
    this.ctx = ctx;
    this.expectedNumChoices = expectedNumChoices;
    this.response = response;
    this.body = body;
    this.telemetryData = telemetryData;
    this.dropCompletionReasons = dropCompletionReasons;
    this.fastCancellation = fastCancellation;
    this.cancellationToken = cancellationToken;
    this.requestId = getRequestId(this.response);
    this.stats = new ChunkStats(this.expectedNumChoices);
    this.solutions = {};
  }
  static {
    __name(this, "SSEProcessor");
  }
  static async create(ctx, expectedNumChoices, response, telemetryData, dropCompletionReasons, cancellationToken) {
    let body = await response.body();
    body.setEncoding("utf8");
    let fastCancellation = await ctx.get(Features).fastCancellation();
    return new _SSEProcessor(ctx, expectedNumChoices, response, body, telemetryData, dropCompletionReasons ?? ["content_filter"], fastCancellation, cancellationToken);
  }
  async *processSSE(finishedCb = async () => {}) {
    try {
      yield* this.processSSEInner(finishedCb);
    } finally {
      this.fastCancellation && this.cancel(), streamChoicesLogger.info(this.ctx, `request done: headerRequestId: [${this.requestId.headerRequestId}] model deployment ID: [${this.requestId.deploymentId}]`), streamChoicesLogger.debug(this.ctx, `request stats: ${this.stats}`);
    }
  }
  async *processSSEInner(finishedCb) {
    let extraData = "";
    networkRead: for await (let chunk of this.body) {
      if (this.maybeCancel("after awaiting body chunk")) return;
      streamChoicesLogger.debug(this.ctx, "chunk", chunk.toString());
      let [dataLines, remainder] = splitChunk(extraData + chunk.toString());
      extraData = remainder;
      for (let dataLine of dataLines) {
        let lineWithoutData = dataLine.slice(5).trim();
        if (lineWithoutData == "[DONE]") {
          yield* this.finishSolutions();
          return;
        }
        let json;
        try {
          json = JSON.parse(lineWithoutData);
        } catch {
          streamChoicesLogger.error(this.ctx, "Error parsing JSON stream data", dataLine);
          continue;
        }
        if (json.choices === void 0) {
          json.error !== void 0 ? streamChoicesLogger.error(this.ctx, "Error in response:", json.error.message) : streamChoicesLogger.error(this.ctx, "Unexpected response with no choices or error: " + lineWithoutData);
          continue;
        }
        if (this.requestId.created == 0 && (this.requestId = getRequestId(this.response, json), this.requestId.created == 0 && streamChoicesLogger.error(this.ctx, `Request id invalid, should have "completionId" and "created": ${this.requestId}`, this.requestId)), this.allSolutionsDone() && this.fastCancellation) break networkRead;
        for (let i = 0; i < json.choices.length; i++) {
          let choice = json.choices[i];
          streamChoicesLogger.debug(this.ctx, "choice", choice), this.stats.add(choice.index), choice.index in this.solutions || (this.solutions[choice.index] = new APIJsonDataStreaming());
          let solution = this.solutions[choice.index];
          if (solution == null) continue;
          solution.append(choice);
          let finishOffset,
            hasNewLine = choice.text?.indexOf(`
`) > -1 || choice.delta?.content?.indexOf(`
`) > -1;
          if ((choice.finish_reason || hasNewLine) && (finishOffset = await finishedCb(solution.text.join("")), this.maybeCancel("after awaiting finishedCb"))) return;
          if (!(choice.finish_reason || finishOffset !== void 0)) continue;
          let loggedReason = choice.finish_reason ?? "client-trimmed";
          if (telemetry(this.ctx, "completion.finishReason", this.telemetryData.extendedBy({
            completionChoiceFinishReason: loggedReason
          })), this.dropCompletionReasons.includes(choice.finish_reason) ? this.solutions[choice.index] = null : (this.stats.markYielded(choice.index), yield {
            solution: solution,
            finishOffset: finishOffset,
            reason: choice.finish_reason,
            requestId: this.requestId,
            index: choice.index
          }), this.maybeCancel("after yielding finished choice")) return;
          this.solutions[choice.index] = null;
        }
      }
    }
    for (let [index, solution] of Object.entries(this.solutions)) {
      let solutionIndex = Number(index);
      if (solution != null && (this.stats.markYielded(solutionIndex), yield {
        solution: solution,
        finishOffset: void 0,
        reason: "Iteration Done",
        requestId: this.requestId,
        index: solutionIndex
      }, this.maybeCancel("after yielding after iteration done"))) return;
    }
    if (extraData.length > 0) try {
      let extraDataJson = JSON.parse(extraData);
      extraDataJson.error !== void 0 && streamChoicesLogger.error(this.ctx, `Error in response: ${extraDataJson.error.message}`, extraDataJson.error);
    } catch {
      streamChoicesLogger.error(this.ctx, `Error parsing extraData: ${extraData}`);
    }
  }
  async *finishSolutions() {
    for (let [index, solution] of Object.entries(this.solutions)) {
      let solutionIndex = Number(index);
      if (solution != null && (this.stats.markYielded(solutionIndex), yield {
        solution: solution,
        finishOffset: void 0,
        reason: "DONE",
        requestId: this.requestId,
        index: solutionIndex
      }, this.maybeCancel("after yielding on DONE"))) return;
    }
  }
  maybeCancel(description) {
    return this.cancellationToken?.isCancellationRequested ? (streamChoicesLogger.debug(this.ctx, "Cancelled: " + description), this.cancel(), !0) : !1;
  }
  cancel() {
    this.body.destroy();
  }
  allSolutionsDone() {
    let solutions = Object.values(this.solutions);
    return solutions.length == this.expectedNumChoices && solutions.every(s => s == null);
  }
};,function prepareSolutionForReturn(ctx, c, telemetryData) {
  let completionText = c.solution.text.join(""),
    blockFinished = !1;
  c.finishOffset !== void 0 && (streamChoicesLogger.debug(ctx, `solution ${c.index}: early finish at offset ${c.finishOffset}`), completionText = completionText.substring(0, c.finishOffset), blockFinished = !0), streamChoicesLogger.info(ctx, `solution ${c.index} returned. finish reason: [${c.reason}]`), streamChoicesLogger.debug(ctx, `solution ${c.index} details: finishOffset: [${c.finishOffset}] completionId: [{${c.requestId.completionId}}] created: [{${c.requestId.created}}]`);
  let jsonData = convertToAPIJsonData(ctx, c.solution);
  return convertToAPIChoice(ctx, completionText, jsonData, c.index, c.requestId, blockFinished, telemetryData);
},__name(prepareSolutionForReturn, "prepareSolutionForReturn");,function convertToAPIJsonData(ctx, streamingData) {
  let out = {
    text: streamingData.text.join(""),
    tokens: streamingData.text
  };
  if (streamingData.logprobs.length === 0) return out;
  let flattenedLogprobs = streamingData.logprobs.reduce((acc, cur) => acc.concat(cur), []),
    flattenedTopLogprobs = streamingData.top_logprobs.reduce((acc, cur) => acc.concat(cur), []),
    flattenedOffsets = streamingData.text_offset.reduce((acc, cur) => acc.concat(cur), []),
    flattenedTokens = streamingData.tokens.reduce((acc, cur) => acc.concat(cur), []);
  return {
    ...out,
    logprobs: {
      token_logprobs: flattenedLogprobs,
      top_logprobs: flattenedTopLogprobs,
      text_offset: flattenedOffsets,
      tokens: flattenedTokens
    }
  };
},__name(convertToAPIJsonData, "convertToAPIJsonData");,var ChunkStats = class {
    constructor(expectedNumChoices) {
      this.choices = new Map();
      for (let i = 0; i < expectedNumChoices; i++) this.choices.set(i, new ChoiceStats());
    }
    static {
      __name(this, "ChunkStats");
    }
    add(choiceIndex) {
      this.choices.get(choiceIndex).increment();
    }
    markYielded(choiceIndex) {
      this.choices.get(choiceIndex).markYielded();
    }
    toString() {
      return Array.from(this.choices.entries()).map(([index, stats]) => `${index}: ${stats.yieldedTokens} -> ${stats.seenTokens}`).join(", ");
    }
  },
  ChoiceStats = class {
    constructor() {
      this.yieldedTokens = -1;
      this.seenTokens = 0;
    }
    static {
      __name(this, "ChoiceStats");
    }
    increment() {
      this.seenTokens++;
    }
    markYielded() {
      this.yieldedTokens = this.seenTokens;
    }
  };,var fetchLogger = new Logger(1, "fetch");,function getRequestId(response, json) {
  return {
    headerRequestId: response.headers.get("x-request-id") || "",
    completionId: json && json.id ? json.id : "",
    created: json && json.created ? json.created : 0,
    serverExperiments: response.headers.get("X-Copilot-Experiment") || "",
    deploymentId: response.headers.get("azureml-model-deployment") || ""
  };
},__name(getRequestId, "getRequestId");,function getProcessingTime(response) {
  let reqIdStr = response.headers.get("openai-processing-ms");
  return reqIdStr ? parseInt(reqIdStr, 10) : 0;
},__name(getProcessingTime, "getProcessingTime");,function extractEngineName(ctx, engineUrl) {
  let engineName = engineUrl.split("/").pop();
  return engineName || (fetchLogger.error(ctx, "Malformed engine URL: " + engineUrl), engineUrl);
},__name(extractEngineName, "extractEngineName");,function uiKindToIntent(uiKind) {
  switch (uiKind) {
    case "ghostText":
      return "copilot-ghost";
    case "synthesize":
      return "copilot-panel";
  }
},__name(uiKindToIntent, "uiKindToIntent");,var OpenAIFetcher = class {
  static {
    __name(this, "OpenAIFetcher");
  }
};,function fetchWithInstrumentation(ctx, prompt, engineUrl, endpoint, ourRequestId, request, secretKey, uiKind, cancel, telemetryProperties) {
  let statusReporter = ctx.get(StatusReporter),
    uri = tte.format("%s/%s", engineUrl, endpoint);
  if (!secretKey) {
    logger.error(ctx, `Failed to send request to ${uri} due to missing key`);
    return;
  }
  let telemetryData = TelemetryData.createAndMarkAsIssued({
    endpoint: endpoint,
    engineName: extractEngineName(ctx, engineUrl),
    uiKind: uiKind
  }, telemetrizePromptLength(prompt));
  telemetryProperties && (telemetryData = telemetryData.extendedBy(telemetryProperties));
  for (let [key, value] of Object.entries(request)) key == "prompt" || key == "suffix" || (telemetryData.properties[`request.option.${key}`] = JSON.stringify(value) ?? "undefined");
  telemetryData.properties.headerRequestId = ourRequestId, telemetry(ctx, "request.sent", telemetryData);
  let requestStart = now(),
    intent = uiKindToIntent(uiKind);
  return postRequest(ctx, uri, secretKey, intent, ourRequestId, request, cancel).then(response => {
    let modelRequestId = getRequestId(response, void 0);
    telemetryData.extendWithRequestId(modelRequestId);
    let totalTimeMs = now() - requestStart;
    return telemetryData.measurements.totalTimeMs = totalTimeMs, logger.info(ctx, `request.response: [${uri}] took ${totalTimeMs} ms`), logger.debug(ctx, "request.response properties", telemetryData.properties), logger.debug(ctx, "request.response measurements", telemetryData.measurements), logger.debug(ctx, `prompt: ${JSON.stringify(prompt)}`), telemetry(ctx, "request.response", telemetryData), response;
  }).catch(error => {
    if (isAbortError(error)) throw error;
    statusReporter.setWarning(error.message);
    let warningTelemetry = telemetryData.extendedBy({
      error: "Network exception"
    });
    telemetry(ctx, "request.shownWarning", warningTelemetry), telemetryData.properties.message = String(error.name ?? ""), telemetryData.properties.code = String(error.code ?? ""), telemetryData.properties.errno = String(error.errno ?? ""), telemetryData.properties.type = String(error.type ?? "");
    let totalTimeMs = now() - requestStart;
    throw telemetryData.measurements.totalTimeMs = totalTimeMs, logger.debug(ctx, `request.response: [${uri}] took ${totalTimeMs} ms`), logger.debug(ctx, "request.error properties", telemetryData.properties), logger.debug(ctx, "request.error measurements", telemetryData.measurements), telemetry(ctx, "request.error", telemetryData), error;
  }).finally(() => {
    logEnginePrompt(ctx, prompt, telemetryData);
  });
},__name(fetchWithInstrumentation, "fetchWithInstrumentation");,function postProcessChoices(choices, allowEmptyChoices) {
  return allowEmptyChoices ?? !1 ? choices : asyncIterableFilter(choices, async choice => choice.completionText.trim().length > 0);
},__name(postProcessChoices, "postProcessChoices");,var LiveOpenAIFetcher = class extends OpenAIFetcher {
  static {
    __name(this, "LiveOpenAIFetcher");
  }
  async fetchAndStreamCompletions(ctx, params, baseTelemetryData, finishedCb, cancel, telemetryProperties) {
    let statusReporter = ctx.get(StatusReporter),
      endpoint = "completions",
      response = await this.fetchWithParameters(ctx, endpoint, params, cancel, telemetryProperties);
    if (response === "not-sent") return {
      type: "canceled",
      reason: "before fetch request"
    };
    if (cancel?.isCancellationRequested) {
      let body = await response.body();
      try {
        body.destroy();
      } catch (e) {
        logger.exception(ctx, e, "Error destroying stream");
      }
      return {
        type: "canceled",
        reason: "after fetch request"
      };
    }
    if (response === void 0) {
      let telemetryData = this.createTelemetryData(endpoint, ctx, params);
      return statusReporter.setWarning(), telemetryData.properties.error = "Response was undefined", telemetry(ctx, "request.shownWarning", telemetryData), {
        type: "failed",
        reason: "fetch response was undefined"
      };
    }
    if (response.status !== 200) {
      let telemetryData = this.createTelemetryData(endpoint, ctx, params);
      return this.handleError(ctx, statusReporter, telemetryData, response);
    }
    let dropCompletionReasons = await ctx.get(Features).dropCompletionReasons(),
      finishedCompletions = (await SSEProcessor.create(ctx, params.count, response, baseTelemetryData, dropCompletionReasons, cancel)).processSSE(finishedCb),
      choices = asyncIterableMap(finishedCompletions, async solution => prepareSolutionForReturn(ctx, solution, baseTelemetryData));
    return {
      type: "success",
      choices: postProcessChoices(choices, params.allowEmptyChoices),
      getProcessingTime: () => getProcessingTime(response)
    };
  }
  createTelemetryData(endpoint, ctx, params) {
    return TelemetryData.createAndMarkAsIssued({
      endpoint: endpoint,
      engineName: extractEngineName(ctx, params.engineUrl),
      uiKind: params.uiKind,
      headerRequestId: params.ourRequestId
    });
  }
  async fetchWithParameters(ctx, endpoint, params, cancel, telemetryProperties) {
    let stops = getLanguageConfig(ctx, ConfigKey.Stops),
      disableLogProb = await ctx.get(Features).disableLogProb(),
      request = {
        prompt: params.prompt.prefix,
        suffix: params.prompt.suffix,
        max_tokens: getConfig(ctx, ConfigKey.SolutionLength),
        temperature: getTemperatureForSamples(ctx, params.count),
        top_p: getConfig(ctx, ConfigKey.TopP),
        n: params.count,
        stop: stops
      };
    (params.requestLogProbs || !disableLogProb) && (request.logprobs = 2);
    let githubNWO = tryGetGitHubNWO(params.repoInfo);
    return githubNWO !== void 0 && (request.nwo = githubNWO), params.postOptions && Object.assign(request, params.postOptions), cancel?.isCancellationRequested ? "not-sent" : (logger.info(ctx, `[fetchCompletions] engine ${params.engineUrl}`), await fetchWithInstrumentation(ctx, params.prompt, params.engineUrl, endpoint, params.ourRequestId, request, (await ctx.get(CopilotTokenManager).getCopilotToken(ctx)).token, params.uiKind, cancel, telemetryProperties));
  }
  async handleError(ctx, statusReporter, telemetryData, response) {
    if (statusReporter.setWarning(), telemetryData.properties.error = `Response status was ${response.status}`, telemetryData.properties.status = String(response.status), telemetry(ctx, "request.shownWarning", telemetryData), response.status === 401 || response.status === 403) return ctx.get(CopilotTokenManager).resetCopilotToken(ctx, response.status), {
      type: "failed",
      reason: `token expired or invalid: ${response.status}`
    };
    if (response.status === 499) return fetchLogger.info(ctx, "Cancelled by server"), {
      type: "failed",
      reason: "canceled by server"
    };
    let text = await response.text();
    return response.status === 466 ? (statusReporter.setError(text), fetchLogger.info(ctx, text), {
      type: "failed",
      reason: `client not supported: ${text}`
    }) : (fetchLogger.error(ctx, "Unhandled status from server:", response.status, text), {
      type: "failed",
      reason: `unhandled status from server: ${response.status} ${text}`
    });
  }
};