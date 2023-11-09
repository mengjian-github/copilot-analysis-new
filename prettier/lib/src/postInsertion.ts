var postInsertionLogger = new Logger(1, "post-insertion"),
  captureTimeouts = [{
    seconds: 15,
    captureCode: !1,
    captureRejection: !1
  }, {
    seconds: 30,
    captureCode: !0,
    captureRejection: !0
  }, {
    seconds: 120,
    captureCode: !1,
    captureRejection: !1
  }, {
    seconds: 300,
    captureCode: !1,
    captureRejection: !1
  }, {
    seconds: 600,
    captureCode: !1,
    captureRejection: !1
  }],
  stillInCodeNearMargin = 50,
  stillInCodeFarMargin = 1500,
  stillInCodeFraction = .5,
  captureCodeMargin = 500,
  postInsertConfiguration = {
    triggerPostInsertionSynchroneously: !1,
    captureCode: !1,
    captureRejection: !1
  };,async function captureCode(ctx, fileURI, offset, suffixOffset) {
  let document = await ctx.get(TextDocumentManager).getTextDocument(fileURI);
  if (!document) return postInsertionLogger.info(ctx, `Could not get document for ${fileURI.fsPath}. Maybe it was closed by the editor.`), {
    prompt: {
      prefix: "",
      suffix: "",
      isFimEnabled: !1,
      promptElementRanges: []
    },
    capturedCode: "",
    terminationOffset: 0
  };
  let documentText = document.getText(),
    documentTextBefore = documentText.substring(0, offset),
    position = document.positionAt(offset),
    hypotheticalPromptResponse = await extractPrompt(ctx, document, position),
    hypotheticalPrompt = hypotheticalPromptResponse.type === "prompt" ? hypotheticalPromptResponse.prompt : {
      prefix: documentTextBefore,
      suffix: "",
      isFimEnabled: !1,
      promptElementRanges: []
    };
  if (hypotheticalPrompt.isFimEnabled && suffixOffset !== void 0) {
    let capturedCode = documentText.substring(offset, suffixOffset);
    return hypotheticalPrompt.suffix = documentText.substring(suffixOffset), {
      prompt: hypotheticalPrompt,
      capturedCode: capturedCode,
      terminationOffset: 0
    };
  } else {
    let hypotheticalResponse = documentText.substring(offset),
      contextIndent = contextIndentationFromText(documentTextBefore, offset, document.languageId),
      terminationResult = await indentationBlockFinished(contextIndent, void 0)(hypotheticalResponse),
      maxOffset = Math.min(documentText.length, offset + (terminationResult ? terminationResult * 2 : captureCodeMargin)),
      capturedCode = documentText.substring(offset, maxOffset);
    return {
      prompt: hypotheticalPrompt,
      capturedCode: capturedCode,
      terminationOffset: terminationResult ?? -1
    };
  }
},__name(captureCode, "captureCode");,function postRejectionTasks(ctx, insertionCategory, insertionOffset, fileURI, completions) {
  completions.forEach(({
    completionText: completionText,
    completionTelemetryData: completionTelemetryData
  }) => {
    postInsertionLogger.debug(ctx, `${insertionCategory}.rejected choiceIndex: ${completionTelemetryData.properties.choiceIndex}`), telemetryRejected(ctx, insertionCategory, completionTelemetryData);
  });
  let positionTracker = new ChangeTracker(ctx, fileURI, insertionOffset - 1),
    suffixTracker = new ChangeTracker(ctx, fileURI, insertionOffset);
  captureTimeouts.filter(t => t.captureRejection).map(t => {
    positionTracker.push(async () => {
      postInsertionLogger.debug(ctx, `Original offset: ${insertionOffset}, Tracked offset: ${positionTracker.offset}`);
      let {
          completionTelemetryData: completionTelemetryData
        } = completions[0],
        {
          prompt: prompt,
          capturedCode: capturedCode,
          terminationOffset: terminationOffset
        } = await captureCode(ctx, fileURI, positionTracker.offset + 1, suffixTracker.offset),
        promptTelemetry;
      prompt.isFimEnabled ? promptTelemetry = {
        hypotheticalPromptPrefixJson: JSON.stringify(prompt.prefix),
        hypotheticalPromptSuffixJson: JSON.stringify(prompt.suffix)
      } : promptTelemetry = {
        hypotheticalPromptJson: JSON.stringify(prompt.prefix)
      };
      let customTelemetryData = completionTelemetryData.extendedBy({
        ...promptTelemetry,
        capturedCodeJson: JSON.stringify(capturedCode)
      }, {
        timeout: t.seconds,
        insertionOffset: insertionOffset,
        trackedOffset: positionTracker.offset,
        terminationOffsetInCapturedCode: terminationOffset
      });
      postInsertionLogger.debug(ctx, `${insertionCategory}.capturedAfterRejected choiceIndex: ${completionTelemetryData.properties.choiceIndex}`, customTelemetryData), telemetry(ctx, insertionCategory + ".capturedAfterRejected", customTelemetryData, 1);
    }, t.seconds * 1e3);
  });
},__name(postRejectionTasks, "postRejectionTasks");,async function postInsertionTasks(ctx, insertionCategory, completionText, insertionOffset, fileURI, telemetryData, completionId, start) {
  postInsertionLogger.debug(ctx, `${insertionCategory}.accepted choiceIndex: ${telemetryData.properties.choiceIndex}`), telemetryAccepted(ctx, insertionCategory, telemetryData);
  let trimmedCompletion = completionText.trim(),
    tracker = new ChangeTracker(ctx, fileURI, insertionOffset),
    suffixTracker = new ChangeTracker(ctx, fileURI, insertionOffset + completionText.length),
    stillInCodeCheck = __name(async timeout => {
      await checkStillInCode(ctx, insertionCategory, trimmedCompletion, insertionOffset, fileURI, timeout, telemetryData, tracker, suffixTracker);
    }, "stillInCodeCheck");
  postInsertConfiguration.triggerPostInsertionSynchroneously && isRunningInTest(ctx) ? await stillInCodeCheck({
    seconds: 0,
    captureCode: postInsertConfiguration.captureCode,
    captureRejection: postInsertConfiguration.captureRejection
  }) : captureTimeouts.map(timeout => tracker.push(() => stillInCodeCheck(timeout), timeout.seconds * 1e3)), ctx.get(PostInsertionNotifier).emit("onPostInsertion", {
    ctx: ctx,
    insertionCategory: insertionCategory,
    insertionOffset: insertionOffset,
    fileURI: fileURI,
    completionText: completionText,
    telemetryData: telemetryData,
    completionId: completionId,
    start: start
  });
},__name(postInsertionTasks, "postInsertionTasks");,function find(documentText, completion, margin, offset) {
  let window = documentText.substring(Math.max(0, offset - margin), Math.min(documentText.length, offset + completion.length + margin)),
    lexAlignment = lexEditDistance(window, completion),
    fraction = lexAlignment.lexDistance / lexAlignment.needleLexLength,
    {
      distance: charEditDistance
    } = editDistance(window.substring(lexAlignment.startOffset, lexAlignment.endOffset), completion);
  return {
    relativeLexEditDistance: fraction,
    charEditDistance: charEditDistance,
    completionLexLength: lexAlignment.needleLexLength,
    foundOffset: lexAlignment.startOffset + Math.max(0, offset - margin),
    lexEditDistance: lexAlignment.lexDistance,
    stillInCodeHeuristic: fraction <= stillInCodeFraction ? 1 : 0
  };
},__name(find, "find");,async function checkStillInCode(ctx, insertionCategory, completion, insertionOffset, fileURI, timeout, telemetryData, tracker, suffixTracker) {
  let document = await ctx.get(TextDocumentManager).getTextDocument(fileURI);
  if (document) {
    let documentText = document.getText(),
      finding = find(documentText, completion, stillInCodeNearMargin, tracker.offset);
    finding.stillInCodeHeuristic || (finding = find(documentText, completion, stillInCodeFarMargin, tracker.offset)), postInsertionLogger.debug(ctx, `stillInCode: ${finding.stillInCodeHeuristic ? "Found" : "Not found"}! Completion '${completion}' in file ${fileURI.fsPath}. lexEditDistance fraction was ${finding.relativeLexEditDistance}. Char edit distance was ${finding.charEditDistance}. Inserted at ${insertionOffset}, tracked at ${tracker.offset}, found at ${finding.foundOffset}. choiceIndex: ${telemetryData.properties.choiceIndex}`);
    let customTelemetryData = telemetryData.extendedBy({}, {
      timeout: timeout.seconds,
      insertionOffset: insertionOffset,
      trackedOffset: tracker.offset
    }).extendedBy({}, finding);
    if (telemetry(ctx, insertionCategory + ".stillInCode", customTelemetryData), timeout.captureCode) {
      let {
          prompt: prompt,
          capturedCode: capturedCode,
          terminationOffset: terminationOffset
        } = await captureCode(ctx, fileURI, tracker.offset, suffixTracker.offset),
        promptTelemetry;
      prompt.isFimEnabled ? promptTelemetry = {
        hypotheticalPromptPrefixJson: JSON.stringify(prompt.prefix),
        hypotheticalPromptSuffixJson: JSON.stringify(prompt.suffix)
      } : promptTelemetry = {
        hypotheticalPromptJson: JSON.stringify(prompt.prefix)
      };
      let afterAcceptedTelemetry = telemetryData.extendedBy({
        ...promptTelemetry,
        capturedCodeJson: JSON.stringify(capturedCode)
      }, {
        timeout: timeout.seconds,
        insertionOffset: insertionOffset,
        trackedOffset: tracker.offset,
        terminationOffsetInCapturedCode: terminationOffset
      });
      postInsertionLogger.debug(ctx, `${insertionCategory}.capturedAfterAccepted choiceIndex: ${telemetryData.properties.choiceIndex}`, customTelemetryData), telemetry(ctx, insertionCategory + ".capturedAfterAccepted", afterAcceptedTelemetry, 1);
    }
  }
},__name(checkStillInCode, "checkStillInCode");