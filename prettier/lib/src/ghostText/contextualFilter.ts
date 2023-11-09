var ContextualFilterManager = class {
  static {
    __name(this, "ContextualFilterManager");
  }
  constructor() {
    this.previousLabel = 0, this.previousLabelTimestamp = Date.now() - 3600, this.probabilityAccept = 0;
  }
};,function getLastLineLength(source) {
  let lines = source.split(`
`);
  return lines[lines.length - 1].length;
},__name(getLastLineLength, "getLastLineLength");,function contextualFilterScore(ctx, telemetryData, prompt, contextualFilterEnableTree) {
  let cfManager = ctx.get(ContextualFilterManager),
    yt_1 = cfManager.previousLabel,
    acw = 0;
  "afterCursorWhitespace" in telemetryData.properties && telemetryData.properties.afterCursorWhitespace === "true" && (acw = 1);
  let dt_1 = (Date.now() - cfManager.previousLabelTimestamp) / 1e3,
    ln_dt_1 = Math.log(1 + dt_1),
    ln_promptLastLineLength = 0,
    promptLastCharIndex = 0,
    promptPrefix = prompt.prefix;
  if (promptPrefix) {
    ln_promptLastLineLength = Math.log(1 + getLastLineLength(promptPrefix));
    let promptLastChar = promptPrefix.slice(-1);
    contextualFilterCharacterMap[promptLastChar] !== void 0 && (promptLastCharIndex = contextualFilterCharacterMap[promptLastChar]);
  }
  let ln_promptLastLineRstripLength = 0,
    promptLastRstripCharIndex = 0,
    promptPrefixRstrip = promptPrefix.trimEnd();
  if (promptPrefixRstrip) {
    ln_promptLastLineRstripLength = Math.log(1 + getLastLineLength(promptPrefixRstrip));
    let promptLastRstripChar = promptPrefixRstrip.slice(-1);
    contextualFilterCharacterMap[promptLastRstripChar] !== void 0 && (promptLastRstripCharIndex = contextualFilterCharacterMap[promptLastRstripChar]);
  }
  let ln_documentLength = 0;
  if ("documentLength" in telemetryData.measurements) {
    let documentLength = telemetryData.measurements.documentLength;
    ln_documentLength = Math.log(1 + documentLength);
  }
  let ln_promptEndPos = 0;
  if ("promptEndPos" in telemetryData.measurements) {
    let promptEndPos = telemetryData.measurements.promptEndPos;
    ln_promptEndPos = Math.log(1 + promptEndPos);
  }
  let relativeEndPos = 0;
  if ("promptEndPos" in telemetryData.measurements && "documentLength" in telemetryData.measurements) {
    let documentLength = telemetryData.measurements.documentLength;
    relativeEndPos = (telemetryData.measurements.promptEndPos + .5) / (1 + documentLength);
  }
  let languageIndex = 0;
  contextualFilterLanguageMap[telemetryData.properties.languageId] !== void 0 && (languageIndex = contextualFilterLanguageMap[telemetryData.properties.languageId]);
  let probabilityAccept = 0;
  if (contextualFilterEnableTree) {
    let features = new Array(221).fill(0);
    features[0] = yt_1, features[1] = acw, features[2] = ln_dt_1, features[3] = ln_promptLastLineLength, features[4] = ln_promptLastLineRstripLength, features[5] = ln_documentLength, features[6] = ln_promptEndPos, features[7] = relativeEndPos, features[8 + languageIndex] = 1, features[29 + promptLastCharIndex] = 1, features[125 + promptLastRstripCharIndex] = 1, probabilityAccept = treeScore(features)[1];
  } else {
    let sum = contextualFilterIntercept;
    sum += contextualFilterWeights[0] * yt_1, sum += contextualFilterWeights[1] * acw, sum += contextualFilterWeights[2] * ln_dt_1, sum += contextualFilterWeights[3] * ln_promptLastLineLength, sum += contextualFilterWeights[4] * ln_promptLastLineRstripLength, sum += contextualFilterWeights[5] * ln_documentLength, sum += contextualFilterWeights[6] * ln_promptEndPos, sum += contextualFilterWeights[7] * relativeEndPos, sum += contextualFilterWeights[8 + languageIndex], sum += contextualFilterWeights[29 + promptLastCharIndex], sum += contextualFilterWeights[125 + promptLastRstripCharIndex], probabilityAccept = 1 / (1 + Math.exp(-sum));
  }
  return ctx.get(ContextualFilterManager).probabilityAccept = probabilityAccept, probabilityAccept;
},__name(contextualFilterScore, "contextualFilterScore");