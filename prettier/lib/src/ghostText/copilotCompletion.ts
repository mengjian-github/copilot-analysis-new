function completionsFromGhostTextResults(ctx, completionResults, resultType, document, position, textEditorOptions, lastShownCompletionIndex) {
  let locationFactory = ctx.get(LocationFactory),
    currentLine = document.lineAt(position),
    completions = completionResults.map(result => {
      let range,
        text = "";
      if (textEditorOptions && (result.completion = normalizeIndentCharacter(textEditorOptions, result.completion, currentLine.isEmptyOrWhitespace)), result.completion.displayNeedsWsOffset && currentLine.isEmptyOrWhitespace) range = locationFactory.range(locationFactory.position(position.line, 0), position), text = result.completion.completionText;else if (currentLine.isEmptyOrWhitespace && result.completion.completionText.startsWith(currentLine.text)) range = locationFactory.range(locationFactory.position(position.line, 0), position), text = result.completion.completionText;else {
        let wordRange = document.getWordRangeAtPosition(position);
        if (result.isMiddleOfTheLine) {
          let line = document.lineAt(position),
            rangeFromStart = locationFactory.range(locationFactory.position(position.line, 0), position),
            textBefore = document.getText(rangeFromStart);
          range = result.coversSuffix ? line.range : rangeFromStart, text = textBefore + result.completion.displayText;
        } else if (wordRange) {
          let word = document.getText(wordRange);
          range = locationFactory.range(wordRange.start, position), text = word + result.completion.completionText;
        } else {
          let rangeFromStart = locationFactory.range(locationFactory.position(position.line, 0), position),
            textBefore = document.getText(rangeFromStart);
          range = rangeFromStart, text = textBefore + result.completion.displayText;
        }
      }
      return {
        uuid: v4_default(),
        text: text,
        range: range,
        file: document.uri,
        index: result.completion.completionIndex,
        telemetry: result.telemetry,
        displayText: result.completion.displayText,
        position: position,
        offset: document.offsetAt(position),
        resultType: resultType
      };
    });
  if (resultType === 2 && lastShownCompletionIndex !== void 0) {
    let lastShownCompletion = completions.find(predicate => predicate.index === lastShownCompletionIndex);
    if (lastShownCompletion) {
      let restCompletions = completions.filter(predicate => predicate.index !== lastShownCompletionIndex);
      completions = [lastShownCompletion, ...restCompletions];
    }
  }
  return completions;
},__name(completionsFromGhostTextResults, "completionsFromGhostTextResults");