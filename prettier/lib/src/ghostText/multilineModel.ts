var commentMap = {
    javascript: ["//"],
    typescript: ["//"],
    typescriptreact: ["//"],
    javascriptreact: ["//"],
    vue: ["//", "-->"],
    php: ["//", "#"],
    dart: ["//"],
    go: ["//"],
    cpp: ["//"],
    scss: ["//"],
    csharp: ["//"],
    java: ["//"],
    c: ["//"],
    rust: ["//"],
    python: ["#"],
    markdown: ["#", "-->"],
    css: ["*/"]
  },
  languageMap = {
    javascript: 1,
    javascriptreact: 2,
    typescript: 3,
    typescriptreact: 4,
    python: 5,
    go: 6,
    ruby: 7
  };,function hasComment(text, lineNumber, language, ignoreEmptyLines = !0) {
  let lines = text.split(`
`);
  if (ignoreEmptyLines && (lines = lines.filter(line => line.trim().length > 0)), Math.abs(lineNumber) > lines.length || lineNumber >= lines.length) return !1;
  lineNumber < 0 && (lineNumber = lines.length + lineNumber);
  let line = lines[lineNumber];
  return (commentMap[language] ?? []).some(commentChar => line.includes(commentChar));
},__name(hasComment, "hasComment");,var PromptFeatures = class {
    static {
      __name(this, "PromptFeatures");
    }
    constructor(promptComponentText, language) {
      let [firstLine, lastLine] = this.firstAndLast(promptComponentText),
        firstAndLastTrimEnd = this.firstAndLast(promptComponentText.trimEnd());
      this.language = language, this.length = promptComponentText.length, this.firstLineLength = firstLine.length, this.lastLineLength = lastLine.length, this.lastLineRstripLength = lastLine.trimEnd().length, this.lastLineStripLength = lastLine.trim().length, this.rstripLength = promptComponentText.trimEnd().length, this.stripLength = promptComponentText.trim().length, this.rstripLastLineLength = firstAndLastTrimEnd[1].length, this.rstripLastLineStripLength = firstAndLastTrimEnd[1].trim().length, this.secondToLastLineHasComment = hasComment(promptComponentText, -2, language), this.rstripSecondToLastLineHasComment = hasComment(promptComponentText.trimEnd(), -2, language), this.prefixEndsWithNewline = promptComponentText.endsWith(`
`), this.lastChar = promptComponentText.slice(-1), this.rstripLastChar = promptComponentText.trimEnd().slice(-1), this.firstChar = promptComponentText[0], this.lstripFirstChar = promptComponentText.trimStart().slice(0, 1);
    }
    firstAndLast(text) {
      let lines = text.split(`
`),
        numLines = lines.length,
        firstLine = lines[0],
        lastLine = lines[numLines - 1];
      return lastLine == "" && numLines > 1 && (lastLine = lines[numLines - 2]), [firstLine, lastLine];
    }
  },
  MultilineModelFeatures = class {
    static {
      __name(this, "MultilineModelFeatures");
    }
    constructor(prefix, suffix, language) {
      this.language = language, this.prefixFeatures = new PromptFeatures(prefix, language), this.suffixFeatures = new PromptFeatures(suffix, language);
    }
    constructFeatures() {
      let numFeatures = new Array(14).fill(0);
      numFeatures[0] = this.prefixFeatures.length, numFeatures[1] = this.prefixFeatures.firstLineLength, numFeatures[2] = this.prefixFeatures.lastLineLength, numFeatures[3] = this.prefixFeatures.lastLineRstripLength, numFeatures[4] = this.prefixFeatures.lastLineStripLength, numFeatures[5] = this.prefixFeatures.rstripLength, numFeatures[6] = this.prefixFeatures.rstripLastLineLength, numFeatures[7] = this.prefixFeatures.rstripLastLineStripLength, numFeatures[8] = this.suffixFeatures.length, numFeatures[9] = this.suffixFeatures.firstLineLength, numFeatures[10] = this.suffixFeatures.lastLineLength, numFeatures[11] = this.prefixFeatures.secondToLastLineHasComment ? 1 : 0, numFeatures[12] = this.prefixFeatures.rstripSecondToLastLineHasComment ? 1 : 0, numFeatures[13] = this.prefixFeatures.prefixEndsWithNewline ? 1 : 0;
      let langFeatures = new Array(Object.keys(languageMap).length + 1).fill(0);
      langFeatures[languageMap[this.language] ?? 0] = 1;
      let prefixLastCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
      prefixLastCharFeatures[contextualFilterCharacterMap[this.prefixFeatures.lastChar] ?? 0] = 1;
      let prefixRstripLastCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
      prefixRstripLastCharFeatures[contextualFilterCharacterMap[this.prefixFeatures.rstripLastChar] ?? 0] = 1;
      let suffixFirstCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
      suffixFirstCharFeatures[contextualFilterCharacterMap[this.suffixFeatures.firstChar] ?? 0] = 1;
      let suffixLstripFirstCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
      return suffixLstripFirstCharFeatures[contextualFilterCharacterMap[this.suffixFeatures.lstripFirstChar] ?? 0] = 1, numFeatures.concat(langFeatures, prefixLastCharFeatures, prefixRstripLastCharFeatures, suffixFirstCharFeatures, suffixLstripFirstCharFeatures);
    }
  };,function constructMultilineFeatures(prompt, language) {
  return new MultilineModelFeatures(prompt.prefix, prompt.suffix, language);
},__name(constructMultilineFeatures, "constructMultilineFeatures");,function requestMultilineScore(prompt, language) {
  let features = constructMultilineFeatures(prompt, language).constructFeatures();
  return multilineModelPredict(features)[1];
},__name(requestMultilineScore, "requestMultilineScore");,var ghostTextLogger = new Logger(1, "ghostText");,var lastPrefix, lastSuffix, lastPromptHash;,async function genericGetCompletionsFromNetwork(ctx, requestContext, baseTelemetryData, cancellationToken, finishedCb, what, processChoices) {
  ghostTextLogger.debug(ctx, `Getting ${what} from network`), baseTelemetryData = baseTelemetryData.extendedBy();
  let numGhostCompletions = await getNumGhostCompletions(ctx, requestContext),
    temperature = getTemperatureForSamples(ctx, numGhostCompletions),
    postOptions = {
      stream: !0,
      n: numGhostCompletions,
      temperature: temperature,
      extra: {
        language: requestContext.languageId,
        next_indent: requestContext.indentation.next ?? 0,
        trim_by_indentation: shouldDoServerTrimming(requestContext.blockMode),
        prompt_tokens: requestContext.prompt.prefixTokens ?? 0,
        suffix_tokens: requestContext.prompt.suffixTokens ?? 0
      }
    };
  requestContext.multiline || (postOptions.stop = [`
`]), requestContext.multiline && requestContext.multiLogitBias && (postOptions.logit_bias = {
    50256: -100
  });
  let requestStart = Date.now(),
    newProperties = {
      endpoint: "completions",
      uiKind: "ghostText",
      isCycling: JSON.stringify(requestContext.isCycling),
      temperature: JSON.stringify(temperature),
      n: JSON.stringify(numGhostCompletions),
      stop: JSON.stringify(postOptions.stop) ?? "unset",
      logit_bias: JSON.stringify(postOptions.logit_bias ?? null)
    },
    newMeasurements = telemetrizePromptLength(requestContext.prompt);
  Object.assign(baseTelemetryData.properties, newProperties), Object.assign(baseTelemetryData.measurements, newMeasurements);
  try {
    let completionParams = {
      prompt: requestContext.prompt,
      languageId: requestContext.languageId,
      repoInfo: requestContext.repoInfo,
      ourRequestId: requestContext.ourRequestId,
      engineUrl: requestContext.engineURL,
      count: numGhostCompletions,
      uiKind: "ghostText",
      postOptions: postOptions
    };
    requestContext.delayMs > 0 && (await new Promise(resolve => setTimeout(resolve, requestContext.delayMs)));
    let res = await ctx.get(OpenAIFetcher).fetchAndStreamCompletions(ctx, completionParams, baseTelemetryData, finishedCb, cancellationToken);
    return res.type === "failed" ? {
      type: "failed",
      reason: res.reason,
      telemetryData: mkBasicResultTelemetry(baseTelemetryData)
    } : res.type === "canceled" ? (ghostTextLogger.debug(ctx, "Cancelled after awaiting fetchCompletions"), {
      type: "canceled",
      reason: res.reason,
      telemetryData: mkCanceledResultTelemetry(baseTelemetryData)
    }) : processChoices(numGhostCompletions, requestStart, res.getProcessingTime(), res.choices);
  } catch (err) {
    if (isAbortError(err)) return {
      type: "canceled",
      reason: "network request aborted",
      telemetryData: mkCanceledResultTelemetry(baseTelemetryData, {
        cancelledNetworkRequest: !0
      })
    };
    if (ghostTextLogger.exception(ctx, err, "Error on ghost text request"), ctx.get(UserErrorNotifier).notifyUser(ctx, err), shouldFailForDebugPurposes(ctx)) throw err;
    return {
      type: "failed",
      reason: "non-abort error on ghost text request",
      telemetryData: mkBasicResultTelemetry(baseTelemetryData)
    };
  }
},__name(genericGetCompletionsFromNetwork, "genericGetCompletionsFromNetwork");,async function getCompletionsFromNetwork(ctx, requestContext, baseTelemetryData, cancellationToken, finishedCb) {
  return genericGetCompletionsFromNetwork(ctx, requestContext, baseTelemetryData, cancellationToken, finishedCb, "completions", async (numGhostCompletions, requestStart, processingTime, choicesStream) => {
    let choicesIterator = choicesStream[Symbol.asyncIterator](),
      firstRes = await choicesIterator.next();
    if (firstRes.done) return ghostTextLogger.debug(ctx, "All choices redacted"), {
      type: "empty",
      reason: "all choices redacted",
      telemetryData: mkBasicResultTelemetry(baseTelemetryData)
    };
    if (cancellationToken?.isCancellationRequested) return ghostTextLogger.debug(ctx, "Cancelled after awaiting redactedChoices iterator"), {
      type: "canceled",
      reason: "after awaiting redactedChoices iterator",
      telemetryData: mkCanceledResultTelemetry(baseTelemetryData)
    };
    let firstChoice = firstRes.value;
    if (firstChoice === void 0) return ghostTextLogger.debug(ctx, "Got undefined choice from redactedChoices iterator"), {
      type: "empty",
      reason: "got undefined choice from redactedChoices iterator",
      telemetryData: mkBasicResultTelemetry(baseTelemetryData)
    };
    telemetryPerformance(ctx, "performance", firstChoice, requestStart, processingTime);
    let remainingChoices = numGhostCompletions - 1;
    ghostTextLogger.debug(ctx, `Awaited first result, id:  ${firstChoice.choiceIndex}`), addToCache(ctx, requestContext, {
      multiline: requestContext.multiline,
      choices: [firstChoice]
    });
    let remainingPromise = [];
    for (let index = 0; index < remainingChoices; index++) remainingPromise.push(choicesIterator.next());
    let cacheDone = Promise.all(remainingPromise).then(async results => {
      (await ctx.get(Features).fastCancellation()) && choicesIterator.next(), ghostTextLogger.debug(ctx, `Awaited remaining results, number of results: ${results.length}`);
      let apiChoices = [];
      for (let innerChoice of results) {
        let redactedChoice = innerChoice.value;
        if (redactedChoice !== void 0 && (ghostTextLogger.info(ctx, `GhostText later completion: [${redactedChoice.completionText}]`), redactedChoice.completionText.trimEnd())) {
          if (apiChoices.findIndex(v => v.completionText.trim() === redactedChoice.completionText.trim()) !== -1 || redactedChoice.completionText.trim() === firstChoice.completionText.trim()) continue;
          apiChoices.push(redactedChoice);
        }
      }
      apiChoices.length > 0 && appendToCache(ctx, requestContext, {
        multiline: requestContext.multiline,
        choices: apiChoices
      });
    });
    return isRunningInTest(ctx) && (await cacheDone), {
      type: "success",
      value: makeGhostAPIChoice(firstRes.value, {
        forceSingleLine: !1
      }),
      telemetryData: mkBasicResultTelemetry(baseTelemetryData),
      telemetryBlob: baseTelemetryData
    };
  });
},__name(getCompletionsFromNetwork, "getCompletionsFromNetwork");,async function getAllCompletionsFromNetwork(ctx, requestContext, baseTelemetryData, cancellationToken, finishedCb) {
  return genericGetCompletionsFromNetwork(ctx, requestContext, baseTelemetryData, cancellationToken, finishedCb, "all completions", async (numGhostCompletions, requestStart, processingTime, choicesStream) => {
    let apiChoices = [];
    for await (let choice of choicesStream) {
      if (cancellationToken?.isCancellationRequested) return ghostTextLogger.debug(ctx, "Cancelled after awaiting choices iterator"), {
        type: "canceled",
        reason: "after awaiting choices iterator",
        telemetryData: mkCanceledResultTelemetry(baseTelemetryData)
      };
      if (choice.completionText.trimEnd()) {
        if (apiChoices.findIndex(v => v.completionText.trim() === choice.completionText.trim()) !== -1) continue;
        apiChoices.push(choice);
      }
    }
    return apiChoices.length > 0 && (appendToCache(ctx, requestContext, {
      multiline: requestContext.multiline,
      choices: apiChoices
    }), telemetryPerformance(ctx, "cyclingPerformance", apiChoices[0], requestStart, processingTime)), {
      type: "success",
      value: apiChoices,
      telemetryData: mkBasicResultTelemetry(baseTelemetryData),
      telemetryBlob: baseTelemetryData
    };
  });
},__name(getAllCompletionsFromNetwork, "getAllCompletionsFromNetwork");,function makeGhostAPIChoice(choice, options) {
  let ghostChoice = {
    ...choice
  };
  return ghostChoice.completionText = choice.completionText.trimEnd(), options.forceSingleLine && (ghostChoice.completionText = ghostChoice.completionText.split(`
`)[0]), ghostChoice;
},__name(makeGhostAPIChoice, "makeGhostAPIChoice");,async function getNumGhostCompletions(ctx, requestContext) {
  let override = await ctx.get(Features).overrideNumGhostCompletions();
  return override ? requestContext.isCycling ? Math.max(0, 3 - override) : override : shouldDoParsingTrimming(requestContext.blockMode) && requestContext.multiline ? getConfig(ctx, ConfigKey.InlineSuggestCount) : requestContext.isCycling ? 2 : 1;
},__name(getNumGhostCompletions, "getNumGhostCompletions");,async function getGhostTextStrategy(ctx, document, position, prompt, isCycling, inlineSuggestion, preIssuedTelemetryData, requestMultilineExploration = !1, requestMultilineOnNewLine = !0, requestMultiModel = !0, requestMultiModelThreshold = .5) {
  let blockMode = await ctx.get(BlockModeConfig).forLanguage(ctx, document.languageId);
  switch (blockMode) {
    case "server":
      return {
        blockMode: "server",
        requestMultiline: !0,
        isCyclingRequest: isCycling,
        finishedCb: async text => {}
      };
    case "parsing":
    case "parsingandserver":
    default:
      {
        if (await shouldRequestMultiline(ctx, document, position, inlineSuggestion, preIssuedTelemetryData, prompt, requestMultilineExploration, requestMultilineOnNewLine, requestMultiModel, requestMultiModelThreshold)) {
          let adjustedPosition;
          return prompt.trailingWs.length > 0 && !prompt.prompt.prefix.endsWith(prompt.trailingWs) ? adjustedPosition = ctx.get(LocationFactory).position(position.line, Math.max(position.character - prompt.trailingWs.length, 0)) : adjustedPosition = position, {
            blockMode: blockMode,
            requestMultiline: !0,
            isCyclingRequest: !1,
            finishedCb: parsingBlockFinished(ctx, document, adjustedPosition)
          };
        }
        return {
          blockMode: blockMode,
          requestMultiline: !1,
          isCyclingRequest: isCycling,
          finishedCb: async text => {}
        };
      }
  }
},__name(getGhostTextStrategy, "getGhostTextStrategy");,var ghostTextDebouncer = new Debouncer();,async function getGhostText(ctx, document, position, isCycling, preIssuedTelemetryData, cancellationToken) {
  let ourRequestId = v4_default();
  preIssuedTelemetryData = preIssuedTelemetryData.extendedBy({
    headerRequestId: ourRequestId
  });
  let documentSource = document.getText(),
    positionOffset = document.offsetAt(position),
    actualSuffix = documentSource.substring(positionOffset),
    prompt = await extractPrompt(ctx, document, position, preIssuedTelemetryData);
  if (prompt.type === "copilotNotAvailable") return ghostTextLogger.debug(ctx, "Copilot not available, due to content exclusion"), {
    type: "abortedBeforeIssued",
    reason: "Copilot not available due to content exclusion"
  };
  if (prompt.type === "contextTooShort") return ghostTextLogger.debug(ctx, "Breaking, not enough context"), {
    type: "abortedBeforeIssued",
    reason: "Not enough context"
  };
  if (cancellationToken?.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled after extractPrompt"), {
    type: "abortedBeforeIssued",
    reason: "Cancelled after extractPrompt"
  };
  let inlineSuggestion = isInlineSuggestion(document, position);
  if (inlineSuggestion === void 0) return ghostTextLogger.debug(ctx, "Breaking, invalid middle of the line"), {
    type: "abortedBeforeIssued",
    reason: "Invalid middle of the line"
  };
  let statusBarItem = ctx.get(StatusReporter),
    locationFactory = ctx.get(LocationFactory),
    repoInfo = extractRepoInfoInBackground(ctx, document.uri),
    repoNwo = tryGetGitHubNWO(repoInfo) ?? "",
    dogFood = getDogFood(repoInfo),
    userKind = await getUserKind(ctx),
    customModel = await getFtFlag(ctx),
    retrievalOrg = await getRagFlag(ctx),
    featuresFilterArgs = {
      repoNwo: repoNwo,
      userKind: userKind,
      dogFood: dogFood,
      fileType: document.languageId,
      customModel: customModel,
      retrievalOrg: retrievalOrg
    },
    ghostTextStrategy = await getGhostTextStrategy(ctx, document, position, prompt, isCycling, inlineSuggestion, preIssuedTelemetryData);
  if (cancellationToken?.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled after requestMultiline"), {
    type: "abortedBeforeIssued",
    reason: "Cancelled after requestMultiline"
  };
  let [prefix] = trimLastLine(document.getText(locationFactory.range(locationFactory.position(0, 0), position))),
    choices = getLocalInlineSuggestion(ctx, prefix, prompt.prompt, ghostTextStrategy.requestMultiline),
    engineURL = await getEngineURL(ctx, repoNwo, document.languageId, dogFood, userKind, customModel, retrievalOrg, preIssuedTelemetryData),
    delayMs = await ctx.get(Features).beforeRequestWaitMs(featuresFilterArgs, preIssuedTelemetryData),
    multiLogitBias = await ctx.get(Features).multiLogitBias(featuresFilterArgs, preIssuedTelemetryData),
    requestContext = {
      blockMode: ghostTextStrategy.blockMode,
      languageId: document.languageId,
      repoInfo: repoInfo,
      engineURL: engineURL,
      ourRequestId: ourRequestId,
      prefix: prefix,
      prompt: prompt.prompt,
      multiline: ghostTextStrategy.requestMultiline,
      indentation: contextIndentation(document, position),
      isCycling: isCycling,
      delayMs: delayMs,
      multiLogitBias: multiLogitBias
    },
    debouncePredict = await ctx.get(Features).debouncePredict(),
    contextualFilterEnable = await ctx.get(Features).contextualFilterEnable(),
    contextualFilterAcceptThreshold = await ctx.get(Features).contextualFilterAcceptThreshold(),
    contextualFilterEnableTree = await ctx.get(Features).contextualFilterEnableTree(),
    contextualFilterExplorationTraffic = await ctx.get(Features).contextualFilterExplorationTraffic(),
    computeContextualFilterScore = !1;
  (debouncePredict || contextualFilterEnable) && (computeContextualFilterScore = !0);
  let detectedLanguage = await ctx.get(LanguageDetection).detectLanguage(document),
    telemetryData = telemetryIssued(ctx, document, detectedLanguage, requestContext, position, prompt, preIssuedTelemetryData, computeContextualFilterScore, contextualFilterEnableTree);
  if (ghostTextStrategy.isCyclingRequest && (choices?.[0].length ?? 0) > 1 || !ghostTextStrategy.isCyclingRequest && choices !== void 0) ghostTextLogger.info(ctx, "Found inline suggestions locally");else {
    if (statusBarItem?.setProgress(), ghostTextStrategy.isCyclingRequest) {
      let networkChoices = await getAllCompletionsFromNetwork(ctx, requestContext, telemetryData, cancellationToken, ghostTextStrategy.finishedCb);
      if (networkChoices.type === "success") {
        let resultChoices = choices?.[0] ?? [];
        networkChoices.value.forEach(c => {
          resultChoices.findIndex(v => v.completionText.trim() === c.completionText.trim()) === -1 && resultChoices.push(c);
        }), choices = [resultChoices, 3];
      } else if (choices === void 0) return statusBarItem?.removeProgress(), networkChoices;
    } else {
      let debounceLimit = await getDebounceLimit(ctx, telemetryData);
      try {
        await ghostTextDebouncer.debounce(debounceLimit);
      } catch {
        return {
          type: "canceled",
          reason: "by debouncer",
          telemetryData: mkCanceledResultTelemetry(telemetryData)
        };
      }
      if (cancellationToken?.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled during debounce"), {
        type: "canceled",
        reason: "during debounce",
        telemetryData: mkCanceledResultTelemetry(telemetryData)
      };
      if (contextualFilterEnable && telemetryData.measurements.contextualFilterScore && telemetryData.measurements.contextualFilterScore < contextualFilterAcceptThreshold / 100 && Math.random() < 1 - contextualFilterExplorationTraffic / 100) return ghostTextLogger.info(ctx, "Cancelled by contextual filter"), {
        type: "canceled",
        reason: "contextualFilterScore below threshold",
        telemetryData: mkCanceledResultTelemetry(telemetryData)
      };
      let c = await getCompletionsFromNetwork(ctx, requestContext, telemetryData, cancellationToken, ghostTextStrategy.finishedCb);
      if (c.type !== "success") return statusBarItem?.removeProgress(), c;
      choices = [[c.value], 0];
    }
    statusBarItem?.removeProgress();
  }
  if (choices === void 0) return {
    type: "failed",
    reason: "internal error: choices should be defined after network call",
    telemetryData: mkBasicResultTelemetry(telemetryData)
  };
  let [choicesArray, resultType] = choices,
    postProcessedChoices = asyncIterableMapFilter(asyncIterableFromArray(choicesArray), async choice => postProcessChoice(ctx, "ghostText", document, position, choice, inlineSuggestion, ghostTextLogger, prompt.prompt, actualSuffix)),
    results = [];
  for await (let choice of postProcessedChoices) {
    let hasSuffix = inlineSuggestion && checkSuffix(document, position, choice);
    if (cancellationToken?.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled after post processing completions"), {
      type: "canceled",
      reason: "after post processing completions",
      telemetryData: mkCanceledResultTelemetry(telemetryData)
    };
    let choiceTelemetryData = telemetryWithAddData(ctx, choice),
      res = {
        completion: adjustLeadingWhitespace(choice.choiceIndex, choice.completionText, prompt.trailingWs),
        telemetry: choiceTelemetryData,
        isMiddleOfTheLine: inlineSuggestion,
        coversSuffix: hasSuffix
      };
    results.push(res);
  }
  return {
    type: "success",
    value: [results, resultType],
    telemetryData: mkBasicResultTelemetry(telemetryData),
    telemetryBlob: telemetryData
  };
},__name(getGhostText, "getGhostText");,function getLocalInlineSuggestion(ctx, prefix, prompt, requestMultiline) {
  let choicesTyping = getCompletionsForUserTyping(ctx, prefix, prompt, requestMultiline);
  if (choicesTyping && choicesTyping.length > 0) return [choicesTyping, 2];
  let choicesCache = getCompletionsFromCache(ctx, prefix, prompt, requestMultiline);
  if (choicesCache && choicesCache.length > 0) return [choicesCache, 1];
},__name(getLocalInlineSuggestion, "getLocalInlineSuggestion");,function isInlineSuggestion(document, position) {
  let isMiddleOfLine = isMiddleOfTheLine(position, document),
    isValidMiddleOfLine = isValidMiddleOfTheLinePosition(position, document);
  return isMiddleOfLine && !isValidMiddleOfLine ? void 0 : isMiddleOfLine && isValidMiddleOfLine;
},__name(isInlineSuggestion, "isInlineSuggestion");,function isMiddleOfTheLine(selectionPosition, doc) {
  return doc.lineAt(selectionPosition).text.substr(selectionPosition.character).trim().length != 0;
},__name(isMiddleOfTheLine, "isMiddleOfTheLine");,function isValidMiddleOfTheLinePosition(selectionPosition, doc) {
  let endOfLine = doc.lineAt(selectionPosition).text.substr(selectionPosition.character).trim();
  return /^\s*[)}\]"'`]*\s*[:{;,]?\s*$/.test(endOfLine);
},__name(isValidMiddleOfTheLinePosition, "isValidMiddleOfTheLinePosition");,function isNewLine(selectionPosition, doc) {
  return doc.lineAt(selectionPosition).text.trim().length === 0;
},__name(isNewLine, "isNewLine");,function exploreMultilineRandom() {
  return Math.random() > .5;
},__name(exploreMultilineRandom, "exploreMultilineRandom");,var ForceMultiLine = class _ForceMultiLine {
  constructor(requestMultilineOverride = !1) {
    this.requestMultilineOverride = requestMultilineOverride;
  }
  static {
    __name(this, "ForceMultiLine");
  }
  static {
    this.default = new _ForceMultiLine();
  }
};,async function requestMultilineExperiment(requestMultilineExploration, requestMultiModel, requestMultiModelThreshold, document, prompt, preIssuedTelemetryData) {
  let requestMultiline = !1;
  return requestMultilineExploration ? requestMultiline = exploreMultilineRandom() : requestMultiModel && ["javascript", "javascriptreact", "python"].includes(document.languageId) && (requestMultiline = requestMultilineScore(prompt.prompt, document.languageId) > requestMultiModelThreshold), requestMultiline;
},__name(requestMultilineExperiment, "requestMultilineExperiment");,async function shouldRequestMultiline(ctx, document, position, inlineSuggestion, preIssuedTelemetryData, prompt, requestMultilineExploration, requestMultilineOnNewLine, requestMultiModel, requestMultiModelThreshold) {
  if (ctx.get(ForceMultiLine).requestMultilineOverride) return !0;
  if (requestMultilineExploration) {
    let isEmptyBlockStartDocumentPosition = await isEmptyBlockStart(document, position),
      isEmptyBlockStartDocumentPositionRangeEnd = await isEmptyBlockStart(document, document.lineAt(position).range.end);
    preIssuedTelemetryData.properties.isEmptyBlockStartDocumentPosition = isEmptyBlockStartDocumentPosition.toString(), preIssuedTelemetryData.properties.isEmptyBlockStartDocumentPositionRangeEnd = isEmptyBlockStartDocumentPositionRangeEnd.toString(), preIssuedTelemetryData.properties.inlineSuggestion = inlineSuggestion.toString(), preIssuedTelemetryData.measurements.documentLineCount = document.lineCount, preIssuedTelemetryData.measurements.positionLine = position.line;
  }
  if (document.lineCount >= 8e3) telemetry(ctx, "ghostText.longFileMultilineSkip", TelemetryData.createAndMarkAsIssued({
    languageId: document.languageId,
    lineCount: String(document.lineCount),
    currentLine: String(position.line)
  }));else {
    if (requestMultilineOnNewLine && ["typescript", "typescriptreact"].includes(document.languageId) && isNewLine(position, document)) return !0;
    let requestMultiline = !1;
    return !inlineSuggestion && (0, qL.isSupportedLanguageId)(document.languageId) ? requestMultiline = await isEmptyBlockStart(document, position) : inlineSuggestion && (0, qL.isSupportedLanguageId)(document.languageId) && (requestMultiline = (await isEmptyBlockStart(document, position)) || (await isEmptyBlockStart(document, document.lineAt(position).range.end))), requestMultiline || (requestMultiline = await requestMultilineExperiment(requestMultilineExploration, requestMultiModel, requestMultiModelThreshold, document, prompt, preIssuedTelemetryData)), requestMultiline;
  }
  return !1;
},__name(shouldRequestMultiline, "shouldRequestMultiline");,function recordLastSuccessfulCompletionContext(prefix, suffix, promptHash) {
  lastPrefix = prefix, lastSuffix = suffix, lastPromptHash = promptHash;
},__name(recordLastSuccessfulCompletionContext, "recordLastSuccessfulCompletionContext");,function addToCache(ctx, requestContext, contents) {
  let promptHash = keyForPrompt(requestContext.prompt);
  recordLastSuccessfulCompletionContext(requestContext.prefix, requestContext.prompt.suffix, promptHash), ctx.get(CompletionsCache).set(promptHash, contents), ghostTextLogger.debug(ctx, `Cached ghost text for key: ${promptHash}, multiline: ${contents.multiline}, number of suggestions: ${contents.choices.length}`);
},__name(addToCache, "addToCache");,function appendToCache(ctx, requestContext, newContents) {
  let promptHash = keyForPrompt(requestContext.prompt),
    existing = ctx.get(CompletionsCache).get(promptHash);
  existing && existing.multiline === newContents.multiline ? ctx.get(CompletionsCache).set(promptHash, {
    multiline: existing.multiline,
    choices: existing.choices.concat(newContents.choices)
  }) : ctx.get(CompletionsCache).set(promptHash, newContents), ghostTextLogger.debug(ctx, `Appended cached ghost text for key: ${promptHash}, multiline: ${newContents.multiline}, number of suggestions: ${newContents.choices.length}`);
},__name(appendToCache, "appendToCache");,function getCachedChoices(ctx, promptHash, multiline) {
  let contents = ctx.get(CompletionsCache).get(promptHash);
  if (contents && !(multiline && !contents.multiline)) return contents.choices;
},__name(getCachedChoices, "getCachedChoices");,function adjustLeadingWhitespace(index, text, ws) {
  if (ws.length > 0) {
    if (text.startsWith(ws)) return {
      completionIndex: index,
      completionText: text,
      displayText: text.substr(ws.length),
      displayNeedsWsOffset: !1
    };
    {
      let textLeftWs = text.substr(0, text.length - text.trimLeft().length);
      return ws.startsWith(textLeftWs) ? {
        completionIndex: index,
        completionText: text,
        displayText: text.trimLeft(),
        displayNeedsWsOffset: !0
      } : {
        completionIndex: index,
        completionText: text,
        displayText: text,
        displayNeedsWsOffset: !1
      };
    }
  } else return {
    completionIndex: index,
    completionText: text,
    displayText: text,
    displayNeedsWsOffset: !1
  };
},__name(adjustLeadingWhitespace, "adjustLeadingWhitespace");,function getCompletionsForUserTyping(ctx, prefix, prompt, multiline) {
  let prefixMatches = lastPrefix ? prefix.startsWith(lastPrefix) : !1,
    suffixMatches = lastSuffix != null ? prompt.suffix == lastSuffix : !1;
  if (!lastPrefix || !lastPromptHash || !prefixMatches || !suffixMatches) return;
  let lastCachedCompletion = getCachedChoices(ctx, lastPromptHash, multiline);
  if (!lastCachedCompletion) return;
  let remainingPrefix = prefix.substring(lastPrefix.length);
  ghostTextLogger.debug(ctx, `Getting completions for user-typing flow - remaining prefix: ${remainingPrefix}`);
  let completionsToReturn = [];
  return lastCachedCompletion.forEach(element => {
    let completionToReturn = makeGhostAPIChoice(element, {
      forceSingleLine: !1
    });
    completionToReturn.completionText.startsWith(remainingPrefix) && (completionToReturn.completionText = completionToReturn.completionText.substring(remainingPrefix.length), completionsToReturn.push(completionToReturn));
  }), completionsToReturn;
},__name(getCompletionsForUserTyping, "getCompletionsForUserTyping");,function clearUserTypingState() {
  lastPrefix = void 0, lastSuffix = void 0, lastPromptHash = void 0;
},__name(clearUserTypingState, "clearUserTypingState");,function getCompletionsFromCache(ctx, prefix, prompt, multiline) {
  let promptHash = keyForPrompt(prompt);
  ghostTextLogger.debug(ctx, `Trying to get completions from cache for key: ${promptHash}`);
  let cachedChoice = getCachedChoices(ctx, promptHash, multiline);
  if (cachedChoice) {
    ghostTextLogger.debug(ctx, `Got completions from cache for key: ${promptHash}`);
    let completionsToReturn = [];
    cachedChoice.forEach(element => {
      let completionToReturn = makeGhostAPIChoice(element, {
        forceSingleLine: !multiline
      });
      completionsToReturn.push(completionToReturn);
    });
    let result = completionsToReturn.filter(e => e.completionText);
    return result.length > 0 && recordLastSuccessfulCompletionContext(prefix, prompt.suffix, promptHash), result;
  }
},__name(getCompletionsFromCache, "getCompletionsFromCache");,function telemetryWithAddData(ctx, choice) {
  let requestId = choice.requestId,
    properties = {
      choiceIndex: choice.choiceIndex.toString()
    },
    measurements = {
      numTokens: choice.numTokens,
      compCharLen: choice.completionText.length,
      numLines: choice.completionText.split(`
`).length
    };
  choice.meanLogProb && (measurements.meanLogProb = choice.meanLogProb), choice.meanAlternativeLogProb && (measurements.meanAlternativeLogProb = choice.meanAlternativeLogProb);
  let extendedTelemetry = choice.telemetryData.extendedBy(properties, measurements);
  return extendedTelemetry.extendWithRequestId(requestId), extendedTelemetry.measurements.confidence = ghostTextScoreConfidence(ctx, extendedTelemetry), extendedTelemetry.measurements.quantile = ghostTextScoreQuantile(ctx, extendedTelemetry), ghostTextLogger.debug(ctx, `Extended telemetry for ${choice.telemetryData.properties.headerRequestId} with retention confidence ${extendedTelemetry.measurements.confidence} (expected as good or better than about ${extendedTelemetry.measurements.quantile} of all suggestions)`), extendedTelemetry;
},__name(telemetryWithAddData, "telemetryWithAddData");,function telemetryIssued(ctx, document, detectedLanguage, requestContext, position, prompt, baseTelemetryData, computeContextualFilterScore, contextualFilterEnableTree) {
  let locationFactory = ctx.get(LocationFactory),
    currentLine = document.lineAt(position.line),
    lineBeforeCursor = document.getText(locationFactory.range(currentLine.range.start, position)),
    restOfLine = document.getText(locationFactory.range(position, currentLine.range.end)),
    properties = {
      languageId: document.languageId,
      beforeCursorWhitespace: JSON.stringify(lineBeforeCursor.trim() === ""),
      afterCursorWhitespace: JSON.stringify(restOfLine.trim() === "")
    };
  document.languageId !== detectedLanguage.languageId && (properties.detectedLanguageId = detectedLanguage.languageId, properties.fileExtension = detectedLanguage.fileExtension);
  let measurements = {
      ...telemetrizePromptLength(prompt.prompt),
      promptEndPos: document.offsetAt(position),
      documentLength: document.getText().length,
      delayMs: requestContext.delayMs
    },
    telemetryData = baseTelemetryData.extendedBy(properties, measurements);
  telemetryData.properties.promptChoices = JSON.stringify(prompt.promptChoices, (key, value) => value instanceof Map ? Array.from(value.entries()).reduce((acc, [k, v]) => ({
    ...acc,
    [k]: v
  }), {}) : value), telemetryData.properties.promptBackground = JSON.stringify(prompt.promptBackground, (key, value) => value instanceof Map ? Array.from(value.values()) : value);
  let typeFileHashCode = Array.from(prompt.neighborSource.entries()).map(typeFiles => [typeFiles[0], typeFiles[1].map(f => (0, vie.SHA256)(f).toString())]);
  telemetryData.properties.neighborSource = JSON.stringify(typeFileHashCode), telemetryData.measurements.promptComputeTimeMs = prompt.computeTimeMs, computeContextualFilterScore && (telemetryData.measurements.contextualFilterScore = contextualFilterScore(ctx, telemetryData, prompt.prompt, contextualFilterEnableTree));
  let repoInfo = requestContext.repoInfo;
  return telemetryData.properties.gitRepoInformation = repoInfo === void 0 ? "unavailable" : repoInfo === 0 ? "pending" : "available", repoInfo !== void 0 && repoInfo !== 0 && (telemetryData.properties.gitRepoUrl = repoInfo.url, telemetryData.properties.gitRepoHost = repoInfo.hostname, telemetryData.properties.gitRepoOwner = repoInfo.owner, telemetryData.properties.gitRepoName = repoInfo.repo, telemetryData.properties.gitRepoPath = repoInfo.pathname), telemetryData.properties.engineName = extractEngineName(ctx, requestContext.engineURL), telemetryData.properties.isMultiline = JSON.stringify(requestContext.multiline), telemetryData.properties.blockMode = requestContext.blockMode, telemetryData.properties.isCycling = JSON.stringify(requestContext.isCycling), telemetry(ctx, "ghostText.issued", telemetryData), telemetryData;
},__name(telemetryIssued, "telemetryIssued");,function telemetryPerformance(ctx, performanceKind, choice, requestStart, processingTimeMs) {
  let requestTimeMs = Date.now() - requestStart,
    deltaMs = requestTimeMs - processingTimeMs,
    telemetryData = choice.telemetryData.extendedBy({}, {
      completionCharLen: choice.completionText.length,
      requestTimeMs: requestTimeMs,
      processingTimeMs: processingTimeMs,
      deltaMs: deltaMs,
      meanLogProb: choice.meanLogProb || NaN,
      meanAlternativeLogProb: choice.meanAlternativeLogProb || NaN,
      numTokens: choice.numTokens
    });
  telemetryData.extendWithRequestId(choice.requestId), telemetry(ctx, `ghostText.${performanceKind}`, telemetryData);
},__name(telemetryPerformance, "telemetryPerformance");