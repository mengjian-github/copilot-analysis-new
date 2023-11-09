var oomCodes = new Set(["ERR_WORKER_OUT_OF_MEMORY", "ENOMEM"]);,function isOomError(error) {
  return oomCodes.has(error.code ?? "") || error.name === "RangeError" && error.message === "WebAssembly.Memory(): could not allocate memory";
},__name(isOomError, "isOomError");,function handleException(ctx, err, origin) {
  if (!isAbortError(err)) {
    if (err instanceof Error) {
      let error = err;
      isOomError(error) ? ctx.get(StatusReporter).setError("Out of memory") : error.code === "EMFILE" || error.code === "ENFILE" ? ctx.get(StatusReporter).setError("Too many open files") : error.code === "CopilotPromptLoadFailure" ? ctx.get(StatusReporter).setError("Corrupted Copilot installation") : `${error.code}`.startsWith("CopilotPromptWorkerExit") ? ctx.get(StatusReporter).setError("Worker unexpectedly exited") : error.syscall === "uv_cwd" && error.code === "ENOENT" && ctx.get(StatusReporter).setError("Current working directory does not exist");
    }
    console.error(origin, err), telemetryException(ctx, err, origin);
  }
},__name(handleException, "handleException");,function exception(ctx, error, origin) {
  error instanceof Error && error.name === "Canceled" || error instanceof Error && error.name === "CodeExpectedError" || handleException(ctx, error, origin);
},__name(exception, "exception");,function registerCommandWithTelemetry(ctx, command, fn) {
  let disposable = Uae.commands.registerCommand(command, async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      exception(ctx, error, command);
    }
  });
  ctx.get(Extension).register(disposable);
},__name(registerCommandWithTelemetry, "registerCommandWithTelemetry");,function cleanupTelemetryReporters(ctx) {
  let container = ctx.get(TelemetryReporters);
  disposeIfNeccessary(ctx, container.getReporter(ctx)), disposeIfNeccessary(ctx, container.getRestrictedReporter(ctx));
},__name(cleanupTelemetryReporters, "cleanupTelemetryReporters");,function disposeIfNeccessary(ctx, reporter) {
  reporter && ctx.get(Extension).register(reporter);
},__name(disposeIfNeccessary, "disposeIfNeccessary");,var postInsertCmdName = "_ghostTextPostInsert",
  VersionMismatchError = class extends Error {
    constructor(oldVersion, newVersion) {
      super(`Document version changed from ${oldVersion} to ${newVersion}`);
      this.oldVersion = oldVersion;
      this.newVersion = newVersion;
      this.name = "VersionMismatchError";
    }
    static {
      __name(this, "VersionMismatchError");
    }
  },
  ExtensionTextDocument = class {
    static {
      __name(this, "ExtensionTextDocument");
    }
    constructor(textDocument) {
      this._textDocument = textDocument, this._originalVersion = textDocument.version;
    }
    get textDocument() {
      if (this._originalVersion !== this._textDocument.version) throw new VersionMismatchError(this._originalVersion, this._textDocument.version);
      return this._textDocument;
    }
    get uri() {
      return this.textDocument.uri;
    }
    get languageId() {
      return this.textDocument.languageId;
    }
    get version() {
      return this.textDocument.version;
    }
    get lineCount() {
      return this.textDocument.lineCount;
    }
    get relativePath() {
      return this.textDocument.uri.path;
    }
    getText(range) {
      return this.textDocument.getText(range);
    }
    positionAt(offset) {
      return this.textDocument.positionAt(offset);
    }
    offsetAt(position) {
      return this.textDocument.offsetAt(position);
    }
    lineAt(position) {
      let lineNumber = typeof position == "number" ? position : position.line;
      return this.textDocument.lineAt(lineNumber);
    }
    getWordRangeAtPosition(position) {
      return this.textDocument.getWordRangeAtPosition(position);
    }
  };,function getInsertionTextFromCompletion(completion) {
  return completion.insertText;
},__name(getInsertionTextFromCompletion, "getInsertionTextFromCompletion");,var ghostTextLogger = new Logger(1, "ghostText");,function ghostTextEnabled(ctx) {
  return getConfig(ctx, ConfigKey.InlineSuggestEnable);
},__name(ghostTextEnabled, "ghostTextEnabled");,function getTextEditorOptions(document) {
  return Ol.window.visibleTextEditors.find(editor => editor.document === document)?.options;
},__name(getTextEditorOptions, "getTextEditorOptions");,var lastPosition,
  lastUri,
  lastShownCompletions = [],
  lastShownCompletionIndex,
  lastPartiallyAcceptedLength;,async function calculateInlineCompletions(ctx, vscodeDocument, position, context, token) {
  let document = new ExtensionTextDocument(vscodeDocument),
    textEditorOptions = getTextEditorOptions(vscodeDocument),
    telemetryData = TelemetryData.createAndMarkAsIssued();
  if (!ghostTextEnabled(ctx)) return {
    type: "abortedBeforeIssued",
    reason: "ghost text is disabled"
  };
  if (ignoreDocument(ctx, document)) return {
    type: "abortedBeforeIssued",
    reason: "document is ignored"
  };
  if (isDocumentTooLarge(document)) return {
    type: "abortedBeforeIssued",
    reason: "document is too large"
  };
  if (ghostTextLogger.debug(ctx, `Ghost text called at [${position.line}, ${position.character}], with triggerKind ${context.triggerKind}`), token.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled before extractPrompt"), {
    type: "abortedBeforeIssued",
    reason: "cancelled before extractPrompt"
  };
  let result = await getGhostText(ctx, document, position, context.triggerKind === Ol.InlineCompletionTriggerKind.Invoke, telemetryData, token);
  if (result.type !== "success") return ghostTextLogger.debug(ctx, "Breaking, no results from getGhostText -- " + result.type + ": " + result.reason), result;
  let [resultArray, resultType] = result.value;
  if (lastPosition && lastUri && !(lastPosition.isEqual(position) && lastUri.toString() === document.uri.toString()) && resultType !== 2) {
    let rejectedCompletions = computeRejectedCompletions();
    rejectedCompletions.length > 0 && postRejectionTasks(ctx, "ghostText", document.offsetAt(lastPosition), lastUri, rejectedCompletions), lastPartiallyAcceptedLength = void 0;
  }
  if (lastPosition = position, lastUri = document.uri, lastShownCompletions = [], token.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled after getGhostText"), {
    type: "canceled",
    reason: "after getGhostText",
    telemetryData: {
      telemetryBlob: result.telemetryBlob
    }
  };
  let inlineCompletions = completionsFromGhostTextResults(ctx, resultArray, resultType, document, position, textEditorOptions, lastShownCompletionIndex).map(completion => {
    let {
        text: text,
        range: range
      } = completion,
      newRange = new Ol.Range(new Ol.Position(range.start.line, range.start.character), new Ol.Position(range.end.line, range.end.character)),
      completionItem = new Ol.InlineCompletionItem(text, newRange);
    return completionItem.index = completion.index, completionItem.telemetry = completion.telemetry, completionItem.displayText = completion.displayText, completionItem.resultType = completion.resultType, completionItem.id = completion.uuid, completionItem.uri = document.uri, completionItem.insertPosition = new Ol.Position(completion.position.line, completion.position.character), completionItem.insertOffset = document.offsetAt(completionItem.insertPosition), completionItem.command = {
      title: "PostInsertTask",
      command: postInsertCmdName,
      arguments: [completionItem]
    }, completionItem;
  });
  return inlineCompletions.length === 0 ? {
    type: "empty",
    reason: "no completions in final result",
    telemetryData: result.telemetryData
  } : {
    ...result,
    value: inlineCompletions
  };
},__name(calculateInlineCompletions, "calculateInlineCompletions");,function computeRejectedCompletions() {
  let rejectedCompletions = [];
  return lastShownCompletions.forEach(c => {
    if (c.displayText && c.telemetry) {
      let completionText, completionTelemetryData;
      lastPartiallyAcceptedLength ? (completionText = c.displayText.substring(lastPartiallyAcceptedLength - 1), completionTelemetryData = c.telemetry.extendedBy({
        compType: "partial"
      }, {
        compCharLen: completionText.length
      })) : (completionText = c.displayText, completionTelemetryData = c.telemetry);
      let rejection = {
        completionText: completionText,
        completionTelemetryData: completionTelemetryData
      };
      rejectedCompletions.push(rejection);
    }
  }), rejectedCompletions;
},__name(computeRejectedCompletions, "computeRejectedCompletions");,async function provideInlineCompletions(ctx, document, position, context, token) {
  let result;
  try {
    result = await calculateInlineCompletions(ctx, document, position, context, token);
  } catch (e) {
    if (!(e instanceof VersionMismatchError)) throw e;
    let data = TelemetryData.createAndMarkAsIssued({
      languageId: String(document.languageId),
      requestedDocumentVersion: String(e.oldVersion),
      actualDocumentVersion: String(e.newVersion)
    });
    telemetry(ctx, "ghostText.docVersionMismatch", data);
    return;
  }
  return await handleGhostTextResultTelemetry(ctx, result);
},__name(provideInlineCompletions, "provideInlineCompletions");,var Provider = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  static {
    __name(this, "Provider");
  }
  async provideInlineCompletionItems(doc, cursorPos, context, token) {
    if (!(context.triggerKind === Ol.InlineCompletionTriggerKind.Automatic && !isAutoCompletionsEnabled(this.ctx))) try {
      let items = await provideInlineCompletions(this.ctx, doc, cursorPos, context, token);
      return items ? {
        items: items
      } : void 0;
    } catch (e) {
      exception(this.ctx, e, "ghostText.provideInlineCompletionItems");
    }
  }
  handleDidShowCompletionItem(completionItem) {
    try {
      handleGhostTextShown(this.ctx, completionItem);
    } catch (e) {
      exception(this.ctx, e, "ghostText.handleGhostTextShown");
    }
  }
  handleDidPartiallyAcceptCompletionItem(completionItem, acceptedLength) {
    try {
      handlePartialGhostTextPostInsert(this.ctx, completionItem, acceptedLength);
    } catch (e) {
      exception(this.ctx, e, "ghostText.handleDidPartiallyAcceptCompletionItem");
    }
  }
};,function isAutoCompletionsEnabled(ctx) {
  return getConfig(ctx, ConfigKey.EnableAutoCompletions);
},__name(isAutoCompletionsEnabled, "isAutoCompletionsEnabled");,async function handlePartialGhostTextPostInsert(ctx, ci, acceptedLength) {
  if (acceptedLength === getInsertionTextFromCompletion(ci).length && resetStateForLastCompletion(), ghostTextLogger.debug(ctx, "Ghost text partial post insert"), ci.telemetry && ci.uri && ci.displayText && ci.insertOffset && ci.range && ci.id) {
    let partialAcceptanceLength = computePartialLength(ci, acceptedLength);
    if (partialAcceptanceLength) {
      let partialTelemetryData = ci.telemetry.extendedBy({
        compType: "partial"
      }, {
        compCharLen: partialAcceptanceLength
      });
      lastPartiallyAcceptedLength = acceptedLength;
      let completionText = ci.displayText.substring(0, partialAcceptanceLength);
      await postInsertionTasks(ctx, "ghostText", completionText, ci.insertOffset, ci.uri, partialTelemetryData, ci.id, ci.range.start);
    }
  }
},__name(handlePartialGhostTextPostInsert, "handlePartialGhostTextPostInsert");,function resetStateForLastCompletion() {
  lastShownCompletions = [], lastUri = void 0, lastPosition = void 0;
},__name(resetStateForLastCompletion, "resetStateForLastCompletion");,function resetPartialAcceptanceState() {
  lastPartiallyAcceptedLength = void 0;
},__name(resetPartialAcceptanceState, "resetPartialAcceptanceState");,function computePartialLength(ci, acceptedLength) {
  if (!ci.range || !ci.range.start || !ci.range.end) return;
  let insertText = getInsertionTextFromCompletion(ci);
  return ci.displayText !== insertText && insertText.trim() === ci.displayText ? acceptedLength : acceptedLength - ci.range.end.character + ci.range.start.character;
},__name(computePartialLength, "computePartialLength");,function handleGhostTextShown(ctx, ci) {
  if (lastShownCompletionIndex = ci.index, !lastShownCompletions.find(c => c.index === ci.index) && (`${ci.uri}` == `${lastUri}` && lastPosition?.isEqual(ci.insertPosition) && lastShownCompletions.push(ci), ci.telemetry && ci.displayText)) {
    let fromCache = ci.resultType !== 0;
    ghostTextLogger.debug(ctx, `[${ci.telemetry.properties.headerRequestId}] shown choiceIndex: ${ci.telemetry.properties.choiceIndex}, fromCache ${fromCache}`), ci.telemetry.measurements.compCharLen = ci.displayText.length, telemetryShown(ctx, "ghostText", ci.telemetry, fromCache);
  }
},__name(handleGhostTextShown, "handleGhostTextShown");,async function handleGhostTextPostInsert(ctx, e) {
  if (resetStateForLastCompletion(), ghostTextLogger.debug(ctx, "Ghost text post insert"), e.telemetry && e.uri && e.displayText && e.insertOffset !== void 0 && e.range && e.id) {
    let completionTelemetryData = e.telemetry.extendedBy({
      compType: lastPartiallyAcceptedLength ? "partial" : "full"
    }, {
      compCharLen: e.displayText.length
    });
    resetPartialAcceptanceState(), await postInsertionTasks(ctx, "ghostText", e.displayText, e.insertOffset, e.uri, completionTelemetryData, e.id, e.range.start);
  }
},__name(handleGhostTextPostInsert, "handleGhostTextPostInsert");,function registerGhostText(ctx) {
  let provider = new Provider(ctx),
    providerHandler = Ol.languages.registerInlineCompletionItemProvider({
      pattern: "**"
    }, provider),
    postCmdHandler = Ol.commands.registerCommand(postInsertCmdName, async e => handleGhostTextPostInsert(ctx, e));
  ctx.get(Extension).register(providerHandler, postCmdHandler);
},__name(registerGhostText, "registerGhostText");