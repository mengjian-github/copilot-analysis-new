function editDistance(haystack, needle, compare = (h, n) => h === n ? 0 : 1) {
  if (needle.length === 0 || haystack.length === 0) return {
    distance: needle.length,
    startOffset: 0,
    endOffset: 0
  };
  let curRow = new Array(needle.length + 1).fill(0),
    curStart = new Array(needle.length + 1).fill(0),
    prevRow = new Array(haystack.length + 1).fill(0),
    prevStart = new Array(haystack.length + 1).fill(0),
    c = needle[0];
  for (let i = 0; i < haystack.length + 1; i++) i === 0 ? curRow[i] = 1 : curRow[i] = compare(haystack[i - 1], c, i - 1, 0), curStart[i] = i > 0 ? i - 1 : 0;
  for (let j = 1; j < needle.length; j++) {
    let swap = prevRow;
    prevRow = curRow, curRow = swap, swap = prevStart, prevStart = curStart, curStart = swap, c = needle[j], curRow[0] = j + 1;
    for (let i = 1; i < haystack.length + 1; i++) {
      let inserted = 1 + prevRow[i],
        deleted = 1 + curRow[i - 1],
        substituted = compare(haystack[i - 1], c, i - 1, j) + prevRow[i - 1];
      curRow[i] = Math.min(deleted, inserted, substituted), curRow[i] === substituted ? curStart[i] = prevStart[i - 1] : curRow[i] === inserted ? curStart[i] = prevStart[i] : curStart[i] = curStart[i - 1];
    }
  }
  let best = 0;
  for (let i = 0; i < haystack.length + 1; i++) curRow[i] < curRow[best] && (best = i);
  return {
    distance: curRow[best],
    startOffset: curStart[best],
    endOffset: best
  };
},__name(editDistance, "editDistance");,function emptyLexDictionary() {
  return new Map();
},__name(emptyLexDictionary, "emptyLexDictionary");,function reverseLexDictionary(d) {
  let lookup = new Array(d.size);
  for (let [lexeme, idx] of d) lookup[idx] = lexeme;
  return lookup;
},__name(reverseLexDictionary, "reverseLexDictionary");,function* lexGeneratorWords(s) {
  let buffer = "",
    State;
  (c => (State[c.Word = 0] = "Word", State[c.Space = 1] = "Space", State[c.Other = 2] = "Other"))(State ||= {});
  let state = 0;
  for (let c of s) {
    let newState;
    /(\p{L}|\p{Nd}|_)/u.test(c) ? newState = 0 : c === " " ? newState = 1 : newState = 2, newState === state && newState !== 2 ? buffer += c : (buffer.length > 0 && (yield buffer), buffer = c, state = newState);
  }
  buffer.length > 0 && (yield buffer);
},__name(lexGeneratorWords, "lexGeneratorWords");,function lexicalAnalyzer(s, d, lexGenerator, lexFilter) {
  let lexed = [],
    offset = 0;
  for (let lexeme of lexGenerator(s)) lexFilter(lexeme) && (d.has(lexeme) || d.set(lexeme, d.size), lexed.push([d.get(lexeme), offset])), offset += lexeme.length;
  return [lexed, d];
},__name(lexicalAnalyzer, "lexicalAnalyzer");,function notSingleSpace(s) {
  return s !== " ";
},__name(notSingleSpace, "notSingleSpace");,function lexEditDistance(haystack, needle, lexGenerator = lexGeneratorWords) {
  let [haystackLexed, d] = lexicalAnalyzer(haystack, emptyLexDictionary(), lexGenerator, notSingleSpace),
    [needleLexed, dBoth] = lexicalAnalyzer(needle, d, lexGenerator, notSingleSpace);
  if (needleLexed.length === 0 || haystackLexed.length === 0) return {
    lexDistance: needleLexed.length,
    startOffset: 0,
    endOffset: 0,
    haystackLexLength: haystackLexed.length,
    needleLexLength: needleLexed.length
  };
  let lookupId = reverseLexDictionary(dBoth),
    needleLexedLength = needleLexed.length,
    needleFirst = lookupId[needleLexed[0][0]],
    needleLast = lookupId[needleLexed[needleLexedLength - 1][0]];
  function compare(hLexId, nLexId, hIndex, nIndex) {
    if (nIndex === 0 || nIndex === needleLexedLength - 1) {
      let haystackLexeme = lookupId[haystackLexed[hIndex][0]];
      return nIndex == 0 && haystackLexeme.endsWith(needleFirst) || nIndex == needleLexedLength - 1 && haystackLexeme.startsWith(needleLast) ? 0 : 1;
    } else return hLexId === nLexId ? 0 : 1;
  }
  __name(compare, "compare");
  let alignment = editDistance(haystackLexed.map(x => x[0]), needleLexed.map(x => x[0]), compare),
    startOffset = haystackLexed[alignment.startOffset][1],
    endOffset = alignment.endOffset < haystackLexed.length ? haystackLexed[alignment.endOffset][1] : haystack.length;
  return endOffset > 0 && haystack[endOffset - 1] === " " && --endOffset, {
    lexDistance: alignment.distance,
    startOffset: startOffset,
    endOffset: endOffset,
    haystackLexLength: haystackLexed.length,
    needleLexLength: needleLexed.length
  };
},__name(lexEditDistance, "lexEditDistance");,var equal = Vne(),
  logger = new Logger(0, "retrieval");,function snippetFromRetrievalResult(result) {
  return {
    snippet: result.text.before + result.text.snippet + result.text.after,
    score: result.distance,
    startLine: result.line_info.before_start_line,
    endLine: result.line_info.after_end_line,
    relativePath: result.file,
    restrictedTelemetry: {
      corpusId: result.corpus_config.corpus_id,
      repoNwo: result.corpus_config.repo_nwo,
      repoSha: result.corpus_config.repo_sha,
      indexTimestamp: result.corpus_config.index_timestamp
    }
  };
},__name(snippetFromRetrievalResult, "snippetFromRetrievalResult");,function buildSnippetMatcher(matcherName, matcherThreshold) {
  switch (matcherName) {
    case "exact":
      return exactSnippetMatcher;
    case "editDistanceRelative":
      if (matcherThreshold === void 0 || matcherThreshold < 0 || matcherThreshold > 100) throw new Error("Invalid threshold for editDistanceRelative matcher");
      return editDistanceSnippetMatcher(matcherThreshold / 100, "relative");
    case "editDistanceAbsolute":
      if (matcherThreshold === void 0 || matcherThreshold < 0) throw new Error("Invalid threshold for editDistanceAbsolute matcher");
      return editDistanceSnippetMatcher(matcherThreshold, "absolute");
    case "lineBasedRelative":
      if (matcherThreshold === void 0 || matcherThreshold < 0 || matcherThreshold > 100) throw new Error("Invalid threshold for lineBasedRelative matcher");
      return lineBasedSnippetMatcher(matcherThreshold / 100, "relative", 100);
    case "lineBasedAbsolute":
      if (matcherThreshold === void 0 || matcherThreshold < 0) throw new Error("Invalid threshold for lineBasedAbsolute matcher");
      return lineBasedSnippetMatcher(matcherThreshold, "absolute", 100);
    default:
      return exactSnippetMatcher;
  }
},__name(buildSnippetMatcher, "buildSnippetMatcher");,function exactSnippetMatcher(queryKey, cacheKey) {
  return queryKey.querySnippet === cacheKey.querySnippet;
},__name(exactSnippetMatcher, "exactSnippetMatcher");,function breakUpLongLines(text, maxLineCharLength) {
  let lines = new Set();
  for (let line of text.split(`
`)) {
    if (line.length <= maxLineCharLength) {
      lines.add(line);
      continue;
    }
    let i = 0;
    for (; i < line.length;) lines.add(line.substring(i, i + maxLineCharLength)), i += maxLineCharLength;
  }
  return lines;
},__name(breakUpLongLines, "breakUpLongLines");,function lineBasedSnippetMatcher(threshold, thresholdType, maxLineCharLength) {
  return (queryKey, cacheKey) => {
    let queryLines = breakUpLongLines(queryKey.querySnippet, maxLineCharLength),
      cacheLines = breakUpLongLines(cacheKey.querySnippet, maxLineCharLength),
      intersection = new Set([...queryLines].filter(line => cacheLines.has(line)));
    return thresholdType === "relative" ? 1 - intersection.size / (queryLines.size + cacheLines.size - intersection.size) <= threshold : Math.max(queryLines.size, cacheLines.size) - intersection.size <= threshold;
  };
},__name(lineBasedSnippetMatcher, "lineBasedSnippetMatcher");,function editDistanceSnippetMatcher(threshold, thresholdType) {
  return (queryKey, cacheKey) => {
    let res = editDistance(queryKey.querySnippet, cacheKey.querySnippet);
    return thresholdType === "relative" ? res.distance <= threshold * Math.max(queryKey.querySnippet.length, cacheKey.querySnippet.length) : res.distance <= threshold;
  };
},__name(editDistanceSnippetMatcher, "editDistanceSnippetMatcher");,function getRetrievalContext(docInfo, options) {
  let contextInfo = (0, z5.getCursorContext)(docInfo, options);
  return {
    querySnippet: contextInfo.context,
    offset: docInfo.offset,
    tokenLength: contextInfo.tokenLength,
    lineCount: contextInfo.lineCount
  };
},__name(getRetrievalContext, "getRetrievalContext");,var RetrievalCache = class {
  constructor(matcher, maxUriCacheSize) {
    this.uriToCache = new Map();
    this.matcher = matcher, this.maxUriCacheSize = maxUriCacheSize;
  }
  static {
    __name(this, "RetrievalCache");
  }
  hashContext(context) {
    return (0, Yne.createHash)("sha1").update(context.querySnippet).digest("hex");
  }
  get(uri, queryContext) {
    let uriCache = this.uriToCache.get(uri);
    if (uriCache !== void 0) for (let hash of uriCache.keys()) {
      let {
        context: context,
        retrievalId: retrievalId,
        snippets: snippets
      } = uriCache.get(hash);
      if (this.matcher(queryContext, context)) return {
        retrievalId: retrievalId,
        snippets: snippets
      };
    }
  }
  put(uri, retrievalId, retrievalContext, snippets) {
    let uriCache = this.uriToCache.get(uri);
    uriCache === void 0 && (uriCache = new LRUCacheMap(this.maxUriCacheSize), this.uriToCache.set(uri, uriCache)), uriCache.set(this.hashContext(retrievalContext), {
      context: retrievalContext,
      retrievalId: retrievalId,
      snippets: snippets
    });
  }
};,function lookupCache(ctx, retrievalCache, docInfo, retrievalContext, telemetryData) {
  let cacheLookupStart = Date.now(),
    cacheHit = retrievalCache.get(docInfo.uri, retrievalContext),
    cacheLookupElapsed = Date.now() - cacheLookupStart;
  return telemetrizeCacheLookup(ctx, cacheHit !== void 0, cacheLookupElapsed, telemetryData), cacheHit;
},__name(lookupCache, "lookupCache");,function telemetrizeCacheLookup(ctx, cacheHit, cacheLookupElapsed, telemetryData) {
  telemetry(ctx, "retrieval.cacheLookup", telemetryData.extendedBy({
    cacheHit: cacheHit ? "true" : "false"
  }, {
    cacheLookupElapsed: cacheLookupElapsed
  }), 0);
},__name(telemetrizeCacheLookup, "telemetrizeCacheLookup");,function telemetrizeTooShortContext(ctx, docInfo, retrievalContext, telemetryData) {
  let commonMeasurements = {
    retrievalContextTokens: retrievalContext.tokenLength,
    retrievalLineCount: retrievalContext.lineCount,
    cursorPos: docInfo.offset
  };
  telemetry(ctx, "retrieval.tooShortContext", telemetryData.extendedBy({}, commonMeasurements), 0), telemetry(ctx, "retrieval.tooShortContext", telemetryData.extendedBy({
    file: docInfo.uri,
    retrievalContext: retrievalContext.querySnippet
  }, commonMeasurements), 1);
},__name(telemetrizeTooShortContext, "telemetrizeTooShortContext");,function telemetrizePostRetrievalRequest(ctx, docInfo, retrievalId, retrievalContext, retrievalOptions, telemetryData) {
  let commonMeasurements = {
    retrievalContextTokens: retrievalContext.tokenLength,
    retrievalLineCount: retrievalContext.lineCount,
    cursorPos: docInfo.offset
  };
  telemetry(ctx, "retrieval.issued", telemetryData.extendedBy({
    retrievalId: retrievalId
  }, commonMeasurements), 0), telemetry(ctx, "retrieval.issued", telemetryData.extendedBy({
    retrievalId: retrievalId,
    file: docInfo.uri,
    retrievalContext: retrievalContext.querySnippet
  }, commonMeasurements), 1);
},__name(telemetrizePostRetrievalRequest, "telemetrizePostRetrievalRequest");,function telemetrizePostRetrievalResponse(ctx, retrievalId, response, telemetryData) {
  telemetry(ctx, "retrieval.response", telemetryData.extendedBy({
    retrievalId: retrievalId
  }), 0);
},__name(telemetrizePostRetrievalResponse, "telemetrizePostRetrievalResponse");,function telemetrizePostRetrievalRequestError(ctx, retrievalId, error, telemetryData) {
  telemetry(ctx, "retrieval.error", telemetryData.extendedBy({
    retrievalId: retrievalId,
    error: JSON.stringify(error) ?? "unknown"
  }), 0);
},__name(telemetrizePostRetrievalRequestError, "telemetrizePostRetrievalRequestError");,function telemetrizeProcessRetrievalResponse(ctx, retrievalId, body, snippets, telemetryData) {
  let commonMeasurements = {
    numSnippetsFromServer: body?.results?.length || -1,
    numFilteredSnippets: snippets.length
  };
  telemetry(ctx, "retrieval.retrieved", telemetryData.extendedBy({
    retrievalId: retrievalId
  }, {
    ...commonMeasurements,
    elapsedEmbeddingNs: body?.metadata?.elapsed_embedding_ns || -1,
    elapsedKnnNs: body?.metadata?.elapsed_knn_ns || -1,
    elapsedFindSourceNs: body?.metadata?.elapsed_find_source_ns || -1
  }), 0), telemetry(ctx, "retrieval.retrieved", telemetryData.extendedBy({
    retrievalId: retrievalId,
    snippets: JSON.stringify(snippets.map(snippet => {
      let {
        restrictedTelemetry: restrictedTelemetry,
        ...rest
      } = snippet;
      return {
        ...rest,
        ...restrictedTelemetry
      };
    }))
  }, {
    ...commonMeasurements
  }), 1);
},__name(telemetrizeProcessRetrievalResponse, "telemetrizeProcessRetrievalResponse");,function telemetrizeProcessRetrievalError(ctx, retrievalId, body, error, telemetryData) {
  telemetry(ctx, "retrieval.errorProcess", telemetryData.extendedBy({
    retrievalId: retrievalId
  }), 0), telemetry(ctx, "retrieval.errorProcess", telemetryData.extendedBy({
    retrievalId: retrievalId,
    body: JSON.stringify(body) ?? "unknown",
    error: JSON.stringify(error) ?? "unknown"
  }), 1);
},__name(telemetrizeProcessRetrievalError, "telemetrizeProcessRetrievalError");,function telemetrizeQueryRetrievalDebounce(ctx, pendingRetrievalId, telemetryData) {
  telemetry(ctx, "retrieval.debounced", telemetryData.extendedBy({
    pendingRetrievalId: pendingRetrievalId
  }), 0);
},__name(telemetrizeQueryRetrievalDebounce, "telemetrizeQueryRetrievalDebounce");,function telemetrizeQueryRetrievalFromCache(ctx, cachedRetrievalId, cachedSnippets, telemetryData) {
  telemetry(ctx, "retrieval.cacheHit", telemetryData.extendedBy({
    cachedRetrievalId: cachedRetrievalId
  }, {
    numSnippetsReturned: cachedSnippets.length
  }), 0);
},__name(telemetrizeQueryRetrievalFromCache, "telemetrizeQueryRetrievalFromCache");,var documentRequestStates = new Map();,function retrievalRequestUrl(repoNwo, serverRouteImpl) {
  return OPENAI_PROXY_HOST + `/v0/retrieval?repo=${repoNwo}&impl=${serverRouteImpl}`;
},__name(retrievalRequestUrl, "retrievalRequestUrl");,function filterQuerySnippets(docInfo) {
  return snippet => snippet.relativePath === void 0 ? !0 : !(docInfo.uri.endsWith(snippet.relativePath) || snippet.relativePath.endsWith(docInfo.uri));
},__name(filterQuerySnippets, "filterQuerySnippets");,async function postRetrievalRequest(ctx, docInfo, retrievalContext, retrievalOptions, telemetryData) {
  let retrievalId = v4_default();
  documentRequestStates.set(docInfo.uri, {
    state: "pending",
    retrievalId: retrievalId
  });
  let secretKey = (await ctx.get(CopilotTokenManager).getCopilotToken(ctx)).token;
  telemetrizePostRetrievalRequest(ctx, docInfo, retrievalId, retrievalContext, retrievalOptions, telemetryData), postRequest(ctx, retrievalRequestUrl(retrievalOptions.repoNwo, retrievalOptions.serverRouteImpl), secretKey, void 0, v4_default(), {
    query: retrievalContext.querySnippet,
    options: {
      ...retrievalOptions.server
    }
  }).then(async response => {
    if (logger.info(ctx, `Retrieval request for ${docInfo.uri} finished`), response.status === 200) documentRequestStates.set(docInfo.uri, {
      state: "response",
      retrievalId: retrievalId,
      retrievalContext: retrievalContext,
      response: response,
      retrievalOptions: retrievalOptions
    }), telemetrizePostRetrievalResponse(ctx, retrievalId, response, telemetryData);else throw new Error(`Retrieval request failed with status ${response.status}`);
  }).catch(error => {
    logger.info(ctx, `Retrieval request for ${docInfo.uri} failed. Error: ${error}`), telemetrizePostRetrievalRequestError(ctx, retrievalId, error, telemetryData), documentRequestStates.set(docInfo.uri, {
      state: "idle"
    });
  });
},__name(postRetrievalRequest, "postRetrievalRequest");,async function processRetrievalResponse(ctx, docInfo, retrievalId, retrievalContext, response, retrievalOptions, telemetryData) {
  if (documentRequestStates.set(docInfo.uri, {
    state: "idle"
  }), !equal(retrievalOptions, currentRetrievalOptions)) return;
  let {
      data: unparsedData,
      impl: impl
    } = await response.json(),
    data = JSON.parse(unparsedData);
  try {
    if (impl !== retrievalOptions.serverRouteImpl) throw new Error(`Wrong retrieval implementation returned from the proxy: expected ${retrievalOptions.serverRouteImpl}, got ${impl}`);
    if (data === null) throw new Error("Retrieval response body is null");
    logger.info(ctx, `Retrieval request for ${docInfo.uri} processed. Got ${data?.results?.length} snippets back`);
    let snippets = data.results.map(snippetFromRetrievalResult).filter(filterQuerySnippets(docInfo));
    logger.info(ctx, `There were ${snippets.length} after filtering`), retrievalCache?.put(docInfo.uri, retrievalId, retrievalContext, snippets.map(snippet => {
      let {
        restrictedTelemetry: restrictedTelemetry,
        ...rest
      } = snippet;
      return rest;
    })), telemetrizeProcessRetrievalResponse(ctx, retrievalId, data, snippets, telemetryData);
  } catch (error) {
    logger.exception(ctx, error, "Error while processing retrieval response"), telemetrizeProcessRetrievalError(ctx, retrievalId, data, error, telemetryData);
  }
},__name(processRetrievalResponse, "processRetrievalResponse");,var retrievalCache, currentRetrievalOptions;,async function queryRetrievalSnippets(ctx, docInfo, retrievalOptions, telemetryData) {
  if (retrievalCache === void 0 || !equal(currentRetrievalOptions, retrievalOptions)) {
    let matcher = buildSnippetMatcher(retrievalOptions.cache.snippetMatcherName, retrievalOptions.cache.snippetMatcherThreshold);
    currentRetrievalOptions = retrievalOptions, retrievalCache = new RetrievalCache(matcher, retrievalOptions.cache.maxUriCacheSize);
  }
  let requestState = documentRequestStates.get(docInfo.uri) ?? {
    state: "idle"
  };
  if (requestState.state === "pending") return telemetrizeQueryRetrievalDebounce(ctx, requestState.retrievalId, telemetryData), [];
  requestState.state === "response" && (await processRetrievalResponse(ctx, docInfo, requestState.retrievalId, requestState.retrievalContext, requestState.response, requestState.retrievalOptions, telemetryData));
  let retrievalContext = getRetrievalContext(docInfo, retrievalOptions.context);
  if (retrievalContext.lineCount < (retrievalOptions.context.minLineCount ?? 0) || retrievalContext.tokenLength < (retrievalOptions.context.minTokenLength ?? 0)) return telemetrizeTooShortContext(ctx, docInfo, retrievalContext, telemetryData), [];
  let cacheHit = lookupCache(ctx, retrievalCache, docInfo, retrievalContext, telemetryData);
  return cacheHit === void 0 ? (await postRetrievalRequest(ctx, docInfo, retrievalContext, retrievalOptions, telemetryData), []) : (telemetrizeQueryRetrievalFromCache(ctx, cacheHit.retrievalId, cacheHit.snippets, telemetryData), logger.debug(ctx, `Retrieval cache hit for ${docInfo.uri}`), cacheHit.snippets.map(snippet => ({
    provider: z5.SnippetProviderType.Retrieval,
    semantics: z5.SnippetSemantics.Snippet,
    ...snippet
  })));
},__name(queryRetrievalSnippets, "queryRetrievalSnippets");,async function getRetrievalOptions(ctx, featuresFilterArgs, telemetryData) {
  if (!(await ctx.get(Features).retrievalStrategy(featuresFilterArgs, telemetryData))) return;
  let serverRouteImpl = await ctx.get(Features).retrievalServerRoute(featuresFilterArgs, telemetryData),
    repoNwo;
  return featuresFilterArgs.repoNwo && featuresFilterArgs.repoNwo.length > 0 ? repoNwo = featuresFilterArgs.repoNwo : featuresFilterArgs.dogFood && featuresFilterArgs.dogFood.length > 0 ? repoNwo = featuresFilterArgs.dogFood : repoNwo = "", {
    repoNwo: repoNwo,
    serverRouteImpl: serverRouteImpl,
    context: {
      maxLineCount: 30,
      maxTokenLength: 1e3,
      minLineCount: 8,
      minTokenLength: 30
    },
    server: {
      results: 10,
      language: featuresFilterArgs.fileType,
      range_from: -10,
      range_to: 10,
      max_length: 192
    },
    cache: {
      snippetMatcherName: "lineBasedRelative",
      snippetMatcherThreshold: 40,
      maxUriCacheSize: 5
    }
  };
},__name(getRetrievalOptions, "getRetrievalOptions");