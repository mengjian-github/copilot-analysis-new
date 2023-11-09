var CodeQuoteHeaderContributor = class {
    static {
      __name(this, "CodeQuoteHeaderContributor");
    }
    constructor(codequoteEnabled) {
      this.codequoteEnabled = codequoteEnabled ?? !1;
    }
    updateCodeQuoteEnabled(codequoteEnabled) {
      this.codequoteEnabled = codequoteEnabled ?? !1;
    }
    contributeHeaderValues(headers) {
      headers["Code-Quote-Enabled"] = String(this.codequoteEnabled);
    }
  },
  AnnotationsHeaderContributor = class {
    static {
      __name(this, "AnnotationsHeaderContributor");
    }
    constructor(annotationsEnabled) {
      this.annotationsEnabled = annotationsEnabled ?? !1;
    }
    updateAnnotationsEnabled(annotationsEnabled) {
      this.annotationsEnabled = annotationsEnabled ?? !1;
    }
    contributeHeaderValues(headers) {
      headers["Annotations-Enabled"] = String(this.annotationsEnabled);
    }
  };,function registerCopilotEnvelopeListener(ctx) {
  function updateFromEnvelopeState() {
    let codeQuoteEnabled = !ConnectionState.isDisabled();
    codequoteHeaderContributor.updateCodeQuoteEnabled(codeQuoteEnabled);
  }
  __name(updateFromEnvelopeState, "updateFromEnvelopeState");
  let disposer = ConnectionState.listen(updateFromEnvelopeState),
    codequoteHeaderContributor = new CodeQuoteHeaderContributor(),
    headerContributors = ctx.get(HeaderContributors);
  return headerContributors.add(codequoteHeaderContributor), updateFromEnvelopeState(), new s0e.Disposable(() => {
    headerContributors.remove(codequoteHeaderContributor), disposer.dispose();
  });
},__name(registerCopilotEnvelopeListener, "registerCopilotEnvelopeListener");