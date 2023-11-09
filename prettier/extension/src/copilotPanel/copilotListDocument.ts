var CopilotListDocument = class _CopilotListDocument {
  constructor(ctx, uri, targetDocument, completionContext, solutionCount, token) {
    this.targetDocument = targetDocument;
    this.completionContext = completionContext;
    this.token = token;
    this._solutionCount = 0;
    this.solutionCountTarget = 0;
    this._solutions = [];
    this._wasCancelled = !1;
    this._updateHandlers = new Set();
    this.savedTelemetryData = TelemetryData.createAndMarkAsIssued();
    this.debouncedEventFire = debounce(10, () => this._updateHandlers.forEach(handler => handler(this._uri)));
    this.onDidResultUpdated = listener => (this._updateHandlers.add(listener), {
      dispose: () => {
        this._updateHandlers.delete(listener);
      }
    });
    this.solutionCountTarget = solutionCount, this._ctx = ctx, this._uri = uri, this._showLogprobs = getConfig(ctx, ConfigKey.DebugShowScores), this.startPosition = this.completionContext.insertPosition;
  }
  static {
    __name(this, "CopilotListDocument");
  }
  static {
    this.separator = `
=======`;
  }
  static {
    this.suggestionHeaderPrefix = "Suggestion ";
  }
  async getDocument() {
    return this.targetDocument;
  }
  get targetUri() {
    return this.targetDocument.uri;
  }
  get numberHeaderLines() {
    return this.header().split(`
`).length + 1;
  }
  header() {
    if (this._wasCancelled) return "No synthesized solutions found.";
    {
      let suffix = this._solutionCount - this._solutions.length > 0 ? " (Duplicates hidden)" : "";
      return `Synthesizing ${this._solutionCount}/${this.solutionCountTarget} solutions${suffix}`;
    }
  }
  areSolutionsDuplicates(solutionA, solutionB) {
    let stripA = normalizeCompletionText(solutionA.completionText),
      stripB = normalizeCompletionText(solutionB.completionText);
    return stripA === stripB;
  }
  insertSorted(list, newItem, keyFn) {
    if (!/^\s*$/.test(newItem.completionText)) {
      for (let i = 0; i < list.length; i++) {
        let item = list[i];
        if (this.areSolutionsDuplicates(item, newItem)) if (keyFn(item) < keyFn(newItem)) {
          list.splice(i, 1);
          break;
        } else return;
      }
      for (let i = 0; i < list.length; i++) {
        let item = list[i];
        if (keyFn(item) < keyFn(newItem)) {
          list.splice(i, 0, newItem);
          return;
        }
      }
      list.push(newItem);
    }
  }
  reportCancelled() {
    this._wasCancelled = !0, this.debouncedEventFire();
  }
  getCancellationToken() {
    return this.token;
  }
  insertSolution(unformatted) {
    let newItem = {
        displayLines: this.formatDisplayLines(unformatted.displayText, unformatted.meanProb, unformatted.meanLogProb),
        completionText: unformatted.completionText,
        meanLogProb: unformatted.meanLogProb,
        meanProb: unformatted.meanProb,
        prependToCompletion: unformatted.prependToCompletion,
        requestId: unformatted.requestId,
        choiceIndex: unformatted.choiceIndex
      },
      keyFn = __name(item => item.meanProb, "keyFn");
    this.insertSorted(this._solutions, newItem, keyFn), this._solutionCount++, this.debouncedEventFire();
  }
  formatDisplayLines(displayText, meanProb, meanLogProb) {
    let optionalPrefix = "";
    return this._showLogprobs && (meanLogProb = meanLogProb || 0, optionalPrefix += `
	# mean prob: ${meanProb}`), `${_CopilotListDocument.separator}${optionalPrefix}
${_CopilotListDocument.suggestionHeaderPrefix}

${displayText}`.split(`
`);
  }
  async runQuery() {
    let firstSolution = await this.launchSolutions();
    this.processNextSolution(firstSolution);
  }
  launchSolutions() {
    return launchSolutions(this._ctx, this);
  }
  async processNextSolution(nextSolution) {
    switch (nextSolution.status) {
      case "FinishedNormally":
      case "FinishedWithError":
        return;
      case "Solution":
        this.insertSolution(nextSolution.solution), this.processNextSolution(await nextSolution.next);
        break;
    }
  }
  solutionsReceived() {
    return this._solutionCount;
  }
  solutions() {
    return this._solutions;
  }
  get value() {
    let solutionsWithItemHeaders = this._solutions.flatMap((solution, index) => {
      let displayLines = solution.displayLines,
        sepIndex = displayLines.findIndex(line => line === _CopilotListDocument.separator.trim());
      if (sepIndex === -1) return displayLines;
      let itemHeader = `Suggestion ${index + 1}`,
        hasHeader = displayLines[sepIndex + 1].startsWith(_CopilotListDocument.suggestionHeaderPrefix);
      return displayLines.splice(sepIndex + 1, hasHeader ? 1 : 0, itemHeader), displayLines;
    });
    return [this.header()].concat(solutionsWithItemHeaders).concat("").join(`
`);
  }
};,var CopilotPanel = class {
  constructor(ctx) {
    this._onDidChange = new T0.EventEmitter();
    this._documents = new Map();
    this.panelSolutions = new Map();
    this._previousPositions = [];
    this._ctx = ctx, this._closeSubscription = T0.workspace.onDidCloseTextDocument(doc => {
      doc.isClosed && doc.uri.scheme == CopilotPanelScheme && (this._documents.delete(doc.uri.toString()), this.panelSolutions.delete(doc.uri.toString()));
    }), this._changeSubscription = T0.window.onDidChangeVisibleTextEditors(editors => {
      editors.some(editor => editor.document.uri.scheme == CopilotPanelScheme) || T0.commands.executeCommand("setContext", CopilotPanelVisible, !1);
    }), this._didChangeEditorSelection = T0.window.onDidChangeTextEditorSelection(event => {
      if (event.textEditor.document.uri.scheme == CopilotPanelScheme) {
        let currentPosition = event.textEditor.selection.active;
        this._previousPositions.push(currentPosition), this._previousPositions.length > 2 && this._previousPositions.shift();
      }
    }), this._didChangeVisibleRanges = T0.window.onDidChangeTextEditorVisibleRanges(event => {
      if (event.textEditor.document.uri.scheme == CopilotPanelScheme) {
        let positionBeforeChange = this._previousPositions[0];
        if (!positionBeforeChange) return;
        this.resetCursorPositionToEndOfFirstLine(positionBeforeChange);
      }
    });
  }
  static {
    __name(this, "CopilotPanel");
  }
  dispose() {
    this._closeSubscription.dispose(), this._changeSubscription.dispose(), this._documents.clear(), this.panelSolutions.clear(), this._onDidChange.dispose(), this._didChangeVisibleRanges.dispose(), this._didChangeEditorSelection.dispose();
  }
  get onDidChange() {
    return this._onDidChange.event;
  }
  async provideTextDocumentContent(uri) {
    let document = this._documents.get(uri.toString()),
      model = document?.model;
    if (document && model) return this.getTextDocumentContent(document, uri);
    let cts = new T0.CancellationTokenSource(),
      [targetUri, completionContext] = decodeLocation(this._ctx, uri),
      targetDocument = await T0.workspace.openTextDocument(targetUri);
    return model = new CopilotListDocument(this._ctx, uri, targetDocument, completionContext, getConfig(this._ctx, ConfigKey.ListCount), cts.token), model.onDidResultUpdated(uri => {
      this._onDidChange.fire(uri);
    }), document = {
      model: model,
      cts: cts
    }, this._documents.set(uri.toString(), document), model.runQuery(), this.getTextDocumentContent(document, uri);
  }
  getTextDocumentContent(document, uri) {
    return this.generatePanelSolutionInfo(document, uri), document.model.value;
  }
  generatePanelSolutionInfo(info, uri) {
    let model = info.model,
      lineCount = model.numberHeaderLines,
      insertPosition = model.completionContext.insertPosition,
      separatorLineCount = CopilotListDocument.separator.split(`
`).length - 1,
      panelSolutions = model.solutions().map((solution, index) => {
        let startPos = new T0.Position(lineCount + separatorLineCount - 1, 0),
          endPos = new T0.Position(startPos.line + solution.displayLines.length, 0),
          telemetryData = model.savedTelemetryData.extendedBy({
            choiceIndex: solution.choiceIndex.toString()
          }, {
            compCharLen: solution.completionText.length,
            meanProb: solution.meanProb,
            rank: index
          });
        telemetryData.extendWithRequestId(solution.requestId), telemetryData.markAsDisplayed();
        let postInsertionCallback = __name(async () => {
            let offset = (await T0.workspace.openTextDocument(model.targetUri)).offsetAt(insertPosition);
            info.cts.cancel(), await postInsertionTasks(this._ctx, "solution", solution.completionText, offset, model.targetUri, telemetryData, `${solution.requestId.headerRequestId}-${index}`, insertPosition);
          }, "postInsertionCallback"),
          range = new T0.Range(startPos, endPos);
        return lineCount = endPos.line, {
          targetUri: model.targetUri,
          range: range,
          insertPosition: insertPosition,
          completionText: solution.completionText,
          postInsertionCallback: postInsertionCallback
        };
      });
    return this.panelSolutions.set(uri.toString(), panelSolutions), panelSolutions;
  }
  getCodeLens(info, uri) {
    return (this.panelSolutions.get(uri.toString()) ?? this.generatePanelSolutionInfo(info, uri)).map(solution => new T0.CodeLens(solution.range, {
      title: "Accept Solution",
      tooltip: "Replace code with this solution",
      command: CMDAcceptPanelSolution,
      arguments: [solution.targetUri, solution.insertPosition, solution.completionText, solution.postInsertionCallback]
    }));
  }
  provideCodeLenses(document, token) {
    let doc = this._documents.get(document.uri.toString());
    if (doc) return this.getCodeLens(doc, document.uri);
  }
  resetCursorPositionToEndOfFirstLine(previousPosition) {
    let activeEditor = T0.window.activeTextEditor;
    if (activeEditor === void 0) return;
    let document = activeEditor.document,
      endFirstLinePosition = document.lineAt(0).range.end,
      onSecondLine = !1;
    if (document.lineCount > 1) {
      let endSecondLinePosition = document.lineAt(1).range.end;
      onSecondLine = previousPosition.line == endSecondLinePosition?.line && previousPosition.character == endSecondLinePosition?.character;
    }
    (previousPosition.line == endFirstLinePosition.line && previousPosition.character == endFirstLinePosition.character || onSecondLine) && (activeEditor.selection = new T0.Selection(previousPosition, previousPosition));
  }
};,function completionContextForEditor(ctx, editor, completionContext) {
  return completionContext || completionContextForDocument(ctx, editor.document, editor.selection.active);
},__name(completionContextForEditor, "completionContextForEditor");,function registerPanelSupport(ctx) {
  registerCommandWithTelemetry(ctx, CMDOpenPanel, () => {
    za.commands.executeCommand("editor.action.inlineSuggest.hide"), commandOpenPanel(ctx);
  }), registerCommandWithTelemetry(ctx, CMDAcceptCursorPanelSolution, () => {
    commandAcceptPanelSolution(ctx);
  }), registerCommandWithTelemetry(ctx, CMDNavigatePreviousPanelSolution, () => {
    commandNavigateToPanelSolution(ctx, "previous");
  }), registerCommandWithTelemetry(ctx, CMDNavigateNextPanelSolution, () => {
    commandNavigateToPanelSolution(ctx, "next");
  }), registerCommandWithTelemetry(ctx, CMDOpenPanelForRange, completionContext => {
    commandOpenPanel(ctx, completionContext);
  }), registerCommandWithTelemetry(ctx, CMDAcceptPanelSolution, async (targetUri, insertPosition, solution, postInsertionCallback) => {
    let edit = new za.WorkspaceEdit();
    edit.insert(targetUri, insertPosition, solution), await za.workspace.applyEdit(edit), postInsertionCallback(), await za.commands.executeCommand("workbench.action.closeActiveEditor");
  });
  let contentProvider = new CopilotPanel(ctx);
  ctx.get(Extension).register(za.workspace.registerTextDocumentContentProvider(CopilotPanelScheme, contentProvider), za.languages.registerCodeLensProvider({
    scheme: CopilotPanelScheme
  }, contentProvider)), ctx.set(CopilotPanel, contentProvider);
},__name(registerPanelSupport, "registerPanelSupport");,function commandOpenPanel(ctx, completionContext) {
  let editor = za.window.activeTextEditor;
  if (!editor) return;
  if (!za.workspace.getConfiguration("editor", editor.document.uri).get("codeLens")) {
    za.window.showInformationMessage("GitHub Copilot Panel requires having Code Lens enabled. Please update your settings and then try again.", "Open Settings").then(selection => {
      selection === "Open Settings" && za.commands.executeCommand("workbench.action.openSettings", "editor.codeLens");
    });
    return;
  }
  completionContext = completionContextForEditor(ctx, editor, completionContext);
  let uri = encodeLocation(editor.document.uri, completionContext),
    languageId = editor.document.languageId;
  za.workspace.openTextDocument(uri).then(doc => {
    za.languages.setTextDocumentLanguage(doc, languageId), za.window.showTextDocument(doc, za.ViewColumn.Beside), za.commands.executeCommand("setContext", CopilotPanelVisible, !0);
  });
},__name(commandOpenPanel, "commandOpenPanel");,function shouldExecutePanelCommand(ctx) {
  let editor = za.window.activeTextEditor;
  if (!editor) return !1;
  let document = editor.document;
  if (!document.uri.scheme.startsWith(CopilotPanelScheme)) return !1;
  let solutions = ctx.get(CopilotPanel).panelSolutions.get(document.uri.toString());
  return !(!solutions || solutions?.length === 0);
},__name(shouldExecutePanelCommand, "shouldExecutePanelCommand");,function commandAcceptPanelSolution(ctx) {
  if (!shouldExecutePanelCommand(ctx)) return;
  let editor = za.window.activeTextEditor,
    solutions = ctx.get(CopilotPanel).panelSolutions.get(editor.document.uri.toString()) ?? [],
    cursorPosition = editor.selection.active,
    chosenSolution = solutions.find(solution => solution.range.contains(cursorPosition));
  chosenSolution && za.commands.executeCommand(CMDAcceptPanelSolution, chosenSolution.targetUri, chosenSolution.insertPosition, chosenSolution.completionText, chosenSolution.postInsertionCallback);
},__name(commandAcceptPanelSolution, "commandAcceptPanelSolution");,function commandNavigateToPanelSolution(ctx, navigationType) {
  if (!shouldExecutePanelCommand(ctx)) return;
  let editor = za.window.activeTextEditor,
    solutions = ctx.get(CopilotPanel).panelSolutions.get(editor.document.uri.toString()) ?? [],
    cursorPosition = editor.selection.active,
    chosenSolution = findPrevNextSolution(solutions, cursorPosition, navigationType),
    headerLine = chosenSolution.range.start.line + 1,
    {
      text: text
    } = editor.document.lineAt(headerLine);
  editor.selection = new za.Selection(new za.Position(headerLine, 0), new za.Position(headerLine, text.length)), editor.revealRange(chosenSolution.range);
},__name(commandNavigateToPanelSolution, "commandNavigateToPanelSolution");,function findPrevNextSolution(solutions, cursorPosition, navigationType) {
  let navPrevious = navigationType === "previous",
    currentSolutionIndex = solutions.findIndex(solution => solution.range.contains(cursorPosition)),
    prevNextSolutionIndex = navPrevious ? currentSolutionIndex - 1 : currentSolutionIndex + 1;
  return currentSolutionIndex === -1 && (prevNextSolutionIndex = navPrevious ? -1 : 0), solutions.at(prevNextSolutionIndex) ?? solutions[0];
},__name(findPrevNextSolution, "findPrevNextSolution");