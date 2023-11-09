var logger = new Logger(1, "symbol_def"),
  lruCacheSize = 1e3,
  SymbolDefinitionProvider = class {
    static {
      __name(this, "SymbolDefinitionProvider");
    }
  },
  getSymbolDefinition = __name(async function (ctx, symbolName, docInfo, symbolDefinitionProvider) {
    try {
      return await symbolDefinitionProvider.getSymbolDefinition(docInfo);
    } catch (error) {
      return logger.exception(ctx, error, "Error retrieving definitions"), [];
    }
  }, "getSymbolDefinition");,getSymbolDefinition = memoize(getSymbolDefinition, {
  cache: new LRUCacheMap(lruCacheSize),
  hash: (ctx, symbolName, docInfo, symbolDefinitionProvider) => `${docInfo.uri}#${symbolName}`
});,getSymbolDefinition = shortCircuit(getSymbolDefinition, 100, []);,async function getSymbolDefSnippets(ctx, docInfo) {
  let symbolDefinitionProvider = ctx.get(SymbolDefinitionProvider),
    callerFunctions = await promptLibProxy.getCallSites(docInfo);
  if (callerFunctions.length == 0) return [];
  let symbolDefinitionPromises = [];
  for (let callerFunc of callerFunctions) {
    let docInfoSnippet = {
        ...docInfo,
        position: callerFunc.position
      },
      symbolDefPromises = getSymbolDefinition(ctx, callerFunc.name, docInfoSnippet, symbolDefinitionProvider);
    symbolDefinitionPromises.push(symbolDefPromises);
  }
  return (await Promise.all(symbolDefinitionPromises)).flat();
},__name(getSymbolDefSnippets, "getSymbolDefSnippets");,var MIN_PROMPT_CHARS = 10,
  _contextTooShort = {
    type: "contextTooShort"
  },
  _copilotNotAvailable = {
    type: "copilotNotAvailable"
  };,async function getPromptForSource(ctx, source, offset, relativePath, uri, languageId, telemetryData) {
  let docInfo = {
      uri: uri.toString(),
      source: source,
      offset: offset,
      relativePath: relativePath,
      languageId: languageId
    },
    repoInfo = extractRepoInfoInBackground(ctx, uri),
    repoNwo = tryGetGitHubNWO(repoInfo) ?? "",
    userKind = await getUserKind(ctx),
    dogFood = getDogFood(repoInfo),
    customModel = await getFtFlag(ctx),
    retrievalOrg = await getRagFlag(ctx),
    featuresFilterArgs = {
      repoNwo: repoNwo,
      userKind: userKind,
      dogFood: dogFood,
      fileType: languageId,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    },
    tokenizerName = M0.TokenizerName.cl100k,
    defaultPromptCompletionTokens = (await ctx.get(CopilotTokenManager).getCopilotToken(ctx)).getTokenValue("8kp") === "1" ? 8192 : 2048,
    maxPromptLength = (await ctx.get(Features).maxPromptCompletionTokens(featuresFilterArgs, defaultPromptCompletionTokens)) - getConfig(ctx, ConfigKey.SolutionLength),
    neighboringTabs = await ctx.get(Features).neighboringTabsOption(featuresFilterArgs),
    neighboringSnippetTypes = await ctx.get(Features).neighboringSnippetTypes(featuresFilterArgs),
    numberOfSnippets = await ctx.get(Features).numberOfSnippets(featuresFilterArgs),
    snippetPercent = await ctx.get(Features).snippetPercent(featuresFilterArgs),
    suffixStartMode = await ctx.get(Features).suffixStartMode(featuresFilterArgs),
    cursorSnippetsPickingStrategy = await ctx.get(Features).cursorSnippetsPickingStrategy(featuresFilterArgs),
    promptOptions = {
      maxPromptLength: maxPromptLength,
      neighboringTabs: neighboringTabs,
      suffixStartMode: suffixStartMode,
      tokenizerName: tokenizerName,
      neighboringSnippetTypes: neighboringSnippetTypes,
      cursorSnippetsPickingStrategy: cursorSnippetsPickingStrategy,
      numberOfSnippets: numberOfSnippets,
      snippetPercent: snippetPercent
    },
    suffixPercent = await ctx.get(Features).suffixPercent(featuresFilterArgs),
    suffixMatchThreshold = await ctx.get(Features).suffixMatchThreshold(featuresFilterArgs),
    fimSuffixLengthThreshold = await ctx.get(Features).fimSuffixLengthThreshold(featuresFilterArgs),
    localImportContextEnabled = await ctx.get(Features).localImportContext(featuresFilterArgs);
  suffixPercent > 0 && (promptOptions = {
    ...promptOptions,
    suffixPercent: suffixPercent,
    suffixMatchThreshold: suffixMatchThreshold,
    fimSuffixLengthThreshold: fimSuffixLengthThreshold,
    localImportContext: localImportContextEnabled
  });
  let fileSystem = ctx.get(M0.FileSystem),
    promptInfo,
    history = new Map();
  for (let key of cursorHistoryManager.lineCursorHistory.keys()) history.set(key, cursorHistoryManager.lineCursorHistory.get(key) ?? new Map());
  let snippets = [];
  telemetryData || (telemetryData = TelemetryData.createAndMarkAsIssued());
  let retrievalOptions = await getRetrievalOptions(ctx, featuresFilterArgs, telemetryData);
  if (retrievalOptions && (snippets = await queryRetrievalSnippets(ctx, docInfo, retrievalOptions, telemetryData)), await ctx.get(Features).symbolDefinitionStrategy(featuresFilterArgs)) {
    let symbolDefSnippets = await getSymbolDefSnippets(ctx, docInfo);
    snippets.push(...symbolDefSnippets);
  }
  let docs = [],
    neighborSource = new Map();
  try {
    let files = await NeighborSource.getNeighborFiles(ctx, uri, featuresFilterArgs);
    docs = files.docs, neighborSource = files.neighborSource;
  } catch (e) {
    telemetryException(ctx, e, "prompt.getPromptForSource.exception");
  }
  try {
    let spContext = {
        currentFile: docInfo,
        neighborFiles: docs,
        options: new M0.PromptOptions(fileSystem, promptOptions),
        lineCursorHistory: history
      },
      snippetProviderResults = await ctx.get(M0.SnippetOrchestrator).getSnippets(spContext),
      orchestratorSnippets = (0, M0.providersSnippets)(snippetProviderResults),
      errors = (0, M0.providersErrors)(snippetProviderResults),
      {
        runtimes: runtimes,
        timeouts: timeouts
      } = (0, M0.providersPerformance)(snippetProviderResults);
    telemetryData.extendWithConfigProperties(ctx), telemetryData.sanitizeKeys(), await telemetryRaw(ctx, "prompt.stat", {
      ...mkBasicResultTelemetry(telemetryData),
      ...(timeouts[M0.SnippetProviderType.NeighboringTabs] && {
        neighborFilesTimeout: "true"
      })
    }, {
      ...(typeof runtimes[M0.SnippetProviderType.NeighboringTabs] == "number" && {
        neighborFilesRuntimeMs: runtimes[M0.SnippetProviderType.NeighboringTabs]
      })
    });
    for (let e of errors) e.error instanceof M0.ProviderTimeoutError || (await telemetryException(ctx, e.error, "getSnippets"));
    snippets.push(...orchestratorSnippets);
  } catch (e) {
    throw await telemetryException(ctx, e, "prompt.orchestrator.getSnippets.exception"), e;
  }
  try {
    promptInfo = await promptLibProxy.getPrompt(fileSystem, docInfo, promptOptions, snippets);
  } catch (e) {
    throw await telemetryException(ctx, e, "prompt.getPromptForSource.exception"), e;
  }
  return {
    neighborSource: neighborSource,
    ...promptInfo
  };
},__name(getPromptForSource, "getPromptForSource");,function trimLastLine(source) {
  let lines = source.split(`
`),
    lastLine = lines[lines.length - 1],
    extraSpace = lastLine.length - lastLine.trimRight().length,
    promptTrim = source.slice(0, source.length - extraSpace),
    trailingWs = source.slice(promptTrim.length);
  return [lastLine.length == extraSpace ? promptTrim : source, trailingWs];
},__name(trimLastLine, "trimLastLine");,async function extractPromptForSource(ctx, source, offset, relativePath, uri, languageId, telemetryData) {
  if ((await ctx.get(CopilotRepositoryControlManager).evaluate(uri, source, "UPDATE")).isBlocked) return _copilotNotAvailable;
  let repoInfo = extractRepoInfoInBackground(ctx, uri),
    repoNwo = tryGetGitHubNWO(repoInfo) ?? "",
    userKind = await getUserKind(ctx),
    dogFood = getDogFood(repoInfo),
    customModel = await getFtFlag(ctx),
    retrievalOrg = await getRagFlag(ctx),
    featuresFilterArgs = {
      repoNwo: repoNwo,
      userKind: userKind,
      dogFood: dogFood,
      fileType: languageId,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    },
    suffixPercent = await ctx.get(Features).suffixPercent(featuresFilterArgs),
    fimSuffixLengthThreshold = await ctx.get(Features).fimSuffixLengthThreshold(featuresFilterArgs);
  if ((suffixPercent > 0 ? source.length : offset) < MIN_PROMPT_CHARS) return _contextTooShort;
  let startTime = Date.now(),
    {
      prefix: prefix,
      suffix: suffix,
      prefixLength: prefixLength,
      suffixLength: suffixLength,
      promptChoices: promptChoices,
      promptBackground: promptBackground,
      promptElementRanges: promptElementRanges,
      neighborSource: neighborSource
    } = await getPromptForSource(ctx, source, offset, relativePath, uri, languageId, telemetryData),
    [resPrompt, trailingWs] = trimLastLine(prefix),
    endTime = Date.now();
  return {
    type: "prompt",
    prompt: {
      prefix: resPrompt,
      suffix: suffix,
      prefixTokens: prefixLength,
      suffixTokens: suffixLength,
      isFimEnabled: suffixPercent > 0 && suffix.length > fimSuffixLengthThreshold,
      promptElementRanges: promptElementRanges.ranges
    },
    trailingWs: trailingWs,
    promptChoices: promptChoices,
    computeTimeMs: endTime - startTime,
    promptBackground: promptBackground,
    neighborSource: neighborSource
  };
},__name(extractPromptForSource, "extractPromptForSource");,async function extractPromptForDocument(ctx, doc, position, telemetryData) {
  let relativePath = await ctx.get(TextDocumentManager).getRelativePath(doc);
  return extractPromptForSource(ctx, doc.getText(), doc.offsetAt(position), relativePath, doc.uri, doc.languageId, telemetryData);
},__name(extractPromptForDocument, "extractPromptForDocument");,function addNeighboringCellsToPrompt(neighboringCell, activeCellLanguageId) {
  let languageId = neighboringCell.document.languageId,
    text = neighboringCell.document.getText();
  return languageId === activeCellLanguageId ? text : (0, M0.commentBlockAsSingles)(text, activeCellLanguageId);
},__name(addNeighboringCellsToPrompt, "addNeighboringCellsToPrompt");,async function extractPromptForNotebook(ctx, doc, notebook, position, telemetryData) {
  let activeCell = notebook.getCells().find(cell => cell.document.uri.toString() === doc.uri.toString());
  if (activeCell) {
    let beforeCells = notebook.getCells().filter(cell => cell.index < activeCell.index && considerNeighborFile(activeCell.document.languageId, cell.document.languageId)),
      beforeSource = beforeCells.length > 0 ? beforeCells.map(cell => addNeighboringCellsToPrompt(cell, activeCell.document.languageId)).join(`

`) + `

` : "",
      source = beforeSource + doc.getText(),
      offset = beforeSource.length + doc.offsetAt(position),
      relativePath = await ctx.get(TextDocumentManager).getRelativePath(doc);
    return extractPromptForSource(ctx, source, offset, relativePath, doc.uri, activeCell.document.languageId, telemetryData);
  } else return extractPromptForDocument(ctx, doc, position, telemetryData);
},__name(extractPromptForNotebook, "extractPromptForNotebook");,function extractPrompt(ctx, doc, position, telemetryData) {
  let notebook = ctx.get(TextDocumentManager).findNotebook(doc);
  return notebook === void 0 ? extractPromptForDocument(ctx, doc, position, telemetryData) : extractPromptForNotebook(ctx, doc, notebook, position, telemetryData);
},__name(extractPrompt, "extractPrompt");