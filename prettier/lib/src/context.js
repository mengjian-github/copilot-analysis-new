var Context = class {
  constructor(baseContext) {
    this.baseContext = baseContext;
    this.constructionStack = [];
    this.instances = new Map();
    let stack = new Error().stack?.split(`
`);
    stack && this.constructionStack.push(...stack.slice(1));
  }
  static {
    __name(this, "Context");
  }
  get(ctor) {
    let value = this.tryGet(ctor);
    if (value) return value;
    throw new Error(`No instance of ${ctor.name} has been registered.`);
  }
  tryGet(ctor) {
    let value = this.instances.get(ctor);
    if (value) return value;
    if (this.baseContext) return this.baseContext.tryGet(ctor);
  }
  set(ctor, instance) {
    if (this.tryGet(ctor)) throw new Error(`An instance of ${ctor.name} has already been registered. Use forceSet() if you're sure it's a good idea.`);
    this.assertIsInstance(ctor, instance), this.instances.set(ctor, instance);
  }
  forceSet(ctor, instance) {
    this.assertIsInstance(ctor, instance), this.instances.set(ctor, instance);
  }
  assertIsInstance(ctor, instance) {
    if (!(instance instanceof ctor)) {
      let inst = JSON.stringify(instance);
      throw new Error(`The instance you're trying to register for ${ctor.name} is not an instance of it (${inst}).`);
    }
  }
  toString() {
    let lines = `    Context created at:
`;
    for (let stackEntry of this.constructionStack || []) lines += `    ${stackEntry}
`;
    return lines += this.baseContext?.toString() ?? "", lines;
  }
};

function createProductionContext(configProvider) {
  // 创建一个新的上下文
  let ctx = new Context();

  // 设置各种服务和配置
  ctx.set(ConfigProvider, configProvider);
  ctx.set(Clock, new Clock());
  ctx.set(BuildInfo, new BuildInfo());
  setupRudimentaryLogging(ctx);
  logger.debug(ctx, "Initializing main context");
  ctx.set(CompletionsCache, new CompletionsCache());
  ctx.set(CopilotTokenNotifier, new CopilotTokenNotifier());
  ctx.set(CertificateReaderCache, new CertificateReaderCache());
  ctx.set(RootCertificateReader, getRootCertificateReader(ctx));
  ctx.set(ProxySocketFactory, getProxySocketFactory(ctx));
  ctx.set(Fetcher, new HelixFetcher(ctx));
  ctx.set(LanguageDetection, getLanguageDetection(ctx));
  ctx.set(Features, new Features(ctx));
  ctx.set(PostInsertionNotifier, new PostInsertionNotifier());
  ctx.set(TelemetryUserConfig, new TelemetryUserConfig(ctx));
  ctx.set(TelemetryEndpointUrl, new TelemetryEndpointUrl());
  ctx.set(TelemetryReporters, new TelemetryReporters());
  ctx.set(HeaderContributors, new HeaderContributors());
  ctx.set(UserErrorNotifier, new UserErrorNotifier(ctx));
  ctx.set(ContextualFilterManager, new ContextualFilterManager());
  ctx.set(OpenAIFetcher, new LiveOpenAIFetcher());
  ctx.set(BlockModeConfig, new ConfigBlockModeConfig());
  ctx.set(UrlOpener, new RealUrlOpener());
  ctx.set(ExpConfigMaker, new ExpConfigNone());
  ctx.set(PromiseQueue, new PromiseQueue());
  ctx.set(uD.SnippetOrchestrator, new uD.SnippetOrchestrator());
  ctx.set(ForceMultiLine, ForceMultiLine.default);

  // 返回创建的上下文
  return ctx;
}