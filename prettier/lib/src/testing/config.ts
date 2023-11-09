var FixedBlockModeConfig = class extends BlockModeConfig {
  constructor(blockMode) {
    super();
    this.blockMode = blockMode;
  }
  static {
    __name(this, "FixedBlockModeConfig");
  }
  async forLanguage(ctx, languageId) {
    return this.blockMode;
  }
};,var CopilotExtensionApi = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  static {
    __name(this, "CopilotExtensionApi");
  }
  captureExtensionTelemetry(work) {
    return withInlineTelemetryCapture(this.ctx, work);
  }
  setupNextCompletion(completions) {
    this.clearCompletionsCache(), this.ctx.forceSet(OpenAIFetcher, new SyntheticCompletions(completions)), this.ctx.forceSet(BlockModeConfig, new FixedBlockModeConfig("parsing"));
  }
  clearCompletionsCache() {
    this.ctx.get(CompletionsCache).clear(), clearUserTypingState();
  }
};