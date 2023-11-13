
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
      vscode.commands.executeCommand("setContext", "github.copilot.activated", !1);
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
      vscode.commands.executeCommand("setContext", "github.copilot.activated", !0);

      // 注册面板支持，注册GhostText支持，并将文档跟踪器和光标跟踪器添加到订阅中
      registerPanelSupport(ctx);
      registerGhostTextSupport(ctx);
      context.subscriptions.push(registerDocumentTracker(ctx));
      context.subscriptions.push(registerCursorTracker(ctx));

      // 添加事件处理器，当活动编辑器改变时提取仓库信息，当打开文档时预热语言检测缓存，当配置改变时调用onDidChangeConfigurationHandler
      context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => e && extractRepoInfoInBackground(ctx, e.document.uri)));
      context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => primeLanguageDetectionCache(ctx, doc)));
      context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => onDidChangeConfigurationHandler(e, ctx)));

      // 检查扩展模式是否为开发模式
      let isDevMode = context.extensionMode === vscode.ExtensionMode.Development;

      // 初始化，如果不是开发模式，则启动线程，并发送激活遥测
      init(ctx, !isDevMode, new Logger(1, "promptlib proxy"));
      !isDevMode && ctx.get(hy.SnippetOrchestrator).startThreading();
      telemetry(ctx, "extension.activate", activationTelemetry);

      // 如果有活动的文本编辑器，则更新其内容
      vscode.window?.activeTextEditor && ctx.get(CopilotRepositoryControlManager).evaluate(vscode.window.activeTextEditor.document?.uri, vscode.window.activeTextEditor.document.getText(), "UPDATE");
    }).catch(ex => {
      // 如果发生错误，则调用rejectionHandler
      rejectionHandler(ex);
    });
  }, "tryActivation");

  // 添加事件处理器，当会话改变时调用onDidChangeSessionsHandler
  vscode.authentication.onDidChangeSessions(async event => {
    await onDidChangeSessionsHandler(event, ctx);
  });

  // 启动VS Code安装管理器
  new VsCodeInstallationManager().startup(ctx);

  // 等待tryActivation完成
  await tryActivation();

  // 返回CopilotExtensionApi的新实例
  return new CopilotExtensionApi(ctx);
}


__export(extension_exports, {
  Extension: () => Extension,
  activate: () => activate,
  createExtensionContext: () => createExtensionContext,
  onDeactivate: () => onDeactivate
});