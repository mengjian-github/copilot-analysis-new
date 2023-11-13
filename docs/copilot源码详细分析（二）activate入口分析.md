# copilot源码详细分析（二）activate入口分析

## copilot的入口函数

我们将activate方法格式化如下：

```jsx
async function activate(context) {
  // 创建并标记为已发送的遥测数据
  let activationTelemetry = TelemetryData.createAndMarkAsIssued();

  // 创建扩展上下文，并等待其完成
  let ctx = await createExtensionContext(context);

  // 注册状态栏，并将CopilotRepositoryControlManager添加到上下文中
  registerStatusBar(ctx, outputChannel);
  ctx.set(CopilotRepositoryControlManager, new CopilotRepositoryControlManager(ctx));

  // 注册诊断命令
  registerDiagnosticCommands(ctx);

  // 注册带有遥测的命令
  registerCommandWithTelemetry(ctx, CMDSignIn, () => getSession(ctx, !0));

  // 将CodeReference添加到订阅中
  context.subscriptions.push(new CodeReference(ctx).register());

  // 将onDeactivate添加到订阅中
  context.subscriptions.push(onDeactivate(ctx));

  // 定义一个异步函数tryActivation
  let tryActivation = __name(async () => {
    let statusBar = ctx.get(StatusReporter);

    // 设置进度，并允许一次性登录
    statusBar.setProgress();
    permitOneSignIn();

    // 定义一个处理错误的函数
    let rejectionHandler = __name((error, allowRetry = !0) => {
      let reason = error.message || error;

      // 记录错误，并停用遥测
      telemetryError(ctx, "activationFailed", TelemetryData.createAndMarkAsIssued({
        reason: reason
      }));
      ctx.get(TelemetryReporters).deactivate();

      // 设置错误消息，并允许重试
      let message = reason === "GitHubLoginFailed" ? SESSION_LOGIN_MESSAGE : `Extension activation failed: "${reason}"`;
      statusBar.setError(message, allowRetry ? tryActivation : void 0);

      // 记录错误，并将github.copilot.activated上下文设置为false
      logger.error(ctx, message);
      ja.commands.executeCommand("setContext", "github.copilot.activated", !1);
    }, "rejectionHandler");

    // 检查Node.js版本是否受支持
    let nodeVersionError = errorMessageForUnsupportedNodeVersion();
    if (nodeVersionError) {
      rejectionHandler(nodeVersionError, !1);
      return;
    }

    // 获取Copilot token并等待其完成
    ctx.get(CopilotTokenManager).getCopilotToken(ctx).then(() => {
      // 强制设置为正常状态，并将github.copilot.activated上下文设置为true
      statusBar.forceNormal();
      ja.commands.executeCommand("setContext", "github.copilot.activated", !0);

      // 注册面板支持，注册GhostText支持，并将文档跟踪器和光标跟踪器添加到订阅中
      registerPanelSupport(ctx);
      registerGhostTextSupport(ctx);
      context.subscriptions.push(registerDocumentTracker(ctx));
      context.subscriptions.push(registerCursorTracker(ctx));

      // 添加事件处理器，当活动编辑器改变时提取仓库信息，当打开文档时预热语言检测缓存，当配置改变时调用onDidChangeConfigurationHandler
      context.subscriptions.push(ja.window.onDidChangeActiveTextEditor(e => e && extractRepoInfoInBackground(ctx, e.document.uri)));
      context.subscriptions.push(ja.workspace.onDidOpenTextDocument(doc => primeLanguageDetectionCache(ctx, doc)));
      context.subscriptions.push(ja.workspace.onDidChangeConfiguration(e => onDidChangeConfigurationHandler(e, ctx)));

      // 检查扩展模式是否为开发模式
      let isDevMode = context.extensionMode === ja.ExtensionMode.Development;

      // 初始化，如果不是开发模式，则启动线程，并发送激活遥测
      init(ctx, !isDevMode, new Logger(1, "promptlib proxy"));
      !isDevMode && ctx.get(hy.SnippetOrchestrator).startThreading();
      telemetry(ctx, "extension.activate", activationTelemetry);

      // 如果有活动的文本编辑器，则更新其内容
      ja.window?.activeTextEditor && ctx.get(CopilotRepositoryControlManager).evaluate(ja.window.activeTextEditor.document?.uri, ja.window.activeTextEditor.document.getText(), "UPDATE");
    }).catch(ex => {
      // 如果发生错误，则调用rejectionHandler
      rejectionHandler(ex);
    });
  }, "tryActivation");

  // 添加事件处理器，当会话改变时调用onDidChangeSessionsHandler
  ja.authentication.onDidChangeSessions(async event => {
    await onDidChangeSessionsHandler(event, ctx);
  });

  // 启动VS Code安装管理器
  new VsCodeInstallationManager().startup(ctx);

  // 等待tryActivation完成
  await tryActivation();

  // 返回CopilotExtensionApi的新实例
  return new CopilotExtensionApi(ctx);
}
```

在入口函数中，涉及到了几个组件：

- `TelemetryData`，负责创建上报数据。
- `createExtensionContext` ，负责处理生成Context。

## 关于Context的初始化

```jsx
async function createExtensionContext(extensionContext) {
  // 创建一个生产环境的上下文，并设置日志目标为控制台和输出通道
  let ctx = createProductionContext(new VSCodeConfigProvider()),
    logTarget = new MultiLog([new ConsoleLog(console), new OutputChannelLog(outputChannel)]);
  ctx.forceSet(LogTarget, logTarget);
  ctx.set(EditorAndPluginInfo, new VSCodeEditorInfo());
  initProxyEnvironment(ctx.get(Fetcher), process.env);
  ctx.set(NotificationSender, new ExtensionNotificationSender());
  ctx.set(EditorSession, new EditorSession(vscode.env.sessionId, vscode.env.machineId));
  ctx.set(Extension, new Extension(extensionContext));
  ctx.set(EditorExperimentFilters, new VSCodeEditorExperimentFilters());
  setupExperimentationService(ctx);
  ctx.set(SymbolDefinitionProvider, new ExtensionSymbolDefinitionProvider());
  ctx.set(CopilotExtensionStatus, new CopilotExtensionStatus());

  // 根据扩展模式（测试或生产）设置不同的服务和配置
  if (extensionContext.extensionMode === vscode.ExtensionMode.Test) {
    ctx.forceSet(RuntimeMode, RuntimeMode.fromEnvironment(!0));
    ctx.set(CopilotTokenManager, getTestingCopilotTokenManager());
    ctx.forceSet(UrlOpener, new TestUrlOpener());
    await setupTelemetry(ctx, extensionContext, "copilot-test", !0);
  } else {
    ctx.set(CopilotTokenManager, new VSCodeCopilotTokenManager());
    ctx.forceSet(ExpConfigMaker, new ExpConfigFromTAS());
    await setupTelemetry(ctx, extensionContext, extensionContext.extension.packageJSON.name, vscode.env.isTelemetryEnabled);
  }

  // 设置其他服务和配置
  ctx.set(LocationFactory, new ExtensionLocationFactory());
  ctx.set(TextDocumentManager, new ExtensionTextDocumentManager(ctx));
  ctx.set(WorkspaceFileSystem, new ExtensionWorkspaceFileSystem());
  ctx.set(CommitFileResolver, new ExtensionCommitFileResolver());
  ctx.set(hy.FileSystem, extensionFileSystem);
  ctx.set(NetworkConfiguration, new VSCodeNetworkConfiguration());

  // 返回创建的上下文
  return ctx;
}
```

我们先来看第一行代码：

```jsx
let ctx = createProductionContext(new VSCodeConfigProvider())
```

它是通过`createProductionContext` 这个方法创建了一个Context，参数是一个`VSCodeConfigProvider` 的实例。

那么首先看看`VSCodeConfigProvider` ：

```jsx
var CopilotConfigPrefix = "github.copilot";
var VSCodeConfigProvider = class extends ConfigProvider {
    constructor() {
      super();
      this.config = vscode.workspace.getConfiguration(CopilotConfigPrefix), vscode.workspace.onDidChangeConfiguration(changeEvent => {
        changeEvent.affectsConfiguration(CopilotConfigPrefix) && (this.config = vscode.workspace.getConfiguration(CopilotConfigPrefix));
      });
    }
	// ...
}
```

仅看一下这个constructor我们就知道是拉取了vscode的配置项，prefix为`github.copilot` ，并且监听了config change重新赋值给this.config。

然后再看一下`createProductionContext`的实现：

```jsx
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
```

可以看到这个方法首先创建了一个ctx，然后设置了一系列的类与实例，这个Context类似于依赖注入容器管理的作用：

```jsx
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
```

在main Context的初始化过程中，首先初始化了三个类：

- `ConfigProvider` ，也就是刚刚传进来的那个VSCodeConfigProvider。
- `Clock` ，目前看起来就是实现了一个Date.now()。
- `BuildInfo` ，封装了关于package.json的相关信息。

然后调用了`setupRudimentaryLogging` 方法：

```jsx
function setupRudimentaryLogging(ctx) {
  ctx.set(RuntimeMode, RuntimeMode.fromEnvironment(!1)),
  ctx.set(LogVerbose, new LogVerbose(isVerboseLoggingEnabled(ctx))), 
  ctx.set(LogTarget, new ConsoleLog(console));
}
```

这里面又初始化了三个类：

- `RuntimeMode` ，实际上记录了几个关键的flag：
    - `debug` ，由`-debug`参数或`GITHUB_COPILOT_DEBUG`的环境变量决定。
    - `verboseLogging` ，由`COPILOT_AGENT_VERBOSE`决定。
    - `telemetryLogging` ，由`COPILOT_LOG_TELEMETRY` 决定。
    - `testMode` ，在这里是`false`。
    - `recordInput` ，由`-record`参数或`GITHUB_COPILOT_RECORD` 决定。
- `LogVerbose` ，记录是否是`verboseLogging`。
- `LogTarget` ，注册为`ConsoleLog` 。

接着打了一行debug日志：”Initializing main context”，这应该是copilot的第一行日志。

接着初始化了一堆服务：

- `CompletionsCache` ，这个cache默认是LRU（100）
- `CopilotTokenNotifier` ，这是一个事件通知器，里面封装了一个emit方法。
- `CertificateReaderCache` ，这是一个key为platform，value为Reader的Map。
- `RootCertificateReader` ，真正的证书Reader，用来获取rootCA。
- `ProxySocketFactory` ，实际上是一个KerberosProxySocketFactory，使用Kerberos进行身份认证。
- `Fetcher`，是一个HelixFetcher的实例，用来发送HTTP请求。
- `LanguageDetection` ，实际上是由`FilenameAndExensionLanguageDetection`和`NotebookLanguageDetection`组成，统一走`CachingLanguageDetection`来缓存，推断具体为哪个language的策略还有点复杂。
- `Features`，包含一些实验特性。
- `PostInsertionNotifier` ，纯粹就是一个eventEmitter。
- `TelemetryUserConfig` ，关于telemetry的一些配置，基本上是通过`CopilotTokenNotifier`这个事件监听得到的。
- `TelemetryEndpointUrl` ，维护telemetry的url地址，默认是https://copilot-telemetry.githubusercontent.com/telemetry。
- `TelemetryReporters` ，维护了telemetry的reporter。
- `HeaderContributors` ，维护一个`Contributors` 的列表。
- `UserErrorNotifier` ，用来处理证书相关的异常？
- `ContextualFilterManager` ，管理ContextualFilter。
- `OpenAIFetcher` ，被实例化为`LiveOpenAIFetcher` ，适配了OpenAI的返回格式。
- `BlockModeConfig` ，实例化为`ConfigBlockModeConfig`，跟indent配置有关。
- `UrlOpener` ，被实例化为`RealUrlOpener` ，实现了一个open方法。
- `ExpConfigMaker` ，实验特性标记，这里被实例化为一个`ExpConfigNone` ，默认不拉实验特性。
- `PromiseQueue` ，一个promise队列。
- `SnippetOrchestrator` ，snippet编排。
- `ForceMultiLine` ，看起来是强制multiline。

至此整个`createProductionContext` 的流程就结束了。接下来看一下`createExtensionContext` 的流程：

```jsx
logTarget = new MultiLog([new ConsoleLog(console), new OutputChannelLog(outputChannel)]);
ctx.forceSet(LogTarget, logTarget);
```

首先重置了一下logTarget，同时向console和outputchannel输出。

然后将`EditorAndPluginInfo` 设置为`VSCodeEditorInfo` ，封装了一些基本的信息。

接着初始化了`initProxyEnvironment` proxy的逻辑，监听proxy的变化确保proxy能够正常。

接着初始化了以下服务：

- `NotificationSender` ，一个通知的服务，调用`showWarningMessage`。
- `EditorSession` ，管理session周期
- `Extension` , Extension相关，context存在这里。
- `EditorExperimentFilters` ，设置为`VSCodeEditorExperimentFilters` ，看起来是加了`X-VSCode-Build，X-VSCode-Language`两个属性。

然后调用了`setupExperimentationService` ：

```jsx
function setupExperimentationService(ctx) {
  let features = ctx.get(Features);
  features.registerStaticFilters(createAllFilters(ctx)),
  features.registerDynamicFilter("X-Copilot-OverrideEngine", () => getConfig(ctx, ConfigKey.DebugOverrideEngine));
}
```

这里面就是设置了一些基础的头信息：

- `X-VSCode-AppVersion`
- `X-MSEdge-ClientId`
- `X-VSCode-ExtensionName`
- `X-VSCode-ExtensionVersion`
- `X-VSCode-TargetPopulation`

接着定义了两个服务：

- `SymbolDefinitionProvider` ，定义了SymbolDefinition。
- `CopilotExtensionStatus` ，定义了当前插件的状态和报错信息。

接着区分了环境，正式环境中的定义

- `CopilotTokenManager`，这个是指copilot的登录token管理。
- 将`ExpConfigMaker` 重新指向为`ExpConfigFromTAS` ，也就是默认从TAS平台上拉取实验特性数据。

接着初始化`setupTelemetry` 的逻辑。

然后还有一系列其他服务的设置：

- `LocationFactory`，初始化一个location的工具类。
- `TextDocumentManager` ，负责TextDocument相关的处理。
- `WorkspaceFileSystem` ，workspace关于文件相关的处理。
- `CommitFileResolver` ，提交文件相关的处理。
- `FileSystem` ，文件相关的处理。
- `NetworkConfiguration` ，主要是访问github的URL地址。

## 入口主逻辑梳理

入口主逻辑细枝末节比较多，这里画图做个总结：

![Untitled](https://prod-files-secure.s3.us-west-2.amazonaws.com/4dda21c1-f337-43e2-abc6-cd65f29a3725/28aae2de-7cee-40ea-aa01-92f92d6e5d00/Untitled.png)

在入口初始化中，最重要的是标红的两步：

- `registerGhostTextSupport` ，这个注册了整个InlineCompletion，也就是我们的代码提示都是走这个逻辑。
- `snippetOrchestrator.startThreading` ，这个开启了一个worker线程，接下来我们详细分析一下。

## 关于worker线程

copilot将比较耗时的操作都放到了worker线程去，比如下面的init方法：

```jsx
var promptlib = Ns(Dc());
var worker = null;

var handlers = new Map();
var nextHandlerId = 0;

function init(ctx, use_worker_threads, logger) {
  if (!use_worker_threads) {
    let localPromptlib = (uL(), nT(Pre));
    for (let fn of allFuns) updatePromptLibProxyFunction(fn, localPromptlib[fn]);
    return;
  }

  for (let fn of workerFuns) updatePromptLibProxyFunction(fn, proxy(ctx, logger, fn));

  promptLibProxy.getPrompt = getPromptProxy(ctx, logger);
  worker = X0.createWorker();
  handlers.clear();
  nextHandlerId = 0;

  worker.on("message", ({ id, err, code, res }) => {
    let handler = handlers.get(id);
    logger.debug(ctx, `Response ${id} - ${res}, ${err}`);
    if (handler) {
      handlers.delete(id);
      if (err) {
        err.code = code;
        handler.reject(err);
      } else {
        handler.resolve(res);
      }
    }
  });

  function handleError(maybeError) {
    let err;
    if (maybeError instanceof Error) {
      err = maybeError;
      if (err.code === "MODULE_NOT_FOUND" && err.message?.endsWith("worker.js'")) {
        err = new Error("Failed to load worker.js");
        err.code = "CopilotPromptLoadFailure";
      }
      let ourStack = new Error().stack;
      if (err.stack && ourStack?.match(/^Error\n/)) {
        err.stack += ourStack.replace(/^Error/, "");
      }
    } else if (maybeError?.name === "ExitStatus" && typeof maybeError.status == "number") {
      err = new Error(`worker.js exited with status ${maybeError.status}`);
      err.code = `CopilotPromptWorkerExit${maybeError.status}`;
    } else {
      err = new Error(`Non-error thrown: ${maybeError}`);
    }
    for (let handler of handlers.values()) handler.reject(err);
    handlers.clear();
  }

  __name(handleError, "handleError");
  worker.on("error", handleError);
}
__name(init, "init");

function terminate() {
  if (worker) {
    worker.removeAllListeners();
    worker.terminate();
    worker = null;
    handlers.clear();
  }
}
__name(terminate, "terminate");

var workerFuns = [
  "getFunctionPositions",
  "isEmptyBlockStart",
  "isBlockBodyFinished",
  "getNodeStart",
  "getCallSites",
  "parsesWithoutError"
];

var directFuns = [
  "isSupportedLanguageId",
  "getBlockCloseToken",
  "getPrompt"
];

var allFuns = [...workerFuns, ...directFuns];

function proxy(ctx, logger, fn) {
  return function (...args) {
    let id = nextHandlerId++;
    return new Promise((resolve, reject) => {
      handlers.set(id, { resolve: resolve, reject: reject });
      logger.debug(ctx, `Proxy ${fn}`);
      worker?.postMessage({ id: id, fn: fn, args: args });
    });
  };
}
__name(proxy, "proxy");

function getPromptProxy(ctx, logger) {
  return function (_fileSystem, ...args) {
    let id = nextHandlerId++;
    return new Promise((resolve, reject) => {
      handlers.set(id, { resolve: resolve, reject: reject });
      logger.debug(ctx, `Proxy getPrompt - ${id}`);
      worker?.postMessage({ id: id, fn: "getPrompt", args: args });
    });
  };
}
__name(getPromptProxy, "getPromptProxy");

function updatePromptLibProxyFunction(fn, impl) {
  promptLibProxy[fn] = impl;
}
__name(updatePromptLibProxyFunction, "updatePromptLibProxyFunction");

var promptLibProxy = {
  isEmptyBlockStart: X0.isEmptyBlockStart,
  isBlockBodyFinished: X0.isBlockBodyFinished,
  isSupportedLanguageId: X0.isSupportedLanguageId,
  getBlockCloseToken: X0.getBlockCloseToken,
  getFunctionPositions: X0.getFunctionPositions,
  getNodeStart: X0.getNodeStart,
  getPrompt: X0.getPrompt,
  getCallSites: X0.getCallSites,
  parsesWithoutError: X0.parsesWithoutError
};
```

可以看到，放在worker线程的方法主要是5个：

- `getFunctionPositions`
- `isEmptyBlockStart`
- `isBlockBodyFinished`
- `getNodeStart`
- `getCallSites`
- `parsesWithoutError`

其中，还有一个方法也被单独代理到worker线程：

- `getPrompt`

除了这个worker线程以外，还开了另外一个worker线程workerProxy：

```jsx
workerFns = ["getNeighborSnippets", "extractLocalImportContext", "sleep"], WorkerProxy = class {
      constructor() {
        this.nextHandlerId = 0;
        this.handlers = new Map();
        this.fns = new Map();
        this.extractLocalImportContext = extractLocalImportContext;
        this.getNeighborSnippets = getNeighborSnippets;
        this.sleep = sleep;
        !Kf.isMainThread && Kf.workerData?.port && (wT(), process.cwd = () => Kf.workerData.cwd, this.configureWorkerResponse(Kf.workerData.port));
      }
      static {
        __name(this, "WorkerProxy");
      }
      initWorker() {
        let {
          port1: port1,
          port2: port2
        } = new Kf.MessageChannel();
        this.port = port1, this.worker = new Kf.Worker((0, yre.resolve)(__dirname, "..", "dist", "workerProxy.js"), {
          workerData: {
            port: port2,
            cwd: process.cwd()
          },
          transferList: [port2]
        }), this.port.on("message", m => this.handleMessage(m)), this.port.on("error", e => this.handleError(e));
      }
      startThreading() {
        if (this.worker) throw new Error("Worker thread already initialized.");
        this.proxyFunctions(), this.initWorker();
      }
      stopThreading() {
        this.worker && (this.worker.terminate(), this.worker.removeAllListeners(), this.worker = void 0, this.unproxyFunctions(), this.handlers.clear());
      }
      proxyFunctions() {
        for (let fn of workerFns) this.fns.set(fn, this[fn]), this.proxy(fn);
      }
      unproxyFunctions() {
        for (let fn of workerFns) {
          let originalFn = this.fns.get(fn);
          if (originalFn) this[fn] = originalFn;else throw new Error(`Unproxy function not found: ${fn}`);
        }
      }
      configureWorkerResponse(port) {
        this.port = port, this.port.on("message", async ({
          id: id,
          fn: fn,
          args: args
        }) => {
          let proxiedFunction = this[fn];
          if (!proxiedFunction) throw new Error(`Function not found: ${fn}`);
          try {
            let res = await proxiedFunction.apply(this, args);
            this.port.postMessage({
              id: id,
              res: res
            });
          } catch (err) {
            if (!(err instanceof Error)) throw err;
            typeof err.code == "string" ? this.port.postMessage({
              id: id,
              err: err,
              code: err.code
            }) : this.port.postMessage({
              id: id,
              err: err
            });
          }
        });
      }
      handleMessage({
        id: id,
        err: err,
        code: code,
        res: res
      }) {
        let handler = this.handlers.get(id);
        handler && (this.handlers.delete(id), err ? (err.code = code, handler.reject(err)) : handler.resolve(res));
      }
      handleError(maybeError) {
        console.log(maybeError);
        let err;
        if (maybeError instanceof Error) {
          err = maybeError, err.code === "MODULE_NOT_FOUND" && err.message?.endsWith("workerProxy.js'") && (err = new Error("Failed to load workerProxy.js"), err.code = "CopilotPromptLoadFailure");
          let ourStack = new Error().stack;
          err.stack && ourStack?.match(/^Error\n/) && (err.stack += ourStack.replace(/^Error/, ""));
        } else maybeError?.name === "ExitStatus" && typeof maybeError.status == "number" ? (err = new Error(`workerProxy.js exited with status ${maybeError.status}`), err.code = `CopilotPromptWorkerExit${maybeError.status}`) : err = new Error(`Non-error thrown: ${maybeError}`);
        for (let handler of this.handlers.values()) handler.reject(err);
        throw err;
      }
      proxy(fn) {
        this[fn] = function (...args) {
          let id = this.nextHandlerId++;
          return new Promise((resolve, reject) => {
            this.handlers.set(id, {
              resolve: resolve,
              reject: reject
            }), this.port?.postMessage({
              id: id,
              fn: fn,
              args: args
            });
          });
        };
      }
    }, workerProxy = new WorkerProxy();
```

这里的通信代理和第一个worker线程的代理机制大同小异，这次代理的是与snippets相关的几个方法：

- `getNeighborSnippets`
- `extractLocalImportContext`
- `sleep`

将这些昂贵的操作放在worker线程中，保障了整体主线程的性能不会卡顿。

## 小结一下

本文主要分析了copilot入口函数的整体逻辑，最重要的是两大块内容：

- **Context初始化**
- **注册ghostText并开启worker线程**

在Context部分，copilot所有的实例都是通过**挂在容器的方式形成单例的**，一个好处就是对于一个类可以有多个实现，只需要替换掉不同的Instance即可，这也符合**开闭设计原则**。

在一系列初始化完成之后，copilot登录通过后，会注册到ghostText，开启**inlineCompletion**的模式，这也就是我们在copilot中体验到的代码补全的核心功能。

另外copilot还开启了两个**worker线程**，分别代理了snippet相关和Prompt相关的几个函数，这些函数默认在非开发环境下会在worker线程跑，从而保障了**主进程更优的性能**。