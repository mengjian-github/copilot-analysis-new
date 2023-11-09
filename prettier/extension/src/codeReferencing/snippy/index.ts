async function Match(ctx, source, signal) {
  let result = await call(ctx, "Match", {
    method: "POST",
    body: assertShape(MatchRequest, {
      source: source
    })
  }, signal);
  return assertShape(MatchResponse, result);
},__name(Match, "Match");,async function FilesForMatch(ctx, {
  cursor: cursor
}, signal) {
  let result = await call(ctx, "FilesForMatch", {
    method: "POST",
    body: assertShape(FileMatchRequest, {
      cursor: cursor
    })
  }, signal);
  return assertShape(FileMatchResponse, result);
},__name(FilesForMatch, "FilesForMatch");,var pluralize = __name((count, noun, suffix = "s") => `${count} ${noun}${count !== 1 ? suffix : ""}`, "pluralize");,function isError(payload) {
  return x0e.Value.Check(MatchError, payload);
},__name(isError, "isError");,async function snippyRequest(ctx, requestFn) {
  let res = await requestFn();
  if (isError(res)) {
    snippyTelemetry.handleSnippyNetworkError({
      context: ctx,
      origin: String(res.code),
      reason: res.reason,
      message: res.msg
    });
    return;
  }
  return res;
},__name(snippyRequest, "snippyRequest");,function handlePostInsertion(githubLogger) {
  return async event => {
    let {
        ctx: ctx,
        completionText: completionText,
        completionId: completionId,
        start: start,
        fileURI: fileURI,
        insertionOffset: insertionOffset
      } = event,
      insertionDoc = await ctx.get(TextDocumentManager).getTextDocument(fileURI);
    if (!insertionDoc) {
      codeReferenceLogger.debug(ctx, `Expected document matching ${fileURI}, got nothing.`);
      return;
    }
    if (!completionId || !start) {
      snippyTelemetry.handleCompletionMissing({
        context: ctx,
        origin: "onPostInsertion",
        reason: "No completion metadata found."
      });
      return;
    }
    let docText = insertionDoc.getText();
    if (!hasMinLexemeLength(docText)) return;
    let potentialMatchContext = completionText;
    if (!hasMinLexemeLength(completionText)) {
      let textWithoutCompletion = docText.slice(0, insertionOffset),
        minLexemeStartOffset = offsetLastLexemes(textWithoutCompletion, MinTokenLength);
      potentialMatchContext = docText.slice(minLexemeStartOffset, insertionOffset + completionText.length);
    }
    if (!hasMinLexemeLength(potentialMatchContext)) return;
    let matchResponse = await snippyRequest(ctx, () => Match(ctx, potentialMatchContext));
    if (!matchResponse || !matchResponse.snippets.length) {
      codeReferenceLogger.info(ctx, "No match found");
      return;
    }
    codeReferenceLogger.info(ctx, "Match found");
    let {
        snippets: snippets
      } = matchResponse,
      citationPromises = snippets.map(async snippet => {
        let response = await snippyRequest(ctx, () => FilesForMatch(ctx, {
          cursor: snippet.cursor
        }));
        if (!response) return;
        let files = response.file_matches,
          licenseStats = response.license_stats;
        return {
          match: snippet,
          files: files,
          licenseStats: licenseStats
        };
      });
    notify(ctx), Promise.all(citationPromises).then(citations => citations.filter(Boolean)).then(filtered => {
      if (filtered.length) for (let citation of filtered) {
        let licensesSet = new Set(Object.keys(citation.licenseStats?.count ?? {}));
        licensesSet.has("NOASSERTION") && (licensesSet.delete("NOASSERTION"), licensesSet.add("unknown"));
        let allLicenses = Array.from(licensesSet).sort(),
          matchLocation = `[Ln ${start.line}, Col ${start.character}]`,
          shortenedMatchText = `${citation.match.matched_source.slice(0, 100).replace(/[\r\n\t]+|^[ \t]+/gm, " ").trim()}...`,
          workspaceFolders = y3.workspace.workspaceFolders ?? [],
          fileName = fileURI.fsPath;
        for (let folder of workspaceFolders) if (fileURI.fsPath.startsWith(folder.uri.fsPath)) {
          fileName = fileURI.fsPath.replace(folder.uri.fsPath, "");
          break;
        }
        githubLogger.info(`'${fileName}'`, `Similar code with ${pluralize(allLicenses.length, "license type")}`, `[${allLicenses.join(", ")}]`, `${citation.match.github_url.replace(/,\s*$/, "")}&editor=vscode`, matchLocation, shortenedMatchText), copilotOutputLogTelemetry.handleWrite({
          context: ctx
        });
      }
    });
  };
},__name(handlePostInsertion, "handlePostInsertion");,function registerPostInsertionListener(ctx) {
  let logger = GitHubCopilotLogger.create(ctx),
    initialNotificationCommand = y3.commands.registerCommand(OutputPaneShowCommand, () => logger.forceShow()),
    insertionNotificationHandler = handlePostInsertion(logger),
    notifier = ctx.get(PostInsertionNotifier);
  return notifier.on("onPostInsertion", insertionNotificationHandler), new y3.Disposable(() => {
    notifier.off("onPostInsertion", insertionNotificationHandler), initialNotificationCommand.dispose();
  });
},__name(registerPostInsertionListener, "registerPostInsertionListener");,var CodeReference = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.onCopilotToken = (_, tokenEnvelope) => {
      if (!tokenEnvelope.code_quote_enabled) {
        ConnectionState.setDisabled(), this.subscriptions?.dispose(), this.subscriptions = void 0, codeReferenceLogger.debug(this.ctx, "Public code references are disabled.");
        return;
      }
      this.annotationsHeaderContributor.updateAnnotationsEnabled(tokenEnvelope.annotations_enabled), ConnectionState.setConnected(), codeReferenceLogger.info(this.ctx, "Public code references are enabled."), this.subscriptions || (this.subscriptions = E0e.Disposable.from(registerCopilotEnvelopeListener(this.ctx), registerPostInsertionListener(this.ctx), registerCodeRefEngagementTracker(this.ctx)));
    };
    this.tokenNotifier = ctx.get(CopilotTokenNotifier), this.annotationsHeaderContributor = new AnnotationsHeaderContributor();
  }
  static {
    __name(this, "CodeReference");
  }
  dispose() {
    this.subscriptions?.dispose(), this.ctx.get(HeaderContributors).remove(this.annotationsHeaderContributor), this.tokenNotifier.off("onCopilotToken", this.onCopilotToken);
  }
  register() {
    return isRunningInTest(this.ctx) || this.tokenNotifier.on("onCopilotToken", this.onCopilotToken), this.ctx.get(HeaderContributors).add(this.annotationsHeaderContributor), this;
  }
};