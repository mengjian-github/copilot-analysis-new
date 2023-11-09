function isEmptyBlockStart(doc, position) {
  return promptLibProxy.isEmptyBlockStart(doc.languageId, doc.getText(), doc.offsetAt(position));
},__name(isEmptyBlockStart, "isEmptyBlockStart");,function parsingBlockFinished(ctx, doc, position) {
  let locationFactory = ctx.get(LocationFactory),
    prefix = doc.getText(locationFactory.range(locationFactory.position(0, 0), position)),
    offset = doc.offsetAt(position),
    languageId = doc.languageId;
  return completion => promptLibProxy.isBlockBodyFinished(languageId, prefix, completion, offset);
},__name(parsingBlockFinished, "parsingBlockFinished");,async function getNodeStart(ctx, doc, position, completion) {
  let locationFactory = ctx.get(LocationFactory),
    text = doc.getText(locationFactory.range(locationFactory.position(0, 0), position)) + completion,
    offset = await promptLibProxy.getNodeStart(doc.languageId, text, doc.offsetAt(position));
  if (offset) return doc.positionAt(offset);
},__name(getNodeStart, "getNodeStart");,var continuations = ["\\{", "\\}", "\\[", "\\]", "\\(", "\\)"].concat(["then", "else", "elseif", "elif", "catch", "finally", "fi", "done", "end", "loop", "until", "where", "when"].map(s => s + "\\b")),
  continuationRegex = new RegExp(`^(${continuations.join("|")})`);,function isContinuationLine(line) {
  return continuationRegex.test(line.trimLeft().toLowerCase());
},__name(isContinuationLine, "isContinuationLine");,function indentationOfLine(line) {
  let match = /^(\s*)([^]*)$/.exec(line);
  if (match && match[2] && match[2].length > 0) return match[1].length;
},__name(indentationOfLine, "indentationOfLine");,function contextIndentation(doc, position) {
  let source = doc.getText(),
    offset = doc.offsetAt(position);
  return contextIndentationFromText(source, offset, doc.languageId);
},__name(contextIndentation, "contextIndentation");,function contextIndentationFromText(source, offset, languageId) {
  let prevLines = source.slice(0, offset).split(`
`),
    nextLines = source.slice(offset).split(`
`);
  function seekNonBlank(lines, start, direction) {
    let i = start,
      ind,
      indIdx;
    for (; ind === void 0 && i >= 0 && i < lines.length;) ind = indentationOfLine(lines[i]), indIdx = i, i += direction;
    if (languageId === "python" && direction === -1) {
      i++;
      let trimmedLine = lines[i].trim();
      if (trimmedLine.endsWith('"""')) {
        if (!(trimmedLine.startsWith('"""') && trimmedLine !== '"""')) for (i--; i >= 0 && !lines[i].trim().startsWith('"""');) i--;
        if (i >= 0) for (ind = void 0, i--; ind === void 0 && i >= 0;) ind = indentationOfLine(lines[i]), indIdx = i, i--;
      }
    }
    return [ind, indIdx];
  }
  __name(seekNonBlank, "seekNonBlank");
  let [current, currentIdx] = seekNonBlank(prevLines, prevLines.length - 1, -1),
    prev = (() => {
      if (!(current === void 0 || currentIdx === void 0)) for (let i = currentIdx - 1; i >= 0; i--) {
        let ind = indentationOfLine(prevLines[i]);
        if (ind !== void 0 && ind < current) return ind;
      }
    })(),
    [next] = seekNonBlank(nextLines, 1, 1);
  return {
    prev: prev,
    current: current ?? 0,
    next: next
  };
},__name(contextIndentationFromText, "contextIndentationFromText");,var OfferNextLineCompletion = !1;,function completionCutOrContinue(completion, contextIndentation, previewText) {
  let completionLines = completion.split(`
`),
    isContinuation = previewText !== void 0,
    lastLineOfPreview = previewText?.split(`
`).pop(),
    startLine = 0;
  if (isContinuation && lastLineOfPreview?.trim() != "" && completionLines[0].trim() !== "" && startLine++, !isContinuation && OfferNextLineCompletion && completionLines[0].trim() === "" && startLine++, isContinuation || startLine++, completionLines.length === startLine) return "continue";
  let breakIndentation = Math.max(contextIndentation.current, contextIndentation.next ?? 0);
  for (let i = startLine; i < completionLines.length; i++) {
    let line = completionLines[i];
    i == 0 && lastLineOfPreview !== void 0 && (line = lastLineOfPreview + line);
    let ind = indentationOfLine(line);
    if (ind !== void 0 && (ind < breakIndentation || ind === breakIndentation && !isContinuationLine(line))) return completionLines.slice(0, i).join(`
`).length;
  }
  return "continue";
},__name(completionCutOrContinue, "completionCutOrContinue");,function indentationBlockFinished(contextIndentation, previewText) {
  return async completion => {
    let res = completionCutOrContinue(completion, contextIndentation, previewText);
    return res === "continue" ? void 0 : res;
  };
},__name(indentationBlockFinished, "indentationBlockFinished");