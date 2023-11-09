var statusCodeRe = /^[1-6][0-9][0-9]$/,
  capitalsRe = /([A-Z][a-z]+)/,
  NAMESPACE = "code_referencing",
  CodeQuoteTelemetry = class {
    constructor(baseKey) {
      this.baseKey = baseKey;
    }
    static {
      __name(this, "CodeQuoteTelemetry");
    }
    buildKey(...keys) {
      return [NAMESPACE, this.baseKey, ...keys].join(".");
    }
  },
  CopilotOutputLogTelemetry = class extends CodeQuoteTelemetry {
    static {
      __name(this, "CopilotOutputLogTelemetry");
    }
    constructor() {
      super("github_copilot_log");
    }
    handleOpen({
      context: context
    }) {
      let key = this.buildKey("open", "count"),
        data = TelemetryData.createAndMarkAsIssued();
      telemetry(context, key, data);
    }
    handleFocus({
      context: context
    }) {
      let data = TelemetryData.createAndMarkAsIssued(),
        key = this.buildKey("focus", "count");
      telemetry(context, key, data);
    }
    handleWrite({
      context: context
    }) {
      let data = TelemetryData.createAndMarkAsIssued(),
        key = this.buildKey("write", "count");
      telemetry(context, key, data);
    }
  },
  copilotOutputLogTelemetry = new CopilotOutputLogTelemetry(),
  MatchNotificationTelemetry = class extends CodeQuoteTelemetry {
    static {
      __name(this, "MatchNotificationTelemetry");
    }
    constructor() {
      super("match_notification");
    }
    handleDoAction({
      context: context,
      actor: actor
    }) {
      let data = TelemetryData.createAndMarkAsIssued({
          actor: actor
        }),
        key = this.buildKey("acknowledge", "count");
      telemetry(context, key, data);
    }
    handleDismiss({
      context: context,
      actor: actor
    }) {
      let data = TelemetryData.createAndMarkAsIssued({
          actor: actor
        }),
        key = this.buildKey("ignore", "count");
      telemetry(context, key, data);
    }
  },
  matchNotificationTelemetry = new MatchNotificationTelemetry(),
  SnippyTelemetry = class extends CodeQuoteTelemetry {
    static {
      __name(this, "SnippyTelemetry");
    }
    constructor() {
      super("snippy");
    }
    handleUnexpectedError({
      context: context,
      origin: origin,
      reason: reason
    }) {
      let data = TelemetryData.createAndMarkAsIssued({
        origin: origin,
        reason: reason
      });
      telemetryError(context, this.buildKey("unexpectedError"), data);
    }
    handleCompletionMissing({
      context: context,
      origin: origin,
      reason: reason
    }) {
      let data = TelemetryData.createAndMarkAsIssued({
        origin: origin,
        reason: reason
      });
      telemetryError(context, this.buildKey("completionMissing"), data);
    }
    handleSnippyNetworkError({
      context: context,
      origin: origin,
      reason: reason,
      message: message
    }) {
      if (!origin.match(statusCodeRe)) {
        codeReferenceLogger.debug(context, "Invalid status code, not sending telemetry", {
          origin: origin
        });
        return;
      }
      let errorType = reason.split(capitalsRe).filter(part => !!part).join("_").toLowerCase(),
        data = TelemetryData.createAndMarkAsIssued({
          message: message
        });
      telemetryError(context, this.buildKey(errorType, origin), data);
    }
  },
  snippyTelemetry = new SnippyTelemetry();,var CopilotOutputLogFilename = "GitHub Copilot Log",
  CodeRefEngagementTracker = class {
    constructor(ctx) {
      this.ctx = ctx;
      this.activeLog = !1;
      this.subscriptions = [];
      this.onActiveEditorChange = editor => {
        this.isOutputLog(editor) && copilotOutputLogTelemetry.handleFocus({
          context: this.ctx
        });
      };
      this.onVisibleEditorsChange = currEditors => {
        let copilotLog = currEditors.find(this.isOutputLog);
        this.activeLog ? copilotLog || (this.activeLog = !1) : copilotLog && (this.activeLog = !0, copilotOutputLogTelemetry.handleOpen({
          context: this.ctx
        }));
      };
      this.isOutputLog = editor => editor && editor.document.uri.scheme === "output" && editor.document.uri.path.includes(CopilotOutputLogFilename);
    }
    static {
      __name(this, "CodeRefEngagementTracker");
    }
    register() {
      let activeEditorChangeSub = ay.window.onDidChangeActiveTextEditor(this.onActiveEditorChange),
        visibleEditorsSub = ay.window.onDidChangeVisibleTextEditors(this.onVisibleEditorsChange);
      this.subscriptions.push(visibleEditorsSub), this.subscriptions.push(activeEditorChangeSub);
    }
    dispose() {
      return ay.Disposable.from(...this.subscriptions);
    }
    get logVisible() {
      return this.activeLog;
    }
  };,function registerCodeRefEngagementTracker(ctx) {
  let engagementTracker = new CodeRefEngagementTracker(ctx);
  return engagementTracker.register(), engagementTracker;
},__name(registerCodeRefEngagementTracker, "registerCodeRefEngagementTracker");