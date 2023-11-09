function maybeSnipCompletion(ctx, doc, position, completion, isMiddleOfTheLineSuggestion) {
  let blockCloseToken = "}";
  try {
    blockCloseToken = promptLibProxy.getBlockCloseToken(doc.languageId) ?? "}";
  } catch {}
  if (getHiddenConfig(ctx, ConfigKey.DebugTruncationKiwi, {
    default: !0
  })) return maybeSnipCompletionImpl({
    getLineText: lineIdx => doc.lineAt(lineIdx).text,
    getLineCount: () => doc.lineCount
  }, position, completion, blockCloseToken);
  {
    if (completion == "") return completion;
    let nextLineStart = completion.length;
    do {
      let thisLineStart = completion.lastIndexOf(`
`, nextLineStart - 2) + 1,
        line = completion.substring(thisLineStart, nextLineStart);
      if (line.trim() === blockCloseToken) {
        for (let i = position.line; i < doc.lineCount; i++) {
          let lineText = doc.lineAt(i).text;
          if (i === position.line && (lineText = lineText.substr(position.character)), lineText.startsWith(line.trimRight())) return completion.substring(0, Math.max(0, isMiddleOfTheLineSuggestion ? thisLineStart : thisLineStart - 1));
          if (lineText.trim() !== "") break;
        }
        break;
      }
      if (nextLineStart === thisLineStart) {
        if (shouldFailForDebugPurposes(ctx)) throw Error(`Aborting: maybeSnipCompletion would have looped on completion: ${completion}`);
        break;
      }
      nextLineStart = thisLineStart;
    } while (nextLineStart > 1);
    return completion;
  }
},__name(maybeSnipCompletion, "maybeSnipCompletion");,function maybeSnipCompletionImpl(doc, position, completion, blockCloseToken) {
  let completionLinesInfo = splitByNewLine(completion),
    completionLines = completionLinesInfo.lines;
  if (completionLines.length === 1) return completion;
  for (let completionLineStartIdx = 1; completionLineStartIdx < completionLines.length; completionLineStartIdx++) {
    let matched = !0,
      docSkippedEmptyLineCount = 0,
      completionSkippedEmptyLineCount = 0;
    for (let offset = 0; offset + completionLineStartIdx + completionSkippedEmptyLineCount < completionLines.length; offset++) {
      let docLine;
      do {
        let docLineIdx = position.line + 1 + offset + docSkippedEmptyLineCount;
        if (docLine = docLineIdx >= doc.getLineCount() ? void 0 : doc.getLineText(docLineIdx), docLine !== void 0 && docLine.trim() === "") docSkippedEmptyLineCount++;else break;
      } while (!0);
      let completionLineIdx, completionLine;
      do if (completionLineIdx = completionLineStartIdx + offset + completionSkippedEmptyLineCount, completionLine = completionLineIdx >= completionLines.length ? void 0 : completionLines[completionLineIdx], completionLine !== void 0 && completionLine.trim() === "") completionSkippedEmptyLineCount++;else break; while (!0);
      let isLastCompletionLine = completionLineIdx === completionLines.length - 1;
      if (!completionLine || !(docLine && completionLine.trim() === blockCloseToken && (isLastCompletionLine ? docLine.startsWith(completionLine) : docLine === completionLine))) {
        matched = !1;
        break;
      }
    }
    if (matched) return completionLines.slice(0, completionLineStartIdx).join(completionLinesInfo.newLineCharacter);
  }
  return completion;
},__name(maybeSnipCompletionImpl, "maybeSnipCompletionImpl");,function splitByNewLine(text) {
  let newLineCharacter = text.includes(`\r
`) ? `\r
` : `
`;
  return {
    lines: text.split(newLineCharacter),
    newLineCharacter: newLineCharacter
  };
},__name(splitByNewLine, "splitByNewLine");,function matchesNextLine(document, position, text) {
  let nextLine = "",
    lineNo = position.line + 1;
  for (; nextLine === "" && lineNo < document.lineCount;) {
    if (nextLine = document.lineAt(lineNo).text.trim(), nextLine === text.trim()) return !0;
    lineNo++;
  }
  return !1;
},__name(matchesNextLine, "matchesNextLine");,async function postProcessChoice(ctx, insertionCategory, document, position, choice, isMiddleOfTheLineSuggestion, logger, prompt, actualSuffix) {
  if (isRepetitive(choice.tokens)) {
    let telemetryData = TelemetryData.createAndMarkAsIssued();
    telemetryData.extendWithRequestId(choice.requestId), telemetry(ctx, "repetition.detected", telemetryData, 1), logger.info(ctx, "Filtered out repetitive solution");
    return;
  }
  let postProcessedChoice = {
    ...choice
  };
  if (matchesNextLine(document, position, postProcessedChoice.completionText)) {
    let baseTelemetryData = TelemetryData.createAndMarkAsIssued();
    baseTelemetryData.extendWithRequestId(choice.requestId), telemetry(ctx, "completion.alreadyInDocument", baseTelemetryData), telemetry(ctx, "completion.alreadyInDocument", baseTelemetryData.extendedBy({
      completionTextJson: JSON.stringify(postProcessedChoice.completionText)
    }), 1), logger.info(ctx, "Filtered out solution matching next line");
    return;
  }
  return getHiddenConfig(ctx, ConfigKey.DebugTruncationKiwi, {
    default: !0
  }) && (postProcessedChoice.completionText = removeDifferenceOfCachedVsActualPromptSuffix(postProcessedChoice.completionText, actualSuffix, prompt)), postProcessedChoice.completionText = maybeSnipCompletion(ctx, document, position, postProcessedChoice.completionText, isMiddleOfTheLineSuggestion), postProcessedChoice.completionText ? postProcessedChoice : void 0;
},__name(postProcessChoice, "postProcessChoice");,function removeDifferenceOfCachedVsActualPromptSuffix(completionText, actualSuffix, prompt) {
  actualSuffix = actualSuffix.trim();
  let idxOfCachedSuffixInActualSuffix = actualSuffix.indexOf(prompt.suffix);
  if (idxOfCachedSuffixInActualSuffix <= 0) return completionText;
  let missing = actualSuffix.substring(0, idxOfCachedSuffixInActualSuffix).trim();
  return removeSuffix(completionText, missing);
},__name(removeDifferenceOfCachedVsActualPromptSuffix, "removeDifferenceOfCachedVsActualPromptSuffix");,function removeSuffix(str, suffix) {
  return str.endsWith(suffix) ? str.substring(0, str.length - suffix.length) : str;
},__name(removeSuffix, "removeSuffix");,function checkSuffix(document, position, choice) {
  let restOfLine = document.lineAt(position.line).text.substring(position.character);
  if (restOfLine.length > 0) {
    if (choice.completionText.indexOf(restOfLine) !== -1) return !0;
    {
      let lastIndex = 0;
      for (let c of restOfLine) {
        let idx = choice.completionText.indexOf(c, lastIndex + 1);
        if (idx > lastIndex) lastIndex = idx;else {
          lastIndex = -1;
          break;
        }
      }
      return lastIndex !== -1;
    }
  }
  return !1;
},__name(checkSuffix, "checkSuffix");