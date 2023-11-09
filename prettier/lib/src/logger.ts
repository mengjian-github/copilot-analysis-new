var LogLevel = (i => (LogLevel[i.DEBUG = 0] = "DEBUG", LogLevel[i.INFO = 1] = "INFO", LogLevel[i.WARN = 2] = "WARN", LogLevel[i.ERROR = 3] = "ERROR", LogLevel))(g0 || {}),
  LogVerbose = class {
    constructor(logVerbose) {
      this.logVerbose = logVerbose;
    }
    static {
      __name(this, "LogVerbose");
    }
  };,function verboseLogging(ctx) {
  return ctx.get(LogVerbose).logVerbose;
},__name(verboseLogging, "verboseLogging");,var LogTarget = class {
    static {
      __name(this, "LogTarget");
    }
    shouldLog(ctx, level) {}
  },
  ConsoleLog = class extends LogTarget {
    constructor(console) {
      super();
      this.console = console;
    }
    static {
      __name(this, "ConsoleLog");
    }
    logIt(ctx, level, metadataStr, ...extra) {
      verboseLogging(ctx) || level == 3 ? this.console.error(metadataStr, ...extra) : level == 2 && this.console.warn(metadataStr, ...extra);
    }
  },
  OutputChannelLog = class extends LogTarget {
    constructor(output) {
      super();
      this.output = output;
    }
    static {
      __name(this, "OutputChannelLog");
    }
    logIt(ctx, level, metadataStr, ...extra) {
      this.output.appendLine(`${metadataStr} ${extra.map(toPlainText)}`);
    }
  },
  MultiLog = class extends LogTarget {
    constructor(targets) {
      super();
      this.targets = targets;
    }
    static {
      __name(this, "MultiLog");
    }
    logIt(ctx, level, metadataStr, ...extra) {
      this.targets.forEach(t => t.logIt(ctx, level, metadataStr, ...extra));
    }
  },
  Logger = class {
    static {
      __name(this, "Logger");
    }
    constructor(minLoggedLevel, context) {
      this.minLoggedLevel = minLoggedLevel, this.context = context;
    }
    setLevel(level) {
      this.minLoggedLevel = level;
    }
    stringToLevel(s) {
      return LogLevel[s];
    }
    log(ctx, level, ...extra) {
      let levelString = LogLevel[level],
        logTarget = ctx.get(LogTarget),
        targetOverride = logTarget.shouldLog(ctx, level);
      if (targetOverride === !1 || targetOverride === void 0 && !this.shouldLog(ctx, level, this.context)) return;
      let timestamp = ctx.get(Clock).now().toISOString(),
        metadataStr = `[${levelString}] [${this.context}] [${timestamp}]`;
      logTarget.logIt(ctx, level, metadataStr, ...extra);
    }
    sendErrorTelemetry(ctx, name, secureMessage, standardMessage) {
      telemetryError(ctx, name, TelemetryData.createAndMarkAsIssued({
        context: this.context,
        level: LogLevel[3],
        message: secureMessage
      }), 1), telemetryError(ctx, name, TelemetryData.createAndMarkAsIssued({
        context: this.context,
        level: LogLevel[3],
        message: standardMessage
      }), 0);
    }
    telemetryMessage(...extra) {
      return extra.length > 0 ? JSON.stringify(extra) : "no msg";
    }
    shouldLog(ctx, level, category) {
      if (verboseLogging(ctx)) return !0;
      let levels = getConfig(ctx, ConfigKey.DebugFilterLogCategories);
      if (levels.length > 0 && !levels.includes(category)) return !1;
      if (isProduction(ctx)) return level >= this.minLoggedLevel;
      let overrides = getConfig(ctx, ConfigKey.DebugOverrideLogLevels),
        minLevel = this.stringToLevel(overrides["*"]) ?? this.stringToLevel(overrides[this.context]) ?? this.minLoggedLevel;
      return level >= minLevel;
    }
    debug(ctx, ...extra) {
      this.log(ctx, 0, ...extra);
    }
    info(ctx, ...extra) {
      this.log(ctx, 1, ...extra);
    }
    warn(ctx, ...extra) {
      this.log(ctx, 2, ...extra);
    }
    error(ctx, ...extra) {
      this.sendErrorTelemetry(ctx, "log", this.telemetryMessage(...extra), "[redacted]"), this.log(ctx, 3, ...extra);
    }
    exception(ctx, error, message) {
      if (error instanceof Error && error.name === "Canceled" && error.message === "Canceled") return;
      telemetryException(ctx, error, message ?? "logger.exception");
      let prefix = message ? `${message}: ` : "",
        safeError = error instanceof Error ? error : new Error("Non-error thrown: " + error);
      this.log(ctx, 3, `${prefix}(${safeError.constructor.name}) ${safeError.message}`);
    }
  };,function toPlainText(x) {
  switch (typeof x) {
    case "object":
      return JSON.stringify(x);
    default:
      return String(x);
  }
},__name(toPlainText, "toPlainText");,var logger = new Logger(1, "default");