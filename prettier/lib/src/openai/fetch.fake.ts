var import_copilot_promptlib = Ns(Dc());,function fakeAPIChoice(headerRequestId, choiceIndex, completionText, telemetryData = TelemetryData.createAndMarkAsIssued()) {
  let tokenizer = (0, j0e.getTokenizer)();
  return {
    completionText: completionText,
    meanLogProb: .5,
    meanAlternativeLogProb: .5,
    modelInfo: void 0,
    numTokens: -1,
    choiceIndex: choiceIndex,
    requestId: {
      headerRequestId: headerRequestId,
      completionId: v4_default(),
      created: 0,
      serverExperiments: "dummy",
      deploymentId: "dummy"
    },
    telemetryData: telemetryData,
    tokens: tokenizer.tokenize(completionText).map(token => tokenizer.detokenize([token])).concat()
  };
},__name(fakeAPIChoice, "fakeAPIChoice");,async function* fakeAPIChoices(postOptions, finishedCb, completions, telemetryData) {
  let fakeHeaderRequestId = v4_default(),
    choiceIndex = 0;
  for (let completion of completions) {
    let stopOffset = -1;
    if (postOptions?.stop !== void 0) for (let stopToken of postOptions.stop) {
      let thisStopOffset = completion.indexOf(stopToken);
      thisStopOffset !== -1 && (stopOffset === -1 || thisStopOffset < stopOffset) && (stopOffset = thisStopOffset);
    }
    stopOffset !== -1 && (completion = completion.substring(0, stopOffset));
    let finishOffset = await finishedCb(completion);
    finishOffset !== void 0 && (completion = completion.substring(0, finishOffset));
    let choice = fakeAPIChoice(fakeHeaderRequestId, choiceIndex++, completion, telemetryData);
    choice.blockFinished = finishOffset !== void 0, yield choice;
  }
},__name(fakeAPIChoices, "fakeAPIChoices");,function fakeResponse(completions, finishedCb, postOptions, allowEmptyChoices, telemetryData) {
  return {
    type: "success",
    choices: postProcessChoices(fakeAPIChoices(postOptions, finishedCb, completions, telemetryData), allowEmptyChoices),
    getProcessingTime: () => 0
  };
},__name(fakeResponse, "fakeResponse");,var SyntheticCompletions = class extends OpenAIFetcher {
  constructor(_completions) {
    super();
    this._completions = _completions;
    this._wasCalled = !1;
  }
  static {
    __name(this, "SyntheticCompletions");
  }
  async fetchAndStreamCompletions(ctx, params, baseTelemetryData, finishedCb, cancel, teletryProperties, allowEmptyChoices) {
    if (ctx.get(CopilotTokenManager).getCopilotToken(ctx), cancel?.isCancellationRequested) return {
      type: "canceled",
      reason: "canceled during test"
    };
    if (this._wasCalled) {
      let emptyCompletions = this._completions.map(completion => "");
      return fakeResponse(emptyCompletions, finishedCb, params.postOptions, allowEmptyChoices, baseTelemetryData);
    } else return this._wasCalled = !0, fakeResponse(this._completions, finishedCb, params.postOptions, allowEmptyChoices, baseTelemetryData);
  }
};