var solutionsLogger = new Logger(1, "solutions");,async function* prependChoices(choices, prefix) {
  for await (let choice of choices) {
    let choiceCopy = {
      ...choice
    };
    choiceCopy.completionText = prefix + choiceCopy.completionText.trimRight(), yield choiceCopy;
  }
},__name(prependChoices, "prependChoices");,function normalizeCompletionText(text) {
  return text.replace(/\s+/g, "");
},__name(normalizeCompletionText, "normalizeCompletionText");,async function launchSolutions(ctx, solutionManager) {
  let insertPosition = solutionManager.completionContext.insertPosition,
    prependToCompletion = solutionManager.completionContext.prependToCompletion,
    indentation = solutionManager.completionContext.indentation,
    locationFactory = ctx.get(LocationFactory),
    document = await solutionManager.getDocument(),
    documentSource = document.getText(),
    positionOffset = document.offsetAt(insertPosition),
    actualSuffix = documentSource.substring(positionOffset),
    promptResponse = await extractPrompt(ctx, document, insertPosition);
  if (promptResponse.type === "copilotNotAvailable") return solutionManager.reportCancelled(), {
    status: "FinishedNormally"
  };
  if (promptResponse.type === "contextTooShort") return solutionManager.reportCancelled(), {
    status: "FinishedWithError",
    error: "Context too short"
  };
  let prompt = promptResponse.prompt,
    trailingWs = promptResponse.trailingWs;
  trailingWs.length > 0 && (solutionManager.startPosition = locationFactory.position(solutionManager.startPosition.line, solutionManager.startPosition.character - trailingWs.length));
  let cancellationToken = solutionManager.getCancellationToken(),
    ourRequestId = v4_default();
  solutionManager.savedTelemetryData = TelemetryData.createAndMarkAsIssued({
    headerRequestId: ourRequestId,
    languageId: document.languageId,
    source: completionTypeToString(solutionManager.completionContext.completionType)
  }, {
    ...telemetrizePromptLength(prompt),
    solutionCount: solutionManager.solutionCountTarget,
    promptEndPos: document.offsetAt(insertPosition)
  }), solutionsLogger.info(ctx, `prompt: ${JSON.stringify(prompt)}`), solutionsLogger.debug(ctx, `prependToCompletion: ${prependToCompletion}`), telemetry(ctx, "solution.requested", solutionManager.savedTelemetryData);
  let blockMode = await ctx.get(BlockModeConfig).forLanguage(ctx, document.languageId),
    isSupportedLanguage = promptLibProxy.isSupportedLanguageId(document.languageId),
    contextIndent = contextIndentation(document, insertPosition),
    postOptions = {
      stream: !0,
      extra: {
        language: document.languageId,
        next_indent: contextIndent.next ?? 0,
        prompt_tokens: prompt.prefixTokens ?? 0,
        suffix_tokens: prompt.suffixTokens ?? 0
      }
    };
  blockMode === "parsing" && !isSupportedLanguage && (postOptions.stop = [`

`, `\r
\r
`]);
  let repoInfo = extractRepoInfoInBackground(ctx, document.uri),
    completionParams = {
      prompt: prompt,
      languageId: document.languageId,
      repoInfo: repoInfo,
      ourRequestId: ourRequestId,
      engineUrl: await getEngineURL(ctx, tryGetGitHubNWO(repoInfo) ?? "", document.languageId, getDogFood(repoInfo), await getUserKind(ctx), await getFtFlag(ctx), await getRagFlag(ctx), solutionManager.savedTelemetryData),
      count: solutionManager.solutionCountTarget,
      uiKind: "synthesize",
      postOptions: postOptions,
      requestLogProbs: !0
    },
    finishedCb;
  switch (blockMode) {
    case "server":
      finishedCb = __name(async text => {}, "finishedCb"), postOptions.extra.force_indent = contextIndent.prev ?? -1, postOptions.extra.trim_by_indentation = !0;
      break;
    case "parsingandserver":
      finishedCb = isSupportedLanguage ? parsingBlockFinished(ctx, document, solutionManager.startPosition) : async text => {}, postOptions.extra.force_indent = contextIndent.prev ?? -1, postOptions.extra.trim_by_indentation = !0;
      break;
    case "parsing":
    default:
      finishedCb = isSupportedLanguage ? parsingBlockFinished(ctx, document, solutionManager.startPosition) : async text => {};
      break;
  }
  ctx.get(StatusReporter).setProgress();
  let res = await ctx.get(OpenAIFetcher).fetchAndStreamCompletions(ctx, completionParams, TelemetryData.createAndMarkAsIssued(), finishedCb, cancellationToken);
  if (res.type === "failed" || res.type === "canceled") return solutionManager.reportCancelled(), ctx.get(StatusReporter).removeProgress(), {
    status: "FinishedWithError",
    error: `${res.type}: ${res.reason}`
  };
  let choices = res.choices;
  choices = prependChoices(choices, prependToCompletion), indentation !== null && (choices = cleanupIndentChoices(choices, indentation)), choices = asyncIterableMapFilter(choices, async choice => postProcessChoice(ctx, "solution", document, insertPosition, choice, !1, solutionsLogger, promptResponse.prompt, actualSuffix));
  let solutions = asyncIterableMapFilter(choices, async apiChoice => {
    let display = apiChoice.completionText;
    if (solutionsLogger.info(ctx, `Open Copilot completion: [${apiChoice.completionText}]`), solutionManager.completionContext.completionType === 2) {
      let displayBefore = "",
        displayStartPos = await getNodeStart(ctx, document, insertPosition, apiChoice.completionText);
      if (displayStartPos) [displayBefore] = trimLastLine(document.getText(locationFactory.range(locationFactory.position(displayStartPos.line, displayStartPos.character), insertPosition)));else {
        let displayStartPos = locationFactory.position(insertPosition.line, 0);
        displayBefore = document.getText(locationFactory.range(displayStartPos, insertPosition));
      }
      display = displayBefore + display;
    }
    let completionText = apiChoice.completionText;
    trailingWs.length > 0 && completionText.startsWith(trailingWs) && (completionText = completionText.substring(trailingWs.length));
    let meanLogProb = apiChoice.meanLogProb,
      meanProb = meanLogProb !== void 0 ? Math.exp(meanLogProb) : 0,
      docVersion = (await solutionManager.getDocument()).version;
    return {
      displayText: display,
      meanProb: meanProb,
      meanLogProb: meanLogProb || 0,
      completionText: completionText,
      requestId: apiChoice.requestId,
      choiceIndex: apiChoice.choiceIndex,
      prependToCompletion: prependToCompletion,
      docVersion: docVersion
    };
  });
  return generateSolutionsStream(ctx.get(StatusReporter), cancellationToken, solutions[Symbol.asyncIterator]());
},__name(launchSolutions, "launchSolutions");,async function generateSolutionsStream(statusReporter, cancellationToken, solutions) {
  if (cancellationToken.isCancellationRequested) return statusReporter.removeProgress(), {
    status: "FinishedWithError",
    error: "Cancelled"
  };
  let nextResult = await solutions.next();
  return nextResult.done === !0 ? (statusReporter.removeProgress(), {
    status: "FinishedNormally"
  }) : {
    status: "Solution",
    solution: nextResult.value,
    next: generateSolutionsStream(statusReporter, cancellationToken, solutions)
  };
},__name(generateSolutionsStream, "generateSolutionsStream");