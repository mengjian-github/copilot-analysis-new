var import_vscode_uri = Ns(B1());,var CopilotPanelScheme = "copilot";,function completionTypeToString(type) {
  switch (type) {
    case 2:
      return "open copilot";
    default:
      return "unknown";
  }
},__name(completionTypeToString, "completionTypeToString");,var CompletionContext = class _CompletionContext {
  constructor(ctx, insertPosition, completionType) {
    this.prependToCompletion = "";
    this.appendToCompletion = "";
    this.indentation = null;
    this.completionType = 2;
    this.insertPosition = ctx.get(LocationFactory).position(insertPosition.line, insertPosition.character), this.completionType = completionType;
  }
  static {
    __name(this, "CompletionContext");
  }
  static fromJSONParse(ctx, contextObj) {
    let insertPosition = ctx.get(LocationFactory).position(contextObj.insertPosition.line, contextObj.insertPosition.character),
      context = new _CompletionContext(ctx, insertPosition, contextObj.completionType);
    return context.prependToCompletion = contextObj.prependToCompletion, context.appendToCompletion = contextObj.appendToCompletion, context.indentation = contextObj.indentation, context;
  }
};,function completionContextForDocument(ctx, document, insertPosition) {
  let returnPosition = insertPosition,
    line = document.lineAt(insertPosition.line);
  return line.isEmptyOrWhitespace || (returnPosition = line.range.end), new CompletionContext(ctx, returnPosition, 2);
},__name(completionContextForDocument, "completionContextForDocument");,var seq = 0;,function encodeLocation(targetUri, completionContext) {
  let panelFileName = "GitHub Copilot Suggestions",
    target = targetUri.toString().split("#"),
    remain = target.length > 1 ? target[1] : "",
    query = JSON.stringify([target[0], completionContext, remain]),
    targetFileName = ey.Utils.basename(targetUri);
  return targetFileName.length > 0 && (panelFileName += ` for ${targetFileName}`), ey.URI.from({
    scheme: CopilotPanelScheme,
    path: panelFileName,
    query: query,
    fragment: `${seq++}`
  });
},__name(encodeLocation, "encodeLocation");,function decodeLocation(ctx, uri) {
  let [target, completionContextPrimer, remain] = JSON.parse(uri.query),
    targetUri = ey.URI.parse(remain.length > 0 ? target + "#" + remain : target),
    completionContext = CompletionContext.fromJSONParse(ctx, completionContextPrimer);
  return [targetUri, completionContext];
},__name(decodeLocation, "decodeLocation");